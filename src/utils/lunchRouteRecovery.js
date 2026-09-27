import { canAcquireDriverMovement } from './driverMovementOwner.js'
import { resolveDriverWorkdayOwnership } from './driverWorkdayOwnership.js'

function samePosition(a, b) {
  return Number(a?.longitude) === Number(b?.longitude) && Number(a?.latitude) === Number(b?.latitude)
}

export function getLunchRouteRecoveryIntent({ driver, loads = [], gameTime, runtimePosition, locations = [] }) {
  if (!driver || !runtimePosition || !canAcquireDriverMovement({ driver, loads, gameTime }, 'lunch')) return null
  const ownership = resolveDriverWorkdayOwnership({ driver, loads, gameTime })
  const dayKey = String(ownership.ownerDayIndex)
  const event = ownership.workday?.lunchEvent
  if (!event) return null
  if (driver.lunchRouteStatus === 'calculating') {
    const targetId = driver.lunchTargetLocationId || event.targetLocationId
    const destination = locations.find((location) => location.id === targetId)
    if (event.status !== 'routing' || !targetId || !destination || event.targetLocationId !== targetId) return null
    return { type: 'outbound', driverId: driver.id, ownerDayIndex: ownership.ownerDayIndex, dayKey, eventChoiceId: event.selectedChoiceId, targetId, interruptedLoadId: event.interruptedLoadId || null, interruptedPhase: event.interruptedPhase || null, origin: runtimePosition, destination }
  }
  if (driver.lunchRouteStatus === 'resume-calculating') {
    const interruptedLoadId = event.interruptedLoadId || driver.lunchInterruptedLoadId
    const interruptedPhase = event.interruptedPhase || driver.lunchInterruptedPhase
    const load = loads.find((item) => item.id === interruptedLoadId && item.assignedDriverId === driver.id)
    const destinationId = interruptedPhase === 'delivery' ? load?.deliveryLocationId : interruptedPhase === 'pickup' ? load?.pickupLocationId : null
    const destination = locations.find((location) => location.id === destinationId)
    if (!load || !destination || !['pickup', 'delivery'].includes(interruptedPhase)) return null
    return { type: 'resume', driverId: driver.id, ownerDayIndex: ownership.ownerDayIndex, dayKey, eventChoiceId: event.selectedChoiceId, targetId: driver.lunchTargetLocationId || event.targetLocationId, interruptedLoadId, interruptedPhase, origin: runtimePosition, destination }
  }
  return null
}

export function lunchRecoveryIntentStillMatches(intent, context) {
  const current = getLunchRouteRecoveryIntent(context)
  return Boolean(current && current.type === intent.type && current.driverId === intent.driverId && current.ownerDayIndex === intent.ownerDayIndex && current.eventChoiceId === intent.eventChoiceId && current.targetId === intent.targetId && current.interruptedLoadId === intent.interruptedLoadId && current.interruptedPhase === intent.interruptedPhase && samePosition(current.origin, intent.origin))
}

function clearLunchRoute(driver) {
  return { ...driver, lunchRouteStatus: null, lunchRouteGeometry: null, lunchRouteStartGameMinute: null, lunchRouteDurationMinutes: null, lunchParkedAtGameMinute: null, lunchReleaseGameMinute: null, lunchTargetLocationId: null, lunchInterruptedLoadId: null, lunchInterruptedPhase: null, lunchResumeRouteGeometry: null, lunchResumeRouteDurationMinutes: null, lunchResumeLoadId: null, lunchResumePhase: null }
}

export function rollbackInvalidLunchRecovery(driver, intent, now) {
  if (!driver || !intent) return { driver, loadPatch: null }
  const workdayByDay = { ...(driver.workdayByDay || {}) }
  const workday = workdayByDay[intent.dayKey]
  const event = workday?.lunchEvent
  if (intent.type === 'outbound') {
    if (workday) workdayByDay[intent.dayKey] = { ...workday, lunchEvent: null }
    return { driver: { ...clearLunchRoute(driver), workdayByDay }, loadPatch: null }
  }
  if (workday && event) workdayByDay[intent.dayKey] = { ...workday, lunchEvent: { ...event, status: 'completed', completedGameMinute: now, recoveryFailed: true } }
  return {
    driver: { ...clearLunchRoute(driver), workdayByDay },
    loadPatch: intent.interruptedPhase === 'delivery'
      ? { id: intent.interruptedLoadId, tripStatus: 'onboard-hold', status: 'onboard', deliveryDepartureGameMinute: null, waitingReason: 'lunch-route-recovery' }
      : { id: intent.interruptedLoadId, tripStatus: 'assigned', status: 'assigned', departureGameMinute: null, waitingReason: 'lunch-route-recovery' },
  }
}

export function installRecoveredOutboundRoute(driver, intent, geometry, startGameMinute, durationMinutes) {
  if (!driver || driver.id !== intent?.driverId || driver.lunchRouteStatus !== 'calculating' || !Array.isArray(geometry) || geometry.length < 2) return driver
  return { ...driver, lunchRouteStatus: 'traveling', lunchRouteGeometry: geometry, lunchRouteStartGameMinute: startGameMinute, lunchRouteDurationMinutes: Math.max(1, Number(durationMinutes || 1)) }
}

export function installRecoveredResumeAccess(driver, intent, geometry, startGameMinute, durationMinutes, resumeGeometry, resumeDurationMinutes) {
  if (!driver || driver.id !== intent?.driverId || driver.lunchRouteStatus !== 'resume-calculating' || !Array.isArray(geometry) || geometry.length < 2) return driver
  return { ...driver, lunchRouteStatus: 'resume-access', lunchRouteGeometry: geometry, lunchRouteStartGameMinute: startGameMinute, lunchRouteDurationMinutes: Math.max(1, Number(durationMinutes || 1)), lunchResumeRouteGeometry: resumeGeometry, lunchResumeRouteDurationMinutes: Math.max(1, Number(resumeDurationMinutes || 1)), lunchResumeLoadId: intent.interruptedLoadId, lunchResumePhase: intent.interruptedPhase }
}
