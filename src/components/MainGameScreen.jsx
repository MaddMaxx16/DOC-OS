import { useState } from 'react'
import GameMap from './GameMap.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'

function MainGameScreen({ selectedMarket, gameTime, loads, setLoads, drivers, setDrivers, plannedRoute, setPlannedRoute, onOpenMarkets }) {
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [phoneInitialScreen, setPhoneInitialScreen] = useState('home')
  const [driverFitEvaluation, setDriverFitEvaluation] = useState(null)
  const [phoneLoadId, setPhoneLoadId] = useState(null)

  return (
    <div className="main-game-screen">
      <StatusBar selectedMarket={selectedMarket} gameTime={gameTime} />
      <div className="map-area">
        <GameMap drivers={drivers} plannedRoute={plannedRoute} deadheadRoute={driverFitEvaluation?.deadheadRoute} />
        {driverFitEvaluation && <div className="map-evaluation"><strong>DRIVER FIT</strong><span>{driverFitEvaluation.loadId}</span><span>Candidate: {driverFitEvaluation.driverName}</span><strong>DEADHEAD</strong><span>Distance: {driverFitEvaluation.deadheadMiles.toFixed(1)} miles</span><span>Drive Time: {driverFitEvaluation.deadheadMinutes} minutes</span><strong>PICKUP</strong><span>Estimated Arrival: {formatCompactDate(driverFitEvaluation.arrivalDay)} • {formatTime(driverFitEvaluation.arrivalMinutes)}</span><span>Window: {formatAppointment(0, 540, 600)}</span><span>Status: {driverFitEvaluation.status}</span><strong>LOADED ROUTE</strong>{plannedRoute ? <><span>Distance: {plannedRoute.distanceMiles.toFixed(1)} miles</span><span>Drive Time: {plannedRoute.durationMinutes} minutes</span></> : <span>Calculating...</span>}<div><button type="button" onClick={() => { setDriverFitEvaluation(null); setPhoneInitialScreen('driverFit'); setPhoneLoadId(driverFitEvaluation.loadId); setIsPhoneOpen(true) }}>BACK</button><button type="button" onClick={() => { setLoads((current) => current.map((load) => load.id === driverFitEvaluation.loadId ? { ...load, driverFitVerified: true, candidateDriverId: driverFitEvaluation.driverId } : load)); setDriverFitEvaluation(null); setPhoneInitialScreen('loadDetails'); setPhoneLoadId(driverFitEvaluation.loadId); setIsPhoneOpen(true) }}>CONFIRM FIT</button></div></div>}
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
            onEvaluateFit={(loadId, driverId, fit) => { const load = loads.find((item) => item.id === loadId); setLoads((current) => current.map((item) => item.id === loadId ? { ...item, candidateDriverId: driverId } : item)); setPhoneLoadId(loadId); setDriverFitEvaluation({ loadId, driverId, driverName: drivers.find((driver) => driver.id === driverId)?.name, deadheadMiles: fit.miles, deadheadMinutes: fit.minutes, deadheadRoute: fit.routeShape, arrivalDay: fit.arrivalDay, arrivalMinutes: fit.arrivalMinutes, pickupDayIndex: load.pickupDayIndex, pickupStart: load.pickupWindowStartMinutes, pickupEnd: load.pickupWindowEndMinutes, status: fit.status }); setIsPhoneOpen(false) }}
            onClose={() => setIsPhoneOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default MainGameScreen
