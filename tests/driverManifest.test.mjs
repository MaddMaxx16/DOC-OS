import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyManifestPlanToLoads,
  buildDriverManifest,
  getDriverTrailerState,
  planDriverManifestInsertion,
} from '../src/utils/driverManifest.js'
import { buildDriverItinerary, getNextActionableDriverStop } from '../src/utils/driverItinerary.js'

const driver = {
  id: 'marcus',
  homeBaseLocationId: 'metroline-yard',
  equipment: { type: 'dry-van', label: "53' Dry Van", capacityPallets: 26, maxWeightLbs: 44000 },
  workdayByDay: {
    '0': { startMinutes: 420, endMinutes: 1020, carrierConfirmed: true },
  },
}

function load({
  id,
  number,
  pickup,
  delivery,
  pickupStart,
  pickupEnd,
  deliveryStart,
  deliveryEnd,
  pallets,
  weight,
  status = 'assigned',
  tripStatus = status,
  order = null,
}) {
  return {
    id,
    loadNumber: number,
    pickupLocationId: pickup,
    deliveryLocationId: delivery,
    pickupDayIndex: 0,
    pickupWindowStartMinutes: pickupStart,
    pickupWindowEndMinutes: pickupEnd,
    deliveryDayIndex: 0,
    deliveryWindowStartMinutes: deliveryStart,
    deliveryWindowEndMinutes: deliveryEnd,
    freight: {
      pallets,
      weightLbs: weight,
      equipmentType: 'dry-van',
      equipmentLabel: "53' Dry Van",
      trailerCapacityPallets: 26,
      trailerMaxWeightLbs: 44000,
    },
    status,
    tripStatus,
    assignedDriverId: 'marcus',
    manifestStopOrder: order,
    rateConfirmation: { status: 'CONFIRMED' },
  }
}

test('manifest permits pickup 2 before delivery 1 and carries both loads onboard', () => {
  const l1 = load({
    id: 'L1', number: 'L1', pickup: 'empire-freight-terminal', delivery: 'harborline-logistics',
    pickupStart: 480, pickupEnd: 540, deliveryStart: 660, deliveryEnd: 720,
    pallets: 8, weight: 12000, order: { pickup: 0, delivery: 2 },
  })
  const l2 = load({
    id: 'L2', number: 'L2', pickup: 'queens-freight-center', delivery: 'freshway-grocery-dc',
    pickupStart: 570, pickupEnd: 630, deliveryStart: 780, deliveryEnd: 840,
    pallets: 6, weight: 9000, status: 'queued', tripStatus: 'queued', order: { pickup: 1, delivery: 3 },
  })

  const manifest = buildDriverManifest([l1, l2], 'marcus', { driver })
  assert.deepEqual(manifest.stops.map((stop) => stop.id), ['L1:pickup', 'L2:pickup', 'L1:delivery', 'L2:delivery'])

  const afterSecondPickup = manifest.capacitySnapshots.find((snapshot) => snapshot.stopId === 'L2:pickup')
  assert.deepEqual(afterSecondPickup.onboardLoadIds.sort(), ['L1', 'L2'])
  assert.equal(afterSecondPickup.palletsUsed, 14)
  assert.equal(afterSecondPickup.weightUsedLbs, 21000)
  assert.equal(afterSecondPickup.overCapacity, false)
})

test('onboard state includes loaded freight, not only onboard-hold', () => {
  const loaded = load({
    id: 'L1', number: 'L1', pickup: 'empire-freight-terminal', delivery: 'harborline-logistics',
    pickupStart: 480, pickupEnd: 540, deliveryStart: 660, deliveryEnd: 720,
    pallets: 8, weight: 12000, status: 'loaded', tripStatus: 'loaded',
  })
  const held = load({
    id: 'L2', number: 'L2', pickup: 'queens-freight-center', delivery: 'freshway-grocery-dc',
    pickupStart: 570, pickupEnd: 630, deliveryStart: 780, deliveryEnd: 840,
    pallets: 6, weight: 9000, status: 'onboard', tripStatus: 'onboard-hold',
  })

  const state = getDriverTrailerState([loaded, held], 'marcus', driver)
  assert.deepEqual(state.onboardLoadIds.sort(), ['L1', 'L2'])
  assert.equal(state.palletsUsed, 14)
  assert.equal(state.palletsRemaining, 12)
})

test('manifest next stop can be pickup 2 while load 1 remains onboard', () => {
  const l1 = load({
    id: 'L1', number: 'L1', pickup: 'empire-freight-terminal', delivery: 'harborline-logistics',
    pickupStart: 480, pickupEnd: 540, deliveryStart: 660, deliveryEnd: 720,
    pallets: 8, weight: 12000, status: 'onboard', tripStatus: 'onboard-hold',
    order: { pickup: 0, delivery: 2 },
  })
  l1.loadedGameMinute = 510

  const l2 = load({
    id: 'L2', number: 'L2', pickup: 'queens-freight-center', delivery: 'freshway-grocery-dc',
    pickupStart: 570, pickupEnd: 630, deliveryStart: 780, deliveryEnd: 840,
    pallets: 6, weight: 9000, status: 'queued', tripStatus: 'queued',
    order: { pickup: 1, delivery: 3 },
  })
  l2.pickupDriverBriefedGameMinute = 450
  l2.driverAcknowledgedGameMinute = 451

  const itinerary = buildDriverItinerary([l1, l2], 'marcus')
  assert.deepEqual(itinerary.map((stop) => [stop.id, stop.state]), [
    ['L1:pickup', 'completed'],
    ['L2:pickup', 'communicated'],
    ['L1:delivery', 'onboard-hold'],
    ['L2:delivery', 'planned'],
  ])
  assert.equal(getNextActionableDriverStop([l1, l2], 'marcus')?.id, 'L2:pickup')
})

test('candidate manifest planner finds a stacked pickup when first delivery is later', () => {
  const l1 = load({
    id: 'L1', number: 'L1', pickup: 'empire-freight-terminal', delivery: 'harborline-logistics',
    pickupStart: 480, pickupEnd: 540, deliveryStart: 660, deliveryEnd: 720,
    pallets: 8, weight: 12000,
  })
  const candidate = {
    ...load({
      id: 'L2', number: 'L2', pickup: 'queens-freight-center', delivery: 'freshway-grocery-dc',
      pickupStart: 570, pickupEnd: 630, deliveryStart: 780, deliveryEnd: 840,
      pallets: 6, weight: 9000, status: 'available', tripStatus: 'available',
    }),
    assignedDriverId: null,
    candidateDriverId: 'marcus',
  }

  const plan = planDriverManifestInsertion({
    loads: [l1],
    driver,
    candidateLoad: candidate,
    gameTime: { gameDayIndex: 0, totalMinutesOfDay: 360 },
    runtimePositions: {},
  })

  assert.ok(plan)
  assert.equal(plan.violations.length, 0)
  const ids = plan.sequenceSteps.map((step) => `${step.loadId}:${step.type}`)
  assert.deepEqual(ids, ['L1:pickup', 'L2:pickup', 'L1:delivery', 'L2:delivery'])

  const committed = applyManifestPlanToLoads([l1, candidate], 'marcus', plan)
  assert.deepEqual(committed.find((item) => item.id === 'L1').manifestStopOrder, { pickup: 0, delivery: 2 })
  assert.deepEqual(committed.find((item) => item.id === 'L2').manifestStopOrder, { pickup: 1, delivery: 3 })
})

test('manifest stop order supports P1 P2 D1 P3 D2 D3', () => {
  const l1 = load({
    id: 'L1', number: 'L1', pickup: 'empire-freight-terminal', delivery: 'harborline-logistics',
    pickupStart: 480, pickupEnd: 540, deliveryStart: 660, deliveryEnd: 720,
    pallets: 8, weight: 12000, order: { pickup: 0, delivery: 2 },
  })
  const l2 = load({
    id: 'L2', number: 'L2', pickup: 'queens-freight-center', delivery: 'freshway-grocery-dc',
    pickupStart: 570, pickupEnd: 630, deliveryStart: 780, deliveryEnd: 840,
    pallets: 6, weight: 9000, status: 'queued', tripStatus: 'queued', order: { pickup: 1, delivery: 4 },
  })
  const l3 = load({
    id: 'L3', number: 'L3', pickup: 'brooklyn-industrial-terminal', delivery: 'bronx-commerce-terminal',
    pickupStart: 720, pickupEnd: 780, deliveryStart: 900, deliveryEnd: 960,
    pallets: 10, weight: 14000, status: 'queued', tripStatus: 'queued', order: { pickup: 3, delivery: 5 },
  })

  const manifest = buildDriverManifest([l1, l2, l3], 'marcus', { driver })
  assert.deepEqual(manifest.stops.map((stop) => stop.id), [
    'L1:pickup', 'L2:pickup', 'L1:delivery', 'L3:pickup', 'L2:delivery', 'L3:delivery',
  ])
  assert.equal(manifest.violations.length, 0)
})
