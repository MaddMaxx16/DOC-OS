import mapLocations from '../data/mapLocations.js'
import { getLocationDistanceMiles } from '../services/routingService.js'

const TERMINAL = new Set(['completed', 'delivered', 'expired', 'cancelled'])
const PICKUP_DONE = new Set([
  'loaded', 'onboard-hold', 'en-route-delivery', 'at-delivery', 'checking-in-delivery',
  'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod',
  'delivered', 'completed',
])
const DELIVERY_DONE = new Set(['awaiting-pod', 'delivered', 'completed'])
const DEFAULT_DRY_VAN_PALLETS = 26
const DEFAULT_DRY_VAN_WEIGHT_LBS = 44000
const PICKUP_SERVICE_MINUTES = 10
const DELIVERY_SERVICE_MINUTES = 8

function abs(day = 0, minute = 0) {
  return Number(day || 0) * 1440 + Number(minute || 0)
}

function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function locationById(id) {
  return mapLocations.find((location) => location.id === id) || null
}

function stopKey(loadId, type) {
  return `${loadId}:${type}`
}

function statusOf(load) {
  return String(load?.tripStatus || load?.status || '').toLowerCase()
}

export function isManifestPickupComplete(load) {
  return PICKUP_DONE.has(statusOf(load))
}

export function isManifestDeliveryComplete(load) {
  return DELIVERY_DONE.has(statusOf(load))
}

export function isLoadOnboard(load) {
  return Boolean(load)
    && isManifestPickupComplete(load)
    && !isManifestDeliveryComplete(load)
    && !TERMINAL.has(statusOf(load))
}

function stableFreightFallback(load) {
  const value = String(load?.loadNumber || load?.id || 'freight')
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  const unsigned = hash >>> 0
  const pallets = 4 + (unsigned % 9)
  const poundsPerPallet = 900 + (unsigned % 701)
  return { pallets, weightLbs: pallets * poundsPerPallet }
}

export function getLoadFreightFootprint(load) {
  const shipment = load?.shipment || {}
  const freight = load?.freight || {}
  const fallback = stableFreightFallback(load)
  const loadedPallets = finite(shipment.loadedPallets)
  const expectedPallets = finite(shipment.expectedPallets)
  const freightPallets = finite(freight.pallets)
  const explicitPallets = loadedPallets ?? freightPallets ?? expectedPallets
  const pallets = explicitPallets ?? fallback.pallets
  const weightLbs = finite(freight.weightLbs) ?? finite(shipment.weightLbs) ?? (explicitPallets === null ? fallback.weightLbs : null)
  return {
    pallets: Math.max(0, pallets),
    weightLbs: weightLbs === null ? null : Math.max(0, weightLbs),
    equipmentType: freight.equipmentType || load?.equipmentType || 'dry-van',
    equipmentLabel: freight.equipmentLabel || load?.equipmentLabel || "53' Dry Van",
    compatibilityClass: freight.compatibilityClass || 'general',
    incompatibleWith: Array.isArray(freight.incompatibleWith) ? freight.incompatibleWith : [],
    exclusiveTrailer: Boolean(freight.exclusiveTrailer || freight.loadClass === 'full-truckload'),
    inferred: explicitPallets === null,
  }
}

export function getDriverTrailerCapacity(driver, loads = []) {
  const equipment = driver?.equipment || {}
  const sampleFreight = loads.map((load) => load?.freight).find(Boolean) || {}
  const equipmentType = equipment.type || sampleFreight.equipmentType || 'dry-van'
  const palletCapacity = finite(equipment.capacityPallets)
    ?? finite(equipment.trailerCapacityPallets)
    ?? finite(sampleFreight.trailerCapacityPallets)
    ?? (equipmentType === 'dry-van' ? DEFAULT_DRY_VAN_PALLETS : null)
  const maxWeightLbs = finite(equipment.maxWeightLbs)
    ?? finite(equipment.trailerMaxWeightLbs)
    ?? finite(sampleFreight.trailerMaxWeightLbs)
    ?? (equipmentType === 'dry-van' ? DEFAULT_DRY_VAN_WEIGHT_LBS : null)
  return { equipmentType, palletCapacity, maxWeightLbs }
}

export function getDriverTrailerState(loads = [], driverId, driver = null) {
  const onboardLoads = loads.filter((load) => load?.assignedDriverId === driverId && isLoadOnboard(load))
  const capacity = getDriverTrailerCapacity(driver, onboardLoads.length ? onboardLoads : loads)
  let palletsUsed = 0
  let weightUsedLbs = 0
  let weightKnown = true
  const contents = onboardLoads.map((load) => {
    const footprint = getLoadFreightFootprint(load)
    palletsUsed += footprint.pallets
    if (footprint.weightLbs === null) weightKnown = false
    else weightUsedLbs += footprint.weightLbs
    return { loadId: load.id, loadRef: load.loadNumber || load.id, ...footprint }
  })
  return {
    driverId,
    contents,
    onboardLoadIds: contents.map((item) => item.loadId),
    palletsUsed,
    weightUsedLbs: weightKnown ? weightUsedLbs : null,
    capacity,
    palletsRemaining: Number.isFinite(capacity.palletCapacity) ? capacity.palletCapacity - palletsUsed : null,
    weightRemainingLbs: Number.isFinite(capacity.maxWeightLbs) && weightKnown ? capacity.maxWeightLbs - weightUsedLbs : null,
    overPalletCapacity: Number.isFinite(capacity.palletCapacity) && palletsUsed > capacity.palletCapacity,
    overWeightCapacity: Number.isFinite(capacity.maxWeightLbs) && weightKnown && weightUsedLbs > capacity.maxWeightLbs,
  }
}

function persistedOrder(load, type) {
  const value = finite(load?.manifestStopOrder?.[type])
  return value === null ? Number.POSITIVE_INFINITY : value
}

function buildRawStops(loads, driverId, { candidateLoad = null, includeTerminal = false } = {}) {
  const byId = new Map()
  for (const load of loads) {
    if (!load?.id) continue
    const owns = load.assignedDriverId === driverId || load.completedDriverId === driverId
    if (!owns) continue
    if (!includeTerminal && TERMINAL.has(statusOf(load))) continue
    byId.set(load.id, load)
  }
  if (candidateLoad?.id) byId.set(candidateLoad.id, candidateLoad)

  const stops = []
  for (const load of byId.values()) {
    const ref = load.loadNumber || load.id
    stops.push({
      id: stopKey(load.id, 'pickup'),
      loadId: load.id,
      loadRef: ref,
      type: 'pickup',
      locationId: load.pickupLocationId,
      dayIndex: Number(load.pickupDayIndex || 0),
      windowStartMinutes: Number(load.pickupWindowStartMinutes || 0),
      windowEndMinutes: Number(load.pickupWindowEndMinutes || 0),
      windowStartAbsolute: abs(load.pickupDayIndex, load.pickupWindowStartMinutes),
      windowEndAbsolute: abs(load.pickupDayIndex, load.pickupWindowEndMinutes),
      persistedOrder: persistedOrder(load, 'pickup'),
      load,
    })
    stops.push({
      id: stopKey(load.id, 'delivery'),
      loadId: load.id,
      loadRef: ref,
      type: 'delivery',
      locationId: load.deliveryLocationId,
      dayIndex: Number(load.deliveryDayIndex || 0),
      windowStartMinutes: Number(load.deliveryWindowStartMinutes || 0),
      windowEndMinutes: Number(load.deliveryWindowEndMinutes || 0),
      windowStartAbsolute: abs(load.deliveryDayIndex, load.deliveryWindowStartMinutes),
      windowEndAbsolute: abs(load.deliveryDayIndex, load.deliveryWindowEndMinutes),
      persistedOrder: persistedOrder(load, 'delivery'),
      load,
    })
  }
  return stops
}

function insertionSequenceEdges(loads) {
  const edges = []
  for (const load of loads) {
    const steps = load?.tripPlan?.manifestPlan?.sequenceSteps
      || load?.tripPlan?.insertionPlan?.sequenceSteps
      || load?.itineraryInsertion?.sequenceSteps
      || load?.assignmentProjection?.insertionPlan?.sequenceSteps
    if (!Array.isArray(steps) || steps.length < 2) continue
    const ids = steps.map((step) => stopKey(step.loadId, String(step.action || step.type || '').toLowerCase() === 'delivery' ? 'delivery' : 'pickup'))
    for (let index = 0; index < ids.length - 1; index += 1) edges.push([ids[index], ids[index + 1]])
  }
  return edges
}

function topologicalStops(stops, loads) {
  const byId = new Map(stops.map((stop) => [stop.id, stop]))
  const outgoing = new Map(stops.map((stop) => [stop.id, new Set()]))
  const indegree = new Map(stops.map((stop) => [stop.id, 0]))

  const addEdge = (from, to) => {
    if (!byId.has(from) || !byId.has(to) || from === to) return
    const set = outgoing.get(from)
    if (set.has(to)) return
    set.add(to)
    indegree.set(to, (indegree.get(to) || 0) + 1)
  }

  for (const stop of stops) {
    if (stop.type === 'delivery') addEdge(stopKey(stop.loadId, 'pickup'), stop.id)
  }
  for (const [from, to] of insertionSequenceEdges(loads)) addEdge(from, to)

  const rank = (a, b) => {
    if (a.persistedOrder !== b.persistedOrder) return a.persistedOrder - b.persistedOrder
    if (a.windowStartAbsolute !== b.windowStartAbsolute) return a.windowStartAbsolute - b.windowStartAbsolute
    if (a.type !== b.type) return a.type === 'pickup' ? -1 : 1
    return a.id.localeCompare(b.id)
  }

  const ready = stops.filter((stop) => (indegree.get(stop.id) || 0) === 0).sort(rank)
  const ordered = []
  while (ready.length) {
    const stop = ready.shift()
    ordered.push(stop)
    for (const target of outgoing.get(stop.id) || []) {
      indegree.set(target, indegree.get(target) - 1)
      if (indegree.get(target) === 0) {
        ready.push(byId.get(target))
        ready.sort(rank)
      }
    }
  }

  // Defensive fallback if malformed legacy constraints form a cycle.
  if (ordered.length !== stops.length) {
    const used = new Set(ordered.map((stop) => stop.id))
    ordered.push(...stops.filter((stop) => !used.has(stop.id)).sort(rank))
  }
  return ordered
}

function simulateCapacity(stops, driver) {
  const capacity = getDriverTrailerCapacity(driver, stops.map((stop) => stop.load))
  const onboard = new Map()
  const snapshots = []
  const violations = []

  for (const stop of stops) {
    if (stop.type === 'pickup') {
      const footprint = getLoadFreightFootprint(stop.load)
      const existing = [...onboard.values()]
      const equipmentMismatch = capacity.equipmentType && footprint.equipmentType && capacity.equipmentType !== footprint.equipmentType
      const exclusiveConflict = footprint.exclusiveTrailer && existing.length > 0
        || existing.some((item) => item.exclusiveTrailer)
      const compatibilityConflict = existing.some((item) =>
        item.incompatibleWith?.includes(footprint.compatibilityClass)
        || footprint.incompatibleWith?.includes(item.compatibilityClass)
      )
      if (equipmentMismatch || exclusiveConflict || compatibilityConflict) {
        violations.push({
          type: equipmentMismatch ? 'equipment' : exclusiveConflict ? 'exclusive-trailer' : 'cargo-compatibility',
          stopId: stop.id,
          loadId: stop.loadId,
        })
      }
      onboard.set(stop.loadId, footprint)
    } else onboard.delete(stop.loadId)

    let palletsUsed = 0
    let weightUsedLbs = 0
    let weightKnown = true
    for (const footprint of onboard.values()) {
      palletsUsed += footprint.pallets
      if (footprint.weightLbs === null) weightKnown = false
      else weightUsedLbs += footprint.weightLbs
    }

    const overPallets = Number.isFinite(capacity.palletCapacity) && palletsUsed > capacity.palletCapacity
    const overWeight = Number.isFinite(capacity.maxWeightLbs) && weightKnown && weightUsedLbs > capacity.maxWeightLbs
    if (overPallets || overWeight) violations.push({
      type: 'capacity',
      stopId: stop.id,
      palletsUsed,
      weightUsedLbs: weightKnown ? weightUsedLbs : null,
      palletCapacity: capacity.palletCapacity,
      maxWeightLbs: capacity.maxWeightLbs,
    })
    snapshots.push({
      stopId: stop.id,
      onboardLoadIds: [...onboard.keys()],
      palletsUsed,
      weightUsedLbs: weightKnown ? weightUsedLbs : null,
      palletsRemaining: Number.isFinite(capacity.palletCapacity) ? capacity.palletCapacity - palletsUsed : null,
      weightRemainingLbs: Number.isFinite(capacity.maxWeightLbs) && weightKnown ? capacity.maxWeightLbs - weightUsedLbs : null,
      overCapacity: overPallets || overWeight,
    })
  }
  return { capacity, snapshots, violations }
}

export function buildDriverManifest(loads = [], driverId, { driver = null, candidateLoad = null, includeTerminal = false } = {}) {
  if (!driverId) return { driverId: null, stops: [], capacity: getDriverTrailerCapacity(driver, loads), capacitySnapshots: [], violations: [] }
  const rawStops = buildRawStops(loads, driverId, { candidateLoad, includeTerminal })
  const relevantLoads = [...new Map(rawStops.map((stop) => [stop.loadId, stop.load])).values()]
  const ordered = topologicalStops(rawStops, relevantLoads).map((stop, manifestOrder) => ({ ...stop, manifestOrder }))
  const capacity = simulateCapacity(ordered, driver)
  return {
    driverId,
    stops: ordered,
    capacity: capacity.capacity,
    capacitySnapshots: capacity.snapshots,
    violations: capacity.violations,
    onboard: getDriverTrailerState(loads, driverId, driver),
  }
}

function estimateTravelMinutes(from, to, mph = 35) {
  if (!from || !to) return 0
  if (from.id && to.id && from.id === to.id) return 0
  const miles = getLocationDistanceMiles(from, to)
  if (!Number.isFinite(miles)) return 0
  return Math.max(1, Math.round(((miles * 1.18) / mph) * 60))
}

function stopServiceMinutes(stop) {
  return stop.type === 'pickup'
    ? PICKUP_SERVICE_MINUTES + Math.max(0, Number(stop.load?.facilityOps?.pickup?.loadingDelayMinutes || 0))
    : DELIVERY_SERVICE_MINUTES + Math.max(0, Number(stop.load?.facilityOps?.delivery?.unloadingDelayMinutes || 0))
}

function simulateSchedule(sequence, { driver, gameTime, runtimePosition }) {
  const now = Number(gameTime?.gameDayIndex || 0) * 1440 + Number(gameTime?.totalMinutesOfDay || 0)
  const firstDay = Number(sequence[0]?.dayIndex || gameTime?.gameDayIndex || 0)
  const workday = driver?.workdayByDay?.[String(firstDay)] || driver?.workdayByDay?.[firstDay] || null
  const shiftStart = Number.isFinite(Number(workday?.startMinutes)) ? firstDay * 1440 + Number(workday.startMinutes) : now
  const lunchStart = Number(workday?.lunchWindowStartMinutes)
  const lunchEnd = Number(workday?.lunchWindowEndMinutes)
  const lunchValid = Number.isFinite(lunchStart) && Number.isFinite(lunchEnd)
  const lunchStartAbs = lunchValid ? firstDay * 1440 + lunchStart : null
  const lunchEndAbs = lunchValid ? firstDay * 1440 + lunchEnd + (lunchEnd <= lunchStart ? 1440 : 0) : null

  let cursor = Math.max(now, shiftStart)
  let location = runtimePosition || locationById(driver?.lastKnownLocationId || driver?.homeBaseLocationId)
  let totalLate = 0
  let totalTravel = 0
  let totalWait = 0
  const schedule = []

  for (const stop of sequence) {
    const destination = locationById(stop.locationId)
    const travelMinutes = estimateTravelMinutes(location, destination)
    let depart = cursor
    let arrival = depart + travelMinutes

    if (lunchValid && depart < lunchEndAbs && arrival > lunchStartAbs) {
      depart = Math.max(depart, lunchEndAbs)
      arrival = depart + travelMinutes
    }

    const serviceStart = Math.max(arrival, stop.windowStartAbsolute)
    const waitMinutes = Math.max(0, stop.windowStartAbsolute - arrival)
    const lateMinutes = Math.max(0, arrival - stop.windowEndAbsolute)
    const complete = serviceStart + stopServiceMinutes(stop)

    totalTravel += travelMinutes
    totalWait += waitMinutes
    totalLate += lateMinutes
    schedule.push({
      stopId: stop.id,
      loadId: stop.loadId,
      type: stop.type,
      locationId: stop.locationId,
      departAbsoluteMinute: depart,
      arrivalAbsoluteMinute: arrival,
      serviceStartAbsoluteMinute: serviceStart,
      completeAbsoluteMinute: complete,
      travelMinutes,
      waitMinutes,
      lateMinutes,
    })
    cursor = complete
    location = destination || location
  }

  return { schedule, totalLate, totalTravel, totalWait, completeAbsoluteMinute: cursor }
}

export function planDriverManifestInsertion({
  loads = [],
  driver,
  candidateLoad,
  gameTime,
  runtimePositions = {},
} = {}) {
  if (!driver?.id || !candidateLoad?.id) return null

  const baseManifest = buildDriverManifest(loads, driver.id, { driver })
  const baseStops = baseManifest.stops.filter((stop) => (
    stop.type === 'pickup'
      ? !isManifestPickupComplete(stop.load)
      : !isManifestDeliveryComplete(stop.load)
  ))
  const candidateStops = buildRawStops([], driver.id, { candidateLoad })
  const pickup = candidateStops.find((stop) => stop.type === 'pickup')
  const delivery = candidateStops.find((stop) => stop.type === 'delivery')
  if (!pickup || !delivery) return null

  const earliestIndex = 0
  let best = null

  for (let pickupIndex = earliestIndex; pickupIndex <= baseStops.length; pickupIndex += 1) {
    for (let deliveryIndex = pickupIndex + 1; deliveryIndex <= baseStops.length + 1; deliveryIndex += 1) {
      const sequence = [...baseStops]
      sequence.splice(pickupIndex, 0, pickup)
      sequence.splice(deliveryIndex, 0, delivery)

      const capacityResult = simulateCapacity(sequence, driver)
      if (capacityResult.violations.length) continue

      const scheduleResult = simulateSchedule(sequence, {
        driver,
        gameTime,
        runtimePosition: runtimePositions?.[driver.id] || null,
      })
      const candidatePickupTiming = scheduleResult.schedule.find((item) => item.stopId === pickup.id)
      const candidateDeliveryTiming = scheduleResult.schedule.find((item) => item.stopId === delivery.id)
      const score = (scheduleResult.totalLate * 100000)
        + scheduleResult.totalTravel
        + Math.round(scheduleResult.totalWait * 0.15)

      if (!best || score < best.score) {
        best = {
          score,
          sequence,
          scheduleResult,
          capacityResult,
          candidatePickupTiming,
          candidateDeliveryTiming,
        }
      }
    }
  }

  if (!best) return {
    status: 'CAPACITY RISK',
    sequenceSteps: [],
    stopOrder: {},
    violations: [{ type: 'capacity-or-feasibility' }],
    candidatePickupTiming: null,
    candidateDeliveryTiming: null,
  }

  const stopOrder = {}
  best.sequence.forEach((stop, index) => {
    stopOrder[stop.loadId] = { ...(stopOrder[stop.loadId] || {}), [stop.type]: index }
  })
  const sequenceSteps = best.sequence.map((stop) => ({
    action: stop.type === 'pickup' ? 'PICKUP' : 'DELIVERY',
    type: stop.type,
    loadId: stop.loadId,
    loadRef: stop.loadRef,
    locationId: stop.locationId,
  }))

  const candidatePickupIndex = best.sequence.findIndex((stop) => stop.id === pickup.id)
  const previousStop = candidatePickupIndex > 0 ? best.sequence[candidatePickupIndex - 1] : null
  const previousTiming = previousStop
    ? best.scheduleResult.schedule.find((item) => item.stopId === previousStop.id)
    : null

  return {
    status: best.scheduleResult.totalLate > 0 ? 'AT RISK' : 'GOOD',
    totalLateMinutes: best.scheduleResult.totalLate,
    totalTravelMinutes: best.scheduleResult.totalTravel,
    totalWaitMinutes: best.scheduleResult.totalWait,
    sequenceSteps,
    stopOrder,
    schedule: best.scheduleResult.schedule,
    capacity: best.capacityResult.capacity,
    capacitySnapshots: best.capacityResult.snapshots,
    violations: best.capacityResult.violations,
    candidatePickupTiming: best.candidatePickupTiming,
    candidateDeliveryTiming: best.candidateDeliveryTiming,
    candidatePickup: {
      previousStopId: previousStop?.id || null,
      previousLocationId: previousStop?.locationId || driver.lastKnownLocationId || driver.homeBaseLocationId || null,
      availableAbsoluteMinute: previousTiming?.completeAbsoluteMinute
        ?? Math.max(
          Number(gameTime?.gameDayIndex || 0) * 1440 + Number(gameTime?.totalMinutesOfDay || 0),
          Number(candidateLoad.pickupDayIndex || 0) * 1440 + Number(driver?.workdayByDay?.[String(candidateLoad.pickupDayIndex || 0)]?.startMinutes || 0),
        ),
    },
  }
}

export function applyManifestPlanToLoads(loads = [], driverId, manifestPlan) {
  if (!driverId || !manifestPlan?.stopOrder) return loads
  let changed = false
  const next = loads.map((load) => {
    const order = manifestPlan.stopOrder[load.id]
    if (!order || (load.assignedDriverId !== driverId && load.candidateDriverId !== driverId)) return load
    const currentPickup = finite(load?.manifestStopOrder?.pickup)
    const currentDelivery = finite(load?.manifestStopOrder?.delivery)
    if (currentPickup === order.pickup && currentDelivery === order.delivery) return load
    changed = true
    return {
      ...load,
      manifestStopOrder: {
        pickup: order.pickup,
        delivery: order.delivery,
      },
    }
  })
  return changed ? next : loads
}
