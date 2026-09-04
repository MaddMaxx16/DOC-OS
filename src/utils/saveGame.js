const LEGACY_SAVE_KEY = 'doc-os-save-v1'
const SAVE_STORE_KEY = 'doc-os-saves-v2'
const ACTIVE_SLOT_KEY = 'doc-os-active-save-v2'
const VERSION = 2

export const SAVE_SLOT_IDS = ['save-01', 'save-02', 'save-03']

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_STORE_KEY))
    if (parsed?.version === VERSION && parsed.slots) return parsed
  } catch {}

  // Backward-compatible migration from the original single-slot save.
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_SAVE_KEY))
    if (legacy?.state) {
      const migrated = {
        version: VERSION,
        slots: {
          'save-01': {
            savedAt: legacy.savedAt || new Date().toISOString(),
            state: legacy.state,
          },
        },
      }
      localStorage.setItem(SAVE_STORE_KEY, JSON.stringify(migrated))
      localStorage.setItem(ACTIVE_SLOT_KEY, 'save-01')
      localStorage.removeItem(LEGACY_SAVE_KEY)
      return migrated
    }
  } catch {}

  return { version: VERSION, slots: {} }
}

function writeStore(store) {
  localStorage.setItem(SAVE_STORE_KEY, JSON.stringify(store))
}

export function getSaveSlots() {
  const store = readStore()
  return SAVE_SLOT_IDS
    .map((id) => store.slots[id] ? { id, ...store.slots[id] } : null)
    .filter(Boolean)
}

export function getActiveSaveSlot() {
  const store = readStore()
  const active = localStorage.getItem(ACTIVE_SLOT_KEY)
  if (active && store.slots[active]) return active
  return getSaveSlots().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0]?.id || null
}

export function setActiveSaveSlot(slotId) {
  if (SAVE_SLOT_IDS.includes(slotId)) localStorage.setItem(ACTIVE_SLOT_KEY, slotId)
}

export function saveGame(state, slotId = getActiveSaveSlot() || SAVE_SLOT_IDS[0]) {
  try {
    const store = readStore()
    store.slots[slotId] = { savedAt: new Date().toISOString(), state }
    writeStore(store)
    setActiveSaveSlot(slotId)
  } catch (error) {
    console.warn('DOC OS save failed', error)
  }
}

export function loadGame(slotId = getActiveSaveSlot()) {
  if (!slotId) return null
  try {
    return readStore().slots[slotId]?.state || null
  } catch {
    return null
  }
}

export function clearSave(slotId = null) {
  if (!slotId) {
    localStorage.removeItem(SAVE_STORE_KEY)
    localStorage.removeItem(ACTIVE_SLOT_KEY)
    localStorage.removeItem(LEGACY_SAVE_KEY)
    return
  }

  const store = readStore()
  delete store.slots[slotId]
  writeStore(store)
  if (localStorage.getItem(ACTIVE_SLOT_KEY) === slotId) {
    const next = SAVE_SLOT_IDS.find((id) => store.slots[id])
    if (next) localStorage.setItem(ACTIVE_SLOT_KEY, next)
    else localStorage.removeItem(ACTIVE_SLOT_KEY)
  }
}

export function hasSave() {
  return getSaveSlots().length > 0
}
