import { useState } from 'react'
import './App.css'
import seedLoads from './data/loads.js'
import MarketSelectionScreen from './components/MarketSelectionScreen.jsx'
import MainGameScreen from './components/MainGameScreen.jsx'
import StartScreen from './components/StartScreen.jsx'

function App() {
  const [stage, setStage] = useState('start')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [loads, setLoads] = useState(() => seedLoads)

  return (
    <main className="app">
      <section className="phone-shell">
        {stage === 'start' && <StartScreen onStart={() => setStage('market')} />}
        {stage === 'market' && (
          <MarketSelectionScreen
            selectedMarket={selectedMarket}
            onSelectMarket={() => setSelectedMarket('new-york')}
            onConfirm={() => setStage('game')}
          />
        )}
        {stage === 'game' && (
          <MainGameScreen
            selectedMarket={selectedMarket}
            loads={loads}
            setLoads={setLoads}
            onOpenMarkets={() => setStage('market')}
          />
        )}
      </section>
    </main>
  )
}

export default App
