import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { canAcquireDriverMovement, resolveDriverMovementOwner } from '../src/utils/driverMovementOwner.js'
import { anchorMovementRoute, getLunchMovementFrame, reconcileFreightMovement, reconcileIdleMovement } from '../src/utils/runtimeMovement.js'
import { resolveDriverWorkdayOwnership } from '../src/utils/driverWorkdayOwnership.js'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const main = readFileSync(new URL('../src/components/MainGameScreen.jsx', import.meta.url), 'utf8')

function runEffect(source, marker, scope) {
  const at = source.indexOf(marker)
  assert.ok(at >= 0, `Missing production marker: ${marker}`)
  const start = source.lastIndexOf('  useEffect(() => {', at)
  const close = /\n  }, \[[\s\S]*?\]\)/.exec(source.slice(at))
  assert.ok(close, 'Production effect boundary must be found')
  const code = source.slice(start, at + close.index + close[0].length)
  return new Function(...Object.keys(scope), 'useEffect', code)(...Object.values(scope), (callback) => callback())
}

function fixture({ freight = true, lunch = false, idle = false } = {}) {
  const state = {
    stage: 'game', gameTime: { gameDayIndex: 0, totalMinutesOfDay: 110 },
    drivers: [{ id: 'marcus', workdayByDay: { 0: { startMinutes: 0, endMinutes: 100 } },
      shiftEndPlanDayIndex: 0, shiftEndPlanType: 'yard', shiftEndLocationId: 'yard',
      ...(idle ? { idleRouteStatus: 'traveling', idleTargetLocationId: 'yard', overnightAppliedDayIndex: 0,
        idleRouteGeometry: [[10, 10], [20, 20]], idleRouteStartGameMinute: 100, idleRouteDurationMinutes: 40 } : {}),
      ...(lunch ? { lunchRouteStatus: 'traveling', lunchRouteGeometry: [[30, 30], [40, 40]],
        lunchRouteStartGameMinute: 100, lunchRouteDurationMinutes: 40 } : {}),
    }],
    loads: freight ? [{ id: 'freight', assignedDriverId: 'marcus', tripStatus: 'en-route-pickup',
      pickupLocationId: 'pickup', plannedDeadheadRouteGeometry: [[0, 0], [4, 4]],
      departureGameMinute: 100, plannedDeadheadDriveTimeMinutes: 40 }] : [],
    runtimePositions: { marcus: { longitude: 1, latitude: 1 } },
    runtimeProgressByDriver: {},
  }
  const writes = []
  const locations = [{ id: 'pickup', longitude: 4, latitude: 4 }, { id: 'yard', longitude: 20, latitude: 20 }]
  const movementStateRef = { current: state }
  const suspendedIdleDriversRef = { current: new Set() }
  const idleRouteRequestsRef = { current: new Map() }
  const setter = (key) => (update) => {
    writes.push(key)
    state[key] = typeof update === 'function' ? update(state[key]) : update
  }
  const setters = { setLoads: setter('loads'), setDrivers: setter('drivers'),
    setRuntimePositions: setter('positions'), setRuntimeProgressByDriver: setter('progress') }
  setters.setRuntimePositions = (update) => {
    writes.push('positions')
    state.runtimePositions = update(state.runtimePositions)
  }
  setters.setRuntimeProgressByDriver = (update) => {
    writes.push('progress')
    state.runtimeProgressByDriver = update(state.runtimeProgressByDriver)
  }

  // These local production helpers perform the command-path authority checks.
  const helperStart = main.indexOf('  const movementContext =')
  const helperEnd = main.indexOf('  const podNotificationCount', helperStart)
  assert.ok(helperStart > 0 && helperEnd > helperStart)
  const helpers = new Function('movementStateRef', 'canAcquireDriverMovement', 'resolveDriverMovementOwner', 'setRuntimeProgressByDriver',
    main.slice(helperStart, helperEnd) + '\nreturn { canMoveFreight, ownsLunch, setDriverRuntimeProgress }')(
    movementStateRef, canAcquireDriverMovement, resolveDriverMovementOwner, setters.setRuntimeProgressByDriver)

  const scope = (extra = {}) => ({ ...state, ...setters, ...helpers,
    movementStateRef, suspendedIdleDriversRef, idleRouteRequestsRef,
    mapLocations: locations, canAcquireDriverMovement, reconcileIdleMovement,
    reconcileFreightMovement, anchorMovementRoute, getLunchMovementFrame,
    resolveDriverWorkdayOwnership,
    currentAbsoluteGameMinute: state.gameTime.gameDayIndex * 1440 + state.gameTime.totalMinutesOfDay,
    ...extra,
  })
  const tickFreight = () => runEffect(app, '// P2.3.3 — Freight ticks', scope())
  const tickIdle = () => runEffect(app, '// P2.3.4 — staging/idle', scope())
  const tickLunch = () => runEffect(main, '    const { positionUpdates, arrivals } = getLunchMovementFrame', scope())
  const tickDepartures = () => {
    const marker = main.indexOf('// B.5.4D.4.2.13A')
    const source = main.slice(main.indexOf('  useEffect', marker))
    runEffect(source, '    const departures = []', scope())
  }
  const tickStaging = (requestIdleRoute = () => {}) => {
    const marker = app.indexOf('// B.4.2.4.2:')
    const source = app.slice(app.indexOf('  useEffect', marker))
    runEffect(source, '    const dayIndex = gameTime.gameDayIndex', scope({
      hydrated: true, dayLoop: { phase: 'operating' }, requestIdleRoute,
      getOvernightTruckStopId: () => 'yard',
    }))
  }
  const makeRouteRequest = (calculateRoute) => {
    const start = app.indexOf('  const requestIdleRoute =')
    const end = app.indexOf('  const [hydrated', start)
    return new Function('movementStateRef', 'idleRouteRequestsRef', 'mapLocations', 'calculateRoute', 'setDrivers', 'canAcquireDriverMovement', 'anchorMovementRoute',
      app.slice(start, end) + '\nreturn requestIdleRoute')(
      movementStateRef, idleRouteRequestsRef, locations, calculateRoute, setters.setDrivers, canAcquireDriverMovement, anchorMovementRoute)
  }
  return { state, writes, tickFreight, tickIdle, tickLunch, tickStaging, tickDepartures, makeRouteRequest, helpers }
}

test('production freight beats both saved staging intent and a conflicting active idle route', () => {
  const f = fixture({ idle: true })
  f.tickStaging()
  f.tickIdle()
  assert.deepEqual(f.writes, [])
  f.tickFreight()
  assert.deepEqual(f.writes, ['progress'])
  assert.equal(resolveDriverMovementOwner({ driver: f.state.drivers[0], ...f.state }).type, 'freight')
})

test('existing active lunch diversion wins over freight and staging: only lunch writes position', () => {
  const f = fixture({ lunch: true, idle: true })
  f.tickFreight()
  f.tickStaging()
  f.tickIdle()
  assert.deepEqual(f.writes, [])
  f.tickLunch()
  assert.deepEqual(f.writes, ['positions'])
  assert.deepEqual(f.state.runtimePositions.marcus, { longitude: 32.5, latitude: 32.5 })
})

test('passive lunch planning does not take movement from active freight', () => {
  const f = fixture()
  Object.assign(f.state.drivers[0].workdayByDay[0], { lunchWindowStartMinutes: 105, lunchWindowEndMinutes: 120 })
  f.tickLunch()
  assert.deepEqual(f.writes, [])
  f.tickFreight()
  assert.deepEqual(f.writes, ['progress'])
})

test('lunch without freight blocks both staging acquisition and staging position writes', () => {
  const f = fixture({ freight: false, lunch: true, idle: true })
  f.tickStaging()
  f.tickIdle()
  assert.deepEqual(f.writes, [])
})

test('production freight release permits existing Shift End staging from current position', async () => {
  const f = fixture()
  f.tickStaging()
  assert.deepEqual(f.writes, [])
  f.state.loads = []
  f.state.runtimePositions = { marcus: { longitude: 4, latitude: 4 } }
  f.tickStaging()
  assert.equal(f.state.drivers[0].idleRouteStatus, 'calculating')
  const origin = f.state.runtimePositions.marcus
  const request = f.makeRouteRequest(async (from) => {
    assert.equal(from, origin)
    return { routeShape: [[5, 5], [20, 20]], durationMinutes: 30 }
  })
  f.tickStaging(request)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(f.state.drivers[0].idleRouteStatus, 'traveling')
  assert.deepEqual(f.state.drivers[0].idleRouteGeometry[0], [4, 4])
  f.writes.length = 0
  f.tickIdle()
  assert.deepEqual(f.writes, [])
  assert.equal(f.state.runtimePositions.marcus, origin)
  f.state.gameTime = { ...f.state.gameTime, totalMinutesOfDay: 111 }
  f.tickIdle()
  assert.deepEqual(f.writes, ['positions'])
})

test('prior-day overtime freight release starts prior Shift End staging after midnight without a jump', async () => {
  const f = fixture()
  f.state.gameTime = { gameDayIndex: 1, totalMinutesOfDay: 60 }
  f.state.drivers[0] = {
    ...f.state.drivers[0],
    workdayByDay: { 0: { startMinutes: 420, endMinutes: 1020 }, 1: { startMinutes: 420, endMinutes: 1020 } },
    hours: { dutySessionDayIndex: 0, dutySessionStartGameMinute: 420, status: 'on-duty' },
  }
  f.state.runtimePositions = { marcus: { longitude: 7, latitude: 8 } }
  f.tickStaging()
  assert.equal(f.state.drivers[0].idleRouteStatus, undefined)

  f.state.loads = []
  f.tickStaging()
  assert.equal(f.state.drivers[0].idleRouteStatus, 'calculating')
  assert.equal(f.state.drivers[0].overnightAppliedDayIndex, 0)
  const origin = f.state.runtimePositions.marcus
  const request = f.makeRouteRequest(async (from) => {
    assert.equal(from, origin)
    return { routeShape: [[9, 9], [20, 20]], durationMinutes: 30 }
  })
  f.tickStaging(request)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(f.state.drivers[0].idleRouteStatus, 'traveling')
  assert.deepEqual(f.state.drivers[0].idleRouteGeometry[0], [7, 8])
  assert.equal(f.state.runtimePositions.marcus, origin)
})

test('idle reposition moves only with no higher owner and settles on a repeated tick', () => {
  const f = fixture({ freight: false, idle: true })
  f.tickIdle()
  assert.deepEqual(f.writes, ['positions'])
  assert.deepEqual(f.state.runtimePositions.marcus, { longitude: 12.5, latitude: 12.5 })
  f.writes.length = 0
  f.tickIdle()
  assert.deepEqual(f.writes, [])
})

test('no owner holds the exact position reference without any production tick writes', () => {
  const f = fixture({ freight: false })
  const positions = f.state.runtimePositions
  f.tickFreight()
  f.tickLunch()
  f.tickIdle()
  assert.deepEqual(f.writes, [])
  assert.equal(f.state.runtimePositions, positions)
})

test('suppressed stale staging route must reacquire instead of replaying elapsed geometry', () => {
  const f = fixture({ idle: true })
  f.tickIdle()
  f.state.loads = []
  f.state.runtimePositions = { marcus: { longitude: 7, latitude: 8 } }
  f.state.gameTime = { ...f.state.gameTime, totalMinutesOfDay: 500 }
  const position = f.state.runtimePositions
  f.tickIdle()
  assert.deepEqual(f.writes, ['drivers'])
  assert.equal(f.state.runtimePositions, position)
  assert.equal(f.state.drivers[0].idleRouteStatus, 'calculating')
})

test('same-tick multiple eligible systems produce exactly one position writer in either order', () => {
  for (const order of [['tickFreight', 'tickIdle', 'tickLunch'], ['tickLunch', 'tickIdle', 'tickFreight']]) {
    const f = fixture({ idle: true, lunch: true })
    for (const path of order) f[path]()
    assert.deepEqual(f.writes, ['positions'])
  }
})

test('late production staging route result cannot install over newly active lunch', async () => {
  const f = fixture({ freight: false })
  f.tickStaging()
  let finish
  const request = f.makeRouteRequest(() => new Promise((resolve) => { finish = resolve }))
  f.tickStaging(request)
  f.state.drivers = [{ ...f.state.drivers[0], lunchRouteStatus: 'calculating' }]
  f.writes.length = 0
  finish({ routeShape: [[1, 1], [20, 20]], durationMinutes: 30 })
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(f.writes, [])
  assert.equal(f.state.drivers[0].idleRouteStatus, 'calculating')
})

test('automatic freight departure cannot acquire an active lunch or staging owner', () => {
  for (const owner of ['lunch', 'idle']) {
    const f = fixture({ [owner]: true })
    f.state.loads[0].tripStatus = 'assigned'
    Object.assign(f.state.loads[0], { rateConfirmation: { status: 'CONFIRMED' }, driverAcknowledgedGameMinute: 100, pickupDayIndex: 0, pickupWindowStartMinutes: 110 })
    f.tickDepartures()
    assert.deepEqual(f.writes, [])
    assert.equal(f.state.loads[0].tripStatus, 'assigned')
  }
})

test('automatic departure anchors acquired freight route at current runtime position', () => {
  const f = fixture()
  f.state.loads[0].tripStatus = 'assigned'
  Object.assign(f.state.loads[0], { rateConfirmation: { status: 'CONFIRMED' }, driverAcknowledgedGameMinute: 100, pickupDayIndex: 0, pickupWindowStartMinutes: 110 })
  f.tickDepartures()
  assert.equal(f.state.loads[0].tripStatus, 'en-route-pickup')
  assert.deepEqual(f.state.loads[0].plannedDeadheadRouteGeometry[0], [1, 1])
  f.writes.length = 0
  f.tickFreight()
  assert.deepEqual(f.writes, [])
})

test('physical freight service reserves the driver against idle movement', () => {
  const f = fixture({ idle: true })
  f.state.loads[0].tripStatus = 'unloading-delivery'
  f.tickIdle()
  f.tickStaging()
  assert.deepEqual(f.writes, [])
})

test('lunch release reacquires staging at the lunch position without an old-route jump', () => {
  const f = fixture({ freight: false, lunch: true, idle: true })
  f.tickIdle()
  f.tickLunch()
  const position = f.state.runtimePositions
  f.state.drivers = [{ ...f.state.drivers[0], lunchRouteStatus: null }]
  f.writes.length = 0
  f.tickIdle()
  assert.deepEqual(f.writes, ['drivers'])
  assert.equal(f.state.runtimePositions, position)
  assert.equal(f.state.drivers[0].idleRouteStatus, 'calculating')
})

test('late staging result uses resolution time and cannot move on the acquisition frame', async () => {
  const f = fixture({ freight: false })
  f.tickStaging()
  let finish
  f.tickStaging(f.makeRouteRequest(() => new Promise((resolve) => { finish = resolve })))
  f.state.gameTime = { ...f.state.gameTime, totalMinutesOfDay: 130 }
  finish({ routeShape: [[2, 2], [20, 20]], durationMinutes: 30 })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(f.state.drivers[0].idleRouteStartGameMinute, 130)
  f.writes.length = 0
  f.tickIdle()
  assert.deepEqual(f.writes, [])
  assert.deepEqual(f.state.runtimePositions.marcus, { longitude: 1, latitude: 1 })
})

test('late staging route is rejected when freight acquired the driver during routing', async () => {
  const f = fixture({ freight: false })
  f.tickStaging()
  let finish
  f.tickStaging(f.makeRouteRequest(() => new Promise((resolve) => { finish = resolve })))
  f.state.loads = fixture().state.loads
  f.writes.length = 0
  finish({ routeShape: [[1, 1], [20, 20]], durationMinutes: 30 })
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(f.writes, [])
})

test('one automatic departure cannot launch two freight loads for the same driver', () => {
  const f = fixture()
  const load = { ...f.state.loads[0], rateConfirmation: { status: 'CONFIRMED' }, tripStatus: 'assigned', driverAcknowledgedGameMinute: 100,
    pickupDayIndex: 0, pickupWindowStartMinutes: 110 }
  f.state.loads = [load, { ...load, id: 'second-freight' }]
  f.tickDepartures()
  assert.equal(f.state.loads.filter((item) => item.tripStatus === 'en-route-pickup').length, 1)
})


test('real automatic departure holds an acknowledged schedule until the current rate con is confirmed', () => {
  const f = fixture()
  Object.assign(f.state.loads[0], { tripStatus: 'assigned', driverAcknowledgedGameMinute: 100, pickupDayIndex: 0, pickupWindowStartMinutes: 110 })
  for (const document of [null, { status: 'RECEIVED' }, { status: 'CORRECTION_REQUESTED' }, { status: 'CONFIRMED', isCurrent: false }]) {
    f.state.loads[0].rateConfirmation = document
    f.writes.length = 0
    f.tickDepartures()
    assert.equal(f.state.loads[0].tripStatus, 'assigned')
    assert.deepEqual(f.writes, [])
  }
  f.state.loads[0].rateConfirmation = { status: 'CONFIRMED', isCurrent: true }
  f.tickDepartures()
  assert.equal(f.state.loads[0].tripStatus, 'en-route-pickup')
})
