import mapLocations from '../data/mapLocations.js'

const TERMINAL_STATUSES = new Set(['completed', 'delivered'])

export function getDriverAssignedLoads(loads = [], driverId) {
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
  const assigned = getDriverAssignedLoads(loads, driverId)
  return assigned.find((load) => load.tripStatus !== 'queued') || assigned[0] || null
}

export function getDriverQueue(loads = [], driverId) {
  return getDriverAssignedLoads(loads, driverId).filter((load) => load.tripStatus === 'queued')
}

export function getNextQueuePosition(loads = [], driverId) {
  const positions = getDriverAssignedLoads(loads, driverId)
    .map((load) => load.queuePosition)
    .filter(Number.isFinite)
  return positions.length ? Math.max(...positions) + 1 : 1
}

export function getProjectedDriverOrigin({ driver, loads = [], runtimePositions = {}, gameTime }) {
  const assigned = getDriverAssignedLoads(loads, driver.id)
  const lastLoad = assigned[assigned.length - 1]
  const currentAbsoluteMinute = (gameTime?.gameDayIndex || 0) * 1440 + (gameTime?.totalMinutesOfDay || 0)

  if (!lastLoad) {
    const runtime = runtimePositions[driver.id]
    const home = mapLocations.find((location) => location.id === (driver.lastKnownLocationId || driver.homeBaseLocationId))
    return {
      location: runtime || home || null,
      availableAbsoluteMinute: currentAbsoluteMinute,
      queueLength: 0,
      afterLoadId: null,
    }
  }

  const delivery = mapLocations.find((location) => location.id === lastLoad.deliveryLocationId)
  const deliveryWindowEnd = (lastLoad.deliveryDayIndex || 0) * 1440 + (lastLoad.deliveryWindowEndMinutes || 0)
  const projectedAvailableMinute = Math.max(currentAbsoluteMinute, deliveryWindowEnd + 15)

  return {
    location: delivery || runtimePositions[driver.id] || null,
    availableAbsoluteMinute: projectedAvailableMinute,
    queueLength: assigned.length,
    afterLoadId: lastLoad.id,
  }
}

export function promoteNextQueuedLoad(loads = [], driverId) {
  const queued = getDriverQueue(loads, driverId)
  const next = queued[0]
  if (!next) return { loads, nextLoadId: null }

  return {
    nextLoadId: next.id,
    loads: loads.map((load) => load.id === next.id
      ? { ...load, tripStatus: 'assigned', status: 'assigned', queuePosition: 0, planningStatus: null, deliveryPlanningStatus: null }
      : load),
  }
}
