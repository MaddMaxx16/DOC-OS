import test from 'node:test'
import assert from 'node:assert/strict'
import { HOS_CYCLE_LIMIT_MINUTES, HOS_DRIVING_LIMIT_MINUTES, HOS_DUTY_LIMIT_MINUTES, formatHosClock, getDriverScheduledWindow, normalizeDriverHours } from '../src/utils/driverHOS.js'

test('empty HOS state normalizes to legal default clocks without phantom timestamps', () => {
  const hours = normalizeDriverHours({}, 500)
  assert.equal(hours.drivingRemainingMinutes, HOS_DRIVING_LIMIT_MINUTES)
  assert.equal(hours.dutyRemainingMinutes, HOS_DUTY_LIMIT_MINUTES)
  assert.equal(hours.cycleRemainingMinutes, HOS_CYCLE_LIMIT_MINUTES)
  assert.equal(hours.dutySessionStartGameMinute, null)
  assert.equal(hours.offDutySinceGameMinute, null)
  assert.equal(hours.lastProcessedGameMinute, 500)
})

test('cross-midnight workday remains owned by the prior schedule day', () => {
  const driver = { workdayByDay: { 0: { startMinutes: 14 * 60, endMinutes: 3 * 60 } } }
  const window = getDriverScheduledWindow(driver, { gameDayIndex: 1, totalMinutesOfDay: 60 })
  assert.equal(window.ownerDayIndex, 0)
  assert.equal(window.startAbsolute, 14 * 60)
  assert.equal(window.endAbsolute, 27 * 60)
})

test('HOS clock formatting remains compact and stable', () => {
  assert.equal(formatHosClock(660), '11:00')
  assert.equal(formatHosClock(75), '01:15')
})
