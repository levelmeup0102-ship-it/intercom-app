import { useState, useRef, useCallback } from 'react'

function PTTButton({ disabled, onPTTStart, onPTTAudio, onPTTEnd }) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)

  // PTT 버튼 누르기 시작
  const handlePressStart = useCallback(async () => {
    if (disabled) return

    try {
      // 마이크 권한 요청 및 스트림 획득
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      streamRef.current = stream

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      // 오디오 청크 수신 시 전송
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onPTTAudio(event.data)
        }
      }

      // 녹음 시작
      mediaRecorder.start(100) // 100ms마다 청크 전송
      setIsSpeaking(true)
      onPTTStart()

    } catch (err) {
      console.error('마이크 접근 오류:', err)
      alert('마이크 접근 권한이 필요합니다.')
    }
  }, [disabled, onPTTStart, onPTTAudio])

  // PTT 버튼 떼기
  const handlePressEnd = useCallback(() => {
    if (!isSpeaking) return

    // 녹음 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsSpeaking(false)
    onPTTEnd()
  }, [isSpeaking, onPTTEnd])

  return (
    <div className="ptt-container">
      <button
        className={`ptt-button ${isSpeaking ? 'speaking' : ''}`}
        disabled={disabled}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        <span className="icon">{isSpeaking ? '🎙️' : '🎤'}</span>
        <span>{isSpeaking ? '말하는 중...' : '꾹 눌러서 말하기'}</span>
      </button>
    </div>
  )
}

export default PTTButton
