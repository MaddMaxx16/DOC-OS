import { isRateConfirmationConfirmed } from './rateConfirmation.js'

export function normalizeFirstDayProgress(value) {
  if (!value || !['welcome', 'schedule', 'lunch', 'freight', 'restOfDay', 'secondLane', 'shiftEnd', 'ready'].includes(value.step)) return null
  return {
    step: value.step,
    messageIndex: Math.max(0, Math.min(2, Number.isInteger(value.messageIndex) ? value.messageIndex : 0)),
    ...(value.workdayLessonComplete === true ? { workdayLessonComplete: true } : {}),
    ...(Number(value.flowVersion) >= 2 ? { flowVersion: Number(value.flowVersion) } : {}),
    ...(typeof value.firstLaneId === 'string' ? { firstLaneId: value.firstLaneId } : {}),
    ...(typeof value.laneReviewLoadId === 'string'
      ? { laneReviewLoadId: value.laneReviewLoadId, laneReviewIndex: Math.max(0, Math.min(4, Number.isInteger(value.laneReviewIndex) ? value.laneReviewIndex : 0)) }
      : {}),
    ...(typeof value.reviewLoadId === 'string' ? { reviewLoadId: value.reviewLoadId } : {}),
  }
}

export function getFirstDayBookedLanes(loads = []) {
  return loads.filter((load) => (load.assignedDriverId === 'marcus' || load.completedDriverId === 'marcus')
    && !['available', 'cancelled', 'expired'].includes(String(load.status || '').toLowerCase()))
}

export function migrateFirstDayFlow(value, loads = []) {
  const progress = normalizeFirstDayProgress(value)
  if (!progress) return null
  if (progress.flowVersion >= 3) return progress

  const first = getFirstDayBookedLanes(loads)[0]
  let step = progress.step

  // Flow v3 removes the opening Driver Scheduler detour. The shift is a
  // briefing constraint, then the player goes directly to FreightLink.
  if (step === 'schedule') step = first ? 'restOfDay' : 'freight'
  if (['lunch', 'shiftEnd'].includes(step) && !first) step = 'freight'
  if (step === 'freight' && first) step = 'restOfDay'

  return {
    ...progress,
    step,
    flowVersion: 3,
    laneReviewIndex: Math.max(0, Math.min(4, Number(progress.laneReviewIndex || 0))),
    ...(first ? { firstLaneId: first.id } : {}),
  }
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
  return ['welcome', 'lunch', 'shiftEnd'].includes(progress?.step)
    || (Number(progress?.flowVersion || 0) >= 2 && ['freight', 'restOfDay', 'secondLane'].includes(progress.step))
    || shouldTeachFirstDayRest(progress, loads) || shouldTeachFirstDayShiftEnd(progress, loads)
}
