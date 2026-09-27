import test from 'node:test'
import assert from 'node:assert/strict'
import { beginDeliveryUnloading, completeDeliveryUnload, getDeliveryHandoffContext, getDeliveryUnloadingChallengeRequest } from '../src/utils/deliveryLifecycle.js'

test('delivery unloading starts and preserves the first authoritative start minute', () => {
  const ready = { id: 'DOC001', tripStatus: 'checked-in-delivery' }
  assert.deepEqual(beginDeliveryUnloading(ready, 800), { ...ready, tripStatus: 'unloading-delivery', deliveryUnloadStartGameMinute: 800 })

  const resumed = { id: 'DOC001', tripStatus: 'unloading-delivery', deliveryUnloadStartGameMinute: 790 }
  assert.equal(beginDeliveryUnloading(resumed, 800).deliveryUnloadStartGameMinute, 790)
  assert.equal(beginDeliveryUnloading({ id: 'DOC001', tripStatus: 'en-route-delivery' }, 800), null)
})

test('delivery unloading request resumes only an interrupted assigned unload', () => {
  const loads = [{ id: 'DOC001', tripStatus: 'unloading-delivery', assignedDriverId: 'marcus' }]
  assert.deepEqual(getDeliveryUnloadingChallengeRequest({ loads }), { loadId: 'DOC001' })
  assert.equal(getDeliveryUnloadingChallengeRequest({ loads, activeChallengeLoadId: 'DOC001' }), null)
  assert.equal(getDeliveryUnloadingChallengeRequest({ loads: [{ id: 'DOC001', tripStatus: 'unloading-delivery' }] }), null)
})

test('delivery unload completion releases the driver and creates POD truth', () => {
  const load = {
    id: 'DOC001', assignedDriverId: 'marcus', tripStatus: 'unloading-delivery',
    shipment: { expectedPallets: 10, loadedPallets: 10, missingPallets: 0, damagedPallets: 0, palletManifest: [] },
  }
  const completed = completeDeliveryUnload({
    load,
    result: { expectedPallets: 10, actualReceivedPallets: 10, wrongMoves: 0 },
    completeMinute: 900,
    releasedDriverId: 'marcus',
  })
  assert.equal(completed.tripStatus, 'awaiting-pod')
  assert.equal(completed.status, 'delivered')
  assert.equal(completed.assignedDriverId, null)
  assert.equal(completed.completedDriverId, 'marcus')
  assert.equal(completed.deliveryUnloadCompleteGameMinute, 900)
  assert.equal(completed.facilityOps.delivery.actualReceivedPallets, 10)
  assert.ok(completed.pod)
})

test('delivery handoff does not auto-start queued freight outside the driver workday', () => {
  const loads = [
    { id: 'DOC001', assignedDriverId: 'marcus', tripStatus: 'unloading-delivery' },
    { id: 'DOC002', assignedDriverId: 'marcus', status: 'queued', queuePosition: 1, pickupDayIndex: 0, pickupDriverBriefedGameMinute: 600, driverAcknowledgedGameMinute: 601 },
  ]
  const drivers = [{ id: 'marcus', workdayByDay: { '0': { startMinutes: 480, endMinutes: 1020 } } }]
  const context = getDeliveryHandoffContext({ loads, drivers, loadId: 'DOC001', gameTime: { gameDayIndex: 0 }, now: 1100 })
  assert.equal(context.nextCanAutoHandoff, false)
})
