import { getDriverHosSummary } from './driverHOS.js'

export const DRIVER_TIME_FIT = Object.freeze({
  GOOD: 'good',
  TIGHT: 'tight',
  POOR: 'poor',
})

const DEFAULT_TIGHT_BUFFER_MINUTES = 90

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

export function formatDriverTime(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours <= 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${String(mins).padStart(2, '0')}m`
}

export function getDriverTimeView(driver) {
  const hos = getDriverHosSummary(driver)
  const workdayRemainingMinutes = finite(hos.dutyRemainingMinutes)
  const drivingAvailableMinutes = finite(hos.drivingRemainingMinutes)

  return {
    status: hos.status,
    statusLabel: hos.statusLabel,
    workdayRemainingMinutes,
    drivingAvailableMinutes,
    workdayRemainingLabel: formatDriverTime(workdayRemainingMinutes),
    drivingAvailableLabel: formatDriverTime(drivingAvailableMinutes),
    resting: Boolean(hos.resting),
    restRemaining: hos.restRemaining,
  }
}

export function interpretDriverTimeFit({
  driveRequiredMinutes,
  dutyRequiredMinutes,
  driveAvailableMinutes,
  dutyAvailableMinutes,
  tightBufferMinutes = DEFAULT_TIGHT_BUFFER_MINUTES,
} = {}) {
  const driveRequired = finite(driveRequiredMinutes)
  const dutyRequired = finite(dutyRequiredMinutes)
  const driveAvailable = finite(driveAvailableMinutes)
  const dutyAvailable = finite(dutyAvailableMinutes)
  const buffer = finite(tightBufferMinutes, DEFAULT_TIGHT_BUFFER_MINUTES)

  const driveMarginMinutes = driveAvailable - driveRequired
  const dutyMarginMinutes = dutyAvailable - dutyRequired
  const limitingMarginMinutes = Math.min(driveMarginMinutes, dutyMarginMinutes)
  const driveOk = driveMarginMinutes >= 0
  const dutyOk = dutyMarginMinutes >= 0

  if (!driveOk || !dutyOk) {
    const reasons = []
    if (!driveOk) reasons.push(`Needs ${formatDriverTime(Math.abs(driveMarginMinutes))} more driving time`)
    if (!dutyOk) reasons.push(`Needs ${formatDriverTime(Math.abs(dutyMarginMinutes))} more workday time`)
    return {
      fit: DRIVER_TIME_FIT.POOR,
      label: 'POOR',
      tone: 'risk',
      summary: 'Current driver time does not reasonably support this plan.',
      reasons,
      driveOk,
      dutyOk,
      driveMarginMinutes,
      dutyMarginMinutes,
      limitingMarginMinutes,
    }
  }

  if (limitingMarginMinutes <= buffer) {
    const limitingResource = driveMarginMinutes <= dutyMarginMinutes ? 'driving time' : 'workday time'
    return {
      fit: DRIVER_TIME_FIT.TIGHT,
      label: 'TIGHT',
      tone: 'warn',
      summary: `Plan fits, but leaves only ${formatDriverTime(limitingMarginMinutes)} of ${limitingResource}.`,
      reasons: ['Staging, rest, delays, or careful timing may become important.'],
      driveOk,
      dutyOk,
      driveMarginMinutes,
      dutyMarginMinutes,
      limitingMarginMinutes,
    }
  }

  return {
    fit: DRIVER_TIME_FIT.GOOD,
    label: 'GOOD',
    tone: 'good',
    summary: 'Current driver time reasonably supports this plan.',
    reasons: [],
    driveOk,
    dutyOk,
    driveMarginMinutes,
    dutyMarginMinutes,
    limitingMarginMinutes,
  }
}

export function interpretDriverTimeForPlan(driver, plan = {}) {
  const view = getDriverTimeView(driver)
  return {
    ...view,
    ...interpretDriverTimeFit({
      driveRequiredMinutes: plan.driveRequiredMinutes,
      dutyRequiredMinutes: plan.dutyRequiredMinutes,
      driveAvailableMinutes: view.drivingAvailableMinutes,
      dutyAvailableMinutes: view.workdayRemainingMinutes,
      tightBufferMinutes: plan.tightBufferMinutes,
    }),
  }
}
