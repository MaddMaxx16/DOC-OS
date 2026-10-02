import test from 'node:test'
import assert from 'node:assert/strict'
import { isRateConfirmationConfirmed, needsRateConfirmationBeforeDeparture, createRateConfirmation } from '../src/utils/rateConfirmation.js'
import { canAcquireDriverMovement, resolveDriverMovementOwner } from '../src/utils/driverMovementOwner.js'
import { sanitizePromotedLoad } from '../src/utils/driverQueue.js'
import { getDriverPanelModel } from '../src/utils/driverOperationalState.js'

const load = { id: 'freight', assignedDriverId: 'marcus', status: 'assigned', tripStatus: 'assigned' }
const driver = { id: 'marcus' }
const gameTime = { gameDayIndex: 0, totalMinutesOfDay: 500 }

test('approval and schedule acknowledgement cannot substitute for current-document confirmation', () => {
  for (const rateConfirmation of [null, { status: 'RECEIVED' }, { status: 'CORRECTION_REQUESTED' }, { status: 'CONFIRMED', isCurrent: false }, { status: 'CONFIRMED', loadId: 'other' }]) {
    const pending = { ...load, carrierApprovalStatus: 'APPROVED', driverAcknowledgedGameMinute: 450, rateConfirmation }
    assert.equal(isRateConfirmationConfirmed(pending), false)
    assert.equal(canAcquireDriverMovement({ driver, gameTime, loads: [pending] }, 'freight', pending.id), false)
  }
  const confirmed = { ...load, rateConfirmation: { status: 'CONFIRMED', loadId: load.id, isCurrent: true } }
  assert.equal(canAcquireDriverMovement({ driver, gameTime, loads: [confirmed] }, 'freight', confirmed.id), true)
})

test('a revised current document requires a new confirmation and ignores confirmed history', () => {
  const original = createRateConfirmation(load, 400)
  const revised = { ...load, rateConfirmation: { ...original, id: 'ratecon:freight:v2', version: 2, status: 'RECEIVED', history: [{ ...original, status: 'CONFIRMED', isCurrent: false }] } }
  assert.equal(needsRateConfirmationBeforeDeparture(revised), true)
  assert.equal(canAcquireDriverMovement({ driver, gameTime, loads: [revised] }, 'freight', revised.id), false)
  revised.rateConfirmation.status = 'CONFIRMED'
  assert.equal(canAcquireDriverMovement({ driver, gameTime, loads: [revised] }, 'freight', revised.id), true)
})

test('queued promotion preserves acknowledgement but cannot depart without a confirmed rate con', () => {
  const queued = { ...load, tripStatus: 'queued', pickupDriverBriefedGameMinute: 450, driverAcknowledgedGameMinute: 451 }
  const held = sanitizePromotedLoad(queued, 500)
  assert.equal(held.tripStatus, 'assigned')
  assert.equal(held.departureGameMinute, null)
  assert.equal(held.driverAcknowledgedGameMinute, 451)
  assert.equal(sanitizePromotedLoad({ ...queued, rateConfirmation: { status: 'CONFIRMED' } }, 500).tripStatus, 'en-route-pickup')
})

test('the panel explains the hold without interrupting already active travel or facility ownership', () => {
  const panel = getDriverPanelModel({ driver, assignedLoad: load, gameTime })
  assert.equal(panel.operationalState, 'RATE_CONFIRMATION_REQUIRED')
  assert.equal(panel.actionType, 'REVIEW_RATE_CON')
  assert.equal(panel.attentionRequired, true)
  for (const tripStatus of ['en-route-pickup', 'waiting-at-pickup']) {
    const underway = { ...load, tripStatus }
    assert.equal(needsRateConfirmationBeforeDeparture(underway), false)
    assert(['freight', 'freight-hold'].includes(resolveDriverMovementOwner({ driver, gameTime, loads: [underway] }).type))
  }
})
