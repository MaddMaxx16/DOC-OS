import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareFirstDayOperation } from '../src/utils/firstDayOperation.js'
import {
  normalizeFirstDayProgress,
  isFirstDayTeachingPaused,
  shouldTeachFirstDayRest,
  shouldTeachFirstDayLunch,
  shouldTeachFirstDayStaging,
  migrateFirstDayFlow,
  getFirstDayBookedLanes,
} from '../src/utils/firstDayProgress.js'

const identity = {
  stage: 'careerSetup', careerSetupStep: 'employeeWelcome',
  career: { model: 'employee', origin: 'metroline_employee' },
  dispatcherProfile: { created: true, displayName: 'Maxx', appearance: { skinTone: 'tan' } },
}

function booked(id, pickup, status = 'assigned') {
  return {
    id,
    loadNumber: id.toUpperCase(),
    status,
    assignedDriverId: 'marcus',
    pickupDayIndex: 0,
    pickupWindowStartMinutes: pickup,
    rateConfirmation: { status: 'CONFIRMED' },
  }
}

test('first-day handoff creates one real employee operation without an early driver introduction', () => {
  const state = prepareFirstDayOperation(identity)
  assert.equal(state.stage, 'game')
  assert.equal(state.selectedMarket, 'new-york')
  assert.deepEqual(state.dispatcherProfile, identity.dispatcherProfile)
  assert.deepEqual(state.firstDay, { step: 'welcome', messageIndex: 0, flowVersion: 5 })
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

test('welcome resume normalizes malformed message indexes and legacy tutorial steps for migration', () => {
  assert.equal(normalizeFirstDayProgress(undefined), null)
  assert.equal(normalizeFirstDayProgress({ step: 'unknown' }), null)
  assert.deepEqual(normalizeFirstDayProgress({ step: 'welcome', messageIndex: 900 }), { step: 'welcome', messageIndex: 2 })
  assert.deepEqual(normalizeFirstDayProgress({ step: 'welcome', messageIndex: -5 }), { step: 'welcome', messageIndex: 0 })
  assert.equal(normalizeFirstDayProgress({ step: 'schedule', messageIndex: 2 }).step, 'schedule')
  assert.equal(normalizeFirstDayProgress({ step: 'secondLane' }).step, 'secondLane')
  assert.equal(normalizeFirstDayProgress({ step: 'shiftEnd' }).step, 'shiftEnd')
})

test('Day 1 v5 pauses only at the active teaching steps', () => {
  for (const step of ['welcome', 'lunch', 'staging']) {
    assert.equal(isFirstDayTeachingPaused({ step, flowVersion: 5 }), true)
  }
  for (const step of ['freight', 'restOfDay', 'thirdLoad']) {
    assert.equal(isFirstDayTeachingPaused({ step, flowVersion: 5 }), true)
  }
  assert.equal(isFirstDayTeachingPaused({ step: 'schedule' }), false)
  assert.equal(isFirstDayTeachingPaused({ step: 'freight' }), false)
  assert.deepEqual(normalizeFirstDayProgress({ step: 'ready', workdayLessonComplete: true }), { step: 'ready', messageIndex: 0, workdayLessonComplete: true })
})

test('Day 1 booked-lane ordering counts only confirmed Marcus freight', () => {
  const first = booked('first', 480)
  const second = booked('second', 600, 'queued')
  const unconfirmed = { ...booked('maybe', 540), rateConfirmation: { status: 'RECEIVED' } }
  const otherDriver = { ...booked('other', 450), assignedDriverId: 'someone-else' }
  assert.deepEqual(getFirstDayBookedLanes([second, unconfirmed, first, otherDriver]).map((load) => load.id), ['first', 'second'])
})

test('first confirmed load opens Load 2 shopping', () => {
  const progress = { step: 'freight', flowVersion: 5 }
  const first = booked('first', 480)
  assert.equal(shouldTeachFirstDayRest(progress, [first]), true)
  assert.equal(shouldTeachFirstDayRest(progress, [{ ...first, rateConfirmation: { status: 'RECEIVED' } }]), false)
  assert.equal(shouldTeachFirstDayRest({ step: 'restOfDay', flowVersion: 5 }, [first]), false)
})

test('second confirmed load triggers lunch before Load 3', () => {
  const first = booked('first', 480)
  const second = booked('second', 600, 'queued')
  const progress = { step: 'restOfDay', flowVersion: 5, firstLaneId: first.id }
  assert.equal(shouldTeachFirstDayLunch(progress, [first, second]), true)
  assert.equal(shouldTeachFirstDayLunch(progress, [first]), false)
  assert.equal(shouldTeachFirstDayLunch({ step: 'thirdLoad', flowVersion: 5 }, [first, second]), false)
})

test('third confirmed load triggers staging, not schedule send', () => {
  const first = booked('first', 480)
  const second = booked('second', 600, 'queued')
  const third = booked('third', 780, 'queued')
  const progress = { step: 'thirdLoad', flowVersion: 5, firstLaneId: first.id, secondLaneId: second.id }
  assert.equal(shouldTeachFirstDayStaging(progress, [first, second, third]), true)
  assert.equal(shouldTeachFirstDayStaging(progress, [first, second]), false)
  assert.equal(shouldTeachFirstDayStaging({ step: 'staging', flowVersion: 5 }, [first, second, third]), false)
})

test('legacy Day 1 saves migrate into the three-load manifest v5 arc without deleting booked work', () => {
  assert.deepEqual(
    migrateFirstDayFlow({ step: 'lunch', messageIndex: 2 }, []),
    { step: 'freight', messageIndex: 2, flowVersion: 5, laneReviewIndex: 0 }
  )

  const first = booked('first', 480)
  const second = booked('second', 600, 'queued')
  const third = booked('third', 780, 'queued')
  const before = JSON.stringify([first, second, third])

  const afterOne = migrateFirstDayFlow({ step: 'lunch', flowVersion: 3, reviewLoadId: 'candidate' }, [first])
  assert.equal(afterOne.step, 'restOfDay')
  assert.equal(afterOne.firstLaneId, 'first')
  assert.equal(afterOne.flowVersion, 5)

  const afterTwo = migrateFirstDayFlow({ step: 'secondLane', flowVersion: 3 }, [first, second])
  assert.equal(afterTwo.step, 'lunch')
  assert.equal(afterTwo.firstLaneId, 'first')
  assert.equal(afterTwo.secondLaneId, 'second')

  const afterThree = migrateFirstDayFlow({ step: 'shiftEnd', flowVersion: 3 }, [first, second, third])
  assert.equal(afterThree.step, 'staging')
  assert.equal(afterThree.thirdLaneId, 'third')

  assert.equal(JSON.stringify([first, second, third]), before)
  assert.equal(migrateFirstDayFlow(null), null)
  assert.equal(migrateFirstDayFlow({ step: 'ready', workdayLessonComplete: true, flowVersion: 3 }, [first]).step, 'ready')
})

test('lane review coaching remains clamped while the three-load lesson owns time', () => {
  const progress = { step: 'freight', flowVersion: 5 }
  assert.equal(isFirstDayTeachingPaused(progress, []), true)
  assert.equal(normalizeFirstDayProgress({ step: 'freight', laneReviewLoadId: 'chosen', laneReviewIndex: 999 }).laneReviewIndex, 4)
})
