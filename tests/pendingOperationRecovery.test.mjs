import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getLunchRouteRecoveryIntent,
  installRecoveredOutboundRoute,
  installRecoveredResumeAccess,
  lunchRecoveryIntentStillMatches,
  rollbackInvalidLunchRecovery,
} from '../src/utils/lunchRouteRecovery.js'
import { restoreMovementOwnerContinuity } from '../src/utils/runtimeMovement.js'
import { completePickupLoading, getPickupLoadingChallengeRequest } from '../src/utils/loadLifecycle.js'

const locations = [
  { id: 'lunch-stop', longitude: -73.9, latitude: 40.7 },
  { id: 'pickup', longitude: -73.8, latitude: 40.8 },
  { id: 'delivery', longitude: -73.7, latitude: 40.9 },
]
const gameTime = { gameDayIndex: 1, totalMinutesOfDay: 15 }
const origin = { longitude: -74, latitude: 40.6 }
const load = { id: 'L1', assignedDriverId: 'marcus', tripStatus: 'en-route-delivery', pickupLocationId: 'pickup', deliveryLocationId: 'delivery', plannedLoadedRouteGeometry: [[-74, 40.6], [-73.7, 40.9]], deliveryDepartureGameMinute: 1400, plannedLoadedDriveTimeMinutes: 120 }

function driver(status = 'calculating') {
  return {
    id: 'marcus', lunchRouteStatus: status, lunchTargetLocationId: 'lunch-stop', lunchInterruptedLoadId: 'L1', lunchInterruptedPhase: 'delivery',
    hours: { dutySessionDayIndex: 0, dutySessionStartGameMinute: 840, status: 'driving' },
    workdayByDay: {
      0: { startMinutes: 840, endMinutes: 180, lunchEvent: { selectedChoiceId: 'stop', status: 'routing', targetLocationId: 'lunch-stop', interruptedLoadId: 'L1', interruptedPhase: 'delivery' } },
      1: { startMinutes: 420, endMinutes: 1020 },
    },
  }
}

const context = (value = driver(), position = origin, loads = [load]) => ({ driver: value, loads, gameTime, runtimePosition: position, locations })

test('hydrated outbound Lunch intent restarts under the prior operational workday', () => {
  const intent = getLunchRouteRecoveryIntent(context())
  assert.equal(intent.type, 'outbound')
  assert.equal(intent.ownerDayIndex, 0)
  assert.equal(intent.targetId, 'lunch-stop')
})

test('successful outbound recovery installs once and then stops qualifying', () => {
  const intent = getLunchRouteRecoveryIntent(context())
  const installed = installRecoveredOutboundRoute(driver(), intent, [[-74, 40.6], [-73.9, 40.7]], 1455, 10)
  assert.equal(installed.lunchRouteStatus, 'traveling')
  assert.strictEqual(installRecoveredOutboundRoute(installed, intent, [[0, 0], [1, 1]], 1500, 5), installed)
  assert.equal(getLunchRouteRecoveryIntent(context(installed)), null)
})

test('failed or invalid outbound recovery rolls back to a retryable Lunch decision', () => {
  const intent = getLunchRouteRecoveryIntent(context())
  const rolled = rollbackInvalidLunchRecovery(driver(), intent, 1455)
  assert.equal(rolled.driver.lunchRouteStatus, null)
  assert.equal(rolled.driver.workdayByDay[0].lunchEvent, null)
  assert.equal(rolled.loadPatch, null)
  assert.equal(getLunchRouteRecoveryIntent(context({ ...driver(), lunchTargetLocationId: 'missing' })), null)
})

test('stale outbound origin and ownership changes reject the result', () => {
  const intent = getLunchRouteRecoveryIntent(context())
  assert.equal(lunchRecoveryIntentStillMatches(intent, context(driver(), { longitude: -73.99, latitude: 40.6 })), false)
  assert.equal(lunchRecoveryIntentStillMatches(intent, context({ ...driver(), lunchRouteStatus: null })), false)
})

test('hydrated freight-resume intent uses the interrupted load and prior owner', () => {
  const value = driver('resume-calculating')
  value.workdayByDay[0].lunchEvent.status = 'on-lunch'
  const intent = getLunchRouteRecoveryIntent(context(value))
  assert.equal(intent.type, 'resume')
  assert.equal(intent.ownerDayIndex, 0)
  assert.equal(intent.interruptedLoadId, 'L1')
  assert.equal(intent.destination.id, 'delivery')
})

test('successful resume recovery installs access once and rejects stale replay', () => {
  const value = driver('resume-calculating')
  value.workdayByDay[0].lunchEvent.status = 'on-lunch'
  const intent = getLunchRouteRecoveryIntent(context(value))
  const installed = installRecoveredResumeAccess(value, intent, [[-74, 40.6], [-73.99, 40.61]], 1455, 2, [[-73.99, 40.61], [-73.7, 40.9]], 20)
  assert.equal(installed.lunchRouteStatus, 'resume-access')
  assert.equal(installed.lunchResumeLoadId, 'L1')
  assert.strictEqual(installRecoveredResumeAccess(installed, intent, [[0, 0], [1, 1]], 0, 1, [], 1), installed)
})

test('failed resume recovery releases Lunch and returns freight to itinerary routing', () => {
  const value = driver('resume-calculating')
  value.workdayByDay[0].lunchEvent.status = 'on-lunch'
  const intent = getLunchRouteRecoveryIntent(context(value))
  const rolled = rollbackInvalidLunchRecovery(value, intent, 1455)
  assert.equal(rolled.driver.lunchRouteStatus, null)
  assert.equal(rolled.driver.workdayByDay[0].lunchEvent.status, 'completed')
  assert.deepEqual(rolled.loadPatch, { id: 'L1', tripStatus: 'onboard-hold', status: 'onboard', deliveryDepartureGameMinute: null, waitingReason: 'lunch-route-recovery' })
})

test('missing interrupted load makes resume intent invalid and non-installable', () => {
  const value = driver('resume-calculating')
  value.workdayByDay[0].lunchEvent.status = 'on-lunch'
  assert.equal(getLunchRouteRecoveryIntent(context(value, origin, [])), null)
})

test('active Lunch travel hydration preserves Lunch-authoritative position over freight', () => {
  const value = driver('traveling')
  value.lunchRouteGeometry = [[-74, 40.6], [-73.9, 40.7]]
  value.lunchRouteStartGameMinute = 1440
  value.lunchRouteDurationMinutes = 30
  const saved = { longitude: -73.95, latitude: 40.65 }
  const restored = restoreMovementOwnerContinuity({ driver: value, loads: [load], gameTime, savedPosition: saved, savedProgress: 0.5 })
  assert.equal(restored.ownerType, 'lunch-route')
  assert.deepEqual(restored.position, saved)
  assert.equal(restored.freightContinuity, null)
})

test('normal freight hydration keeps existing continuity behavior', () => {
  const value = { id: 'marcus', workdayByDay: { 1: { startMinutes: 0, endMinutes: 120 } } }
  const restored = restoreMovementOwnerContinuity({ driver: value, loads: [load], gameTime, savedPosition: origin, savedProgress: 0.25 })
  assert.equal(restored.ownerType, 'freight')
  assert.equal(restored.freightContinuity.delivery, true)
})

test('staging hydration remains staging-authoritative', () => {
  const value = { id: 'marcus', idleRouteStatus: 'traveling', idleRouteGeometry: [[-74, 40.6], [-73.8, 40.8]], idleRouteStartGameMinute: 1440, idleRouteDurationMinutes: 30 }
  const restored = restoreMovementOwnerContinuity({ driver: value, loads: [], gameTime, savedPosition: origin, savedProgress: 0.2 })
  assert.equal(restored.ownerType, 'idle-route')
  assert.deepEqual(restored.position, origin)
})

test('confirmed loading truth is complete and cannot request puzzle reopening', () => {
  const completed = completePickupLoading({ load: { ...load, tripStatus: 'loading-at-pickup', status: 'accepted' }, result: { expectedPallets: 2, loadedPallets: 2, missingPallets: 0, damagedPallets: 0, palletManifest: [] }, completeMinute: 500 })
  assert.equal(completed.tripStatus, 'onboard-hold')
  assert.equal(getPickupLoadingChallengeRequest({ loads: [completed] }), null)
})

test('production loading confirmation commits before transient handoff state', () => {
  const source = readFileSync(new URL('../src/components/MainGameScreen.jsx', import.meta.url), 'utf8')
  const start = source.indexOf('const completeLoadingChallenge')
  const commit = source.indexOf('setLoads((current)', start)
  const transient = source.indexOf('setPendingLoadingHandoff({', start)
  assert.ok(commit > start && transient > commit)
})

test('production recovery uses one process-local request map and no persisted token', () => {
  const source = readFileSync(new URL('../src/components/MainGameScreen.jsx', import.meta.url), 'utf8')
  assert.match(source, /lunchRecoveryRequestsRef\.current\.has\(driver\.id\)/)
  assert.match(source, /lunchRecoveryIntentStillMatches/)
  assert.doesNotMatch(source, /lunchRecoveryRequestId/)
})
