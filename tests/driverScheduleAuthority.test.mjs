import test from 'node:test'
import assert from 'node:assert/strict'
import { getDriverScheduleAuthority } from '../src/utils/driverScheduleAuthority.js'

const driver = { id: 'marcus', workdayByDay: { 0: { startMinutes: 420, endMinutes: 1020, isDayOff: false } } }

test('preset schedule blocks new work before shift start', () => {
  const result = getDriverScheduleAuthority(driver, { gameDayIndex: 0, totalMinutesOfDay: 419 })
  assert.equal(result.state, 'PRE_SHIFT')
  assert.equal(result.canStartNewWork, false)
})

test('preset schedule owns normal on-shift availability', () => {
  const result = getDriverScheduleAuthority(driver, { gameDayIndex: 0, totalMinutesOfDay: 855 })
  assert.equal(result.state, 'ON_SHIFT')
  assert.equal(result.canStartNewWork, true)
})

test('preset schedule blocks new work after shift end', () => {
  const result = getDriverScheduleAuthority(driver, { gameDayIndex: 0, totalMinutesOfDay: 1020 })
  assert.equal(result.state, 'POST_SHIFT')
  assert.equal(result.canStartNewWork, false)
})

test('cross-midnight preset schedule remains owned by the prior schedule day', () => {
  const overnight = { id: 'marcus', workdayByDay: { 0: { startMinutes: 840, endMinutes: 180, isDayOff: false }, 1: { isDayOff: true } } }
  const result = getDriverScheduleAuthority(overnight, { gameDayIndex: 1, totalMinutesOfDay: 120 })
  assert.equal(result.state, 'ON_SHIFT')
  assert.equal(result.ownerDayIndex, 0)
  assert.equal(result.canStartNewWork, true)
})
