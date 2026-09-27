import test from 'node:test'
import assert from 'node:assert/strict'
import { beginPickupLoading, getPickupLoadingChallengeRequest } from '../src/utils/loadLifecycle.js'

test('pickup loading request resumes the authoritative interrupted loading load', () => {
  const request = getPickupLoadingChallengeRequest({
    loads: [
      { id: 'queued', tripStatus: 'checked-in-pickup', assignedDriverId: 'marcus' },
      { id: 'loading', tripStatus: 'loading-at-pickup', assignedDriverId: 'marcus' },
    ],
  })
  assert.deepEqual(request, { loadId: 'loading' })
})

test('pickup loading request stays closed during an active challenge or pending handoff', () => {
  const loads = [{ id: 'loading', tripStatus: 'loading-at-pickup', assignedDriverId: 'marcus' }]
  assert.equal(getPickupLoadingChallengeRequest({ loads, activeChallengeLoadId: 'loading' }), null)
  assert.equal(getPickupLoadingChallengeRequest({ loads, pendingHandoff: { loadId: 'loading' } }), null)
})

test('pickup loading request ignores loads without a driver', () => {
  assert.equal(getPickupLoadingChallengeRequest({ loads: [{ id: 'loading', tripStatus: 'loading-at-pickup' }] }), null)
})

test('begin pickup loading preserves an existing start minute and rejects invalid statuses', () => {
  const waiting = { id: 'load-1', tripStatus: 'waiting-at-pickup', loadingStartGameMinute: null }
  assert.deepEqual(beginPickupLoading(waiting, 500), { ...waiting, tripStatus: 'loading-at-pickup', loadingStartGameMinute: 500 })

  const resumed = { id: 'load-2', tripStatus: 'loading-at-pickup', loadingStartGameMinute: 450 }
  assert.deepEqual(beginPickupLoading(resumed, 500), resumed)

  assert.equal(beginPickupLoading({ id: 'load-3', tripStatus: 'en-route-pickup' }, 500), null)
})

test('pickup completion commits clean freight as onboard shipment truth', async () => {
  const { completePickupLoading } = await import('../src/utils/loadLifecycle.js')
  const load = { id: 'L1', tripStatus: 'loading-at-pickup', status: 'assigned', facilityOps: {} }
  const result = { expectedPallets: 10, loadedPallets: 10, missingPallets: 0, damagedPallets: 0, misplacedPallets: 0, palletManifest: [{ id: 'P1' }] }
  const next = completePickupLoading({ load, result, completeMinute: 500 })
  assert.equal(next.tripStatus, 'onboard-hold')
  assert.equal(next.status, 'onboard')
  assert.equal(next.pickupLoadingCompleteGameMinute, 500)
  assert.equal(next.waitingReason, 'itinerary-next-stop')
  assert.equal(next.shipment.loadedPallets, 10)
  assert.equal(next.facilityOps.pickup.completedGameMinute, 500)
})

test('pickup completion preserves exception state for missing or damaged freight', async () => {
  const { completePickupLoading } = await import('../src/utils/loadLifecycle.js')
  const load = { id: 'L1', tripStatus: 'loading-at-pickup', status: 'assigned' }
  const result = { expectedPallets: 10, loadedPallets: 9, missingPallets: 1, damagedPallets: 0 }
  const next = completePickupLoading({ load, result, completeMinute: 500 })
  assert.equal(next.tripStatus, 'pickup-issue')
  assert.equal(next.status, 'assigned')
  assert.equal(next.waitingReason, 'pickup-issue')
})
