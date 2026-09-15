import { buildDriverItinerary } from './driverItinerary.js'

function hashText(value = '') {
  let hash = 0
  const text = String(value)
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0
  return Math.abs(hash)
}

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

export function getLunchOptionById(id) {
  return LUNCH_DECISION_OPTIONS.find((option) => option.id === id) || null
}

function nextStopsForDriver(loads = [], driverId) {
  try {
    return buildDriverItinerary(loads, driverId).filter((stop) => stop.state !== 'completed')
  } catch {
    return []
  }
}

function getContext({ driver, loads = [], gameTime }) {
  const now = Number(gameTime?.gameDayIndex || 0) * 1440 + Number(gameTime?.totalMinutesOfDay || 0)
  const stops = nextStopsForDriver(loads, driver?.id)
  const nextStop = stops[0] || null
  const nextPickup = stops.find((stop) => stop.type === 'pickup') || null
  const activeLoad = loads.find((load) => load.assignedDriverId === driver?.id && !['completed', 'delivered', 'expired'].includes(load.tripStatus)) || null
  const facilityContext = Boolean(activeLoad && ['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery'].includes(activeLoad.tripStatus))
  const nextWindowAbsolute = nextStop && Number.isFinite(nextStop.dayIndex) && Number.isFinite(nextStop.windowStartMinutes)
    ? nextStop.dayIndex * 1440 + nextStop.windowStartMinutes
    : null
  const minutesToNextWindow = Number.isFinite(nextWindowAbsolute) ? nextWindowAbsolute - now : null
  return {
    hasNextStop: Boolean(nextStop),
    hasNextPickup: Boolean(nextPickup),
    facilityContext,
    tightSchedule: Number.isFinite(minutesToNextWindow) && minutesToNextWindow <= 75,
    slackSchedule: !Number.isFinite(minutesToNextWindow) || minutesToNextWindow >= 120,
  }
}

function optionAllowed(option, context) {
  if (option.requiresNextStop && !context.hasNextStop) return false
  if (option.requiresNextPickup && !context.hasNextPickup) return false
  if (option.requiresFacilityContext && !context.facilityContext) return false
  if (option.requiresTightSchedule && !context.tightSchedule) return false
  if (option.requiresSlackSchedule && !context.slackSchedule) return false
  return true
}

function pickOne(list, seed, usedIds = new Set()) {
  const available = list.filter((item) => !usedIds.has(item.id))
  const source = available.length ? available : list
  if (!source.length) return null
  return source[hashText(seed) % source.length]
}

export function getLunchDecisionChoices({ driver, loads = [], gameTime, operationDay = 1 }) {
  const context = getContext({ driver, loads, gameTime })
  const history = Array.isArray(driver?.lunchOfferHistory) ? driver.lunchOfferHistory : []
  const recentIds = new Set(history.slice(-2).flatMap((entry) => Array.isArray(entry?.optionIds) ? entry.optionIds : []))
  const allowed = LUNCH_DECISION_OPTIONS.filter((option) => optionAllowed(option, context))
  const used = new Set()
  const categories = ['recovery', 'efficiency', 'opportunity']
  const choices = categories.map((category, index) => {
    const categoryOptions = allowed.filter((option) => option.category === category && !recentIds.has(option.id))
    const fallback = allowed.filter((option) => option.category === category)
    const choice = pickOne(categoryOptions.length ? categoryOptions : fallback, `${driver?.id}:${operationDay}:${category}:${index}`, used)
    if (choice) used.add(choice.id)
    return choice
  }).filter(Boolean)

  if (choices.length < 3) {
    const remaining = allowed.filter((option) => !used.has(option.id) && !recentIds.has(option.id))
    while (choices.length < 3 && remaining.length) {
      const choice = pickOne(remaining, `${driver?.id}:${operationDay}:fill:${choices.length}`, used)
      if (!choice) break
      choices.push(choice)
      used.add(choice.id)
    }
  }

  return choices.slice(0, 3)
}



const LUNCH_DECISION_UNSAFE_STATUSES = new Set([
  'en-route-pickup', 'en-route-delivery',
  'checking-in-pickup', 'checking-in-delivery',
  'checked-in-pickup', 'checked-in-delivery',
  'loading-at-pickup', 'unloading-delivery', 'pickup-issue',
])

export function isLunchDecisionReady({ driver, loads = [], gameTime }) {
  if (!driver || !gameTime) return false
  const dayIndex = Number(gameTime.gameDayIndex || 0)
  const workday = driver.workdayByDay?.[String(dayIndex)] || driver.workdayByDay?.[dayIndex]
  if (!workday || workday.lunchEvent?.selectedChoiceId) return false

  const nowAbsolute = dayIndex * 1440 + Number(gameTime.totalMinutesOfDay || 0)
  const lunchStartAbsolute = dayIndex * 1440 + Number(workday.lunchStartMinutes)
  const endAbsolute = dayIndex * 1440 + Number(workday.endMinutes)
  if (![lunchStartAbsolute, endAbsolute].every(Number.isFinite)) return false
  if (nowAbsolute < lunchStartAbsolute || nowAbsolute > endAbsolute - 20) return false

  const activeLoad = loads.find((load) => load.assignedDriverId === driver.id && !['completed', 'delivered', 'expired'].includes(load.tripStatus)) || null
  if (activeLoad && LUNCH_DECISION_UNSAFE_STATUSES.has(activeLoad.tripStatus)) return false
  return true
}

export function isDriverOnLunch(driver, gameTime) {
  if (!driver || !gameTime) return false
  const dayIndex = Number(gameTime.gameDayIndex || 0)
  const workday = driver.workdayByDay?.[String(dayIndex)] || driver.workdayByDay?.[dayIndex]
  if (!workday?.lunchEvent?.selectedChoiceId) return false
  const now = Number(gameTime.totalMinutesOfDay || 0)
  const start = Number(workday.lunchStartMinutes)
  const end = start + Number(workday.lunchDurationMinutes || 0)
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end
}

export function applyLunchDuration(baseDuration, durationOverrideMinutes = null) {
  const hasOverride = durationOverrideMinutes !== null && durationOverrideMinutes !== undefined && Number.isFinite(Number(durationOverrideMinutes))
  const target = hasOverride ? Number(durationOverrideMinutes) : Number(baseDuration || 30)
  return Math.max(20, Math.min(60, Math.round(target)))
}
