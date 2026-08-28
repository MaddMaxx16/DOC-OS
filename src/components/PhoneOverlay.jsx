import { useState } from 'react'
import HomeScreen from './HomeScreen.jsx'
import LoadDetailsScreen from './LoadDetailsScreen.jsx'
import LoadBoardScreen from './LoadBoardScreen.jsx'
import RoutePlanningScreen from './RoutePlanningScreen.jsx'
import BrowserScreen from './BrowserScreen.jsx'
import DriverFitScreen from './DriverFitScreen.jsx'

function PhoneOverlay({ loads, setLoads, drivers, setDrivers, plannedRoute, setPlannedRoute, gameTime, onClose }) {
  const [screen, setScreen] = useState('home')
  const [selectedLoadId, setSelectedLoadId] = useState(null)

  return (
    <aside className="phone-overlay">
      <button type="button" className="phone-close-button" onClick={onClose} aria-label="Close phone">×</button>
      <div className="phone-app-viewport">

      {screen === 'home' ? (
        <HomeScreen onOpenBrowser={() => setScreen('browser')} />
      ) : screen === 'browser' ? (
        <BrowserScreen
          loads={loads}
          onSelectLoad={(loadId) => {
            setSelectedLoadId(loadId)
            setScreen('loadDetails')
          }}
          onBackToPhone={() => setScreen('home')}
        />
      ) : screen === 'loadBoard' ? (
        <LoadBoardScreen
          loads={loads}
          drivers={drivers}
          onBack={() => setScreen('home')}
          onSelectLoad={(loadId) => {
            setSelectedLoadId(loadId)
            setScreen('loadDetails')
          }}
        />
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
        <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} drivers={drivers} gameTime={gameTime} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onConfirm={(driverId) => { setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, candidateDriverId: driverId } : load)); setScreen('loadDetails') }} onBack={() => setScreen('loadDetails')} />
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
