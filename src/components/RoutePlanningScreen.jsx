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

  useEffect(() => {
    if (plannedRoute && status === 'success' && !routeSelected) onSelectRoute()
  }, [plannedRoute, routeSelected, status])


  return (
    <div className="phone-page route-planning-screen route-planning-v3">
      <header className="docos-page-hero docos-page-hero-compact">
        <span className="docos-page-kicker">TRIP PLANNING</span>
        <div className="docos-page-title-row">
          <div>
            <h2>{load.loadNumber || load.id}</h2>
            <p>{pickup.name} → {delivery.name}</p>
          </div>
          <span className="docos-count-chip">{driver?.name || 'DRIVER'}</span>
        </div>
      </header>

      <div className="docos-page-body route-planning-content">

        <section className="docos-section">
          <div className="docos-section-heading"><span>WINDOWS</span></div>
          <div className="docos-info-grid">
            <div className="docos-info-cell">
              <span>PICKUP</span>
              <strong>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</strong>
              <small>{pickup.name}</small>
            </div>
            <div className="docos-info-cell">
              <span>DELIVERY</span>
              <strong>{formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</strong>
              <small>{delivery.name}</small>
            </div>
          </div>
        </section>

        <section className="docos-section">
          <div className="docos-section-heading"><span>ROUTE OPTION</span></div>
          <div className="docos-panel route-option-v3">
            {status === 'loading' && <p>Calculating route...</p>}
            {status === 'error' && <><p>Route calculation unavailable.</p><button type="button" className="docos-secondary-action" onClick={calculate}>RETRY</button></>}
            {status === 'success' && (
              <>
                <div className="route-option-v3-title"><strong>{plannedRoute.source === 'fallback' ? 'Fallback Route' : 'Recommended Route'}</strong><span>SELECTED</span></div>
                {plannedRoute.source === 'fallback' && <p>Routing service unavailable. Using a safe estimated route so operations can continue.</p>}
                <div className="docos-info-grid docos-info-grid-flat">
                  <div className="docos-info-cell"><span>DISTANCE</span><strong>{plannedRoute.distanceMiles.toFixed(1)} mi</strong></div>
                  <div className="docos-info-cell"><span>DRIVE TIME</span><strong>{plannedRoute.durationMinutes} min</strong></div>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="docos-sticky-actions route-actions-v3">
          <button type="button" className="docos-secondary-action" onClick={onBack}>BACK</button>
          <button type="button" className="docos-primary-action" onClick={onContinue} disabled={status !== 'success'}>CONFIRM PLAN</button>
        </div>
      </div>
    </div>
  )
}

export default RoutePlanningScreen
