import test from 'node:test'
import assert from 'node:assert/strict'
import { getLedgerSummary, getReceivables } from '../src/utils/ledger.js'

test('ledger summary separates earned, collected, and outstanding revenue', () => {
  const summary = getLedgerSummary([
    { dispatchRevenue: 100, financialStatus: 'PAID' },
    { dispatchRevenue: 75, financialStatus: 'READY_TO_INVOICE' },
  ])
  assert.deepEqual(summary, { revenueEarned: 175, outstanding: 75, collected: 100 })
})

test('receivables only exist for completed loads with approved PODs and active carrier data', () => {
  const loads = [
    { id: 'DOC001', tripStatus: 'completed', pod: { approved: true }, carrierId: 'metro', rate: 1000 },
    { id: 'DOC002', tripStatus: 'completed', pod: { approved: false }, carrierId: 'metro', rate: 900 },
  ]
  const carriers = [{ id: 'metro', name: 'Metroline', dispatchAgreement: { type: 'percentage', percentage: 10 } }]
  const rows = getReceivables(loads, carriers, {})
  assert.equal(rows.length, 1)
  assert.equal(rows[0].loadId, 'DOC001')
  assert.equal(rows[0].dispatchRevenue, 100)
  assert.equal(rows[0].financialStatus, 'READY_TO_INVOICE')
})
