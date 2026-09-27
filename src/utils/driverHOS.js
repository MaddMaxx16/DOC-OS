import { isDriverOnLunch } from './lunchDecisionEvents.js'
import { resolveDriverWorkdayOwnership } from './driverWorkdayOwnership.js'

export const HOS_DRIVING_LIMIT_MINUTES = 11 * 60
export const HOS_DUTY_LIMIT_MINUTES = 14 * 60
export const HOS_CYCLE_LIMIT_MINUTES = 70 * 60
export const HOS_RESET_MINUTES = 10 * 60

function finite(value, fallback = null) {
  // Null HOS timestamps mean "not set". Number(null) is 0 in JS, which
  // previously turned empty timestamps into game minute zero and could trigger
  // a phantom 10-hour reset on every tick after minute 600.
  if (value === null || value === undefined || value === '') return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function normalizeDriverHours(hours = {}, nowAbsoluteMinute = null) {
  return {
    drivingRemainingMinutes: Math.max(0, finite(hours.drivingRemainingMinutes, HOS_DRIVING_LIMIT_MINUTES)),
    dutyRemainingMinutes: Math.max(0, finite(hours.dutyRemainingMinutes, HOS_DUTY_LIMIT_MINUTES)),
    cycleRemainingMinutes: Math.max(0, finite(hours.cycleRemainingMinutes, HOS_CYCLE_LIMIT_MINUTES)),
    status: ['off-duty', 'on-duty', 'driving'].includes(hours.status) ? hours.status : 'off-duty',
    dutySessionStartGameMinute: finite(hours.dutySessionStartGameMinute),
    dutySessionDayIndex: finite(hours.dutySessionDayIndex),
    lastProcessedGameMinute: finite(hours.lastProcessedGameMinute, nowAbsoluteMinute),
    offDutySinceGameMinute: finite(hours.offDutySinceGameMinute),
    restAccumulatedMinutes: Math.max(0, finite(hours.restAccumulatedMinutes, 0)),
    nextResetGameMinute: finite(hours.nextResetGameMinute),
    lastResetGameMinute: finite(hours.lastResetGameMinute),
  }
}

export function getDriverScheduledWindow(driver, gameTime) {
  if (!driver || !gameTime) return null
  const ownership = resolveDriverWorkdayOwnership({ driver, loads: [], gameTime })
  if (!ownership.workday || !Number.isFinite(ownership.scheduledStartAbsolute) || !Number.isFinite(ownership.scheduledEndAbsolute)) return null
  return {
    ownerDayIndex: ownership.ownerDayIndex,
    startAbsolute: ownership.scheduledStartAbsolute,
    endAbsolute: ownership.scheduledEndAbsolute,
    workday: ownership.workday,
  }
}

function driverHasActiveWork(driver, loads = []) {
  const live = loads.some((load) => load.assignedDriverId === driver.id && !['queued', 'completed', 'delivered'].includes(load.tripStatus))
  const staging = ['calculating', 'traveling'].includes(driver.idleRouteStatus)
  const lunchMovement = ['calculating', 'traveling', 'arrived', 'resume-calculating', 'resume-access'].includes(driver.lunchRouteStatus)
  return live || staging || lunchMovement
}

function overlapMinutes(startA, endA, startB, endB) {
  const start = Math.max(startA, startB)
  const end = Math.min(endA, endB)
  return Math.max(0, end - start)
}

function getDriverDrivingMinutes(driver, loads = [], fromMinute, toMinute) {
  if (!driver || !(toMinute > fromMinute)) return 0
  const intervals = []

  loads.forEach((load) => {
    if (load.assignedDriverId !== driver.id) return
    const pickupStart = finite(load.departureGameMinute)
    const pickupDuration = finite(load.plannedDeadheadDriveTimeMinutes)
    if (Number.isFinite(pickupStart) && Number.isFinite(pickupDuration) && pickupDuration > 0) {
      intervals.push([pickupStart, pickupStart + pickupDuration])
    }
    const deliveryStart = finite(load.deliveryDepartureGameMinute)
    const deliveryDuration = finite(load.plannedLoadedDriveTimeMinutes)
    if (Number.isFinite(deliveryStart) && Number.isFinite(deliveryDuration) && deliveryDuration > 0) {
      intervals.push([deliveryStart, deliveryStart + deliveryDuration])
    }
  })

  const idleStart = finite(driver.idleRouteStartGameMinute)
  const idleDuration = finite(driver.idleRouteDurationMinutes)
  if (Number.isFinite(idleStart) && Number.isFinite(idleDuration) && idleDuration > 0) {
    intervals.push([idleStart, idleStart + idleDuration])
  }

  // Merge overlaps so a stale/overlapping record can never double-charge HOS.
  intervals.sort((a, b) => a[0] - b[0])
  const merged = []
  intervals.forEach(([start, end]) => {
    const last = merged[merged.length - 1]
    if (!last || start > last[1]) merged.push([start, end])
    else last[1] = Math.max(last[1], end)
  })

  return merged.reduce((total, [start, end]) => total + overlapMinutes(fromMinute, toMinute, start, end), 0)
}

export function advanceDriverHours(driver, loads, gameTime) {
  if (!driver || !gameTime) return driver
  const now = Number(gameTime.gameDayIndex || 0) * 1440 + Number(gameTime.totalMinutesOfDay || 0)
  const hours = normalizeDriverHours(driver.hours, now)
  const window = getDriverScheduledWindow(driver, gameTime)
  const activeWork = driverHasActiveWork(driver, loads)
  // B.5.3.2.1: a selected lunch is a short off-duty pause inside the existing
  // duty session. It freezes DRIVE/DUTY/CYCLE consumption but does not count
  // toward the 10-hour HOS reset and does not create a new duty session.
  const onLunch = isDriverOnLunch(driver, gameTime)

  let sessionStart = hours.dutySessionStartGameMinute
  let sessionDayIndex = hours.dutySessionDayIndex
  let drivingRemaining = hours.drivingRemainingMinutes
  let dutyRemaining = hours.dutyRemainingMinutes
  let cycleRemaining = hours.cycleRemainingMinutes
  let lastProcessed = hours.lastProcessedGameMinute
  let offDutySince = hours.offDutySinceGameMinute
  let restAccumulated = hours.restAccumulatedMinutes
  let nextReset = hours.nextResetGameMinute
  let lastReset = hours.lastResetGameMinute

  if (!Number.isFinite(lastProcessed)) lastProcessed = now

  // B.5.2: a continuous 10-hour off-duty period restores the 11/14 clocks.
  // The world clock remains authoritative; midnight and End Operations never
  // grant hours by themselves.
  if (Number.isFinite(offDutySince)) {
    restAccumulated = Math.max(0, now - offDutySince)
    nextReset = offDutySince + HOS_RESET_MINUTES
    if (restAccumulated >= HOS_RESET_MINUTES) {
      drivingRemaining = HOS_DRIVING_LIMIT_MINUTES
      dutyRemaining = HOS_DUTY_LIMIT_MINUTES
      sessionStart = null
      sessionDayIndex = null
      lastReset = nextReset
      offDutySince = null
      restAccumulated = 0
      nextReset = null
    }
  }

  // The dispatcher-authored scheduled clock-in starts a new duty session only
  // when no prior unreset session remains. A short overnight break therefore
  // cannot manufacture a fresh 14-hour window.
  if (window && now >= window.startAbsolute && !Number.isFinite(sessionStart) && (now < window.endAbsolute || activeWork)) {
    sessionStart = window.startAbsolute
    sessionDayIndex = window.ownerDayIndex
    dutyRemaining = Math.max(0, HOS_DUTY_LIMIT_MINUTES - Math.max(0, now - window.startAbsolute))
    drivingRemaining = HOS_DRIVING_LIMIT_MINUTES
    offDutySince = null
    restAccumulated = 0
    nextReset = null
    lastProcessed = now
  }

  const delta = Math.max(0, now - lastProcessed)
  const scheduledSessionStarted = Number.isFinite(sessionStart) && now >= sessionStart
  const scheduledSessionStillOpen = window && sessionDayIndex === window.ownerDayIndex && now < window.endAbsolute
  const shouldRemainOnDuty = scheduledSessionStarted && (scheduledSessionStillOpen || activeWork)
  // B.5.2.3: the same live movement states that animate the truck own HOS
  // driving consumption. Previous revisions attempted to reconstruct driving
  // from departure/duration intervals; that could disagree with the live route
  // lifecycle and leave DRIVE frozen while the truck was visibly moving.
  const lunchMovementOwnsDriver = ['calculating', 'traveling', 'arrived', 'resume-calculating', 'resume-access'].includes(driver.lunchRouteStatus)
  const freightDrivingNow = !lunchMovementOwnsDriver && loads.some((load) =>
    load.assignedDriverId === driver.id &&
    ['en-route-pickup', 'en-route-delivery'].includes(load.tripStatus)
  )
  const stagingDrivingNow = driver.idleRouteStatus === 'traveling'
  const lunchDrivingNow = ['traveling', 'resume-access'].includes(driver.lunchRouteStatus)
  const driving = shouldRemainOnDuty && !onLunch && (lunchDrivingNow || freightDrivingNow || stagingDrivingNow)

  if (delta > 0 && shouldRemainOnDuty && !onLunch) {
    dutyRemaining = Math.max(0, dutyRemaining - delta)
    cycleRemaining = Math.max(0, cycleRemaining - delta)
    if (driving) drivingRemaining = Math.max(0, drivingRemaining - delta)
  }

  if (shouldRemainOnDuty) {
    // Lunch is intentionally NOT reset-eligible rest. Keep the existing duty
    // session alive and clear any reset accumulator while the short break runs.
    offDutySince = null
    restAccumulated = 0
    nextReset = null
  } else if (scheduledSessionStarted && !Number.isFinite(offDutySince)) {
    // Rest begins only after the scheduled/active duty session has actually
    // ended. Shift End travel remains driving/on-duty until the truck parks.
    offDutySince = now
    restAccumulated = 0
    nextReset = now + HOS_RESET_MINUTES
  } else if (Number.isFinite(offDutySince)) {
    restAccumulated = Math.max(0, now - offDutySince)
    nextReset = offDutySince + HOS_RESET_MINUTES
  }

  const status = onLunch && shouldRemainOnDuty ? 'off-duty' : (shouldRemainOnDuty ? (driving ? 'driving' : 'on-duty') : 'off-duty')
  const nextHours = {
    ...hours,
    drivingRemainingMinutes: drivingRemaining,
    dutyRemainingMinutes: dutyRemaining,
    cycleRemainingMinutes: cycleRemaining,
    status,
    dutySessionStartGameMinute: sessionStart,
    dutySessionDayIndex: sessionDayIndex,
    lastProcessedGameMinute: now,
    offDutySinceGameMinute: offDutySince,
    restAccumulatedMinutes: restAccumulated,
    nextResetGameMinute: nextReset,
    lastResetGameMinute: lastReset,
  }

  const previous = driver.hours || {}
  const unchanged = Object.keys(nextHours).every((key) => previous[key] === nextHours[key])
  return unchanged ? driver : { ...driver, hours: nextHours }
}

export function formatHosClock(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function getDriverHosSummary(driver) {
  const hours = normalizeDriverHours(driver?.hours)
  const rest = Math.min(HOS_RESET_MINUTES, hours.restAccumulatedMinutes)
  return {
    status: hours.status,
    statusLabel: hours.status === 'driving' ? 'DRIVING' : hours.status === 'on-duty' ? 'ON DUTY' : 'OFF DUTY',
    driving: formatHosClock(hours.drivingRemainingMinutes),
    duty: formatHosClock(hours.dutyRemainingMinutes),
    drivingRemainingMinutes: hours.drivingRemainingMinutes,
    dutyRemainingMinutes: hours.dutyRemainingMinutes,
    rest: formatHosClock(rest),
    restRemaining: formatHosClock(Math.max(0, HOS_RESET_MINUTES - rest)),
    resting: hours.status === 'off-duty' && Number.isFinite(hours.offDutySinceGameMinute),
    resetMinutes: HOS_RESET_MINUTES,
  }
}
