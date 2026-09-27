import test from 'node:test'
import assert from 'node:assert/strict'
import { getDriverRouteMovement, getLunchMovementFrame, getRouteMovementProgress, reconcileRestoredRouteProgress, restoreSavedRouteContinuity } from '../src/utils/runtimeMovement.js'

test('route movement progress clamps before, during, and after the leg', () => {
  assert.equal(getRouteMovementProgress({ currentGameMinute: 90, startGameMinute: 100, durationMinutes: 20 }), 0)
  assert.equal(getRouteMovementProgress({ currentGameMinute: 110, startGameMinute: 100, durationMinutes: 20 }), 0.5)
  assert.equal(getRouteMovementProgress({ currentGameMinute: 130, startGameMinute: 100, durationMinutes: 20 }), 1)
})

test('driver route movement preserves the existing route interpolation behavior', () => {
  const movement = getDriverRouteMovement({ geometry: [[-73, 40], [-72, 41]], currentGameMinute: 110, startGameMinute: 100, durationMinutes: 20 })
  assert.deepEqual(movement, { progress: 0.5, position: { longitude: -72.5, latitude: 40.5 }, complete: false })
})

test('lunch movement frame updates traveling and resume-access drivers without marking egress as a lunch arrival', () => {
  const drivers = [
    { id: 'marcus', lunchRouteStatus: 'traveling', lunchRouteGeometry: [[-73, 40], [-72, 41]], lunchRouteStartGameMinute: 100, lunchRouteDurationMinutes: 20 },
    { id: 'alex', lunchRouteStatus: 'resume-access', lunchRouteGeometry: [[-74, 39], [-73, 40]], lunchRouteStartGameMinute: 100, lunchRouteDurationMinutes: 10 },
    { id: 'parked', lunchRouteStatus: 'arrived', lunchRouteGeometry: [[0, 0], [1, 1]], lunchRouteStartGameMinute: 100, lunchRouteDurationMinutes: 10 },
  ]
  const frame = getLunchMovementFrame(drivers, 120)
  assert.deepEqual(frame.positionUpdates.marcus, { longitude: -72, latitude: 41 })
  assert.deepEqual(frame.positionUpdates.alex, { longitude: -73, latitude: 40 })
  assert.deepEqual(frame.arrivals, ['marcus'])
  assert.equal(frame.positionUpdates.parked, undefined)
})

test('invalid movement data is ignored rather than creating a bad runtime position', () => {
  assert.equal(getDriverRouteMovement({ geometry: [[0, 0]], currentGameMinute: 10, startGameMinute: 0, durationMinutes: 10 }), null)
  assert.equal(getRouteMovementProgress({ currentGameMinute: 10, startGameMinute: 0, durationMinutes: 0 }), null)
})


test('restored mid-route progress never regresses when simulation resumes', () => {
  const result = reconcileRestoredRouteProgress({ currentGameMinute: 110, startGameMinute: 100, durationMinutes: 40, restoredProgress: 0.6 })
  assert.deepEqual(result, { progress: 0.6, startGameMinute: 86, rebased: true })
})

test('normal live movement keeps the original departure clock when it is already ahead', () => {
  const result = reconcileRestoredRouteProgress({ currentGameMinute: 130, startGameMinute: 100, durationMinutes: 40, restoredProgress: 0.5 })
  assert.deepEqual(result, { progress: 0.75, startGameMinute: 100, rebased: false })
})


test('hydration preserves the saved mid-route position and aligns pickup departure before Play', () => {
  const savedPosition = { longitude: -72.4, latitude: 40.6 }
  const result = restoreSavedRouteContinuity({
    load: { id: 'load-1', tripStatus: 'en-route-pickup', departureGameMinute: 100, plannedDeadheadDriveTimeMinutes: 40 },
    savedPosition,
    savedProgress: 0.6,
    currentGameMinute: 110,
  })
  assert.deepEqual(result, { position: savedPosition, progress: 0.6, startGameMinute: 86, rebased: true, delivery: false })
})

test('hydration preserves the saved mid-route position and aligns delivery departure before Play', () => {
  const savedPosition = { longitude: -73.5, latitude: 40.8 }
  const result = restoreSavedRouteContinuity({
    load: { id: 'load-2', tripStatus: 'en-route-delivery', deliveryDepartureGameMinute: 200, plannedLoadedDriveTimeMinutes: 60 },
    savedPosition,
    savedProgress: 0.25,
    currentGameMinute: 230,
  })
  assert.deepEqual(result, { position: savedPosition, progress: 0.25, startGameMinute: 215, rebased: true, delivery: true })
})
