import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAppointment, formatCompactDate, formatTime, getCalendarDate } from '../src/utils/gameTime.js'

test('game calendar stays anchored to September 7, 2026 UTC', () => {
  assert.equal(getCalendarDate(0).toISOString(), '2026-09-07T00:00:00.000Z')
  assert.equal(formatCompactDate(1), 'SEP 8')
})

test('game time formatting handles midnight, noon, and wraparound', () => {
  assert.equal(formatTime(0), '12:00 AM')
  assert.equal(formatTime(720), '12:00 PM')
  assert.equal(formatTime(1500), '1:00 AM')
  assert.equal(formatTime(-60), '11:00 PM')
})

test('appointment formatting preserves date and window', () => {
  assert.equal(formatAppointment(0, 600, 720), 'SEP 7 • 10:00 AM – 12:00 PM')
})
