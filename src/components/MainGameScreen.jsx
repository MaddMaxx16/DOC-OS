import { useState } from 'react'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'

function MainGameScreen() {
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)

  return (
    <div className="main-game-screen">
      <StatusBar />
      <div className="map-area">
        MAP AREA
        <button
          type="button"
          className="phone-button"
          onClick={() => setIsPhoneOpen(true)}
        >
          PHONE
        </button>
        {isPhoneOpen && <PhoneOverlay onClose={() => setIsPhoneOpen(false)} />}
      </div>
    </div>
  )
}

export default MainGameScreen
