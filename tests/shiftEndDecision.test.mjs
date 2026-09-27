import test from 'node:test'
import assert from 'node:assert/strict'
import { getShiftEndAlert } from '../src/utils/shiftEndDecision.js'

const driver = (overrides = {}) => ({
  id: 'marcus', fullName: 'Marcus Reed',
  workdayByDay: { 0: { startMinutes: 420, endMinutes: 1020, isDayOff: false } },
  ...overrides,
})
const time = (day, minute) => ({ gameDayIndex: day, totalMinutesOfDay: minute })

test('shift-end alert stays quiet before the 15 minute warning window', () => {
  assert.equal(getShiftEndAlert({ driver: driver(), gameTime: time(0, 1004) }), null)
})

test('shift-end alert appears exactly 15 minutes before scheduled end', () => {
  const alert = getShiftEndAlert({ driver: driver(), gameTime: time(0, 1005) })
  assert.equal(alert?.action, 'shift-end-decision')
  assert.equal(alert?.minutesToEnd, 15)
  assert.match(alert?.title || '', /SHIFT END SOON/)
})

test('shift-end alert remains unresolved after shift end', () => {
  const alert = getShiftEndAlert({ driver: driver(), gameTime: time(0, 1030) })
  assert.equal(alert?.overdue, true)
  assert.match(alert?.title || '', /PLAN NEEDED/)
})

test('saved shift-end plan clears the alert for that owner day', () => {
  const planned = driver({ shiftEndLocationId: 'yard', shiftEndPlanDayIndex: 0 })
  assert.equal(getShiftEndAlert({ driver: planned, gameTime: time(0, 1010) }), null)
})

test('day-off driver does not receive shift-end alert', () => {
  const off = driver({ workdayByDay: { 0: { isDayOff: true, startMinutes: 420, endMinutes: 1020 } } })
  assert.equal(getShiftEndAlert({ driver: off, gameTime: time(0, 1010) }), null)
})

test('cross-midnight shift warns 15 minutes before next-day end', () => {
  const overnight = driver({ workdayByDay: { 0: { startMinutes: 1320, endMinutes: 180, isDayOff: false } } })
  const alert = getShiftEndAlert({ driver: overnight, gameTime: time(1, 165) })
  assert.equal(alert?.minutesToEnd, 15)
  assert.equal(alert?.ownerDay, 0)
})
