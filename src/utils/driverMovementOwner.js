import { getAuthoritativeDriverTravelLoad } from './driverItinerary.js'
import { hasLunchMovementAuthority } from './lunchDecisionEvents.js'
import { getDriverActiveLoad } from './driverQueue.js'

// B.5.3.3.10.8 — one movement owner per driver. Simulation and rendering must
// resolve the same authority before choosing geometry or a clock.
export function resolveDriverMovementOwner({ driver, gameTime, loads = [] }) {
  if (!driver) return { type: 'none' }

  if (hasLunchMovementAuthority(driver, gameTime)) {
    const moving = ['traveling', 'resume-access'].includes(driver.lunchRouteStatus)
      && Array.isArray(driver.lunchRouteGeometry)
      && driver.lunchRouteGeometry.length >= 2
      && Number.isFinite(driver.lunchRouteStartGameMinute)
      && Number.isFinite(driver.lunchRouteDurationMinutes)
      && driver.lunchRouteDurationMinutes > 0
    return moving
      ? { type: 'lunch-route', route: driver.lunchRouteGeometry, start: driver.lunchRouteStartGameMinute, duration: driver.lunchRouteDurationMinutes }
      : { type: 'lunch-hold' }
  }

  const freightLoad = getAuthoritativeDriverTravelLoad(loads, driver.id)
  if (freightLoad) return { type: 'freight', load: freightLoad }

  // Facility work/onboard freight still reserves the driver, without moving it.
  // Future assigned/queued work and saved Shift End plans do not reserve motion.
  const activeLoad = getDriverActiveLoad(loads, driver.id)
  if (activeLoad && !['queued', 'assigned', 'route-ready', 'delivered', 'completed'].includes(activeLoad.tripStatus || activeLoad.status)) {
    return { type: 'freight-hold', load: activeLoad }
  }

  if (driver.idleRouteStatus === 'traveling'
    && Array.isArray(driver.idleRouteGeometry)
    && driver.idleRouteGeometry.length >= 2
    && Number.isFinite(driver.idleRouteStartGameMinute)
    && Number.isFinite(driver.idleRouteDurationMinutes)
    && driver.idleRouteDurationMinutes > 0) {
    return { type: 'idle-route', route: driver.idleRouteGeometry, start: driver.idleRouteStartGameMinute, duration: driver.idleRouteDurationMinutes }
  }

  if (driver.idleRouteStatus === 'calculating') return { type: 'idle-hold' }

  return { type: 'runtime-hold' }
}

// Acquisition is distinct from ticking: a held driver may start a new leg, but
// a second subsystem cannot replace an existing owner's route or clock.
export function canAcquireDriverMovement(context, subsystem, loadId = null) {
  const owner = resolveDriverMovementOwner(context)
  if (subsystem === 'freight') {
    return owner.type === 'runtime-hold'
      || (['freight', 'freight-hold'].includes(owner.type) && owner.load.id === loadId)
  }
  if (subsystem === 'idle') return ['runtime-hold', 'idle-route', 'idle-hold'].includes(owner.type)
  if (subsystem === 'lunch') return ['lunch-route', 'lunch-hold'].includes(owner.type)
  return false
}
