import { buildDriverItinerary } from './driverItinerary.js'
import mapLocations from '../data/mapLocations.js'
import { resolveDriverWorkdayOwnership } from './driverWorkdayOwnership.js'
import { getLocationDistanceMiles } from '../services/routingService.js'

export const LUNCH_DECISION_OPTIONS = [
  {
    id: 'proper-break', category: 'recovery', title: 'Proper Break', eyebrow: 'RESET',
    description: 'Take a real lunch and reset before the afternoon run.',
    effects: { recovery: 3, relationship: 1, durationOverrideMinutes: 45 },
    effectLabels: ['RECOVERY +3', 'DRIVER RELATIONSHIP +1', 'LUNCH 45 MIN'],
  },
  {
    id: 'power-nap', category: 'recovery', title: 'Power Nap + Snack', eyebrow: 'RECOVER',
    description: 'Keep it quiet, eat light, and get a short reset before the next leg.',
    effects: { recovery: 4, relationship: 0, durationOverrideMinutes: 45 },
    effectLabels: ['RECOVERY +4', 'LUNCH 45 MIN'],
  },
  {
    id: 'healthy-meal', category: 'recovery', title: 'Healthy Meal', eyebrow: 'STEADY',
    description: 'A solid meal without turning lunch into a long stop.',
    effects: { recovery: 3, relationship: 0, durationDelta: 0 },
    effectLabels: ['RECOVERY +3', 'NO TIME CHANGE'],
  },
  {
    id: 'coffee-light-meal', category: 'recovery', title: 'Coffee + Light Meal', eyebrow: 'QUICK RESET',
    description: 'Keep the break simple and come back sharper without adding time.',
    effects: { recovery: 2, relationship: 0, durationDelta: 0 },
    effectLabels: ['RECOVERY +2', 'NO TIME CHANGE'],
  },
  {
    id: 'favorite-spot', category: 'recovery', title: 'Driver Favorite Spot', eyebrow: 'MORALE',
    description: 'Let the driver pick the stop. A little extra time can pay back in morale.',
    effects: { recovery: 3, relationship: 2, durationOverrideMinutes: 45 },
    effectLabels: ['RECOVERY +3', 'DRIVER RELATIONSHIP +2', 'LUNCH 45 MIN'],
  },
  {
    id: 'stretch-walk', category: 'recovery', title: 'Stretch + Walk', eyebrow: 'RESET',
    description: 'Use the break to move around, clear the head, and reset for the afternoon.',
    effects: { recovery: 3, relationship: 1, durationDelta: 0 },
    effectLabels: ['RECOVERY +3', 'DRIVER RELATIONSHIP +1'],
  },

  {
    id: 'quick-bite', category: 'efficiency', title: 'Quick Bite', eyebrow: 'SAVE TIME',
    description: 'Grab something fast and protect the afternoon schedule.',
    effects: { recovery: -1, relationship: 0, durationOverrideMinutes: 20 },
    effectLabels: ['LUNCH 20 MIN', 'RECOVERY -1'],
  },
  {
    id: 'fuel-and-lunch', category: 'efficiency', title: 'Fuel + Lunch', eyebrow: 'DOUBLE UP',
    description: 'Combine the break with a fuel stop and avoid another interruption later.',
    effects: { recovery: 1, relationship: 0, durationDelta: 0, prepBonusMinutes: 10 },
    effectLabels: ['RECOVERY +1', 'AFTERNOON PREP +10'],
  },
  {
    id: 'stage-next-stop', category: 'efficiency', title: 'Stage Near Next Stop', eyebrow: 'POSITION',
    description: 'Take lunch close to the next facility and be ready when the window opens.',
    requiresNextStop: true,
    effects: { recovery: 0, relationship: 0, durationDelta: 0, earlyCheckInBonusMinutes: 15 },
    effectLabels: ['NEXT FACILITY EARLY CHECK +15', 'RECOVERY NEUTRAL'],
  },
  {
    id: 'eat-near-pickup', category: 'efficiency', title: 'Eat Near Next Pickup', eyebrow: 'POSITION',
    description: 'Keep the break close to the next pickup and cut down the transition afterward.',
    requiresNextPickup: true,
    effects: { recovery: 1, relationship: 0, durationDelta: 0, earlyCheckInBonusMinutes: 10 },
    effectLabels: ['NEXT PICKUP EARLY CHECK +10', 'RECOVERY +1'],
  },
  {
    id: 'grab-and-go', category: 'efficiency', title: 'Grab-and-Go', eyebrow: 'PROTECT APPOINTMENT',
    description: 'Shorten lunch and keep the truck moving when the plan is getting tight.',
    requiresTightSchedule: true,
    effects: { recovery: -2, relationship: -1, durationOverrideMinutes: 20 },
    effectLabels: ['LUNCH 20 MIN', 'RECOVERY -2', 'DRIVER RELATIONSHIP -1'],
  },
  {
    id: 'schedule-slack', category: 'efficiency', title: 'Use the Schedule Slack', eyebrow: 'TAKE THE TIME',
    description: 'The day has room. Let the break breathe without putting the next stop at risk.',
    requiresSlackSchedule: true,
    effects: { recovery: 4, relationship: 1, durationOverrideMinutes: 60 },
    effectLabels: ['RECOVERY +4', 'DRIVER RELATIONSHIP +1', 'LUNCH 60 MIN'],
  },

  {
    id: 'facility-cafeteria', category: 'opportunity', title: 'Facility Cafeteria', eyebrow: 'GOODWILL',
    description: 'Take lunch on-site and build a little familiarity with the facility team.',
    requiresFacilityContext: true,
    effects: { recovery: 2, relationship: 0, durationDelta: 0, earlyCheckInBonusMinutes: 10 },
    effectLabels: ['RECOVERY +2', 'NEXT FACILITY EARLY CHECK +10'],
  },
  {
    id: 'early-paperwork', category: 'opportunity', title: 'Handle Early Paperwork', eyebrow: 'GET AHEAD',
    description: 'Use part of lunch to get paperwork squared away before the next facility move.',
    requiresNextStop: true,
    effects: { recovery: -1, relationship: 0, durationDelta: 0, earlyCheckInBonusMinutes: 20 },
    effectLabels: ['NEXT FACILITY EARLY CHECK +20', 'RECOVERY -1'],
  },
  {
    id: 'metroline-driver-lunch', category: 'opportunity', title: 'Lunch With a Metroline Driver', eyebrow: 'NETWORK',
    description: 'Use the break to swap road notes with another driver from the carrier.',
    effects: { recovery: 2, relationship: 2, durationOverrideMinutes: 45 },
    effectLabels: ['RECOVERY +2', 'DRIVER RELATIONSHIP +2', 'LUNCH 45 MIN'],
  },
  {
    id: 'local-deli', category: 'opportunity', title: 'Try the Local Deli', eyebrow: 'MORALE',
    description: 'Let the driver pick something local instead of another rushed chain stop.',
    effects: { recovery: 2, relationship: 2, durationDelta: 0 },
    effectLabels: ['RECOVERY +2', 'DRIVER RELATIONSHIP +2'],
  },
  {
    id: 'quiet-admin', category: 'opportunity', title: 'Lunch + Admin', eyebrow: 'CATCH UP',
    description: 'Use the break to organize paperwork and messages before the afternoon rush.',
    effects: { recovery: 0, relationship: 0, durationDelta: 0, prepBonusMinutes: 15 },
    effectLabels: ['AFTERNOON PREP +15', 'RECOVERY NEUTRAL'],
  },
  {
    id: 'driver-choice', category: 'opportunity', title: 'Let the Driver Choose', eyebrow: 'TRUST',
    description: 'Give the driver control of the break and bank a little goodwill.',
    effects: { recovery: 2, relationship: 3, durationOverrideMinutes: 45 },
    effectLabels: ['RECOVERY +2', 'DRIVER RELATIONSHIP +3', 'LUNCH 45 MIN'],
  },
]


function getNearestRouteIndex(location, routeShape = []) {
  if (!location || !Array.isArray(routeShape) || !routeShape.length) return { index: -1, distanceMiles: Number.POSITIVE_INFINITY }
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < routeShape.length; index += 1) {
    const point = routeShape[index]
    if (!Array.isArray(point) || point.length < 2) continue
    const distanceMiles = getLocationDistanceMiles(location, { longitude: point[0], latitude: point[1] })
    if (distanceMiles < bestDistance) {
      bestDistance = distanceMiles
      bestIndex = index
    }
  }
  return { index: bestIndex, distanceMiles: bestDistance }
}

function getRouteMilesBetween(routeShape = [], startIndex = 0, endIndex = 0) {
  if (!Array.isArray(routeShape) || routeShape.length < 2) return Number.POSITIVE_INFINITY
  const start = Math.max(0, Math.min(routeShape.length - 1, startIndex))
  const end = Math.max(start, Math.min(routeShape.length - 1, endIndex))
  let miles = 0
  for (let index = start + 1; index <= end; index += 1) {
    const previous = routeShape[index - 1]
    const point = routeShape[index]
    if (!Array.isArray(previous) || !Array.isArray(point)) continue
    miles += getLocationDistanceMiles(
      { longitude: previous[0], latitude: previous[1] },
      { longitude: point[0], latitude: point[1] },
    )
  }
  return miles
}

export function getLunchCandidateStops({ driver, loads = [], runtimePosition = null }) {
  if (!driver) return []
  const activeLoad = loads.find((load) => load.assignedDriverId === driver.id && ['en-route-pickup', 'en-route-delivery'].includes(load.tripStatus))
    || loads.find((load) => load.assignedDriverId === driver.id && !['completed', 'delivered', 'expired', 'queued'].includes(load.tripStatus))
    || null
  const activeRoute = activeLoad?.tripStatus === 'en-route-delivery'
    ? activeLoad.plannedLoadedRouteGeometry
    : activeLoad?.plannedDeadheadRouteGeometry
  const origin = runtimePosition || (Number.isFinite(driver.longitude) && Number.isFinite(driver.latitude) ? driver : null)
  const hasLiveRoute = Array.isArray(activeRoute) && activeRoute.length >= 2 && origin
  const originProjection = hasLiveRoute ? getNearestRouteIndex(origin, activeRoute) : { index: -1, distanceMiles: Number.POSITIVE_INFINITY }
  const minimumForwardMiles = 0.2
  const candidates = mapLocations.filter((location) => ['staging', 'lunch-food'].includes(location.type))
    .map((location) => {
      const projection = hasLiveRoute ? getNearestRouteIndex(location, activeRoute) : { index: -1, distanceMiles: Number.POSITIVE_INFINITY }
      const aheadOnRoute = hasLiveRoute && projection.index >= originProjection.index
      const forwardRouteMiles = aheadOnRoute ? getRouteMilesBetween(activeRoute, originProjection.index, projection.index) : Number.POSITIVE_INFINITY
      const fromDriverMiles = origin ? getLocationDistanceMiles(origin, location) : Number.POSITIVE_INFINITY
      return {
        ...location,
        offRouteMiles: projection.distanceMiles,
        fromDriverMiles,
        forwardRouteMiles,
        aheadOnRoute: aheadOnRoute && forwardRouteMiles >= minimumForwardMiles,
        lunchStopType: location.type === 'staging' ? 'TRUCK STOP' : 'FOOD STOP',
      }
    })

  // B.5.3.2.4 — route direction is authoritative. Prefer stops projected onto
  // the remaining route ahead of the truck so a lunch suggestion never asks the
  // dispatcher to send the driver backward just because that POI is nearby.
  const aheadCorridor = candidates.filter((location) => location.aheadOnRoute && Number.isFinite(location.offRouteMiles) && location.offRouteMiles <= 5.5)
  const aheadFallback = candidates.filter((location) => location.aheadOnRoute)
  // B.5.3.3.2 — never let a sparse route corridor erase Lunch Planning.
  // Prefer true route-ahead stops, then fill any missing slots from the nearest
  // remaining physical lunch POIs. This keeps the three-choice workflow usable
  // near the end of a leg without continuously reshuffling the open panel.
  const preferred = hasLiveRoute ? (aheadCorridor.length >= 3 ? aheadCorridor : aheadFallback) : candidates
  const preferredIds = new Set(preferred.map((location) => location.id))
  const source = preferred.length >= 3 ? preferred : [
    ...preferred,
    ...candidates.filter((location) => !preferredIds.has(location.id)),
  ]
  return source
    .sort((a, b) => {
      const aBehindPenalty = a.aheadOnRoute ? 0 : 10000
      const bBehindPenalty = b.aheadOnRoute ? 0 : 10000
      const aScore = aBehindPenalty + (a.offRouteMiles * 4) + (Number.isFinite(a.forwardRouteMiles) ? a.forwardRouteMiles * 0.08 : a.fromDriverMiles * 0.2)
      const bScore = bBehindPenalty + (b.offRouteMiles * 4) + (Number.isFinite(b.forwardRouteMiles) ? b.forwardRouteMiles * 0.08 : b.fromDriverMiles * 0.2)
      return aScore - bScore
    })
    .slice(0, 3)
}

export function getLunchOptionById(id) {
  return LUNCH_DECISION_OPTIONS.find((option) => option.id === id) || null
}

export function getLunchDecisionChoices({ driver, loads = [], runtimePosition = null }) {
  // B.5.3.2.5 — physical locations are now the lunch decision itself. The old
  // recovery/efficiency/opportunity cards were a separate gameplay system and
  // caused two competing lunch concepts to appear at once.
  const stops = getLunchCandidateStops({ driver, loads, runtimePosition })
  return stops.slice(0, 3).map((stop, index) => ({
    id: `lunch-stop:${stop.id}`,
    category: stop.type === 'staging' ? 'truck-stop' : 'food-stop',
    eyebrow: stop.lunchStopType || (stop.type === 'staging' ? 'TRUCK STOP' : 'FOOD STOP'),
    title: stop.name,
    description: Number.isFinite(stop.forwardRouteMiles)
      ? `${stop.forwardRouteMiles.toFixed(1)} mi ahead on the remaining route.`
      : 'Available near the current route.',
    effectLabels: [],
    effects: {},
    lunchStop: stop,
    optionIndex: index,
  }))
}


const LUNCH_DECISION_UNSAFE_STATUSES = new Set([
  'checking-in-pickup', 'checking-in-delivery',
  'checked-in-pickup', 'checked-in-delivery',
  'loading-at-pickup', 'unloading-delivery', 'pickup-issue',
])

export function getLunchPlanningContext({ driver, loads = [], gameTime }) {
  if (!driver || !gameTime) return null
  const currentDay = Number(gameTime.gameDayIndex || 0)
  const nowMinute = Number(gameTime.totalMinutesOfDay || 0)
  const nowAbsolute = currentDay * 1440 + nowMinute

  // A cross-midnight carrier shift remains owned by the day it started. Look at
  // today first, then yesterday so lunch/break state does not disappear at 12 AM.
  const ownership = resolveDriverWorkdayOwnership({ driver, loads, gameTime })
  const candidateDays = Array.from(new Set([ownership.ownerDayIndex, currentDay, currentDay - 1].filter(Number.isFinite)))
  for (const ownerDay of candidateDays) {
    const workday = driver.workdayByDay?.[String(ownerDay)] || driver.workdayByDay?.[ownerDay]
    if (!workday || workday.isDayOff) continue

    const shiftStart = Number(workday.startMinutes)
    const shiftEnd = Number(workday.endMinutes)
    if (!Number.isFinite(shiftStart) || !Number.isFinite(shiftEnd)) continue
    const shiftStartAbsolute = ownerDay * 1440 + shiftStart
    const shiftEndAbsolute = ownerDay * 1440 + shiftEnd + (shiftEnd <= shiftStart ? 1440 : 0)
    if (nowAbsolute < shiftStartAbsolute || nowAbsolute > shiftEndAbsolute) continue

    const plannedStart = Number(workday.lunchWindowStartMinutes)
    const plannedEnd = Number(workday.lunchWindowEndMinutes)
    const legacyStart = Number(workday.lunchStartMinutes)
    const duration = Math.max(20, Number(workday.lunchDurationMinutes || 30))

    let windowStartMinute = Number.isFinite(plannedStart) ? plannedStart : legacyStart
    if (!Number.isFinite(windowStartMinute)) return { ownerDay, workday, nowAbsolute, shiftStartAbsolute, shiftEndAbsolute, hasPlan: false }

    let windowEndMinute
    if (Number.isFinite(plannedStart) && Number.isFinite(plannedEnd)) {
      windowEndMinute = plannedEnd
    } else {
      // Legacy saves had one lunch start time rather than a planning window.
      // Preserve their behavior with a usable planning period through late shift.
      windowEndMinute = shiftEnd - 20
    }

    let windowStartAbsolute = ownerDay * 1440 + windowStartMinute
    let windowEndAbsolute = ownerDay * 1440 + windowEndMinute
    if (windowStartAbsolute < shiftStartAbsolute) windowStartAbsolute += 1440
    if (windowEndAbsolute <= windowStartAbsolute) windowEndAbsolute += 1440
    windowEndAbsolute = Math.min(windowEndAbsolute, shiftEndAbsolute - 20)

    return {
      ownerDay,
      workday,
      nowAbsolute,
      shiftStartAbsolute,
      shiftEndAbsolute,
      windowStartAbsolute,
      windowEndAbsolute,
      durationMinutes: duration,
      hasPlan: true,
      source: Number.isFinite(plannedStart) && Number.isFinite(plannedEnd) ? 'dispatcher-window' : 'legacy-start',
    }
  }
  return null
}

export function isLunchDecisionReady({ driver, loads = [], gameTime }) {
  const context = getLunchPlanningContext({ driver, loads, gameTime })
  if (!context?.hasPlan || context.workday?.lunchEvent?.selectedChoiceId) return false
  if (context.nowAbsolute < context.windowStartAbsolute || context.nowAbsolute > context.windowEndAbsolute) return false

  const activeLoad = loads.find((load) => load.assignedDriverId === driver.id && !['completed', 'delivered', 'expired'].includes(load.tripStatus)) || null
  if (activeLoad && LUNCH_DECISION_UNSAFE_STATUSES.has(activeLoad.tripStatus)) return false
  return true
}

export function getDriverLunchEvent(driver, gameTime) {
  const context = getLunchPlanningContext({ driver, gameTime })
  return context?.workday?.lunchEvent || null
}

export function hasLunchMovementAuthority(driver, gameTime) {
  const event = getDriverLunchEvent(driver, gameTime)
  return ['calculating', 'traveling', 'arrived', 'on-lunch', 'resume-calculating', 'resume-access'].includes(driver?.lunchRouteStatus)
    || ['routing', 'on-lunch', 'resuming'].includes(event?.status)
}

export function isDriverOnLunch(driver, gameTime) {
  const event = getDriverLunchEvent(driver, gameTime)
  if (!event || event.status !== 'on-lunch') return false
  const now = Number(gameTime.gameDayIndex || 0) * 1440 + Number(gameTime.totalMinutesOfDay || 0)
  const start = Number(event.actualStartGameMinute)
  const end = Number(event.endGameMinute)
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end
}

export function applyLunchDuration(baseDuration, durationOverrideMinutes = null) {
  const hasOverride = durationOverrideMinutes !== null && durationOverrideMinutes !== undefined && Number.isFinite(Number(durationOverrideMinutes))
  const target = hasOverride ? Number(durationOverrideMinutes) : Number(baseDuration || 30)
  return Math.max(20, Math.min(60, Math.round(target)))
}
