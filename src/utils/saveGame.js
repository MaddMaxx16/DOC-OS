const SAVE_KEY = 'doc-os-save-v1'
const VERSION = 1

export function saveGame(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version: VERSION, savedAt: new Date().toISOString(), state })) } catch (error) { console.warn('DOC OS save failed', error) }
}
export function loadGame() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY))
    return parsed?.version === VERSION && parsed.state ? parsed.state : null
  } catch { return null }
}
export function clearSave() { localStorage.removeItem(SAVE_KEY) }
export function hasSave() { return Boolean(loadGame()) }
