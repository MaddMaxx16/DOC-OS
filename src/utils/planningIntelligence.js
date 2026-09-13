import mapLocations from '../data/mapLocations.js'
import { getLocationDistanceMiles } from '../services/routingService.js'

function absolute(day = 0, minute = 0) {
  return Number(day || 0) * 1440 + Number(minute || 0)
}

function loadDriveMinutes(load) {
  const deadhead = Number(load?.assignmentProjection?.deadheadMinutes ?? load?.tripPlan?.legs?.deadhead?.minutes ?? load?.plannedDeadheadDriveTimeMinutes ?? 0)
  const loaded = Number(load?.tripPlan?.legs?.loaded?.minutes ?? load?.plannedLoadedDriveTimeMinutes ?? load?.assignmentProjection?.loadedMinutes ?? 0)
  return Math.max(0, deadhead) + Math.max(0, loaded)
}

function isPlanningLoad(load, driverId) {
  if (!load || ['completed', 'delivered', 'expired'].includes(load.status) || ['completed', 'delivered', 'expired'].includes(load.tripStatus)) return false
  return load.assignedDriverId === driverId || (load.candidateDriverId === driverId && Boolean(load.scheduleApprovalQueued || ['PENDING','APPROVED','NEEDS_INFO'].includes(load.carrierApprovalStatus)))
}


export function getFreightHaulClass(load) {
  if (!load) return { label: 'LOCAL', tone: 'local', reason: 'Short-haul freight with limited drive-time commitment.' }
  const loadedMinutes = Math.max(0, Number(load?.tripPlan?.legs?.loaded?.minutes ?? load?.plannedLoadedDriveTimeMinutes ?? load?.assignmentProjection?.loadedMinutes ?? 0))
  const miles = Number(load?.listedMiles ?? load?.assignmentProjection?.loadedMiles ?? load?.tripPlan?.legs?.loaded?.miles ?? 0)

  if ((Number.isFinite(miles) && miles >= 250) || loadedMinutes >= 240) {
    return {
      label: 'LONG HAUL',
      tone: 'long-haul',
      reason: 'Major travel commitment. Expect this freight to occupy a large part of the driver’s day.',
    }
  }
  if ((Number.isFinite(miles) && miles >= 100) || loadedMinutes >= 120) {
    return {
      label: 'REGIONAL',
      tone: 'regional',
      reason: 'Regional freight with a meaningful drive-time commitment.',
    }
  }
  return {
    label: 'LOCAL',
    tone: 'local',
    reason: 'Short-haul freight with limited drive-time commitment.',
  }
}


function locationPoint(locationId) {
  const loc = mapLocations.find((item) => item.id === locationId)
  if (!loc || !Number.isFinite(loc.longitude) || !Number.isFinite(loc.latitude)) return null
  return { x: loc.longitude * 53, y: loc.latitude * 69 }
}

function pointToSegmentMiles(point, start, end) {
  if (!point || !start || !end) return null
  const vx = end.x - start.x, vy = end.y - start.y
  const wx = point.x - start.x, wy = point.y - start.y
  const len2 = vx * vx + vy * vy
  const t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0
  const dx = point.x - (start.x + t * vx), dy = point.y - (start.y + t * vy)
  return Math.sqrt(dx * dx + dy * dy)
}

export function getRouteCompatibility(load, loads = [], driverId = null) {
  if (!load) return null
  const owner = driverId || load.candidateDriverId || load.assignedDriverId
  const anchors = loads.filter((item) => item.id !== load.id && isPlanningLoad(item, owner))
  if (!anchors.length) return null
  const anchor = anchors.find((item) => getFreightHaulClass(item).label === 'LONG HAUL') || anchors[0]
  const a = locationPoint(anchor.pickupLocationId), b = locationPoint(anchor.deliveryLocationId)
  const p = locationPoint(load.pickupLocationId), d = locationPoint(load.deliveryLocationId)
  if (!a || !b || !p || !d) return null
  const corridorMiles = Math.max(pointToSegmentMiles(p, a, b) || 0, pointToSegmentMiles(d, a, b) || 0)
  const label = corridorMiles <= 15 ? 'ON ROUTE' : corridorMiles <= 40 ? 'MINOR DETOUR' : 'MAJOR DETOUR'
  return { label, corridorMiles: Math.round(corridorMiles), anchorLoadId: anchor.id }
}

export function getPlanningImpact(load, loads = [], driverId = null) {
  if (!load) return null
  const pickupStart = absolute(load.pickupDayIndex, load.pickupWindowStartMinutes)
  const pickupEnd = absolute(load.pickupDayIndex, load.pickupWindowEndMinutes)
  const deliveryEnd = absolute(load.deliveryDayIndex, load.deliveryWindowEndMinutes)
  const projectedArrival = Number.isFinite(load.assignmentProjection?.arrivalMinutes)
    ? absolute(load.assignmentProjection?.arrivalDay ?? load.pickupDayIndex, load.assignmentProjection.arrivalMinutes)
    : pickupStart
  const pickupBuffer = pickupEnd - projectedArrival
  const driveMinutes = loadDriveMinutes(load)
  const serviceMinutes = 70
  const spanMinutes = Math.max(0, deliveryEnd - pickupStart)
  const projectedIdleMinutes = Math.max(0, spanMinutes - driveMinutes - serviceMinutes)
  const status = String(load.assignmentProjection?.status || '').toUpperCase()
  const haulClass = getFreightHaulClass(load)
  const routeCompatibility = getRouteCompatibility(load, loads, driverId || load.candidateDriverId || load.assignedDriverId)

  let label = 'EFFICIENT'
  let tone = 'good'
  let reason = 'Fits the current plan with useful working time.'
  if (status.includes('AT RISK') || pickupBuffer < 0) {
    label = 'CONFLICT'
    tone = 'danger'
    reason = 'The projected arrival misses the pickup window.'
  } else if (status.includes('TIGHT') || pickupBuffer <= 30) {
    label = 'TIGHT'
    tone = 'attention'
    reason = 'Feasible, but there is very little recovery time.'
  } else if (projectedIdleMinutes >= 120) {
    label = 'WORKABLE'
    tone = 'attention'
    reason = 'It fits, but this freight leaves a long open window in the day.'
  } else if (projectedIdleMinutes >= 60) {
    label = 'WORKABLE'
    tone = 'neutral'
    reason = 'It fits with some unused time between appointments.'
  }

  const planned = loads.filter((item) => isPlanningLoad(item, driverId || load.candidateDriverId || load.assignedDriverId))
  const withCandidate = planned.some((item) => item.id === load.id) ? planned : [...planned, load]
  const starts = withCandidate.map((item) => absolute(item.pickupDayIndex, item.pickupWindowStartMinutes)).filter(Number.isFinite)
  const ends = withCandidate.map((item) => absolute(item.deliveryDayIndex, item.deliveryWindowEndMinutes)).filter(Number.isFinite)
  const planSpan = starts.length && ends.length ? Math.max(1, Math.max(...ends) - Math.min(...starts)) : Math.max(1, spanMinutes)
  const productive = withCandidate.reduce((sum, item) => sum + loadDriveMinutes(item) + 70, 0)
  const utilizationPct = Math.max(0, Math.min(100, Math.round((productive / planSpan) * 100)))

  return {
    label,
    haulClass,
    tone,
    reason,
    pickupBufferMinutes: pickupBuffer,
    projectedIdleMinutes,
    driveMinutes,
    utilizationPct,
    longHold: projectedIdleMinutes >= 120,
    routeCompatibility,
  }
}

function planningStopOrder(planned = []) {
  const stops = []
  planned.forEach((load) => {
    stops.push({
      id: `${load.id}:pickup`, loadId: load.id, load, type: 'pickup', locationId: load.pickupLocationId,
      windowStart: absolute(load.pickupDayIndex, load.pickupWindowStartMinutes),
      windowEnd: absolute(load.pickupDayIndex, load.pickupWindowEndMinutes),
    })
    stops.push({
      id: `${load.id}:delivery`, loadId: load.id, load, type: 'delivery', locationId: load.deliveryLocationId,
      windowStart: absolute(load.deliveryDayIndex, load.deliveryWindowStartMinutes),
      windowEnd: absolute(load.deliveryDayIndex, load.deliveryWindowEndMinutes),
    })
  })

  // Use the same time-prioritized precedence rule as the operational itinerary:
  // every load's pickup must happen before its own delivery. This lets the
  // scheduler validate interleaved pickup/delivery days instead of pretending
  // each load is completed before the next one starts.
  const byId = new Map(stops.map((stop) => [stop.id, stop]))
  const outgoing = new Map(stops.map((stop) => [stop.id, new Set()]))
  const indegree = new Map(stops.map((stop) => [stop.id, 0]))
  const addEdge = (from, to) => {
    if (!byId.has(from) || !byId.has(to) || outgoing.get(from).has(to)) return
    outgoing.get(from).add(to)
    indegree.set(to, (indegree.get(to) || 0) + 1)
  }
  planned.forEach((load) => {
    addEdge(`${load.id}:pickup`, `${load.id}:delivery`)
    const insertion = load.itineraryInsertion || load.tripPlan?.insertionPlan || load.assignmentProjection?.insertionPlan
    if (insertion?.type === 'pickup-before-delivery' && insertion.anchorLoadId) {
      addEdge(`${load.id}:pickup`, `${insertion.anchorLoadId}:delivery`)
    }
  })
  const sortReady = (a, b) => (a.windowStart - b.windowStart) || (a.type === 'pickup' ? -1 : 1) || a.id.localeCompare(b.id)
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
  if (ordered.length !== stops.length) {
    const used = new Set(ordered.map((stop) => stop.id))
    ordered.push(...stops.filter((stop) => !used.has(stop.id)).sort(sortReady))
  }
  return ordered
}

function serviceMinutesForStop(stop) {
  if (stop.type === 'pickup') return 10 + Math.max(0, Number(stop.load?.facilityOps?.pickup?.loadingDelayMinutes || 0))
  return 8 + Math.max(0, Number(stop.load?.facilityOps?.delivery?.unloadingDelayMinutes || 0))
}

function locationById(id) {
  return mapLocations.find((location) => location.id === id) || null
}

function fallbackTravelMinutes(originId, destinationId) {
  if (!originId || !destinationId || originId === destinationId) return 0
  const origin = locationById(originId)
  const destination = locationById(destinationId)
  if (!origin || !destination) return 0
  // Keep planning estimates aligned with the routing service fallback model.
  const roadMiles = getLocationDistanceMiles(origin, destination) * 1.18
  return Math.max(1, Math.round((roadMiles / 45) * 60))
}

function travelMinutesBetweenStops(previous, current) {
  if (!previous || !current) return 0
  if (previous.locationId === current.locationId) return 0

  // For the loaded leg of the same freight, prefer the already-calculated road
  // duration. Cross-load handoffs use geography so the plan is evaluated from
  // the actual previous stop, not from a stale candidate origin.
  if (previous.loadId === current.loadId && previous.type === 'pickup' && current.type === 'delivery') {
    const loaded = Number(current.load?.tripPlan?.legs?.loaded?.minutes ?? current.load?.plannedLoadedDriveTimeMinutes ?? current.load?.assignmentProjection?.loadedMinutes)
    if (Number.isFinite(loaded) && loaded >= 0) return loaded
  }
  return fallbackTravelMinutes(previous.locationId, current.locationId)
}

function simulatePlan(planned = []) {
  const stops = planningStopOrder(planned)
  if (!stops.length) return { stops: [], projectedIdleMinutes: 0, productiveMinutes: 0, spanMinutes: 1, utilizationPct: 0 }

  let cursor = stops[0].windowStart
  let previous = null
  let idle = 0
  let productive = 0
  const projected = stops.map((stop, index) => {
    let travel = 0
    if (index === 0) {
      if (stop.type === 'pickup') {
        const projectedArrival = Number.isFinite(stop.load?.assignmentProjection?.arrivalMinutes)
          ? absolute(stop.load?.assignmentProjection?.arrivalDay ?? stop.load?.pickupDayIndex, stop.load.assignmentProjection.arrivalMinutes)
          : stop.windowStart
        cursor = projectedArrival
      } else {
        cursor = stop.windowStart
      }
    } else {
      travel = travelMinutesBetweenStops(previous, stop)
      cursor += travel
      productive += travel
    }

    const rawArrival = cursor
    const wait = Math.max(0, stop.windowStart - rawArrival)
    idle += wait
    const serviceStart = Math.max(rawArrival, stop.windowStart)
    const service = serviceMinutesForStop(stop)
    productive += service
    const departure = serviceStart + service
    const slack = stop.windowEnd - rawArrival
    const lateMinutes = Math.max(0, rawArrival - stop.windowEnd)
    cursor = departure
    previous = stop
    return { ...stop, travelMinutes: travel, arrivalMinute: rawArrival, waitMinutes: wait, serviceMinutes: service, departureMinute: departure, slackMinutes: slack, lateMinutes }
  })

  const spanStart = projected[0]?.windowStart ?? 0
  const spanEnd = Math.max(cursor, projected.at(-1)?.windowEnd ?? cursor)
  const spanMinutes = Math.max(1, spanEnd - spanStart)
  const utilizationPct = Math.max(0, Math.min(100, Math.round((productive / spanMinutes) * 100)))
  return { stops: projected, projectedIdleMinutes: idle, productiveMinutes: productive, spanMinutes, utilizationPct }
}

export function getPlanQuality(loads = [], driverId = null) {
  const owner = driverId || loads.find((item) => item?.candidateDriverId || item?.assignedDriverId)?.candidateDriverId || loads.find((item) => item?.assignedDriverId)?.assignedDriverId
  const planned = loads.filter((item) => isPlanningLoad(item, owner))
  if (!planned.length) return { label: 'CLEAR', tone: 'neutral', utilizationPct: 0, projectedIdleMinutes: 0, loadCount: 0, stopCount: 0 }

  const simulation = simulatePlan(planned)
  const conflictStops = simulation.stops.filter((stop) => stop.lateMinutes > 0)
  const tightStops = simulation.stops.filter((stop) => stop.lateMinutes <= 0 && stop.slackMinutes <= 30)
  const longWaits = simulation.stops.filter((stop) => stop.waitMinutes >= 60)

  let label = 'EFFICIENT'
  let tone = 'good'
  if (conflictStops.length) {
    label = 'CONFLICT'
    tone = 'danger'
  } else if (tightStops.length) {
    label = 'TIGHT'
    tone = 'attention'
  } else if (longWaits.length || simulation.projectedIdleMinutes >= 60) {
    label = 'WORKABLE'
    tone = 'neutral'
  }

  const worstStop = conflictStops[0] || tightStops[0] || null
  return {
    label,
    tone,
    utilizationPct: simulation.utilizationPct,
    projectedIdleMinutes: simulation.projectedIdleMinutes,
    loadCount: planned.length,
    stopCount: simulation.stops.length,
    conflictCount: conflictStops.length,
    tightCount: tightStops.length,
    worstStopId: worstStop?.id || null,
    worstStopLateMinutes: worstStop?.lateMinutes || 0,
    itinerary: simulation.stops,
  }
}

export function formatPlanningMinutes(value) {
  if (!Number.isFinite(value)) return '—'
  const minutes = Math.max(0, Math.round(value))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}
