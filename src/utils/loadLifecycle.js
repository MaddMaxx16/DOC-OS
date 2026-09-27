export const PICKUP_LOADING_STATUSES = new Set([
  'waiting-at-pickup',
  'checked-in-pickup',
  'loading-at-pickup',
])

export function getPickupLoadingChallengeRequest({
  loads = [],
  activeChallengeLoadId = null,
  pendingHandoff = null,
} = {}) {
  if (pendingHandoff || activeChallengeLoadId) return null

  const load = loads.find((item) =>
    item?.tripStatus === 'loading-at-pickup' && item?.assignedDriverId,
  )

  return load ? { loadId: load.id } : null
}

export function beginPickupLoading(load, now) {
  if (!load || !PICKUP_LOADING_STATUSES.has(load.tripStatus)) return null

  return {
    ...load,
    tripStatus: 'loading-at-pickup',
    loadingStartGameMinute: Number.isFinite(load.loadingStartGameMinute)
      ? load.loadingStartGameMinute
      : now,
  }
}


export function completePickupLoading({ load, result, completeMinute }) {
  if (!load || !result) return load
  const hasIssue = Number(result.missingPallets || 0) > 0 || Number(result.damagedPallets || 0) > 0
  return {
    ...load,
    tripStatus: hasIssue ? 'pickup-issue' : 'onboard-hold',
    status: hasIssue ? load.status : 'onboard',
    loadingStartGameMinute: Number.isFinite(load.loadingStartGameMinute) ? load.loadingStartGameMinute : completeMinute,
    pickupLoadingCompleteGameMinute: completeMinute,
    plannedDeliveryDepartureGameMinute: null,
    deliveryDepartureGameMinute: null,
    waitingReason: hasIssue ? 'pickup-issue' : 'itinerary-next-stop',
    loadingChallengeState: null,
    facilityOps: { ...(load.facilityOps || {}), pickup: { ...result, completedGameMinute: completeMinute } },
    shipment: {
      expectedPallets: result.expectedPallets,
      loadedPallets: result.loadedPallets,
      missingPallets: result.missingPallets,
      damagedPallets: result.damagedPallets || 0,
      misplacedPallets: result.misplacedPallets || 0,
      palletManifest: result.palletManifest || [],
    },
  }
}
