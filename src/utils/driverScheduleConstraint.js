function finite(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function getDriverScheduleWindow(driver, dayIndex) {
  if (!driver || !Number.isFinite(Number(dayIndex))) return null
  const ownerDayIndex = Number(dayIndex)
  const workday = driver.workdayByDay?.[String(ownerDayIndex)] || driver.workdayByDay?.[ownerDayIndex] || null
  if (!workday || workday.isDayOff) return null
  const startMinutes = finite(workday.startMinutes)
  const endMinutes = finite(workday.endMinutes)
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return null
  const endDayOffset = Number.isFinite(Number(workday.endDayOffset))
    ? Number(workday.endDayOffset)
    : (endMinutes <= startMinutes ? 1 : 0)
  return {
    ownerDayIndex,
    workday,
    startAbsoluteMinute: ownerDayIndex * 1440 + startMinutes,
    endAbsoluteMinute: ownerDayIndex * 1440 + endMinutes + endDayOffset * 1440,
  }
}

// P1.1.1 — Schedule-Owned Driver Time
// The carrier-confirmed shift is the outer availability boundary. Appointment
// windows only conflict when they cannot overlap that shift. When projected
// operational times are supplied, those become the authoritative fit check.
export function getDriverScheduleConstraint(load, driver, projection = {}) {
  if (!load || !driver) return { ok: false, label: 'SELECT DRIVER', reason: 'missing-driver', detail: 'Choose a driver before evaluating schedule fit.' }
  const pickupDay = finite(load.pickupDayIndex)
  const deliveryDay = finite(load.deliveryDayIndex, pickupDay)
  const workday = pickupDay === null ? null : (driver.workdayByDay?.[String(pickupDay)] || driver.workdayByDay?.[pickupDay] || null)
  if (!workday) return { ok: false, label: 'NO CARRIER SCHEDULE', reason: 'no-carrier-schedule', detail: 'Carrier has not confirmed this pickup day.' }
  if (workday.isDayOff) return { ok: false, label: 'DRIVER OFF', reason: 'driver-off', detail: 'Carrier has the driver off on pickup day.' }
  const window = getDriverScheduleWindow(driver, pickupDay)
  if (!window) return { ok: false, label: 'NO CARRIER SCHEDULE', reason: 'incomplete-carrier-schedule', detail: 'Carrier shift is incomplete.' }

  const pickupWindowEnd = finite(load.pickupWindowEndMinutes, finite(load.pickupWindowStartMinutes, 0))
  const deliveryWindowStart = finite(load.deliveryWindowStartMinutes, finite(load.deliveryWindowEndMinutes, 0))
  const pickupWindowEndAbs = pickupDay * 1440 + pickupWindowEnd
  const deliveryWindowStartAbs = deliveryDay * 1440 + deliveryWindowStart
  const projectedPickup = finite(projection.projectedPickupServiceStartMinute)
  const projectedComplete = finite(projection.projectedDeliveryCompleteMinute)

  if (Number.isFinite(projectedPickup) && projectedPickup < window.startAbsoluteMinute) {
    return { ok: false, label: 'SHIFT CONFLICT', reason: 'projected-pickup-before-shift', detail: 'Projected pickup work begins before the carrier-confirmed shift.' }
  }
  if (!Number.isFinite(projectedPickup) && pickupWindowEndAbs < window.startAbsoluteMinute) {
    return { ok: false, label: 'SHIFT CONFLICT', reason: 'pickup-window-before-shift', detail: 'The pickup window closes before the driver becomes available.' }
  }
  if (Number.isFinite(projectedComplete) && projectedComplete > window.endAbsoluteMinute) {
    const over = Math.ceil(projectedComplete - window.endAbsoluteMinute)
    return { ok: false, label: 'SHIFT CONFLICT', reason: 'projected-completion-after-shift', detail: `Projected work extends about ${over} min beyond the carrier-confirmed shift.` }
  }
  if (!Number.isFinite(projectedComplete) && deliveryWindowStartAbs > window.endAbsoluteMinute) {
    return { ok: false, label: 'SHIFT CONFLICT', reason: 'delivery-window-after-shift', detail: 'The delivery window does not open until after the carrier-confirmed shift.' }
  }
  return { ok: true, label: 'SCHEDULE FIT', reason: 'inside-carrier-shift', detail: 'The projected plan fits inside the carrier-confirmed shift.', window }
}
