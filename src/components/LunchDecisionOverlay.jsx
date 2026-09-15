import { formatTime } from '../utils/gameTime.js'

function effectTone(label = '') {
  if (label.includes('-')) return 'cost'
  if (label.includes('+')) return 'benefit'
  return 'neutral'
}

export default function LunchDecisionOverlay({ driver, choices = [], gameTime, onChoose, onClose }) {
  if (!driver || !choices.length) return null
  const driverName = driver.fullName || driver.name || 'Driver'
  return (
    <div className="lunch-decision-backdrop" role="dialog" aria-modal="false" aria-label={`${driverName} lunch decision`}>
      <section className="lunch-decision-sheet">
        <header className="lunch-decision-header">
          <div className="lunch-decision-titleblock">
            <span className="lunch-decision-kicker">DRIVER DUTY · LUNCH</span>
            <div className="lunch-decision-driverline">
              <h2>{driverName}</h2>
              <p>{formatTime(gameTime?.totalMinutesOfDay || 0)}</p>
            </div>
          </div>
          <button type="button" className="lunch-decision-close" onClick={() => onClose?.()}>LATER</button>
        </header>

        <div className="lunch-decision-grid">
          {choices.map((choice) => (
            <button type="button" className={`lunch-option-card category-${choice.category}`} key={choice.id} onClick={() => onChoose?.(choice)}>
              <span className="lunch-option-eyebrow">{choice.eyebrow}</span>
              <strong>{choice.title}</strong>
              <p>{choice.description}</p>
              <span className="lunch-option-effects">
                {choice.effectLabels.map((label) => <small className={effectTone(label)} key={label}>{label}</small>)}
              </span>
              <b>CHOOSE</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
