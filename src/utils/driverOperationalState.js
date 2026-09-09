import { formatAppointment, formatCompactDate, formatTime } from './gameTime.js'

export function getDriverPanelModel({ driver, assignedLoad, gameTime, runtimeProgress = 0, pickup, delivery }) {
  if (!driver || !assignedLoad || assignedLoad.assignedDriverId !== driver.id) return null

  const trip = assignedLoad.tripStatus
  let operationalState = 'ASSIGNED'

  if (trip === 'completed' || trip === 'delivered') operationalState = 'COMPLETED'
  else if (trip === 'awaiting-pod') operationalState = 'AWAITING_POD'
  else if (trip === 'unloading-delivery') operationalState = 'UNLOADING'
  else if (trip === 'checked-in-delivery') operationalState = 'DOCK_READY_DELIVERY'
  else if (trip === 'waiting-at-delivery') operationalState = 'WAITING_DELIVERY'
  else if (trip === 'checking-in-delivery' || trip === 'at-delivery') operationalState = 'CHECKING_IN_DELIVERY'
  else if (trip === 'en-route-delivery') operationalState = 'EN_ROUTE_DELIVERY'
  else if (trip === 'loaded' && assignedLoad.deliveryPlanningStatus === 'route-ready') operationalState = 'DELIVERY_ROUTE_SEND_REQUIRED'
  else if (trip === 'loaded') operationalState = 'LOADED'
  else if (trip === 'loading-at-pickup') operationalState = 'LOADING'
  else if (trip === 'checked-in-pickup') operationalState = 'DOCK_READY_PICKUP'
  else if (trip === 'waiting-at-pickup') operationalState = 'WAITING_PICKUP'
  else if (trip === 'checking-in-pickup' || trip === 'at-pickup') operationalState = 'CHECKING_IN_PICKUP'
  else if (trip === 'en-route-pickup') operationalState = 'EN_ROUTE_PICKUP'
  else if (trip === 'assigned' && !Number.isFinite(assignedLoad.pickupDriverBriefedGameMinute)) operationalState = 'BRIEFING_REQUIRED'
  else if (trip === 'assigned' && assignedLoad.planningStatus === 'route-ready') operationalState = 'PICKUP_ROUTE_SEND_REQUIRED'

  const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const eta = operationalState === 'EN_ROUTE_PICKUP' && Number.isFinite(assignedLoad.departureGameMinute)
    ? Math.round(assignedLoad.departureGameMinute + (assignedLoad.plannedDeadheadDriveTimeMinutes || 0))
    : operationalState === 'EN_ROUTE_DELIVERY' && Number.isFinite(assignedLoad.deliveryDepartureGameMinute)
      ? Math.round(assignedLoad.deliveryDepartureGameMinute + (assignedLoad.plannedLoadedDriveTimeMinutes || 0))
      : null

  const labels = {
    ASSIGNED: 'Assigned', BRIEFING_REQUIRED: 'Send Load Info Required', PICKUP_ROUTE_SEND_REQUIRED: 'Route Send Required', TRIP_PLANNED: 'Route Send Required',
    EN_ROUTE_PICKUP: 'En Route to Pickup', CHECKING_IN_PICKUP: 'Checking In', WAITING_PICKUP: 'Waiting for Dock',
    DOCK_READY_PICKUP: 'Dock Ready', LOADING: 'Loading', LOADED: 'Loaded', DELIVERY_ROUTE_SEND_REQUIRED: 'Route Send Required', READY_FOR_DISPATCH: 'Route Send Required',
    EN_ROUTE_DELIVERY: 'En Route to Delivery', CHECKING_IN_DELIVERY: 'Checking In', WAITING_DELIVERY: 'Waiting for Dock',
    DOCK_READY_DELIVERY: 'Dock Ready', UNLOADING: 'Unloading', AWAITING_POD: 'Awaiting POD', COMPLETED: 'Completed',
  }

  const driverName = driver.fullName || driver.name || 'Driver'
  const actions = {
    ASSIGNED: ['PLAN_TRIP', 'PLAN PICKUP'],
    BRIEFING_REQUIRED: ['MESSAGE_DRIVER', `MESSAGE ${String(driver.name || 'DRIVER').toUpperCase()}`],
    PICKUP_ROUTE_SEND_REQUIRED: ['MESSAGE_DRIVER', 'SEND ROUTE'],
    TRIP_PLANNED: ['MESSAGE_DRIVER', 'SEND ROUTE'],
    EN_ROUTE_PICKUP: [null, null], CHECKING_IN_PICKUP: [null, null], WAITING_PICKUP: [null, null], DOCK_READY_PICKUP: ['OPEN_PICKUP', 'OPEN PICKUP'], LOADING: [null, null],
    LOADED: ['PLAN_DELIVERY_TRIP', 'PLAN DELIVERY'], DELIVERY_ROUTE_SEND_REQUIRED: ['MESSAGE_DRIVER', 'SEND ROUTE'], READY_FOR_DISPATCH: ['MESSAGE_DRIVER', 'SEND ROUTE'],
    EN_ROUTE_DELIVERY: [null, null], CHECKING_IN_DELIVERY: [null, null], WAITING_DELIVERY: [null, null], DOCK_READY_DELIVERY: ['OPEN_DELIVERY', 'OPEN RECEIVER'], UNLOADING: [null, null], AWAITING_POD: ['REVIEW_POD', 'REVIEW POD'], COMPLETED: [null, null],
  }
  const [actionType, actionLabel] = actions[operationalState]

  const remainingMinutes = operationalState === 'WAITING_PICKUP' && Number.isFinite(assignedLoad.pickupDockReadyGameMinute)
    ? Math.max(0, assignedLoad.pickupDockReadyGameMinute - now)
    : operationalState === 'WAITING_DELIVERY' && Number.isFinite(assignedLoad.deliveryDockReadyGameMinute)
      ? Math.max(0, assignedLoad.deliveryDockReadyGameMinute - now)
      : null

  const disabled = ['EN_ROUTE_PICKUP', 'CHECKING_IN_PICKUP', 'WAITING_PICKUP', 'DOCK_READY_PICKUP', 'LOADING', 'EN_ROUTE_DELIVERY', 'CHECKING_IN_DELIVERY', 'WAITING_DELIVERY', 'DOCK_READY_DELIVERY', 'UNLOADING'].includes(operationalState)
  const nextStop = ['ASSIGNED', 'BRIEFING_REQUIRED', 'PICKUP_ROUTE_SEND_REQUIRED', 'TRIP_PLANNED', 'EN_ROUTE_PICKUP'].includes(operationalState)
    ? pickup?.name
    : ['LOADED', 'DELIVERY_ROUTE_SEND_REQUIRED', 'READY_FOR_DISPATCH', 'EN_ROUTE_DELIVERY'].includes(operationalState) ? delivery?.name : null
  const locationLabel = ['CHECKING_IN_PICKUP', 'WAITING_PICKUP', 'DOCK_READY_PICKUP', 'LOADING', 'LOADED', 'READY_FOR_DISPATCH'].includes(operationalState)
    ? pickup?.name
    : ['CHECKING_IN_DELIVERY', 'WAITING_DELIVERY', 'DOCK_READY_DELIVERY', 'UNLOADING', 'AWAITING_POD'].includes(operationalState) ? delivery?.name : null

  return {
    driverId: driver.id,
    operationalState,
    statusLabel: labels[operationalState],
    mapLabel: operationalState === 'EN_ROUTE_PICKUP' || operationalState === 'EN_ROUTE_DELIVERY' ? 'EN ROUTE'
      : operationalState === 'CHECKING_IN_PICKUP' || operationalState === 'CHECKING_IN_DELIVERY' ? 'CHECKING IN…'
        : operationalState === 'WAITING_PICKUP' || operationalState === 'WAITING_DELIVERY' ? 'WAITING FOR DOCK'
          : driver.idleRouteStatus === 'traveling' ? 'RETURNING TO YARD' : '',
    loadId: assignedLoad.id,
    driverName,
    roleLabel: 'Driver',
    nextStopLabel: nextStop,
    locationLabel,
    eta: eta === null ? null : `${formatCompactDate(Math.floor(eta / 1440))} • ${formatTime(eta % 1440)}`,
    progress: runtimeProgress,
    actionType,
    actionLabel,
    actionDisabled: disabled,
    attentionRequired: ['BRIEFING_REQUIRED', 'PICKUP_ROUTE_SEND_REQUIRED', 'DOCK_READY_PICKUP', 'LOADED', 'DELIVERY_ROUTE_SEND_REQUIRED', 'READY_FOR_DISPATCH', 'DOCK_READY_DELIVERY', 'AWAITING_POD'].includes(operationalState),
    remainingMinutes,
    plannedDeadheadMiles: assignedLoad.plannedDeadheadMiles,
    plannedDeadheadDriveTimeMinutes: assignedLoad.plannedDeadheadDriveTimeMinutes,
    plannedLoadedMiles: assignedLoad.plannedLoadedMiles,
    plannedLoadedDriveTimeMinutes: assignedLoad.plannedLoadedDriveTimeMinutes,
    pickupWindow: pickup ? formatAppointment(assignedLoad.pickupDayIndex, assignedLoad.pickupWindowStartMinutes, assignedLoad.pickupWindowEndMinutes) : null,
  }
}

// Backward-safe alias for older call sites/dev tooling. New code should use getDriverPanelModel.
export function getMarcusPanelModel(args) {
  return getDriverPanelModel({ ...args, driver: args.driver || { id: 'marcus', name: 'Marcus', fullName: 'Marcus Reed' } })
}
