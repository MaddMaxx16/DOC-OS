import { useState } from 'react'
import GameMap from './GameMap.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { logDocOsEvent } from '../utils/debugLogger.js'

function MainGameScreen({ selectedMarket, gameTime, loads, setLoads, drivers, setDrivers, plannedRoute, setPlannedRoute, setGameClockPaused, runtimePositions, runtimeProgress, setRuntimeProgress, simulationSpeed, setSimulationSpeed, onOpenMarkets }) {
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [phoneInitialScreen, setPhoneInitialScreen] = useState('home')
  const [driverFitEvaluation, setDriverFitEvaluation] = useState(null)
  const [phoneLoadId, setPhoneLoadId] = useState(null)
  const [planningMode, setPlanningMode] = useState(null)
  const [deliveryPlanning, setDeliveryPlanning] = useState(null)

  const assignedLoad = loads.find((load) => load.assignedDriverId === 'marcus')
  const activeRouteGeometry = deliveryPlanning?.route?.routeShape
    || driverFitEvaluation?.deadheadRoute
    || planningMode?.route?.routeShape
    || (assignedLoad?.tripStatus === 'en-route-delivery' ? assignedLoad.plannedLoadedRouteGeometry : null)
    || (assignedLoad?.tripStatus === 'loaded' && assignedLoad.deliveryPlanningStatus === 'route-ready' ? assignedLoad.plannedLoadedRouteGeometry : null)
    || (assignedLoad?.tripStatus === 'en-route-pickup' ? assignedLoad.plannedDeadheadRouteGeometry : null)
    || ((!assignedLoad?.tripStatus || assignedLoad.tripStatus === 'assigned') && assignedLoad?.planningStatus === 'route-ready' ? assignedLoad.plannedDeadheadRouteGeometry : null)
  const startDeliveryPlanning = async (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load?.deliveryLocationId)
    setGameClockPaused(true)
    logDocOsEvent('OPEN DELIVERY PLANNING')
    setDeliveryPlanning({ loadId, route: 'loading' })
    try {
      const route = await calculateRoute(pickup, delivery)
      const first = route.routeShape[0]; const last = route.routeShape[route.routeShape.length - 1]
      const startDistance = Math.hypot(first[0] - pickup.longitude, first[1] - pickup.latitude)
      const endDistance = Math.hypot(last[0] - delivery.longitude, last[1] - delivery.latitude)
      if (startDistance > endDistance) route.routeShape.reverse()
      setDeliveryPlanning({ loadId, route })
    } catch (error) { console.error(error); setDeliveryPlanning({ loadId, route: 'unavailable' }) }
  }
  const startPlanning = async (loadId, driverId) => {
    const load = loads.find((item) => item.id === loadId)
    const driver = mapLocations.find((location) => location.id === driverId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    setGameClockPaused(true)
    setPlanningMode({ loadId, driverId, active: true, route: 'loading' })
    try {
      const route = await calculateRoute(driver, pickup)
      setPlanningMode((current) => current ? { ...current, route } : current)
    } catch (error) {
      console.error('Planning route unavailable:', error)
      setPlanningMode((current) => current ? { ...current, route: 'unavailable' } : current)
    }
  }

  const startEvaluation = async (loadId, driverId, fit) => {
    const load = loads.find((item) => item.id === loadId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load?.deliveryLocationId)
    setLoads((current) => current.map((item) => item.id === loadId ? { ...item, candidateDriverId: driverId } : item))
    setPhoneLoadId(loadId)
    setDriverFitEvaluation({ loadId, driverId, driverName: drivers.find((driver) => driver.id === driverId)?.name, deadheadMiles: fit.miles, deadheadMinutes: fit.minutes, deadheadRoute: fit.routeShape, arrivalDay: fit.arrivalDay, arrivalMinutes: fit.arrivalMinutes, pickupDayIndex: load.pickupDayIndex, pickupStart: load.pickupWindowStartMinutes, pickupEnd: load.pickupWindowEndMinutes, status: fit.status, loadedEstimate: 'loading' })
    setGameClockPaused(true)
    setIsPhoneOpen(false)
    try {
      const route = await calculateRoute(pickup, delivery)
      setDriverFitEvaluation((current) => current ? { ...current, loadedEstimate: { loadedEstimateMiles: route.distanceMiles, loadedEstimateDriveTimeMinutes: route.durationMinutes } } : current)
    } catch (error) {
      console.error('Loaded estimate unavailable:', error)
      setDriverFitEvaluation((current) => current ? { ...current, loadedEstimate: 'unavailable' } : current)
    }
  }
  const handleDriverAction = (actionType, loadId, driverId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (actionType === 'PLAN_TRIP' && load.tripStatus === 'assigned') startPlanning(loadId, driverId)
    else if (actionType === 'SEND_TO_PICKUP' && load.tripStatus === 'assigned' && load.planningStatus === 'route-ready' && load.plannedDeadheadRouteGeometry) {
      setRuntimeProgress(0); setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'en-route-pickup', departureGameMinute: now } : item))
    } else if (actionType === 'PLAN_DELIVERY_TRIP' && load.tripStatus === 'loaded') startDeliveryPlanning(loadId)
    else if (actionType === 'DISPATCH' && load.tripStatus === 'loaded' && load.deliveryPlanningStatus === 'route-ready' && load.plannedLoadedRouteGeometry) {
      setRuntimeProgress(0); setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'en-route-delivery', deliveryDepartureGameMinute: now } : item))
    } else if (actionType === 'CHECK_IN' && load.tripStatus === 'at-delivery') setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'checked-in-delivery', deliveryCheckInGameMinute: now } : item))
    else if (actionType === 'CHECK_IN' && ['at-pickup', 'waiting-at-pickup'].includes(load.tripStatus)) setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'checked-in-pickup', pickupCheckInGameMinute: now } : item))
  }

  return (
    <div className="main-game-screen">
      <StatusBar selectedMarket={selectedMarket} gameTime={gameTime} />
      <div className="map-area">
        <div className="simulation-speed">{[1, 2, 4, 5].map((speed) => <button key={speed} type="button" className={speed === simulationSpeed ? 'active' : ''} onClick={() => setSimulationSpeed(speed)}>{speed}×</button>)}</div>
        <GameMap activeRouteGeometry={activeRouteGeometry} tripStatus={assignedLoad?.tripStatus} drivers={drivers} runtimePositions={runtimePositions} runtimeProgress={runtimeProgress} runtimeRoute={assignedLoad?.tripStatus === 'en-route-delivery' ? assignedLoad.plannedLoadedRouteGeometry : assignedLoad?.plannedDeadheadRouteGeometry} assignedLoad={assignedLoad} evaluationLoad={driverFitEvaluation ? loads.find((load) => load.id === driverFitEvaluation.loadId) : null} isDriverFitEvaluation={Boolean(driverFitEvaluation)} suppressAttention={Boolean(deliveryPlanning)} gameTime={gameTime} onDriverAction={handleDriverAction} />
        {deliveryPlanning && <div className="map-evaluation"><strong>DELIVERY PLANNING</strong><span>{deliveryPlanning.loadId}</span><span>Driver: Marcus</span><strong>FROM</strong><span>Empire Freight Terminal</span><strong>NEXT STOP</strong><span>Harborline Logistics</span><strong>ROUTE OPTIONS</strong>{deliveryPlanning.route === 'loading' && <span>Calculating...</span>}{deliveryPlanning.route === 'unavailable' && <span>Route unavailable</span>}{deliveryPlanning.route?.distanceMiles && <><span>Distance: {deliveryPlanning.route.distanceMiles.toFixed(1)} miles</span><span>Drive Time: {deliveryPlanning.route.durationMinutes} minutes</span><button type="button" onClick={() => setDeliveryPlanning((current) => ({ ...current, selected: true }))}>{deliveryPlanning.selected ? 'ROUTE SELECTED' : 'SELECT ROUTE'}</button></>}<div><button type="button" onClick={() => { setDeliveryPlanning(null); setGameClockPaused(false) }}>BACK</button><button type="button" disabled={!deliveryPlanning.selected} onClick={() => { setLoads((current) => current.map((load) => load.id === deliveryPlanning.loadId ? { ...load, deliveryPlanningStatus: 'route-ready', plannedLoadedMiles: deliveryPlanning.route.distanceMiles, plannedLoadedDriveTimeMinutes: deliveryPlanning.route.durationMinutes, plannedLoadedRouteGeometry: deliveryPlanning.route.routeShape, selectedLoadedRouteId: 'recommended' } : load)); setDeliveryPlanning(null); setGameClockPaused(false) }}>CONFIRM PLAN</button></div></div>}
        {planningMode && <div className="map-evaluation"><strong>TRIP PLANNING</strong><span>{planningMode.loadId}</span><span>Driver: Marcus</span><strong>NEXT STOP</strong><span>Empire Freight Terminal</span><span>Pickup Window: SEP 7 • 9:00 AM – 10:00 AM</span><strong>ROUTE OPTIONS</strong>{planningMode.route === 'loading' && <span>Calculating...</span>}{planningMode.route === 'unavailable' && <span>Route unavailable</span>}{planningMode.route?.distanceMiles && <><span>Distance: {planningMode.route.distanceMiles.toFixed(1)} miles</span><span>Drive Time: {planningMode.route.durationMinutes} minutes</span><span>Estimated Arrival: {formatCompactDate(gameTime.gameDayIndex)} • {formatTime(gameTime.totalMinutesOfDay + planningMode.route.durationMinutes)}</span><button type="button" onClick={() => setPlanningMode((current) => ({ ...current, selected: true }))}>{planningMode.selected ? 'ROUTE SELECTED' : 'SELECT ROUTE'}</button></>}<div><button type="button" onClick={() => { setPlanningMode(null); setGameClockPaused(false) }}>BACK</button><button type="button" disabled={!planningMode.selected} onClick={() => { setLoads((current) => current.map((load) => load.id === planningMode.loadId ? { ...load, planningStatus: 'route-ready', plannedDeadheadMiles: planningMode.route.distanceMiles, plannedDeadheadDriveTimeMinutes: planningMode.route.durationMinutes, plannedDeadheadRouteGeometry: planningMode.route.routeShape, selectedDeadheadRouteId: 'recommended' } : load)); setPlanningMode(null); setGameClockPaused(false) }}>CONFIRM PLAN</button></div></div>}
        {driverFitEvaluation && <div className="map-evaluation"><strong>DRIVER FIT</strong><span>{driverFitEvaluation.loadId}</span><span>Candidate: {driverFitEvaluation.driverName}</span><strong>DEADHEAD</strong><span>Distance: {driverFitEvaluation.deadheadMiles.toFixed(1)} miles</span><span>Drive Time: {driverFitEvaluation.deadheadMinutes} minutes</span><strong>PICKUP</strong><span>Estimated Arrival: {formatCompactDate(driverFitEvaluation.arrivalDay)} • {formatTime(driverFitEvaluation.arrivalMinutes)}</span><span>Window: {formatAppointment(driverFitEvaluation.pickupDayIndex, driverFitEvaluation.pickupStart, driverFitEvaluation.pickupEnd)}</span><span>Status: {driverFitEvaluation.status}</span><strong>LOADED ESTIMATE</strong>{driverFitEvaluation.loadedEstimate === 'loading' && <span>Calculating...</span>}{driverFitEvaluation.loadedEstimate === 'unavailable' && <span>Estimate unavailable</span>}{driverFitEvaluation.loadedEstimate && typeof driverFitEvaluation.loadedEstimate === 'object' && <><span>Distance: {driverFitEvaluation.loadedEstimate.loadedEstimateMiles.toFixed(1)} miles</span><span>Drive Time: {driverFitEvaluation.loadedEstimate.loadedEstimateDriveTimeMinutes} minutes</span></>}<div><button type="button" onClick={() => { setDriverFitEvaluation(null); setGameClockPaused(false); setPhoneInitialScreen('driverFit'); setPhoneLoadId(driverFitEvaluation.loadId); setIsPhoneOpen(true) }}>BACK</button><button type="button" onClick={() => { setLoads((current) => current.map((load) => load.id === driverFitEvaluation.loadId ? { ...load, driverFitVerified: true, candidateDriverId: driverFitEvaluation.driverId } : load)); setDriverFitEvaluation(null); setGameClockPaused(false); setPhoneInitialScreen('loadDetails'); setPhoneLoadId(driverFitEvaluation.loadId); setIsPhoneOpen(true) }}>CONFIRM FIT</button></div></div>}
        <button
          type="button"
          className="markets-button"
          onClick={onOpenMarkets}
        >
          Markets
        </button>
        {!isPhoneOpen && (
          <button
            type="button"
            className="phone-button"
            onClick={() => { setPhoneInitialScreen('home'); setIsPhoneOpen(true) }}
          >
            PHONE
          </button>
        )}
        {isPhoneOpen && (
          <PhoneOverlay
            loads={loads}
            setLoads={setLoads}
            drivers={drivers}
            setDrivers={setDrivers}
            plannedRoute={plannedRoute}
            setPlannedRoute={setPlannedRoute}
            gameTime={gameTime}
            initialScreen={phoneInitialScreen}
            initialLoadId={phoneLoadId}
            onEvaluateFit={startEvaluation}
            onClose={() => setIsPhoneOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default MainGameScreen
