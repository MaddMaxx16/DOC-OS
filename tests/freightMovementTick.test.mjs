import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reconcileFreightMovement } from '../src/utils/runtimeMovement.js'

// Execute the production App effect itself with React setters replaced by spies.
// This catches unconditional writes or a runtime bypass, not just helper output.
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
assert.match(appSource, /import \{[^}]*\breconcileFreightMovement\b[^}]*\} from '\.\/utils\/runtimeMovement\.js'/)
const marker = appSource.indexOf('// P2.3.3 — Freight ticks')
assert.ok(marker >= 0, 'The production freight effect must remain covered by this harness')
const effectStart = appSource.lastIndexOf('  useEffect(() => {', marker)
const effectEnd = appSource.indexOf('\n\n  useEffect', marker)
assert.ok(effectStart >= 0 && effectEnd > marker)
const runAppEffect = new Function(
  'useEffect', 'reconcileFreightMovement', 'gameTime', 'loads', 'drivers',
  'runtimePositions', 'runtimeProgressByDriver', 'mapLocations',
  'setLoads', 'setRuntimePositions', 'setRuntimeProgressByDriver',
  appSource.slice(effectStart, effectEnd),
)

function createRuntime(phase = 'pickup', { minute = 110, progress, position, departure = 100 } = {}) {
  const route = [[-73, 40], [-72, 41]]
  const departureKey = phase === 'pickup' ? 'departureGameMinute' : 'deliveryDepartureGameMinute'
  const routeKey = phase === 'pickup' ? 'plannedDeadheadRouteGeometry' : 'plannedLoadedRouteGeometry'
  const durationKey = phase === 'pickup' ? 'plannedDeadheadDriveTimeMinutes' : 'plannedLoadedDriveTimeMinutes'
  const state = {
    gameTime: { gameDayIndex: 0, totalMinutesOfDay: minute },
    drivers: [{ id: 'marcus' }],
    loads: [{
      id: 'load-1', assignedDriverId: 'marcus', tripStatus: `en-route-${phase}`,
      pickupLocationId: 'pickup', deliveryLocationId: 'delivery',
      [departureKey]: departure, [routeKey]: route, [durationKey]: 40,
    }],
    runtimePositions: position ? { marcus: position } : {},
    runtimeProgressByDriver: progress === undefined ? {} : { marcus: progress },
  }
  const locations = ['pickup', 'delivery'].map((id) => ({ id, longitude: -71.9, latitude: 41.1 }))
  const calls = []
  const setter = (key) => (update) => {
    calls.push({ key, update })
    state[key] = typeof update === 'function' ? update(state[key]) : update
  }
  function tick() {
    const before = calls.length
    runAppEffect((callback, dependencies) => {
      // Comparisons must observe current positions as well as all prior inputs.
      for (const key of ['gameTime', 'loads', 'drivers', 'runtimePositions', 'runtimeProgressByDriver']) {
        assert.ok(dependencies.includes(state[key]), `Missing ${key} dependency`)
      }
      callback()
    }, reconcileFreightMovement, state.gameTime, state.loads, state.drivers,
    state.runtimePositions, state.runtimeProgressByDriver, locations,
    setter('loads'), setter('runtimePositions'), setter('runtimeProgressByDriver'))
    return calls.slice(before)
  }
  return { state, tick, calls, departureKey, routeKey, durationKey, locations }
}

function assertSettled(runtime) {
  const references = { ...runtime.state }
  assert.deepEqual(runtime.tick(), [], 'A settled tick must not even call setters')
  for (const key of Object.keys(references)) assert.equal(runtime.state[key], references[key], key)
}

test('production freight effect settles at the same minute with no setters or reference churn', () => {
  const runtime = createRuntime()
  const loads = runtime.state.loads
  assert.deepEqual(runtime.tick().map(({ key }) => key), ['runtimeProgressByDriver', 'runtimePositions'])
  assert.equal(runtime.state.runtimeProgressByDriver.marcus, 0.25)
  assert.deepEqual(runtime.state.runtimePositions.marcus, { longitude: -72.75, latitude: 40.25 })
  assert.equal(runtime.state.loads, loads)
  assertSettled(runtime)
})

for (const phase of ['pickup', 'delivery']) {
  test(`production ${phase} tick advances normally by one minute`, () => {
    const runtime = createRuntime(phase)
    runtime.tick()
    const before = runtime.state.runtimePositions.marcus
    runtime.state.gameTime = { ...runtime.state.gameTime, totalMinutesOfDay: 111 }
    assert.equal(runtime.tick().length, 2)
    assert.equal(runtime.state.runtimeProgressByDriver.marcus, 0.275)
    assert.ok(runtime.state.runtimePositions.marcus.longitude > before.longitude)
    assert.ok(runtime.state.runtimePositions.marcus.latitude > before.latitude)
    assertSettled(runtime)
  })

  test(`production ${phase} arrival snaps to the facility and commits exactly once`, () => {
    const runtime = createRuntime(phase, { minute: 140 })
    const drivers = runtime.state.drivers
    assert.equal(runtime.tick().filter(({ key }) => key === 'loads').length, 1)
    assert.equal(runtime.state.loads[0].tripStatus, `at-${phase}`)
    assert.equal(runtime.state.loads[0][`${phase}ArrivalGameMinute`], 140)
    assert.equal(runtime.state.runtimeProgressByDriver.marcus, 1)
    assert.deepEqual(runtime.state.runtimePositions.marcus, { longitude: -71.9, latitude: 41.1 })
    assert.equal(runtime.state.drivers, drivers)
    assertSettled(runtime)
    runtime.state.gameTime = { ...runtime.state.gameTime, totalMinutesOfDay: 141 }
    assertSettled(runtime)
  })

  test(`production restored ${phase} tick rebases once and never regresses saved progress`, () => {
    const savedPosition = { longitude: -72.4, latitude: 40.6 }
    const runtime = createRuntime(phase, { progress: 0.6, position: savedPosition })
    const progress = runtime.state.runtimeProgressByDriver
    const positions = runtime.state.runtimePositions
    assert.deepEqual(runtime.tick().map(({ key }) => key), ['loads'])
    assert.equal(runtime.state.loads[0][runtime.departureKey], 86)
    assert.equal(runtime.state.runtimeProgressByDriver, progress)
    assert.equal(runtime.state.runtimePositions, positions)
    assertSettled(runtime)
    runtime.state.gameTime = { ...runtime.state.gameTime, totalMinutesOfDay: 111 }
    runtime.tick()
    assert.equal(runtime.state.runtimeProgressByDriver.marcus, 0.625)
    assert.ok(runtime.state.runtimePositions.marcus.longitude >= savedPosition.longitude)
    assertSettled(runtime)
  })
}

test('paused production travel settles over repeated same-time reconciliations', () => {
  // Pause freezes gameTime in App; it is not a second movement clock.
  const runtime = createRuntime()
  runtime.tick()
  for (let index = 0; index < 20; index += 1) assertSettled(runtime)
  assert.equal(runtime.state.runtimeProgressByDriver.marcus, 0.25)
})

test('production freight tick writes nothing while lunch owns movement or holds the driver', () => {
  for (const lunchRouteStatus of ['calculating', 'traveling', 'arrived', 'resume-calculating', 'resume-access']) {
    const runtime = createRuntime()
    Object.assign(runtime.state.drivers[0], {
      lunchRouteStatus, lunchRouteGeometry: [[0, 0], [1, 1]],
      lunchRouteStartGameMinute: 100, lunchRouteDurationMinutes: 20,
    })
    assertSettled(runtime)
    runtime.state.gameTime = { ...runtime.state.gameTime, totalMinutesOfDay: 111 }
    assertSettled(runtime)
  }
})

test('same-minute authoritative geometry change updates position without progress churn', () => {
  const runtime = createRuntime()
  runtime.tick()
  runtime.state.loads = [{ ...runtime.state.loads[0], [runtime.routeKey]: [[-74, 40], [-72, 41]] }]
  assert.deepEqual(runtime.tick().map(({ key }) => key), ['runtimePositions'])
  assertSettled(runtime)
})

test('same-minute departure change is reconciled rather than hidden by a time-only guard', () => {
  const runtime = createRuntime()
  runtime.tick()
  runtime.state.loads = [{ ...runtime.state.loads[0], [runtime.departureKey]: 90 }]
  runtime.tick()
  assert.equal(runtime.state.runtimeProgressByDriver.marcus, 0.5)
  assertSettled(runtime)
})

test('freight functional commits preserve identity when replayed against already committed state', () => {
  const runtime = createRuntime('delivery', { minute: 140 })
  const writes = runtime.tick()
  for (const { key, update } of writes) assert.equal(update(runtime.state[key]), runtime.state[key])
})

test('production arrival preserves an existing arrival timestamp', () => {
  const runtime = createRuntime('pickup', { minute: 150 })
  runtime.state.loads[0].pickupArrivalGameMinute = 139
  runtime.tick()
  assert.equal(runtime.state.loads[0].pickupArrivalGameMinute, 139)
  assertSettled(runtime)
})

test('invalid freight movement data produces no production writes', () => {
  const runtime = createRuntime()
  runtime.state.loads[0][runtime.durationKey] = 0
  assertSettled(runtime)
})
