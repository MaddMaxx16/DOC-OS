import { createPodDocument } from './documentLifecycle.js'
import { getNextActionableDriverStop } from './driverItinerary.js'
import { resolveDriverWorkdayOwnership } from './driverWorkdayOwnership.js'
const DELIVERY_UNLOADING_START_STATUSES = new Set([
  'waiting-at-delivery',
  'checked-in-delivery',
  'unloading-delivery',
])

export function beginDeliveryUnloading(load, gameMinute) {
  if (!load || !DELIVERY_UNLOADING_START_STATUSES.has(load.tripStatus)) return null
  return {
    ...load,
    tripStatus: 'unloading-delivery',
    deliveryUnloadStartGameMinute: Number.isFinite(load.deliveryUnloadStartGameMinute)
      ? load.deliveryUnloadStartGameMinute
      : gameMinute,
  }
}

export function getDeliveryUnloadingChallengeRequest({ loads = [], activeChallengeLoadId = null } = {}) {
  if (activeChallengeLoadId) return null
  const interruptedUnload = loads.find((load) => load?.tripStatus === 'unloading-delivery' && load.assignedDriverId)
  return interruptedUnload ? { loadId: interruptedUnload.id } : null
}


export function completeDeliveryUnload({ load, result, completeMinute, releasedDriverId }) {
  if (!load || !result) return load
  const shipment = load.shipment || {}
  const manifest = Array.isArray(shipment.palletManifest) ? shipment.palletManifest : []
  const shipmentExpected = Number(shipment.expectedPallets)
  const resultExpected = Number(result.expectedPallets)
  const shipmentLoaded = Number(shipment.loadedPallets)
  const resultReceived = Number(result.actualReceivedPallets)
  const piecesExpected = Number.isFinite(shipmentExpected) ? shipmentExpected : Number.isFinite(resultExpected) ? resultExpected : manifest.length
  const piecesReceived = Number.isFinite(shipmentLoaded) ? shipmentLoaded : Number.isFinite(resultReceived) ? resultReceived : manifest.filter((pallet) => pallet?.loaded !== false).length
  const missingPallets = Number.isFinite(Number(shipment.missingPallets)) ? Number(shipment.missingPallets) : Math.max(0, piecesExpected - piecesReceived)
  const damagedPallets = Number.isFinite(Number(shipment.damagedPallets)) ? Number(shipment.damagedPallets) : manifest.filter((pallet) => pallet?.loaded !== false && pallet?.damaged).length
  const podPiecesReceived = missingPallets > 0 ? piecesExpected : piecesReceived
  return {
    ...load, tripStatus: 'awaiting-pod', status: 'delivered', completedDriverId: releasedDriverId || load.completedDriverId || null,
    assignedDriverId: null, queuePosition: null, driverReleasedGameMinute: completeMinute, unloadChallengeState: null, deliveryUnloadCompleteGameMinute: completeMinute,
    facilityOps: { ...(load.facilityOps || {}), delivery: { ...result, expectedPallets: piecesExpected, actualReceivedPallets: piecesReceived, missingPallets, damagedPallets, completedGameMinute: completeMinute } },
    pod: createPodDocument({ status: 'complete', receivedGameMinute: completeMinute, viewedGameMinute: null, signedBy: 'Jordan Rivera', piecesExpected, piecesReceived: podPiecesReceived, damage: damagedPallets > 0 ? 'None' : 'None', correctionStatus: null, freightCondition: { source: 'pickup-shipment', expectedPallets: piecesExpected, loadedAtPickup: piecesReceived, missingAtPickup: missingPallets, damagedAtPickup: damagedPallets }, verification: { signature: false, pieceCount: false, damage: false, deliveryInfo: false }, verified: false, verifiedGameMinute: null }, load.id),
  }
}

export function getDeliveryHandoffContext({ loads = [], drivers = [], loadId, gameTime, now }) {
  const deliveredLoad = loads.find((item) => item.id === loadId) || null
  const releasedDriverId = deliveredLoad?.assignedDriverId || null
  const releasedDriver = drivers.find((driver) => driver.id === releasedDriverId) || null
  const day = Number(gameTime?.gameDayIndex)
  const ownership = resolveDriverWorkdayOwnership({ driver: releasedDriver, loads, gameTime })
  const withinCurrentWorkday = Boolean(ownership.workday && (
    ownership.scheduledTimeActive || ownership.carryoverRetainsOwnership || ownership.shiftEndRetainsOwnership
  ))

  // Ask the manifest what comes next after this delivery is removed from physical
  // authority. This replaces the old "onboard first, otherwise queue first"
  // heuristic, which could skip a planned pickup that belongs before another
  // onboard load's delivery.
  const postDeliveryLoads = loads.map((item) => item.id === loadId ? {
    ...item,
    tripStatus: 'completed',
    status: 'completed',
    completedDriverId: releasedDriverId || item.completedDriverId || null,
    assignedDriverId: null,
  } : item)
  const nextStop = releasedDriverId ? getNextActionableDriverStop(postDeliveryLoads, releasedDriverId) : null
  const nextLoad = nextStop ? postDeliveryLoads.find((item) => item.id === nextStop.loadId) || null : null
  const onboardNext = nextStop?.type === 'delivery' ? nextLoad : null
  const nextQueued = nextStop?.type === 'pickup' ? nextLoad : null
  const nextWasBriefed = Number.isFinite(nextQueued?.pickupDriverBriefedGameMinute) && Number.isFinite(nextQueued?.driverAcknowledgedGameMinute)
  const nextPickupIsCurrentOrEarlierDay = !Number.isFinite(Number(nextQueued?.pickupDayIndex)) || Number(nextQueued.pickupDayIndex) <= day

  return {
    deliveredLoad,
    releasedDriverId,
    nextStop,
    nextLoad,
    onboardNext,
    nextQueued,
    nextCanAutoHandoff: Boolean(nextQueued && nextWasBriefed && withinCurrentWorkday && nextPickupIsCurrentOrEarlierDay),
  }
}
