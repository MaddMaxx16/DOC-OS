import { useState } from 'react'
import HomeScreen from './HomeScreen.jsx'
import DriverSelectionScreen from './DriverSelectionScreen.jsx'
import LoadDetailsScreen from './LoadDetailsScreen.jsx'
import LoadBoardScreen from './LoadBoardScreen.jsx'
import RoutePlanningScreen from './RoutePlanningScreen.jsx'

function PhoneOverlay({ loads, setLoads, drivers, setDrivers, plannedRoute, setPlannedRoute, onClose }) {
  const [screen, setScreen] = useState('home')
  const [selectedLoadId, setSelectedLoadId] = useState(null)

  return (
    <aside className="phone-overlay">
      <button type="button" className="close-button" onClick={onClose}>
        Close
      </button>

      {screen === 'home' ? (
        <HomeScreen onOpenLoadBoard={() => setScreen('loadBoard')} />
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
          onAccept={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, status: 'accepted' } : load
            )))
          }}
          onAssignDriver={() => setScreen('driverSelection')}
          onPlanRoute={() => setScreen('routePlanning')}
          onDispatch={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, status: 'dispatched' } : load
            )))
          }}
          onBack={() => setScreen('loadBoard')}
        />
      ) : screen === 'routePlanning' ? (
        <RoutePlanningScreen
          loads={loads}
          plannedRoute={plannedRoute}
          setPlannedRoute={setPlannedRoute}
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
      ) : (
        <DriverSelectionScreen
          drivers={drivers}
          onSelectDriver={(driverId) => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, assignedDriverId: driverId, status: 'assigned' } : load
            )))
            setDrivers((currentDrivers) => currentDrivers.map((driver) => (
              driver.id === driverId ? { ...driver, status: 'unavailable' } : driver
            )))
            setScreen('loadDetails')
          }}
          onBack={() => setScreen('loadDetails')}
        />
      )}
    </aside>
  )
}

export default PhoneOverlay
