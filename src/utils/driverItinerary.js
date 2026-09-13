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
  const stops = []
  assigned.forEach((load) => {
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

  // AV2.10.6: itinerary order is a time-prioritized topological sort.
  // Earlier versions forced an inserted load's delivery to remain after the anchor
  // delivery. That breaks chained freight when the anchor is a long-haul delivery
  // (for example 9 PM) but the inserted load delivers at 1 PM. We only enforce
  // real precedence constraints here: every pickup precedes its own delivery, and
  // an explicit pickup-before-delivery insertion precedes the anchor delivery.
  const byId = new Map(stops.map((stop) => [stop.id, stop]))
  const outgoing = new Map(stops.map((stop) => [stop.id, new Set()]))
  const indegree = new Map(stops.map((stop) => [stop.id, 0]))
  const addEdge = (from, to) => {
    if (!byId.has(from) || !byId.has(to) || outgoing.get(from).has(to)) return
    outgoing.get(from).add(to)
    indegree.set(to, (indegree.get(to) || 0) + 1)
  }

  assigned.forEach((load) => {
    addEdge(`${load.id}:pickup`, `${load.id}:delivery`)
    const plan = load.itineraryInsertion || load.tripPlan?.insertionPlan || load.assignmentProjection?.insertionPlan
    if (plan?.type === 'pickup-before-delivery' && plan.anchorLoadId) {
      addEdge(`${load.id}:pickup`, `${plan.anchorLoadId}:delivery`)
    }
  })

  const sortReady = (a, b) => (a.sortMinute - b.sortMinute) || (a.type === 'pickup' ? -1 : 1) || a.id.localeCompare(b.id)
  const ready = stops.filter((stop) => (indegree.get(stop.id) || 0) === 0).sort(sortReady)
  const ordered = []
  while (ready.length) {
    const stop = ready.shift()
    ordered.push(stop)
    outgoing.get(stop.id)?.forEach((nextId) => {
      indegree.set(nextId, (indegree.get(nextId) || 0) - 1)
      if ((indegree.get(nextId) || 0) === 0) {
        ready.push(byId.get(nextId))
        ready.sort(sortReady)
      }
    })
  }

  // Defensive fallback if malformed legacy data ever introduces a cycle.
  if (ordered.length !== stops.length) {
    const included = new Set(ordered.map((stop) => stop.id))
    ordered.push(...stops.filter((stop) => !included.has(stop.id)).sort(sortReady))
  }
  return ordered.map((stop, itineraryOrder) => ({ ...stop, itineraryOrder }))
}


export function getNextActionableDriverStop(loads = [], driverId) {
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
  const nextStop = getNextActionableDriverStop(loads, driverId)
  if (!nextStop) return null
  const expectedStatus = nextStop.type === 'pickup' ? 'en-route-pickup' : 'en-route-delivery'
  return loads.find((load) => load.assignedDriverId === driverId && load.id === nextStop.loadId && load.tripStatus === expectedStatus) || null
}
