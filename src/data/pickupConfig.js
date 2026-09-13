export const PICKUP_WAIT_MINUTES = 5
export const PICKUP_CHECKIN_MINUTES = 5
export const PICKUP_LOADING_MINUTES = 10
export const DELIVERY_CHECKIN_MINUTES = 5
export const DELIVERY_UNLOAD_DURATION_MINUTES = 8

// Pickup Operations V1: facility timing is deterministic and appointment-aware.
// Marcus handles routine check-in automatically; the player is called back only
// when a dock is ready and loading requires attention.
export function getPickupDockWaitMinutes(load, checkInGameMinute) {
  const dayIndex = Number.isFinite(load?.pickupDayIndex) ? load.pickupDayIndex : Math.floor(checkInGameMinute / 1440)
  const windowStart = Number.isFinite(load?.pickupWindowStartMinutes)
    ? dayIndex * 1440 + load.pickupWindowStartMinutes
    : null
  const windowEnd = Number.isFinite(load?.pickupWindowEndMinutes)
    ? dayIndex * 1440 + load.pickupWindowEndMinutes
    : null

  if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) return 12

  // AV2.9.7: appointment windows are hard service gates. Drivers may arrive and
  // check in early, but the dock cannot become actionable before the window opens.
  // Preserve a short normal facility wait when arrival is on time.
  if (checkInGameMinute < windowStart) return Math.max(0, windowStart - checkInGameMinute)

  // On-time arrivals keep their slot and usually get a door quickly.
  if (checkInGameMinute <= windowEnd) return 12

  // A missed appointment can cost the original dock slot, but the penalty should
  // create an operational consequence rather than a long period of dead gameplay.
  return 35
}


// Delivery Operations V1 arrival lifecycle. Marcus owns routine receiver check-in.
// The player is called back only when the receiver has a dock/door ready.
export function getDeliveryDockWaitMinutes(load, checkInGameMinute) {
  const dayIndex = Number.isFinite(load?.deliveryDayIndex) ? load.deliveryDayIndex : Math.floor(checkInGameMinute / 1440)
  const windowStart = Number.isFinite(load?.deliveryWindowStartMinutes)
    ? dayIndex * 1440 + load.deliveryWindowStartMinutes
    : null
  const windowEnd = Number.isFinite(load?.deliveryWindowEndMinutes)
    ? dayIndex * 1440 + load.deliveryWindowEndMinutes
    : null

  if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) return 10
  // AV2.9.7: early delivery arrival is allowed, early unloading is not.
  if (checkInGameMinute < windowStart) return Math.max(0, windowStart - checkInGameMinute)
  if (checkInGameMinute <= windowEnd) return 10
  return 30
}
