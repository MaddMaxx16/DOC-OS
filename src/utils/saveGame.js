import { normalizeCareerState } from './careerState.js'

const LEGACY_SAVE_KEY = 'doc-os-save-v1'
const SAVE_STORE_KEY = 'doc-os-saves-v2'
const ACTIVE_SLOT_KEY = 'doc-os-active-save-v2'
const ROUTE_CACHE_KEY = 'docos-road-route-cache-v1'
const STORE_VERSION = 2
export const SAVE_STATE_VERSION = 2

export const SAVE_SLOT_IDS = ['save-01', 'save-02', 'save-03']

function emptyStore() { return { version: STORE_VERSION, slots: {} } }

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function validateSaveState(state) {
  if (!isRecord(state)) return { ok: false, reason: 'Save state is not an object.' }
  // DOC OS can legitimately save at several stages, so validation is deliberately
  // structural rather than requiring game-only fields such as drivers or loads.
  if ('loads' in state && !Array.isArray(state.loads)) return { ok: false, reason: 'Save loads are invalid.' }
  if ('drivers' in state && !Array.isArray(state.drivers)) return { ok: false, reason: 'Save drivers are invalid.' }
  if ('carriers' in state && !Array.isArray(state.carriers)) return { ok: false, reason: 'Save carriers are invalid.' }
  if ('gameTime' in state && !isRecord(state.gameTime)) return { ok: false, reason: 'Save game time is invalid.' }
  return { ok: true }
}

function migrateState(state, fromVersion = 0) {
  let next = state
  let version = Number.isFinite(fromVersion) ? fromVersion : 0
  if (version > SAVE_STATE_VERSION) return null

  // v0 -> v1 establishes an explicit state contract without rewriting existing
  // player data. Future schema changes get their own migration step here.
  if (version === 0) version = 1

  // v1 -> v2 adds career identity above gameplay state. Saves without explicit
  // metadata are existing independent-dispatch careers by contract.
  if (version === 1) {
    next = { ...next, career: normalizeCareerState(next?.career) }
    version = 2
  }

  // Normalize current-version input as well so corrupt or unknown metadata has
  // the same safe behavior whether it came from storage or a new save call.
  if (version === SAVE_STATE_VERSION) {
    next = { ...next, career: normalizeCareerState(next?.career) }
  }

  const validation = validateSaveState(next)
  return validation.ok ? { state: next, version } : null
}

function normalizeSlot(slot) {
  if (!isRecord(slot) || !('state' in slot)) return null
  const migrated = migrateState(slot.state, Number(slot.stateVersion || 0))
  if (!migrated) return null
  return {
    savedAt: typeof slot.savedAt === 'string' ? slot.savedAt : new Date().toISOString(),
    stateVersion: migrated.version,
    state: migrated.state,
  }
}

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_STORE_KEY))
    if (parsed?.version === STORE_VERSION && isRecord(parsed.slots)) {
      const slots = {}
      let changed = false
      for (const id of SAVE_SLOT_IDS) {
        if (!parsed.slots[id]) continue
        const normalized = normalizeSlot(parsed.slots[id])
        if (normalized) {
          slots[id] = normalized
          if (parsed.slots[id].stateVersion !== normalized.stateVersion) changed = true
        } else changed = true
      }
      const store = { version: STORE_VERSION, slots }
      if (changed) {
        try { localStorage.setItem(SAVE_STORE_KEY, JSON.stringify(store)) } catch { /* load remains usable even if migration cannot persist */ }
      }
      return store
    }
  } catch { /* Invalid or unavailable local save data is treated as empty. */ }

  // Backward-compatible migration from the original single-slot save.
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_SAVE_KEY))
    const normalized = legacy?.state ? normalizeSlot({ savedAt: legacy.savedAt, state: legacy.state, stateVersion: 0 }) : null
    if (normalized) {
      const migrated = { version: STORE_VERSION, slots: { 'save-01': normalized } }
      localStorage.setItem(SAVE_STORE_KEY, JSON.stringify(migrated))
      localStorage.setItem(ACTIVE_SLOT_KEY, 'save-01')
      localStorage.removeItem(LEGACY_SAVE_KEY)
      return migrated
    }
  } catch { /* Invalid or unavailable local save data is treated as empty. */ }

  return emptyStore()
}

function writeStore(store) {
  localStorage.setItem(SAVE_STORE_KEY, JSON.stringify(store))
}

function isQuotaError(error) {
  return error?.name === 'QuotaExceededError' || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error?.code === 22 || error?.code === 1014
}

function emitSaveFailure(error) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('doc-os-save-failed', { detail: { message: error?.message || 'Save storage is unavailable.' } }))
  }
}

export function getSaveSlots() {
  const store = readStore()
  return SAVE_SLOT_IDS.map((id) => store.slots[id] ? { id, ...store.slots[id] } : null).filter(Boolean)
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

export function clearActiveSaveSlot() {
  localStorage.removeItem(ACTIVE_SLOT_KEY)
}

export function saveGame(state, slotId = getActiveSaveSlot() || SAVE_SLOT_IDS[0]) {
  const normalizedState = { ...state, career: normalizeCareerState(state?.career) }
  const validation = validateSaveState(normalizedState)
  if (!validation.ok || !SAVE_SLOT_IDS.includes(slotId)) {
    const error = new Error(validation.ok ? 'Invalid save slot.' : validation.reason)
    console.warn('DOC OS save rejected', error)
    emitSaveFailure(error)
    return false
  }

  const attempt = () => {
    const store = readStore()
    store.slots[slotId] = { savedAt: new Date().toISOString(), stateVersion: SAVE_STATE_VERSION, state: normalizedState }
    writeStore(store)
    setActiveSaveSlot(slotId)
  }

  try {
    attempt()
    return true
  } catch (error) {
    // Route geometry is disposable; player progress is not. If localStorage is full,
    // evict the persisted road cache and retry the save exactly once.
    if (isQuotaError(error)) {
      try {
        localStorage.removeItem(ROUTE_CACHE_KEY)
        attempt()
        return true
      } catch (retryError) {
        console.warn('DOC OS save failed after route-cache eviction', retryError)
        emitSaveFailure(retryError)
        return false
      }
    }
    console.warn('DOC OS save failed', error)
    emitSaveFailure(error)
    return false
  }
}

export function loadGame(slotId = getActiveSaveSlot()) {
  if (!slotId) return null
  return readStore().slots[slotId]?.state || null
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

export function hasSave() { return getSaveSlots().length > 0 }
