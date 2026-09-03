import mapLocations from '../data/mapLocations.js'
import { formatAppointment } from '../utils/gameTime.js'

function formatStatus(status = '') {
  return status
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatMiles(value) {
  if (value === null || value === undefined) return 'Calculating...'
  if (value === 'unavailable') return 'Unavailable'
  if (Number.isFinite(value)) return `${value.toFixed(1)} mi`
  return 'Unavailable'
}

function LoadDetailsScreen({
  loads,
  drivers,
  loadId,
  onAccept,
  onCheckDriverFit,
  onPlanRoute,
  onDispatch,
  onBack,
  tutorialEnabled = false,
  showTutorialNote = false,
}) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = load && mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = load && mapLocations.find((location) => location.id === load.deliveryLocationId)

  if (!load || !pickup || !delivery) {
    return (
      <div className="phone-page load-details-screen load-details-v2">
        <div className="load-detail-empty">
          <strong>Load unavailable</strong>
          <span>This load can no longer be opened.</span>
          <button type="button" onClick={onBack}>RETURN TO LOAD BOARD</button>
        </div>
      </div>
    )
  }

  const isAvailable = load.status === 'available'
  const sameDay = load.pickupDayIndex === load.deliveryDayIndex
  const candidateDriver = drivers.find((driver) => driver.id === load.candidateDriverId)
  const assignedDriver = drivers.find((driver) => driver.id === load.assignedDriverId)
  const verifiedDriverName = candidateDriver?.name || 'Marcus'
  const statusLabel = formatStatus(load.status)

  return (
    <div className="phone-page load-details-screen load-details-v2">
      <header className="load-detail-v2-hero">
        <span className="load-detail-v2-kicker">LOAD OPPORTUNITY</span>

        <div className="load-detail-v2-title-row">
          <h2>{load.id}</h2>
          <span className={`load-detail-v2-status ${isAvailable ? 'available' : ''}`}>
            {statusLabel}
          </span>
        </div>

        <strong className="load-detail-v2-rate">${load.rate}</strong>

        <div className="load-detail-v2-summary">
          <span>{formatMiles(load.listedMiles)}</span>
          <i aria-hidden="true">•</i>
          <span>{sameDay ? 'Same Day' : 'Multi Day'}</span>
        </div>
      </header>

      <div className="load-detail-v2-content">
        {showTutorialNote && (
          <div className="load-detail-v2-note">
            <span>DISPATCH NOTE</span>
            <p>Review the lane, schedule, mileage and rate. Then confirm Marcus can handle the load.</p>
          </div>
        )}

        <section className="load-detail-v2-route" aria-label="Load schedule">
          <div className="load-detail-v2-stop">
            <div className="load-detail-v2-stop-marker pickup" aria-hidden="true" />
            <div>
              <span>PICKUP</span>
              <strong>{pickup.name}</strong>
              <small>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</small>
            </div>
          </div>

          <div className="load-detail-v2-route-line" aria-hidden="true">
            <span>↓</span>
          </div>

          <div className="load-detail-v2-stop">
            <div className="load-detail-v2-stop-marker delivery" aria-hidden="true" />
            <div>
              <span>DELIVERY</span>
              <strong>{delivery.name}</strong>
              <small>{formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</small>
            </div>
          </div>
        </section>

        <section className="load-detail-v2-facts">
          <h3>LOAD DETAILS</h3>
          <div className="load-detail-v2-fact-list">
            <div>
              <span>Rate</span>
              <strong>${load.rate}</strong>
            </div>
            <div>
              <span>Listed Miles</span>
              <strong>{formatMiles(load.listedMiles)}</strong>
            </div>
            {Number.isFinite(load.plannedMiles) && (
              <div>
                <span>Planned Miles</span>
                <strong>{load.plannedMiles.toFixed(1)} mi</strong>
              </div>
            )}
            {Number.isFinite(load.plannedDriveTimeMinutes) && (
              <div>
                <span>Drive Time</span>
                <strong>{load.plannedDriveTimeMinutes} min</strong>
              </div>
            )}
            <div>
              <span>Status</span>
              <strong>{statusLabel}</strong>
            </div>
            {assignedDriver && (
              <div>
                <span>Driver</span>
                <strong>{assignedDriver.name}</strong>
              </div>
            )}
          </div>
        </section>

        {isAvailable && load.driverFitVerified && load.candidateDriverId && (
          <div className="load-detail-v2-fit-verified">
            <span className="load-detail-v2-fit-check" aria-hidden="true">✓</span>
            <div>
              <span>DRIVER FIT VERIFIED</span>
              <strong>{verifiedDriverName}</strong>
            </div>
          </div>
        )}

        <div className="load-detail-v2-actions">
          {isAvailable ? (
            <>
              {!load.driverFitVerified && (
                <button
                  type="button"
                  className={`load-detail-v2-primary ${tutorialEnabled ? 'tutorial-target' : ''}`}
                  onClick={onCheckDriverFit}
                >
                  CHECK DRIVER FIT
                  <span aria-hidden="true">›</span>
                </button>
              )}

              <button
                type="button"
                className={`load-detail-v2-accept ${tutorialEnabled && load.driverFitVerified && load.candidateDriverId ? 'tutorial-target' : ''}`}
                onClick={onAccept}
                disabled={!load.driverFitVerified || !load.candidateDriverId}
              >
                <span>ACCEPT LOAD</span>
                {!load.driverFitVerified && <small>Confirm driver fit first</small>}
              </button>
            </>
          ) : load.status === 'assigned' && load.assignedDriverId ? (
            <button type="button" className="load-detail-v2-primary" onClick={onPlanRoute}>
              PLAN ROUTE
              <span aria-hidden="true">›</span>
            </button>
          ) : load.status === 'route-ready' ? (
            <button type="button" className="load-detail-v2-primary" onClick={onDispatch}>
              DISPATCH DRIVER
              <span aria-hidden="true">›</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default LoadDetailsScreen
