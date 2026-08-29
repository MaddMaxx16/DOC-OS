import { useState } from 'react'
import HomeScreen from './HomeScreen.jsx'
import LoadDetailsScreen from './LoadDetailsScreen.jsx'
import LoadBoardScreen from './LoadBoardScreen.jsx'
import RoutePlanningScreen from './RoutePlanningScreen.jsx'
import BrowserScreen from './BrowserScreen.jsx'
import DriverFitScreen from './DriverFitScreen.jsx'

function PhoneOverlay({ loads, setLoads, drivers, setDrivers, plannedRoute, setPlannedRoute, gameTime, onEvaluateFit, initialScreen = 'home', initialLoadId = null, onClose }) {
  const [screen, setScreen] = useState(initialScreen)
  const [selectedLoadId, setSelectedLoadId] = useState(initialLoadId)

  return (
    <aside className="phone-overlay">
      <button type="button" className="phone-close-button" onClick={onClose} aria-label="Close phone">×</button>
      <div className="phone-app-viewport">

      {screen === 'home' ? (
        <HomeScreen onOpenBrowser={() => setScreen('browser')} />
      ) : screen === 'browser' || screen === 'loadBoard' || screen === 'loadDetails' || screen === 'driverFit' || screen === 'routePlanning' ? (
        <BrowserScreen
          page={screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'freightlink.local' : screen === 'loadDetails' ? 'freightlink.local/load/DOC001' : screen === 'driverFit' ? 'freightlink.local/load/DOC001/driver-fit' : 'freightlink.local/load/DOC001/route'}
          onOpenFreightLink={() => setScreen('loadBoard')}
          onBack={() => setScreen(screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'browser' : 'loadDetails')}
          onHome={() => setScreen('browser')}
        >
          {screen === 'loadBoard' && <LoadBoardScreen embedded loads={loads} onSelectLoad={(loadId) => { setSelectedLoadId(loadId); setScreen('loadDetails') }} />}
          {screen === 'loadDetails' && <LoadDetailsScreen loads={loads} drivers={drivers} loadId={selectedLoadId} onCheckDriverFit={() => setScreen('driverFit')} onAccept={() => { const candidate = loads.find((load) => load.id === selectedLoadId)?.candidateDriverId; setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'accepted', assignedDriverId: candidate, candidateDriverId: null } : load)); setDrivers((currentDrivers) => currentDrivers.map((driver) => driver.id === candidate ? { ...driver, status: 'unavailable' } : driver)) }} onPlanRoute={() => setScreen('routePlanning')} onDispatch={() => setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'dispatched' } : load))} onBack={() => setScreen('loadBoard')} />}
          {screen === 'driverFit' && <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} drivers={drivers} gameTime={gameTime} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onEvaluate={(driverId, fit) => onEvaluateFit(selectedLoadId, driverId, fit)} onBack={() => setScreen('loadDetails')} />}
          {screen === 'routePlanning' && <RoutePlanningScreen loads={loads} plannedRoute={plannedRoute} setPlannedRoute={setPlannedRoute} loadId={selectedLoadId} drivers={drivers} onSelectRoute={() => setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, selectedRouteId: 'recommended', plannedMiles: plannedRoute.distanceMiles, plannedDriveTimeMinutes: plannedRoute.durationMinutes } : load))} onBack={() => setScreen('loadDetails')} onContinue={() => { setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'route-ready' } : load)); setScreen('loadDetails') }} />}
        </BrowserScreen>
      ) : screen === 'loadDetails' ? (
        <LoadDetailsScreen
          loads={loads}
          drivers={drivers}
          loadId={selectedLoadId}
          onCheckDriverFit={() => setScreen('driverFit')}
          onAccept={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, status: 'accepted', assignedDriverId: load.candidateDriverId, candidateDriverId: null } : load
            )))
            setDrivers((currentDrivers) => currentDrivers.map((driver) => driver.id === loads.find((load) => load.id === selectedLoadId)?.candidateDriverId ? { ...driver, status: 'unavailable' } : driver))
          }}
          onPlanRoute={() => setScreen('routePlanning')}
          onDispatch={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, status: 'dispatched' } : load
            )))
          }}
          onBack={() => setScreen('loadBoard')}
        />
      ) : screen === 'driverFit' ? (
        <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} drivers={drivers} gameTime={gameTime} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onEvaluate={(driverId, fit) => onEvaluateFit(selectedLoadId, driverId, fit)} onBack={() => setScreen('loadDetails')} />
      ) : screen === 'routePlanning' ? (
        <RoutePlanningScreen
          loads={loads}
          plannedRoute={plannedRoute}
          setPlannedRoute={setPlannedRoute}
          gameTime={gameTime}
          onSelectRoute={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId
                ? { ...load, selectedRouteId: 'recommended', plannedMiles: plannedRoute.distanceMiles, plannedDriveTimeMinutes: plannedRoute.durationMinutes }
                : load
            )))
          }}
          loadId={selectedLoadId}
          drivers={drivers}
          onBack={() => setScreen('loadDetails')}
          onContinue={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, status: 'route-ready' } : load
            )))
            setScreen('loadDetails')
          }}
        />
      ) : null}
      </div>
      <button type="button" className="phone-home-button" onClick={() => setScreen('home')} aria-label="Phone home">⌂</button>
    </aside>
  )
}

export default PhoneOverlay
