import { getFreightReference } from './freightIdentity.js'

export function createRateConfirmation(load, issuedGameMinute, carrierName = 'Carrier') {
  if (!load) return null
  const existing = load.rateConfirmation
  if (existing?.id) return existing
  return {
    id: `ratecon:${load.id}:v1`,
    type: 'rate-confirmation',
    loadId: load.id,
    reference: `RC-${getFreightReference(load)}`,
    version: 1,
    isCurrent: true,
    status: 'RECEIVED',
    issuedGameMinute,
    carrierName,
    pickupLocationId: load.pickupLocationId,
    deliveryLocationId: load.deliveryLocationId,
    pickupDayIndex: load.pickupDayIndex,
    pickupWindowStartMinutes: load.pickupWindowStartMinutes,
    pickupWindowEndMinutes: load.pickupWindowEndMinutes,
    deliveryDayIndex: load.deliveryDayIndex,
    deliveryWindowStartMinutes: load.deliveryWindowStartMinutes,
    deliveryWindowEndMinutes: load.deliveryWindowEndMinutes,
    rate: Number(load.rate),
    listedMiles: Number(load.listedMiles),
    reviewChecks: {},
    reviewStatus: 'PENDING',
    history: [],
  }
}
