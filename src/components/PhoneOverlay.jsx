import { useState } from 'react'
import HomeScreen from './HomeScreen.jsx'
import LoadDetailsScreen from './LoadDetailsScreen.jsx'
import LoadBoardScreen from './LoadBoardScreen.jsx'

function PhoneOverlay({ onClose }) {
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
          onBack={() => setScreen('home')}
          onSelectLoad={(loadId) => {
            setSelectedLoadId(loadId)
            setScreen('loadDetails')
          }}
        />
      ) : (
        <LoadDetailsScreen loadId={selectedLoadId} onBack={() => setScreen('loadBoard')} />
      )}
    </aside>
  )
}

export default PhoneOverlay
