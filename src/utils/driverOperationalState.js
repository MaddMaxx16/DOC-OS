import { formatAppointment, formatCompactDate, formatTime } from './gameTime.js'
import { PICKUP_WAIT_MINUTES } from '../data/pickupConfig.js'

export function getMarcusPanelModel({ assignedLoad, gameTime, runtimeProgress = 0, pickup, delivery }) {
  if (!assignedLoad || assignedLoad.assignedDriverId !== 'marcus') return null
  const trip = assignedLoad.tripStatus
  let operationalState = 'ASSIGNED'
  if (trip === 'completed' || trip === 'delivered') operationalState = 'COMPLETED'
  else if (trip === 'awaiting-pod') operationalState = 'AWAITING_POD'
  else if (trip === 'unloading-delivery') operationalState = 'UNLOADING'
  else if (trip === 'checked-in-delivery') operationalState = 'CHECKED_IN'
  else if (trip === 'at-delivery') operationalState = 'WAITING_DELIVERY'
  else if (trip === 'en-route-delivery') operationalState = 'EN_ROUTE_DELIVERY'
  else if (trip === 'loaded' && assignedLoad.deliveryPlanningStatus === 'route-ready') operationalState = 'READY_FOR_DISPATCH'
  else if (trip === 'loaded') operationalState = 'LOADED'
  else if (trip === 'loading-at-pickup') operationalState = 'LOADING'
  else if (trip === 'checked-in-pickup') operationalState = 'CHECKED_IN_PICKUP'
  else if (trip === 'waiting-at-pickup' || trip === 'at-pickup') operationalState = 'WAITING_PICKUP'
  else if (trip === 'en-route-pickup') operationalState = 'EN_ROUTE_PICKUP'
  else if (trip === 'assigned' && assignedLoad.planningStatus === 'route-ready') operationalState = 'TRIP_PLANNED'
  const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const eta = operationalState === 'EN_ROUTE_PICKUP' && Number.isFinite(assignedLoad.departureGameMinute) ? Math.round(assignedLoad.departureGameMinute + (assignedLoad.plannedDeadheadDriveTimeMinutes || 0)) : operationalState === 'EN_ROUTE_DELIVERY' && Number.isFinite(assignedLoad.deliveryDepartureGameMinute) ? Math.round(assignedLoad.deliveryDepartureGameMinute + (assignedLoad.plannedLoadedDriveTimeMinutes || 0)) : null
  const labels = { ASSIGNED: 'Assigned', TRIP_PLANNED: 'Trip Planned', EN_ROUTE_PICKUP: 'En Route to Pickup', WAITING_PICKUP: 'Waiting at Pickup', CHECKED_IN_PICKUP: 'Checked In at Pickup', LOADING: 'Loading', LOADED: 'Loaded', READY_FOR_DISPATCH: 'Ready for Dispatch', EN_ROUTE_DELIVERY: 'En Route to Delivery', WAITING_DELIVERY: 'Waiting at Delivery', CHECKED_IN: 'Checked In', UNLOADING: 'Unloading', AWAITING_POD: 'Awaiting POD', COMPLETED: 'Completed' }
  const actions = { ASSIGNED: ['PLAN_TRIP', 'PLAN TRIP'], TRIP_PLANNED: ['SEND_TO_PICKUP', 'SEND TO PICKUP'], EN_ROUTE_PICKUP: [null, null], WAITING_PICKUP: ['CHECK_IN', 'CHECK IN'], CHECKED_IN_PICKUP: [null, null], LOADING: [null, null], LOADED: ['PLAN_DELIVERY_TRIP', 'PLAN DELIVERY TRIP'], READY_FOR_DISPATCH: ['DISPATCH', 'DISPATCH'], EN_ROUTE_DELIVERY: [null, null], WAITING_DELIVERY: ['CHECK_IN', 'CHECK IN'], CHECKED_IN: [null, null], UNLOADING: [null, null], AWAITING_POD: [null, null], COMPLETED: [null, null] }
  const [actionType, actionLabel] = actions[operationalState]
  const remainingMinutes = operationalState === 'WAITING_PICKUP' && Number.isFinite(assignedLoad.pickupArrivalGameMinute) ? Math.max(0, PICKUP_WAIT_MINUTES - (now - assignedLoad.pickupArrivalGameMinute)) : operationalState === 'UNLOADING' && Number.isFinite(assignedLoad.deliveryUnloadStartGameMinute) ? Math.max(0, 8 - (now - assignedLoad.deliveryUnloadStartGameMinute)) : null
  const disabled = ['EN_ROUTE_PICKUP', 'CHECKED_IN_PICKUP', 'LOADING', 'EN_ROUTE_DELIVERY', 'CHECKED_IN', 'UNLOADING'].includes(operationalState) || (actionType === 'CHECK_IN' && operationalState === 'WAITING_PICKUP' && remainingMinutes > 0)
  const nextStop = ['ASSIGNED', 'TRIP_PLANNED', 'EN_ROUTE_PICKUP'].includes(operationalState) ? pickup?.name : ['READY_FOR_DISPATCH', 'EN_ROUTE_DELIVERY'].includes(operationalState) ? delivery?.name : null
  const locationLabel = ['WAITING_PICKUP', 'CHECKED_IN_PICKUP', 'LOADING', 'LOADED'].includes(operationalState) ? pickup?.name : ['WAITING_DELIVERY', 'CHECKED_IN', 'UNLOADING', 'AWAITING_POD'].includes(operationalState) ? delivery?.name : null
  return { operationalState, statusLabel: labels[operationalState], loadId: assignedLoad.id, nextStopLabel: nextStop, locationLabel, eta: eta === null ? null : `${formatCompactDate(Math.floor(eta / 1440))} • ${formatTime(eta % 1440)}`, progress: runtimeProgress, actionType, actionLabel, actionDisabled: disabled, attentionRequired: ['WAITING_PICKUP', 'LOADED', 'READY_FOR_DISPATCH', 'WAITING_DELIVERY', 'AWAITING_POD'].includes(operationalState), remainingMinutes, plannedDeadheadMiles: assignedLoad.plannedDeadheadMiles, plannedDeadheadDriveTimeMinutes: assignedLoad.plannedDeadheadDriveTimeMinutes, plannedLoadedMiles: assignedLoad.plannedLoadedMiles, plannedLoadedDriveTimeMinutes: assignedLoad.plannedLoadedDriveTimeMinutes, pickupWindow: pickup ? formatAppointment(assignedLoad.pickupDayIndex, assignedLoad.pickupWindowStartMinutes, assignedLoad.pickupWindowEndMinutes) : null }
}
