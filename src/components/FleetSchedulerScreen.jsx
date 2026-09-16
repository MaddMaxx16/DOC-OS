import { useEffect, useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { formatAppointment, formatCompactDate, formatTime, getCalendarDate } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'
import { formatPlanningMinutes, getPlanQuality } from '../utils/planningIntelligence.js'
import { getRouteLifecycleLabel, getRouteLifecycleTone } from '../utils/routeLifecycle.js'
import { isDriverOnLunch, isLunchDecisionReady } from '../utils/lunchDecisionEvents.js'

const DAY_START = 6 * 60
const DAY_END = 22 * 60
const OVERNIGHT_TIMELINE_CAP = 36 * 60
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
function approximateMiles(a, b) {
  if (!a || !b) return null
  const toRad = (value) => value * Math.PI / 180
  const lat1 = toRad(a.latitude); const lat2 = toRad(b.latitude)
  const dLat = lat2 - lat1; const dLon = toRad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}
function minutesToTimeInput(minutes) {
  if (!Number.isFinite(minutes)) return ''
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}
function getWorkdayEndOffset(workday) {
  if (!workday) return 0
  if (Number.isFinite(Number(workday.endDayOffset))) return Number(workday.endDayOffset)
  return Number(workday.endMinutes) <= Number(workday.startMinutes) ? 1 : 0
}
function getWorkdayEndAbsolute(dayIndex, workday) {
  if (!workday) return null
  const end = Number(workday.endMinutes)
  if (!Number.isFinite(end)) return null
  return Number(dayIndex) * 1440 + end + getWorkdayEndOffset(workday) * 1440
}
function timeInputToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''))
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}
function TimeStepper({ label, value, onChange }) {
  const current = timeInputToMinutes(value)
  const display = Number.isFinite(current) ? formatTime(current) : '--:--'
  const adjust = (delta) => {
    const base = Number.isFinite(current) ? current : 0
    onChange(minutesToTimeInput(clamp(base + delta, 0, 1439)))
  }
  return (
    <div className="scheduler-time-stepper">
      <span>{label}</span>
      <strong>{display}</strong>
      <div className="scheduler-time-stepper-actions">
        <button type="button" onClick={() => adjust(-60)}>−1H</button>
        <button type="button" onClick={() => adjust(-15)}>−15</button>
        <button type="button" onClick={() => adjust(15)}>+15</button>
        <button type="button" onClick={() => adjust(60)}>+1H</button>
      </div>
    </div>
  )
}
function minuteFor(load, side) {
  const day = side === 'pickup' ? load.pickupDayIndex : load.deliveryDayIndex
  const minute = side === 'pickup' ? load.pickupWindowStartMinutes : load.deliveryWindowStartMinutes
  return Number(day || 0) * 1440 + Number(minute || 0)
}
function statusFor(load) { return getRouteLifecycleLabel(load) }
function toneFor(load) { return getRouteLifecycleTone(load) }

function FleetSchedulerScreen({
  loads = [], drivers = [], carriers = [], gameTime, focusLoadId = null, initialDriverId = null,
  onBackToFreightLink, onRequestScheduleApproval, onBookRoute, onBookApprovedSchedule, onRemoveFromPlan, onSendDriverSchedule, onUpdateDriverWorkday, onOpenLunchDecision,
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
  const liveDay = gameTime?.gameDayIndex || 0
  const [currentDay, setCurrentDay] = useState(liveDay)
  useEffect(() => {
    setCurrentDay((day) => day < liveDay ? liveDay : day)
  }, [liveDay])
  const planningDays = useMemo(() => Array.from({ length: 7 }, (_, index) => liveDay + index), [liveDay])
  const selectedDate = getCalendarDate(currentDay)
  const selectedDateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
  const workday = driver?.workdayByDay?.[currentDay] || null
  const priorWorkday = currentDay > 0 ? (driver?.workdayByDay?.[currentDay - 1] || null) : null
  const carryoverWorkday = priorWorkday && getWorkdayEndOffset(priorWorkday) === 1 ? priorWorkday : null
  const lunchDecisionReady = isLunchDecisionReady({ driver, loads, gameTime })
  const driverOnLunch = isDriverOnLunch(driver, gameTime)
  const [workdayEditorOpen, setWorkdayEditorOpen] = useState(false)
  const [workdayEditorMode, setWorkdayEditorMode] = useState('full')
  const [workdayError, setWorkdayError] = useState('')
  const [workdayDraft, setWorkdayDraft] = useState({ start: '06:00', lunchStart: '12:00', lunchDuration: '30', end: '17:00', overnightMode: '', overnightTargetLocationId: '' })
  useEffect(() => {
    setWorkdayEditorOpen(false)
    setWorkdayError('')
  }, [driver?.id, currentDay])
  const openWorkdayEditor = (mode = 'full') => {
    setWorkdayEditorMode(mode)
    setWorkdayDraft({
      start: minutesToTimeInput(workday?.startMinutes ?? 360),
      lunchStart: minutesToTimeInput(workday?.lunchStartMinutes ?? 720),
      lunchDuration: String(workday?.lunchDurationMinutes ?? 30),
      end: minutesToTimeInput(workday?.endMinutes ?? 1020),
      overnightMode: workday?.overnightMode || '',
      overnightTargetLocationId: workday?.overnightTargetLocationId || '',
    })
    setWorkdayError('')
    setWorkdayEditorOpen(true)
  }
  const saveWorkday = () => {
    const startMinutes = timeInputToMinutes(workdayDraft.start)
    const endMinutes = timeInputToMinutes(workdayDraft.end)
    if (![startMinutes, endMinutes].every(Number.isFinite)) {
      setWorkdayError('Enter a valid start and end time.')
      return
    }
    const endDayOffset = endMinutes <= startMinutes ? 1 : 0
    const existingLunchStart = Number(workday?.lunchStartMinutes)
    const existingLunchDuration = Number(workday?.lunchDurationMinutes)
    if (Number.isFinite(existingLunchStart) && Number.isFinite(existingLunchDuration)) {
      const lunchOffset = endDayOffset === 1 && existingLunchStart < startMinutes ? 1440 : 0
      const lunchAbsolute = existingLunchStart + lunchOffset
      const workdayEndRelative = endMinutes + endDayOffset * 1440
      if (lunchAbsolute < startMinutes || lunchAbsolute + existingLunchDuration > workdayEndRelative) {
        setWorkdayError('The current lunch falls outside these hours. Adjust lunch first.')
        return
      }
    }
    onUpdateDriverWorkday?.(driver?.id, currentDay, { ...(workday || {}), startMinutes, endMinutes, endDayOffset })
    setWorkdayError('')
    setWorkdayEditorOpen(false)
  }
  const saveShiftEndPlan = () => {
    if (!workday) return
    if (!workdayDraft.overnightMode || (workdayDraft.overnightMode === 'truck-stop' && !workdayDraft.overnightTargetLocationId)) {
      setWorkdayError('Choose a shift-end staging location.')
      return
    }
    onUpdateDriverWorkday?.(driver?.id, currentDay, { ...workday, overnightMode: workdayDraft.overnightMode, overnightTargetLocationId: workdayDraft.overnightMode === 'yard' ? 'metroline-yard' : workdayDraft.overnightTargetLocationId })
    setWorkdayError('')
    setWorkdayEditorOpen(false)
  }

  const saveLunch = () => {
    if (!workday) return
    const lunchStartMinutes = timeInputToMinutes(workdayDraft.lunchStart)
    const lunchDurationMinutes = Number(workdayDraft.lunchDuration)
    if (!Number.isFinite(lunchStartMinutes) || !Number.isFinite(lunchDurationMinutes)) {
      setWorkdayError('Enter a valid lunch time.')
      return
    }
    const endDayOffset = getWorkdayEndOffset(workday)
    const lunchOffset = endDayOffset === 1 && lunchStartMinutes < Number(workday.startMinutes) ? 1440 : 0
    const lunchRelative = lunchStartMinutes + lunchOffset
    const workdayEndRelative = Number(workday.endMinutes) + endDayOffset * 1440
    if (lunchRelative < Number(workday.startMinutes) || lunchRelative + lunchDurationMinutes > workdayEndRelative) {
      setWorkdayError('Lunch must fit inside the driver workday.')
      return
    }
    onUpdateDriverWorkday?.(driver?.id, currentDay, { ...workday, lunchStartMinutes, lunchDurationMinutes })
    setWorkdayError('')
    setWorkdayEditorOpen(false)
  }

  const scheduleLoads = useMemo(() => loads.filter((load) => {
    const assigned = load.assignedDriverId === driver?.id && !['completed', 'delivered', 'expired'].includes(load.status) && !['completed', 'delivered'].includes(load.tripStatus)
    const planned = load.status === 'available' && load.candidateDriverId === driver?.id && load.scheduleApprovalQueued
    return assigned || planned
  }).sort((a, b) => minuteFor(a, 'pickup') - minuteFor(b, 'pickup')), [loads, driver?.id])

  const currentDayLoads = scheduleLoads.filter((load) => (load.pickupDayIndex ?? currentDay) === currentDay || (load.deliveryDayIndex ?? currentDay) === currentDay)
  const relativeTimelineMinute = (load, side) => {
    const sideDayValue = side === 'pickup' ? load.pickupDayIndex : load.deliveryDayIndex
    const sideDay = Number.isFinite(Number(sideDayValue)) ? Number(sideDayValue) : currentDay
    const sideMinute = Number(side === 'pickup' ? load.pickupWindowStartMinutes : load.deliveryWindowStartMinutes)
    if (!Number.isFinite(sideMinute)) return null
    if (sideDay === currentDay) return sideMinute
    const pickupDay = Number.isFinite(Number(load.pickupDayIndex)) ? Number(load.pickupDayIndex) : currentDay
    const deliveryDay = Number.isFinite(Number(load.deliveryDayIndex)) ? Number(load.deliveryDayIndex) : currentDay
    const crossesFromSelectedDay = pickupDay === currentDay && deliveryDay === currentDay + 1
    if (side === 'delivery' && crossesFromSelectedDay && sideDay === currentDay + 1) return 1440 + sideMinute
    return null
  }

  // CS2.0B.4.2.3.8 — Day View remains vertically continuous when today's
  // work or freight crosses midnight. The seven-date strip stays fixed; only
  // the selected operational timeline extends into the next calendar date.
  const scheduleStopMinutes = currentDayLoads.flatMap((load) => [
    relativeTimelineMinute(load, 'pickup'),
    relativeTimelineMinute(load, 'delivery'),
  ]).filter(Number.isFinite)
  const workdayEndRelative = workday ? Number(workday.endMinutes) + getWorkdayEndOffset(workday) * 1440 : null
  const lunchStartRelative = workday && Number.isFinite(Number(workday.lunchStartMinutes))
    ? Number(workday.lunchStartMinutes) + (getWorkdayEndOffset(workday) === 1 && Number(workday.lunchStartMinutes) < Number(workday.startMinutes) ? 1440 : 0)
    : null
  // CS2.0B.4.2.3.9 — If the previous workday carries into this calendar
  // date, the receiving Day View must actually expose that post-midnight window.
  // Midnight is minute 0 from this date's perspective; the prior workday's
  // endMinutes is therefore already the correct receiving-day position.
  const carryoverEndMinute = carryoverWorkday ? Number(carryoverWorkday.endMinutes) : null
  const timelineReferenceMinutes = [
    ...scheduleStopMinutes,
    carryoverWorkday ? 0 : null,
    carryoverEndMinute,
    workday?.startMinutes,
    lunchStartRelative,
    Number.isFinite(lunchStartRelative) && Number.isFinite(Number(workday?.lunchDurationMinutes)) ? lunchStartRelative + Number(workday.lunchDurationMinutes) : null,
    workdayEndRelative,
  ].filter(Number.isFinite)
  const latestStopMinute = timelineReferenceMinutes.length ? Math.max(...timelineReferenceMinutes) : 1440
  // CS2.0B.4.2.3.11 — Every Agenda date owns one complete calendar-day canvas.
  // This removes conditional 6 AM / 10 PM windows and makes carryover behavior
  // predictable: midnight is always visible, the selected date always runs
  // through midnight, and true next-day operations may extend beyond it.
  const startMinute = 0
  const requiredEndMinute = Math.max(1440, latestStopMinute + (latestStopMinute > 1440 ? 60 : 0))
  const endMinute = clamp(Math.ceil(requiredEndMinute / 60) * 60, 1440, OVERNIGHT_TIMELINE_CAP)
  const baseTimelineHeight = (endMinute - startMinute) * PX_PER_MINUTE
  const hours = []
  for (let minute = startMinute; minute <= endMinute; minute += 60) hours.push(minute)
  const crossesMidnight = endMinute > 1440

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
    Number.isFinite(relativeTimelineMinute(item, 'pickup')) ? { id: `${item.id}:pickup`, loadId: item.id, side: 'pickup', minute: relativeTimelineMinute(item, 'pickup') } : null,
    Number.isFinite(relativeTimelineMinute(item, 'delivery')) ? { id: `${item.id}:delivery`, loadId: item.id, side: 'delivery', minute: relativeTimelineMinute(item, 'delivery') } : null,
  ].filter(Boolean)).sort((a, b) => a.minute - b.minute || (a.side === 'delivery' ? -1 : 1))

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
          <h2>{currentDay === liveDay ? 'Today' : selectedDateLabel}</h2>
        </div>
        <div className="scheduler-header-actions">
          {driverOnLunch ? (
            <button type="button" className="primary" disabled>ON LUNCH</button>
          ) : planHasConflict && approvalCandidates.length > 0 ? (
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

      <nav className="scheduler-date-strip" aria-label="Seven day planning window">
        {planningDays.map((dayIndex) => {
          const date = getCalendarDate(dayIndex)
          const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()
          const hasFreight = scheduleLoads.some((load) => (load.pickupDayIndex ?? liveDay) === dayIndex || (load.deliveryDayIndex ?? liveDay) === dayIndex)
          return <button type="button" key={dayIndex} className={dayIndex === currentDay ? 'active' : ''} onClick={() => { setCurrentDay(dayIndex); setSelectedLoadId(null) }}><span>{dayIndex === liveDay ? 'TODAY' : weekday}</span><strong>{formatCompactDate(dayIndex)}</strong>{hasFreight && <i aria-label="Freight planned" />}</button>
        })}
      </nav>

      <div className="scheduler-driver-tabs aw14" aria-label="Driver schedules">
        {drivers.filter((item) => item.carrierId).map((item) => (
          <button type="button" key={item.id} className={item.id === driver?.id ? 'active' : ''} onClick={() => { setDriverId(item.id); setSelectedLoadId(null) }}><strong>{item.fullName || item.name}</strong></button>
        ))}
      </div>

      <section className="scheduler-workday-panel">
        {carryoverWorkday && (
          <div className="scheduler-lunch-choice-summary">
            <span>OVERNIGHT WORKDAY</span>
            <strong>Previous day continues until {formatTime(carryoverWorkday.endMinutes)}</strong>
          </div>
        )}
        <div className={`scheduler-workday-strip ${workday ? 'configured' : 'unset'}`}>
          <div>
            <span>DRIVER WORKDAY</span>
            {workday ? (
              <strong>{formatTime(workday.startMinutes)} – {formatTime(workday.endMinutes)}{getWorkdayEndOffset(workday) ? ' · NEXT DAY' : ''}</strong>
            ) : (
              <strong>NOT SET <small>· Add start and end-of-day</small></strong>
            )}
          </div>
          <div className="scheduler-workday-actions">
            <button type="button" disabled={!workday || Boolean(workday?.lunchEvent?.selectedChoiceId)} onClick={() => openWorkdayEditor('lunch')}>{workday?.lunchEvent?.selectedChoiceId ? 'LUNCH SET' : 'SET LUNCH'}</button>
            {workday && <button type="button" className="overnight" onClick={() => openWorkdayEditor('overnight')}>{workday?.overnightMode ? 'SHIFT END ✓' : 'SHIFT END'}</button>}
            <button type="button" onClick={() => openWorkdayEditor('full')}>{workday ? 'EDIT DAY' : 'SET TIME'}</button>
          </div>
        </div>
        {lunchDecisionReady && !workday?.lunchEvent?.selectedChoiceId && (
          <div className="scheduler-lunch-ready-summary">
            <div>
              <span>LUNCH READY</span>
              <strong>Choose how {driver?.fullName || driver?.name || 'the driver'} uses today’s break.</strong>
            </div>
            <button type="button" onClick={() => onOpenLunchDecision?.(driver?.id)}>CHOOSE LUNCH</button>
          </div>
        )}
        {workday?.lunchEvent?.selectedChoiceId && (
          <div className="scheduler-lunch-choice-summary">
            <span>SCHEDULED LUNCH</span>
            <strong>{workday.lunchEvent.title}</strong>
            <small>{Number(workday.lunchEvent.effects?.recovery || 0) > 0 ? `RECOVERY +${workday.lunchEvent.effects.recovery}` : Number(workday.lunchEvent.effects?.recovery || 0) < 0 ? `RECOVERY ${workday.lunchEvent.effects.recovery}` : 'RECOVERY NEUTRAL'}{Number(workday.lunchEvent.effects?.earlyCheckInBonusMinutes || 0) > 0 ? ` · EARLY CHECK +${workday.lunchEvent.effects.earlyCheckInBonusMinutes}` : ''}{Number(workday.lunchEvent.effects?.relationship || 0) ? ` · RELATIONSHIP ${Number(workday.lunchEvent.effects.relationship) > 0 ? '+' : ''}${workday.lunchEvent.effects.relationship}` : ''}</small>
          </div>
        )}
      </section>

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
          {crossesMidnight && <div className="scheduler-midnight-divider" style={{ top: `${(1440 - startMinute) * PX_PER_MINUTE}px` }}><span>MIDNIGHT · {formatCompactDate(currentDay + 1)}</span></div>}

          {carryoverWorkday && Number.isFinite(carryoverEndMinute) && (
            <div className="scheduler-workday-marker end" style={{ top: `${Math.max(0, (carryoverEndMinute - startMinute) * PX_PER_MINUTE)}px` }}><span>PREVIOUS DAY ENDS</span></div>
          )}

          {workday && (
            <>
              <div className="scheduler-workday-marker start" style={{ top: `${Math.max(0, (Number(workday.startMinutes) - startMinute) * PX_PER_MINUTE)}px` }}><span>SHIFT START</span></div>
              {Number.isFinite(lunchStartRelative) && Number.isFinite(Number(workday.lunchDurationMinutes)) && <div className="scheduler-workday-lunch" style={{ top: `${Math.max(0, (lunchStartRelative - startMinute) * PX_PER_MINUTE)}px`, height: `${Math.max(18, Number(workday.lunchDurationMinutes) * PX_PER_MINUTE)}px` }}><span>{workday.lunchEvent?.title ? `${workday.lunchEvent.title.toUpperCase()} · ` : 'LUNCH · '}{workday.lunchDurationMinutes} MIN</span></div>}
              {Number.isFinite(workdayEndRelative) && <div className="scheduler-workday-marker end" style={{ top: `${Math.max(0, (workdayEndRelative - startMinute) * PX_PER_MINUTE)}px` }}><span>END OF DAY</span></div>}
            </>
          )}

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
              const pickupTimelineMinute = relativeTimelineMinute(load, 'pickup')
              const deliveryTimelineMinute = relativeTimelineMinute(load, 'delivery')
              return [
                Number.isFinite(pickupTimelineMinute) ? event('pickup', pickupTimelineMinute, pickup) : null,
                Number.isFinite(deliveryTimelineMinute) ? event('delivery', deliveryTimelineMinute, delivery) : null,
              ].filter(Boolean)
            })}
            {!currentDayLoads.length && <div className="scheduler-open-day"><strong>OPEN DAY</strong><span>No routes are planned for {driver?.fullName || driver?.name || 'this driver'} yet.</span></div>}
          </div>
        </div>
      </div>

      {workdayEditorOpen && (
        <div className="scheduler-workday-editor-backdrop" role="presentation" onClick={() => setWorkdayEditorOpen(false)}>
          <section className="scheduler-workday-editor" role="dialog" aria-modal="true" aria-label={`Set ${driver?.fullName || driver?.name || 'driver'} workday`} onClick={(event) => event.stopPropagation()}>
            <div className="scheduler-workday-editor-heading">
              <div><span>AGENDA · DRIVER HOURS</span><strong>{driver?.fullName || driver?.name}</strong></div>
              <button type="button" onClick={() => setWorkdayEditorOpen(false)} aria-label="Close workday editor">×</button>
            </div>
            <p>{workdayEditorMode === 'lunch' ? 'Set this day’s lunch window. You can adjust it until the driver actually begins lunch.' : workdayEditorMode === 'overnight' ? `Choose where ${driver?.fullName || driver?.name || 'the driver'} stages after this shift.` : 'Set the driver’s scheduled start and end time. Lunch is managed separately.'}</p>
            {workdayEditorMode === 'full' ? (
              <div className="scheduler-workday-fields scheduler-workday-time-fields">
                <TimeStepper label="START TIME" value={workdayDraft.start} onChange={(value) => setWorkdayDraft((current) => ({ ...current, start: value }))} />
                <TimeStepper label="SHIFT END" value={workdayDraft.end} onChange={(value) => setWorkdayDraft((current) => ({ ...current, end: value }))} />
                {Number.isFinite(timeInputToMinutes(workdayDraft.start)) && Number.isFinite(timeInputToMinutes(workdayDraft.end)) && timeInputToMinutes(workdayDraft.end) <= timeInputToMinutes(workdayDraft.start) && <div className="scheduler-next-day-note">ENDS NEXT CALENDAR DAY</div>}
              </div>
            ) : workdayEditorMode === 'overnight' ? (
              <div className="scheduler-overnight-options">
                {(() => {
                  const origin = (Number.isFinite(driver?.longitude) && Number.isFinite(driver?.latitude))
                    ? { longitude: driver.longitude, latitude: driver.latitude }
                    : mapLocations.find((location) => location.id === (driver?.lastKnownLocationId || driver?.homeBaseLocationId))
                  const choices = [
                    mapLocations.find((location) => location.id === 'metroline-yard'),
                    ...mapLocations.filter((location) => ['queens-staging-area', 'newark-fuel-stop', 'elizabeth-truck-stop'].includes(location.id)),
                  ].filter(Boolean)
                  return choices.map((location) => {
                    const isYard = location.id === 'metroline-yard'
                    const active = isYard ? workdayDraft.overnightMode === 'yard' : (workdayDraft.overnightMode === 'truck-stop' && workdayDraft.overnightTargetLocationId === location.id)
                    const miles = approximateMiles(origin, location)
                    return (
                      <button type="button" key={location.id} className={active ? 'active' : ''} onClick={() => setWorkdayDraft((current) => ({ ...current, overnightMode: isYard ? 'yard' : 'truck-stop', overnightTargetLocationId: location.id }))}>
                        <strong>{location.name.toUpperCase()}</strong><small>{Number.isFinite(miles) ? `${miles.toFixed(1)} MI FROM CURRENT POSITION` : (isYard ? 'CARRIER YARD' : 'TRUCK STOP')}</small>
                      </button>
                    )
                  })
                })()}
              </div>
            ) : (
              <div className="scheduler-workday-fields lunch-only scheduler-lunch-setting-fields">
                <TimeStepper label="LUNCH START" value={workdayDraft.lunchStart} onChange={(value) => setWorkdayDraft((current) => ({ ...current, lunchStart: value }))} />
                <div className="scheduler-duration-control">
                  <span>LUNCH LENGTH</span>
                  <div>
                    {[20, 30, 45, 60].map((duration) => <button type="button" key={duration} className={String(duration) === String(workdayDraft.lunchDuration) ? 'active' : ''} onClick={() => setWorkdayDraft((current) => ({ ...current, lunchDuration: String(duration) }))}>{duration} MIN</button>)}
                  </div>
                </div>
              </div>
            )}
            {workdayError && <div className="scheduler-workday-error">{workdayError}</div>}
            <div className="scheduler-workday-editor-actions">
              <button type="button" onClick={() => setWorkdayEditorOpen(false)}>CANCEL</button>
              {workdayEditorMode === 'full' && workday && <button type="button" onClick={() => { onUpdateDriverWorkday?.(driver?.id, currentDay, null); setWorkdayEditorOpen(false) }}>CLEAR</button>}
              <button type="button" className="primary" onClick={workdayEditorMode === 'lunch' ? saveLunch : workdayEditorMode === 'overnight' ? saveShiftEndPlan : saveWorkday}>{workdayEditorMode === 'lunch' ? 'SET LUNCH' : workdayEditorMode === 'overnight' ? 'SAVE SHIFT END' : 'SAVE TIME'}</button>
            </div>
          </section>
        </div>
      )}

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
            {driverOnLunch ? (
              <button type="button" className="primary" disabled>DRIVER ON LUNCH</button>
            ) : (<>
              {selectedLoad.status === 'available' && selectedLoad.carrierApprovalStatus === 'APPROVED' && <button type="button" className="primary" onClick={() => onBookRoute?.(selectedLoad.id)}>BOOK ROUTE</button>}
              {selectedLoad.status === 'available' && approvalRequired && selectedLoad.scheduleApprovalQueued && !['PENDING','APPROVED'].includes(selectedLoad.carrierApprovalStatus) && (planHasConflict ? <button type="button" className="primary" disabled>RESOLVE PLAN CONFLICT</button> : <button type="button" className="primary" onClick={() => onRequestScheduleApproval?.(driver.id)}>REQUEST APPROVAL</button>)}
              {selectedLoad.status === 'available' && !approvalRequired && selectedLoad.scheduleApprovalQueued && (planHasConflict ? <button type="button" className="primary" disabled>RESOLVE PLAN CONFLICT</button> : <button type="button" className="primary" onClick={() => onBookRoute?.(selectedLoad.id)}>BOOK ROUTE</button>)}
              {selectedLoad.status === 'available' && selectedLoad.carrierApprovalStatus === 'PENDING' && <button type="button" className="primary" disabled>AWAITING APPROVAL</button>}
              {selectedCanRemove && <button type="button" onClick={() => { const removed = onRemoveFromPlan?.(selectedLoad.id); if (removed !== false) setSelectedLoadId(null) }}>{selectedRemoveLabel}</button>}
              {!selectedCanRemove && selectedLoad.status !== 'available' && <button type="button" disabled>ROUTE IN PROGRESS</button>}
            </>)}
          </div>
        </aside>
      )}

    </div>
  )
}

export default FleetSchedulerScreen
