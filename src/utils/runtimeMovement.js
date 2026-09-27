import { sampleRoutePoint } from './routeSampler.js'

export function getRouteMovementProgress({ currentGameMinute, startGameMinute, durationMinutes }) {
  if (!Number.isFinite(currentGameMinute) || !Number.isFinite(startGameMinute) || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return null
  return Math.max(0, Math.min(1, (currentGameMinute - startGameMinute) / durationMinutes))
}

export function getDriverRouteMovement({ geometry, currentGameMinute, startGameMinute, durationMinutes }) {
  if (!Array.isArray(geometry) || geometry.length < 2) return null
  const progress = getRouteMovementProgress({ currentGameMinute, startGameMinute, durationMinutes })
  if (progress === null) return null
  const position = sampleRoutePoint(geometry, progress)
  if (!position) return null
  return { progress, position, complete: progress >= 1 }
}

export function getLunchMovementFrame(drivers = [], currentGameMinute) {
  const positionUpdates = {}
  const arrivals = []

  drivers.forEach((driver) => {
    if (!['traveling', 'resume-access'].includes(driver.lunchRouteStatus)) return
    const movement = getDriverRouteMovement({
      geometry: driver.lunchRouteGeometry,
      currentGameMinute,
      startGameMinute: driver.lunchRouteStartGameMinute,
      durationMinutes: driver.lunchRouteDurationMinutes,
    })
    if (!movement) return
    positionUpdates[driver.id] = movement.position
    if (movement.complete && driver.lunchRouteStatus === 'traveling') arrivals.push(driver.id)
  })

  return { positionUpdates, arrivals }
}


export function reconcileRestoredRouteProgress({ currentGameMinute, startGameMinute, durationMinutes, restoredProgress }) {
  const calculatedProgress = getRouteMovementProgress({ currentGameMinute, startGameMinute, durationMinutes })
  if (calculatedProgress === null) return null
  if (!Number.isFinite(restoredProgress) || restoredProgress <= calculatedProgress) {
    return { progress: calculatedProgress, startGameMinute, rebased: false }
  }

  const safeProgress = Math.max(0, Math.min(1, restoredProgress))
  const rebasedStartGameMinute = currentGameMinute - (safeProgress * durationMinutes)
  return { progress: safeProgress, startGameMinute: rebasedStartGameMinute, rebased: true }
}

// A resumed save already contains the last authoritative physical position and
// progress. Preserve those values during hydration and align the route clock to
// them before the simulation is allowed to tick. This prevents the first Play
// frame from reconstructing an older position from a stale departure minute.
export function restoreSavedRouteContinuity({ load, savedPosition, savedProgress, currentGameMinute }) {
  if (!load || !Number.isFinite(savedProgress) || !savedPosition) return null
  const delivery = load.tripStatus === 'en-route-delivery'
  const pickup = load.tripStatus === 'en-route-pickup'
  if (!delivery && !pickup) return null

  const durationMinutes = delivery ? load.plannedLoadedDriveTimeMinutes : load.plannedDeadheadDriveTimeMinutes
  const startGameMinute = delivery ? load.deliveryDepartureGameMinute : load.departureGameMinute
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || !Number.isFinite(currentGameMinute)) return null

  const safeProgress = Math.max(0, Math.min(1, savedProgress))
  const alignedStartGameMinute = currentGameMinute - (safeProgress * durationMinutes)
  const rebased = !Number.isFinite(startGameMinute) || Math.abs(alignedStartGameMinute - startGameMinute) > 0.000001

  return {
    position: savedPosition,
    progress: safeProgress,
    startGameMinute: alignedStartGameMinute,
    rebased,
    delivery,
  }
}
