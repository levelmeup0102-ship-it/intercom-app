import { useState } from 'react'
import { supabase } from '../supabase'

// 고정 PC 위치 목록
const STATION_LIST = [
  { value: 'elementary_counter', label: '초등관 카운터' },
  { value: 'assistant_office', label: '조교교무실' },
  { value: 'english_counter', label: '영어관 카운터' },
]

// 강사 목록 (고정 PC)
const TEACHER_LIST = [
  '태림T', '교무실장', '서정T', '지원T', '재현T', 
  '단비T', '재광T', '아영T', '오서영T', '혜련T', '민지T'
]

function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // 로그인 폼
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // 회원가입 폼
  const [name, setName] = useState('')
  const [userType, setUserType] = useState('mobile') // 'station' or 'mobile'
  const [stationName, setStationName] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // 프로필 조회
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      onLoginSuccess(profile)
    } catch (err) {
      console.error('로그인 오류:', err)
      setError(err.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      // 1. Auth 회원가입
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      // 2. 프로필 생성
      const profileData = {
        id: data.user.id,
        name: name.trim(),
        type: userType,
        station_name: userType === 'station' ? stationName : null,
        is_online: false,
      }

      const { error: profileError } = await supabase
        .from('users')
        .insert([profileData])

      if (profileError) throw profileError

      onLoginSuccess(profileData)
    } catch (err) {
      console.error('회원가입 오류:', err)
      setError(err.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>📞 학원 인터콤</h1>
        <p className="subtitle">
          {isSignUp ? '새 계정 만들기' : '로그인하여 시작하세요'}
        </p>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {isSignUp && (
            <>
              <div className="form-group">
                <label>표시 이름</label>
                <select 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required
                >
                  <option value="">선택하세요</option>
                  {TEACHER_LIST.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="__custom__">직접 입력</option>
                </select>
                {name === '__custom__' && (
                  <input
                    type="text"
                    style={{ marginTop: '8px' }}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름 입력"
                    required
                  />
                )}
              </div>

              <div className="form-group">
                <label>사용 유형</label>
                <select 
                  value={userType} 
                  onChange={(e) => setUserType(e.target.value)}
                >
                  <option value="mobile">모바일 (개인 기기)</option>
                  <option value="station">고정 PC (지정 위치)</option>
                </select>
              </div>

              {userType === 'station' && (
                <div className="form-group">
                  <label>고정 위치</label>
                  <select 
                    value={stationName} 
                    onChange={(e) => setStationName(e.target.value)}
                    required
                  >
                    <option value="">선택하세요</option>
                    {STATION_LIST.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
          >
            {loading ? '처리 중...' : (isSignUp ? '회원가입' : '로그인')}
          </button>
        </form>

        <button 
          className="btn btn-secondary" 
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError('')
          }}
        >
          {isSignUp ? '이미 계정이 있어요' : '새 계정 만들기'}
        </button>

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  )
}

export default Login
