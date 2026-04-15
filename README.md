# 학원 인터콤 앱 📞

학원 내 무전기/인터콤 시스템. PTT(Push-to-Talk) 방식으로 실시간 음성 통신.

## 기능

- 🎤 PTT 버튼으로 음성 송신
- 🔊 온라인 상태면 자동 수신
- 👥 다중 선택 동시 송신
- 📱 PC/모바일 모두 지원

## 기술 스택

- **Frontend**: React + Vite
- **Backend**: Python FastAPI + WebSocket
- **DB/Auth**: Supabase
- **배포**: Vercel (Frontend) + Railway (Backend)

## 로컬 실행

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 배포

### Backend (Railway)
1. Railway에서 GitHub 연결
2. `backend` 폴더 선택
3. 자동 배포

### Frontend (Vercel)
1. Vercel에서 GitHub 연결
2. `frontend` 폴더 선택
3. 환경변수 설정:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WS_URL` (Railway 배포 URL)
