const GAME_START_DATE = Date.UTC(2026, 8, 7)

export function getCalendarDate(dayIndex) {
  return new Date(GAME_START_DATE + dayIndex * 24 * 60 * 60 * 1000)
}

export function formatCompactDate(dayIndex) {
  const date = getCalendarDate(dayIndex)
  return `${date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()} ${date.getUTCDate()}`
}

export function formatTime(totalMinutes) {
  const normalizedMinutes = Math.round(totalMinutes)
  const hour = Math.floor(normalizedMinutes / 60)
  const minute = normalizedMinutes % 60
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function formatAppointment(dayIndex, startMinutes, endMinutes) {
  return `${formatCompactDate(dayIndex)} • ${formatTime(startMinutes)} – ${formatTime(endMinutes)}`
}
