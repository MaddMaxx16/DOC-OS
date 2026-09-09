import mapLocations from '../data/mapLocations.js'

const TERMINAL_STATUSES = new Set(['completed', 'delivered'])
const PICKUP_SERVICE_MINUTES = 10
const DELIVERY_SERVICE_MINUTES = 8

export function getDriverAssignedLoads(loads = [], driverId) {
  if (!driverId) return []
  return loads
    .filter((load) => load.assignedDriverId === driverId && !TERMINAL_STATUSES.has(load.tripStatus))
    .sort((a, b) => {
      const aQueue = Number.isFinite(a.queuePosition) ? a.queuePosition : 0
      const bQueue = Number.isFinite(b.queuePosition) ? b.queuePosition : 0
      if (aQueue !== bQueue) return aQueue - bQueue
      const aPickup = (a.pickupDayIndex || 0) * 1440 + (a.pickupWindowStartMinutes || 0)
      const bPickup = (b.pickupDayIndex || 0) * 1440 + (b.pickupWindowStartMinutes || 0)
      return aPickup - bPickup
    })
}

export function getDriverActiveLoad(loads = [], driverId) {
  return getDriverAssignedLoads(loads, driverId).find((load) => load.tripStatus !== 'queued') || null
}

export function getDriverQueue(loads = [], driverId) {
  return getDriverAssignedLoads(loads, driverId).filter((load) => load.tripStatus === 'queued')
}

export function getNextQueuePosition(loads = [], driverId) {
  const positions = getDriverAssignedLoads(loads, driverId).map((load) => load.queuePosition).filter(Number.isFinite)
  return positions.length ? Math.max(...positions) + 1 : 1
}

function duration(load, key, fallback = 0) {
  const value = Number(load?.[key])
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function pickupServiceMinutes(load) {
  return PICKUP_SERVICE_MINUTES + Math.max(0, Number(load?.facilityOps?.pickup?.loadingDelayMinutes || 0))
}

function deliveryServiceMinutes(load) {
  return DELIVERY_SERVICE_MINUTES + Math.max(0, Number(load?.facilityOps?.delivery?.unloadingDelayMinutes || 0))
}

function projectCommitment(cursor, load, isFirst) {
  const pickupStart = (load.pickupDayIndex || 0) * 1440 + (load.pickupWindowStartMinutes || 0)
  const deliveryStart = (load.deliveryDayIndex || 0) * 1440 + (load.deliveryWindowStartMinutes || 0)
  const deadhead = duration(load, 'plannedDeadheadDriveTimeMinutes', Number(load.assignmentProjection?.deadheadMinutes || 0))
  const loaded = duration(load, 'plannedLoadedDriveTimeMinutes', Number(load.assignmentProjection?.loadedMinutes || 0))
  const pickupService = pickupServiceMinutes(load)
  const deliveryService = deliveryServiceMinutes(load)
  const status = load.tripStatus

  if (isFirst && status === 'en-route-pickup' && Number.isFinite(load.departureGameMinute)) {
    const pickupArrival = Math.max(load.departureGameMinute + deadhead, pickupStart)
    return Math.max(pickupArrival + pickupService + loaded, deliveryStart) + deliveryService
  }

  if (isFirst && ['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'].includes(status)) {
    return Math.max(cursor + pickupService + loaded, deliveryStart) + deliveryService
  }

  if (isFirst && status === 'loaded') {
    return Math.max(cursor + loaded, deliveryStart) + deliveryService
  }

  if (isFirst && status === 'en-route-delivery' && Number.isFinite(load.deliveryDepartureGameMinute)) {
    return Math.max(load.deliveryDepartureGameMinute + loaded, deliveryStart) + deliveryService
  }

  if (isFirst && ['at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod'].includes(status)) {
    return Math.max(cursor, deliveryStart) + deliveryService
  }

  const pickupArrival = Math.max(cursor + deadhead, pickupStart)
  return Math.max(pickupArrival + pickupService + loaded, deliveryStart) + deliveryService
}

export function getProjectedDriverOrigin({ driver, loads = [], runtimePositions = {}, gameTime }) {
  if (!driver?.id) return { location: null, availableAbsoluteMinute: 0, queueLength: 0, afterLoadId: null }
  const assigned = getDriverAssignedLoads(loads, driver.id)
  const currentAbsoluteMinute = (gameTime?.gameDayIndex || 0) * 1440 + (gameTime?.totalMinutesOfDay || 0)
  const runtime = runtimePositions[driver.id]
  const home = mapLocations.find((location) => location.id === (driver.lastKnownLocationId || driver.homeBaseLocationId))

  if (!assigned.length) return { location: runtime || home || null, availableAbsoluteMinute: currentAbsoluteMinute, queueLength: 0, afterLoadId: null }

  let cursor = currentAbsoluteMinute
  let location = runtime || home || null
  assigned.forEach((load, index) => {
    cursor = Math.max(cursor, projectCommitment(cursor, load, index === 0))
    location = mapLocations.find((item) => item.id === load.deliveryLocationId) || location
  })

  const lastLoad = assigned[assigned.length - 1]
  return { location, availableAbsoluteMinute: cursor, queueLength: assigned.length, afterLoadId: lastLoad?.id || null }
}

export function sanitizePromotedLoad(load) {
  return {
    ...load,
    tripStatus: 'assigned',
    status: 'assigned',
    queuePosition: 0,
    planningStatus: null,
    deliveryPlanningStatus: null,
    departureGameMinute: null,
    pickupArrivalGameMinute: null,
    pickupCheckInStartGameMinute: null,
    pickupCheckInGameMinute: null,
    pickupDockReadyGameMinute: null,
    pickupDriverBriefedGameMinute: null,
    pickupDriverBriefedLoadId: null,
    pickupRouteSentGameMinute: null,
    pickupDriverConfirmedRouteGameMinute: null,
    pickupDriverMessageRead: null,
    pickupCheckedInDriverMessageRead: null,
    loadingStartGameMinute: null,
    loadingChallengeState: null,
    loadingResult: null,
    loadedGameMinute: null,
    loadedDriverMessageRead: null,
    deliveryDepartureGameMinute: null,
    deliveryArrivalGameMinute: null,
    deliveryCheckInStartGameMinute: null,
    deliveryCheckInGameMinute: null,
    deliveryDockReadyGameMinute: null,
    deliveryUnloadStartGameMinute: null,
    deliveryRouteSentGameMinute: null,
    deliveryDriverConfirmedRouteGameMinute: null,
    deliveryDriverMessageRead: null,
    deliveryCheckedInDriverMessageRead: null,
    unloadChallengeState: null,
    unloadResult: null,
    plannedDeadheadRouteGeometry: null,
    plannedDeadheadMiles: null,
    plannedDeadheadDriveTimeMinutes: null,
    selectedDeadheadRouteId: null,
    plannedLoadedRouteGeometry: null,
    plannedLoadedMiles: null,
    plannedLoadedDriveTimeMinutes: null,
    selectedLoadedRouteId: null,
    shipment: null,
    pod: null,
  }
}

export function promoteNextQueuedLoad(loads = [], driverId) {
  const next = getDriverQueue(loads, driverId)[0]
  if (!next) return { loads, nextLoadId: null }
  return { nextLoadId: next.id, loads: loads.map((load) => load.id === next.id ? sanitizePromotedLoad(load) : load) }
}
