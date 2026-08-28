import { useState } from 'react'
import HomeScreen from './HomeScreen.jsx'
import LoadBoardScreen from './LoadBoardScreen.jsx'

function PhoneOverlay({ onClose }) {
  const [screen, setScreen] = useState('home')

  return (
    <aside className="phone-overlay">
      <button type="button" className="close-button" onClick={onClose}>
        Close
      </button>

      {screen === 'home' ? (
        <HomeScreen onOpenLoadBoard={() => setScreen('loadBoard')} />
      ) : (
        <LoadBoardScreen onBack={() => setScreen('home')} />
      )}
    </aside>
  )
}

export default PhoneOverlay
