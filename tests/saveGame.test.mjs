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
const careerState = await import('../src/utils/careerState.js')
const { initializeMetrolineEmployeeOperation } = await import('../src/utils/employeeCareerInitializer.js')
const { resolveDriverWorkdayOwnership } = await import('../src/utils/driverWorkdayOwnership.js')

test.beforeEach(() => localStorage.clear())

test('save/load round trip preserves game state and active slot', () => {
  const state = { gameTime: { gameDayIndex: 3, totalMinutesOfDay: 515 }, drivers: [{ id: 'marcus' }] }
  assert.equal(saves.saveGame(state, 'save-02'), true)
  assert.deepEqual(saves.loadGame('save-02'), { ...state, career: careerState.createLegacyIndependentCareer() })
  assert.equal(saves.getActiveSaveSlot(), 'save-02')
  assert.equal(saves.hasSave(), true)
  const raw = JSON.parse(localStorage.getItem('doc-os-saves-v2'))
  assert.equal(raw.slots['save-02'].stateVersion, saves.SAVE_STATE_VERSION)
})

test('save/load preserves the facts that derive prior operational workday ownership', () => {
  const state = {
    gameTime: { gameDayIndex: 1, totalMinutesOfDay: 15 },
    drivers: [{ id: 'marcus', workdayByDay: { 0: { startMinutes: 420, endMinutes: 1020 }, 1: { startMinutes: 420, endMinutes: 1020 } },
      hours: { dutySessionDayIndex: 0, dutySessionStartGameMinute: 420, status: 'driving' },
      shiftEndPlanDayIndex: 0, shiftEndLocationId: 'metroline-yard' }],
    loads: [{ id: 'carryover', assignedDriverId: 'marcus', tripStatus: 'en-route-delivery' }],
  }
  assert.equal(saves.saveGame(state, 'save-01'), true)
  const restored = saves.loadGame('save-01')
  assert.equal(resolveDriverWorkdayOwnership({ driver: restored.drivers[0], loads: restored.loads, gameTime: restored.gameTime }).ownerDayIndex, 0)
  restored.loads = []
  assert.equal(resolveDriverWorkdayOwnership({ driver: restored.drivers[0], loads: restored.loads, gameTime: restored.gameTime }).ownerDayIndex, 0)
})

test('clearing one slot leaves other saves intact', () => {
  saves.saveGame({ marker: 1 }, 'save-01')
  saves.saveGame({ marker: 2 }, 'save-02')
  saves.clearSave('save-02')
  assert.equal(saves.loadGame('save-02'), null)
  assert.deepEqual(saves.loadGame('save-01'), { marker: 1, career: careerState.createLegacyIndependentCareer() })
  assert.equal(saves.getActiveSaveSlot(), 'save-01')
})

test('active save ownership can be explicitly cleared when no saves remain', () => {
  saves.saveGame({ marker: 1 }, 'save-01')
  saves.clearActiveSaveSlot()
  assert.equal(localStorage.getItem('doc-os-active-save-v2'), null)
  assert.equal(saves.getActiveSaveSlot(), 'save-01')

  saves.clearSave('save-01')
  assert.equal(saves.getActiveSaveSlot(), null)
  assert.equal(localStorage.getItem('doc-os-active-save-v2'), null)
})

test('legacy single-slot saves migrate into save-01 with current state version', () => {
  localStorage.setItem('doc-os-save-v1', JSON.stringify({ savedAt: '2026-09-01T00:00:00.000Z', state: { legacy: true } }))
  assert.deepEqual(saves.loadGame('save-01'), { legacy: true, career: careerState.createLegacyIndependentCareer() })
  assert.equal(saves.getActiveSaveSlot(), 'save-01')
  assert.equal(localStorage.getItem('doc-os-save-v1'), null)
  const raw = JSON.parse(localStorage.getItem('doc-os-saves-v2'))
  assert.equal(raw.slots['save-01'].stateVersion, saves.SAVE_STATE_VERSION)
})

test('unversioned v2 slots migrate in place to the current state contract', () => {
  localStorage.setItem('doc-os-saves-v2', JSON.stringify({ version: 2, slots: { 'save-01': { savedAt: '2026-09-01T00:00:00.000Z', state: { marker: 'old-v2' } } } }))
  assert.deepEqual(saves.loadGame('save-01'), { marker: 'old-v2', career: careerState.createLegacyIndependentCareer() })
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
  assert.deepEqual(saves.loadGame('save-01'), { marker: 'protected', career: careerState.createLegacyIndependentCareer() })
})

test('pre-P2.4 save gains legacy career metadata without changing operational state', () => {
  const legacyState = {
    gameTime: { gameDayIndex: 2, totalMinutesOfDay: 75 },
    loads: [{ id: 'active-load', tripStatus: 'en-route-delivery' }],
    drivers: [{ id: 'marcus', assignedLoadId: 'active-load' }],
    carriers: [{ id: 'metroline', status: 'active' }],
    ledgerBanking: { openingBalance: 2500, transactions: [{ id: 'paid', amount: 52 }] },
  }
  localStorage.setItem('doc-os-saves-v2', JSON.stringify({ version: 2, slots: { 'save-01': { savedAt: '2026-09-01T00:00:00.000Z', stateVersion: 1, state: legacyState } } }))

  const restored = saves.loadGame('save-01')
  assert.deepEqual(restored.career, careerState.createLegacyIndependentCareer())
  assert.deepEqual({ ...restored, career: undefined }, { ...legacyState, career: undefined })
})

test('explicit independent career persists and hydrates', () => {
  const career = careerState.createLegacyIndependentCareer()
  assert.equal(saves.saveGame({ marker: 'independent', career }, 'save-01'), true)
  assert.deepEqual(saves.loadGame('save-01').career, career)
})

test('explicit employee career survives save and reload', () => {
  const career = careerState.createMetrolineEmployeeCareer()
  assert.equal(saves.saveGame({ marker: 'employee', career }, 'save-01'), true)
  assert.deepEqual(saves.loadGame('save-01'), { marker: 'employee', career })
})

test('unknown career metadata safely resolves to legacy independent', () => {
  assert.equal(saves.saveGame({ marker: 'unknown', career: { model: 'fleet_owner', origin: 'future' } }, 'save-01'), true)
  assert.deepEqual(saves.loadGame('save-01').career, careerState.createLegacyIndependentCareer())
})

test('employee operational state survives persistence without duplicating its roster', () => {
  const initialized = initializeMetrolineEmployeeOperation()
  const state = {
    gameTime: { gameDayIndex: 0, totalMinutesOfDay: 360 },
    career: initialized.career,
    carriers: initialized.carriers,
    drivers: initialized.drivers,
    runtimePositions: initialized.runtimePositions,
    carrierApplicationsById: initialized.carrierApplicationsById,
    businessDocuments: initialized.businessDocuments,
  }

  assert.equal(saves.saveGame(state, 'save-01'), true)
  const restored = saves.loadGame('save-01')
  assert.equal(restored.career.model, 'employee')
  assert.equal(restored.drivers.filter((driver) => driver.id === 'marcus').length, 1)
  assert.equal(Object.keys(restored.drivers[0].workdayByDay).length, 3)
  assert.deepEqual(restored.runtimePositions, initialized.runtimePositions)
})
