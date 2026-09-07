import { mentorMessages } from '../data/tutorialContent.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function formatInboxTimestamp(receivedGameMinute, currentGameMinute) {
  const received = Number(receivedGameMinute)
  if (!Number.isFinite(received)) return ''

  const receivedDay = Math.floor(received / 1440)
  const currentDay = Number.isFinite(currentGameMinute) ? Math.floor(currentGameMinute / 1440) : receivedDay
  return receivedDay === currentDay
    ? formatTime(received % 1440)
    : formatCompactDate(receivedDay)
}

function getMessagePreview(message, template) {
  const preview = message.bodyOverride
    || template?.body
    || 'We reviewed your application and would like to move forward with dispatch services.'

  return String(preview).replace(/\s+/g, ' ').trim()
}

function EmailScreen({ messages, carriers, onOpenMessage, onBack, tutorialTarget = null, currentGameMinute = null }) {
  const sortedMessages = messages.map((message, index) => ({ message, index })).sort((a, b) => (b.message.receivedGameMinute - a.message.receivedGameMinute) || (b.index - a.index)).map(({ message }) => message)
  const unreadCount = messages.filter((message) => !message.read).length

  return (
    <div className="phone-page email-inbox-screen">
      <header className="email-inbox-header">
        <button type="button" className="email-inbox-back" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div className="email-inbox-heading">
          <h2>Inbox</h2>
          {unreadCount > 0 && <span>{unreadCount} unread</span>}
        </div>
      </header>

      {sortedMessages.length === 0 ? (
        <div className="email-inbox-empty">
          <span>No messages yet.</span>
        </div>
      ) : (
        <div className="email-inbox-list">
          {sortedMessages.map((message) => {
            const carrier = carriers.find((item) => item.id === message.carrierId)
            const template = message.type === 'mentor' ? mentorMessages[message.templateId] : null
            const sender = message.senderOverride || template?.sender || carrier?.name || message.carrierId || 'DOC OS'
            const subject = template?.subject || message.subject || ''
            const preview = getMessagePreview(message, template)
            const isTutorialTarget = message.id === tutorialTarget?.split(':')[1]

            return (
              <button
                type="button"
                className={`email-inbox-row ${message.read ? 'read' : 'unread'} ${isTutorialTarget ? 'tutorial-target' : ''}`}
                key={message.id}
                onClick={() => onOpenMessage(message)}
                aria-label={`${message.read ? '' : 'Unread email. '}${sender}. ${subject}`}
              >
                <span className="email-unread-column" aria-hidden="true">
                  {!message.read && <span className="email-unread-dot" />}
                </span>
                <span className="email-row-content">
                  <span className="email-row-topline">
                    <strong className="email-row-sender">{sender}</strong>
                    <time className="email-row-time">{formatInboxTimestamp(message.receivedGameMinute, currentGameMinute)}</time>
                  </span>
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
