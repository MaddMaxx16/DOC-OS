export const STAGING_ROUTE_COLOR = '#D68B45'
const SOLID_ROUTE_DASH = [1, 0.001]
const PICKUP_ROUTE_DASH = [2.2, 1.6]
const STAGING_ROUTE_DASH = [1.4, 1.1]

export function isActiveShiftEndStagingRoute(driver) {
  return Boolean(
    driver?.idleRouteStatus === 'traveling'
    && Array.isArray(driver.idleRouteGeometry)
    && driver.idleRouteGeometry.length >= 2
    && driver.overnightAppliedDayIndex !== null
    && driver.overnightAppliedDayIndex !== undefined
    && Number.isFinite(Number(driver.overnightAppliedDayIndex))
    && ['yard', 'truck-stop'].includes(driver.overnightMode)
    && driver.idleTargetLocationId
  )
}

export function getActiveRouteLineStyle({
  activeRouteColor,
  hasLunchRoute = false,
  isLunchAccessRoute = false,
  isStagingRoute = false,
  isDriverFitEvaluation = false,
  tripStatus = null,
}) {
  if (hasLunchRoute) {
    return {
      color: isLunchAccessRoute ? activeRouteColor : '#C39E5A',
      width: 5.2,
      opacity: 0.96,
      dasharray: tripStatus === 'en-route-pickup' ? PICKUP_ROUTE_DASH : SOLID_ROUTE_DASH,
    }
  }
  if (isStagingRoute) {
    return { color: STAGING_ROUTE_COLOR, width: 4, opacity: 0.82, dasharray: STAGING_ROUTE_DASH }
  }
  return {
    color: isDriverFitEvaluation ? '#D0B8DF' : activeRouteColor,
    width: isDriverFitEvaluation ? 5.5 : 5.2,
    opacity: 0.96,
    dasharray: tripStatus === 'en-route-pickup' ? PICKUP_ROUTE_DASH : SOLID_ROUTE_DASH,
  }
}
