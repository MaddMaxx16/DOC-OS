import { isRateConfirmationConfirmed } from './rateConfirmation.js'

const FIRST_DAY_STEPS = [
  'welcome',
  'schedule',
  'freight',
  'restOfDay',
  'lunch',
  'thirdLoad',
  'staging',
  'ready',
  // Legacy v1-v3 steps kept only so older saves can migrate forward.
  'secondLane',
  'shiftEnd',
]

function loadOrder(load) {
  if (Number.isFinite(Number(load?.queuePosition))) return Number(load.queuePosition)
  const pickupDay = Number.isFinite(Number(load?.pickupDayIndex)) ? Number(load.pickupDayIndex) : 0
  const pickupMinute = Number.isFinite(Number(load?.pickupWindowStartMinutes)) ? Number(load.pickupWindowStartMinutes) : 0
  return pickupDay * 1440 + pickupMinute
}

export function normalizeFirstDayProgress(value) {
  if (!value || !FIRST_DAY_STEPS.includes(value.step)) return null
  return {
    step: value.step,
    messageIndex: Math.max(0, Math.min(2, Number.isInteger(value.messageIndex) ? value.messageIndex : 0)),
    ...(value.workdayLessonComplete === true ? { workdayLessonComplete: true } : {}),
    ...(Number(value.flowVersion) >= 2 ? { flowVersion: Number(value.flowVersion) } : {}),
    ...(typeof value.firstLaneId === 'string' ? { firstLaneId: value.firstLaneId } : {}),
    ...(typeof value.secondLaneId === 'string' ? { secondLaneId: value.secondLaneId } : {}),
    ...(typeof value.thirdLaneId === 'string' ? { thirdLaneId: value.thirdLaneId } : {}),
    ...(typeof value.laneReviewLoadId === 'string'
      ? { laneReviewLoadId: value.laneReviewLoadId, laneReviewIndex: Math.max(0, Math.min(4, Number.isInteger(value.laneReviewIndex) ? value.laneReviewIndex : 0)) }
      : {}),
    ...(typeof value.reviewLoadId === 'string' ? { reviewLoadId: value.reviewLoadId } : {}),
  }
}

export function getFirstDayBookedLanes(loads = []) {
  return loads
    .filter((load) => {
      const status = String(load.status || '').toLowerCase()
      const owned = load.assignedDriverId === 'marcus' || load.completedDriverId === 'marcus'
      const terminalComplete = ['completed', 'paid', 'delivered'].includes(status)
      return owned
        && !['available', 'cancelled', 'expired'].includes(status)
        && (isRateConfirmationConfirmed(load) || terminalComplete)
    })
    .sort((a, b) => loadOrder(a) - loadOrder(b))
}

export function migrateFirstDayFlow(value, loads = []) {
  const progress = normalizeFirstDayProgress(value)
  if (!progress) return null
  if (progress.flowVersion >= 5) return progress

  const booked = getFirstDayBookedLanes(loads)
  const [first, second, third] = booked

  if (progress.step === 'welcome') {
    return { ...progress, flowVersion: 5 }
  }

  if (progress.workdayLessonComplete || progress.step === 'ready') {
    return {
      ...progress,
      step: 'ready',
      flowVersion: 5,
      workdayLessonComplete: progress.workdayLessonComplete === true,
      ...(first ? { firstLaneId: first.id } : {}),
      ...(second ? { secondLaneId: second.id } : {}),
      ...(third ? { thirdLaneId: third.id } : {}),
    }
  }

  let step = 'freight'
  if (booked.length === 1) step = 'restOfDay'
  else if (booked.length === 2) step = 'lunch'
  else if (booked.length >= 3) step = 'staging'

  const migrated = {
    ...progress,
    step,
    flowVersion: 5,
    laneReviewIndex: booked.length ? Math.max(0, Math.min(4, Number(progress.laneReviewIndex || 0))) : 0,
    ...(first ? { firstLaneId: first.id } : {}),
    ...(second ? { secondLaneId: second.id } : {}),
    ...(third ? { thirdLaneId: third.id } : {}),
  }

  if (!booked.length) {
    delete migrated.laneReviewLoadId
    delete migrated.reviewLoadId
    delete migrated.firstLaneId
    delete migrated.secondLaneId
    delete migrated.thirdLaneId
  } else if (booked.length >= 2) {
    delete migrated.reviewLoadId
  }

  return migrated
}

export function shouldTeachFirstDayRest(progress, loads = []) {
  return progress?.step === 'freight' && getFirstDayBookedLanes(loads).length >= 1
}

export function shouldTeachFirstDayLunch(progress, loads = []) {
  return progress?.step === 'restOfDay' && getFirstDayBookedLanes(loads).length >= 2
}

export function shouldTeachFirstDayStaging(progress, loads = []) {
  return progress?.step === 'thirdLoad' && getFirstDayBookedLanes(loads).length >= 3
}

// Desktop Experience V2 defers the guided Day 1 lesson until V2.11.
// Keep the progression model intact for save compatibility, but it no longer
// owns the simulation clock while the real workstation systems are rebuilt.
export function isFirstDayTeachingPaused() {
  return false
}
