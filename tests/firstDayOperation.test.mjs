import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareFirstDayOperation } from '../src/utils/firstDayOperation.js'
import { normalizeFirstDayProgress, isFirstDayTeachingPaused, shouldTeachFirstDayShiftEnd, shouldTeachFirstDayRest, migrateFirstDayFlow } from '../src/utils/firstDayProgress.js'

const identity = {
  stage: 'careerSetup', careerSetupStep: 'employeeWelcome',
  career: { model: 'employee', origin: 'metroline_employee' },
  dispatcherProfile: { created: true, displayName: 'Maxx', appearance: { skinTone: 'tan' } },
}

test('first-day handoff creates one real employee operation without an early driver introduction', () => {
  const state = prepareFirstDayOperation(identity)
  assert.equal(state.stage, 'game')
  assert.equal(state.selectedMarket, 'new-york')
  assert.deepEqual(state.dispatcherProfile, identity.dispatcherProfile)
  assert.deepEqual(state.firstDay, { step: 'welcome', messageIndex: 0, flowVersion: 3 })
  assert.equal(state.carriers.find((c) => c.id === 'metroline').status, 'active')
  assert.equal(state.drivers.length, 1)
  assert.equal(state.drivers[0].id, 'marcus')
  assert.equal(state.drivers[0].hours.status, 'off-duty')
  assert.equal(state.drivers[0].workdayByDay['0'].carrierConfirmed, true)
  assert.deepEqual(state.driverMessages, [])
  assert.deepEqual(state.emailMessages, [])
  assert.deepEqual(state.carrierApplicationsById, {})
  assert.equal(identity.stage, 'careerSetup')
})

test('an established operation is resumed intact rather than reseeded by the arrival handoff', () => {
  const state = prepareFirstDayOperation(identity)
  state.gameTime.totalMinutesOfDay = 800
  state.firstDay = { step: 'ready', messageIndex: 2 }
  state.drivers[0].hours.drivingRemainingMinutes = 500
  assert.equal(prepareFirstDayOperation(state), state)
  assert.equal(state.drivers.length, 1)
  assert.equal(state.gameTime.totalMinutesOfDay, 800)
  assert.equal(state.drivers[0].hours.drivingRemainingMinutes, 500)
})

test('incomplete and independent profiles cannot enter the employee handoff', () => {
  for (const saved of [null, {}, { ...identity, dispatcherProfile: null }, { ...identity, careerSetupStep: 'look' }, { ...identity, career: { model: 'independent' } }]) {
    assert.throws(() => prepareFirstDayOperation(saved))
  }
})

test('welcome resume normalizes malformed message indexes without inventing onboarding for old saves', () => {
  assert.equal(normalizeFirstDayProgress(undefined), null)
  assert.equal(normalizeFirstDayProgress({ step: 'unknown' }), null)
  assert.deepEqual(normalizeFirstDayProgress({ step: 'welcome', messageIndex: 900 }), { step: 'welcome', messageIndex: 2 })
  assert.deepEqual(normalizeFirstDayProgress({ step: 'welcome', messageIndex: -5 }), { step: 'welcome', messageIndex: 0 })
  assert.deepEqual(normalizeFirstDayProgress({ step: 'schedule', messageIndex: 2 }), { step: 'schedule', messageIndex: 2 })
})


test('Day 1 v3 teaches in FreightLink instead of pausing on the opening scheduler', () => {
  assert.equal(normalizeFirstDayProgress({ step: 'schedule' }).step, 'schedule')
  assert.equal(isFirstDayTeachingPaused({ step: 'schedule' }), false)
  for (const step of ['lunch', 'shiftEnd']) {
    assert.equal(normalizeFirstDayProgress({ step }).step, step)
    assert.equal(isFirstDayTeachingPaused({ step }), true)
  }
  assert.equal(isFirstDayTeachingPaused({ step: 'freight', flowVersion: 3 }), true)
  assert.equal(isFirstDayTeachingPaused({ step: 'freight' }), false)
  assert.deepEqual(normalizeFirstDayProgress({ step: 'ready', workdayLessonComplete: true }), { step: 'ready', messageIndex: 0, workdayLessonComplete: true })
  assert.deepEqual(normalizeFirstDayProgress({ step: 'ready' }), { step: 'ready', messageIndex: 0 })
})

test('shift-end teaching waits for the second booked lane and its actual delivery route', () => {
  const progress = { step: 'secondLane', firstLaneId: 'first', reviewLoadId: 'second' }
  const route = [[-74.1, 40.6], [-74, 40.7]]
  const first = { id: 'first', status: 'assigned', assignedDriverId: 'marcus' }
  const second = { id: 'second', status: 'queued', assignedDriverId: 'marcus', plannedLoadedRouteGeometry: route }
  assert.equal(shouldTeachFirstDayShiftEnd(progress, [first, second]), true)
  for (const loads of [[first], [second], [first, { ...second, assignedDriverId: null, candidateDriverId: 'marcus' }], [first, { ...second, plannedLoadedRouteGeometry: null }]]) {
    assert.equal(shouldTeachFirstDayShiftEnd(progress, loads), false)
  }
  assert.equal(shouldTeachFirstDayShiftEnd({ step: 'freight' }, [first, second]), false)
})

test('legacy Day 1 saves migrate to v3 without deleting real booked work', () => {
  assert.deepEqual(
    migrateFirstDayFlow({ step: 'lunch', messageIndex: 2 }, []),
    { step: 'freight', messageIndex: 2, flowVersion: 3, laneReviewIndex: 0 }
  )
  assert.equal(migrateFirstDayFlow({ step: 'schedule', messageIndex: 2 }, []).step, 'freight')
  const loads = [{ id: 'booked', status: 'assigned', assignedDriverId: 'marcus' }]
  const before = JSON.stringify(loads)
  assert.equal(migrateFirstDayFlow({ step: 'lunch' }, loads).step, 'lunch')
  assert.equal(migrateFirstDayFlow({ step: 'schedule' }, loads).step, 'restOfDay')
  assert.equal(JSON.stringify(loads), before)
  const migratedBooked = migrateFirstDayFlow({ step: 'lunch', flowVersion: 2, firstLaneId: 'booked', reviewLoadId: 'second' }, loads)
  assert.equal(migratedBooked.step, 'lunch')
  assert.equal(migratedBooked.flowVersion, 3)
  assert.equal(migratedBooked.firstLaneId, 'booked')
  assert.equal(migrateFirstDayFlow(null), null)
  assert.equal(migrateFirstDayFlow({ step: 'ready', workdayLessonComplete: true }, loads).step, 'ready')
})

test('only the first actual confirmed booking introduces shopping for the rest of the day', () => {
  const progress = { step: 'freight', flowVersion: 3 }
  const load = { id: 'chosen', status: 'assigned', assignedDriverId: 'marcus', rateConfirmation: { status: 'CONFIRMED' } }
  assert.equal(shouldTeachFirstDayRest(progress, [load]), true)
  assert.equal(shouldTeachFirstDayRest(progress, [{ ...load, assignedDriverId: null, candidateDriverId: 'marcus', status: 'available' }]), false)
  assert.equal(shouldTeachFirstDayRest(progress, [{ ...load, rateConfirmation: { status: 'RECEIVED' } }]), false)
  assert.equal(isFirstDayTeachingPaused(progress, []), true)
  assert.equal(normalizeFirstDayProgress({ step: 'freight', laneReviewLoadId: 'chosen', laneReviewIndex: 999 }).laneReviewIndex, 4)
})
