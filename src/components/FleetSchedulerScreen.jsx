import { needsRateConfirmationBeforeDeparture, isRateConfirmationConfirmed, getRateConfirmationHoldReason } from '../utils/rateConfirmation.js'
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
function TimeStepper({ label, value, onChange, disabled = false, lockedLabel = '' }) {
  const current = timeInputToMinutes(value)
  const display = Number.isFinite(current) ? formatTime(current) : '--:--'
  const adjust = (delta) => {
    const base = Number.isFinite(current) ? current : 0
    if (!disabled) onChange(minutesToTimeInput(clamp(base + delta, 0, 1439)))
  }
  return (
    <div className={`scheduler-time-stepper${disabled ? ' is-locked' : ''}`}>
      <span>{label}</span>
      <strong>{display}</strong>
      {disabled && lockedLabel ? <small className="scheduler-time-stepper-lock">{lockedLabel}</small> : null}
      <div className="scheduler-time-stepper-actions">
        <button type="button" disabled={disabled} onClick={() => adjust(-60)}>−1H</button>
        <button type="button" disabled={disabled} onClick={() => adjust(-15)}>−15</button>
        <button type="button" disabled={disabled} onClick={() => adjust(15)}>+15</button>
        <button type="button" disabled={disabled} onClick={() => adjust(60)}>+1H</button>
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

// B.5.4D.4.2.3 — One Scheduler Authority
// B.5.4D.4.2.8 — Navigation Standardization
// B.5.4D.4.3.2 — Status + UI Consistency
function FleetSchedulerScreen({
  firstDay = null,
  loads = [], drivers = [], carriers = [], gameTime, focusLoadId = null, initialDriverId = null,
  onBackToFreightLink, onRequestScheduleApproval, onBookRoute, onBookApprovedSchedule, onRemoveFromPlan, onSendDriverSchedule, onUpdateDriverWorkday, onOpenLunchDecision, onDriverContextChange,
  onOpenDriverOperations, onReviewRateCon,
}) {
  const focusLoad = loads.find((load) => load.id === focusLoadId)
  const firstDriverId = initialDriverId || focusLoad?.candidateDriverId || focusLoad?.assignedDriverId || drivers.find((driver) => driver.carrierId)?.id || drivers[0]?.id || null
  const [driverId, setDriverId] = useState(firstDriverId)
  useEffect(() => {
    if (driverId) onDriverContextChange?.(driverId)
  }, [driverId, onDriverContextChange])
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
  const dutySessionDayIndex = driver?.hours?.dutySessionDayIndex
  const dutySessionStartGameMinute = driver?.hours?.dutySessionStartGameMinute
  const dutyStartLocked = dutySessionDayIndex !== null && dutySessionDayIndex !== undefined && dutySessionStartGameMinute !== null && dutySessionStartGameMinute !== undefined && Number(dutySessionDayIndex) === Number(currentDay) && Number.isFinite(Number(dutySessionStartGameMinute))
  const priorWorkday = currentDay > 0 ? (driver?.workdayByDay?.[currentDay - 1] || null) : null
  const carryoverWorkday = priorWorkday && getWorkdayEndOffset(priorWorkday) === 1 ? priorWorkday : null
  const lunchDecisionReady = isLunchDecisionReady({ driver, loads, gameTime })
  const driverOnLunch = isDriverOnLunch(driver, gameTime)
  const [workdayEditorOpen, setWorkdayEditorOpen] = useState(false)
  const [workdayEditorMode, setWorkdayEditorMode] = useState('full')
  const [workdayError, setWorkdayError] = useState('')
  const [pendingLunchChange, setPendingLunchChange] = useState(null)
  const [workdayDraft, setWorkdayDraft] = useState({ start: '', lunchStart: '12:00', lunchDuration: '30', end: '', overnightMode: '', overnightTargetLocationId: '' })
  useEffect(() => {
    setWorkdayEditorOpen(false)
    setWorkdayError('')
  }, [driver?.id, currentDay])
  const openWorkdayEditor = (mode = 'full') => {
    setWorkdayEditorMode(mode)
    setWorkdayDraft({
      start: Number.isFinite(Number(workday?.startMinutes)) ? minutesToTimeInput(workday.startMinutes) : '',
      lunchStart: minutesToTimeInput(workday?.lunchStartMinutes ?? 720),
      lunchDuration: String(workday?.lunchDurationMinutes ?? 30),
      end: Number.isFinite(Number(workday?.endMinutes)) ? minutesToTimeInput(workday.endMinutes) : '',
      overnightMode: workday?.overnightMode || '',
      overnightTargetLocationId: workday?.overnightTargetLocationId || '',
    })
    setWorkdayError('')
    setWorkdayEditorOpen(true)
  }
  const saveWorkday = () => {
    const startMinutes = dutyStartLocked && Number.isFinite(Number(workday?.startMinutes)) ? Number(workday.startMinutes) : timeInputToMinutes(workdayDraft.start)
    const endMinutes = timeInputToMinutes(workdayDraft.end)
    if (![startMinutes, endMinutes].every(Number.isFinite)) {
      setWorkdayError('Choose a shift start and end time.')
      return
    }
    // B.5.3.1.3 — carrier activation is not permission to backdate duty.
    if (!workday && Number(currentDay) === Number(liveDay) && startMinutes < Number(gameTime?.totalMinutesOfDay || 0)) {
      setWorkdayError('Today’s shift start cannot be earlier than the current game time.')
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

  const commitLunchChange = (nextWorkday) => {
    onUpdateDriverWorkday?.(driver?.id, currentDay, nextWorkday)
    setPendingLunchChange(null)
    setWorkdayError('')
    setWorkdayEditorOpen(false)
  }

  const saveLunch = () => {
    if (!workday) return
    if (workday?.lunchEvent?.selectedChoiceId || ['calculating', 'traveling', 'arrived', 'on-lunch', 'resume-calculating'].includes(driver?.lunchRouteStatus)) {
      setWorkdayError('Lunch is already in execution and can no longer be moved.')
      return
    }
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
    const nextWorkday = { ...workday, lunchStartMinutes, lunchDurationMinutes }
    const changed = Number(workday.lunchStartMinutes) !== lunchStartMinutes || Number(workday.lunchDurationMinutes) !== lunchDurationMinutes
    const affectedLoads = loads.filter((load) => {
      const belongsToDriver = load.assignedDriverId === driver?.id || load.candidateDriverId === driver?.id
      const inPlan = belongsToDriver && !['completed', 'delivered', 'expired'].includes(load.status) && !['completed', 'delivered', 'expired'].includes(load.tripStatus)
      if (!inPlan) return false
      const pickupDay = Number.isFinite(Number(load.pickupDayIndex)) ? Number(load.pickupDayIndex) : currentDay
      const deliveryDay = Number.isFinite(Number(load.deliveryDayIndex)) ? Number(load.deliveryDayIndex) : currentDay
      const pickupStart = pickupDay === currentDay ? Number(load.pickupWindowStartMinutes) : null
      const pickupEnd = pickupDay === currentDay ? Number(load.pickupWindowEndMinutes ?? load.pickupWindowStartMinutes) : null
      const deliveryStart = deliveryDay === currentDay ? Number(load.deliveryWindowStartMinutes) : null
      const deliveryEnd = deliveryDay === currentDay ? Number(load.deliveryWindowEndMinutes ?? load.deliveryWindowStartMinutes) : null
      const lunchEnd = lunchStartMinutes + lunchDurationMinutes
      const overlaps = (a, b) => Number.isFinite(a) && Number.isFinite(b) && lunchStartMinutes < b && lunchEnd > a
      return overlaps(pickupStart, pickupEnd) || overlaps(deliveryStart, deliveryEnd)
    })
    const planLoads = loads.filter((load) => load.candidateDriverId === driver?.id && load.scheduleApprovalQueued && load.status === 'available')
    const committedLoads = loads.filter((load) => load.assignedDriverId === driver?.id && !['completed', 'delivered', 'expired'].includes(load.status) && !['completed', 'delivered', 'expired'].includes(load.tripStatus))
    if (changed && (planLoads.length || committedLoads.length)) {
      setPendingLunchChange({ nextWorkday, affectedLoads, planCount: planLoads.length, committedCount: committedLoads.length })
      return
    }
    commitLunchChange(nextWorkday)
  }


  // Today’s Plan is execution truth, not a pursuit board. Freight stays in
  // FreightLink through evaluation, approval, booking, and Rate Con review.
  const scheduleLoads = useMemo(() => loads.filter((load) => (
    load.assignedDriverId === driver?.id
    && !['completed', 'delivered', 'expired', 'cancelled'].includes(String(load.status || '').toLowerCase())
    && !['completed', 'delivered', 'expired', 'cancelled'].includes(String(load.tripStatus || '').toLowerCase())
  )).sort((a, b) => minuteFor(a, 'pickup') - minuteFor(b, 'pickup')), [loads, driver?.id])

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
  const planningLoadCount = currentDayLoads.filter((load) => load.status === 'available' && load.scheduleApprovalQueued).length
  const committedLoadCount = currentDayLoads.filter((load) => load.status !== 'available' && !['completed', 'delivered', 'expired'].includes(load.status)).length
  const executingLoadCount = currentDayLoads.filter((load) => Number.isFinite(load.departureGameMinute) || Number.isFinite(load.pickupArrivalGameMinute) || ['en-route-pickup','at-pickup','loaded','en-route-delivery','at-delivery'].includes(load.tripStatus)).length
  const commitmentLabel = executingLoadCount ? 'EXECUTION' : committedLoadCount ? 'COMMITTED' : planningLoadCount ? 'PLANNING' : 'OPEN'
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

    // B.5.4D.4.2.13A — schedule status comes from actual load acknowledgements.
  const bookedDriverLoads = currentDayLoads.filter((load) =>
    load.assignedDriverId === driver?.id &&
    !['completed', 'paid', 'cancelled', 'expired'].includes(String(load.status || '').toLowerCase())
  )

  const driverScheduleReady = bookedDriverLoads.length > 0
  const driverScheduleSent =
    driverScheduleReady &&
    bookedDriverLoads.every((load) => Number.isFinite(Number(load.driverAcknowledgedGameMinute)))

  const firstDayScheduleLocked = Boolean(
    firstDay
    && !firstDay.workdayLessonComplete
    && driver?.id === 'marcus'
    && (
      firstDay.step !== 'staging'
      || driver?.shiftEndPlanDayIndex === null
      || driver?.shiftEndPlanDayIndex === undefined
      || Number(driver.shiftEndPlanDayIndex) !== Number(currentDay)
      || !driver?.shiftEndLocationId
    )
  )

  const driverScheduleNeedsUpdate =
    driverScheduleReady &&
    !driverScheduleSent &&
    (
      bookedDriverLoads.some((load) => Number.isFinite(Number(load.driverAcknowledgedGameMinute))) ||
      Number.isFinite(Number(driver?.scheduleCommunicatedGameMinute))
    )

// B.5.4D.4.2.4 — Today's Plan Separation
  return (
    <div className="today-plan-screen">
      <header className="today-plan-header">
        <div>
          <span>FREIGHTLINK · OPERATIONS PLAN</span>
          <strong>TODAY'S PLAN</strong>
        </div>
        <em>DAY {Number(currentDay || 0) + 1}</em>
      </header>

      <section className="today-plan-driver-strip">
        <div className="today-plan-driver-main">
          <span>PLANNING FOR</span>
          {/* B.5.4D.4.2.11 — Driver-Scoped Today's Plan */}
          {drivers.length > 1 ? (
            <label className="today-plan-driver-select">
              <select
                value={driverId || ''}
                onChange={(event) => setDriverId(event.target.value || null)}
                aria-label="Select driver for Today's Plan"
              >
                {drivers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName || item.name || item.id}
                  </option>
                ))}
              </select>
              <span aria-hidden="true">▾</span>
            </label>
          ) : (
            <strong>{driver?.fullName || driver?.name || 'Select driver'}</strong>
          )}
          <small>
            {workday
              ? `${formatTime(workday.startMinutes)}–${formatTime(workday.endMinutes)}`
              : 'Awaiting carrier schedule'}
            {' · '}
            {Number.isFinite(Number(workday?.lunchWindowStartMinutes)) && Number.isFinite(Number(workday?.lunchWindowEndMinutes))
              ? `Lunch ${formatTime(workday.lunchWindowStartMinutes)}–${formatTime(workday.lunchWindowEndMinutes)}`
              : 'Lunch not planned'}
            {' · '}
            {driver?.shiftEndLocationName
              ? `End ${driver.shiftEndLocationName}`
              : 'Shift end not planned'}
          </small>
        </div>

        <button
          type="button"
          className="today-plan-open-driver"
          onClick={() => {
            onDriverContextChange?.(driver?.id)
            onOpenDriverOperations?.(driver?.id)
          }}
        >
          OPEN DRIVER
        </button>
        <button
          type="button"
          className={`today-plan-send-schedule ${driverScheduleSent ? 'sent' : driverScheduleNeedsUpdate ? 'update' : ''}`}
          disabled={!driverScheduleReady || driverScheduleSent || firstDayScheduleLocked}
          onClick={() => onSendDriverSchedule?.(driver?.id)}
        >
          {driverScheduleSent
            ? 'SCHEDULE SENT'
            : firstDayScheduleLocked
              ? 'FINISH DAY PLAN FIRST'
              : driverScheduleNeedsUpdate
                ? 'SEND UPDATED SCHEDULE'
                : 'SEND SCHEDULE'}
        </button>
      </section>

      <section className={`today-plan-summary ${planQuality?.tone || 'neutral'}`}>
        <div>
          <span>PLAN STATUS</span>
          <strong>{planQuality?.label || (currentDayLoads.length ? 'PLANNED' : 'OPEN')}</strong>
        </div>
        <div>
          <span>FREIGHT</span>
          <strong>{currentDayLoads.length} LOAD{currentDayLoads.length === 1 ? '' : 'S'}</strong>
        </div>
        <div>
          <span>COMMITMENT</span>
          <strong>{commitmentLabel || 'OPEN'}</strong>
        </div>
      </section>

      <main className="today-plan-scroll">
        {currentDayLoads.length ? (
          <div className="today-plan-load-list">
            {currentDayLoads.map((load) => {
              const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
              const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
              const booked = load.assignedDriverId === driver?.id
              const approval = String(load.carrierApprovalStatus || '').toUpperCase()
              // B.5.4D.4.2.10F — Planned vs Pending Approval State
              // scheduleApprovalQueued means "this load is in Today's Plan".
              // Only carrierApprovalStatus === PENDING means an approval request
              // was actually sent to the carrier.
              const approvalQueued = Boolean(load.scheduleApprovalQueued)
              const approvalPending = approval === 'PENDING'
              const statusLabel = booked
                ? (needsRateConfirmationBeforeDeparture(load) ? 'RATE CON REQUIRED' : 'BOOKED')
                : approval === 'APPROVED'
                  ? (isRateConfirmationConfirmed(load) ? 'READY TO BOOK' : 'REVIEW RATE CON')
                  : approvalPending
                    ? 'AWAITING APPROVAL'
                    : approvalQueued
                      ? 'READY FOR APPROVAL'
                      : 'PLANNED'

              return (
                <article className={`today-plan-load-card ${booked ? 'booked' : approval === 'APPROVED' ? 'approved' : approvalPending ? 'pending' : approvalQueued ? 'ready' : ''}`} key={load.id}>
                  <header>
                    <div>
                      <span>{load.loadNumber || load.id}</span>
                      <strong>{pickup?.name || load.pickupLocationId || 'Pickup'} → {delivery?.name || load.deliveryLocationId || 'Delivery'}</strong>
                    </div>
                    <em>{statusLabel}</em>
                  </header>

                  <div className="today-plan-load-times">
                    <div>
                      <span>PICKUP</span>
                      <strong>{formatTime(load.pickupWindowStartMinutes || 0)}</strong>
                    </div>
                    <i>→</i>
                    <div>
                      <span>DELIVERY</span>
                      <strong>{formatTime(load.deliveryWindowStartMinutes || 0)}</strong>
                    </div>
                  </div>

                  <div className="today-plan-load-meta">
                    <span>{load.listedMiles ? `${Math.round(load.listedMiles)} MI` : 'MILES TBD'}</span>
                    <span>{load.rate ? `$${Number(load.rate).toLocaleString()}` : 'RATE TBD'}</span>
                    <span>{String(load.tripStatus || load.status || 'planned').replace(/[-_]+/g, ' ').toUpperCase()}</span>
                  </div>

                  {(needsRateConfirmationBeforeDeparture(load) || (!booked && approval === 'APPROVED' && !isRateConfirmationConfirmed(load))) && <section className="ratecon-dispatch-hold" aria-label="Dispatch held for rate confirmation">
                    <strong>{booked ? 'DISPATCH HELD' : 'NOT BOOKED · REVIEW THE RATE CON'}</strong><p>{booked ? getRateConfirmationHoldReason(load) : 'Metroline approved this tentative offer. Compare and confirm the rate con before BOOK LOAD. Nothing is booked yet.'}</p>
                    {load.rateConfirmation && <button type="button" onClick={() => onReviewRateCon?.(load.id)}>REVIEW RATE CON</button>}
                  </section>}

                  {!booked && (
                    <footer>
                      <button type="button" className="secondary" onClick={() => onRemoveFromPlan?.(load.id)}>
                        REMOVE
                      </button>

                      {approval === 'APPROVED' ? (
                        <button type="button" className="primary" disabled={!isRateConfirmationConfirmed(load)} onClick={() => onBookRoute?.(load.id)}>
                          BOOK LOAD
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="primary"
                          disabled={approvalPending}
                          onClick={() => onRequestScheduleApproval?.(driver?.id)}
                        >
                          {approvalPending ? 'AWAITING APPROVAL' : 'REQUEST APPROVAL'}
                        </button>
                      )}
                    </footer>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <section className="today-plan-empty">
            <span>NO FREIGHT PLANNED</span>
            <strong>{driver?.fullName || driver?.name || 'This driver'} has an open day.</strong>
            <p>Return to FreightLink to evaluate freight against the carrier shift, HOS, and lunch window.</p>
          </section>
        )}
      </main>

      </div>
  )
}

export default FleetSchedulerScreen
