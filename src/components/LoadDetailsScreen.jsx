import mapLocations from '../data/mapLocations.js'
import { formatAppointment, formatTime } from '../utils/gameTime.js'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import { getFreightCommodity, getFreightRouteName } from '../utils/freightIdentity.js'
import { getFreightHaulClass } from '../utils/planningIntelligence.js'
import { getLoadHosEvaluation } from '../utils/hosPlanning.js'
import { formatHosClock, getDriverHosSummary } from '../utils/driverHOS.js'

function formatMiles(value) {
  if (Number.isFinite(Number(value))) return `${Number(value).toFixed(1)} mi`
  return value === 'unavailable' ? 'Unavailable' : 'Not listed'
}

function evaluationTone(ok, unknown = false) {
  if (unknown) return 'pending'
  return ok ? 'good' : 'risk'
}

function LoadDetailsScreen({
  loads,
  drivers,
  carriers = [],
  loadId,
  planningDriverId = null,
  runtimePositions = {},
  gameTime,
  onEvaluateLoad,
  onRequestApproval,
  onRequestBooking,
  onOpenRateConfirmation,
  onPlanLunch,
  onOpenScheduler,
  onSendLoadDetails,
  onBack,
}) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = load && mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = load && mapLocations.find((location) => location.id === load.deliveryLocationId)
  const eligibleDrivers = drivers.filter((driver) => driver.carrierId)
  const candidateDriver = load ? drivers.find((driver) => driver.id === load.candidateDriverId) : null
  const assignedDriver = load ? drivers.find((driver) => driver.id === load.assignedDriverId) : null
  const planningDriver = drivers.find((driver) => driver.id === planningDriverId) || candidateDriver || assignedDriver || eligibleDrivers[0] || null

  if (!load || !pickup || !delivery) {
    return <div className="phone-page load-details-screen"><div className="load-detail-empty"><strong>Lane unavailable</strong><button type="button" onClick={onBack}>RETURN TO FREIGHTLINK</button></div></div>
  }

  const isAvailable = load.status === 'available'
  const carrier = carriers.find((item) => item.id === (planningDriver?.carrierId || load.carrierId)) || carriers[0] || null
  const rules = getAgreementRules(carrier)
  const approvalRequired = Boolean(rules.loadApprovalRequired)
  const rpm = Number.isFinite(Number(load.listedMiles)) && Number(load.listedMiles) > 0 ? Number(load.rate) / Number(load.listedMiles) : null
  const rateFit = !Number.isFinite(rules.minimumRatePerLoadedMile) || !Number.isFinite(rpm) || rpm >= rules.minimumRatePerLoadedMile
  const haulClass = getFreightHaulClass(load)
  const hosEvaluation = isAvailable && planningDriver ? getLoadHosEvaluation({ load, driver: planningDriver, loads, runtimePositions, gameTime }) : null
  const planningHos = planningDriver ? getDriverHosSummary(planningDriver) : null
  const projection = load.assignmentProjection || null
  const tripPlan = load.tripPlan || null
  const evaluated = Boolean(load.driverFitVerified && candidateDriver && projection)
  const deadheadMinutes = Number(projection?.deadheadMinutes)
  const deadheadMiles = Number(projection?.deadheadMiles)
  const loadedMinutes = Number(tripPlan?.legs?.loaded?.minutes)
  const projectedPickupArrivalAbsolute = Number.isFinite(Number(projection?.arrivalDay)) && Number.isFinite(Number(projection?.arrivalMinutes))
    ? Number(projection.arrivalDay) * 1440 + Number(projection.arrivalMinutes)
    : null
  const pickupStartAbsolute = Number(load.pickupDayIndex || 0) * 1440 + Number(load.pickupWindowStartMinutes || 0)
  const projectedDeliveryArrivalAbsolute = Number.isFinite(projectedPickupArrivalAbsolute) && Number.isFinite(loadedMinutes)
    ? Math.max(projectedPickupArrivalAbsolute, pickupStartAbsolute) + 35 + loadedMinutes
    : null
  const deliveryEndAbsolute = Number(load.deliveryDayIndex || 0) * 1440 + Number(load.deliveryWindowEndMinutes || load.deliveryWindowStartMinutes || 0)
  const deliveryWorks = Number.isFinite(projectedDeliveryArrivalAbsolute) ? projectedDeliveryArrivalAbsolute <= deliveryEndAbsolute : null

  const requiredEquipmentType = load.equipmentType || 'dry-van'
  const requiredEquipmentLabel = load.equipmentLabel || "53' Dry Van"
  const driverEquipmentType = planningDriver?.equipment?.type || null
  const equipmentMatch = driverEquipmentType ? driverEquipmentType === requiredEquipmentType : null
  const hosWorks = hosEvaluation ? hosEvaluation.tone !== 'risk' : null
  const pickupWorks = projection ? !String(projection.status || '').toUpperCase().includes('AT RISK') : null
  const allChecksKnown = evaluated && deliveryWorks !== null && equipmentMatch !== null && hosWorks !== null
  const goodCandidate = allChecksKnown && pickupWorks && deliveryWorks && equipmentMatch && hosWorks && rateFit

  const bookingStatus = load.bookingStatus || null
  const rateConReady = Boolean(load.rateConfirmation?.id)
  const rateConConfirmed = load.rateConfirmation?.status === 'CONFIRMED'
  const approvedToPursue = !approvalRequired || load.carrierApprovalStatus === 'APPROVED'
  const planningDay = Number.isFinite(Number(load.pickupDayIndex)) ? Number(load.pickupDayIndex) : Number(gameTime?.gameDayIndex || 0)
  const planningWorkday = planningDriver?.workdayByDay?.[String(planningDay)] || planningDriver?.workdayByDay?.[planningDay] || null
  const hasEarlierBookedFreight = loads.some((item) => item.id !== load.id
    && (item.assignedDriverId === planningDriver?.id || item.completedDriverId === planningDriver?.id)
    && (item.bookingStatus === 'CONFIRMED' || item.rateConfirmation?.status === 'CONFIRMED'))
  const lunchProtected = Number.isFinite(Number(planningWorkday?.lunchStartMinutes)) && Number.isFinite(Number(planningWorkday?.lunchDurationMinutes))
  const needsLunchPlan = Boolean(isAvailable && evaluated && hasEarlierBookedFreight && !lunchProtected)

  const primaryAction = (() => {
    if (!isAvailable) return { label: 'VIEW TODAY\'S PLAN', action: () => onOpenScheduler?.(load.id), disabled: false }
    if (!planningDriver) return { label: 'NO DRIVER AVAILABLE', disabled: true }
    if (!evaluated) return { label: `EVALUATE FOR ${(planningDriver.fullName || planningDriver.name || 'DRIVER').split(' ')[0].toUpperCase()}`, action: () => onEvaluateLoad?.(load.id, planningDriver.id), disabled: false }
    if (needsLunchPlan) return { label: `PLAN ${(planningDriver.fullName || planningDriver.name || 'DRIVER').split(' ')[0].toUpperCase()}\'S LUNCH`, action: () => onPlanLunch?.(load.id, planningDriver.id), disabled: false }
    if (approvalRequired && !['PENDING', 'APPROVED'].includes(load.carrierApprovalStatus)) return { label: load.carrierApprovalStatus === 'NEEDS_INFO' ? 'RESEND METROLINE APPROVAL' : 'REQUEST METROLINE APPROVAL', action: () => onRequestApproval?.(load.id, candidateDriver?.id || planningDriver.id), disabled: !goodCandidate }
    if (approvalRequired && load.carrierApprovalStatus === 'PENDING') return { label: 'AWAITING METROLINE APPROVAL', disabled: true }
    if (approvedToPursue && !bookingStatus && !rateConReady) return { label: 'REQUEST BOOKING', action: () => onRequestBooking?.(load.id), disabled: !goodCandidate }
    if (bookingStatus === 'REQUESTED' && !rateConReady) return { label: 'BOOKING REQUEST SENT', disabled: true }
    if (rateConReady && !rateConConfirmed) return { label: 'REVIEW RATE CONFIRMATION', action: () => onOpenRateConfirmation?.(load.id), disabled: false }
    if (rateConConfirmed) return { label: 'LOAD CONFIRMED', disabled: true }
    return { label: 'REVIEW LOAD', disabled: true }
  })()

  return (
    <div className="phone-page load-details-screen freight-route-detail-sheet freight-evaluation-screen">
      <header className="freight-route-detail-header">
        <button type="button" onClick={onBack} aria-label="Back to FreightLink">‹</button>
        <div className="freight-route-title-block">
          <span>FREIGHTLINK · LANE REVIEW</span>
          <h2>{pickup.name} → {delivery.name}</h2>
          <p>{getFreightCommodity(load)}</p>
        </div>
        <em className={`freight-haul-tag ${haulClass.tone}`}>{haulClass.label}</em>
      </header>

      <div className="freight-route-detail-body freight-evaluation-body">
        <section className="freight-eval-intro">
          <span>LOAD CHECK</span>
          <strong>{planningDriver ? `Does this work for ${planningDriver.fullName || planningDriver.name}?` : 'Choose a driver before evaluating this lane.'}</strong>
          <p>Work the lane from top to bottom. A good rate means nothing if the driver cannot reach the appointments, cover the hours, or pull the required equipment.</p>
        </section>

        <section className="freight-eval-step">
          <div className="freight-eval-step-number">1</div>
          <div className="freight-eval-step-copy">
            <span>PICKUP APPOINTMENT</span>
            <strong>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</strong>
            <small>{pickup.name}</small>
            <p>First question: can the truck reach pickup before this window closes?</p>
          </div>
          <em className={`freight-eval-result ${evaluationTone(Boolean(pickupWorks), pickupWorks === null)}`}>{pickupWorks === null ? 'CHECK' : pickupWorks ? 'WORKS' : 'RISK'}</em>
        </section>

        <section className="freight-eval-step">
          <div className="freight-eval-step-number">2</div>
          <div className="freight-eval-step-copy">
            <span>DEADHEAD TO PICKUP</span>
            <strong>{evaluated && Number.isFinite(deadheadMiles) ? `${deadheadMiles.toFixed(1)} mi · ${formatHosClock(deadheadMinutes)}` : 'Calculate from driver location'}</strong>
            <small>{evaluated && Number.isFinite(projectedPickupArrivalAbsolute) ? `Projected arrival ${formatTime(projectedPickupArrivalAbsolute % 1440)}` : `Starting from ${planningDriver?.lastKnownLocationId ? 'current position' : 'driver base'}`}</small>
            <p>Deadhead is unpaid travel before the load starts. It costs time and driving hours, so it belongs in the decision.</p>
          </div>
          <em className={`freight-eval-result ${evaluationTone(Boolean(pickupWorks), !evaluated)}`}>{!evaluated ? 'CALCULATE' : projection?.status || 'CHECKED'}</em>
        </section>

        <section className="freight-eval-step">
          <div className="freight-eval-step-number">3</div>
          <div className="freight-eval-step-copy">
            <span>LOADED TRIP + DELIVERY</span>
            <strong>{formatMiles(load.listedMiles)}{Number.isFinite(loadedMinutes) ? ` · ${formatHosClock(loadedMinutes)} drive` : ''}</strong>
            <small>{delivery.name} · {formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</small>
            <p>Pickup is only half the job. Make sure the loaded drive still lands inside the delivery appointment.</p>
            {Number.isFinite(projectedDeliveryArrivalAbsolute) && <b className="freight-eval-projection">Projected delivery arrival · {formatTime(projectedDeliveryArrivalAbsolute % 1440)}</b>}
          </div>
          <em className={`freight-eval-result ${evaluationTone(Boolean(deliveryWorks), deliveryWorks === null)}`}>{deliveryWorks === null ? 'CHECK' : deliveryWorks ? 'WORKS' : 'RISK'}</em>
        </section>

        <section className="freight-eval-step">
          <div className="freight-eval-step-number">4</div>
          <div className="freight-eval-step-copy">
            <span>HOURS OF SERVICE</span>
            <strong>{planningHos ? `${planningHos.driving} drive · ${planningHos.duty} duty available` : 'No HOS available'}</strong>
            {hosEvaluation && <small>{formatHosClock(hosEvaluation.driveRequiredMinutes)} drive · {formatHosClock(hosEvaluation.dutyRequiredMinutes)} duty required</small>}
            <p>The appointments can fit on paper and still be impossible if the driver does not have enough legal driving or duty time.</p>
          </div>
          <em className={`freight-eval-result ${evaluationTone(Boolean(hosWorks), hosWorks === null)}`}>{hosWorks === null ? 'CHECK' : hosWorks ? 'ENOUGH' : 'NOT ENOUGH'}</em>
        </section>

        <section className="freight-eval-step">
          <div className="freight-eval-step-number">5</div>
          <div className="freight-eval-step-copy">
            <span>EQUIPMENT</span>
            <strong>{requiredEquipmentLabel}</strong>
            <small>{planningDriver?.equipment?.label || 'Driver equipment not listed'}</small>
            <p>The load and truck have to match. Wrong equipment makes the lane a non-starter.</p>
          </div>
          <em className={`freight-eval-result ${evaluationTone(Boolean(equipmentMatch), equipmentMatch === null)}`}>{equipmentMatch === null ? 'CHECK' : equipmentMatch ? 'MATCH' : 'NO MATCH'}</em>
        </section>

        <section className="freight-eval-step">
          <div className="freight-eval-step-number">6</div>
          <div className="freight-eval-step-copy">
            <span>RATE</span>
            <strong>${Number(load.rate).toLocaleString()} {Number.isFinite(rpm) ? `· $${rpm.toFixed(2)}/loaded mi` : ''}</strong>
            <small>{Number.isFinite(rules.minimumRatePerLoadedMile) ? `Metroline minimum · $${rules.minimumRatePerLoadedMile.toFixed(2)}/mi` : 'Review the payout against the work required'}</small>
            <p>A lane still has to make financial sense after the operational checks work.</p>
          </div>
          <em className={`freight-eval-result ${rateFit ? 'good' : 'risk'}`}>{rateFit ? 'RATE OK' : 'REVIEW'}</em>
        </section>

        {hasEarlierBookedFreight && (
          <section className={`freight-eval-day-check ${lunchProtected ? 'good' : 'attention'}`}>
            <span>DAY-BUILDING CHECK</span>
            <strong>{lunchProtected ? `Lunch protected · ${formatTime(Number(planningWorkday.lunchStartMinutes))} for ${Number(planningWorkday.lunchDurationMinutes)} min` : `Before adding another lane, protect ${planningDriver?.name || 'the driver'}'s lunch.`}</strong>
            <p>{lunchProtected ? 'Now evaluate this freight around the break already reserved in the workday.' : 'The first load showed us the morning. The second load is where we start building the whole day — including a real break.'}</p>
          </section>
        )}

        <section className={`freight-eval-verdict ${evaluated ? (goodCandidate ? 'good' : 'risk') : 'pending'}`}>
          <span>DECISION</span>
          <strong>{!evaluated ? 'Run the evaluation before making a commitment.' : goodCandidate ? `Good candidate for ${candidateDriver?.fullName || candidateDriver?.name || planningDriver?.name}.` : 'Something in this lane needs another look.'}</strong>
          <p>{!evaluated ? 'FreightLink will calculate the real deadhead, loaded travel, appointments, and HOS impact.' : goodCandidate ? 'The lane works operationally. Next step is permission and paperwork — not dispatching the truck yet.' : 'Do not request this freight until the failed check is resolved.'}</p>
        </section>

        {evaluated && (
          <section className="freight-booking-progress" aria-label="Booking progress">
            <div className={load.carrierApprovalStatus === 'APPROVED' ? 'done' : load.carrierApprovalStatus === 'PENDING' ? 'active' : ''}><span>1</span><b>METROLINE</b><small>{!approvalRequired ? 'No approval required' : load.carrierApprovalStatus === 'APPROVED' ? 'Approved to pursue' : load.carrierApprovalStatus === 'PENDING' ? 'Reviewing' : 'Approval needed'}</small></div>
            <div className={bookingStatus === 'REQUESTED' ? 'active' : rateConReady ? 'done' : ''}><span>2</span><b>BOOKING</b><small>{rateConReady ? 'Broker accepted' : bookingStatus === 'REQUESTED' ? 'Request sent' : 'Not requested'}</small></div>
            <div className={rateConConfirmed ? 'done' : rateConReady ? 'active' : ''}><span>3</span><b>RATE CON</b><small>{rateConConfirmed ? 'Confirmed' : rateConReady ? 'Review required' : 'Waiting'}</small></div>
          </section>
        )}

        {assignedDriver && <section className="freight-route-assigned"><span>CONFIRMED DRIVER</span><strong>{assignedDriver.fullName || assignedDriver.name}</strong><button type="button" onClick={() => onSendLoadDetails?.(load.id, assignedDriver.id)}>OPEN DRIVER THREAD</button></section>}
      </div>

      <div className="freight-route-primary-action freight-eval-primary-action">
        <button type="button" onClick={primaryAction.action} disabled={primaryAction.disabled}>{primaryAction.label}</button>
        {evaluated && isAvailable && <small>{approvalRequired && load.carrierApprovalStatus !== 'APPROVED' ? 'Approval lets you pursue the freight. It does not book it.' : rateConReady && !rateConConfirmed ? 'The load is not confirmed until the Rate Confirmation is reviewed and accepted.' : approvedToPursue && !rateConReady ? 'You are approved to pursue this lane. Request the booking next.' : ''}</small>}
      </div>
    </div>
  )
}

export default LoadDetailsScreen
