import test from 'node:test'
import assert from 'node:assert/strict'
import { createSavePersistenceAuthority, invalidatePendingAutosaveForSlot, persistIfAuthorized } from '../src/utils/savePersistenceAuthority.js'

test('deletion immediately rejects an already-queued write to that slot', () => {
  const authority = createSavePersistenceAuthority()
  const queuedSnapshot = { slotId: 'save-01', state: { marker: 'stale' } }
  const writes = []

  authority.revokeSlot('save-01')

  assert.equal(persistIfAuthorized(authority, (state, slotId) => writes.push({ state, slotId }), queuedSnapshot.state, queuedSnapshot.slotId), false)
  assert.deepEqual(writes, [])
})

test('deletion invalidates the cached snapshot and cancels its pending timer', () => {
  const latestSnapshotRef = { current: { slotId: 'save-01', state: { marker: 'stale' } } }
  const timerRef = { current: 42 }
  const timerSlotRef = { current: 'save-01' }
  const cancelled = []

  assert.equal(invalidatePendingAutosaveForSlot({
    slotId: 'save-01',
    latestSnapshotRef,
    timerRef,
    timerSlotRef,
    cancelTimer: (timer) => cancelled.push(timer),
  }), true)
  assert.equal(latestSnapshotRef.current, null)
  assert.equal(timerRef.current, null)
  assert.equal(timerSlotRef.current, null)
  assert.deepEqual(cancelled, [42])
})

test('deleting an inactive slot preserves the active slot autosave', () => {
  const latestSnapshotRef = { current: { slotId: 'save-01', state: { marker: 'active' } } }
  const timerRef = { current: 42 }
  const timerSlotRef = { current: 'save-01' }
  const cancelled = []

  assert.equal(invalidatePendingAutosaveForSlot({
    slotId: 'save-02',
    latestSnapshotRef,
    timerRef,
    timerSlotRef,
    cancelTimer: (timer) => cancelled.push(timer),
  }), false)
  assert.equal(latestSnapshotRef.current.slotId, 'save-01')
  assert.equal(timerRef.current, 42)
  assert.deepEqual(cancelled, [])
})

test('deleting an inactive slot leaves the active slot writable', () => {
  const authority = createSavePersistenceAuthority()

  authority.revokeSlot('save-02')

  assert.equal(authority.canPersistToSlot('save-01'), true)
  assert.equal(authority.canPersistToSlot('save-02'), false)
})

test('only explicit slot reuse restores persistence authority', () => {
  const authority = createSavePersistenceAuthority()
  authority.revokeSlot('save-01')

  assert.equal(authority.canPersistToSlot('save-01'), false)
  authority.allowSlot('save-01')
  assert.equal(authority.canPersistToSlot('save-01'), true)
})

test('a recovery-driven snapshot cannot recreate a slot after deletion', () => {
  const authority = createSavePersistenceAuthority()
  const recoverySnapshot = { loads: [{ id: 'DOC113', planningStatus: 'calculating' }] }
  const writes = []

  authority.revokeSlot('save-01')

  persistIfAuthorized(authority, (state, slotId) => writes.push({ state, slotId }), recoverySnapshot, 'save-01')
  assert.deepEqual(writes, [])
})

test('lifecycle and background writers continue for an unaffected active slot', () => {
  const authority = createSavePersistenceAuthority()
  const writes = []
  authority.revokeSlot('save-02')

  assert.equal(persistIfAuthorized(authority, (state, slotId) => { writes.push({ state, slotId }); return true }, { marker: 'lifecycle' }, 'save-01'), true)
  assert.equal(persistIfAuthorized(authority, (state, slotId) => { writes.push({ state, slotId }); return true }, { marker: 'background' }, 'save-01'), true)
  assert.deepEqual(writes.map((entry) => entry.state.marker), ['lifecycle', 'background'])
})
