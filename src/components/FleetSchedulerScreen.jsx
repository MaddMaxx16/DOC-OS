import { useEffect, useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { formatAppointment, formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'
import { formatPlanningMinutes, getPlanQuality } from '../utils/planningIntelligence.js'
import { getRouteLifecycleLabel, getRouteLifecycleTone } from '../utils/routeLifecycle.js'

const DAY_START = 6 * 60
const DAY_END = 22 * 60
const PX_PER_MINUTE = 0.86

const DRIVER_COLOR_FAMILIES = [
  ['#8BB8F7', '#6EA2E8', '#4F86D4', '#3C6DB8'],
  ['#F0BE69', '#DEA650', '#C98E35', '#A87025'],
  ['#65C3B2', '#4EAC9C', '#3B9385', '#2D776D'],
  ['#C99AE7', '#B27BD5', '#975EC0', '#7948A0'],
  ['#E38EA5', '#CD718C', '#B55375', '#93405E'],
]

function stableHash(value = '') {
  let hash = 0
  for (const char of String(value)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash)
}
function driverColors(driverId) {
  const family = DRIVER_COLOR_FAMILIES[stableHash(driverId) % DRIVER_COLOR_FAMILIES.length]
  return { pickup: family[0], delivery: family[3] }
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)) }
function minuteFor(load, side) {
  const day = side === 'pickup' ? load.pickupDayIndex : load.deliveryDayIndex
  const minute = side === 'pickup' ? load.pickupWindowStartMinutes : load.deliveryWindowStartMinutes
  return Number(day || 0) * 1440 + Number(minute || 0)
}
function statusFor(load) { return getRouteLifecycleLabel(load) }
function toneFor(load) { return getRouteLifecycleTone(load) }

function FleetSchedulerScreen({
  loads = [], drivers = [], carriers = [], gameTime, focusLoadId = null, initialDriverId = null,
  onBackToFreightLink, onRequestScheduleApproval, onBookRoute, onBookApprovedSchedule, onRemoveFromPlan, onSendDriverSchedule,
}) {
  const focusLoad = loads.find((load) => load.id === focusLoadId)
  const firstDriverId = initialDriverId || focusLoad?.candidateDriverId || focusLoad?.assignedDriverId || drivers.find((driver) => driver.carrierId)?.id || drivers[0]?.id || null
  const [driverId, setDriverId] = useState(firstDriverId)
  const [selectedLoadId, setSelectedLoadId] = useState(focusLoadId)
  useEffect(() => {
    if (focusLoadId) setSelectedLoadId(focusLoadId)
  }, [focusLoadId])
  const driver = drivers.find((item) => item.id === driverId) || drivers[0]
  const selectedLoad = loads.find((load) => load.id === selectedLoadId)
  const currentDay = gameTime?.gameDayIndex || 0

  const scheduleLoads = useMemo(() => loads.filter((load) => {
    const assigned = load.assignedDriverId === driver?.id && !['completed', 'delivered', 'expired'].includes(load.status) && !['completed', 'delivered'].includes(load.tripStatus)
    const planned = load.status === 'available' && load.candidateDriverId === driver?.id && load.scheduleApprovalQueued
    return assigned || planned
  }).sort((a, b) => minuteFor(a, 'pickup') - minuteFor(b, 'pickup')), [loads, driver?.id])

  const currentDayLoads = scheduleLoads.filter((load) => (load.pickupDayIndex ?? currentDay) === currentDay || (load.deliveryDayIndex ?? currentDay) === currentDay)

  // CS2.0A.12 — frame the timeline around the actual operating plan instead of
  // forcing a mostly-empty 6 AM–10 PM canvas. Keep a useful minimum window so
  // sparse schedules still read like a day, while dense schedules gain room.
  const scheduleStopMinutes = currentDayLoads.flatMap((load) => [
    load.pickupWindowStartMinutes,
    load.deliveryWindowStartMinutes,
  ]).filter(Number.isFinite)
  const earliestStopMinute = scheduleStopMinutes.length ? Math.min(...scheduleStopMinutes) : DAY_START
  const latestStopMinute = scheduleStopMinutes.length ? Math.max(...scheduleStopMinutes) : DAY_END
  const minMinute = currentDayLoads.length ? earliestStopMinute - 45 : DAY_START
  const maxMinute = currentDayLoads.length ? latestStopMinute + 60 : DAY_END
  const startMinute = clamp(Math.floor(minMinute / 60) * 60, 0, 23 * 60)
  const endMinute = clamp(Math.ceil(maxMinute / 60) * 60, startMinute + 6 * 60, 24 * 60)
  const baseTimelineHeight = (endMinute - startMinute) * PX_PER_MINUTE
  const hours = []
  for (let minute = startMinute; minute <= endMinute; minute += 60) hours.push(minute)

  const planQuality = driver ? getPlanQuality(loads, driver.id) : null
  const itineraryByStopId = new Map((planQuality?.itinerary || []).map((stop) => [stop.id, stop]))
  const worstStop = planQuality?.worstStopId ? itineraryByStopId.get(planQuality.worstStopId) : null
  const worstStopLocation = worstStop ? mapLocations.find((location) => location.id === worstStop.locationId) : null
  const planSummaryDetail = planQuality?.label === 'CONFLICT' && worstStop
    ? `${formatPlanningMinutes(worstStop.lateMinutes)} LATE AT ${worstStopLocation?.name || 'NEXT STOP'}`
    : planQuality?.label === 'TIGHT' && worstStop
      ? `${formatPlanningMinutes(Math.max(0, worstStop.slackMinutes))} BUFFER AT ${worstStopLocation?.name || 'NEXT STOP'}`
      : planQuality?.label === 'WORKABLE'
        ? `${formatPlanningMinutes(planQuality.projectedIdleMinutes)} OPEN / WAIT`
        : planQuality?.label === 'EFFICIENT'
          ? `${planQuality.utilizationPct}% DAY UTILIZATION`
          : null
  const planHasConflict = planQuality?.label === 'CONFLICT'
  const stopMinutes = currentDayLoads.flatMap((item) => [
    { id: `${item.id}:pickup`, loadId: item.id, side: 'pickup', minute: item.pickupWindowStartMinutes ?? startMinute },
    { id: `${item.id}:delivery`, loadId: item.id, side: 'delivery', minute: item.deliveryWindowStartMinutes ?? startMinute },
  ]).sort((a, b) => a.minute - b.minute || (a.side === 'delivery' ? -1 : 1))

  // Collision-safe visual positions. Appointment time remains the semantic truth;
  // close stops are nudged only enough to keep every pickup/delivery card visible.
  const stopVisualTopById = new Map()
  let previousVisualBottom = -Infinity
  for (const stop of stopMinutes) {
    const rawTop = Math.max(0, (stop.minute - startMinute) * PX_PER_MINUTE)
    const previousIndex = stopMinutes.findIndex((candidate) => candidate.id === stop.id) - 1
    const previousStop = previousIndex >= 0 ? stopMinutes[previousIndex] : null
    const nextStop = stopMinutes.find((candidate) => candidate.minute >= stop.minute && candidate.id !== stop.id)
    const dense = Boolean(
      (previousStop && stop.minute - previousStop.minute <= 75) ||
      (nextStop && nextStop.minute - stop.minute <= 75)
    )
    const cardHeight = dense ? 42 : 60
    const displayTop = Math.max(rawTop, previousVisualBottom + 6)
    stopVisualTopById.set(stop.id, displayTop)
    previousVisualBottom = displayTop + cardHeight
  }
  const timelineHeight = Math.max(baseTimelineHeight, Number.isFinite(previousVisualBottom) ? previousVisualBottom + 28 : baseTimelineHeight)
  // CS2.0A.8 — the scheduler button and send action use the same planned batch contract.
  const approvalCandidates = currentDayLoads.filter((load) => load.status === 'available' && load.candidateDriverId === driver?.id && load.scheduleApprovalQueued && !['PENDING', 'APPROVED'].includes(load.carrierApprovalStatus))
  const pendingApprovalLoads = currentDayLoads.filter((load) => load.status === 'available' && load.scheduleApprovalQueued && load.carrierApprovalStatus === 'PENDING')
  const approvedUnbookedLoads = currentDayLoads.filter((load) => load.status === 'available' && load.scheduleApprovalQueued && load.carrierApprovalStatus === 'APPROVED')
  const selectedCarrier = selectedLoad ? carriers.find((carrier) => carrier.id === (driver?.carrierId || selectedLoad.carrierId)) : null
  const driverCarrier = carriers.find((carrier) => carrier.id === driver?.carrierId)
  const approvalRequired = Boolean(selectedCarrier?.dispatchAgreement?.loadApprovalRequired)
  const scheduleNeedsApproval = Boolean(driverCarrier?.dispatchAgreement?.loadApprovalRequired) && approvalCandidates.length > 0
  const hasBookedRoutes = currentDayLoads.some((load) => load.status !== 'available')
  const schedulePreviouslySent = Number.isFinite(driver?.scheduleCommunicatedGameMinute)
  const selectedStatus = selectedLoad ? statusFor(selectedLoad) : null
  const selectedPickupIntel = selectedLoad ? itineraryByStopId.get(`${selectedLoad.id}:pickup`) : null
  const selectedDeliveryIntel = selectedLoad ? itineraryByStopId.get(`${selectedLoad.id}:delivery`) : null
  const selectedImpactLine = selectedPickupIntel?.lateMinutes > 0 || selectedDeliveryIntel?.lateMinutes > 0
    ? 'CONFLICT · THIS ROUTE BREAKS THE CURRENT PLAN'
    : (selectedPickupIntel?.slackMinutes <= 30 || selectedDeliveryIntel?.slackMinutes <= 30)
      ? 'TIGHT · REVIEW THE APPOINTMENT BUFFER'
      : 'FIT · ROUTE WORKS IN THE CURRENT PLAN'

  // CS2.0A.13 — communicated schedules remain editable until physical movement begins.
  // Once a route has actually departed / arrived, revision becomes an operations exception
  // rather than a simple scheduler delete.
  const selectedPreMovementBooked = Boolean(
    selectedLoad &&
    selectedLoad.status !== 'available' &&
    ['queued', 'assigned'].includes(selectedLoad.tripStatus) &&
    !Number.isFinite(selectedLoad.departureGameMinute) &&
    !Number.isFinite(selectedLoad.pickupArrivalGameMinute)
  )
  const selectedCanRemove = Boolean(
    selectedLoad && (
      (selectedLoad.status === 'available' && selectedLoad.scheduleApprovalQueued) ||
      selectedPreMovementBooked
    )
  )
  const selectedRemoveLabel = selectedLoad?.status === 'available'
    ? (selectedLoad.carrierApprovalStatus === 'PENDING' ? 'WITHDRAW FROM APPROVAL' : 'REMOVE FROM PLAN')
    : (Number.isFinite(selectedLoad?.scheduleCommunicatedGameMinute) ? 'REMOVE ROUTE' : 'CANCEL BOOKING')

  return (
    <div className={`phone-page fleet-scheduler-screen ${selectedLoad ? 'has-selection' : ''}`}>
      <header className="scheduler-header aw13 aw161">
        <div>
          <span>SCHEDULER</span>
          <h2>Today’s Plan</h2>
        </div>
        <div className="scheduler-header-actions">
          {planHasConflict && approvalCandidates.length > 0 ? (
            <button type="button" className="primary scheduler-conflict-action" disabled>RESOLVE CONFLICTS</button>
          ) : scheduleNeedsApproval ? (
            <button type="button" className="primary" onClick={() => onRequestScheduleApproval?.(driver?.id)}>SEND FOR APPROVAL</button>
          ) : pendingApprovalLoads.length > 0 ? (
            <button type="button" className="primary" disabled>AWAITING APPROVAL</button>
          ) : approvedUnbookedLoads.length > 0 ? (
            <button type="button" className="primary" onClick={() => onBookApprovedSchedule?.(driver?.id)}>BOOK APPROVED ROUTE{approvedUnbookedLoads.length === 1 ? '' : 'S'}</button>
          ) : hasBookedRoutes ? (
            <button type="button" className="primary" onClick={() => onSendDriverSchedule?.(driver?.id)}>{schedulePreviouslySent ? 'SEND UPDATE' : 'SEND SCHEDULE'}</button>
          ) : null}
          <button type="button" onClick={onBackToFreightLink}>FREIGHTLINK</button>
        </div>
      </header>

      {approvalCandidates.length > 0 && (
        <div className="scheduler-top-hint aw14">Tap a route to review actions. Tap it again or tap empty time to close.</div>
      )}

      <div className="scheduler-driver-tabs aw14" aria-label="Driver schedules">
        {drivers.filter((item) => item.carrierId).map((item) => (
          <button type="button" key={item.id} className={item.id === driver?.id ? 'active' : ''} onClick={() => { setDriverId(item.id); setSelectedLoadId(null) }}><strong>{item.fullName || item.name}</strong></button>
        ))}
      </div>

      <section className={`scheduler-summary-strip aw14 ${planQuality?.tone || 'neutral'}`}>
        <strong>{planQuality?.label || (currentDayLoads.length ? 'PLANNED' : 'OPEN')}</strong>
        <span>·</span>
        <strong>{currentDayLoads.length} ROUTE{currentDayLoads.length === 1 ? '' : 'S'}</strong>
        {planSummaryDetail && <small>{planSummaryDetail}</small>}
      </section>

      <div className="scheduler-scroll" onClick={(event) => {
        if (event.target.closest('.scheduler-route-block') || event.target.closest('.scheduler-selection-panel')) return
        setSelectedLoadId(null)
      }}>
        <div className="scheduler-time-canvas" style={{ height: `${timelineHeight}px` }}>
          {hours.map((minute) => <div className="scheduler-hour-line" key={minute} style={{ top: `${(minute - startMinute) * PX_PER_MINUTE}px` }}><span>{formatTime(minute)}</span><i /></div>)}

          <div className="scheduler-route-column">
            {currentDayLoads.flatMap((load) => {
              const pickupMinute = load.pickupWindowStartMinutes ?? startMinute
              const deliveryMinute = load.deliveryWindowStartMinutes ?? (pickupMinute + 90)
              const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
              const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
              const selected = load.id === selectedLoadId
              const booked = load.status !== 'available'
              const colors = driverColors(driver?.id)
              const eventColor = (side) => booked ? colors[side] : side === 'pickup' ? '#77818D' : '#3F4650'
              const event = (side, minute, location) => {
                const isPickup = side === 'pickup'
                const stopId = `${load.id}:${side}`
                const top = stopVisualTopById.get(stopId) ?? Math.max(0, (minute - startMinute) * PX_PER_MINUTE)
                const stopIndex = stopMinutes.findIndex((item) => item.id === stopId)
                const previousMinute = stopIndex > 0 ? stopMinutes[stopIndex - 1].minute : null
                const nextMinute = stopIndex >= 0 && stopIndex < stopMinutes.length - 1 ? stopMinutes[stopIndex + 1].minute : null
                const compact = (Number.isFinite(previousMinute) && minute - previousMinute <= 75) || (Number.isFinite(nextMinute) && nextMinute - minute <= 75)
                const stopIntel = itineraryByStopId.get(stopId)
                const stopRisk = stopIntel?.lateMinutes > 0 ? 'conflict-stop' : stopIntel?.slackMinutes <= 30 ? 'tight-stop' : ''
                const travelText = Number.isFinite(stopIntel?.travelMinutes) && stopIntel.travelMinutes > 0 ? `${formatPlanningMinutes(stopIntel.travelMinutes)} TRAVEL` : null
                const outcomeText = stopIntel?.lateMinutes > 0
                  ? `${formatPlanningMinutes(stopIntel.lateMinutes)} LATE`
                  : Number.isFinite(stopIntel?.slackMinutes) && stopIntel.slackMinutes <= 30
                    ? `${formatPlanningMinutes(Math.max(0, stopIntel.slackMinutes))} BUFFER`
                    : stopIntel?.waitMinutes >= 30
                      ? `${formatPlanningMinutes(stopIntel.waitMinutes)} WAIT`
                      : null
                return <button
                  type="button"
                  key={`${load.id}-${side}`}
                  className={`scheduler-stop-event ${isPickup ? 'pickup' : 'delivery'} ${booked ? 'booked' : 'unbooked'} ${compact ? 'compact' : ''} ${stopRisk} ${selected ? 'selected' : ''}`}
                  style={{ top: `${top}px`, '--scheduler-event-color': eventColor(side) }}
                  onClick={(eventClick) => { eventClick.stopPropagation(); setSelectedLoadId((current) => current === load.id ? null : load.id) }}
                >
                  <span className="scheduler-stop-event-kind">{isPickup ? 'PICKUP' : 'DELIVERY'} · {statusFor(load)}</span>
                  <div className="scheduler-stop-event-main">
                    <b>{formatTime(minute)}</b>
                    <strong>{location?.name || (isPickup ? 'Pickup' : 'Delivery')}</strong>
                  </div>
                  <small>{getFreightRouteName(load)}</small>
                  {(travelText || outcomeText) && <span className="scheduler-stop-intel">{[travelText, outcomeText].filter(Boolean).join(' · ')}</span>}
                  {load.id === focusLoadId && <em>NEW</em>}
                </button>
              }
              return [event('pickup', pickupMinute, pickup), event('delivery', deliveryMinute, delivery)]
            })}
            {!currentDayLoads.length && <div className="scheduler-open-day"><strong>OPEN DAY</strong><span>No routes are planned for {driver?.fullName || driver?.name || 'this driver'} yet.</span></div>}
          </div>
        </div>
      </div>

      {selectedLoad && (selectedLoad.candidateDriverId === driver?.id || selectedLoad.assignedDriverId === driver?.id) && (
        <aside className="scheduler-selection-panel" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="scheduler-selection-close" onClick={() => setSelectedLoadId(null)} aria-label="Close route actions">×</button>
          <div className="scheduler-selection-copy">
            <span>{selectedStatus}</span>
            <strong>{getFreightRouteName(selectedLoad)}</strong>
            <small>Pickup {formatAppointment(selectedLoad.pickupDayIndex, selectedLoad.pickupWindowStartMinutes, selectedLoad.pickupWindowEndMinutes)}</small>
            <em className={`scheduler-selection-impact ${planHasConflict ? 'conflict' : planQuality?.label === 'TIGHT' ? 'tight' : 'fit'}`}>{selectedImpactLine}</em>
          </div>
          <div className="scheduler-selection-actions">
            {selectedLoad.status === 'available' && selectedLoad.carrierApprovalStatus === 'APPROVED' && <button type="button" className="primary" onClick={() => onBookRoute?.(selectedLoad.id)}>BOOK ROUTE</button>}
            {selectedLoad.status === 'available' && approvalRequired && selectedLoad.scheduleApprovalQueued && !['PENDING','APPROVED'].includes(selectedLoad.carrierApprovalStatus) && (planHasConflict ? <button type="button" className="primary" disabled>RESOLVE PLAN CONFLICT</button> : <button type="button" className="primary" onClick={() => onRequestScheduleApproval?.(driver.id)}>REQUEST APPROVAL</button>)}
            {selectedLoad.status === 'available' && !approvalRequired && selectedLoad.scheduleApprovalQueued && (planHasConflict ? <button type="button" className="primary" disabled>RESOLVE PLAN CONFLICT</button> : <button type="button" className="primary" onClick={() => onBookRoute?.(selectedLoad.id)}>BOOK ROUTE</button>)}
            {selectedLoad.status === 'available' && selectedLoad.carrierApprovalStatus === 'PENDING' && <button type="button" className="primary" disabled>AWAITING APPROVAL</button>}
            {selectedCanRemove && <button type="button" onClick={() => { const removed = onRemoveFromPlan?.(selectedLoad.id); if (removed !== false) setSelectedLoadId(null) }}>{selectedRemoveLabel}</button>}
            {!selectedCanRemove && selectedLoad.status !== 'available' && <button type="button" disabled>ROUTE IN PROGRESS</button>}
          </div>
        </aside>
      )}

    </div>
  )
}

export default FleetSchedulerScreen
