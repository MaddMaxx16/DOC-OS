function formatMessageTime(value) {
  if (!Number.isFinite(value)) return ''
  const minutes = ((value % 1440) + 1440) % 1440
  const hour24 = Math.floor(minutes / 60)
  const minute = minutes % 60
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 || 12
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`
}

function MessagesScreen({ messages = [], onBack, onRead, onViewDriver, onAction }) {
  const sorted = [...messages].sort((a, b) => (b.receivedGameMinute || 0) - (a.receivedGameMinute || 0))

  return (
    <div className="phone-page driver-messages-screen">
      <header className="driver-messages-header">
        <button type="button" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div>
          <span>COMMUNICATION</span>
          <h2>Messages</h2>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="driver-messages-empty">
          <strong>No driver messages</strong>
          <span>Driver communication will appear here during active loads.</span>
        </div>
      ) : (
        <div className="driver-messages-list">
          {sorted.map((message) => (
            <article className={`driver-message-card ${message.read ? 'read' : 'unread'}`} key={message.id} onClick={() => onRead?.(message)}>
              <div className="driver-message-avatar">{message.sender?.charAt(0)?.toUpperCase() || 'D'}</div>
              <div className="driver-message-copy">
                <div className="driver-message-topline">
                  <strong>{message.sender}</strong>
                  <time>{formatMessageTime(message.receivedGameMinute)}</time>
                </div>
                <span>{message.subject}</span>
                <p>{message.body}</p>
                {message.actionLabel ? (
                  <button
                    type="button"
                    className="driver-message-primary-action"
                    disabled={Boolean(message.actionDisabled)}
                    onClick={(event) => { event.stopPropagation(); onAction?.(message) }}
                  >
                    {message.actionLabel}
                  </button>
                ) : (
                  <button type="button" onClick={(event) => { event.stopPropagation(); onViewDriver?.(message) }}>VIEW DRIVER →</button>
                )}
              </div>
              {!message.read && <i className="driver-message-unread" aria-label="Unread" />}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default MessagesScreen
