import { formatTime } from '../utils/gameTime.js'

export default function LunchDecisionOverlay({ driver, choices = [], gameTime, onChoose, onClose }) {
  if (!driver || !choices.length) return null
  const driverName = driver.fullName || driver.name || 'Driver'
  return (
    <div className="lunch-decision-backdrop" role="dialog" aria-modal="false" aria-label={`${driverName} lunch stop planning`}>
      <section className="lunch-decision-sheet">
        <header className="lunch-decision-header">
          <div className="lunch-decision-titleblock">
            <span className="lunch-decision-kicker">LUNCH PLANNING</span>
            <div className="lunch-decision-driverline"><h2>{driverName}</h2><p>{formatTime(gameTime?.totalMinutesOfDay || 0)}</p></div>
          </div>
          <button type="button" className="lunch-decision-close" onClick={() => onClose?.()}>LATER</button>
        </header>
        <div className="lunch-decision-context"><span>ROUTE-AHEAD OPTIONS</span><strong>Choose where to send {driverName} for the scheduled break.</strong><small>Stops are selected from the remaining route to avoid unnecessary backtracking.</small></div>
        <div className="lunch-decision-grid">
          {choices.map((choice) => {
            const stop = choice.lunchStop
            return (
              <button type="button" className={`lunch-option-card category-${choice.category}`} key={choice.id} onClick={() => onChoose?.(choice)}>
                <span className="lunch-option-eyebrow">{choice.eyebrow}</span>
                <strong>{choice.title}</strong>
                <p>{Number.isFinite(stop?.forwardRouteMiles) ? `${stop.forwardRouteMiles.toFixed(1)} MI AHEAD` : 'NEAR CURRENT ROUTE'}{Number.isFinite(stop?.offRouteMiles) ? ` · ${stop.offRouteMiles.toFixed(1)} MI OFF ROUTE` : ''}</p>
                <b>SELECT →</b>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
