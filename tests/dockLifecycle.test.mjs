import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { advanceDockLifecycle } from '../src/utils/dockLifecycle.js'
import { getDeliveryDockWaitMinutes, getPickupDockWaitMinutes } from '../src/data/pickupConfig.js'
import seedLoads from '../src/data/loads.js'
import { getControlled5pmDeliveryTiming, getOvernightDeliveryTiming } from '../src/dev/devScenarioTiming.js'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

function runSequence(phase, readyKey, readyWait) {
  const arrival = phase === 'pickup' ? 'at-pickup' : 'at-delivery'
  const checking = phase === 'pickup' ? 'checking-in-pickup' : 'checking-in-delivery'
  const waiting = phase === 'pickup' ? 'waiting-at-pickup' : 'waiting-at-delivery'
  const checked = phase === 'pickup' ? 'checked-in-pickup' : 'checked-in-delivery'
  const startKey = phase === 'pickup' ? 'pickupCheckInStartGameMinute' : 'deliveryCheckInStartGameMinute'
  const load = { id: phase, assignedDriverId: 'marcus', tripStatus: arrival }

  const atFacility = advanceDockLifecycle(load, 100)
  assert.equal(atFacility.tripStatus, checking)
  assert.equal(atFacility[startKey], 100)

  const inCheckIn = advanceDockLifecycle(atFacility, 105)
  assert.equal(inCheckIn.tripStatus, waiting)
  assert.ok(Number.isFinite(inCheckIn[readyKey]))
  assert.equal(inCheckIn[readyKey], 105 + readyWait)

  const beforeReady = advanceDockLifecycle(inCheckIn, inCheckIn[readyKey] - 1)
  assert.equal(beforeReady.tripStatus, waiting)
  const atReady = advanceDockLifecycle(beforeReady, inCheckIn[readyKey])
  assert.equal(atReady.tripStatus, checked)

  const repeated = advanceDockLifecycle(atReady, inCheckIn[readyKey] + 1)
  assert.strictEqual(repeated, atReady)
  assert.equal(repeated.tripStatus, checked)
}

test('App runtime uses the tested production dock lifecycle transition', () => {
  assert.match(app, /import \{ advanceDockLifecycle \} from '\.\/utils\/dockLifecycle\.js'/)
  assert.match(app, /current\.map\(\(load\) => advanceDockLifecycle\(load, now/)
})

test('production delivery dock lifecycle enters waiting, honors dock time, then advances once', () => {
  runSequence('delivery', 'deliveryDockReadyGameMinute', 10)
})

test('production pickup dock lifecycle enters waiting, honors dock time, then advances once', () => {
  runSequence('pickup', 'pickupDockReadyGameMinute', 12)
})

test('Controlled 5 PM overrides the overnight preset appointment with an evening delivery window', () => {
  const sourceLoad = seedLoads.find((load) => load.id === 'DOC113')
  const overnightPresetLoad = { ...sourceLoad, ...getOvernightDeliveryTiming(0) }
  const currentAbsoluteMinute = 1144
  const staleOvernightDockReady = currentAbsoluteMinute + getDeliveryDockWaitMinutes(overnightPresetLoad, currentAbsoluteMinute)
  assert.equal(staleOvernightDockReady, 1485)

  const controlledLoad = { ...overnightPresetLoad, ...getControlled5pmDeliveryTiming(0) }
  const eveningDockReady = currentAbsoluteMinute + getDeliveryDockWaitMinutes(controlledLoad, currentAbsoluteMinute)
  assert.equal(controlledLoad.deliveryDayIndex, 0)
  assert.equal(controlledLoad.deliveryWindowStartMinutes, 17 * 60)
  assert.equal(eveningDockReady, 1154)
})

test('overnight delivery appointment remains an absolute next-day service gate', () => {
  const load = { ...seedLoads.find((item) => item.id === 'DOC113'), ...getOvernightDeliveryTiming(0) }
  const wait = getDeliveryDockWaitMinutes(load, 1144)
  assert.equal(load.deliveryDayIndex * 1440 + load.deliveryWindowStartMinutes, 1485)
  assert.equal(1144 + wait, 1485)
  assert.equal(1487 + getDeliveryDockWaitMinutes(load, 1487), 1497)
})

test('pickup dock wait uses its same-day evening appointment on the same absolute timeline', () => {
  const load = {
    pickupDayIndex: 0,
    pickupWindowStartMinutes: 17 * 60,
    pickupWindowEndMinutes: 23 * 60 + 59,
  }
  assert.equal(1144 + getPickupDockWaitMinutes(load, 1144), 1156)
})
