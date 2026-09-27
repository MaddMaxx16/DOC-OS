import test from 'node:test'
import assert from 'node:assert/strict'
import { getActiveRouteLineStyle, isActiveShiftEndStagingRoute, STAGING_ROUTE_COLOR } from '../src/utils/mapRouteVisual.js'

const activeColor = '#5AA7D9'

test('active Shift End staging route receives the amber staging treatment', () => {
  const driver = {
    idleRouteStatus: 'traveling',
    idleRouteGeometry: [[-74, 40.7], [-73.9, 40.8]],
    idleTargetLocationId: 'metroline-yard',
    overnightAppliedDayIndex: 0,
    overnightMode: 'yard',
  }

  assert.equal(isActiveShiftEndStagingRoute(driver), true)
  assert.deepEqual(getActiveRouteLineStyle({ activeRouteColor: activeColor, isStagingRoute: true }), {
    color: STAGING_ROUTE_COLOR,
    width: 4,
    opacity: 0.82,
    dasharray: [1.4, 1.1],
  })
})

test('normal freight route retains its existing delivery and pickup treatments', () => {
  assert.deepEqual(getActiveRouteLineStyle({ activeRouteColor: activeColor, tripStatus: 'en-route-delivery' }), {
    color: activeColor, width: 5.2, opacity: 0.96, dasharray: [1, 0.001],
  })
  assert.deepEqual(getActiveRouteLineStyle({ activeRouteColor: activeColor, tripStatus: 'en-route-pickup' }), {
    color: activeColor, width: 5.2, opacity: 0.96, dasharray: [2.2, 1.6],
  })
})

test('Lunch route retains its existing amber treatment', () => {
  assert.deepEqual(getActiveRouteLineStyle({ activeRouteColor: activeColor, hasLunchRoute: true }), {
    color: '#C39E5A', width: 5.2, opacity: 0.96, dasharray: [1, 0.001],
  })
})

test('unrelated idle repositioning is not classified as Shift End staging', () => {
  const driver = {
    idleRouteStatus: 'traveling',
    idleRouteGeometry: [[-74, 40.7], [-73.9, 40.8]],
    idleTargetLocationId: 'somewhere-else',
  }

  assert.equal(isActiveShiftEndStagingRoute(driver), false)
  assert.equal(getActiveRouteLineStyle({ activeRouteColor: activeColor }).color, activeColor)
})

test('staging classification derives from existing authoritative runtime fields', () => {
  const base = {
    idleRouteStatus: 'traveling',
    idleRouteGeometry: [[-74, 40.7], [-73.9, 40.8]],
    idleTargetLocationId: 'newark-fuel-stop',
    overnightAppliedDayIndex: 0,
    overnightMode: 'truck-stop',
  }
  assert.equal(isActiveShiftEndStagingRoute(base), true)
  assert.equal(isActiveShiftEndStagingRoute({ ...base, idleRouteStatus: 'arrived' }), false)
  assert.equal(isActiveShiftEndStagingRoute({ ...base, overnightAppliedDayIndex: null }), false)
  assert.equal(isActiveShiftEndStagingRoute({ ...base, overnightMode: null }), false)
})
