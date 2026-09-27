import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DRIVER_TIME_FIT,
  formatDriverTime,
  getDriverTimeView,
  interpretDriverTimeFit,
} from '../src/utils/driverTimeInterpreter.js'

test('driver time view translates raw HOS clocks into dispatcher-facing time', () => {
  const view = getDriverTimeView({
    hours: {
      status: 'driving',
      drivingRemainingMinutes: 318,
      dutyRemainingMinutes: 402,
      cycleRemainingMinutes: 3000,
    },
  })
  assert.equal(view.statusLabel, 'DRIVING')
  assert.equal(view.drivingAvailableLabel, '5h 18m')
  assert.equal(view.workdayRemainingLabel, '6h 42m')
})

test('driver time fit is GOOD when the plan has useful margin', () => {
  const fit = interpretDriverTimeFit({
    driveRequiredMinutes: 180,
    dutyRequiredMinutes: 240,
    driveAvailableMinutes: 420,
    dutyAvailableMinutes: 540,
  })
  assert.equal(fit.fit, DRIVER_TIME_FIT.GOOD)
  assert.equal(fit.driveOk, true)
  assert.equal(fit.dutyOk, true)
})

test('driver time fit is TIGHT when legal time exists but useful margin is small', () => {
  const fit = interpretDriverTimeFit({
    driveRequiredMinutes: 300,
    dutyRequiredMinutes: 380,
    driveAvailableMinutes: 360,
    dutyAvailableMinutes: 450,
  })
  assert.equal(fit.fit, DRIVER_TIME_FIT.TIGHT)
  assert.match(fit.summary, /Plan fits/)
})

test('driver time fit is POOR when current time cannot support the plan', () => {
  const fit = interpretDriverTimeFit({
    driveRequiredMinutes: 360,
    dutyRequiredMinutes: 500,
    driveAvailableMinutes: 300,
    dutyAvailableMinutes: 450,
  })
  assert.equal(fit.fit, DRIVER_TIME_FIT.POOR)
  assert.equal(fit.driveOk, false)
  assert.equal(fit.dutyOk, false)
  assert.equal(fit.reasons.length, 2)
})

test('driver time formatting stays human readable instead of ELD-style clock text', () => {
  assert.equal(formatDriverTime(0), '0m')
  assert.equal(formatDriverTime(60), '1h')
  assert.equal(formatDriverTime(137), '2h 17m')
})
