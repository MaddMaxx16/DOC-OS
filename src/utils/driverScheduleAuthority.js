// P2.1 — Preset Schedule Authority
// One source of truth for whether a driver's preset carrier schedule permits
// NEW work to begin right now. This does not destroy active/carryover work.

function getWorkday(driver, dayIndex) {
  return driver?.workdayByDay?.[String(dayIndex)] || driver?.workdayByDay?.[dayIndex] || null
}

export function getDriverScheduleAuthority(driver, gameTime) {
  const dayIndex = Number(gameTime?.gameDayIndex)
  const minuteOfDay = Number(gameTime?.totalMinutesOfDay)
  if (!driver || !Number.isFinite(dayIndex) || !Number.isFinite(minuteOfDay)) {
    return { state: 'UNSCHEDULED', canStartNewWork: false, isScheduledNow: false, reason: 'invalid-context' }
  }

  const today = getWorkday(driver, dayIndex)
  const prior = dayIndex > 0 ? getWorkday(driver, dayIndex - 1) : null

  // A cross-midnight shift belongs to the day it started.
  if (prior && !prior.isDayOff) {
    const priorStart = Number(prior.startMinutes)
    const priorEnd = Number(prior.endMinutes)
    if (Number.isFinite(priorStart) && Number.isFinite(priorEnd) && priorEnd <= priorStart && minuteOfDay < priorEnd) {
      return { state: 'ON_SHIFT', canStartNewWork: true, isScheduledNow: true, ownerDayIndex: dayIndex - 1, workday: prior, reason: 'prior-cross-midnight-shift' }
    }
  }

  if (!today) return { state: 'UNSCHEDULED', canStartNewWork: false, isScheduledNow: false, ownerDayIndex: dayIndex, workday: null, reason: 'no-workday' }
  if (today.isDayOff) return { state: 'DAY_OFF', canStartNewWork: false, isScheduledNow: false, ownerDayIndex: dayIndex, workday: today, reason: 'day-off' }

  const start = Number(today.startMinutes)
  const end = Number(today.endMinutes)
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { state: 'UNSCHEDULED', canStartNewWork: false, isScheduledNow: false, ownerDayIndex: dayIndex, workday: today, reason: 'invalid-workday' }
  }

  if (end <= start) {
    if (minuteOfDay < start) return { state: 'PRE_SHIFT', canStartNewWork: false, isScheduledNow: false, ownerDayIndex: dayIndex, workday: today, reason: 'before-cross-midnight-shift' }
    return { state: 'ON_SHIFT', canStartNewWork: true, isScheduledNow: true, ownerDayIndex: dayIndex, workday: today, reason: 'inside-cross-midnight-shift' }
  }

  if (minuteOfDay < start) return { state: 'PRE_SHIFT', canStartNewWork: false, isScheduledNow: false, ownerDayIndex: dayIndex, workday: today, reason: 'before-shift' }
  if (minuteOfDay >= end) return { state: 'POST_SHIFT', canStartNewWork: false, isScheduledNow: false, ownerDayIndex: dayIndex, workday: today, reason: 'after-shift' }
  return { state: 'ON_SHIFT', canStartNewWork: true, isScheduledNow: true, ownerDayIndex: dayIndex, workday: today, reason: 'inside-shift' }
}
