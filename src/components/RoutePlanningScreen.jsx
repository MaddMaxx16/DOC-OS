import mapLocations from '../data/mapLocations.js'
import { useCallback, useEffect, useState } from 'react'
import { calculateRoute } from '../services/routingService.js'

function RoutePlanningScreen({ loads, loadId, drivers, plannedRoute, setPlannedRoute, onBack, onContinue }) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
  const driver = drivers.find((item) => item.id === load.assignedDriverId)
  const [status, setStatus] = useState(plannedRoute ? 'success' : 'loading')

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
      <h1>Route Planning</h1>
      <strong>{load.id}</strong>
      <div className="route-plan-route"><span>{pickup.name}</span><span aria-hidden="true">→</span><span>{delivery.name}</span></div>
      <span>Driver: {driver?.name}</span>
      <strong className="route-options-title">Route Options</strong>
      {status === 'loading' && <p>Calculating route...</p>}
      {status === 'error' && <><p>Route calculation unavailable.</p><button type="button" className="action-button" onClick={calculate}>Retry</button></>}
      {status === 'success' && <div className="route-result"><strong>Recommended Route</strong><span>Distance: {plannedRoute.distanceMiles.toFixed(1)} miles</span><span>Estimated Drive Time: {plannedRoute.durationMinutes} minutes</span></div>}
      <div className="route-actions">
        <button type="button" className="back-button" onClick={onBack}>Back</button>
        <button type="button" className="action-button" onClick={onContinue} disabled={status !== 'success'}>Continue</button>
      </div>
    </div>
  )
}

export default RoutePlanningScreen
