import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import StationTab from './StationTab'
import MobileTab from './MobileTab'
import PTTButton from './PTTButton'

// WebSocket 서버 URL
const WS_URL = import.meta.env.VITE_WS_URL || (
  import.meta.env.PROD 
    ? `wss://${window.location.host}/ws`
    : 'ws://localhost:8000/ws'
)

function MainPage({ session, userProfile, onLogout, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState('station') // 'station' or 'mobile'
  const [isOnline, setIsOnline] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [receiving, setReceiving] = useState(null) // 수신 중인 발신자 정보
  
  const wsRef = useRef(null)
  const audioContextRef = useRef(null)

  // 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('id', session.user.id) // 자기 자신 제외

    if (error) {
      console.error('사용자 목록 로드 오류:', error)
      return
    }
    setUsers(data || [])
  }, [session.user.id])

  useEffect(() => {
    loadUsers()

    // 실시간 구독 - 사용자 상태 변경
    const channel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => loadUsers()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadUsers])

  // 온라인 상태 토글
  const toggleOnline = async () => {
    const newStatus = !isOnline
    
    // DB 업데이트
    const { error } = await supabase
      .from('users')
      .update({ is_online: newStatus })
      .eq('id', session.user.id)

    if (error) {
      console.error('상태 업데이트 오류:', error)
      return
    }

    setIsOnline(newStatus)
    onProfileUpdate({ ...userProfile, is_online: newStatus })

    if (newStatus) {
      connectWebSocket()
    } else {
      disconnectWebSocket()
    }
  }

  // WebSocket 연결
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const userName = userProfile?.name || 'Unknown'
    const ws = new WebSocket(`${WS_URL}/${session.user.id}/${encodeURIComponent(userName)}`)
    
    ws.onopen = () => {
      console.log('WebSocket 연결됨')
    }

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        // JSON 메시지 (메타데이터)
        const data = JSON.parse(event.data)
        
        if (data.type === 'audio_meta') {
          setReceiving({ name: data.sender_name, time: data.timestamp })
        } else if (data.type === 'user_status') {
          // 사용자 상태 변경 - 목록 새로고침
          loadUsers()
        }
      } else {
        // 바이너리 데이터 (오디오)
        await playAudio(event.data)
        
        // 0.5초 후 수신 표시 제거
        setTimeout(() => setReceiving(null), 500)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket 연결 해제')
    }

    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error)
    }

    wsRef.current = ws
  }

  // WebSocket 연결 해제
  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  // 오디오 재생
  const playAudio = async (audioBlob) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }

      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start(0)
    } catch (err) {
      console.error('오디오 재생 오류:', err)
    }
  }

  // 사용자 선택/해제
  const toggleUserSelection = (userId) => {
    const user = users.find(u => u.id === userId)
    if (!user?.is_online) return // 오프라인은 선택 불가

    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  // PTT 시작
  const handlePTTStart = () => {
    if (!wsRef.current || selectedUsers.size === 0) return

    wsRef.current.send(JSON.stringify({
      type: 'ptt_start',
      targets: Array.from(selectedUsers)
    }))
  }

  // PTT 오디오 전송
  const handlePTTAudio = (audioData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioData)
    }
  }

  // PTT 종료
  const handlePTTEnd = () => {
    if (!wsRef.current) return

    wsRef.current.send(JSON.stringify({
      type: 'ptt_end'
    }))
  }

  // 탭별 사용자 필터링
  const stationUsers = users.filter(u => u.type === 'station')
  const mobileUsers = users.filter(u => u.type === 'mobile')

  return (
    <div className="main-container">
      {/* 헤더 */}
      <header className="header">
        <h1>📞 학원 인터콤</h1>
        <div className="header-right">
          <div className="online-toggle">
            <span>{isOnline ? '온라인' : '오프라인'}</span>
            <div 
              className={`toggle-switch ${isOnline ? 'active' : ''}`}
              onClick={toggleOnline}
            />
          </div>
          <div className="user-info">
            <span className={`online-badge ${isOnline ? '' : 'offline'}`}></span>
            <span className="user-name">{userProfile?.name || '사용자'}</span>
          </div>
          <button className="btn-logout" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      {/* 탭 */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'station' ? 'active' : ''}`}
          onClick={() => setActiveTab('station')}
        >
          🖥️ 고정 위치
        </button>
        <button 
          className={`tab ${activeTab === 'mobile' ? 'active' : ''}`}
          onClick={() => setActiveTab('mobile')}
        >
          📱 모바일
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="content">
        {activeTab === 'station' ? (
          <StationTab 
            users={stationUsers}
            selectedUsers={selectedUsers}
            onToggleSelect={toggleUserSelection}
          />
        ) : (
          <MobileTab 
            users={mobileUsers}
            selectedUsers={selectedUsers}
            onToggleSelect={toggleUserSelection}
          />
        )}
      </div>

      {/* 선택된 인원 수 */}
      {selectedUsers.size > 0 && (
        <div className="selected-count">
          {selectedUsers.size}명 선택됨
        </div>
      )}

      {/* PTT 버튼 */}
      <PTTButton 
        disabled={!isOnline || selectedUsers.size === 0}
        onPTTStart={handlePTTStart}
        onPTTAudio={handlePTTAudio}
        onPTTEnd={handlePTTEnd}
      />

      {/* 수신 표시 */}
      {receiving && (
        <div className="receiving-indicator">
          🔊 {receiving.name}님이 말하는 중...
        </div>
      )}
    </div>
  )
}

export default MainPage
