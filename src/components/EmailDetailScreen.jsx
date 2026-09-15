import { getFreightRouteName } from '../utils/freightIdentity.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function getEmailCategory(message = {}) {
  if (message.direction === 'outbound') return { label: 'SENT', tone: 'sent' }
  if (message.type === 'carrier-performance-review') return { label: 'CAREER', tone: 'career' }
  if (message.type === 'carrier-application-offer') return { label: 'OFFER', tone: 'career' }
  if (message.workflowType === 'carrier-approval') return { label: 'OPERATIONS', tone: 'operations' }
  if (message.workflowType === 'pod-correction') return { label: 'DOCUMENTS', tone: 'documents' }
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


function parseLegacyCareerReview(message = {}) {
  if (message.type !== 'carrier-performance-review') return null
  const body = String(message.bodyOverride || '')
  const day = body.match(/Day\s+(\d+)\s+performance review/i)
  const grade = body.match(/Grade:\s*([A-F])/i)
  const service = body.match(/Service windows:\s*(\d+)\s*\/\s*(\d+)/i)
  const relationship = body.match(/Relationship:\s*\d+\s*→\s*\d+\s*\(([+-]?\d+)\)/i)
  const xp = body.match(/Carrier XP:\s*\+(\d+)/i)
  const status = body.match(/Account status:\s*([^\n]+)/i)
  const level = body.match(/Account progression:\s*Level\s*(\d+)\s*→\s*Level\s*(\d+)/i)
  const strike = body.match(/Strike\s*(\d+)\s+is now on the account/i)
  if (!grade && !service && !xp) return null
  return {
    operationDay: Number(day?.[1] || 0),
    grade: grade?.[1]?.toUpperCase() || '—',
    serviceWindowsMet: Number(service?.[1] || 0),
    serviceWindowsTotal: Number(service?.[2] || 0),
    relationshipChange: Number(relationship?.[1] || 0),
    carrierXpGain: Number(xp?.[1] || 0),
    statusLabel: String(status?.[1] || 'ACTIVE').trim().split(/Service warning:|Recovery credit:|Account progression:/i)[0].trim(),
    levelBefore: Number(level?.[1] || 0),
    levelAfter: Number(level?.[2] || 0),
    levelUp: Boolean(level),
    strikeIssued: Boolean(strike),
    strikeForgiven: /Recovery credit:/i.test(body),
    strikeCountAfter: Number(strike?.[1] || 0),
  }
}

function signedDelta(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : ''}${number}`
}

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
  const category = getEmailCategory(message)
  const careerReview = message.careerReview || parseLegacyCareerReview(message)

  let action = null
  if (template?.action === 'OPEN CARRIERSOURCE') action = { label: 'OPEN CARRIERSOURCE', target: 'open-carriersource', destination: 'carrierSource' }
  else if (template?.action === 'OPEN FREIGHTLINK') action = { label: 'OPEN FREIGHTLINK', target: 'open-freightlink', destination: 'freightlink' }
  else if (message.type === 'carrier-application-offer') action = { label: 'REVIEW & SIGN AGREEMENT', target: 'review-agreement', destination: 'agreement' }
  else if (message.type === 'carrier-performance-review') action = { label: 'OPEN CARRIERSOURCE', target: 'open-carriersource', destination: 'carrierSource' }

  return (
    <div className="phone-page email-detail-screen email-detail-v4">
      <header className="email-detail-toolbar email-detail-toolbar-v4"><button type="button" className="email-detail-back" onClick={onBack} aria-label="Back to inbox">‹</button><span>EMAIL</span></header>
      <div className="email-detail-scroll">
        <article className="email-message email-message-v4">
          <header className="email-message-header email-message-header-v4">
            <div className={`email-detail-avatar ${category.tone}`}>{senderInitials(sender)}</div>
            <div className="email-detail-sender-block">
              <strong className="email-message-sender">{sender}</strong>
              <span className={`email-category-chip ${category.tone}`}>{category.label}</span>
            </div>
            <time className="email-message-time">{receivedDate} · {receivedTime}</time>
          </header>
          <h2 className="email-message-subject email-message-subject-v4">{subject}</h2>
          <div className="email-message-divider" aria-hidden="true" />

          {careerReview && (
            <section className={`email-career-review-card ${careerReview.grade === 'A' ? 'strong' : careerReview.strikeIssued ? 'warning' : ''}`}>
              <div className="email-career-grade"><span>DAY {String(careerReview.operationDay || '').padStart(2, '0')} REVIEW</span><strong>{careerReview.grade || '—'}</strong></div>
              <div className="email-career-review-grid">
                <div><span>SERVICE</span><strong>{careerReview.serviceWindowsMet}/{careerReview.serviceWindowsTotal}</strong></div>
                <div><span>RELATIONSHIP</span><strong>{signedDelta(careerReview.relationshipChange)}</strong></div>
                <div><span>CARRIER XP</span><strong>+{careerReview.carrierXpGain || 0}</strong></div>
                <div><span>ACCOUNT</span><strong>{careerReview.statusLabel || 'ACTIVE'}</strong></div>
              </div>
              {careerReview.levelUp && <div className="email-career-event">LEVEL {careerReview.levelBefore} → LEVEL {careerReview.levelAfter}</div>}
              {careerReview.strikeIssued && <div className="email-career-event warning">SERVICE WARNING · STRIKE {careerReview.strikeCountAfter}</div>}
              {careerReview.strikeForgiven && <div className="email-career-event recovery">RECOVERY CREDIT · STRIKE REMOVED</div>}
            </section>
          )}

          <div className="email-message-body">{String(body).split(/\n\s*\n/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>)}</div>

          {message.type === 'carrier-application-offer' && (
            <section className="email-detail-attachments compact agreement-email-link">
              <span>ATTACHMENT · 1</span>
              <button type="button" className="email-detail-file-link" onClick={() => onReview?.('agreement')}>
                <b aria-hidden="true">📎</b><p><strong>{carrier?.name || 'Carrier'} Dispatch Operating Agreement</strong><small>Open full document · review terms · sign</small></p><i>Open</i>
              </button>
            </section>
          )}

          {message.loadId && (
            message.workflowType === 'carrier-approval' ? (
              <section className="email-related-link-block"><span>NEXT ACTION</span><button type="button" onClick={() => onOpenRelated?.('schedule', message.loadId)}>↗ VIEW TODAY’S PLAN</button></section>
            ) : (
              <section className="email-related-link-block"><span>RELATED ROUTE</span><button type="button" onClick={() => onOpenRelated?.('load', message.loadId)}>↗ {relatedLoad ? getFreightRouteName(relatedLoad) : 'Route'} · View in FreightLink</button></section>
            )
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
