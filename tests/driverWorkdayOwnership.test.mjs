import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyLunchWindowToOwnedWorkday, hasValidLunchWindow, resolveDriverWorkdayOwnership } from '../src/utils/driverWorkdayOwnership.js'
import { createOvernightDevDriver } from '../src/dev/devPresets.js'
import { getDriverScheduleAuthority } from '../src/utils/driverScheduleAuthority.js'
import { getDriverScheduledWindow } from '../src/utils/driverHOS.js'
import { getOwnedShiftWindow } from '../src/utils/shiftEndDecision.js'
import { getLunchPlanningContext } from '../src/utils/lunchDecisionEvents.js'
import { getDeliveryHandoffContext } from '../src/utils/deliveryLifecycle.js'
import { advanceDockLifecycle } from '../src/utils/dockLifecycle.js'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const driverScheduler = readFileSync(new URL('../src/components/DriverSchedulerScreen.jsx', import.meta.url), 'utf8')
const phoneOverlay = readFileSync(new URL('../src/components/PhoneOverlay.jsx', import.meta.url), 'utf8')

const time = (day, minute) => ({ gameDayIndex: day, totalMinutesOfDay: minute })
const workdays = {
  0: { startMinutes: 420, endMinutes: 1020, lunchWindowStartMinutes: 720, lunchWindowEndMinutes: 780 },
  1: { startMinutes: 420, endMinutes: 1020 },
}
const hours = (ownerDay = 0, status = 'on-duty') => ({
  dutySessionDayIndex: ownerDay,
  dutySessionStartGameMinute: ownerDay * 1440 + 420,
  status,
})
const activeLoad = (status = 'en-route-delivery') => ({ id: 'A', assignedDriverId: 'marcus', tripStatus: status })

test('A: normal daytime schedule owns its active window and releases after normal completion', () => {
  const driver = { id: 'marcus', workdayByDay: workdays }
  const active = resolveDriverWorkdayOwnership({ driver, loads: [], gameTime: time(0, 900) })
  assert.equal(active.ownerDayIndex, 0)
  assert.equal(active.scheduledTimeActive, true)
  const ended = resolveDriverWorkdayOwnership({ driver, loads: [], gameTime: time(0, 1100) })
  assert.equal(ended.released, true)
  assert.equal(ended.nextScheduleMayAcquire, true)
})

test('B: scheduled cross-midnight shift remains owned by its start day', () => {
  const driver = { id: 'marcus', workdayByDay: { 0: { startMinutes: 840, endMinutes: 180 }, 1: { startMinutes: 420, endMinutes: 1020 } } }
  for (const minute of [1, 150]) {
    const owner = resolveDriverWorkdayOwnership({ driver, loads: [], gameTime: time(1, minute) })
    assert.equal(owner.ownerDayIndex, 0)
    assert.equal(owner.scheduledTimeActive, true)
  }
})

test('C/G: ordinary overtime freight retains prior owner and blocks next schedule acquisition', () => {
  const driver = { id: 'marcus', workdayByDay: workdays, hours: hours(0, 'driving') }
  const loads = [activeLoad()]
  const owner = resolveDriverWorkdayOwnership({ driver, loads, gameTime: time(1, 60) })
  assert.equal(owner.ownerDayIndex, 0)
  assert.equal(owner.carryoverRetainsOwnership, true)
  assert.equal(owner.nextScheduleMayAcquire, false)
  assert.equal(getDriverScheduleAuthority(driver, time(1, 60)).state, 'CARRYOVER')
  assert.equal(getDriverScheduledWindow(driver, time(1, 60)).ownerDayIndex, 0)

  const released = { ...driver, hours: hours(0, 'off-duty'), idleRouteStatus: 'arrived', overnightAppliedDayIndex: 0 }
  const next = resolveDriverWorkdayOwnership({ driver: released, loads: [], gameTime: time(1, 480) })
  assert.equal(next.ownerDayIndex, 1)
  assert.equal(next.scheduledTimeActive, true)
  assert.equal(next.nextScheduleMayAcquire, true)
})

test('D: prior-day Shift End plan remains authoritative after overtime freight releases', () => {
  const driver = {
    id: 'marcus', workdayByDay: workdays, hours: hours(0),
    shiftEndPlanDayIndex: 0, shiftEndPlanType: 'yard', shiftEndLocationId: 'metroline-yard',
  }
  const ownerDuringFreight = resolveDriverWorkdayOwnership({ driver, loads: [activeLoad()], gameTime: time(1, 60) })
  const ownerAfterFreight = resolveDriverWorkdayOwnership({ driver, loads: [], gameTime: time(1, 61) })
  assert.equal(ownerDuringFreight.ownerDayIndex, 0)
  assert.equal(ownerAfterFreight.ownerDayIndex, 0)
  assert.equal(ownerAfterFreight.shiftEndRetainsOwnership, true)
  assert.equal(getOwnedShiftWindow(driver, time(1, 61), []).ownerDay, 0)
  assert.match(app, /const ownership = resolveDriverWorkdayOwnership\(\{ driver, loads, gameTime \}\)/)
  assert.match(app, /Number\(driver\.shiftEndPlanDayIndex\) === Number\(workdayOwnerDay\)/)
})

test('E: active prior-day Lunch remains attached to its owner across midnight', () => {
  const driver = {
    id: 'marcus', hours: hours(0), lunchRouteStatus: 'arrived',
    workdayByDay: {
      0: { startMinutes: 840, endMinutes: 180, lunchWindowStartMinutes: 60, lunchWindowEndMinutes: 120,
        lunchEvent: { status: 'on-lunch', selectedChoiceId: 'stop', actualStartGameMinute: 1470, endGameMinute: 1500 } },
      1: { startMinutes: 420, endMinutes: 1020 },
    },
  }
  const context = getLunchPlanningContext({ driver, loads: [], gameTime: time(1, 45) })
  assert.equal(context.ownerDay, 0)
  assert.equal(resolveDriverWorkdayOwnership({ driver, loads: [], gameTime: time(1, 45) }).ownerDayIndex, 0)
})

test('F: persisted prior-owner facts derive the same owner after hydration', () => {
  const state = {
    driver: { id: 'marcus', workdayByDay: workdays, hours: hours(0), shiftEndPlanDayIndex: 0, shiftEndLocationId: 'metroline-yard' },
    loads: [activeLoad()], gameTime: time(1, 15),
  }
  const hydrated = JSON.parse(JSON.stringify(state))
  assert.equal(resolveDriverWorkdayOwnership({ driver: hydrated.driver, loads: hydrated.loads, gameTime: hydrated.gameTime }).ownerDayIndex, 0)
  hydrated.loads = []
  assert.equal(resolveDriverWorkdayOwnership({ driver: hydrated.driver, loads: hydrated.loads, gameTime: hydrated.gameTime }).ownerDayIndex, 0)
})

test('H: delivery handoff uses retained prior operational workday after midnight', () => {
  const driver = { id: 'marcus', workdayByDay: workdays, hours: hours(0) }
  const loads = [
    { id: 'done', assignedDriverId: 'marcus', tripStatus: 'unloading-delivery' },
    { id: 'next', assignedDriverId: 'marcus', tripStatus: 'queued', queuePosition: 1, pickupDayIndex: 1,
      pickupDriverBriefedGameMinute: 1000, driverAcknowledgedGameMinute: 1001 },
  ]
  const handoff = getDeliveryHandoffContext({ loads, drivers: [driver], loadId: 'done', gameTime: time(1, 60), now: 1500 })
  assert.equal(handoff.nextCanAutoHandoff, true)
})

test('I: dock lifecycle finds prior-owner Lunch effect after midnight', () => {
  const driver = {
    id: 'marcus', hours: hours(0),
    workdayByDay: { ...workdays, 0: { ...workdays[0], lunchEvent: { status: 'completed', selectedChoiceId: 'quick', selectedGameMinute: 900 } } },
    lunchEffectsByDay: { 0: { earlyCheckInBonusMinutes: 5 } },
  }
  const load = {
    id: 'dock', assignedDriverId: 'marcus', tripStatus: 'checking-in-delivery', deliveryCheckInStartGameMinute: 1495,
    deliveryDayIndex: 1, deliveryWindowStartMinutes: 120, deliveryWindowEndMinutes: 180,
  }
  const waiting = advanceDockLifecycle(load, 1500, { drivers: [driver], loads: [load], gameDayIndex: 1 })
  assert.equal(waiting.tripStatus, 'waiting-at-delivery')
  assert.equal(waiting.lunchEarlyCheckInBonusAppliedMinutes, 5)
  assert.equal(waiting.deliveryDockReadyGameMinute, 1555)
})

test('J: overnight DEV driver is a deterministic 2 PM to 3 AM prior-day workday', () => {
  const contaminated = {
    id: 'marcus', status: 'available', assignedLoadId: 'old',
    workdayByDay: { 0: { startMinutes: 420, endMinutes: 1020, lunchWindowStartMinutes: 720, lunchWindowEndMinutes: 780, lunchEvent: { status: 'on-lunch' } }, 1: workdays[1] },
    hours: hours(9),
    lunchEffectsByDay: { 0: { earlyCheckInBonusMinutes: 5 } },
    lunchOfferHistory: [{ dayIndex: 0 }],
    lunchRouteStatus: 'traveling', shiftEndPlanDayIndex: 0, shiftEndLocationId: 'old-yard',
    overnightAppliedDayIndex: 0, overnightMode: 'truck-stop', overnightTargetLocationId: 'old-stop',
    idleRouteStatus: 'traveling', idleTargetLocationId: 'old-stop',
  }
  const driver = createOvernightDevDriver(contaminated, time(0, 1425), 'DOC113')
  assert.deepEqual(
    { start: driver.workdayByDay[0].startMinutes, end: driver.workdayByDay[0].endMinutes, offset: driver.workdayByDay[0].endDayOffset, crosses: driver.workdayByDay[0].crossesMidnight },
    { start: 840, end: 180, offset: 1, crosses: true },
  )
  assert.equal(driver.hours.dutySessionDayIndex, 0)
  assert.equal(driver.hours.dutySessionStartGameMinute, 840)
  assert.equal(driver.hours.status, 'driving')
  assert.equal(driver.workdayByDay[0].lunchWindowStartMinutes, undefined)
  assert.equal(driver.workdayByDay[0].lunchEvent, undefined)
  assert.deepEqual(driver.lunchEffectsByDay, {})
  assert.deepEqual(driver.lunchOfferHistory, [])
  assert.equal(driver.lunchRouteStatus, null)
  assert.equal(driver.shiftEndPlanDayIndex, null)
  assert.equal(driver.shiftEndLocationId, null)
  assert.equal(driver.overnightAppliedDayIndex, null)
  assert.equal(driver.overnightMode, null)
  assert.equal(driver.idleRouteStatus, null)
})

test('K: overnight DEV owner remains day zero after midnight', () => {
  const driver = createOvernightDevDriver({ id: 'marcus', workdayByDay: { 0: workdays[0], 1: workdays[1] }, hours: {} }, time(0, 1425), 'DOC113')
  const load = { id: 'DOC113', assignedDriverId: 'marcus', tripStatus: 'en-route-delivery' }
  const ownership = resolveDriverWorkdayOwnership({ driver, loads: [load], gameTime: time(1, 1) })
  assert.equal(ownership.ownerDayIndex, 0)
  assert.equal(ownership.workday.startMinutes, 840)
  assert.equal(ownership.workday.endMinutes, 180)
})

test('L: Driver Hub Lunch save after midnight mutates the operational owner and remains editable', () => {
  const baseDriver = createOvernightDevDriver({ id: 'marcus', workdayByDay: { 0: workdays[0], 1: workdays[1] }, hours: {} }, time(0, 1425), 'DOC113')
  const loads = [{ id: 'DOC113', assignedDriverId: 'marcus', tripStatus: 'en-route-delivery' }]
  const saved = applyLunchWindowToOwnedWorkday(baseDriver, loads, time(1, 1), {
    lunchWindowStartMinutes: 60, lunchWindowEndMinutes: 120, lunchWindowSetBy: 'dispatcher',
  }, 1441)
  assert.equal(saved.workdayByDay[0].lunchWindowStartMinutes, 60)
  assert.equal(saved.workdayByDay[0].lunchWindowEndMinutes, 120)
  assert.equal(saved.workdayByDay[0].lunchWindowUpdatedGameMinute, 1441)
  assert.equal(saved.workdayByDay[1].lunchWindowStartMinutes, undefined)
  assert.equal(hasValidLunchWindow(saved.workdayByDay[0]), true)

  const edited = applyLunchWindowToOwnedWorkday(saved, loads, time(1, 30), {
    lunchWindowStartMinutes: 75, lunchWindowEndMinutes: 135,
  }, 1470)
  assert.equal(edited.workdayByDay[0].lunchWindowStartMinutes, 75)
  assert.equal(edited.workdayByDay[1].lunchWindowStartMinutes, undefined)
})

test('M: overnight Lunch becomes actionable on its prior-day window while daytime behavior is unchanged', () => {
  const overnight = createOvernightDevDriver({ id: 'marcus', workdayByDay: { 0: workdays[0], 1: workdays[1] }, hours: {} }, time(0, 1425), 'DOC113')
  const planned = applyLunchWindowToOwnedWorkday(overnight, [], time(1, 60), { lunchWindowStartMinutes: 60, lunchWindowEndMinutes: 120 })
  assert.equal(getLunchPlanningContext({ driver: planned, loads: [], gameTime: time(1, 90) }).ownerDay, 0)

  const daytime = applyLunchWindowToOwnedWorkday({ id: 'marcus', workdayByDay: workdays }, [], time(0, 600), { lunchWindowStartMinutes: 690, lunchWindowEndMinutes: 780 })
  assert.equal(daytime.workdayByDay[0].lunchWindowStartMinutes, 690)
  assert.equal(resolveDriverWorkdayOwnership({ driver: daytime, loads: [], gameTime: time(0, 600) }).ownerDayIndex, 0)
})

test('N: Driver Hub production path resolves, saves, and labels the owned Lunch workday', () => {
  assert.match(driverScheduler, /resolveDriverWorkdayOwnership\(\{ driver, loads, gameTime \}\)/)
  assert.match(driverScheduler, /onSetLunchWindow\?\.\(lunchDriver\.id, lunchOwnership\.ownerDayIndex, window\)/)
  assert.match(driverScheduler, /hasValidLunchWindow\(workday\)/)
  assert.match(phoneOverlay, /applyLunchWindowToOwnedWorkday\(driver, loads, gameTime, lunchWindow, nowGameMinute\)/)
  assert.equal(hasValidLunchWindow({ lunchWindowStartMinutes: 60, lunchWindowEndMinutes: 120 }), true)
  assert.equal(hasValidLunchWindow({ lunchWindowStartMinutes: 60 }), false)
  assert.equal(hasValidLunchWindow({ lunchWindowStartMinutes: 60, lunchWindowEndMinutes: 60 }), false)
})
