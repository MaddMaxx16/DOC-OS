export function createSavePersistenceAuthority() {
  const deletedSlotIds = new Set()

  return {
    canPersistToSlot(slotId) {
      return Boolean(slotId) && !deletedSlotIds.has(slotId)
    },
    revokeSlot(slotId) {
      if (slotId) deletedSlotIds.add(slotId)
    },
    allowSlot(slotId) {
      if (slotId) deletedSlotIds.delete(slotId)
    },
  }
}

export function persistIfAuthorized(authority, persist, state, slotId) {
  if (!authority?.canPersistToSlot(slotId)) return false
  return persist(state, slotId)
}

export function invalidatePendingAutosaveForSlot({ slotId, latestSnapshotRef, timerRef, timerSlotRef, cancelTimer }) {
  if (latestSnapshotRef.current?.slotId === slotId) latestSnapshotRef.current = null
  if (timerRef.current === null || timerSlotRef.current !== slotId) return false
  cancelTimer(timerRef.current)
  timerRef.current = null
  timerSlotRef.current = null
  return true
}
