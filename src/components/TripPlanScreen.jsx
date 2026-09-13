import mapLocations from '../data/mapLocations.js'
import { formatAppointment, formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function fmtMiles(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} mi` : 'Calculating'
}

function fmtMinutes(value) {
  return Number.isFinite(value) ? `${Math.round(value)} min` : 'Calculating'
}

function TripPlanScreen({
  loads,
  drivers,
  carriers = [],
  loadId,
  onChangeDriver,
  onRequestCarrierApproval,
  onViewCarrierApproval,
  onBook,
  onOpenDriverThread,
  onBack,
}) {
  const load = loads.find((item) => item.id === loadId)
  if (!load) return null

  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
  const driverId = load.assignedDriverId || load.candidateDriverId || load.tripPlan?.driverId
  const driver = drivers.find((item) => item.id === driverId)
  const carrier = carriers.find((item) => item.id === (driver?.carrierId || load.carrierId)) || carriers[0]
  const approvalRequired = Boolean(carrier?.dispatchAgreement?.loadApprovalRequired)
  const approvalStatus = load.carrierApprovalStatus || null
  const approvalReady = !approvalRequired || approvalStatus === 'APPROVED'
  const booked = Boolean(load.assignedDriverId) && load.status !== 'available'
  const deadhead = load.tripPlan?.legs?.deadhead
  const loaded = load.tripPlan?.legs?.loaded
  const projectedOrigin = load.assignmentProjection?.projectedOriginName || (load.assignmentProjection?.afterLoadId ? 'After current work' : 'Current driver position')
  const timingLabel = String(load.assignmentProjection?.status || 'GOOD').replace('GOOD FIT', 'GOOD')

  return (
    <div className="phone-page trip-plan-screen">
      <header className="docos-page-hero docos-page-hero-compact trip-plan-hero">
        <span className="docos-page-kicker">DOC OS · TRIP PLAN</span>
        <div className="docos-page-title-row">
          <div>
            <h2>{pickup?.name || 'Pickup'} → {delivery?.name || 'Delivery'}</h2>
            <p>{getFreightRouteName(load)} · {driver?.fullName || driver?.name || 'Driver not selected'}</p>
          </div>
          <span className={`trip-plan-state ${booked ? 'booked' : approvalStatus === 'PENDING' ? 'pending' : 'draft'}`}>
            {booked ? 'BOOKED' : approvalStatus === 'PENDING' ? 'PENDING' : 'DRAFT'}
          </span>
        </div>
      </header>

      <div className="docos-page-body trip-plan-body">
        <section className="docos-section trip-plan-summary">
          <div className="docos-section-heading"><span>ASSIGNMENT</span><small>ONE DECISION · SAVED</small></div>
          <div className="trip-plan-driver-card">
            <span className="driver-avatar-v2" aria-hidden="true">{(driver?.fullName || driver?.name || 'D').charAt(0)}</span>
            <div>
              <strong>{driver?.fullName || driver?.name || 'No driver selected'}</strong>
              <small>{projectedOrigin} · {timingLabel}</small>
            </div>
            <span>{booked ? 'COMMITTED' : 'SELECTED'}</span>
          </div>
        </section>

        <section className="docos-section">
          <div className="docos-section-heading"><span>ITINERARY</span><small>ROUTES PREPARED</small></div>
          <div className="trip-leg-stack">
            <article className="trip-leg-card">
              <div className="trip-leg-index">1</div>
              <div className="trip-leg-copy">
                <span>DEADHEAD · TO PICKUP</span>
                <strong>{projectedOrigin} → {pickup?.name || 'Pickup'}</strong>
                <small>{fmtMiles(deadhead?.miles)} · {fmtMinutes(deadhead?.minutes)} · Pickup {formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</small>
              </div>
              <span className="trip-leg-ready">READY</span>
            </article>

            <article className="trip-leg-card">
              <div className="trip-leg-index">2</div>
              <div className="trip-leg-copy">
                <span>LOADED · TO DELIVERY</span>
                <strong>{pickup?.name || 'Pickup'} → {delivery?.name || 'Delivery'}</strong>
                <small>{fmtMiles(loaded?.miles)} · {fmtMinutes(loaded?.minutes)} · Delivery {formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</small>
              </div>
              <span className="trip-leg-ready">READY</span>
            </article>
          </div>
        </section>

        <section className="docos-section trip-plan-approval">
          <div className="docos-section-heading"><span>CARRIER AUTHORIZATION</span><small>{carrier?.name || 'Carrier'}</small></div>
          <div className={`trip-plan-approval-row ${approvalReady ? 'approved' : approvalStatus === 'PENDING' ? 'pending' : 'required'}`}>
            <div>
              <strong>{approvalReady ? (approvalRequired ? 'APPROVED TO BOOK' : 'BOOKING AUTHORIZED') : approvalStatus === 'PENDING' ? 'AWAITING CARRIER APPROVAL' : 'APPROVAL REQUIRED'}</strong>
              <small>{approvalReady ? 'The trip can move forward without repeating driver or route review.' : 'This trip stays saved while approval is pending.'}</small>
            </div>
            <span>{approvalReady ? '✓' : approvalStatus === 'PENDING' ? '···' : '!'}</span>
          </div>
        </section>

        {Number.isFinite(load.assignmentProjection?.arrivalMinutes) && (
          <section className="docos-section">
            <div className="docos-section-heading"><span>PROJECTED PICKUP</span></div>
            <div className="docos-info-grid docos-info-grid-flat">
              <div className="docos-info-cell"><span>ARRIVAL</span><strong>{formatTime(load.assignmentProjection.arrivalMinutes)}</strong></div>
              <div className="docos-info-cell"><span>DEADHEAD</span><strong>{fmtMiles(load.assignmentProjection.deadheadMiles)}</strong></div>
            </div>
          </section>
        )}

        <div className="docos-sticky-actions trip-plan-actions">
          {!booked ? (
            <>
              {approvalReady ? (
                <button type="button" className="docos-primary-action" onClick={() => onBook?.(load.id)}>BOOK ROUTE</button>
              ) : approvalStatus === 'PENDING' ? (
                <button type="button" className="docos-primary-action" disabled>AWAITING APPROVAL</button>
              ) : (
                <button type="button" className="docos-primary-action" onClick={() => onRequestCarrierApproval?.(load.id)}>{load.scheduleApprovalQueued ? 'ADDED TO PLAN ✓' : 'ADD TO PLAN'}</button>
              )}
              {approvalStatus === 'PENDING' && <button type="button" className="docos-secondary-action" onClick={() => onViewCarrierApproval?.(load.id)}>VIEW REQUEST</button>}
              <button type="button" className="docos-secondary-action" onClick={onChangeDriver}>CHANGE DRIVER</button>
            </>
          ) : (
            <>
              <button type="button" className="docos-primary-action" onClick={() => onOpenDriverThread?.(load.id, driverId)}>{Number.isFinite(load.pickupDriverBriefedGameMinute) ? 'OPEN DRIVER THREAD' : 'SEND TRIP TO DRIVER'}</button>
              <button type="button" className="docos-secondary-action" onClick={onBack}>BACK TO LOAD</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default TripPlanScreen
