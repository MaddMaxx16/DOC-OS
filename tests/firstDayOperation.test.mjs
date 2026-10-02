import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareFirstDayOperation } from '../src/utils/firstDayOperation.js'
import { normalizeFirstDayProgress } from '../src/utils/firstDayProgress.js'

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
  assert.deepEqual(state.firstDay, { step: 'welcome', messageIndex: 0 })
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
