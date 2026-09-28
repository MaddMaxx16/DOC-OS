import mapLocations from '../data/mapLocations.js'
import { normalizeDriverHours } from './driverHOS.js'
import { reconcileActiveCarrierDrivers } from './driverRoster.js'

function installConfirmedWorkdays(driver, carrierId, gameTime) {
  const confirmedStartDay = Number(gameTime?.gameDayIndex || 0)
  const confirmedAtGameMinute = confirmedStartDay * 1440 + Number(gameTime?.totalMinutesOfDay || 0)
  const workdayByDay = { ...(driver.workdayByDay || {}) }
  const templateStart = Number(driver.carrierScheduleTemplate?.startMinutes)
    || Number(driver.handoffScheduleTemplate?.startMinutes)
    || Number(driver.preferredStartMinutes)
    || Number(driver.defaultStartMinutes)
    || 420
  const templateEnd = Number(driver.carrierScheduleTemplate?.endMinutes)
    || Number(driver.handoffScheduleTemplate?.endMinutes)
    || Number(driver.preferredEndMinutes)
    || Number(driver.defaultEndMinutes)
    || ((templateStart + 600) % 1440)

  for (let offset = 0; offset < 3; offset += 1) {
    const dayIndex = confirmedStartDay + offset
    workdayByDay[String(dayIndex)] = {
      ...(workdayByDay[String(dayIndex)] || {}),
      startMinutes: templateStart,
      endMinutes: templateEnd,
      crossesMidnight: templateEnd <= templateStart,
      isDayOff: false,
      carrierConfirmed: true,
      scheduleSource: 'carrier',
      inheritedFromPreviousDispatcher: true,
      confirmedCarrierId: carrierId,
      confirmedAtGameMinute,
    }
  }

  return { ...driver, workdayByDay, carrierScheduleControl: true }
}

export function establishCarrierOperationalContext({
  carriers = [],
  drivers = [],
  runtimePositions = {},
  carrierId,
  gameTime,
}) {
  const wasActive = carriers.some((carrier) => carrier.id === carrierId && carrier.status === 'active')
  const nextCarriers = carriers.map((carrier) => carrier.id === carrierId ? { ...carrier, status: 'active' } : carrier)
  const activatedCarrier = nextCarriers.find((carrier) => carrier.id === carrierId) || null
  const carrierDriverIds = new Set(activatedCarrier?.driverIds || [])
  const baseDrivers = wasActive ? drivers : drivers.filter((driver) => !carrierDriverIds.has(driver.id))
  let nextDrivers = reconcileActiveCarrierDrivers(baseDrivers, nextCarriers)

  if (!wasActive && carrierDriverIds.size) {
    nextDrivers = nextDrivers.map((driver) => carrierDriverIds.has(driver.id)
      ? installConfirmedWorkdays({ ...driver, hours: normalizeDriverHours(driver.hours) }, carrierId, gameTime)
      : driver)
  }

  const nextRuntimePositions = { ...runtimePositions }
  nextDrivers.forEach((driver) => {
    const home = mapLocations.find((location) => location.id === driver.homeBaseLocationId)
    if (!home) return
    if (!wasActive && carrierDriverIds.has(driver.id)) {
      nextRuntimePositions[driver.id] = { longitude: home.longitude, latitude: home.latitude }
      return
    }
    if (!nextRuntimePositions[driver.id]) {
      nextRuntimePositions[driver.id] = { longitude: home.longitude, latitude: home.latitude }
    }
  })

  return {
    wasActive,
    activatedCarrier,
    carriers: nextCarriers,
    drivers: nextDrivers,
    runtimePositions: nextRuntimePositions,
  }
}

export function hasActiveCarrierRoster(carriers = [], drivers = []) {
  return carriers.some((carrier) => carrier.status === 'active') && drivers.some((driver) => Boolean(driver.carrierId))
}
