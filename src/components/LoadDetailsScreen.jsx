import { useState } from 'react'
import FirstDayLesson from './FirstDayLesson.jsx'
import './LaneReview.css'
import mapLocations from '../data/mapLocations.js'
import { formatAppointment } from '../utils/gameTime.js'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import { getFreightCommodity, getFreightRouteName } from '../utils/freightIdentity.js'
import { getFreightHaulClass } from '../utils/planningIntelligence.js'
import { getLoadHosEvaluation } from '../utils/hosPlanning.js'
import { formatHosClock, getDriverHosSummary } from '../utils/driverHOS.js'

function formatMiles(value) {
  if (Number.isFinite(value)) return `${value.toFixed(1)} mi`
  return value === 'unavailable' ? 'Unavailable' : 'Not listed'
}

function LoadDetailsScreen({ firstDay, onFirstDayProgress, onPlanFirstDayLunch, loads, drivers, carriers = [], loadId, planningDriverId = null, runtimePositions = {}, gameTime, onAddToSchedule, onOpenScheduler, onSendLoadDetails, onBack }) {
  const [evaluating, setEvaluating] = useState(false)
  const [evaluationError, setEvaluationError] = useState(null)
  const load = loads.find((item) => item.id === loadId)
  const pickup = load && mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = load && mapLocations.find((location) => location.id === load.deliveryLocationId)
  const eligibleDrivers = drivers.filter((driver) => driver.carrierId)
  const candidateDriver = load ? drivers.find((driver) => driver.id === load.candidateDriverId) : null
  const planningDriver = drivers.find((driver) => driver.id === planningDriverId) || candidateDriver || null

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
  const hosEvaluation = isAvailable && planningDriver ? getLoadHosEvaluation({ load, driver: planningDriver, loads, runtimePositions, gameTime }) : null
  const planningHos = planningDriver ? getDriverHosSummary(planningDriver) : null

  const addToPlan = async () => {
    if (evaluating) return
    setEvaluating(true)
    setEvaluationError(null)
    try {
      if (!candidateDriver) {
        const ok = await onAddToSchedule?.(load.id, planningDriver?.id || null)
        if (ok === false) { setEvaluationError('Could not evaluate this lane. Try again or choose another lane.'); return }
      }
      onOpenScheduler?.(load.id)
    } finally { setEvaluating(false) }
  }

  const driverLabel = candidateDriver ? 'AVAILABLE' : eligibleDrivers.length ? 'CHECKING' : 'NONE'
  const driverName = candidateDriver?.fullName || candidateDriver?.name || (eligibleDrivers.length ? `${eligibleDrivers.length} ON ROSTER` : 'NO DRIVER')
  const bookingLabel = rules.loadApprovalRequired ? 'APPROVAL REQUIRED' : 'AUTHORIZED'
  const rateLabel = rateFit ? 'RATE MATCH' : 'RATE REVIEW'

  const guided = isAvailable && planningDriver?.id === 'marcus' && ['freight', 'secondLane'].includes(firstDay?.step)
  const reviewIndex = firstDay?.laneReviewLoadId === load.id ? firstDay.laneReviewIndex || 0 : 0
  const checks = [
    { title: '1 · Can he make pickup?', text: `Pickup at ${pickup.name}: ${formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}. Marcus needs time to reach the shipper from his projected position. Reaching it before the window opens can mean waiting; arriving after it closes is a risk.`, section: 'pickup' },
    { title: '2 · Can he make delivery?', text: `Delivery at ${delivery.name}: ${formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}. Allow for loading, driving, waiting, and unloading. A short drive alone does not prove the appointments fit.`, section: 'pickup' },
    { title: '3 · Count the travel and work', text: hosEvaluation ? `Initial estimates: ${hosEvaluation.deadheadMinutes} minutes to pickup, then ${hosEvaluation.loadedMinutes} minutes driving loaded. The full routing check must include existing work and facility time. ${firstDay.step === 'secondLane' ? 'We must also respect the lunch window you just saved.' : 'For this first lane, focus on the appointments and his shift.'}` : 'Travel is not evaluated yet. We need the drive to pickup, the loaded leg, and the facility time before deciding this works.', section: 'hours' },
    { title: '4 · Does Marcus have the hours?', text: hosEvaluation ? `${hosEvaluation.driverTimeSummary} Driving required: ${formatHosClock(hosEvaluation.driveRequiredMinutes)}. Duty required: ${formatHosClock(hosEvaluation.dutyRequiredMinutes)}. These estimates are one check; the route evaluation must also test appointments and the carrier’s shift.` : 'Available driving time and duty time are separate limits. We still need a complete evaluation before claiming a fit.', section: 'hours' },
    { title: '5 · Is the offer worth reviewing?', text: `$${load.rate} for ${formatMiles(load.listedMiles)} loaded. ${Number.isFinite(rpm) ? `$${rpm.toFixed(2)} per loaded mile. ` : ''}${rateFit ? 'This meets the carrier’s loaded-mile rate rule. ' : 'This needs rate review against the carrier’s rule. '}That is not profit: unpaid travel and time matter too. Next, evaluate the real route and add it to a tentative plan. Approval and rate-con confirmation come before BOOK LOAD.`, section: 'money' },
  ]
  const check = checks[Math.min(4, reviewIndex)]

  return (
    <div className="phone-page load-details-screen freight-route-detail-sheet freight-route-detail-compact">
      <header className="freight-route-detail-header">
        <button type="button" onClick={onBack} aria-label="Back to FreightLink">‹</button>
        <div className="freight-route-title-block">
          <span>LANE REVIEW</span>
          <h2>{getFreightRouteName(load)}</h2>
          <p>{getFreightCommodity(load)}</p>
        </div>
        <em className={`freight-haul-tag ${haulClass.tone}`}>{haulClass.label}</em>
      </header>

      <div className={`freight-route-detail-body${guided ? ' guided-lane-review' : ''}`} data-review-section={guided ? check.section : undefined}>
        {firstDay?.step === 'restOfDay' && isAvailable && load.id !== firstDay.firstLaneId && <FirstDayLesson title="Before we add a second lane" actionLabel="PLAN LUNCH AROUND HIS BOOKED WORK" onAction={() => onPlanFirstDayLunch?.(load.id)}>
          His first lane is committed. This second one has to fit around it. Now let’s protect time for lunch, then come back to this exact lane and review it together.
        </FirstDayLesson>}
        {guided && <FirstDayLesson title={check.title} disabled={evaluating} actionLabel={evaluating ? 'CALCULATING THE ROUTE…' : reviewIndex < 4 ? 'NEXT CHECK' : 'EVALUATE FOR MARCUS'} onAction={() => {
          if (reviewIndex < 4) { onFirstDayProgress?.({ laneReviewLoadId: load.id, laneReviewIndex: reviewIndex + 1, flowVersion: 2 }); return }
          addToPlan()
        }}>{check.text}</FirstDayLesson>}

        {evaluationError && <p className="lane-review-error" role="alert">{evaluationError}</p>}
        {load.scheduleConflict && <section className="ratecon-dispatch-hold"><strong>{load.scheduleConflict.label}</strong><p>{load.scheduleConflict.detail || load.scheduleConflict.reason}</p></section>}
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

        {isAvailable && planningDriver && hosEvaluation && <section className="freight-route-hos-check" aria-label="HOS evaluation">
          <div className="freight-route-section-title"><span>HOS CHECK · {planningDriver.fullName || planningDriver.name}</span><strong className={`freight-hos-detail-status ${hosEvaluation.tone}`}>{hosEvaluation.label}</strong></div>
          <div className="freight-route-hos-grid">
            <span><b>DRIVE AVAILABLE</b><strong>{planningHos?.driving || '—'}</strong></span>
            <span><b>DRIVE REQUIRED</b><strong>{formatHosClock(hosEvaluation.driveRequiredMinutes)}</strong></span>
            <span><b>DUTY AVAILABLE</b><strong>{planningHos?.duty || '—'}</strong></span>
            <span><b>DUTY REQUIRED</b><strong>{formatHosClock(hosEvaluation.dutyRequiredMinutes)}</strong></span>
          </div>
          {hosEvaluation.tone === 'risk' && <p>Current HOS does not cover this load commitment. DOC OS will not alter the route or dispatch automatically.</p>}
        </section>}

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
        {isAvailable && firstDay?.step === 'restOfDay' ? <button type="button" onClick={() => onPlanFirstDayLunch?.(load.id)}>PLAN LUNCH BEFORE THIS SECOND LANE</button> : guided ? <span className="lane-review-next-hint">Follow Jordan’s checks above. Adding to a plan does not book the lane.</span> : isAvailable ? <button type="button" onClick={addToPlan}>{load.scheduleApprovalQueued ? 'VIEW IN SCHEDULER' : 'ADD TO PLAN'}</button> : <button type="button" onClick={() => onOpenScheduler?.(load.id)}>VIEW SCHEDULE</button>}
      </div>
    </div>
  )

}

export default LoadDetailsScreen
