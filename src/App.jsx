import { useEffect, useState } from 'react'
import './App.css'
import seedDrivers from './data/drivers.js'
import seedLoads from './data/loads.js'
import mapLocations from './data/mapLocations.js'
import { calculateRoute } from './services/routingService.js'
import MarketSelectionScreen from './components/MarketSelectionScreen.jsx'
import MainGameScreen from './components/MainGameScreen.jsx'
import StartScreen from './components/StartScreen.jsx'

function App() {
  const [stage, setStage] = useState('start')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [gameTime, setGameTime] = useState({ gameDayIndex: 0, totalMinutesOfDay: 420 })
  const [loads, setLoads] = useState(() => seedLoads)
  const [drivers, setDrivers] = useState(() => seedDrivers)
  const [plannedRoute, setPlannedRoute] = useState(null)
  const [isGameClockPaused, setIsGameClockPaused] = useState(false)
  const [runtimePositions, setRuntimePositions] = useState({ marcus: { longitude: -73.9819, latitude: 40.7282 } })

  useEffect(() => {
    const load = loads.find((item) => item.id === 'DOC001')
    if (!load || load.tripStatus !== 'en-route-pickup' || !load.plannedDeadheadRouteGeometry || !load.departureGameMinute || !load.plannedDeadheadDriveTimeMinutes) return
    const elapsed = (gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay) - load.departureGameMinute
    const progress = Math.max(0, Math.min(1, elapsed / load.plannedDeadheadDriveTimeMinutes))
    const coords = load.plannedDeadheadRouteGeometry
    const index = Math.min(coords.length - 2, Math.floor(progress * (coords.length - 1)))
    const local = progress * (coords.length - 1) - index
    const a = coords[index]; const b = coords[index + 1]
    // The position is derived from the central clock tick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRuntimePositions({ marcus: { longitude: a[0] + (b[0] - a[0]) * local, latitude: a[1] + (b[1] - a[1]) * local } })
    if (progress >= 1 && load.tripStatus !== 'at-pickup') setLoads((current) => current.map((item) => item.id === load.id ? { ...item, tripStatus: 'at-pickup' } : item))
  }, [gameTime, loads])

  useEffect(() => {
    if (stage !== 'game' || isGameClockPaused) return undefined
    const timer = setInterval(() => setGameTime((time) => {
      const nextMinutes = time.totalMinutesOfDay + 1
      return nextMinutes >= 1440
        ? { gameDayIndex: time.gameDayIndex + 1, totalMinutesOfDay: 0 }
        : { ...time, totalMinutesOfDay: nextMinutes }
    }), 3000)
    return () => clearInterval(timer)
  }, [stage, isGameClockPaused])

  useEffect(() => {
    const loadsToCalculate = seedLoads.filter((load) => load.listedMiles === null)
    if (!loadsToCalculate.length) return

    Promise.all(loadsToCalculate.map(async (load) => {
      const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
      const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
      try {
        const route = await calculateRoute(pickup, delivery)
        return { id: load.id, listedMiles: route.distanceMiles }
      } catch (error) {
        console.error(error)
        return { id: load.id, listedMiles: 'unavailable' }
      }
    })).then((results) => {
      setLoads((currentLoads) => currentLoads.map((load) => {
        const result = results.find((item) => item.id === load.id)
        return result ? { ...load, listedMiles: result.listedMiles } : load
      }))
    })
  }, [])

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
            gameTime={gameTime}
            loads={loads}
            setLoads={setLoads}
            drivers={drivers}
            setDrivers={setDrivers}
            plannedRoute={plannedRoute}
            setPlannedRoute={setPlannedRoute}
            setGameClockPaused={setIsGameClockPaused}
            runtimePositions={runtimePositions}
            onOpenMarkets={() => setStage('market')}
          />
        )}
      </section>
    </main>
  )
}

export default App
