import { useState } from 'react'
import './App.css'
import HomeScreen from './components/HomeScreen.jsx'
import LoadBoardScreen from './components/LoadBoardScreen.jsx'
import StatusBar from './components/StatusBar.jsx'

function App() {
  const [screen, setScreen] = useState('home')

  return (
    <main className="app">
      <section className="phone-shell">
        <StatusBar />
        {screen === 'home' ? (
          <HomeScreen onOpenLoadBoard={() => setScreen('loadBoard')} />
        ) : (
          <LoadBoardScreen onBack={() => setScreen('home')} />
        )}
      </section>
    </main>
  )
}

export default App
