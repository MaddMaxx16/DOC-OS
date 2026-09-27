import test from 'node:test'
import assert from 'node:assert/strict'
import { getDriverScheduleConstraint, getDriverScheduleWindow } from '../src/utils/driverScheduleConstraint.js'

const driver = {
  id: 'marcus',
  fullName: 'Marcus Reed',
  workdayByDay: {
    0: { startMinutes: 480, endMinutes: 1020 }, // 8 AM–5 PM
    1: { startMinutes: 840, endMinutes: 180, endDayOffset: 1 }, // 2 PM–3 AM
    2: { isDayOff: true },
  },
}

function load(overrides = {}) {
  return {
    pickupDayIndex: 0,
    pickupWindowStartMinutes: 450,
    pickupWindowEndMinutes: 570,
    deliveryDayIndex: 0,
    deliveryWindowStartMinutes: 900,
    deliveryWindowEndMinutes: 1080,
    ...overrides,
  }
}

test('schedule fit uses usable appointment overlap instead of requiring the whole window inside the shift', () => {
  const result = getDriverScheduleConstraint(load(), driver)
  assert.equal(result.ok, true)
  assert.equal(result.label, 'SCHEDULE FIT')
})

test('projected completion beyond shift end becomes a schedule conflict', () => {
  const result = getDriverScheduleConstraint(load(), driver, {
    projectedPickupServiceStartMinute: 600,
    projectedDeliveryCompleteMinute: 1050,
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'projected-completion-after-shift')
})

test('day off remains a hard schedule conflict', () => {
  const result = getDriverScheduleConstraint(load({ pickupDayIndex: 2, deliveryDayIndex: 2 }), driver)
  assert.equal(result.ok, false)
  assert.equal(result.label, 'DRIVER OFF')
})

test('cross-midnight carrier shift produces one continuous availability window', () => {
  const window = getDriverScheduleWindow(driver, 1)
  assert.equal(window.startAbsoluteMinute, 1 * 1440 + 840)
  assert.equal(window.endAbsoluteMinute, 1 * 1440 + 180 + 1440)
})
