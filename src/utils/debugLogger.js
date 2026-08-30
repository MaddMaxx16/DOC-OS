export function logDocOsState(snapshot) {
  if (!import.meta.env.DEV) return
  console.groupCollapsed('DOC OS STATE CHANGE')
  Object.entries(snapshot).forEach(([key, value]) => console.log(`${key}:`, value))
  console.groupEnd()
}

export function logDocOsEvent(event) {
  if (import.meta.env.DEV) console.log(`EVENT: ${event}`)
}
