import { resolveDriverWorkdayOwnership } from './driverWorkdayOwnership.js'

export function getOwnedShiftWindow(driver, gameTime, loads = []) {
  if (!driver || !gameTime) return null
  const currentDay = Number(gameTime.gameDayIndex || 0)
  const nowMinute = Number(gameTime.totalMinutesOfDay || 0)
  const nowAbsolute = currentDay * 1440 + nowMinute
  const ownership = resolveDriverWorkdayOwnership({ driver, loads, gameTime })
  const ownerDay = ownership.ownerDayIndex
  const workday = ownership.workday
  if (!Number.isFinite(ownerDay) || !workday || workday.isDayOff) return null
  const startAbsolute = ownership.scheduledStartAbsolute
  const endAbsolute = ownership.scheduledEndAbsolute
  if (!Number.isFinite(startAbsolute) || !Number.isFinite(endAbsolute) || nowAbsolute < startAbsolute) return null
  if (nowAbsolute > endAbsolute + 360 && !ownership.carryoverRetainsOwnership && !ownership.shiftEndRetainsOwnership) return null
  return { ownerDay, workday, startAbsolute, endAbsolute, nowAbsolute, ownership }
}

export function getShiftEndAlert({ driver, loads = [], gameTime, warningMinutes = 15 }) {
  const shift = getOwnedShiftWindow(driver, gameTime, loads)
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
