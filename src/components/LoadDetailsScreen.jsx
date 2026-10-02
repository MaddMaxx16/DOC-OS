import { useState } from 'react'
import FirstDayLesson from './FirstDayLesson.jsx'
import './LaneReview.css'
import mapLocations from '../data/mapLocations.js'
import { formatAppointment, formatTime } from '../utils/gameTime.js'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import { getFreightCommodity } from '../utils/freightIdentity.js'
import { getFreightHaulClass } from '../utils/planningIntelligence.js'
import { getLoadHosEvaluation } from '../utils/hosPlanning.js'
import { formatHosClock, getDriverHosSummary } from '../utils/driverHOS.js'

function formatMiles(value) {
  const number = Number(value)
  return Number.isFinite(number) ? `${number.toFixed(1)} mi` : '—'
}

function absoluteTime(value) {
  const number = Number(value)
  return Number.isFinite(number) ? formatTime(((number % 1440) + 1440) % 1440) : '—'
}

function timingResult(arrival, windowStart, windowEnd) {
  if (![arrival, windowStart, windowEnd].every(Number.isFinite)) return { tone: 'pending', label: 'CALCULATING', detail: 'Timing not available yet.' }
  if (arrival > windowEnd) {
    const late = Math.round(arrival - windowEnd)
    return { tone: 'risk', label: `${late} MIN LATE`, detail: `Projected arrival is ${late} minutes after the appointment closes.` }
  }
  if (arrival < windowStart) {
    const early = Math.round(windowStart - arrival)
    return { tone: 'good', label: `${early} MIN EARLY`, detail: `Projected arrival is ${early} minutes before the appointment opens.` }
  }
  const inside = Math.max(0, Math.round(windowEnd - arrival))
  return { tone: inside <= 20 ? 'tight' : 'good', label: 'IN WINDOW', detail: `${inside} minutes remain in the appointment window.` }
}

function LoadDetailsScreen({
  firstDay,
  onFirstDayProgress,
  onPlanFirstDayLunch,
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
  onViewConfirmedDay,
  onSendLoadDetails,
  onBack,
}) {
  const [evaluating, setEvaluating] = useState(false)
  const [evaluationError, setEvaluationError] = useState(null)

  const load = loads.find((item) => item.id === loadId)
  const pickup = load && mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = load && mapLocations.find((location) => location.id === load.deliveryLocationId)
  const eligibleDrivers = drivers.filter((driver) => driver.carrierId)
  const candidateDriver = load ? drivers.find((driver) => driver.id === load.candidateDriverId) : null
  const assignedDriver = load ? drivers.find((driver) => driver.id === load.assignedDriverId) : null
  const planningDriver = drivers.find((driver) => driver.id === planningDriverId)
    || candidateDriver
    || assignedDriver
    || eligibleDrivers[0]
    || null

  if (!load || !pickup || !delivery) {
    return (
      <div className="phone-page load-details-screen">
        <div className="load-detail-empty">
          <strong>Lane unavailable</strong>
          <button type="button" onClick={onBack}>RETURN TO FREIGHTLINK</button>
        </div>
      </div>
    )
  }

  const isAvailable = load.status === 'available'
  const carrier = carriers.find((item) => item.id === (planningDriver?.carrierId || load.carrierId)) || carriers[0] || null
  const rules = getAgreementRules(carrier)
  const rpm = Number.isFinite(Number(load.listedMiles)) && Number(load.listedMiles) > 0
    ? Number(load.rate) / Number(load.listedMiles)
    : null
  const rateFit = !Number.isFinite(rules.minimumRatePerLoadedMile)
    || !Number.isFinite(rpm)
    || rpm >= rules.minimumRatePerLoadedMile
  const haulClass = getFreightHaulClass(load)
  const hosEvaluation = planningDriver
    ? getLoadHosEvaluation({ load, driver: planningDriver, loads, runtimePositions, gameTime })
    : null
  const planningHos = planningDriver ? getDriverHosSummary(planningDriver) : null
  const workday = planningDriver?.workdayByDay?.[String(load.pickupDayIndex)]
    || planningDriver?.workdayByDay?.[load.pickupDayIndex]
    || null

  const pickupStart = Number(load.pickupDayIndex || 0) * 1440 + Number(load.pickupWindowStartMinutes || 0)
  const pickupEnd = Number(load.pickupDayIndex || 0) * 1440 + Number(load.pickupWindowEndMinutes || load.pickupWindowStartMinutes || 0)
  const deliveryStart = Number(load.deliveryDayIndex || 0) * 1440 + Number(load.deliveryWindowStartMinutes || 0)
  const deliveryEnd = Number(load.deliveryDayIndex || 0) * 1440 + Number(load.deliveryWindowEndMinutes || load.deliveryWindowStartMinutes || 0)

  const projectedStart = Number(hosEvaluation?.projectedStartMinute)
  const pickupArrival = Number(hosEvaluation?.projectedPickupArrivalMinute)
  const pickupServiceStart = Number(hosEvaluation?.projectedPickupServiceStartMinute)
  const pickupDepart = Number(hosEvaluation?.projectedPickupDepartMinute)
  const deliveryArrival = Number(hosEvaluation?.projectedDeliveryArrivalMinute)
  const deliveryServiceStart = Number(hosEvaluation?.projectedDeliveryServiceStartMinute)
  const deliveryComplete = Number(hosEvaluation?.projectedDeliveryCompleteMinute)
  const deadheadMinutes = Number(hosEvaluation?.deadheadMinutes)
  const loadedMinutes = Number(hosEvaluation?.loadedMinutes)
  const deadheadMiles = Number(load.assignmentProjection?.deadheadMiles ?? hosEvaluation?.deadheadMiles)
  const loadedMiles = Number(load.tripPlan?.legs?.loaded?.miles ?? hosEvaluation?.loadedMiles ?? load.listedMiles)
  const totalMiles = [deadheadMiles, loadedMiles].every(Number.isFinite) ? deadheadMiles + loadedMiles : null
  const totalRpm = Number.isFinite(totalMiles) && totalMiles > 0 ? Number(load.rate) / totalMiles : null

  const pickupTiming = timingResult(pickupArrival, pickupStart, pickupEnd)
  const deliveryTiming = timingResult(deliveryArrival, deliveryStart, deliveryEnd)
  const requiredEquipmentType = load.freight?.equipmentType || load.equipmentType || 'dry-van'
  const requiredEquipmentLabel = load.freight?.equipmentLabel || load.equipmentLabel || "53' Dry Van"
  const equipmentMatch = planningDriver?.equipment?.type
    ? planningDriver.equipment.type === requiredEquipmentType
    : null
  const hosWorks = hosEvaluation ? hosEvaluation.tone !== 'risk' : null
  const evaluated = Boolean(load.driverFitVerified && load.assignmentProjection && load.tripPlan)
  const routeCheckWorks = evaluated
    ? !String(load.assignmentProjection?.status || '').toUpperCase().includes('AT RISK') && !load.scheduleConflict
    : null
  const goodCandidate = Boolean(
    evaluated
    && routeCheckWorks
    && pickupTiming.tone !== 'risk'
    && deliveryTiming.tone !== 'risk'
    && hosWorks
    && equipmentMatch !== false
    && rateFit
  )

  const guidedFirstLane = isAvailable
    && planningDriver?.id === 'marcus'
    && firstDay?.step === 'freight'
  const reviewIndex = firstDay?.laneReviewLoadId === load.id
    ? Number(firstDay.laneReviewIndex || 0)
    : 0
  const lunchStart = Number(workday?.lunchWindowStartMinutes ?? workday?.lunchStartMinutes)
  const lunchEnd = Number(workday?.lunchWindowEndMinutes)
  const lunchDuration = Number(workday?.lunchDurationMinutes)
  const lunchPlanned = Number.isFinite(lunchStart)
    && (Number.isFinite(lunchEnd) || Number.isFinite(lunchDuration))
  const confirmedDayLoads = loads
    .filter((item) => item.id !== load.id
      && (item.assignedDriverId === planningDriver?.id || item.completedDriverId === planningDriver?.id)
      && !['available', 'cancelled', 'expired'].includes(String(item.status || '').toLowerCase()))
    .sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.queuePosition))
        ? Number(a.queuePosition)
        : Number(a.pickupDayIndex || 0) * 1440 + Number(a.pickupWindowStartMinutes || 0)
      const bOrder = Number.isFinite(Number(b.queuePosition))
        ? Number(b.queuePosition)
        : Number(b.pickupDayIndex || 0) * 1440 + Number(b.pickupWindowStartMinutes || 0)
      return aOrder - bOrder
    })
  const proposedLoadNumber = confirmedDayLoads.length + 1
  const buildingLaterLoad = isAvailable
    && planningDriver?.id === 'marcus'
    && ['restOfDay', 'thirdLoad'].includes(firstDay?.step)
  const thirdLoadNeedsLunch = isAvailable
    && firstDay?.step === 'thirdLoad'
    && !lunchPlanned
  const daySoFarItems = [
    ...confirmedDayLoads.map((item, index) => ({
      type: 'load',
      id: item.id,
      sortMinute: Number(item.pickupDayIndex || 0) * 1440 + Number(item.pickupWindowStartMinutes || 0),
      index: index + 1,
      load: item,
    })),
    ...(lunchPlanned ? [{
      type: 'lunch',
      id: 'lunch',
      sortMinute: Number(load.pickupDayIndex || 0) * 1440 + lunchStart,
    }] : []),
  ].sort((a, b) => a.sortMinute - b.sortMinute)

  const coachSteps = [
    {
      key: 'pickup',
      title: 'First check: pickup',
      text: planningDriver
        ? `${planningDriver.fullName || planningDriver.name} starts at ${absoluteTime(projectedStart)}. This lane needs about ${Number.isFinite(deadheadMinutes) ? Math.round(deadheadMinutes) : '—'} minutes of deadhead, putting him at ${pickup.name} around ${absoluteTime(pickupArrival)}. ${pickupTiming.detail}`
        : 'Start by choosing the driver, then compare the truck’s starting point with the pickup appointment.',
    },
    {
      key: 'delivery',
      title: 'Now check delivery',
      text: `After pickup service, Marcus should leave around ${absoluteTime(pickupDepart)}. The loaded leg is about ${Number.isFinite(loadedMinutes) ? Math.round(loadedMinutes) : '—'} minutes, with projected arrival at ${absoluteTime(deliveryArrival)}. ${deliveryTiming.detail}`,
    },
    {
      key: 'hos',
      title: 'Can he legally run it?',
      text: hosEvaluation
        ? `This commitment uses about ${formatHosClock(hosEvaluation.driveRequiredMinutes)} of driving and ${formatHosClock(hosEvaluation.dutyRequiredMinutes)} of duty time. Marcus has ${planningHos?.driving || '—'} drive and ${planningHos?.duty || '—'} duty available.`
        : 'Driving time and duty time are separate limits. Both need enough room for the complete commitment.',
    },
    {
      key: 'equipment',
      title: 'Does the truck match?',
      text: `The freight calls for ${requiredEquipmentLabel}. Marcus is running ${planningDriver?.equipment?.label || 'equipment not listed'}. ${equipmentMatch === false ? 'That is not a match.' : 'The equipment matches.'}`,
    },
    {
      key: 'money',
      title: 'Last check: the money',
      text: `The offer is $${Number(load.rate).toLocaleString()} for ${formatMiles(loadedMiles)} loaded. Deadhead matters too: ${formatMiles(deadheadMiles)} before pickup, or ${formatMiles(totalMiles)} total truck miles. Look at the work, not just the posted rate.`,
    },
  ]
  const coach = coachSteps[Math.min(coachSteps.length - 1, reviewIndex)]

  const runEvaluation = async () => {
    if (evaluating || !planningDriver) return false
    setEvaluating(true)
    setEvaluationError(null)
    try {
      const ok = await onEvaluateLoad?.(load.id, planningDriver.id)
      if (ok === false) {
        setEvaluationError('The route check could not be completed. Try this lane again.')
        return false
      }
      return true
    } finally {
      setEvaluating(false)
    }
  }

  const advanceCoach = async () => {
    if (reviewIndex < coachSteps.length - 1) {
      onFirstDayProgress?.({
        laneReviewLoadId: load.id,
        laneReviewIndex: reviewIndex + 1,
        flowVersion: 3,
      })
      return
    }
    await runEvaluation()
  }

  const approvalRequired = Boolean(rules.loadApprovalRequired)
  const approvalStatus = load.carrierApprovalStatus || null
  const approvedToPursue = !approvalRequired || approvalStatus === 'APPROVED'
  const bookingStatus = load.bookingStatus || null
  const rateConReady = Boolean(load.rateConfirmation?.id)
  const rateConConfirmed = load.rateConfirmation?.status === 'CONFIRMED'

  const primaryAction = (() => {
    if (!isAvailable) {
      return { label: 'VIEW MARCUS’S DAY', action: () => onViewConfirmedDay?.(load.id), disabled: false }
    }
    if (!planningDriver) return { label: 'NO DRIVER AVAILABLE', disabled: true }
    if (guidedFirstLane && reviewIndex < coachSteps.length - 1) return { label: 'FOLLOW JORDAN’S CHECKS ABOVE', disabled: true }
    if (!evaluated) return { label: evaluating ? 'CHECKING THE ROUTE…' : 'RUN FINAL LOAD CHECK', action: runEvaluation, disabled: evaluating }
    if (!goodCandidate) return { label: 'REVIEW FAILED CHECKS', disabled: true }
    if (thirdLoadNeedsLunch) return { label: 'RETURN TO LUNCH PLANNING', action: () => onPlanFirstDayLunch?.(load.id), disabled: false }
    if (approvalRequired && !['PENDING', 'APPROVED'].includes(approvalStatus)) {
      return {
        label: approvalStatus === 'NEEDS_INFO' ? 'RESEND METROLINE APPROVAL' : 'REQUEST METROLINE APPROVAL',
        action: () => onRequestApproval?.(load.id, planningDriver.id),
        disabled: false,
      }
    }
    if (approvalRequired && approvalStatus === 'PENDING') return { label: 'AWAITING METROLINE APPROVAL', disabled: true }
    if (approvedToPursue && !bookingStatus && !rateConReady) return { label: 'REQUEST BOOKING', action: () => onRequestBooking?.(load.id), disabled: false }
    if (bookingStatus === 'REQUESTED' && !rateConReady) return { label: 'BOOKING REQUEST SENT', disabled: true }
    if (rateConReady && !rateConConfirmed) return { label: 'REVIEW RATE CONFIRMATION', action: () => onOpenRateConfirmation?.(load.id), disabled: false }
    if (rateConConfirmed) return { label: 'VIEW MARCUS’S DAY', action: () => onViewConfirmedDay?.(load.id), disabled: false }
    return { label: 'LOAD CHECK COMPLETE', disabled: true }
  })()

  const activeCoachKey = guidedFirstLane ? coach.key : thirdLoadNeedsLunch ? 'lunch' : null
  const freight = load.freight || {}
  const pallets = Number(freight.pallets)
  const weight = Number(freight.weightLbs)
  const palletCapacity = Number(freight.trailerCapacityPallets)
  const weightCapacity = Number(freight.trailerMaxWeightLbs)

  return (
    <div className="phone-page load-details-screen lane-review-v3">
      <header className="lane-review-header">
        <button type="button" onClick={onBack} aria-label="Back to FreightLink">‹</button>
        <div className="lane-review-title">
          <span className="lane-review-eyebrow">FREIGHTLINK · LANE REVIEW</span>
          <h2>{pickup.name} <i>→</i> {delivery.name}</h2>
          <div className="lane-review-meta">
            <em className={`freight-haul-tag ${haulClass.tone}`}>{haulClass.label}</em>
            <span>{load.loadNumber || 'LOAD OFFER'}</span>
            <span>{getFreightCommodity(load)}</span>
          </div>
        </div>
      </header>

      <div className="lane-review-scroll">
        <section className="lane-driver-strip">
          <div className="lane-driver-identity">
            <span>DRIVER</span>
            <strong>{planningDriver?.fullName || planningDriver?.name || 'No driver selected'}</strong>
            <small>{load.assignmentProjection?.projectedOriginName || 'Metroline Yard'}</small>
          </div>
          <div>
            <span>SHIFT</span>
            <strong>{workday ? `${formatTime(workday.startMinutes)}–${formatTime(workday.endMinutes)}` : '—'}</strong>
          </div>
          <div>
            <span>DRIVE</span>
            <strong>{planningHos?.driving || '—'}</strong>
          </div>
          <div>
            <span>DUTY</span>
            <strong>{planningHos?.duty || '—'}</strong>
          </div>
        </section>

        {guidedFirstLane && (
          <FirstDayLesson
            compact
            title={coach.title}
            disabled={evaluating}
            actionLabel={reviewIndex < coachSteps.length - 1 ? 'NEXT CHECK' : evaluated ? null : (evaluating ? 'CHECKING ROUTE…' : 'RUN FINAL LOAD CHECK')}
            onAction={advanceCoach}
          >
            {coach.text}
          </FirstDayLesson>
        )}

        {buildingLaterLoad && (
          <FirstDayLesson compact title={firstDay?.step === 'thirdLoad' ? 'Fit the final load around the day' : 'Build onto the confirmed day'}>
            {firstDay?.step === 'thirdLoad'
              ? 'Two loads and lunch are already locked in. This final lane has to fit around all three before we pursue it.'
              : 'Load 1 is already confirmed. This lane starts from where Marcus becomes available after that work. Secure Load 2 first; then we’ll plan lunch.'}
          </FirstDayLesson>
        )}

        <section className="lane-timeline" aria-label="Projected load timeline">
          <header className="lane-timeline-head">
            <div>
              <span>{proposedLoadNumber > 1 ? `PROPOSED LOAD ${proposedLoadNumber}` : 'PROJECTED DAY'}</span>
              <strong>{proposedLoadNumber > 1 ? `Does Load ${proposedLoadNumber} fit the day?` : 'Marcus’s load timeline'}</strong>
            </div>
            <small>{evaluated ? 'ROUTE CHECKED' : 'MARKET ESTIMATE'}</small>
          </header>

          {daySoFarItems.length > 0 && (
            <div className="lane-day-so-far">
              <header><span>CONFIRMED DAY SO FAR</span><strong>{confirmedDayLoads.length} LOAD{confirmedDayLoads.length === 1 ? '' : 'S'} BOOKED{lunchPlanned ? ' · LUNCH PROTECTED' : ''}</strong></header>
              {daySoFarItems.map((item) => {
                if (item.type === 'lunch') {
                  return (
                    <div className="lane-day-item lunch" key={item.id}>
                      <span>LUNCH</span>
                      <strong>{Number.isFinite(lunchEnd) ? `${absoluteTime(lunchStart)}–${absoluteTime(lunchEnd)}` : `${Math.round(lunchDuration)} min protected`}</strong>
                      <small>Protected before the final load is added.</small>
                    </div>
                  )
                }
                const itemPickup = mapLocations.find((location) => location.id === item.load.pickupLocationId)
                const itemDelivery = mapLocations.find((location) => location.id === item.load.deliveryLocationId)
                return (
                  <div className="lane-day-item confirmed" key={item.id}>
                    <span>LOAD {item.index} · CONFIRMED</span>
                    <strong>{itemPickup?.name || 'Pickup'} → {itemDelivery?.name || 'Delivery'}</strong>
                    <small>{formatTime(item.load.pickupWindowStartMinutes)} pickup · {formatTime(item.load.deliveryWindowStartMinutes)} delivery · {item.load.loadNumber || 'Booked load'}</small>
                  </div>
                )
              })}
            </div>
          )}

          <div className={`lane-timeline-stop shift ${activeCoachKey === 'pickup' ? 'coach-focus' : ''}`}>
            <time>{absoluteTime(projectedStart)}</time>
            <i />
            <div><span>{confirmedDayLoads.length ? `AVAILABLE AFTER LOAD ${confirmedDayLoads.length}` : 'SHIFT START'}</span><strong>{load.assignmentProjection?.projectedOriginName || 'Metroline Yard'}</strong></div>
          </div>

          <div className={`lane-timeline-leg ${activeCoachKey === 'pickup' ? 'coach-focus' : ''}`}>
            <span>DEADHEAD</span>
            <strong>{formatMiles(deadheadMiles)} · {Number.isFinite(deadheadMinutes) ? `${Math.round(deadheadMinutes)} min` : '—'}</strong>
          </div>

          <div className={`lane-timeline-stop ${activeCoachKey === 'pickup' ? 'coach-focus' : ''}`}>
            <time>{absoluteTime(pickupArrival)}</time>
            <i />
            <div>
              <span>PICKUP ARRIVAL</span>
              <strong>{pickup.name}</strong>
              <small>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</small>
              <em className={pickupTiming.tone}>{pickupTiming.label}</em>
            </div>
          </div>

          <div className={`lane-timeline-stop service ${activeCoachKey === 'pickup' ? 'coach-focus' : ''}`}>
            <time>{absoluteTime(pickupServiceStart)}</time>
            <i />
            <div><span>LOADING</span><strong>{Number.isFinite(Number(hosEvaluation?.pickupServiceMinutes)) ? `${Math.round(hosEvaluation.pickupServiceMinutes)} min estimated` : 'Service estimate pending'}</strong></div>
          </div>

          <div className={`lane-timeline-leg loaded ${activeCoachKey === 'delivery' ? 'coach-focus' : ''}`}>
            <span>LOADED DRIVE</span>
            <strong>{formatMiles(loadedMiles)} · {Number.isFinite(loadedMinutes) ? `${Math.round(loadedMinutes)} min` : '—'}</strong>
          </div>

          <div className={`lane-timeline-stop ${activeCoachKey === 'delivery' ? 'coach-focus' : ''}`}>
            <time>{absoluteTime(deliveryArrival)}</time>
            <i />
            <div>
              <span>DELIVERY ARRIVAL</span>
              <strong>{delivery.name}</strong>
              <small>{formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</small>
              <em className={deliveryTiming.tone}>{deliveryTiming.label}</em>
            </div>
          </div>

          <div className={`lane-timeline-stop service ${activeCoachKey === 'delivery' ? 'coach-focus' : ''}`}>
            <time>{absoluteTime(deliveryServiceStart)}</time>
            <i />
            <div><span>UNLOADING</span><strong>{Number.isFinite(Number(hosEvaluation?.deliveryServiceMinutes)) ? `${Math.round(hosEvaluation.deliveryServiceMinutes)} min estimated` : 'Service estimate pending'}</strong></div>
          </div>

          {lunchPlanned && (
            <div className={`lane-timeline-stop lunch ${activeCoachKey === 'lunch' ? 'coach-focus' : ''}`}>
              <time>{absoluteTime(lunchStart)}</time>
              <i />
              <div><span>LUNCH WINDOW</span><strong>{Number.isFinite(lunchEnd) ? `${absoluteTime(lunchStart)}–${absoluteTime(lunchEnd)}` : `${Math.round(lunchDuration)} min protected`}</strong></div>
            </div>
          )}

          <div className="lane-timeline-stop available">
            <time>{absoluteTime(deliveryComplete)}</time>
            <i />
            <div><span>AVAILABLE AGAIN</span><strong>{delivery.name}</strong></div>
          </div>
        </section>

        <section className="lane-check-grid">
          <div className={`lane-check ${pickupTiming.tone} ${activeCoachKey === 'pickup' ? 'coach-focus' : ''}`}>
            <span>PICKUP</span><strong>{pickupTiming.tone === 'risk' ? 'AT RISK' : 'REACHABLE'}</strong><small>{pickupTiming.detail}</small>
          </div>
          <div className={`lane-check ${deliveryTiming.tone} ${activeCoachKey === 'delivery' ? 'coach-focus' : ''}`}>
            <span>DELIVERY</span><strong>{deliveryTiming.tone === 'risk' ? 'AT RISK' : 'REACHABLE'}</strong><small>{deliveryTiming.detail}</small>
          </div>
          <div className={`lane-check ${hosWorks === false ? 'risk' : 'good'} ${activeCoachKey === 'hos' ? 'coach-focus' : ''}`}>
            <span>HOS</span><strong>{hosWorks === false ? 'NOT ENOUGH' : 'ENOUGH'}</strong><small>{hosEvaluation ? `${formatHosClock(hosEvaluation.driveRequiredMinutes)} drive · ${formatHosClock(hosEvaluation.dutyRequiredMinutes)} duty` : 'Calculating'}</small>
          </div>
          <div className={`lane-check ${equipmentMatch === false ? 'risk' : 'good'} ${activeCoachKey === 'equipment' ? 'coach-focus' : ''}`}>
            <span>EQUIPMENT</span><strong>{equipmentMatch === false ? 'NO MATCH' : 'MATCH'}</strong><small>{requiredEquipmentLabel}</small>
          </div>
        </section>

        <section className={`lane-freight-card ${activeCoachKey === 'equipment' ? 'coach-focus' : ''}`}>
          <header><span>FREIGHT / TRAILER</span><strong>{requiredEquipmentLabel}</strong></header>
          <div>
            <span><b>PALLETS</b><strong>{Number.isFinite(pallets) ? `${pallets}${Number.isFinite(palletCapacity) ? ` / ${palletCapacity}` : ''}` : 'Not listed'}</strong></span>
            <span><b>WEIGHT</b><strong>{Number.isFinite(weight) ? `${weight.toLocaleString()} lb` : 'Not listed'}</strong></span>
            <span><b>TRAILER</b><strong>{equipmentMatch === false ? 'NO MATCH' : 'COMPATIBLE'}</strong></span>
          </div>
          {Number.isFinite(weightCapacity) && Number.isFinite(weight) && <small>{Math.max(0, weightCapacity - weight).toLocaleString()} lb estimated trailer capacity remains after this freight.</small>}
        </section>

        <section className={`lane-money-card ${activeCoachKey === 'money' ? 'coach-focus' : ''}`}>
          <header><span>MONEY</span><strong>${Number(load.rate).toLocaleString()}</strong></header>
          <div>
            <span><b>LOADED MILES</b><strong>{formatMiles(loadedMiles)}</strong></span>
            <span><b>DEADHEAD</b><strong>{formatMiles(deadheadMiles)}</strong></span>
            <span><b>TOTAL TRUCK MI</b><strong>{formatMiles(totalMiles)}</strong></span>
            <span><b>LOADED $/MI</b><strong>{Number.isFinite(rpm) ? `$${rpm.toFixed(2)}` : '—'}</strong></span>
            <span><b>TOTAL $/MI</b><strong>{Number.isFinite(totalRpm) ? `$${totalRpm.toFixed(2)}` : '—'}</strong></span>
          </div>
        </section>

        {evaluationError && <p className="lane-review-error" role="alert">{evaluationError}</p>}

        {evaluated && (
          <section className={`lane-verdict ${goodCandidate ? 'good' : 'risk'}`}>
            <span>WHY THIS {goodCandidate ? 'FITS' : 'NEEDS WORK'}</span>
            <strong>{goodCandidate ? `Good candidate for ${planningDriver?.fullName || planningDriver?.name}.` : 'One or more checks do not support pursuing this lane.'}</strong>
            <p>{goodCandidate
              ? 'The appointments work, legal hours are available, the equipment matches, and the rate clears Metroline’s rule. The next step is permission and paperwork — not dispatching the truck.'
              : 'Resolve the failed timing, HOS, equipment, schedule, or rate check before requesting this freight.'}</p>
          </section>
        )}

        {evaluated && (
          <section className="lane-booking-progress" aria-label="Load pursuit progress">
            <div className={approvalStatus === 'APPROVED' ? 'done' : approvalStatus === 'PENDING' ? 'active' : ''}><span>1</span><b>METROLINE</b><small>{!approvalRequired ? 'No approval required' : approvalStatus === 'APPROVED' ? 'Approved to pursue' : approvalStatus === 'PENDING' ? 'Reviewing' : 'Approval needed'}</small></div>
            <div className={bookingStatus === 'REQUESTED' ? 'active' : rateConReady ? 'done' : ''}><span>2</span><b>BOOKING</b><small>{rateConReady ? 'Accepted' : bookingStatus === 'REQUESTED' ? 'Request sent' : 'Not requested'}</small></div>
            <div className={rateConConfirmed ? 'done' : rateConReady ? 'active' : ''}><span>3</span><b>RATE CON</b><small>{rateConConfirmed ? 'Confirmed' : rateConReady ? 'Review required' : 'Waiting'}</small></div>
          </section>
        )}

        {assignedDriver && (
          <section className="lane-confirmed-driver">
            <span>CONFIRMED DRIVER</span>
            <strong>{assignedDriver.fullName || assignedDriver.name}</strong>
            <button type="button" onClick={() => onSendLoadDetails?.(load.id, assignedDriver.id)}>OPEN DRIVER THREAD</button>
          </section>
        )}
      </div>

      <footer className="lane-review-footer">
        <button type="button" disabled={primaryAction.disabled} onClick={primaryAction.action}>{primaryAction.label}</button>
        {evaluated && isAvailable && (
          <small>
            {approvalRequired && approvalStatus !== 'APPROVED'
              ? 'Metroline approval lets you pursue the lane. It does not secure the freight.'
              : approvedToPursue && !rateConReady
                ? 'Approval is in. Request the booking next.'
                : rateConReady && !rateConConfirmed
                  ? 'The freight is not confirmed until the Rate Confirmation is reviewed and accepted.'
                  : ''}
          </small>
        )}
      </footer>
    </div>
  )
}

export default LoadDetailsScreen
