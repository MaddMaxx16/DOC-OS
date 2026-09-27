import test from 'node:test'
import assert from 'node:assert/strict'
import { getRouteLifecycleLabel, getRouteLifecycleTone } from '../src/utils/routeLifecycle.js'

test('active route states map to stable player-facing labels', () => {
  assert.equal(getRouteLifecycleLabel({ tripStatus: 'en-route-pickup' }), 'EN ROUTE TO PICKUP')
  assert.equal(getRouteLifecycleLabel({ tripStatus: 'awaiting-pod' }), 'DELIVERED · POD PENDING')
  assert.equal(getRouteLifecycleLabel({ tripStatus: 'completed' }), 'COMPLETED')
})

test('pre-trip states retain approval and communication hierarchy', () => {
  assert.equal(getRouteLifecycleLabel({ status: 'available', carrierApprovalStatus: 'PENDING' }), 'PENDING APPROVAL')
  assert.equal(getRouteLifecycleLabel({ status: 'booked', scheduleCommunicatedGameMinute: 100 }), 'COMMUNICATED')
  assert.equal(getRouteLifecycleTone({ tripStatus: 'en-route-delivery' }), 'booked')
})
