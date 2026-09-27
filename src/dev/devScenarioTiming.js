export function getOvernightDeliveryTiming(gameDayIndex) {
  return {
    deliveryDayIndex: gameDayIndex + 1,
    deliveryWindowStartMinutes: 45,
    deliveryWindowEndMinutes: 90,
  }
}

export function getControlled5pmDeliveryTiming(gameDayIndex) {
  return {
    deliveryDepartureGameMinute: gameDayIndex * 1440 + 16 * 60 + 55,
    deliveryDayIndex: gameDayIndex,
    deliveryWindowStartMinutes: 17 * 60,
    deliveryWindowEndMinutes: 23 * 60 + 59,
  }
}
