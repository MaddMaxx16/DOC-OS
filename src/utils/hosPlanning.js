import mapLocations from '../data/mapLocations.js'
import { getLocationDistanceMiles } from '../services/routingService.js'
import { getProjectedDriverOrigin } from './driverQueue.js'
import { getDriverTimeView, interpretDriverTimeFit } from './driverTimeInterpreter.js'
import { getDriverScheduleWindow } from './driverScheduleConstraint.js'

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function fallbackTravelMinutes(origin, destination, mph = 45) {
  if (!origin || !destination) return null
  if (origin.id && destination.id && origin.id === destination.id) return 0
  const straightMiles = getLocationDistanceMiles(origin, destination)
  if (!Number.isFinite(straightMiles)) return null
  const roadMiles = straightMiles * 1.18
  return Math.max(1, Math.round((roadMiles / mph) * 60))
}

function loadedDriveMinutes(load, pickup, delivery) {
  const planned = Number(load?.tripPlan?.legs?.loaded?.minutes ?? load?.plannedLoadedDriveTimeMinutes ?? load?.assignmentProjection?.loadedMinutes)
  if (Number.isFinite(planned) && planned >= 0) return planned
  // FreightLink market generation uses 34 mph against listed road miles. Reuse
  // that model here so pre-booking HOS intelligence matches the board's own
  // published mileage instead of inventing a second estimate.
  const listedMiles = Number(load?.listedMiles)
  if (Number.isFinite(listedMiles) && listedMiles > 0) return Math.max(1, Math.round((listedMiles / 34) * 60))
  return fallbackTravelMinutes(pickup, delivery, 34)
}

export function getLoadHosEvaluation({ load, driver, loads = [], runtimePositions = {}, gameTime }) {
  if (!load || !driver) return null
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
  if (!pickup || !delivery) return null

  const projection = getProjectedDriverOrigin({ driver, loads, runtimePositions, gameTime })
  if (!projection.location) return null

  const deadheadPlanned = Number(load?.tripPlan?.legs?.deadhead?.minutes ?? load?.plannedDeadheadDriveTimeMinutes ?? load?.assignmentProjection?.deadheadMinutes)
  const deadheadMinutes = Number.isFinite(deadheadPlanned) && deadheadPlanned >= 0
    ? deadheadPlanned
    : fallbackTravelMinutes(projection.location, pickup, 45)
  const loadedMinutes = loadedDriveMinutes(load, pickup, delivery)
  if (!Number.isFinite(deadheadMinutes) || !Number.isFinite(loadedMinutes)) return null

  const pickupStart = finite(load.pickupDayIndex) * 1440 + finite(load.pickupWindowStartMinutes)
  const scheduleWindow = getDriverScheduleWindow(driver, finite(load.pickupDayIndex))
  const projectedStart = Math.max(
    finite(projection.availableAbsoluteMinute),
    scheduleWindow?.startAbsoluteMinute ?? 0,
  )
  const pickupArrival = projectedStart + deadheadMinutes
  const pickupService = 10 + Math.max(0, Number(load?.facilityOps?.pickup?.loadingDelayMinutes || 0))
  const deliveryService = 8 + Math.max(0, Number(load?.facilityOps?.delivery?.unloadingDelayMinutes || 0))
  const pickupServiceStart = Math.max(pickupArrival, pickupStart)
  const deliveryComplete = pickupServiceStart + pickupService + loadedMinutes + deliveryService

  const driveRequiredMinutes = deadheadMinutes + loadedMinutes
  const dutyRequiredMinutes = Math.max(0, deliveryComplete - projectedStart)
  const driverTime = getDriverTimeView(driver)
  const scheduledDutyAvailable = scheduleWindow
    ? Math.max(0, scheduleWindow.endAbsoluteMinute - projectedStart)
    : driverTime.workdayRemainingMinutes
  const effectiveDutyAvailable = Math.min(driverTime.workdayRemainingMinutes, scheduledDutyAvailable)
  const fit = interpretDriverTimeFit({
    driveRequiredMinutes,
    dutyRequiredMinutes,
    driveAvailableMinutes: driverTime.drivingAvailableMinutes,
    dutyAvailableMinutes: effectiveDutyAvailable,
  })

  return {
    // Legacy fields remain during P1.1 so existing FreightLink UI keeps working.
    // New UI in P1.2/P1.3 can consume driverTimeFit/driverTimeLabel/summary.
    label: fit.fit === 'poor' ? 'HOS RISK' : 'HOS OK',
    tone: fit.fit === 'poor' ? 'risk' : 'good',
    driveOk: fit.driveOk,
    dutyOk: fit.dutyOk,
    driverTimeFit: fit.fit,
    driverTimeLabel: fit.label,
    driverTimeTone: fit.tone,
    driverTimeSummary: fit.summary,
    driverTimeReasons: fit.reasons,
    driveMarginMinutes: fit.driveMarginMinutes,
    dutyMarginMinutes: fit.dutyMarginMinutes,
    driveRequiredMinutes,
    dutyRequiredMinutes,
    driveAvailableMinutes: driverTime.drivingAvailableMinutes,
    dutyAvailableMinutes: effectiveDutyAvailable,
    projectedStartMinute: projectedStart,
    projectedPickupArrivalMinute: pickupArrival,
    projectedPickupServiceStartMinute: pickupServiceStart,
    projectedDeliveryCompleteMinute: deliveryComplete,
    deadheadMinutes,
    loadedMinutes,
  }
}
