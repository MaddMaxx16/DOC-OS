import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDriverMovementOwner } from '../src/utils/driverMovementOwner.js'

const gameTime = { gameDayIndex: 0, totalMinutesOfDay: 720 }

test('lunch movement authority wins over active freight', () => {
  const driver = {
    id: 'marcus', lunchRouteStatus: 'traveling', lunchRouteGeometry: [[-73, 40], [-72.9, 40.1]],
    lunchRouteStartGameMinute: 700, lunchRouteDurationMinutes: 20,
  }
  const loads = [{ id: 'DOC001', assignedDriverId: 'marcus', tripStatus: 'en-route-delivery', deliveryDayIndex: 0, deliveryWindowStartMinutes: 800, deliveryWindowEndMinutes: 900 }]
  const owner = resolveDriverMovementOwner({ driver, gameTime, loads })
  assert.equal(owner.type, 'lunch-route')
  assert.deepEqual(owner.route, driver.lunchRouteGeometry)
})

test('lunch hold blocks freight while lunch owns the driver without moving geometry', () => {
  const driver = { id: 'marcus', lunchRouteStatus: 'arrived' }
  const loads = [{ id: 'DOC001', assignedDriverId: 'marcus', tripStatus: 'en-route-delivery', deliveryDayIndex: 0, deliveryWindowStartMinutes: 800, deliveryWindowEndMinutes: 900 }]
  assert.equal(resolveDriverMovementOwner({ driver, gameTime, loads }).type, 'lunch-hold')
})

test('active freight wins over idle repositioning', () => {
  const driver = {
    id: 'marcus', idleRouteStatus: 'traveling', idleRouteGeometry: [[-73, 40], [-72.8, 40.2]],
    idleRouteStartGameMinute: 700, idleRouteDurationMinutes: 30,
  }
  const load = { id: 'DOC001', assignedDriverId: 'marcus', tripStatus: 'en-route-pickup', pickupDayIndex: 0, pickupWindowStartMinutes: 750, pickupWindowEndMinutes: 850 }
  const owner = resolveDriverMovementOwner({ driver, gameTime, loads: [load] })
  assert.equal(owner.type, 'freight')
  assert.equal(owner.load.id, 'DOC001')
})

test('idle route owns movement when there is no lunch or freight authority', () => {
  const driver = {
    id: 'marcus', idleRouteStatus: 'traveling', idleRouteGeometry: [[-73, 40], [-72.8, 40.2]],
    idleRouteStartGameMinute: 700, idleRouteDurationMinutes: 30,
  }
  assert.equal(resolveDriverMovementOwner({ driver, gameTime, loads: [] }).type, 'idle-route')
})

test('driver holds runtime position when no movement system owns the driver', () => {
  assert.equal(resolveDriverMovementOwner({ driver: { id: 'marcus' }, gameTime, loads: [] }).type, 'runtime-hold')
})
