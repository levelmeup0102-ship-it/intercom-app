"""
인터콤 앱 백엔드 서버
- FastAPI + WebSocket
- PTT 음성 스트리밍 중계
"""

import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set
from datetime import datetime
import json

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [INTERCOM][%(funcName)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Intercom API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용, 배포 시 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        # user_id -> WebSocket 매핑
        self.active_connections: Dict[str, WebSocket] = {}
        # user_id -> user_name 매핑
        self.user_names: Dict[str, str] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, user_name: str):
        """새 클라이언트 연결"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_names[user_id] = user_name
        logger.info(f"연결됨: {user_name} (id={user_id}), 현재 연결수={len(self.active_connections)}")
        
        # 모든 클라이언트에게 온라인 상태 브로드캐스트
        await self.broadcast_user_status(user_id, user_name, True)
    
    def disconnect(self, user_id: str):
        """클라이언트 연결 해제"""
        if user_id in self.active_connections:
            user_name = self.user_names.get(user_id, "Unknown")
            del self.active_connections[user_id]
            if user_id in self.user_names:
                del self.user_names[user_id]
            logger.info(f"연결해제: {user_name} (id={user_id}), 현재 연결수={len(self.active_connections)}")
            return user_name
        return None
    
    async def broadcast_user_status(self, user_id: str, user_name: str, is_online: bool):
        """사용자 상태 변경을 모든 클라이언트에게 브로드캐스트"""
        message = json.dumps({
            "type": "user_status",
            "user_id": user_id,
            "user_name": user_name,
            "is_online": is_online,
            "timestamp": datetime.now().isoformat()
        })
        
        for uid, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"상태 브로드캐스트 실패: target={uid}, error={str(e)}")
    
    async def send_audio_to_targets(
        self, 
        sender_id: str, 
        sender_name: str,
        target_ids: list, 
        audio_data: bytes
    ):
        """특정 대상들에게 오디오 전송"""
        success_count = 0
        fail_count = 0
        
        for target_id in target_ids:
            if target_id in self.active_connections:
                try:
                    # 메타데이터 먼저 전송
                    meta = json.dumps({
                        "type": "audio_meta",
                        "sender_id": sender_id,
                        "sender_name": sender_name,
                        "timestamp": datetime.now().isoformat()
                    })
                    await self.active_connections[target_id].send_text(meta)
                    
                    # 오디오 데이터 전송 (바이너리)
                    await self.active_connections[target_id].send_bytes(audio_data)
                    success_count += 1
                except Exception as e:
                    logger.error(f"오디오 전송 실패: sender={sender_name}, target={target_id}, error={str(e)}")
                    fail_count += 1
            else:
                logger.debug(f"대상 오프라인: target={target_id}")
                fail_count += 1
        
        logger.info(f"오디오 전송완료: sender={sender_name}, targets={len(target_ids)}, success={success_count}, fail={fail_count}")
    
    def get_online_users(self) -> list:
        """현재 온라인 사용자 목록"""
        return [
            {"user_id": uid, "user_name": self.user_names.get(uid, "Unknown")}
            for uid in self.active_connections.keys()
        ]


manager = ConnectionManager()


@app.get("/")
async def root():
    """헬스체크"""
    return {"status": "ok", "service": "intercom-api"}


@app.get("/online-users")
async def get_online_users():
    """현재 온라인 사용자 목록"""
    return {"users": manager.get_online_users()}


@app.websocket("/ws/{user_id}/{user_name}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, user_name: str):
    """
    WebSocket 엔드포인트
    
    메시지 타입:
    - ptt_start: PTT 시작 (대상 ID 목록 포함)
    - ptt_audio: 오디오 청크 (바이너리)
    - ptt_end: PTT 종료
    """
    await manager.connect(websocket, user_id, user_name)
    
    current_targets: list = []  # PTT 진행 중인 대상 목록
    
    try:
        while True:
            # 메시지 수신 (텍스트 또는 바이너리)
            message = await websocket.receive()
            
            if "text" in message:
                data = json.loads(message["text"])
                msg_type = data.get("type")
                
                if msg_type == "ptt_start":
                    # PTT 시작 - 대상 목록 저장
                    current_targets = data.get("targets", [])
                    logger.info(f"PTT 시작: sender={user_name}, targets={current_targets}")
                    
                elif msg_type == "ptt_end":
                    # PTT 종료
                    logger.info(f"PTT 종료: sender={user_name}")
                    current_targets = []
                    
            elif "bytes" in message:
                # 오디오 데이터 수신 -> 대상들에게 전송
                if current_targets:
                    await manager.send_audio_to_targets(
                        user_id, 
                        user_name,
                        current_targets, 
                        message["bytes"]
                    )
                    
    except WebSocketDisconnect:
        user_name = manager.disconnect(user_id)
        if user_name:
            await manager.broadcast_user_status(user_id, user_name, False)
    except Exception as e:
        logger.error(f"WebSocket 오류: user={user_name}, error={str(e)}")
        manager.disconnect(user_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
