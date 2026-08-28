import { useState } from 'react'
import GameMap from './GameMap.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'

function MainGameScreen({ selectedMarket, gameTime, loads, setLoads, drivers, setDrivers, plannedRoute, setPlannedRoute, onOpenMarkets }) {
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)

  return (
    <div className="main-game-screen">
      <StatusBar selectedMarket={selectedMarket} gameTime={gameTime} />
      <div className="map-area">
        <GameMap drivers={drivers} plannedRoute={plannedRoute} />
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
            onClick={() => setIsPhoneOpen(true)}
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
            onClose={() => setIsPhoneOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default MainGameScreen
