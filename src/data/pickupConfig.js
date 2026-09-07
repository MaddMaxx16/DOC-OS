export const PICKUP_WAIT_MINUTES = 5
export const PICKUP_CHECKIN_MINUTES = 5
export const PICKUP_LOADING_MINUTES = 10
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

  // Early arrivals may be accepted before the appointment. Keep the facility wait
  // short enough to preserve game pace; appointment timing still matters for scoring.
  if (checkInGameMinute < windowStart) return 15

  // On-time arrivals keep their slot and usually get a door quickly.
  if (checkInGameMinute <= windowEnd) return 12

  // A missed appointment can cost the original dock slot, but the penalty should
  // create an operational consequence rather than a long period of dead gameplay.
  return 35
}
