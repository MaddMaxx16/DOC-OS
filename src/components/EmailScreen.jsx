import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function formatInboxTimestamp(receivedGameMinute, currentGameMinute) {
  const received = Number(receivedGameMinute)
  if (!Number.isFinite(received)) return ''
  const receivedDay = Math.floor(received / 1440)
  const currentDay = Number.isFinite(currentGameMinute) ? Math.floor(currentGameMinute / 1440) : receivedDay
  return receivedDay === currentDay ? formatTime(received % 1440) : formatCompactDate(receivedDay)
}

function getMessagePreview(message, template) {
  const preview = message.bodyOverride || template?.body || 'We reviewed your application and would like to move forward with dispatch services.'
  return String(preview).replace(/\s+/g, ' ').trim()
}

function EmailScreen({ messages, carriers, onOpenMessage, onCompose, onBack, currentGameMinute = null }) {
  const sortedMessages = messages.map((message, index) => ({ message, index })).sort((a, b) => (b.message.receivedGameMinute - a.message.receivedGameMinute) || (b.index - a.index)).map(({ message }) => message)
  const unreadCount = messages.filter((message) => message.direction !== 'outbound' && !message.read).length

  return (
    <div className="phone-page email-inbox-screen">
      <header className="email-inbox-header">
        <button type="button" className="email-inbox-back" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div className="email-inbox-heading"><h2>Inbox</h2>{unreadCount > 0 && <span>{unreadCount} unread</span>}</div>
        <button type="button" className="email-new-button" onClick={onCompose}>+ NEW</button>
      </header>

      {sortedMessages.length === 0 ? <div className="email-inbox-empty"><span>No messages yet.</span></div> : (
        <div className="email-inbox-list">
          {sortedMessages.map((message) => {
            const carrier = carriers.find((item) => item.id === message.carrierId)
            const template = null
            const outbound = message.direction === 'outbound'
            const sender = outbound ? `To: ${message.recipientLabel || 'Recipient'}` : (message.senderOverride || template?.sender || carrier?.name || message.carrierId || 'DOC OS')
            const subject = template?.subject || message.subject || ''
            const preview = getMessagePreview(message, template)
            return (
              <button type="button" className={`email-inbox-row ${message.read || outbound ? 'read' : 'unread'} ${outbound ? 'sent' : ''}`} key={message.id} onClick={() => onOpenMessage(message)}>
                <span className="email-unread-column" aria-hidden="true">{!outbound && !message.read && <span className="email-unread-dot" />}</span>
                <span className="email-row-content">
                  <span className="email-row-topline"><strong className="email-row-sender">{sender}</strong><time className="email-row-time">{formatInboxTimestamp(message.receivedGameMinute, currentGameMinute)}</time></span>
                  <span className="email-row-subject">{subject}</span>
                  <span className="email-row-preview">{preview}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EmailScreen
