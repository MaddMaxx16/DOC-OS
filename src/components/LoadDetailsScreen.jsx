import mapLocations from '../data/mapLocations.js'
import { formatAppointment } from '../utils/gameTime.js'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import { getFreightCommodity, getFreightRouteName } from '../utils/freightIdentity.js'
import { getFreightHaulClass } from '../utils/planningIntelligence.js'

function formatMiles(value) {
  if (Number.isFinite(value)) return `${value.toFixed(1)} mi`
  return value === 'unavailable' ? 'Unavailable' : 'Not listed'
}

function LoadDetailsScreen({ loads, drivers, carriers = [], loadId, onAddToSchedule, onOpenScheduler, onSendLoadDetails, onBack }) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = load && mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = load && mapLocations.find((location) => location.id === load.deliveryLocationId)
  const eligibleDrivers = drivers.filter((driver) => driver.carrierId)
  const candidateDriver = load ? drivers.find((driver) => driver.id === load.candidateDriverId) : null

  // AW1.7: viewing a FreightLink load is read-only. The plan is only mutated
  // after the dispatcher explicitly taps ADD TO PLAN.

  if (!load || !pickup || !delivery) return <div className="phone-page load-details-screen"><div className="load-detail-empty"><strong>Route unavailable</strong><button type="button" onClick={onBack}>RETURN TO FREIGHTLINK</button></div></div>

  const isAvailable = load.status === 'available'
  const assignedDriver = drivers.find((driver) => driver.id === load.assignedDriverId)
  const candidateCarrier = candidateDriver ? carriers.find((carrier) => carrier.id === candidateDriver.carrierId) : carriers.find((carrier) => carrier.id === load.carrierId)
  const rules = getAgreementRules(candidateCarrier || carriers[0])
  const rpm = Number.isFinite(load.listedMiles) && load.listedMiles > 0 ? load.rate / load.listedMiles : null
  const rateFit = !Number.isFinite(rules.minimumRatePerLoadedMile) || !Number.isFinite(rpm) || rpm >= rules.minimumRatePerLoadedMile
  const haulClass = getFreightHaulClass(load)

  const addToPlan = async () => {
    if (!candidateDriver) {
      const ok = await onAddToSchedule?.(load.id)
      if (ok === false) return
    }
    onOpenScheduler?.(load.id)
  }

  const driverLabel = candidateDriver ? 'AVAILABLE' : eligibleDrivers.length ? 'CHECKING' : 'NONE'
  const driverName = candidateDriver?.fullName || candidateDriver?.name || (eligibleDrivers.length ? `${eligibleDrivers.length} ON ROSTER` : 'NO DRIVER')
  const bookingLabel = rules.loadApprovalRequired ? 'APPROVAL REQUIRED' : 'AUTHORIZED'
  const rateLabel = rateFit ? 'RATE MATCH' : 'RATE REVIEW'

  return (
    <div className="phone-page load-details-screen freight-route-detail-sheet freight-route-detail-compact">
      <header className="freight-route-detail-header">
        <button type="button" onClick={onBack} aria-label="Back to FreightLink">‹</button>
        <div className="freight-route-title-block">
          <span>ROUTE</span>
          <h2>{getFreightRouteName(load)}</h2>
          <p>{getFreightCommodity(load)}</p>
        </div>
        <em className={`freight-haul-tag ${haulClass.tone}`}>{haulClass.label}</em>
      </header>

      <div className="freight-route-detail-body">
        <section className="freight-route-window-card" aria-label="Pickup and delivery windows">
          <div>
            <span>PICKUP</span>
            <strong>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</strong>
            <small>{pickup.name}</small>
          </div>
          <i>→</i>
          <div>
            <span>DELIVERY</span>
            <strong>{formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</strong>
            <small>{delivery.name}</small>
          </div>
        </section>

        <section className="freight-route-metrics" aria-label="Route economics">
          <div><span>RATE</span><strong>${load.rate}</strong></div>
          <div><span>MILES</span><strong>{formatMiles(load.listedMiles)}</strong></div>
          <div><span>RATE / MI</span><strong>{Number.isFinite(rpm) ? `$${rpm.toFixed(2)}` : '—'}</strong></div>
        </section>

        {isAvailable && <section className="freight-route-initial-check freight-route-check-strip">
          <div className="freight-route-section-title"><span>INITIAL CHECK</span></div>
          <div className="freight-route-check-row">
            <span><b>DRIVER</b><strong>{driverLabel}</strong><small>{driverName}</small></span>
            <span><b>RATE</b><strong>{rateLabel}</strong></span>
            <span><b>BOOKING</b><strong>{bookingLabel}</strong></span>
            <span><b>HAUL</b><strong>{haulClass.label}</strong></span>
          </div>
          {haulClass.label === 'LONG HAUL' && <p className="freight-route-commitment-note">Major travel commitment — review the full day in Today’s Plan before requesting approval.</p>}
        </section>}

        {assignedDriver && <section className="freight-route-assigned"><span>ASSIGNED DRIVER</span><strong>{assignedDriver.fullName || assignedDriver.name}</strong><button type="button" onClick={() => onSendLoadDetails?.(load.id, assignedDriver.id)}>OPEN DRIVER THREAD</button></section>}
      </div>

      <div className="freight-route-primary-action">
        {isAvailable ? <button type="button" onClick={addToPlan}>{load.scheduleApprovalQueued ? 'VIEW IN SCHEDULER' : 'ADD TO PLAN'}</button> : <button type="button" onClick={() => onOpenScheduler?.(load.id)}>VIEW SCHEDULE</button>}
      </div>
    </div>
  )

}

export default LoadDetailsScreen
