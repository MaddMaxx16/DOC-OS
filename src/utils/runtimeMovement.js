import { sampleRoutePoint } from './routeSampler.js'
import { resolveDriverMovementOwner } from './driverMovementOwner.js'

function samePosition(a, b) {
  return a?.longitude === b?.longitude && a?.latitude === b?.latitude
}

function mergeMovementUpdates(current, updates, equal) {
  let next = current
  for (const [id, value] of Object.entries(updates)) {
    if (equal(current[id], value)) continue
    if (next === current) next = { ...current }
    next[id] = value
  }
  return next
}

// P2.3.3: this is the freight effect's calculation AND conditional commit path.
// Compare against the render snapshot before calling setters, then preserve
// identity again inside functional updaters (including replayed React updates).
export function reconcileFreightMovement({ gameTime, loads, drivers, runtimePositions, runtimeProgressByDriver, locations }, { setLoads, setRuntimePositions, setRuntimeProgressByDriver }) {
  const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const progressUpdates = {}
  const positionUpdates = {}
  const loadUpdates = new Map()

  drivers.forEach((driver) => {
    const owner = resolveDriverMovementOwner({ driver, gameTime, loads })
    if (owner.type !== 'freight') return
    const load = owner.load
    const delivery = load.tripStatus === 'en-route-delivery'
    const route = delivery ? load.plannedLoadedRouteGeometry : load.plannedDeadheadRouteGeometry
    const departureKey = delivery ? 'deliveryDepartureGameMinute' : 'departureGameMinute'
    const departure = load[departureKey]
    const duration = delivery ? load.plannedLoadedDriveTimeMinutes : load.plannedDeadheadDriveTimeMinutes
    if (!Array.isArray(route) || route.length < 2 || !Number.isFinite(departure) || !Number.isFinite(duration) || duration <= 0) return

    const movementClock = reconcileRestoredRouteProgress({
      currentGameMinute: now,
      startGameMinute: departure,
      durationMinutes: duration,
      restoredProgress: runtimeProgressByDriver[driver.id],
    })
    if (!movementClock) return
    const progress = movementClock.progress
    if (runtimeProgressByDriver[driver.id] !== progress) progressUpdates[driver.id] = progress

    const destination = locations.find((location) => location.id === (delivery ? load.deliveryLocationId : load.pickupLocationId))
    const position = progress >= 1 && destination
      ? { longitude: destination.longitude, latitude: destination.latitude }
      : sampleRoutePoint(route, progress)
    if (position && !samePosition(runtimePositions[driver.id], position)) positionUpdates[driver.id] = position

    const patch = {}
    if (movementClock.rebased && departure !== movementClock.startGameMinute) patch[departureKey] = movementClock.startGameMinute
    if (progress >= 1) {
      const arrivalKey = delivery ? 'deliveryArrivalGameMinute' : 'pickupArrivalGameMinute'
      patch.tripStatus = delivery ? 'at-delivery' : 'at-pickup'
      patch[arrivalKey] = load[arrivalKey] ?? now
    }
    if (Object.keys(patch).length) loadUpdates.set(load.id, { load, patch })
  })

  if (Object.keys(progressUpdates).length) {
    setRuntimeProgressByDriver((current) => mergeMovementUpdates(current, progressUpdates, Object.is))
  }
  if (Object.keys(positionUpdates).length) {
    setRuntimePositions((current) => mergeMovementUpdates(current, positionUpdates, samePosition))
  }
  if (loadUpdates.size) {
    setLoads((current) => {
      let next = current
      current.forEach((item, index) => {
        const update = loadUpdates.get(item.id)
        if (!update || item.tripStatus !== update.load.tripStatus || item.assignedDriverId !== update.load.assignedDriverId) return
        if (Object.entries(update.patch).every(([key, value]) => Object.is(item[key], value))) return
        if (next === current) next = [...current]
        next[index] = { ...item, ...update.patch }
      })
      return next
    })
  }
}

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
