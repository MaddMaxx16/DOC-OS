import mapLocations from '../data/mapLocations.js'
import { formatAppointment } from '../utils/gameTime.js'

function formatStatus(status = '') {
  return status.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function formatMiles(value) {
  if (value === null || value === undefined) return 'Not listed'
  if (value === 'unavailable') return 'Unavailable'
  if (Number.isFinite(value)) return `${value.toFixed(1)} mi`
  return 'Unavailable'
}

function LoadDetailsScreen({ loads, drivers, loadId, onAccept, onCheckDriverFit, onPlanRoute, onBack }) {
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
  const isAccepted = load.status === 'accepted' && !load.assignedDriverId
  const assignedDriver = drivers.find((driver) => driver.id === load.assignedDriverId)
  const sameDay = load.pickupDayIndex === load.deliveryDayIndex
  const statusLabel = formatStatus(load.status)
  const rpm = Number.isFinite(load.listedMiles) && load.listedMiles > 0 ? load.rate / load.listedMiles : null

  return (
    <div className="phone-page load-details-screen load-details-v2 phase2-load-details">
      <header className="docos-page-hero docos-page-hero-compact freightlink-load-hero">
        <span className="docos-page-kicker">FREIGHTLINK · LOAD</span>
        <div className="docos-page-title-row">
          <div>
            <h2>{load.loadNumber || load.id}</h2>
            <p>{pickup.name} → {delivery.name}</p>
          </div>
          <span className={`load-detail-v2-status ${isAvailable ? 'available' : ''}`}>{statusLabel}</span>
        </div>
      </header>

      <div className="docos-page-body">
        <section className="load-detail-summary-compact">
          <div className="load-detail-appointment-row">
            <div><span>PICKUP</span><strong>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</strong><small>{pickup.name}</small></div>
            <span aria-hidden="true">→</span>
            <div><span>DELIVERY</span><strong>{formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</strong><small>{delivery.name}</small></div>
          </div>
          <div className="load-detail-metric-strip">
            <div><span>RATE</span><strong>${load.rate}</strong></div>
            <div><span>LOAD MILES</span><strong>{formatMiles(load.listedMiles)}</strong></div>
            {Number.isFinite(rpm) && <div><span>RATE / MI</span><strong>${rpm.toFixed(2)}</strong></div>}
            <div><span>SCHEDULE</span><strong>{sameDay ? 'SAME DAY' : 'MULTI-DAY'}</strong></div>
          </div>
        </section>

        {assignedDriver && (
          <section className="docos-section">
            <div className="docos-section-heading"><span>DRIVER ASSIGNMENT</span></div>
            <div className="freightlink-driver-assignment-row">
              <span className="driver-avatar-v2" aria-hidden="true">{(assignedDriver.fullName || assignedDriver.name || 'D').charAt(0)}</span>
              <div><strong>{assignedDriver.fullName || assignedDriver.name}</strong><small>{assignedDriver.equipment?.label || assignedDriver.trailerType || "53' Dry Van"}</small></div>
              {load.status === 'assigned' && load.tripStatus === 'assigned' ? (
                <button type="button" onClick={onPlanRoute}>PLAN TRIP</button>
              ) : <span className="docos-status-text">{load.status === 'queued' ? 'PLANNED' : 'ASSIGNED'}</span>}
            </div>
          </section>
        )}

        <div className="docos-sticky-actions load-actions-phase2">
          {isAvailable ? (
            <button type="button" className="docos-primary-action" onClick={onAccept}>ACCEPT LOAD</button>
          ) : isAccepted ? (
            <>
              <button type="button" className="docos-primary-action" onClick={onCheckDriverFit}>SELECT DRIVER</button>
              <button type="button" className="docos-secondary-action" onClick={onBack}>ASSIGN LATER</button>
            </>
          ) : load.status === 'queued' && assignedDriver ? (
            <button type="button" className="docos-secondary-action" onClick={onBack}>BACK TO FREIGHTLINK</button>
          ) : load.status === 'assigned' && load.assignedDriverId && load.tripStatus === 'assigned' ? null : load.assignedDriverId && ['en-route-pickup', 'at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup', 'loaded', 'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod'].includes(load.tripStatus) ? (
            <button type="button" className="docos-secondary-action" onClick={onBack}>ACTIVE TRIP · BACK TO FREIGHTLINK</button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default LoadDetailsScreen
