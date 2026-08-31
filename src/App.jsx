import { useEffect, useState } from 'react'
import './App.css'
import seedDrivers from './data/drivers.js'
import seedLoads from './data/loads.js'
import mapLocations from './data/mapLocations.js'
import { calculateRoute } from './services/routingService.js'
import { DELIVERY_UNLOAD_DURATION_MINUTES, PICKUP_LOADING_MINUTES } from './data/pickupConfig.js'
import { logDocOsState } from './utils/debugLogger.js'
import { getMarcusPanelModel } from './utils/driverOperationalState.js'
import MarketSelectionScreen from './components/MarketSelectionScreen.jsx'
import MainGameScreen from './components/MainGameScreen.jsx'
import StartScreen from './components/StartScreen.jsx'
import { clearSave, loadGame, saveGame } from './utils/saveGame.js'
import { createDevPreset } from './dev/devPresets.js'

function App() {
  const [stage, setStage] = useState('start')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [gameTime, setGameTime] = useState({ gameDayIndex: 0, totalMinutesOfDay: 420 })
  const [loads, setLoads] = useState(() => seedLoads)
  const [drivers, setDrivers] = useState(() => seedDrivers)
  const [plannedRoute, setPlannedRoute] = useState(null)
  const [isGameClockPaused, setIsGameClockPaused] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [runtimePositions, setRuntimePositions] = useState({ marcus: { longitude: -73.9819, latitude: 40.7282 } })
  const [runtimeProgress, setRuntimeProgress] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = loadGame()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) { if (saved.stage) setStage(saved.stage); if (saved.selectedMarket) setSelectedMarket(saved.selectedMarket); if (saved.gameTime) setGameTime(saved.gameTime); if (saved.loads) setLoads(saved.loads); if (saved.drivers) setDrivers(saved.drivers); if (saved.runtimePositions) setRuntimePositions(saved.runtimePositions); if (saved.runtimeProgress !== undefined) setRuntimeProgress(saved.runtimeProgress) }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timer = setTimeout(() => saveGame({ stage, selectedMarket, gameTime, loads, drivers, runtimePositions, runtimeProgress }), 700)
    return () => clearTimeout(timer)
  }, [hydrated, stage, selectedMarket, gameTime, loads, drivers, runtimePositions, runtimeProgress])

  const applyDevPreset = async (name) => { try { const preset = await createDevPreset(name, { gameTime, currentLoads: loads, currentDrivers: drivers }); setStage(preset.stage); setSelectedMarket(preset.selectedMarket); setLoads(preset.loads); setDrivers(preset.drivers); setRuntimePositions(preset.runtimePositions); setRuntimeProgress(preset.runtimeProgress) } catch (error) { console.error('DEV preset route unavailable:', error) } }
  const resetGame = () => { clearSave(); window.location.reload() }

  useEffect(() => {
    const load = loads.find((item) => item.id === 'DOC001') || {}
    const route = load.tripStatus === 'en-route-delivery' ? load.plannedLoadedRouteGeometry : load.tripStatus === 'en-route-pickup' ? load.plannedDeadheadRouteGeometry : load.plannedLoadedRouteGeometry || load.plannedDeadheadRouteGeometry
    const activeTravelLeg = load.tripStatus === 'en-route-delivery' ? 'loaded' : load.tripStatus === 'en-route-pickup' ? 'deadhead' : null
    const panel = getMarcusPanelModel({ assignedLoad: load, gameTime, runtimeProgress, pickup: mapLocations.find((item) => item.id === load.pickupLocationId), delivery: mapLocations.find((item) => item.id === load.deliveryLocationId) })
    const hasActiveAcceptedLoad = Boolean(load.assignedDriverId) && !['delivered', 'completed'].includes(load.tripStatus)
    const pickupFinished = ['loaded', 'en-route-delivery', 'at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'].includes(load.tripStatus)
    const loadFinished = ['delivered', 'completed'].includes(load.tripStatus)
    logDocOsState({ tripStatus: load.tripStatus, planningStatus: load.planningStatus, deliveryPlanningStatus: load.deliveryPlanningStatus, activeTravelLeg, driverOperationalState: panel?.operationalState, panelAction: panel?.actionType, candidateDriverId: load.candidateDriverId, assignedDriverId: load.assignedDriverId, hasActiveAcceptedLoad, showPickupMarker: hasActiveAcceptedLoad && !pickupFinished, showDeliveryMarker: hasActiveAcceptedLoad && !loadFinished, candidateDeadhead: `${load.candidateDeadheadRouteGeometry?.length || 0} coordinates`, plannedDeadhead: `${load.plannedDeadheadRouteGeometry?.length || 0} coordinates`, candidateLoaded: `${load.candidateLoadedRouteGeometry?.length || 0} coordinates`, plannedLoaded: `${load.plannedLoadedRouteGeometry?.length || 0} coordinates`, activeRoute: route === load.plannedLoadedRouteGeometry ? 'plannedLoaded' : route === load.plannedDeadheadRouteGeometry ? 'plannedDeadhead' : 'none', activeRouteCoordinates: route?.length || 0, MarcusPosition: runtimePositions.marcus })
  }, [loads, runtimePositions])

  useEffect(() => {
    const load = loads.find((item) => item.id === 'DOC001')
    const delivery = load?.tripStatus === 'en-route-delivery'
    if (!load || !['en-route-pickup', 'en-route-delivery'].includes(load.tripStatus)) return
    const route = delivery ? load.plannedLoadedRouteGeometry : load.plannedDeadheadRouteGeometry
    const departure = delivery ? load.deliveryDepartureGameMinute : load.departureGameMinute
    const duration = delivery ? load.plannedLoadedDriveTimeMinutes : load.plannedDeadheadDriveTimeMinutes
    if (!route || !Number.isFinite(departure) || !duration) return
    const elapsed = (gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay) - departure
    const progress = Math.max(0, Math.min(1, elapsed / duration))
    const coords = route
    const index = Math.min(coords.length - 2, Math.floor(progress * (coords.length - 1)))
    const local = progress * (coords.length - 1) - index
    const a = coords[index]; const b = coords[index + 1]
    // The position is derived from the central clock tick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRuntimeProgress(progress)
    const destination = mapLocations.find((location) => location.id === (delivery ? load.deliveryLocationId : load.pickupLocationId))
    setRuntimePositions({ marcus: progress >= 1 && destination ? { longitude: destination.longitude, latitude: destination.latitude } : { longitude: a[0] + (b[0] - a[0]) * local, latitude: a[1] + (b[1] - a[1]) * local } })
    if (progress >= 1) setLoads((current) => current.map((item) => item.id === load.id ? { ...item, tripStatus: delivery ? 'at-delivery' : 'at-pickup' } : item))
  }, [gameTime, loads])

  useEffect(() => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    // Advance operational pickup phases from the authoritative game clock.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoads((current) => current.map((load) => {
      if (load.tripStatus === 'at-pickup') return { ...load, tripStatus: 'waiting-at-pickup', pickupArrivalGameMinute: now }
      if (load.tripStatus === 'checked-in-pickup') return { ...load, tripStatus: 'loading-at-pickup', loadingStartGameMinute: now }
      if (load.tripStatus === 'loading-at-pickup' && now - load.loadingStartGameMinute >= PICKUP_LOADING_MINUTES) return { ...load, tripStatus: 'loaded' }
      if (load.tripStatus === 'checked-in-delivery') return { ...load, tripStatus: 'unloading-delivery', deliveryUnloadStartGameMinute: now }
      if (load.tripStatus === 'unloading-delivery' && now - load.deliveryUnloadStartGameMinute >= DELIVERY_UNLOAD_DURATION_MINUTES) return { ...load, tripStatus: 'awaiting-pod', pod: { status: 'complete', receivedGameMinute: now, signedBy: 'Jordan Rivera', piecesExpected: 12, piecesReceived: 12, damage: 'None' } }
      return load
    }))
  }, [gameTime])

  useEffect(() => {
    const completed = loads.find((load) => load.id === 'DOC001' && load.tripStatus === 'delivered')
    if (!completed) return
    const delivery = mapLocations.find((location) => location.id === completed.deliveryLocationId)
    if (!delivery) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrivers((current) => current.map((driver) => driver.id === completed.assignedDriverId ? { ...driver, status: 'available', assignedLoadId: null, longitude: delivery.longitude, latitude: delivery.latitude } : driver))
    setLoads((current) => current.map((load) => load.id === completed.id && load.tripStatus === 'delivered' ? { ...load, tripStatus: 'completed' } : load))
  }, [loads])

  useEffect(() => {
    if (stage !== 'game' || isGameClockPaused) return undefined
    const timer = setInterval(() => setGameTime((time) => {
      const nextMinutes = time.totalMinutesOfDay + 1
      return nextMinutes >= 1440
        ? { gameDayIndex: time.gameDayIndex + 1, totalMinutesOfDay: 0 }
        : { ...time, totalMinutesOfDay: nextMinutes }
    }), 3000 / simulationSpeed)
    return () => clearInterval(timer)
  }, [stage, isGameClockPaused, simulationSpeed])

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
            runtimeProgress={runtimeProgress}
            setRuntimeProgress={setRuntimeProgress}
            simulationSpeed={simulationSpeed}
            setSimulationSpeed={setSimulationSpeed}
            onOpenMarkets={() => setStage('market')}
            onApplyDevPreset={applyDevPreset}
            onResetGame={resetGame}
          />
        )}
      </section>
    </main>
  )
}

export default App
