function workdayForOwnerDay(driver, ownerDay) {
  return driver?.workdayByDay?.[String(ownerDay)] || driver?.workdayByDay?.[ownerDay] || null
}

export function getOwnedShiftWindow(driver, gameTime) {
  if (!driver || !gameTime) return null
  const currentDay = Number(gameTime.gameDayIndex || 0)
  const nowMinute = Number(gameTime.totalMinutesOfDay || 0)
  const nowAbsolute = currentDay * 1440 + nowMinute

  for (const ownerDay of [currentDay, currentDay - 1]) {
    const workday = workdayForOwnerDay(driver, ownerDay)
    if (!workday || workday.isDayOff) continue
    const start = Number(workday.startMinutes)
    const end = Number(workday.endMinutes)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    const startAbsolute = ownerDay * 1440 + start
    const endAbsolute = ownerDay * 1440 + end + (end <= start ? 1440 : 0)
    if (nowAbsolute >= startAbsolute && nowAbsolute <= endAbsolute + 360) {
      return { ownerDay, workday, startAbsolute, endAbsolute, nowAbsolute }
    }
  }
  return null
}

export function getShiftEndAlert({ driver, gameTime, warningMinutes = 15 }) {
  const shift = getOwnedShiftWindow(driver, gameTime)
  if (!shift) return null

  // A saved end-of-day plan means the dispatcher has already answered this alert.
  if (driver.shiftEndLocationId && Number(driver.shiftEndPlanDayIndex) === shift.ownerDay) return null

  const minutesToEnd = shift.endAbsolute - shift.nowAbsolute
  if (minutesToEnd > warningMinutes) return null

  const overdue = minutesToEnd <= 0
  const driverName = driver.fullName || driver.name || 'Driver'
  return {
    id: `shift-end-${driver.id}-${shift.ownerDay}`,
    driverId: driver.id,
    ownerDay: shift.ownerDay,
    alertClass: 'action',
    tone: overdue ? 'danger' : 'attention',
    action: 'shift-end-decision',
    title: overdue ? `${driverName} · SHIFT END PLAN NEEDED` : `${driverName} · SHIFT END SOON`,
    detail: overdue
      ? 'Scheduled shift has ended. Choose where the driver should finish once current work allows.'
      : `${Math.max(1, Math.ceil(minutesToEnd))} min until scheduled shift end. Plan where the driver should finish.`,
    value: overdue ? 'PLAN NOW' : `${Math.max(1, Math.ceil(minutesToEnd))} MIN`,
    minutesToEnd,
    overdue,
  }
}
