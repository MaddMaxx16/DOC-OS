function formatMessageTime(value) {
  if (!Number.isFinite(value)) return ''
  const minutes = ((value % 1440) + 1440) % 1440
  const hour24 = Math.floor(minutes / 60)
  const minute = minutes % 60
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 || 12
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`
}

function MessagesScreen({ messages = [], drivers = [], onBack, onOpenThread }) {
  const threadDriverIds = Array.from(new Set(messages.map((message) => message.driverId).filter(Boolean)))

  return (
    <div className="phone-page driver-messages-screen">
      <header className="driver-messages-header">
        <button type="button" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div>
          <span>COMMUNICATION</span>
          <h2>Messages</h2>
        </div>
      </header>

      {threadDriverIds.length === 0 ? (
        <div className="driver-messages-empty">
          <strong>No driver messages</strong>
          <span>Driver conversations will appear here once a carrier is active.</span>
        </div>
      ) : (
        <div className="driver-thread-list">
          {threadDriverIds.map((driverId) => {
            const driver = drivers.find((item) => item.id === driverId)
            const thread = messages.filter((message) => message.driverId === driverId).sort((a, b) => (a.receivedGameMinute || 0) - (b.receivedGameMinute || 0))
            const latest = thread[thread.length - 1]
            const unread = thread.filter((message) => message.direction !== 'outbound' && !message.read).length
            const driverName = driver?.fullName || latest?.sender || 'Driver'
            return (
              <button type="button" className="driver-thread-row" key={driverId} onClick={() => onOpenThread?.(driverId)}>
                <span className="driver-thread-avatar">{driverName.charAt(0).toUpperCase()}</span>
                <span className="driver-thread-copy">
                  <span className="driver-thread-topline">
                    <strong>{driverName}</strong>
                    <time>{formatMessageTime(latest?.receivedGameMinute)}</time>
                  </span>
                  <span className="driver-thread-preview">{latest?.body || 'Open conversation'}</span>
                </span>
                {unread > 0 && <span className="driver-thread-unread">{unread}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MessagesScreen
