import mapLocations from '../data/mapLocations.js'
import { useCallback, useEffect, useState } from 'react'
import { calculateRoute } from '../services/routingService.js'
import { formatAppointment } from '../utils/gameTime.js'

function RoutePlanningScreen({ loads, loadId, drivers, plannedRoute, setPlannedRoute, onSelectRoute, onBack, onContinue }) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
  const driver = drivers.find((item) => item.id === load.assignedDriverId)
  const [status, setStatus] = useState(plannedRoute ? 'success' : 'loading')
  const routeSelected = load.selectedRouteId === 'recommended'

  const calculate = useCallback(async () => {
    setStatus('loading')
    try {
      const route = await calculateRoute(pickup, delivery)
      setPlannedRoute(route)
      setStatus('success')
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }, [delivery, pickup, setPlannedRoute])

  useEffect(() => {
    if (!plannedRoute) {
      const timer = setTimeout(calculate, 0)
      return () => clearTimeout(timer)
    }
  }, [calculate, plannedRoute])

  return (
    <div className="route-planning-screen">
      <div className="route-planning-content">
        <h1>Route Planning</h1>
        <div className="load-summary"><strong>{load.id}</strong><div className="route-plan-route"><span>{pickup.name}</span><span aria-hidden="true">→</span><span>{delivery.name}</span></div><span>Driver: {driver?.name}</span></div>
        <section className="planning-section"><strong>APPOINTMENTS</strong><div className="appointment-row"><span>Pickup</span><span>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</span></div><div className="appointment-row"><span>Delivery</span><span>{formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</span></div></section>
        <section className="planning-section"><strong>ROUTE OPTIONS</strong><div className="route-card">{status === 'loading' && <p>Calculating route...</p>}{status === 'error' && <><p>Route calculation unavailable.</p><button type="button" className="action-button" onClick={calculate}>Retry</button></>}{status === 'success' && <><div className="route-result"><strong>Recommended Route</strong><span>Distance: {plannedRoute.distanceMiles.toFixed(1)} miles</span><span>Estimated Drive Time: {plannedRoute.durationMinutes} minutes</span></div><button type="button" className="action-button" onClick={onSelectRoute} disabled={routeSelected}>{routeSelected ? 'ROUTE SELECTED' : 'SELECT ROUTE'}</button></>}</div></section>
      </div>
      <div className="route-actions">
        <button type="button" className="back-button" onClick={onBack}>Back</button>
        <button type="button" className="action-button" onClick={onContinue} disabled={status !== 'success' || !routeSelected}>Continue</button>
      </div>
    </div>
  )
}

export default RoutePlanningScreen
