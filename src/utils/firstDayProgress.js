export function normalizeFirstDayProgress(value) {
  if (!value || !['welcome', 'schedule', 'lunch', 'freight', 'shiftEnd', 'ready'].includes(value.step)) return null
  return {
    step: value.step,
    messageIndex: Math.max(0, Math.min(2, Number.isInteger(value.messageIndex) ? value.messageIndex : 0)),
    ...(value.workdayLessonComplete === true ? { workdayLessonComplete: true } : {}),
  }
}

export function shouldTeachFirstDayShiftEnd(progress, loads = []) {
  if (progress?.step !== 'freight') return false
  return loads.some((load) => load.id === 'DOC001' && load.assignedDriverId === 'marcus'
    && !['completed', 'paid', 'cancelled', 'expired', 'delivered'].includes(String(load.status || '').toLowerCase())
    && (load.tripPlan?.legs?.loaded?.routeGeometry?.length >= 2 || load.plannedLoadedRouteGeometry?.length >= 2))
}

export function isFirstDayTeachingPaused(progress, loads = []) {
  return ['welcome', 'schedule', 'lunch', 'shiftEnd'].includes(progress?.step)
    || shouldTeachFirstDayShiftEnd(progress, loads)
}
