import test from 'node:test'
import assert from 'node:assert/strict'
import { STANDARD_OPERATION_START_MINUTES, createDayReport, getEndDayStatus, getProgressionView } from '../src/utils/dayLoop.js'

test('end operations allows carryover instead of destroying active work', () => {
  const status = getEndDayStatus([
    { tripStatus: 'en-route-delivery' },
    { tripStatus: 'awaiting-pod' },
  ], [{ financialStatus: 'READY_TO_INVOICE' }])
  assert.equal(status.canEnd, true)
  assert.equal(status.blockers.length, 0)
  assert.equal(status.activeLoads, 2)
  assert.equal(status.driversInMotion, 1)
  assert.equal(status.pendingDocuments, 1)
  assert.equal(status.pendingInvoices, 1)
  assert.equal(status.carryover.length, 4)
})

test('closeout advances to the next 7 AM operations boundary', () => {
  const report = createDayReport({
    operationDay: 1,
    currentStartGameDayIndex: 0,
    gameTime: { gameDayIndex: 0, totalMinutesOfDay: 18 * 60 },
    loads: [], receivables: [], carriers: [],
  })
  assert.equal(report.nextStartGameDayIndex, 1)
  assert.equal(report.nextStartMinutes, STANDARD_OPERATION_START_MINUTES)
})

test('progression view derives level without mutating progression', () => {
  assert.deepEqual(getProgressionView({ xp: 750, reputation: 12 }), {
    xp: 750, level: 2, xpIntoLevel: 250, xpPerLevel: 500, reputation: 12,
  })
})
