function workdayFor(driver, dayIndex) {
  return driver?.workdayByDay?.[String(dayIndex)] || driver?.workdayByDay?.[dayIndex] || null
}

function scheduledWindow(driver, ownerDayIndex) {
  const workday = workdayFor(driver, ownerDayIndex)
  if (!workday || workday.isDayOff) return null
  const start = Number(workday.startMinutes)
  const end = Number(workday.endMinutes)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const endDayOffset = Number.isFinite(Number(workday.endDayOffset))
    ? Number(workday.endDayOffset)
    : (end <= start ? 1 : 0)
  return {
    ownerDayIndex,
    workday,
    scheduledStartAbsolute: ownerDayIndex * 1440 + start,
    scheduledEndAbsolute: ownerDayIndex * 1440 + end + endDayOffset * 1440,
  }
}

function activeFreightForDriver(loads, driverId) {
  return loads.filter((load) => load.assignedDriverId === driverId && ![
    'queued', 'assigned', 'route-ready', 'completed', 'delivered', 'expired',
  ].includes(load.tripStatus || load.status))
}

function activeLunchOwnerDay(driver, calendarDayIndex) {
  const routeActive = ['calculating', 'traveling', 'arrived', 'on-lunch', 'resume-calculating', 'resume-access'].includes(driver?.lunchRouteStatus)
  for (const ownerDayIndex of [calendarDayIndex, calendarDayIndex - 1]) {
    const event = workdayFor(driver, ownerDayIndex)?.lunchEvent
    if (['routing', 'on-lunch', 'resuming'].includes(event?.status)) return ownerDayIndex
    if (routeActive && event && event.status !== 'completed') return ownerDayIndex
  }
  return null
}

export function resolveDriverWorkdayOwnership({ driver, loads = [], gameTime }) {
  const calendarDayIndex = Number(gameTime?.gameDayIndex)
  const minuteOfDay = Number(gameTime?.totalMinutesOfDay)
  if (!driver || !Number.isFinite(calendarDayIndex) || !Number.isFinite(minuteOfDay)) {
    return {
      ownerDayIndex: null, workday: null, scheduledStartAbsolute: null, scheduledEndAbsolute: null,
      source: 'invalid-context', scheduledTimeActive: false, carryoverRetainsOwnership: false,
      shiftEndRetainsOwnership: false, released: true, nextScheduleMayAcquire: false,
    }
  }

  const nowAbsolute = calendarDayIndex * 1440 + minuteOfDay
  const activeFreight = activeFreightForDriver(loads, driver.id)
  const lunchOwnerDay = activeLunchOwnerDay(driver, calendarDayIndex)
  const stagingOwnerDay = Number.isFinite(Number(driver.overnightAppliedDayIndex))
    && ['calculating', 'traveling'].includes(driver.idleRouteStatus)
    ? Number(driver.overnightAppliedDayIndex)
    : null
  const stagingArrived = Number.isFinite(Number(driver.overnightAppliedDayIndex)) && driver.idleRouteStatus === 'arrived'
  const shiftPlanOwnerDay = Number.isFinite(Number(driver.shiftEndPlanDayIndex)) && driver.shiftEndLocationId
    ? Number(driver.shiftEndPlanDayIndex)
    : null
  const dutyOwnerDay = Number.isFinite(Number(driver.hours?.dutySessionDayIndex))
    && Number.isFinite(Number(driver.hours?.dutySessionStartGameMinute))
    ? Number(driver.hours.dutySessionDayIndex)
    : null
  const hosActive = ['on-duty', 'driving'].includes(driver.hours?.status)

  let retainedOwnerDay = null
  let source = null
  if (lunchOwnerDay !== null) {
    retainedOwnerDay = lunchOwnerDay
    source = 'active-lunch'
  } else if (stagingOwnerDay !== null) {
    retainedOwnerDay = stagingOwnerDay
    source = 'active-shift-end-staging'
  } else if (activeFreight.length && dutyOwnerDay !== null) {
    retainedOwnerDay = dutyOwnerDay
    source = 'hos-duty-active-freight'
  } else if (activeFreight.length && shiftPlanOwnerDay !== null) {
    retainedOwnerDay = shiftPlanOwnerDay
    source = 'shift-end-plan-active-freight'
  } else if (!stagingArrived && shiftPlanOwnerDay !== null && dutyOwnerDay === shiftPlanOwnerDay) {
    retainedOwnerDay = shiftPlanOwnerDay
    source = 'pending-shift-end-plan'
  } else if (hosActive && dutyOwnerDay !== null) {
    retainedOwnerDay = dutyOwnerDay
    source = 'hos-duty-session'
  }

  const currentWindow = scheduledWindow(driver, calendarDayIndex)
  const priorWindow = calendarDayIndex > 0 ? scheduledWindow(driver, calendarDayIndex - 1) : null
  const activeScheduledWindow = priorWindow && nowAbsolute >= priorWindow.scheduledStartAbsolute && nowAbsolute < priorWindow.scheduledEndAbsolute
    ? priorWindow
    : currentWindow && nowAbsolute >= currentWindow.scheduledStartAbsolute && nowAbsolute < currentWindow.scheduledEndAbsolute
      ? currentWindow
      : null

  const selectedWindow = retainedOwnerDay !== null
    ? scheduledWindow(driver, retainedOwnerDay)
    : activeScheduledWindow || currentWindow
  const ownerDayIndex = retainedOwnerDay ?? selectedWindow?.ownerDayIndex ?? calendarDayIndex
  const workday = selectedWindow?.workday || workdayFor(driver, ownerDayIndex)
  const scheduledStartAbsolute = selectedWindow?.scheduledStartAbsolute ?? null
  const scheduledEndAbsolute = selectedWindow?.scheduledEndAbsolute ?? null
  const scheduledTimeActive = Number.isFinite(scheduledStartAbsolute) && Number.isFinite(scheduledEndAbsolute)
    && nowAbsolute >= scheduledStartAbsolute && nowAbsolute < scheduledEndAbsolute
  const carryoverRetainsOwnership = retainedOwnerDay !== null && (activeFreight.length > 0 || lunchOwnerDay !== null || hosActive)
  const shiftEndRetainsOwnership = retainedOwnerDay !== null && (stagingOwnerDay !== null || shiftPlanOwnerDay === retainedOwnerDay)
  const released = retainedOwnerDay === null && !scheduledTimeActive

  return {
    calendarDayIndex,
    nowAbsolute,
    ownerDayIndex,
    workday,
    scheduledStartAbsolute,
    scheduledEndAbsolute,
    source: source || (activeScheduledWindow ? 'active-schedule' : currentWindow ? 'calendar-schedule' : 'no-schedule'),
    scheduledTimeActive,
    carryoverRetainsOwnership,
    shiftEndRetainsOwnership,
    released,
    nextScheduleMayAcquire: retainedOwnerDay === null,
    activeFreight,
  }
}

export function getOwnedDriverWorkday(driver, loads, gameTime) {
  return resolveDriverWorkdayOwnership({ driver, loads, gameTime })
}

export function applyLunchWindowToOwnedWorkday(driver, loads, gameTime, lunchWindow, updatedGameMinute = null) {
  const ownership = resolveDriverWorkdayOwnership({ driver, loads, gameTime })
  if (!Number.isFinite(ownership.ownerDayIndex) || !ownership.workday) return driver

  const dayKey = String(ownership.ownerDayIndex)
  return {
    ...driver,
    workdayByDay: {
      ...(driver.workdayByDay || {}),
      [dayKey]: {
        ...ownership.workday,
        ...lunchWindow,
        ...(updatedGameMinute !== null && updatedGameMinute !== undefined && updatedGameMinute !== ''
          && Number.isFinite(Number(updatedGameMinute)) ? { lunchWindowUpdatedGameMinute: Number(updatedGameMinute) } : {}),
      },
    },
  }
}

export function hasValidLunchWindow(workday) {
  if (workday?.lunchWindowStartMinutes === null || workday?.lunchWindowStartMinutes === undefined
    || workday?.lunchWindowStartMinutes === '' || workday?.lunchWindowEndMinutes === null
    || workday?.lunchWindowEndMinutes === undefined || workday?.lunchWindowEndMinutes === '') return false
  const start = Number(workday?.lunchWindowStartMinutes)
  const end = Number(workday?.lunchWindowEndMinutes)
  return Number.isFinite(start) && Number.isFinite(end)
    && start >= 0 && start < 1440
    && end >= 0 && end < 1440
    && start !== end
}
