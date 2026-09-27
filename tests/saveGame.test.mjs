import test from 'node:test'
import assert from 'node:assert/strict'

class MemoryStorage {
  constructor() { this.data = new Map(); this.failNextQuotaWrite = false }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null }
  setItem(key, value) {
    if (this.failNextQuotaWrite && key === 'doc-os-saves-v2') {
      this.failNextQuotaWrite = false
      const error = new Error('quota')
      error.name = 'QuotaExceededError'
      throw error
    }
    this.data.set(key, String(value))
  }
  removeItem(key) { this.data.delete(key) }
  clear() { this.data.clear(); this.failNextQuotaWrite = false }
}

globalThis.localStorage = new MemoryStorage()
const saves = await import('../src/utils/saveGame.js')

test.beforeEach(() => localStorage.clear())

test('save/load round trip preserves game state and active slot', () => {
  const state = { gameTime: { gameDayIndex: 3, totalMinutesOfDay: 515 }, drivers: [{ id: 'marcus' }] }
  assert.equal(saves.saveGame(state, 'save-02'), true)
  assert.deepEqual(saves.loadGame('save-02'), state)
  assert.equal(saves.getActiveSaveSlot(), 'save-02')
  assert.equal(saves.hasSave(), true)
  const raw = JSON.parse(localStorage.getItem('doc-os-saves-v2'))
  assert.equal(raw.slots['save-02'].stateVersion, saves.SAVE_STATE_VERSION)
})

test('clearing one slot leaves other saves intact', () => {
  saves.saveGame({ marker: 1 }, 'save-01')
  saves.saveGame({ marker: 2 }, 'save-02')
  saves.clearSave('save-02')
  assert.equal(saves.loadGame('save-02'), null)
  assert.deepEqual(saves.loadGame('save-01'), { marker: 1 })
  assert.equal(saves.getActiveSaveSlot(), 'save-01')
})

test('legacy single-slot saves migrate into save-01 with current state version', () => {
  localStorage.setItem('doc-os-save-v1', JSON.stringify({ savedAt: '2026-09-01T00:00:00.000Z', state: { legacy: true } }))
  assert.deepEqual(saves.loadGame('save-01'), { legacy: true })
  assert.equal(saves.getActiveSaveSlot(), 'save-01')
  assert.equal(localStorage.getItem('doc-os-save-v1'), null)
  const raw = JSON.parse(localStorage.getItem('doc-os-saves-v2'))
  assert.equal(raw.slots['save-01'].stateVersion, saves.SAVE_STATE_VERSION)
})

test('unversioned v2 slots migrate in place to the current state contract', () => {
  localStorage.setItem('doc-os-saves-v2', JSON.stringify({ version: 2, slots: { 'save-01': { savedAt: '2026-09-01T00:00:00.000Z', state: { marker: 'old-v2' } } } }))
  assert.deepEqual(saves.loadGame('save-01'), { marker: 'old-v2' })
  const raw = JSON.parse(localStorage.getItem('doc-os-saves-v2'))
  assert.equal(raw.slots['save-01'].stateVersion, saves.SAVE_STATE_VERSION)
})

test('structurally invalid save state is rejected instead of poisoning a slot', () => {
  assert.equal(saves.saveGame({ drivers: 'not-an-array' }, 'save-01'), false)
  assert.equal(saves.loadGame('save-01'), null)
})

test('quota pressure evicts disposable road cache and retries player save', () => {
  localStorage.setItem('docos-road-route-cache-v1', JSON.stringify({ huge: { routeShape: [[0, 0], [1, 1]] } }))
  localStorage.failNextQuotaWrite = true
  assert.equal(saves.saveGame({ marker: 'protected' }, 'save-01'), true)
  assert.equal(localStorage.getItem('docos-road-route-cache-v1'), null)
  assert.deepEqual(saves.loadGame('save-01'), { marker: 'protected' })
})
