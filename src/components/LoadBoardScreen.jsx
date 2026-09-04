import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function formatListedMiles(value) {
  if (value === null) return 'CALCULATING'
  if (value === 'unavailable') return 'UNAVAILABLE'
  return `${value.toFixed(1)} MI`
}

function formatLoadStatus(status) {
  if (!status) return 'AVAILABLE'
  return status.replace(/-/g, ' ').toUpperCase()
}

function LoadBoardScreen({ loads, gameTime, embedded = false, onBack, onSelectLoad, tutorialEnabled = false, tutorialLoadId = 'DOC001' }) {
  const now = (gameTime?.gameDayIndex ?? 0) * 1440 + (gameTime?.totalMinutesOfDay ?? 420)
  const visibleLoads = loads.filter((load) => {
    const timeUnlocked = load.postedGameMinute === undefined || now >= load.postedGameMinute
    const progressionUnlocked = !load.unlockAfterLoadId || loads.some((candidate) => candidate.id === load.unlockAfterLoadId && candidate.status === 'completed')
    return timeUnlocked && progressionUnlocked && !['completed', 'delivered'].includes(load.status)
  })

  return (
    <div className={`phone-page load-board-screen freightlink-v2 ${embedded ? 'embedded' : ''}`}>
      <header className="freightlink-page-heading">
        <span className="freightlink-kicker">FREIGHT MARKET</span>
        <div className="freightlink-title-row">
          <h2>FreightLink</h2>
          <span className="freightlink-live-count">{visibleLoads.length} AVAILABLE</span>
        </div>
        <p>Review available freight for your active carrier.</p>
      </header>

      {tutorialEnabled && tutorialLoadId === 'DOC001' && (
        <div className="freightlink-dispatch-note">
          <span>DISPATCH NOTE</span>
          <p>Compare the lane, appointment times, mileage, and rate before committing Marcus.</p>
        </div>
      )}

      <section className="freightlink-loads" aria-label="Available loads">
        <div className="freightlink-section-label">AVAILABLE LOADS</div>

        {visibleLoads.length ? (
          <div className="load-list">
            {visibleLoads.map((load) => {
              const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
              const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)

              if (!pickup || !delivery) return null

              return (
                <button
                  type="button"
                  className={`load-card freight-load-card ${tutorialEnabled && load.id === tutorialLoadId && load.status === 'available' ? 'tutorial-target' : ''}`}
                  key={load.id}
                  onClick={() => onSelectLoad(load.id)}
                >
                  <div className="freight-load-topline">
                    <div>
                      <span className="freight-load-id">{load.id}</span>
                      <span className="freight-load-status">{formatLoadStatus(load.status)}</span>
                    </div>
                    <div className="freight-load-rate">
                      <span>RATE</span>
                      <strong>${load.rate}</strong>
                    </div>
                  </div>

                  <div className="freight-load-route">
                    <div className="freight-route-stop">
                      <span>PICKUP</span>
                      <strong>{pickup.name}</strong>
                      <small>{formatCompactDate(load.pickupDayIndex)} · {formatTime(load.pickupWindowStartMinutes)}</small>
                    </div>
                    <div className="freight-route-arrow" aria-hidden="true">↓</div>
                    <div className="freight-route-stop">
                      <span>DELIVERY</span>
                      <strong>{delivery.name}</strong>
                      <small>{formatCompactDate(load.deliveryDayIndex)} · {formatTime(load.deliveryWindowStartMinutes)}</small>
                    </div>
                  </div>

                  <div className="freight-load-metrics">
                    <div>
                      <span>LISTED MILES</span>
                      <strong>{formatListedMiles(load.listedMiles)}</strong>
                    </div>
                    <div>
                      <span>APPOINTMENTS</span>
                      <strong>{load.pickupDayIndex === load.deliveryDayIndex ? 'SAME DAY' : 'MULTI-DAY'}</strong>
                    </div>
                  </div>

                  <div className="freight-load-action">
                    <span>VIEW LOAD</span>
                    <span aria-hidden="true">›</span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="freightlink-empty">
            <strong>No loads available.</strong>
            <span>New freight will appear here when it posts.</span>
          </div>
        )}
      </section>

      {!embedded && <button type="button" className="back-button" onClick={onBack}>Back</button>}
    </div>
  )
}

export default LoadBoardScreen
