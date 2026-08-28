import { useState } from 'react'
import GameMap from './GameMap.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'

function MainGameScreen({ selectedMarket, loads, setLoads, drivers, setDrivers, onOpenMarkets }) {
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)

  return (
    <div className="main-game-screen">
      <StatusBar selectedMarket={selectedMarket} />
      <div className="map-area">
        <GameMap />
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
            onClose={() => setIsPhoneOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default MainGameScreen
