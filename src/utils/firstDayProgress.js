import { isRateConfirmationConfirmed } from './rateConfirmation.js'

export function normalizeFirstDayProgress(value) {
  if (!value || !['welcome', 'schedule', 'lunch', 'freight', 'restOfDay', 'secondLane', 'shiftEnd', 'ready'].includes(value.step)) return null
  return {
    step: value.step,
    messageIndex: Math.max(0, Math.min(2, Number.isInteger(value.messageIndex) ? value.messageIndex : 0)),
    ...(value.workdayLessonComplete === true ? { workdayLessonComplete: true } : {}),
    ...(value.flowVersion === 2 ? { flowVersion: 2 } : {}),
    ...(typeof value.firstLaneId === 'string' ? { firstLaneId: value.firstLaneId } : {}),
    ...(typeof value.laneReviewLoadId === 'string' ? { laneReviewLoadId: value.laneReviewLoadId, laneReviewIndex: Math.max(0, Math.min(4, Number.isInteger(value.laneReviewIndex) ? value.laneReviewIndex : 0)) } : {}),
    ...(typeof value.reviewLoadId === 'string' ? { reviewLoadId: value.reviewLoadId } : {}),
  }
}

export function getFirstDayBookedLanes(loads = []) {
  return loads.filter((load) => (load.assignedDriverId === 'marcus' || load.completedDriverId === 'marcus')
    && !['available', 'cancelled', 'expired'].includes(String(load.status || '').toLowerCase()))
}

export function migrateFirstDayFlow(value, loads = []) {
  const progress = normalizeFirstDayProgress(value)
  if (!progress || progress.flowVersion === 2) return progress
  const first = getFirstDayBookedLanes(loads)[0]
  const step = ['lunch', 'shiftEnd', 'freight'].includes(progress.step)
    ? (first ? 'restOfDay' : 'freight') : progress.step
  return { ...progress, step, flowVersion: 2, ...(first ? { firstLaneId: first.id } : {}) }
}

export function shouldTeachFirstDayRest(progress, loads = []) {
  return progress?.step === 'freight' && isRateConfirmationConfirmed(getFirstDayBookedLanes(loads)[0])
}

export function shouldTeachFirstDayShiftEnd(progress, loads = []) {
  if (progress?.step !== 'secondLane' || !progress.reviewLoadId) return false
  const booked = getFirstDayBookedLanes(loads)
  if (!booked.some((load) => load.id === progress.firstLaneId)) return false
  return booked.some((load) => load.id === progress.reviewLoadId && load.id !== progress.firstLaneId
    && (load.tripPlan?.legs?.loaded?.routeGeometry?.length >= 2 || load.plannedLoadedRouteGeometry?.length >= 2))
}

export function isFirstDayTeachingPaused(progress, loads = []) {
  return ['welcome', 'schedule', 'lunch', 'shiftEnd'].includes(progress?.step)
    || (progress?.flowVersion === 2 && ['freight', 'restOfDay', 'secondLane'].includes(progress.step))
    || shouldTeachFirstDayRest(progress, loads) || shouldTeachFirstDayShiftEnd(progress, loads)
}
