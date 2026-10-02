export function normalizeFirstDayProgress(value) {
  if (!value || !['welcome', 'schedule', 'ready'].includes(value.step)) return null
  return {
    step: value.step,
    messageIndex: Math.max(0, Math.min(2, Number.isInteger(value.messageIndex) ? value.messageIndex : 0)),
  }
}
