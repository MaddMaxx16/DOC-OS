import {
  DELIVERY_CHECKIN_MINUTES,
  PICKUP_CHECKIN_MINUTES,
  getDeliveryDockWaitMinutes,
  getPickupDockWaitMinutes,
} from '../data/pickupConfig.js'

export function advanceDockLifecycle(load, now, { drivers = [], loads = [], gameDayIndex = Math.floor(now / 1440) } = {}) {
  if (load.tripStatus === 'at-pickup') return {
    ...load,
    tripStatus: 'checking-in-pickup',
    pickupArrivalGameMinute: Number.isFinite(load.pickupArrivalGameMinute) ? load.pickupArrivalGameMinute : now,
    pickupCheckInStartGameMinute: now,
  }
  if (load.tripStatus === 'checking-in-pickup' && Number.isFinite(load.pickupCheckInStartGameMinute) && now - load.pickupCheckInStartGameMinute >= PICKUP_CHECKIN_MINUTES) {
    const driver = drivers.find((item) => item.id === load.assignedDriverId)
    const dayKey = String(gameDayIndex)
    const lunchEvent = driver?.workdayByDay?.[dayKey]?.lunchEvent
    const lunchEffect = driver?.lunchEffectsByDay?.[dayKey]
    const bonusAlreadyUsed = loads.some((item) => item.id !== load.id
      && (item.assignedDriverId === load.assignedDriverId || item.completedDriverId === load.assignedDriverId)
      && Number(item.lunchEarlyCheckInBonusAppliedMinutes || 0) > 0)
    const earlyCheckInBonusMinutes = !bonusAlreadyUsed && Number(lunchEvent?.selectedGameMinute) <= now
      ? Math.max(0, Number(lunchEffect?.earlyCheckInBonusMinutes || 0))
      : 0
    return {
      ...load,
      tripStatus: 'waiting-at-pickup',
      pickupCheckInGameMinute: now,
      lunchEarlyCheckInBonusAppliedMinutes: earlyCheckInBonusMinutes,
      pickupDockReadyGameMinute: now + getPickupDockWaitMinutes(load, now, earlyCheckInBonusMinutes),
    }
  }
  if (load.tripStatus === 'waiting-at-pickup' && Number.isFinite(load.pickupDockReadyGameMinute) && now >= load.pickupDockReadyGameMinute) {
    return { ...load, tripStatus: 'checked-in-pickup' }
  }
  if (load.tripStatus === 'at-delivery') return {
    ...load,
    tripStatus: 'checking-in-delivery',
    deliveryArrivalGameMinute: Number.isFinite(load.deliveryArrivalGameMinute) ? load.deliveryArrivalGameMinute : now,
    deliveryCheckInStartGameMinute: now,
  }
  if (load.tripStatus === 'checking-in-delivery' && Number.isFinite(load.deliveryCheckInStartGameMinute) && now - load.deliveryCheckInStartGameMinute >= DELIVERY_CHECKIN_MINUTES) {
    const driver = drivers.find((item) => item.id === load.assignedDriverId)
    const dayKey = String(gameDayIndex)
    const lunchEvent = driver?.workdayByDay?.[dayKey]?.lunchEvent
    const lunchEffect = driver?.lunchEffectsByDay?.[dayKey]
    const bonusAlreadyUsed = loads.some((item) => item.id !== load.id
      && (item.assignedDriverId === load.assignedDriverId || item.completedDriverId === load.assignedDriverId)
      && Number(item.lunchEarlyCheckInBonusAppliedMinutes || 0) > 0)
      || Number(load.lunchEarlyCheckInBonusAppliedMinutes || 0) > 0
    const earlyCheckInBonusMinutes = !bonusAlreadyUsed && Number(lunchEvent?.selectedGameMinute) <= now
      ? Math.max(0, Number(lunchEffect?.earlyCheckInBonusMinutes || 0))
      : 0
    return {
      ...load,
      tripStatus: 'waiting-at-delivery',
      deliveryCheckInGameMinute: now,
      lunchEarlyCheckInBonusAppliedMinutes: earlyCheckInBonusMinutes,
      deliveryDockReadyGameMinute: now + getDeliveryDockWaitMinutes(load, now, earlyCheckInBonusMinutes),
    }
  }
  if (load.tripStatus === 'waiting-at-delivery' && Number.isFinite(load.deliveryDockReadyGameMinute) && now >= load.deliveryDockReadyGameMinute) {
    return { ...load, tripStatus: 'checked-in-delivery' }
  }
  return load
}
