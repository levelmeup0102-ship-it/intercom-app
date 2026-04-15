function MobileTab({ users, selectedUsers, onToggleSelect }) {
  const renderUserCard = (user) => {
    const isSelected = selectedUsers.has(user.id)
    const isOnline = user.is_online

    return (
      <div
        key={user.id}
        className={`user-card ${isSelected ? 'selected' : ''} ${!isOnline ? 'offline' : ''}`}
        onClick={() => onToggleSelect(user.id)}
      >
        <div className={`status-dot ${isOnline ? '' : 'offline'}`}></div>
        <div className="name">{user.name}</div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="section-title">📱 모바일 사용자</div>
      <div className="users-grid">
        {users.map(renderUserCard)}
      </div>

      {users.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
          모바일로 접속한 사용자가 없습니다.
        </div>
      )}
    </div>
  )
}

export default MobileTab
