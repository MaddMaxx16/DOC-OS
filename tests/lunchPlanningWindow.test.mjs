import test from 'node:test'
import assert from 'node:assert/strict'
import { getLunchPlanningContext, isLunchDecisionReady } from '../src/utils/lunchDecisionEvents.js'
import { getLoadHosEvaluation } from '../src/utils/hosPlanning.js'

function driverWith(workday, day = 0) {
  return { id: 'marcus', workdayByDay: { [String(day)]: workday } }
}
const game = (day, minute) => ({ gameDayIndex: day, totalMinutesOfDay: minute })

const base = {
  startMinutes: 420, endMinutes: 1020, carrierConfirmed: true,
  lunchWindowStartMinutes: 690, lunchWindowEndMinutes: 780,
  lunchDurationMinutes: 30,
}

test('dispatcher lunch window does not interrupt before its earliest time', () => {
  assert.equal(isLunchDecisionReady({ driver: driverWith(base), loads: [], gameTime: game(0, 689) }), false)
})

test('dispatcher lunch window becomes actionable inside the protected window', () => {
  assert.equal(isLunchDecisionReady({ driver: driverWith(base), loads: [], gameTime: game(0, 720) }), true)
})

test('dispatcher lunch window stops offering a stale break after its latest time', () => {
  assert.equal(isLunchDecisionReady({ driver: driverWith(base), loads: [], gameTime: game(0, 781) }), false)
})

test('legacy lunch start remains compatible when no dispatcher window exists', () => {
  const legacy = { startMinutes: 420, endMinutes: 1020, lunchStartMinutes: 720, lunchDurationMinutes: 30 }
  const context = getLunchPlanningContext({ driver: driverWith(legacy), gameTime: game(0, 750) })
  assert.equal(context.source, 'legacy-start')
  assert.equal(isLunchDecisionReady({ driver: driverWith(legacy), loads: [], gameTime: game(0, 750) }), true)
})

test('cross-midnight workday keeps prior-day lunch planning ownership', () => {
  const overnight = driverWith({
    startMinutes: 1320, endMinutes: 360,
    lunchWindowStartMinutes: 60, lunchWindowEndMinutes: 120,
    lunchDurationMinutes: 30,
  })
  const context = getLunchPlanningContext({ driver: overnight, gameTime: game(1, 90) })
  assert.equal(context.ownerDay, 0)
  assert.equal(context.source, 'dispatcher-window')
  assert.equal(isLunchDecisionReady({ driver: overnight, loads: [], gameTime: game(1, 90) }), true)
})


test('FreightLink fit defers a new load until a protected lunch window ends', () => {
  const driver = {
    id: 'marcus',
    homeBaseLocationId: 'metroline-yard',
    workdayByDay: {
      '0': {
        startMinutes: 420,
        endMinutes: 1020,
        carrierConfirmed: true,
        lunchWindowStartMinutes: 720,
        lunchWindowEndMinutes: 780,
      },
    },
    hours: {
      drivingRemainingMinutes: 660,
      dutyRemainingMinutes: 840,
      cycleRemainingMinutes: 4200,
      status: 'off-duty',
    },
  }

  const load = {
    id: 'third',
    pickupLocationId: 'empire-freight-terminal',
    deliveryLocationId: 'harborline-logistics',
    pickupDayIndex: 0,
    pickupWindowStartMinutes: 810,
    pickupWindowEndMinutes: 870,
    deliveryDayIndex: 0,
    deliveryWindowStartMinutes: 900,
    deliveryWindowEndMinutes: 990,
    listedMiles: 21,
  }

  const result = getLoadHosEvaluation({
    load,
    driver,
    loads: [],
    runtimePositions: {},
    gameTime: game(0, 690),
  })

  assert.equal(result.lunchAdjusted, true)
  assert.equal(result.projectedStartMinute, 780)
  assert.equal(result.lunchWindowStartMinute, 720)
  assert.equal(result.lunchWindowEndMinute, 780)
  assert.ok(result.projectedPickupArrivalMinute >= 780)
})
