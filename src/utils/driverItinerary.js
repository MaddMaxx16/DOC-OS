const TERMINAL = new Set(['completed', 'delivered'])
const PICKUP_DONE = new Set(['loaded', 'onboard-hold', 'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'])
const DELIVERY_DONE = new Set(['awaiting-pod', 'delivered', 'completed'])
const PICKUP_ACTIVE = new Set(['en-route-pickup', 'at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup', 'pickup-issue'])
const DELIVERY_ACTIVE = new Set(['loaded', 'onboard-hold', 'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery'])

function abs(day = 0, minute = 0) { return Number(day || 0) * 1440 + Number(minute || 0) }

function stopState(load, type) {
  const status = load.tripStatus || load.status
  if (type === 'pickup') {
    if (PICKUP_DONE.has(status)) return 'completed'
    if (PICKUP_ACTIVE.has(status)) return status
    // AW1.6.3 — booking reserves the freight; communication authorizes movement.
    // A freshly booked first route uses tripStatus=assigned, while later routes are
    // queued. Treat both exactly the same until the dispatcher sends the schedule.
    // This prevents BOOK APPROVED ROUTES from silently launching the truck before
    // SEND SCHEDULE and keeps the scheduler as the source of operational order.
    if (status === 'assigned' || status === 'queued') {
      return Number.isFinite(load.pickupDriverBriefedGameMinute) ? 'communicated' : 'planned'
    }
    return 'planned'
  }
  if (DELIVERY_DONE.has(status)) return 'completed'
  if (DELIVERY_ACTIVE.has(status)) return status
  return 'planned'
}

export function buildDriverItinerary(loads = [], driverId) {
  if (!driverId) return []
  const assigned = loads.filter((load) => (load.assignedDriverId === driverId || load.completedDriverId === driverId) && !TERMINAL.has(load.status))

  // CS2.0A.11 — Sequential Load Integrity
  // Until trailer-capacity / multi-load planning exists, a driver owns exactly
  // one freight lifecycle at a time. A later pickup may NOT be inserted between
  // an earlier pickup and that load's delivery. Route order is therefore atomic:
  // pickup A -> delivery A -> pickup B -> delivery B.
  //
  // Prefer the persisted operational ordering created by booking/scheduling.
  // Fall back to pickup appointment time only for legacy/unordered data.
  const orderedLoads = [...assigned].sort((a, b) => {
    const aQueue = Number.isFinite(a.queuePosition) ? a.queuePosition : Number.POSITIVE_INFINITY
    const bQueue = Number.isFinite(b.queuePosition) ? b.queuePosition : Number.POSITIVE_INFINITY
    if (aQueue !== bQueue) return aQueue - bQueue

    const aSchedule = Number.isFinite(a.scheduleOrderIndex) ? a.scheduleOrderIndex : Number.POSITIVE_INFINITY
    const bSchedule = Number.isFinite(b.scheduleOrderIndex) ? b.scheduleOrderIndex : Number.POSITIVE_INFINITY
    if (aSchedule !== bSchedule) return aSchedule - bSchedule

    const aPickup = abs(a.pickupDayIndex, a.pickupWindowStartMinutes)
    const bPickup = abs(b.pickupDayIndex, b.pickupWindowStartMinutes)
    if (aPickup !== bPickup) return aPickup - bPickup
    return String(a.id || '').localeCompare(String(b.id || ''))
  })

  const stops = []
  orderedLoads.forEach((load) => {
    const ref = load.loadNumber || load.id
    stops.push({
      id: `${load.id}:pickup`, loadId: load.id, loadRef: ref, type: 'pickup', locationId: load.pickupLocationId,
      dayIndex: load.pickupDayIndex || 0, windowStartMinutes: load.pickupWindowStartMinutes || 0, windowEndMinutes: load.pickupWindowEndMinutes || 0,
      sortMinute: abs(load.pickupDayIndex, load.pickupWindowStartMinutes), state: stopState(load, 'pickup'), load,
    })
    stops.push({
      id: `${load.id}:delivery`, loadId: load.id, loadRef: ref, type: 'delivery', locationId: load.deliveryLocationId,
      dayIndex: load.deliveryDayIndex || 0, windowStartMinutes: load.deliveryWindowStartMinutes || 0, windowEndMinutes: load.deliveryWindowEndMinutes || 0,
      sortMinute: abs(load.deliveryDayIndex, load.deliveryWindowStartMinutes), state: stopState(load, 'delivery'), load,
    })
  })

  return stops.map((stop, itineraryOrder) => ({ ...stop, itineraryOrder }))
}

// CS2.0A.7 — one physical authority for every driver consumer.
// If Marcus is already traveling or physically working a facility, that stop is
// the present truth. Schedule/window ordering is only allowed to choose work when
// there is no current physical leg or facility operation.
const PHYSICAL_PICKUP_STATES = new Set([
  'en-route-pickup', 'at-pickup', 'checking-in-pickup', 'waiting-at-pickup',
  'checked-in-pickup', 'loading-at-pickup', 'pickup-issue',
])
const PHYSICAL_DELIVERY_STATES = new Set([
  'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery',
  'checked-in-delivery', 'unloading-delivery',
])

function physicalStateMinute(load) {
  if (!load) return -Infinity
  if (load.tripStatus === 'en-route-delivery') return Number.isFinite(load.deliveryDepartureGameMinute) ? load.deliveryDepartureGameMinute : -Infinity
  if (load.tripStatus === 'en-route-pickup') return Number.isFinite(load.departureGameMinute) ? load.departureGameMinute : -Infinity
  if (PHYSICAL_DELIVERY_STATES.has(load.tripStatus)) return Number.isFinite(load.deliveryArrivalGameMinute) ? load.deliveryArrivalGameMinute : -Infinity
  if (PHYSICAL_PICKUP_STATES.has(load.tripStatus)) return Number.isFinite(load.pickupArrivalGameMinute) ? load.pickupArrivalGameMinute : -Infinity
  return -Infinity
}

export function getDriverPhysicalStop(loads = [], driverId) {
  if (!driverId) return null
  const candidates = loads.filter((load) => load?.assignedDriverId === driverId && (
    PHYSICAL_PICKUP_STATES.has(load.tripStatus) || PHYSICAL_DELIVERY_STATES.has(load.tripStatus)
  ))
  if (!candidates.length) return null

  // Active road travel is absolute physical truth. If malformed legacy state has
  // more than one candidate, prefer travel, then the most recently entered state.
  const ordered = [...candidates].sort((a, b) => {
    const aTravel = ['en-route-pickup', 'en-route-delivery'].includes(a.tripStatus) ? 1 : 0
    const bTravel = ['en-route-pickup', 'en-route-delivery'].includes(b.tripStatus) ? 1 : 0
    if (aTravel !== bTravel) return bTravel - aTravel
    return physicalStateMinute(b) - physicalStateMinute(a)
  })
  const load = ordered[0]
  const type = PHYSICAL_PICKUP_STATES.has(load.tripStatus) ? 'pickup' : 'delivery'
  const itineraryStop = buildDriverItinerary(loads, driverId).find((stop) => stop.loadId === load.id && stop.type === type)
  if (itineraryStop) return itineraryStop

  // Defensive fallback for malformed legacy saves where the stop was omitted.
  return {
    id: `${load.id}:${type}`,
    loadId: load.id,
    loadRef: load.loadNumber || load.id,
    type,
    locationId: type === 'pickup' ? load.pickupLocationId : load.deliveryLocationId,
    dayIndex: type === 'pickup' ? (load.pickupDayIndex || 0) : (load.deliveryDayIndex || 0),
    windowStartMinutes: type === 'pickup' ? (load.pickupWindowStartMinutes || 0) : (load.deliveryWindowStartMinutes || 0),
    windowEndMinutes: type === 'pickup' ? (load.pickupWindowEndMinutes || 0) : (load.deliveryWindowEndMinutes || 0),
    state: load.tripStatus,
    load,
  }
}

export function getNextActionableDriverStop(loads = [], driverId) {
  const physicalStop = getDriverPhysicalStop(loads, driverId)
  if (physicalStop) return physicalStop

  const itinerary = buildDriverItinerary(loads, driverId)
  const pickupComplete = (load) => PICKUP_DONE.has(load?.tripStatus || load?.status)

  for (const stop of itinerary) {
    if (stop.state === 'completed') continue
    const load = loads.find((item) => item.id === stop.loadId)
    if (!load) continue

    if (stop.type === 'pickup') {
      // Planned freight is visible on the itinerary, but Marcus should only act on
      // pickups the dispatcher has actually communicated (or that are already active).
      if (stop.state === 'planned') continue
      return stop
    }

    // A delivery cannot become actionable until its own pickup has completed.
    if (!pickupComplete(load)) continue
    return stop
  }
  return null
}

export function getDriverItineraryState(loads = [], driverId) {
  const itinerary = buildDriverItinerary(loads, driverId)
  const liveLoads = loads.filter((load) => load.assignedDriverId === driverId && !['delivered', 'completed'].includes(load.tripStatus))
  const nextStop = getNextActionableDriverStop(loads, driverId)
  // AV2.11.2: itinerary state no longer invents an "active load" independently
  // from the authoritative stop resolver. Compatibility consumers still receive
  // operationalLoad, but it is the load that owns the next actionable stop.
  const operationalLoad = nextStop ? liveLoads.find((load) => load.id === nextStop.loadId) || null : null
  const onboardLoads = liveLoads.filter((load) => ['onboard-hold', 'loaded', 'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery'].includes(load.tripStatus))
  const currentStop = nextStop || null
  return { itinerary, operationalLoad, onboardLoads, currentStop, nextStop }
}


export function getAuthoritativeDriverTravelLoad(loads = [], driverId) {
  if (!driverId) return null

  // CS2.0A.7 — travel authority is derived from the same physical-stop resolver
  // used by the driver card, itinerary state, route highlighting, and reconciliation.
  const physicalStop = getDriverPhysicalStop(loads, driverId)
  if (!physicalStop) return null
  const load = loads.find((item) => item.id === physicalStop.loadId && item.assignedDriverId === driverId)
  if (!load) return null
  return ['en-route-pickup', 'en-route-delivery'].includes(load.tripStatus) ? load : null
}
