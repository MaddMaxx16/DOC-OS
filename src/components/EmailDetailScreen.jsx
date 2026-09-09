import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function EmailDetailScreen({ message, carrier, loads = [], onReview, onOpenRelated, onOpenAttachment, onBack }) {
  if (!message) {
    return <div className="phone-page email-detail-screen email-detail-missing"><header className="email-detail-toolbar"><button type="button" className="email-detail-back" onClick={onBack} aria-label="Back to inbox">‹</button></header><div className="email-detail-scroll"><p>Message unavailable.</p></div></div>
  }

  const template = null
  const outbound = message.direction === 'outbound'
  const sender = outbound ? `To: ${message.recipientLabel || 'Recipient'}` : (message.senderOverride || template?.sender || carrier?.name || 'DOC OS')
  const subject = template?.subject || message.subject || 'Message'
  const received = Number.isFinite(message.receivedGameMinute) ? message.receivedGameMinute : 0
  const receivedDate = formatCompactDate(Math.floor(received / 1440))
  const receivedTime = formatTime(received % 1440)
  const body = message.bodyOverride || template?.body || 'We reviewed your application and would like to move forward with dispatch services.'
  const relatedLoad = message.loadId ? loads.find((load) => load.id === message.loadId) : null

  let action = null
  if (template?.action === 'OPEN CARRIERSOURCE') action = { label: 'OPEN CARRIERSOURCE', target: 'open-carriersource', destination: 'carrierSource' }
  else if (template?.action === 'OPEN FREIGHTLINK') action = { label: 'OPEN FREIGHTLINK', target: 'open-freightlink', destination: 'freightlink' }
  else if (message.type === 'carrier-application-offer') action = { label: 'REVIEW & SIGN AGREEMENT', target: 'review-agreement', destination: 'agreement' }

  return (
    <div className="phone-page email-detail-screen">
      <header className="email-detail-toolbar"><button type="button" className="email-detail-back" onClick={onBack} aria-label="Back to inbox">‹</button></header>
      <div className="email-detail-scroll">
        <article className="email-message">
          <header className="email-message-header">
            <span className={`email-direction-chip ${outbound ? 'sent' : 'received'}`}>{outbound ? 'SENT' : 'RECEIVED'}</span>
            <strong className="email-message-sender">{sender}</strong>
            <h2 className="email-message-subject">{subject}</h2>
            <time className="email-message-time">{receivedDate} · {receivedTime}</time>
          </header>
          <div className="email-message-divider" aria-hidden="true" />
          <div className="email-message-body">{String(body).split(/\n\s*\n/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>)}</div>

          {message.type === 'carrier-application-offer' && (
            <section className="email-detail-attachments compact agreement-email-link">
              <span>ATTACHMENT · 1</span>
              <button type="button" className="email-detail-file-link" onClick={() => onReview?.('agreement')}>
                <b aria-hidden="true">📎</b><p><strong>Metroline Dispatch Operating Agreement</strong><small>Open full document · review terms · sign</small></p><i>Open</i>
              </button>
            </section>
          )}

          {message.loadId && (
            <section className="email-related-link-block"><span>RELATED RECORD</span><button type="button" onClick={() => onOpenRelated?.('load', message.loadId)}>↗ {relatedLoad?.loadNumber || message.loadId} · View in FreightLink</button></section>
          )}

          {Array.isArray(message.attachments) && message.attachments.length > 0 && (
            <section className="email-detail-attachments compact">
              <span>ATTACHMENTS · {message.attachments.length}</span>
              {message.attachments.map((item) => <button type="button" className="email-detail-file-link" key={item.id} onClick={() => onOpenAttachment?.(item)}><b aria-hidden="true">📎</b><p><strong>{item.title}</strong><small>{item.meta || item.type}</small></p><i>Open</i></button>)}
            </section>
          )}
        </article>
      </div>
      {action && <div className="email-detail-action-bar"><button type="button" className="email-detail-action" onClick={() => onReview(action.destination)}>{action.label}</button></div>}
    </div>
  )
}

export default EmailDetailScreen
