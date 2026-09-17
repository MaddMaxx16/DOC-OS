import { useMemo, useState } from 'react'
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

function getEmailCategory(message = {}) {
  if (message.direction === 'outbound') return { label: 'SENT', tone: 'sent' }
  if (message.type === 'carrier-performance-review') return { label: 'CAREER', tone: 'career' }
  if (message.type === 'carrier-application-offer') return { label: 'OFFER', tone: 'career' }
  if (message.workflowType === 'carrier-approval') return { label: 'OPERATIONS', tone: 'operations' }
  if (message.workflowType === 'pod-correction' || message.workflowType === 'rate-confirmation') return { label: 'DOCUMENTS', tone: 'documents' }
  if (message.workflowType === 'invoice-submission') return { label: 'ACCOUNTING', tone: 'accounting' }
  const sender = String(message.senderOverride || '').toLowerCase()
  if (sender.includes('accounting')) return { label: 'ACCOUNTING', tone: 'accounting' }
  if (sender.includes('documentation')) return { label: 'DOCUMENTS', tone: 'documents' }
  if (sender.includes('operations')) return { label: 'OPERATIONS', tone: 'operations' }
  if (sender.includes('carriersource')) return { label: 'CARRIERSOURCE', tone: 'career' }
  return { label: 'GENERAL', tone: 'general' }
}

function senderInitials(sender = '') {
  const clean = String(sender).replace(/^To:\s*/i, '').split('·')[0].trim()
  const words = clean.split(/\s+/).filter(Boolean)
  if (!words.length) return 'DO'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase()
}

function EmailScreen({ messages = [], carriers = [], onOpenMessage, onBack, currentGameMinute = null }) {
  const [filter, setFilter] = useState('unread')
  const sortedMessages = useMemo(() => messages
    .map((message, index) => ({ message, index }))
    .sort((a, b) => (b.message.receivedGameMinute - a.message.receivedGameMinute) || (b.index - a.index))
    .map(({ message }) => message), [messages])
  const unreadCount = messages.filter((message) => message.direction !== 'outbound' && !message.read).length
  const visibleMessages = filter === 'unread'
    ? sortedMessages.filter((message) => message.direction !== 'outbound' && !message.read)
    : sortedMessages

  return (
    <div className="phone-page email-inbox-screen email-inbox-v4">
      <header className="email-inbox-header email-inbox-header-v4">
        <button type="button" className="email-inbox-back" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div className="email-inbox-heading email-inbox-heading-v4">
          <span className="email-inbox-eyebrow">COMMUNICATIONS</span>
          <div><h2>Email</h2><span>{unreadCount > 0 ? `${unreadCount} unread` : 'Inbox clear'}</span></div>
        </div>
        <span className="email-inbox-header-spacer" aria-hidden="true" />
      </header>

      <div className="email-inbox-filters" role="tablist" aria-label="Email filter">
        <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>ALL <span>{messages.length}</span></button>
        <button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>UNREAD <span>{unreadCount}</span></button>
      </div>

      {visibleMessages.length === 0 ? <div className="email-inbox-empty"><strong>{filter === 'unread' ? 'You’re caught up.' : 'No email yet.'}</strong><span>{filter === 'unread' ? 'New carrier and operations email will appear here.' : 'Carrier and operations communication will appear here.'}</span></div> : (
        <div className="email-inbox-list">
          {visibleMessages.map((message) => {
            const carrier = carriers.find((item) => item.id === message.carrierId)
            const template = null
            const outbound = message.direction === 'outbound'
            const sender = outbound ? `To: ${message.recipientLabel || 'Recipient'}` : (message.senderOverride || template?.sender || carrier?.name || message.carrierId || 'DOC OS')
            const subject = template?.subject || message.subject || ''
            const preview = getMessagePreview(message, template)
            const category = getEmailCategory(message)
            const unread = !outbound && !message.read
            return (
              <button type="button" className={`email-inbox-row email-inbox-row-v4 ${message.read || outbound ? 'read' : 'unread'} ${outbound ? 'sent' : ''}`} key={message.id} onClick={() => onOpenMessage(message)}>
                <span className={`email-sender-avatar ${category.tone}`} aria-hidden="true">
                  {senderInitials(sender)}
                  {unread && <span className="email-avatar-unread" />}
                </span>
                <span className="email-row-content">
                  <span className="email-row-topline"><strong className="email-row-sender">{sender}</strong><time className="email-row-time">{formatInboxTimestamp(message.receivedGameMinute, currentGameMinute)}</time></span>
                  <span className="email-row-category-line"><span className={`email-category-chip ${category.tone}`}>{category.label}</span>{message.replyToEmailId && <span className="email-reply-chip">REPLY</span>}</span>
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
