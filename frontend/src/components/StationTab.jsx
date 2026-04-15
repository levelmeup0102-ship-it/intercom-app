// 고정 위치 매핑
const STATION_LABELS = {
  'elementary_counter': '초등관 카운터',
  'assistant_office': '조교교무실',
  'english_counter': '영어관 카운터',
}

function StationTab({ users, selectedUsers, onToggleSelect }) {
  // 위치별로 분류
  const counterUsers = users.filter(u => 
    ['elementary_counter', 'assistant_office', 'english_counter'].includes(u.station_name)
  )
  const teacherUsers = users.filter(u => 
    !['elementary_counter', 'assistant_office', 'english_counter'].includes(u.station_name)
  )

  const renderUserCard = (user) => {
    const isSelected = selectedUsers.has(user.id)
    const isOnline = user.is_online
    const stationLabel = STATION_LABELS[user.station_name]

    return (
      <div
        key={user.id}
        className={`user-card ${isSelected ? 'selected' : ''} ${!isOnline ? 'offline' : ''}`}
        onClick={() => onToggleSelect(user.id)}
      >
        <div className={`status-dot ${isOnline ? '' : 'offline'}`}></div>
        <div className="name">{user.name}</div>
        {stationLabel && <div className="location">{stationLabel}</div>}
      </div>
    )
  }

  return (
    <>
      {/* 카운터 섹션 */}
      {counterUsers.length > 0 && (
        <div className="section">
          <div className="section-title">📍 카운터 / 사무실</div>
          <div className="users-grid">
            {counterUsers.map(renderUserCard)}
          </div>
        </div>
      )}

      {/* 강사 섹션 */}
      {teacherUsers.length > 0 && (
        <div className="section">
          <div className="section-title">👨‍🏫 강사교무실</div>
          <div className="users-grid">
            {teacherUsers.map(renderUserCard)}
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
          등록된 고정 PC가 없습니다.
        </div>
      )}
    </>
  )
}

export default StationTab
