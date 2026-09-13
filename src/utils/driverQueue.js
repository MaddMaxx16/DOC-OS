import mapLocations from '../data/mapLocations.js'
import { buildDriverItinerary, getNextActionableDriverStop } from './driverItinerary.js'

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
      const aSchedule = Number.isFinite(a.scheduleOrderIndex) ? a.scheduleOrderIndex : Number.POSITIVE_INFINITY
      const bSchedule = Number.isFinite(b.scheduleOrderIndex) ? b.scheduleOrderIndex : Number.POSITIVE_INFINITY
      if (aSchedule !== bSchedule) return aSchedule - bSchedule
      const aPickup = (a.pickupDayIndex || 0) * 1440 + (a.pickupWindowStartMinutes || 0)
      const bPickup = (b.pickupDayIndex || 0) * 1440 + (b.pickupWindowStartMinutes || 0)
      return aPickup - bPickup
    })
}

export function getDriverActiveLoad(loads = [], driverId) {
  // AW1.7 compatibility bridge: there is only one operational authority now.
  // Older callers may still ask for an "active load", but that load must be
  // the owner of the next actionable itinerary stop whenever one exists.
  const nextStop = getNextActionableDriverStop(loads, driverId)
  if (nextStop) {
    const authoritative = loads.find((load) => load.id === nextStop.loadId && load.assignedDriverId === driverId)
    if (authoritative) return authoritative
  }
  return getDriverAssignedLoads(loads, driverId).find((load) => !['queued', 'onboard-hold'].includes(load.tripStatus)) || null
}

export function getDriverOnboardLoads(loads = [], driverId) {
  return getDriverAssignedLoads(loads, driverId).filter((load) => load.tripStatus === 'onboard-hold')
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
    const departure = Number.isFinite(load.plannedDeliveryDepartureGameMinute) ? Math.max(cursor, load.plannedDeliveryDepartureGameMinute) : cursor
    return Math.max(departure + loaded, deliveryStart) + deliveryService
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
  const itinerary = buildDriverItinerary(loads, driver.id).filter((stop) => stop.state !== 'completed')
  const currentAbsoluteMinute = (gameTime?.gameDayIndex || 0) * 1440 + (gameTime?.totalMinutesOfDay || 0)
  const runtime = runtimePositions[driver.id]
  const home = mapLocations.find((location) => location.id === (driver.lastKnownLocationId || driver.homeBaseLocationId))

  if (!assigned.length || !itinerary.length) {
    return { location: runtime || home || null, availableAbsoluteMinute: currentAbsoluteMinute, queueLength: assigned.length, afterLoadId: assigned.at(-1)?.id || null }
  }

  // AV2.11.2: availability follows the same stop-first itinerary the Schedule
  // and movement engine use. The legacy projection completed each load before
  // considering the next one, which produced nonsense availability during
  // pickup A -> pickup B -> delivery B -> delivery A operations.
  let cursor = currentAbsoluteMinute
  let location = runtime || home || null

  itinerary.forEach((stop, index) => {
    const load = stop.load
    const status = load?.tripStatus || load?.status
    const windowStart = Number(stop.dayIndex || 0) * 1440 + Number(stop.windowStartMinutes || 0)
    const service = stop.type === 'pickup' ? pickupServiceMinutes(load) : deliveryServiceMinutes(load)
    const plannedTravel = stop.type === 'pickup'
      ? duration(load, 'plannedDeadheadDriveTimeMinutes', Number(load.assignmentProjection?.deadheadMinutes || 0))
      : duration(load, 'plannedLoadedDriveTimeMinutes', Number(load.assignmentProjection?.loadedMinutes || 0))

    let travel = plannedTravel
    if (index === 0) {
      const activelyAtStop = stop.type === 'pickup'
        ? ['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup', 'pickup-issue'].includes(status)
        : ['at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery'].includes(status)
      if (activelyAtStop) travel = 0

      const departure = stop.type === 'pickup' ? Number(load?.departureGameMinute) : Number(load?.deliveryDepartureGameMinute)
      const activelyDriving = stop.type === 'pickup' ? status === 'en-route-pickup' : status === 'en-route-delivery'
      if (activelyDriving && Number.isFinite(departure)) {
        travel = Math.max(0, departure + plannedTravel - cursor)
      }
    }

    const arrival = Math.max(cursor + Math.max(0, travel), windowStart)
    cursor = arrival + service
    location = mapLocations.find((item) => item.id === stop.locationId) || location
  })

  const lastStop = itinerary[itinerary.length - 1]
  return { location, availableAbsoluteMinute: cursor, queueLength: assigned.length, afterLoadId: lastStop?.loadId || null }
}

export function sanitizePromotedLoad(load, currentGameMinute = null) {
  const wasBriefed = Number.isFinite(load?.pickupDriverBriefedGameMinute)
  const wasAcknowledged = Number.isFinite(load?.driverAcknowledgedGameMinute)
  const canAutoDepart = wasBriefed && wasAcknowledged && Number.isFinite(currentGameMinute)
  return {
    ...load,
    tripStatus: canAutoDepart ? 'en-route-pickup' : 'assigned',
    status: canAutoDepart ? 'en-route-pickup' : 'assigned',
    queuePosition: 0,
    planningStatus: load?.plannedDeadheadRouteGeometry ? 'route-ready' : load?.planningStatus ?? null,
    deliveryPlanningStatus: load?.plannedLoadedRouteGeometry ? 'route-ready' : load?.deliveryPlanningStatus ?? null,
    departureGameMinute: canAutoDepart ? currentGameMinute : null,
    pickupArrivalGameMinute: null,
    pickupCheckInStartGameMinute: null,
    pickupCheckInGameMinute: null,
    pickupDockReadyGameMinute: null,
    pickupDriverBriefedGameMinute: wasBriefed ? load.pickupDriverBriefedGameMinute : null,
    pickupDriverBriefedLoadId: wasBriefed ? (load.pickupDriverBriefedLoadId || load.id) : null,
    driverAcknowledgedGameMinute: wasAcknowledged ? load.driverAcknowledgedGameMinute : null,
    pickupRouteSentGameMinute: null,
    pickupDriverConfirmedRouteGameMinute: null,
    pickupDriverMessageRead: null,
    pickupCheckedInDriverMessageRead: null,
    loadingStartGameMinute: null,
    loadingChallengeState: null,
    loadingResult: null,
    loadedGameMinute: null,
    loadedDriverMessageRead: null,
    plannedDeliveryDepartureGameMinute: null,
    waitingReason: null,
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
    shipment: null,
    pod: null,
  }
}

export function promoteNextQueuedLoad(loads = [], driverId, currentGameMinute = null) {
  const next = getDriverQueue(loads, driverId)[0]
  if (!next) return { loads, nextLoadId: null }
  return { nextLoadId: next.id, loads: loads.map((load) => load.id === next.id ? sanitizePromotedLoad(load, currentGameMinute) : load) }
}

