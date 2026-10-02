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


export function isRateConfirmationConfirmed(load) {
  const document = load?.rateConfirmation
  return Boolean(document && document.status === 'CONFIRMED' && document.isCurrent !== false
    && (!document.loadId || document.loadId === load.id))
}

export function needsRateConfirmationBeforeDeparture(load) {
  return Boolean(load?.assignedDriverId
    && ['assigned', 'queued', 'route-ready', 'loaded', 'onboard-hold'].includes(load.tripStatus || load.status)
    && !isRateConfirmationConfirmed(load))
}

export function getRateConfirmationHoldReason(load) {
  if (isRateConfirmationConfirmed(load)) return null
  if (!load?.rateConfirmation) return 'Awaiting the rate confirmation. The driver must hold until it arrives and you confirm it.'
  if (load.rateConfirmation.status === 'CORRECTION_REQUESTED') return 'Awaiting a corrected rate confirmation. Review and confirm the new copy before the driver departs.'
  return 'Review and confirm the current rate confirmation before the driver departs.'
}
