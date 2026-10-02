import test from 'node:test'
import assert from 'node:assert/strict'
import { getLoadHosEvaluation } from '../src/utils/hosPlanning.js'

const driver = {
  id: 'marcus',
  homeBaseLocationId: 'metroline-yard',
  workdayByDay: {
    '0': {
      startMinutes: 420,
      endMinutes: 1020,
      carrierConfirmed: true,
    },
  },
  hours: {
    drivingRemainingMinutes: 660,
    dutyRemainingMinutes: 840,
    cycleRemainingMinutes: 4200,
    status: 'off-duty',
  },
}

const first = {
  id: 'DOC001',
  loadNumber: 'LD-78421',
  status: 'assigned',
  tripStatus: 'assigned',
  assignedDriverId: 'marcus',
  queuePosition: 0,
  pickupLocationId: 'empire-freight-terminal',
  deliveryLocationId: 'harborline-logistics',
  pickupDayIndex: 0,
  pickupWindowStartMinutes: 480,
  pickupWindowEndMinutes: 540,
  deliveryDayIndex: 0,
  deliveryWindowStartMinutes: 540,
  deliveryWindowEndMinutes: 600,
  plannedDeadheadDriveTimeMinutes: 38,
  plannedLoadedDriveTimeMinutes: 18,
  listedMiles: 16.9,
}

const second = {
  id: 'DOC117',
  loadNumber: 'LD-37814',
  status: 'queued',
  tripStatus: 'queued',
  assignedDriverId: 'marcus',
  queuePosition: 1,
  pickupLocationId: 'queens-freight-center',
  deliveryLocationId: 'freshway-grocery-dc',
  pickupDayIndex: 0,
  pickupWindowStartMinutes: 570,
  pickupWindowEndMinutes: 630,
  deliveryDayIndex: 0,
  deliveryWindowStartMinutes: 690,
  deliveryWindowEndMinutes: 780,
  plannedDeadheadDriveTimeMinutes: 17,
  plannedLoadedDriveTimeMinutes: 7,
  plannedDeadheadMiles: 8.5,
  listedMiles: 3.9,
}

test('reviewing a booked load does not project that same load before evaluating it', () => {
  const result = getLoadHosEvaluation({
    load: second,
    driver,
    loads: [first, second],
    runtimePositions: {},
    gameTime: { gameDayIndex: 0, totalMinutesOfDay: 360 },
  })

  assert.equal(result.projectedStartMinute, 548, 'Marcus should be free at 9:08 after Load 1')
  assert.equal(result.projectedPickupArrivalMinute, 565, '17 min deadhead should put him at pickup at 9:25')
  assert.equal(result.projectedPickupServiceStartMinute, 570, 'pickup waits for the 9:30 appointment')
  assert.equal(result.projectedDeliveryArrivalMinute, 587, 'delivery ETA should remain 9:47')
  assert.equal(result.projectedDeliveryCompleteMinute, 698, 'delivery service completes at 11:38 after waiting for the window')
})
