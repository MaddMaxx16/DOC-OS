const DEFAULT_VERIFICATION = { signature: false, pieceCount: false, damage: false, deliveryInfo: false }

function podSnapshot(pod, version) {
  return {
    documentId: pod.documentId,
    documentType: 'pod',
    version,
    status: 'SUPERSEDED',
    superseded: true,
    receivedGameMinute: pod.receivedGameMinute ?? null,
    viewedGameMinute: pod.viewedGameMinute ?? null,
    signedBy: pod.signedBy ?? null,
    piecesExpected: pod.piecesExpected,
    piecesReceived: pod.piecesReceived,
    damage: pod.damage,
    correctionStatus: pod.correctionStatus ?? null,
    correctedGameMinute: pod.correctedGameMinute ?? null,
    approved: Boolean(pod.approved),
    approvedGameMinute: pod.approvedGameMinute ?? null,
  }
}

export function normalizePodDocument(pod, loadId) {
  if (!pod) return pod
  const version = Number.isFinite(Number(pod.version)) ? Math.max(1, Number(pod.version)) : 1
  return {
    ...pod,
    documentId: pod.documentId || `pod:${loadId}`,
    documentType: 'pod',
    version,
    isCurrent: pod.isCurrent !== false,
    history: Array.isArray(pod.history) ? pod.history : [],
  }
}

export function createPodDocument(pod, loadId) {
  return normalizePodDocument({ ...pod, version: 1, isCurrent: true, history: [] }, loadId)
}

export function createCorrectedPodVersion(pod, loadId, changes, now) {
  const current = normalizePodDocument(pod, loadId)
  const version = current.version || 1
  const history = [...current.history, podSnapshot(current, version)]
  return normalizePodDocument({
    ...current,
    ...changes,
    version: version + 1,
    isCurrent: true,
    history,
    correctionStatus: 'CORRECTED',
    correctedGameMinute: now,
    viewedGameMinute: null,
    verification: { ...DEFAULT_VERIFICATION },
    verified: false,
    verifiedGameMinute: null,
    approved: false,
    approvedGameMinute: null,
  }, loadId)
}

export function getPodVersionLabel(pod) {
  const version = Number(pod?.version || 1)
  return version > 1 ? `Corrected copy · v${version}` : 'Original copy · v1'
}
