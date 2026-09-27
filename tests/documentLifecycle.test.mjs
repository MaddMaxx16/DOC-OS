import test from 'node:test'
import assert from 'node:assert/strict'
import { createCorrectedPodVersion, createPodDocument, getPodVersionLabel } from '../src/utils/documentLifecycle.js'

test('new PODs receive stable identity and version one', () => {
  const pod = createPodDocument({ signedBy: 'Receiver', approved: false }, 'DOC001')
  assert.equal(pod.documentId, 'pod:DOC001')
  assert.equal(pod.version, 1)
  assert.deepEqual(pod.history, [])
  assert.equal(getPodVersionLabel(pod), 'Original copy · v1')
})

test('POD correction preserves prior version and resets approval', () => {
  const original = createPodDocument({ signedBy: 'Receiver', piecesExpected: 10, piecesReceived: 9, approved: true, approvedGameMinute: 500 }, 'DOC001')
  const corrected = createCorrectedPodVersion(original, 'DOC001', { piecesReceived: 10 }, 600)
  assert.equal(corrected.version, 2)
  assert.equal(corrected.history.length, 1)
  assert.equal(corrected.history[0].version, 1)
  assert.equal(corrected.history[0].status, 'SUPERSEDED')
  assert.equal(corrected.approved, false)
  assert.equal(corrected.approvedGameMinute, null)
  assert.equal(getPodVersionLabel(corrected), 'Corrected copy · v2')
})
