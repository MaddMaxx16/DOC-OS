import { getAuthoritativeDriverTravelLoad } from './driverItinerary.js'
import { hasLunchMovementAuthority } from './lunchDecisionEvents.js'

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

  if (driver.idleRouteStatus === 'traveling'
    && Array.isArray(driver.idleRouteGeometry)
    && driver.idleRouteGeometry.length >= 2
    && Number.isFinite(driver.idleRouteStartGameMinute)
    && Number.isFinite(driver.idleRouteDurationMinutes)
    && driver.idleRouteDurationMinutes > 0) {
    return { type: 'idle-route', route: driver.idleRouteGeometry, start: driver.idleRouteStartGameMinute, duration: driver.idleRouteDurationMinutes }
  }

  return { type: 'runtime-hold' }
}
