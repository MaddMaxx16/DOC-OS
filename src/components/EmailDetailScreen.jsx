import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { mentorMessages } from '../data/tutorialContent.js'

function EmailDetailScreen({ message, carrier, onReview, onBack, tutorialTarget = null }) {
  if (!message) {
    return (
      <div className="phone-page email-detail-screen email-detail-missing">
        <header className="email-detail-toolbar">
          <button type="button" className="email-detail-back" onClick={onBack} aria-label="Back to inbox">‹</button>
        </header>
        <div className="email-detail-scroll">
          <p>Message unavailable.</p>
        </div>
      </div>
    )
  }

  const template = mentorMessages[message.templateId]
  const isMentor = message.type === 'mentor'
  const sender = template?.sender || carrier?.name || 'DOC OS'
  const subject = template?.subject || message.subject || 'Message'
  const receivedDate = formatCompactDate(Math.floor(message.receivedGameMinute / 1440))
  const receivedTime = formatTime(message.receivedGameMinute % 1440)
  const body = message.bodyOverride || template?.body || 'We reviewed your application and would like to move forward with dispatch services.'

  let action = null
  if (template?.action === 'OPEN CARRIERSOURCE') {
    action = {
      label: 'OPEN CARRIERSOURCE',
      target: 'open-carriersource',
      destination: 'carrierSource',
    }
  } else if (template?.action === 'OPEN FREIGHTLINK') {
    action = {
      label: 'OPEN FREIGHTLINK',
      target: 'open-freightlink',
      destination: 'freightlink',
    }
  } else if (!isMentor && !template) {
    action = {
      label: 'REVIEW AGREEMENT',
      target: 'review-agreement',
      destination: 'agreement',
    }
  }

  return (
    <div className="phone-page email-detail-screen">
      <header className="email-detail-toolbar">
        <button type="button" className="email-detail-back" onClick={onBack} aria-label="Back to inbox">‹</button>
      </header>

      <div className="email-detail-scroll">
        <article className="email-message">
          <header className="email-message-header">
            <strong className="email-message-sender">{sender}</strong>
            <h2 className="email-message-subject">{subject}</h2>
            <time className="email-message-time">{receivedDate} · {receivedTime}</time>
          </header>

          <div className="email-message-divider" aria-hidden="true" />

          <div className="email-message-body">
            {String(body).split(/\n\s*\n/).map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
            ))}
          </div>

          {!isMentor && (
            <section className="email-agreement-attachment" aria-label="Dispatch service agreement attachment">
              <div className="email-attachment-icon" aria-hidden="true">DOC</div>
              <div><span>ATTACHMENT</span><strong>Metroline Dispatch Service Agreement</strong><small>Review terms, responsibilities, authorization, and compensation.</small></div>
            </section>
          )}
        </article>
      </div>

      {action && (
        <div className="email-detail-action-bar">
          <button
            type="button"
            className={`email-detail-action ${tutorialTarget === action.target ? 'tutorial-target' : ''}`}
            onClick={() => onReview(action.destination)}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  )
}

export default EmailDetailScreen
