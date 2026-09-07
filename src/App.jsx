import { useEffect, useState } from 'react'
import './App.css'
import seedLoads from './data/loads.js'
import seedCarriers from './data/carriers.js'
import seedDrivers from './data/drivers.js'
import mapLocations from './data/mapLocations.js'
import { DELIVERY_UNLOAD_DURATION_MINUTES, PICKUP_CHECKIN_MINUTES, PICKUP_LOADING_MINUTES, getPickupDockWaitMinutes } from './data/pickupConfig.js'
import { logDocOsState } from './utils/debugLogger.js'
import { getMarcusPanelModel } from './utils/driverOperationalState.js'
import MarketSelectionScreen from './components/MarketSelectionScreen.jsx'
import MainGameScreen from './components/MainGameScreen.jsx'
import StartScreen from './components/StartScreen.jsx'
import EntryLiveMap from './components/EntryLiveMap.jsx'
import { SAVE_SLOT_IDS, clearSave, getActiveSaveSlot, getSaveSlots, loadGame, saveGame, setActiveSaveSlot } from './utils/saveGame.js'
import { createDevPreset } from './dev/devPresets.js'
import { getReceivables } from './utils/ledger.js'
import { reconcileActiveCarrierDrivers } from './utils/driverRoster.js'
import { getDriverActiveLoad, getDriverQueue, promoteNextQueuedLoad } from './utils/driverQueue.js'
import { createDayReport, DEFAULT_DAY_LOOP_STATE, DEFAULT_PLAYER_PROGRESSION, getEndDayStatus } from './utils/dayLoop.js'
import { calculateRoute } from './services/routingService.js'


const IDLE_DWELL_MINUTES = 20

function getIdleTargetLocationId(lastLocationId) {
  if (['bronx-commerce-terminal', 'queens-freight-center'].includes(lastLocationId)) return 'queens-staging-area'
  if (['newark-distribution-hub', 'elizabeth-logistics-park'].includes(lastLocationId)) return 'newark-fuel-stop'
  return 'metroline-yard'
}

function pointAlongRoute(route, progress) {
  if (!Array.isArray(route) || route.length < 2) return null
  const clamped = Math.max(0, Math.min(1, progress))
  const scaled = clamped * (route.length - 1)
  const index = Math.min(route.length - 2, Math.floor(scaled))
  const local = scaled - index
  const a = route[index]
  const b = route[index + 1]
  return { longitude: a[0] + (b[0] - a[0]) * local, latitude: a[1] + (b[1] - a[1]) * local }
}

function App() {
  const [stage, setStage] = useState('start')
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [gameTime, setGameTime] = useState({ gameDayIndex: 0, totalMinutesOfDay: 420 })
  const [loads, setLoads] = useState(() => seedLoads)
  const [drivers, setDrivers] = useState([])
  const [carriers, setCarriers] = useState(() => seedCarriers.map((carrier) => ({ ...carrier })))
  const [plannedRoute, setPlannedRoute] = useState(null)
  const [isGameClockPaused, setIsGameClockPaused] = useState(true)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [runtimePositions, setRuntimePositions] = useState({})
  const [runtimeProgress, setRuntimeProgress] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [hasExistingOperation, setHasExistingOperation] = useState(false)
  const [resumeStage, setResumeStage] = useState(null)
  const [seenLedgerReceivableIds, setSeenLedgerReceivableIds] = useState([])
  const [seenLedgerPaymentReceivedIds, setSeenLedgerPaymentReceivedIds] = useState([])
  const [ledgerWorkflowByLoadId, setLedgerWorkflowByLoadId] = useState({})
  const [carrierApplicationsById, setCarrierApplicationsById] = useState({})
  const [emailMessages, setEmailMessages] = useState([])
  const [driverMessages, setDriverMessages] = useState([])
  const [businessDocuments, setBusinessDocuments] = useState([])
  const [tutorialState, setTutorialState] = useState({ enabled: false, completed: true })
  const [dayLoop, setDayLoop] = useState(() => ({ ...DEFAULT_DAY_LOOP_STATE }))
  const [playerProgression, setPlayerProgression] = useState(() => ({ ...DEFAULT_PLAYER_PROGRESSION }))
  const [saveSlots, setSaveSlots] = useState([])
  const [activeSaveSlotId, setActiveSaveSlotId] = useState(null)

  const approvePodAndCloseout = (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load || load.tripStatus !== 'awaiting-pod' || !load.pod?.verified || !load.assignedDriverId) return false

    const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
    if (!delivery) {
      console.error('POD closeout failed: delivery location unavailable', loadId, load.deliveryLocationId)
      return false
    }

    const driverId = load.assignedDriverId
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const nextQueued = getDriverQueue(loads, driverId)[0] || null

    // POD approval owns the document decision AND the operational closeout.
    // Complete the delivered load in the same player action so queue promotion
    // never depends on a later render/effect noticing an intermediate state.
    setLoads((current) => {
      const closed = current.map((item) => item.id === loadId && item.tripStatus === 'awaiting-pod'
        ? {
            ...item,
            tripStatus: 'completed',
            status: 'completed',
            completedDriverId: driverId,
            assignedDriverId: null,
            queuePosition: null,
            completedGameMinute: now,
            completedOperationDay: dayLoop.operationDay,
            pod: {
              ...item.pod,
              approved: true,
              approvedGameMinute: now,
            },
          }
        : item)
      return promoteNextQueuedLoad(closed, driverId).loads
    })

    setDrivers((current) => current.map((driver) => driver.id === driverId
      ? {
          ...driver,
          status: nextQueued ? 'unavailable' : 'available',
          assignedLoadId: nextQueued?.id || null,
          queuedLoadIds: (driver.queuedLoadIds || []).filter((id) => id !== nextQueued?.id),
          longitude: delivery.longitude,
          latitude: delivery.latitude,
          lastKnownLocationId: load.deliveryLocationId,
          idleSinceGameMinute: nextQueued ? null : now,
          idleTargetLocationId: nextQueued ? null : getIdleTargetLocationId(load.deliveryLocationId),
          idleRouteStatus: nextQueued ? null : 'dwell',
          idleRouteGeometry: null,
          idleRouteStartGameMinute: null,
          idleRouteDurationMinutes: null,
        }
      : driver))

    // The receiver remains the authoritative physical origin for whatever comes next.
    setRuntimePositions((current) => ({
      ...current,
      [driverId]: { longitude: delivery.longitude, latitude: delivery.latitude },
    }))
    setRuntimeProgress(null)
    return true
  }

  const mergeSavedLoads = (savedLoads = []) => [
    ...savedLoads.map((load) => {
      const seed = seedLoads.find((item) => item.id === load.id)
      if (!seed) return load
      const merged = { ...seed, ...load }
      if (seed.loadNumber) merged.loadNumber = seed.loadNumber
      // Unified market-flow migration: tutorial/progression/operation-day gates never control freight visibility.
      delete merged.unlockAfterLoadId
      const hadLegacyOperationGate = Number.isFinite(load.scheduledOperationDay)
      delete merged.scheduledOperationDay
      if (Number.isFinite(seed.postedGameMinute) && !Number.isFinite(merged.postedGameMinute)) merged.postedGameMinute = seed.postedGameMinute
      // Market Refresh V2 migration: untouched available freight adopts the latest
      // seed posting/appointment schedule. Active/history loads keep their real state.
      if (merged.status === 'available' && !merged.assignedDriverId && !merged.candidateDriverId) {
        if (Number.isFinite(seed.pickupDayIndex)) merged.pickupDayIndex = seed.pickupDayIndex
        if (Number.isFinite(seed.deliveryDayIndex)) merged.deliveryDayIndex = seed.deliveryDayIndex
        if (Number.isFinite(seed.postedGameMinute)) merged.postedGameMinute = seed.postedGameMinute
        if (Number.isFinite(seed.marketPostMinutes)) merged.marketPostMinutes = seed.marketPostMinutes
        if (Number.isFinite(seed.pickupWindowStartMinutes)) merged.pickupWindowStartMinutes = seed.pickupWindowStartMinutes
        if (Number.isFinite(seed.pickupWindowEndMinutes)) merged.pickupWindowEndMinutes = seed.pickupWindowEndMinutes
        if (Number.isFinite(seed.deliveryWindowStartMinutes)) merged.deliveryWindowStartMinutes = seed.deliveryWindowStartMinutes
        if (Number.isFinite(seed.deliveryWindowEndMinutes)) merged.deliveryWindowEndMinutes = seed.deliveryWindowEndMinutes
      }
      return merged
    }),
    ...seedLoads.filter((seed) => !savedLoads.some((load) => load.id === seed.id)),
  ]

  const hydrateSavedOperation = (saved) => {
    if (!saved) return
    const hydratedCarriers = saved.carriers ?? seedCarriers.map((carrier) => ({ ...carrier }))
    let hydratedLoads = mergeSavedLoads(saved.loads ?? [])
    const savedNow = (saved.gameTime?.gameDayIndex ?? 0) * 1440 + (saved.gameTime?.totalMinutesOfDay ?? 420)
    hydratedLoads = hydratedLoads.map((load) => {
      if (load.tripStatus === 'at-delivery' && !Number.isFinite(load.deliveryArrivalGameMinute)) return { ...load, deliveryArrivalGameMinute: savedNow }
      if (load.tripStatus === 'waiting-at-pickup') {
        const pickupArrivalGameMinute = Number.isFinite(load.pickupArrivalGameMinute) ? load.pickupArrivalGameMinute : savedNow
        const pickupCheckInGameMinute = Number.isFinite(load.pickupCheckInGameMinute) ? load.pickupCheckInGameMinute : savedNow
        // AP1 normalizes legacy/AP test saves to the current dock-wait contract.
        // Do not preserve an old excessive ready time after the wait rules change.
        const pickupDockReadyGameMinute = pickupCheckInGameMinute + getPickupDockWaitMinutes(load, pickupCheckInGameMinute)
        return { ...load, pickupArrivalGameMinute, pickupCheckInGameMinute, pickupDockReadyGameMinute }
      }
      return load
    })
    let hydratedDrivers = reconcileActiveCarrierDrivers(saved.drivers ?? [], hydratedCarriers)

    // Resume safety: any driver assigned to an active load must exist after hydration.
    hydratedLoads.forEach((load) => {
      if (!load.assignedDriverId || hydratedDrivers.some((driver) => driver.id === load.assignedDriverId)) return
      const seed = seedDrivers.find((driver) => driver.id === load.assignedDriverId)
      if (seed) hydratedDrivers = [...hydratedDrivers, { ...seed, status: 'unavailable', assignedLoadId: load.id }]
    })
    hydratedDrivers = hydratedDrivers.map((driver) => {
      const assigned = getDriverActiveLoad(hydratedLoads, driver.id)
      const queued = getDriverQueue(hydratedLoads, driver.id)
      return assigned
        ? { ...driver, status: 'unavailable', assignedLoadId: assigned.id, queuedLoadIds: queued.map((load) => load.id) }
        : { ...driver, status: queued.length ? 'unavailable' : driver.status, assignedLoadId: null, queuedLoadIds: queued.map((load) => load.id) }
    })

    const nextPositions = { ...(saved.runtimePositions || {}) }
    hydratedDrivers.forEach((driver) => {
      if (nextPositions[driver.id]) return
      const home = mapLocations.find((location) => location.id === driver.homeBaseLocationId)
      if (home) nextPositions[driver.id] = { longitude: home.longitude, latitude: home.latitude }
    })

    setSelectedMarket(saved.selectedMarket ?? null)
    setGameTime(saved.gameTime ?? { gameDayIndex: 0, totalMinutesOfDay: 420 })
    setLoads(hydratedLoads)
    setDrivers(hydratedDrivers)
    setCarriers(hydratedCarriers)
    setRuntimePositions(nextPositions)
    setRuntimeProgress(saved.runtimeProgress ?? null)
    setSeenLedgerReceivableIds(Array.isArray(saved.seenLedgerReceivableIds) ? saved.seenLedgerReceivableIds : [])
    setSeenLedgerPaymentReceivedIds(Array.isArray(saved.seenLedgerPaymentReceivedIds) ? saved.seenLedgerPaymentReceivedIds : [])
    setLedgerWorkflowByLoadId(saved.ledgerWorkflowByLoadId || {})
    setCarrierApplicationsById(saved.carrierApplicationsById || {})
    setEmailMessages(Array.isArray(saved.emailMessages) ? saved.emailMessages : [])
    const savedDriverMessages = Array.isArray(saved.driverMessages) ? saved.driverMessages : []
    const migratedDriverMessages = savedDriverMessages.flatMap((message) => {
      if (message.id !== 'marcus-intro') return [message]
      const baseMinute = Number.isFinite(message.receivedGameMinute) ? message.receivedGameMinute : savedNow
      return [
        { ...message, id: 'marcus-intro-1', body: 'Hey, Marcus here. Looks like we’re working together.', receivedGameMinute: baseMinute },
        { ...message, id: 'marcus-intro-2', body: 'I mostly run regional. Just keep the deadhead reasonable and keep me posted on where I’m going and when I need to be there.', receivedGameMinute: baseMinute + 0.01 },
        { ...message, id: 'marcus-intro-3', body: 'I’m in Brooklyn now and ready when you are.', receivedGameMinute: baseMinute + 0.02 },
      ]
    })
    setDriverMessages(migratedDriverMessages)
    setBusinessDocuments(Array.isArray(saved.businessDocuments) ? saved.businessDocuments : [])
    // Tutorial mechanics are dormant: existing saves migrate into the same open gameplay flow.
    setTutorialState({ enabled: false, completed: true })
    setDayLoop(saved.dayLoop ? { ...DEFAULT_DAY_LOOP_STATE, ...saved.dayLoop, history: Array.isArray(saved.dayLoop.history) ? saved.dayLoop.history : [] } : { ...DEFAULT_DAY_LOOP_STATE })
    setPlayerProgression(saved.playerProgression ? { ...DEFAULT_PLAYER_PROGRESSION, ...saved.playerProgression } : { ...DEFAULT_PLAYER_PROGRESSION })
    setResumeStage(saved.stage && saved.stage !== 'start' ? saved.stage : (saved.selectedMarket ? 'game' : 'market'))
  }

  const resetOperationState = () => {
    setSelectedMarket(null)
    setGameTime({ gameDayIndex: 0, totalMinutesOfDay: 420 })
    setLoads(seedLoads.map((load) => ({ ...load })))
    setDrivers([])
    setCarriers(seedCarriers.map((carrier) => ({ ...carrier })))
    setPlannedRoute(null)
    setIsGameClockPaused(true)
    setSimulationSpeed(1)
    setRuntimePositions({})
    setRuntimeProgress(null)
    setSeenLedgerReceivableIds([])
    setSeenLedgerPaymentReceivedIds([])
    setLedgerWorkflowByLoadId({})
    setCarrierApplicationsById({})
    setEmailMessages([])
    setDriverMessages([])
    setBusinessDocuments([])
    setTutorialState({ enabled: false, completed: true })
    setDayLoop({ ...DEFAULT_DAY_LOOP_STATE })
    setPlayerProgression({ ...DEFAULT_PLAYER_PROGRESSION })
  }

  useEffect(() => {
    const slots = getSaveSlots()
    const activeSlot = getActiveSaveSlot() || slots[0]?.id || SAVE_SLOT_IDS[0]
    setSaveSlots(slots)
    setActiveSaveSlotId(activeSlot)
    const saved = loadGame(activeSlot)
    setHasExistingOperation(slots.length > 0)
    if (saved) hydrateSavedOperation(saved)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || !activeSaveSlotId) return
    if (stage === 'start' && !hasExistingOperation) return
    const persistedStage = stage === 'start' && hasExistingOperation ? (resumeStage || 'game') : stage
    const timer = setTimeout(() => {
      saveGame({ stage: persistedStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgress, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, carrierApplicationsById, emailMessages, driverMessages, businessDocuments, tutorialState, dayLoop, playerProgression }, activeSaveSlotId)
      setSaveSlots(getSaveSlots())
    }, 700)
    return () => clearTimeout(timer)
  }, [hydrated, activeSaveSlotId, stage, hasExistingOperation, resumeStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgress, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, carrierApplicationsById, emailMessages, driverMessages, businessDocuments, tutorialState, dayLoop, playerProgression])

  // Market appointments are seeded directly; operation-day/tutorial gates do not rewrite them.


  // Freight market clock contract: an unaccepted load stops being actionable once
  // its pickup window has fully closed. Persist EXPIRED as real load state so list,
  // map, counts, save/resume, and History all agree instead of merely showing a
  // late/poor-fit badge.
  useEffect(() => {
    if (!hydrated || stage !== 'game' || dayLoop.phase !== 'operating') return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    setLoads((current) => {
      let changed = false
      const next = current.map((load) => {
        if (load.status !== 'available' || !Number.isFinite(load.pickupWindowEndMinutes)) return load
        const pickupDayIndex = Number.isFinite(load.pickupDayIndex)
          ? load.pickupDayIndex
          : gameTime.gameDayIndex
        if (!Number.isFinite(pickupDayIndex)) return load
        const pickupWindowEnd = pickupDayIndex * 1440 + load.pickupWindowEndMinutes
        if (now <= pickupWindowEnd) return load
        changed = true
        return {
          ...load,
          status: 'expired',
          tripStatus: 'expired',
          expiredGameMinute: now,
          assignedDriverId: null,
          candidateDriverId: null,
          queuePosition: null,
          driverFitVerified: false,
        }
      })
      return changed ? next : current
    })
  }, [hydrated, stage, dayLoop.phase, dayLoop.operationDay, gameTime.gameDayIndex, gameTime.totalMinutesOfDay])

  useEffect(() => {
    if (!hydrated || !tutorialState.enabled || tutorialState.completed) return
    // Tutorial pacing: DOC001/DOC002 payments arrive 30 game minutes after invoice send.
    // This also migrates tutorial saves created before the shorter payment window.
    setLedgerWorkflowByLoadId((current) => {
      let changed = false
      const next = { ...current }
      ;['DOC001', 'DOC002'].forEach((id) => {
        const workflow = current[id]
        if (workflow?.financialStatus !== 'AWAITING_PAYMENT' || !Number.isFinite(workflow.invoiceSentGameMinute)) return
        const tutorialPaymentMinute = workflow.invoiceSentGameMinute + 30
        if (!Number.isFinite(workflow.paymentAvailableGameMinute) || workflow.paymentAvailableGameMinute > tutorialPaymentMinute) {
          next[id] = { ...workflow, paymentAvailableGameMinute: tutorialPaymentMinute }
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [hydrated, tutorialState.enabled, tutorialState.completed])

  useEffect(() => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLedgerWorkflowByLoadId((current) => {
      let changed = false
      const next = { ...current }
      Object.entries(current).forEach(([id, workflow]) => { if (workflow.financialStatus === 'AWAITING_PAYMENT' && Number.isFinite(workflow.paymentAvailableGameMinute) && now >= workflow.paymentAvailableGameMinute) { next[id] = { ...workflow, financialStatus: 'PAID', paymentReceivedGameMinute: workflow.paymentAvailableGameMinute }; changed = true } })
      return changed ? next : current
    })
  }, [gameTime])

  // Final tutorial handoff: when DOC002 payment posts, stop time immediately so
  // the payment/closeout notification cannot fly past the player at 5x speed.
  useEffect(() => {
    if (!hydrated || !tutorialState.enabled || tutorialState.completed) return
    if (ledgerWorkflowByLoadId.DOC002?.financialStatus !== 'PAID') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSimulationSpeed(1)
  }, [hydrated, tutorialState.enabled, tutorialState.completed, ledgerWorkflowByLoadId.DOC002?.financialStatus])

  const applyDevPreset = async (name) => { try { const preset = await createDevPreset(name, { gameTime, currentLoads: loads, currentDrivers: drivers }); setStage(preset.stage); setSelectedMarket(preset.selectedMarket); setLoads([...preset.loads, ...loads.filter((load) => !preset.loads.some((item) => item.id === load.id)), ...seedLoads.filter((seed) => !preset.loads.some((item) => item.id === seed.id) && !loads.some((item) => item.id === seed.id))]); setDrivers(preset.drivers); if (preset.carriers) setCarriers(preset.carriers); setRuntimePositions(preset.runtimePositions); setRuntimeProgress(preset.runtimeProgress) } catch (error) { console.error('DEV preset route unavailable:', error) } }
  const applySelectedDevPreset = async (name, selectedLoadId) => { try { const preset = await createDevPreset(name, { gameTime, currentLoads: loads, currentDrivers: drivers, currentRuntimePositions: runtimePositions, currentCarriers: carriers, selectedLoadId }); setStage(preset.stage); setSelectedMarket(preset.selectedMarket); setLoads([...preset.loads, ...loads.filter((load) => !preset.loads.some((item) => item.id === load.id)), ...seedLoads.filter((seed) => !preset.loads.some((item) => item.id === seed.id) && !loads.some((item) => item.id === seed.id))]); setDrivers(preset.drivers); if (preset.carriers) setCarriers(preset.carriers); setRuntimePositions(preset.runtimePositions); setRuntimeProgress(preset.runtimeProgress) } catch (error) { console.error('DEV preset route unavailable:', error) } }
  void applyDevPreset
  const resumeSave = (slotId) => {
    const saved = loadGame(slotId)
    if (!saved) return
    setActiveSaveSlot(slotId)
    setActiveSaveSlotId(slotId)
    hydrateSavedOperation(saved)
    setHasExistingOperation(true)
    setStage(saved.stage && saved.stage !== 'start' ? saved.stage : (saved.selectedMarket ? 'game' : 'market'))
  }
  const startNewOperation = () => {
    const used = new Set(saveSlots.map((slot) => slot.id))
    const slotId = SAVE_SLOT_IDS.find((id) => !used.has(id))
    if (!slotId) return
    setActiveSaveSlot(slotId)
    setActiveSaveSlotId(slotId)
    resetOperationState()
    setHasExistingOperation(true)
    setResumeStage('market')
    setStage('market')
  }
  const deleteSaveSlot = (slotId) => {
    clearSave(slotId)
    const nextSlots = getSaveSlots()
    setSaveSlots(nextSlots)
    setHasExistingOperation(nextSlots.length > 0)

    if (activeSaveSlotId === slotId) {
      const nextSlotId = nextSlots[0]?.id || SAVE_SLOT_IDS[0]
      setActiveSaveSlot(nextSlotId)
      setActiveSaveSlotId(nextSlotId)
      const nextSaved = loadGame(nextSlotId)
      if (nextSaved) hydrateSavedOperation(nextSaved)
      else {
        resetOperationState()
        setResumeStage(null)
      }
    }
  }
  const resetGame = () => { clearSave(activeSaveSlotId); window.location.reload() }
  const activateCarrier = () => { const nextCarriers = carriers.map((carrier) => carrier.id === 'metroline' ? { ...carrier, status: 'active' } : carrier); setCarriers(nextCarriers); setDrivers((current) => reconcileActiveCarrierDrivers(current, nextCarriers)); const yard = mapLocations.find((location) => location.id === 'metroline-yard'); if (yard) setRuntimePositions((current) => ({ ...current, marcus: current.marcus || { longitude: yard.longitude, latitude: yard.latitude } })) }
  const applyCarrier = () => { const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay; setCarrierApplicationsById((current) => current.metroline ? current : { ...current, metroline: { status: 'PENDING', submittedGameMinute: now, responseGameMinute: now + 10 } }) }
  const acceptCarrierAgreement = () => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const signedBy = 'Authorized Dispatcher'
    setCarrierApplicationsById((current) => ({ ...current, metroline: { ...current.metroline, status: 'ACCEPTED', acceptedGameMinute: now } }))
    activateCarrier()
    setBusinessDocuments((current) => current.some((document) => document.id === 'metroline-dispatch-agreement') ? current : [...current, {
      id: 'metroline-dispatch-agreement',
      type: 'dispatch-agreement',
      title: 'Metroline Transport — Dispatch Operating Agreement',
      carrierId: 'metroline',
      carrierName: 'Metroline Transport',
      status: 'SIGNED',
      signedBy,
      signedGameMinute: now,
      goals: [
        'Book at least 2 loads.',
        'Target $2.00+ per loaded mile.',
        'Dry Van / General Freight.',
        'Preferred region: Northeast.',
        'Keep deadhead under 75 miles when possible.',
        'Protect pickup and delivery appointments.',
        'Keep the driver informed before dispatch.',
        'Consider where each load positions the truck next.',
        'Dispatch fee: 8% of carrier gross.',
      ],
      priorities: ['On-time service', 'Rate quality', 'Reasonable deadhead', 'Driver communication', 'Smart truck positioning'],
      acknowledgment: 'These are Metroline’s operating goals, not absolute rules. Freight markets change throughout the day. Use reasonable judgment when balancing carrier goals, driver preferences, appointment requirements, and available freight.',
    }])
    setDriverMessages((current) => current.some((message) => message.id === 'marcus-intro-1' || message.id === 'marcus-intro') ? current : [...current,
      {
        id: 'marcus-intro-1',
        driverId: 'marcus',
        sender: 'Marcus Reed',
        senderRole: 'Driver',
        direction: 'inbound',
        body: 'Hey, Marcus here. Looks like we’re working together.',
        receivedGameMinute: now,
        read: false,
      },
      {
        id: 'marcus-intro-2',
        driverId: 'marcus',
        sender: 'Marcus Reed',
        senderRole: 'Driver',
        direction: 'inbound',
        body: 'I mostly run regional. Just keep the deadhead reasonable and keep me posted on where I’m going and when I need to be there.',
        receivedGameMinute: now + 0.01,
        read: false,
      },
      {
        id: 'marcus-intro-3',
        driverId: 'marcus',
        sender: 'Marcus Reed',
        senderRole: 'Driver',
        direction: 'inbound',
        body: 'I’m in Brooklyn now and ready when you are.',
        receivedGameMinute: now + 0.02,
        read: false,
      },
    ])
  }

  useEffect(() => {
    if (!hydrated || stage !== 'game') return
    if (carrierApplicationsById.metroline || carriers.some((carrier) => carrier.id === 'metroline' && carrier.status === 'active')) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    setEmailMessages((current) => current.some((message) => message.id === 'mentor-welcome') ? current : [...current, {
      id: 'mentor-welcome',
      type: 'mentor',
      templateId: 'mentor-welcome',
      receivedGameMinute: now,
      read: false,
    }])
  }, [hydrated, stage, gameTime, carrierApplicationsById, carriers])

  useEffect(() => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    Object.entries(carrierApplicationsById).forEach(([carrierId, application]) => {
      if (application.status === 'PENDING' && now >= application.responseGameMinute) {
        setCarrierApplicationsById((current) => ({ ...current, [carrierId]: { ...current[carrierId], status: 'OFFER_RECEIVED' } }))
        setEmailMessages((current) => current.some((message) => message.id === `${carrierId}-application-approved`) ? current : [...current, {
          id: `${carrierId}-application-approved`,
          type: 'carrier-application-offer',
          carrierId,
          senderOverride: 'CarrierSource',
          subject: 'Metroline Transport — Application Approved',
          bodyOverride: 'Hello,\n\nYour dispatch service application for Metroline Transport has been approved.\n\nReview the attached operating agreement before adding Metroline to your active carrier roster. It covers the carrier’s shift goals, operating expectations, and dispatch priorities.\n\nOnce accepted, Metroline Transport and its assigned driver will become available in your operation.\n\nCarrierSource\nCarrier Network Services',
          receivedGameMinute: application.responseGameMinute,
          read: false,
        }])
        if (tutorialState.enabled && !tutorialState.completed && carrierId === 'metroline') {
          setSimulationSpeed(1)
        }
      }
    })
  }, [gameTime, carrierApplicationsById, tutorialState.enabled, tutorialState.completed])

  useEffect(() => {
    if (!hydrated || !tutorialState.enabled || tutorialState.completed) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const metrolineAccepted = carrierApplicationsById.metroline?.status === 'ACCEPTED' && carriers.some((carrier) => carrier.id === 'metroline' && carrier.status === 'active')
    const doc001 = loads.find((load) => load.id === 'DOC001')
    const doc002Paid = getReceivables(loads, carriers, ledgerWorkflowByLoadId).some((item) => item.loadId === 'DOC002' && item.financialStatus === 'PAID')
    const doc002PaymentReviewed = seenLedgerPaymentReceivedIds.includes('DOC002')
    const triggers = [
      ['mentor-welcome', stage === 'game' && !carrierApplicationsById.metroline],
      ['mentor-first-carrier', metrolineAccepted],
      ['mentor-round-two', ledgerWorkflowByLoadId.DOC001?.financialStatus === 'AWAITING_PAYMENT'],
      ['mentor-tutorial-complete', doc002Paid && doc002PaymentReviewed]
    ]
    const missing = triggers.find(([id, condition]) => condition && !emailMessages.some((message) => message.id === id))
    if (!missing) return
    const [id] = missing
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmailMessages((current) => current.some((message) => message.id === id) ? current : [...current, { id, type: 'mentor', templateId: id, receivedGameMinute: now, read: false }])
    void doc001
  }, [hydrated, tutorialState, stage, gameTime, carrierApplicationsById, carriers, loads, ledgerWorkflowByLoadId, emailMessages, seenLedgerPaymentReceivedIds])

  useEffect(() => {
    if (!tutorialState.enabled || tutorialState.completed) return
    const completionEmail = emailMessages.find((message) => message.id === 'mentor-tutorial-complete')
    if (completionEmail?.read) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTutorialState((current) => ({ ...current, completed: true }))
    }
  }, [tutorialState, emailMessages])

  // Legacy DOC001/DOC002 tutorial closeout communication is intentionally disabled in Communications V1.


  useEffect(() => {
    const load = loads.find((item) => item.assignedDriverId && ['en-route-pickup', 'en-route-delivery'].includes(item.tripStatus)) || getDriverActiveLoad(loads, 'marcus') || loads.find((item) => item.assignedDriverId && item.tripStatus !== 'queued') || {}
    const route = load.tripStatus === 'en-route-delivery' ? load.plannedLoadedRouteGeometry : load.tripStatus === 'en-route-pickup' ? load.plannedDeadheadRouteGeometry : load.plannedLoadedRouteGeometry || load.plannedDeadheadRouteGeometry
    const activeTravelLeg = load.tripStatus === 'en-route-delivery' ? 'loaded' : load.tripStatus === 'en-route-pickup' ? 'deadhead' : null
    const panel = getMarcusPanelModel({ assignedLoad: load, gameTime, runtimeProgress, pickup: mapLocations.find((item) => item.id === load.pickupLocationId), delivery: mapLocations.find((item) => item.id === load.deliveryLocationId) })
    const hasActiveAcceptedLoad = Boolean(load.assignedDriverId) && !['delivered', 'completed'].includes(load.tripStatus)
    const pickupFinished = ['loaded', 'en-route-delivery', 'at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'].includes(load.tripStatus)
    const loadFinished = ['delivered', 'completed'].includes(load.tripStatus)
    logDocOsState({ tripStatus: load.tripStatus, planningStatus: load.planningStatus, deliveryPlanningStatus: load.deliveryPlanningStatus, activeTravelLeg, driverOperationalState: panel?.operationalState, panelAction: panel?.actionType, candidateDriverId: load.candidateDriverId, assignedDriverId: load.assignedDriverId, hasActiveAcceptedLoad, showPickupMarker: hasActiveAcceptedLoad && !pickupFinished, showDeliveryMarker: hasActiveAcceptedLoad && !loadFinished, candidateDeadhead: `${load.candidateDeadheadRouteGeometry?.length || 0} coordinates`, plannedDeadhead: `${load.plannedDeadheadRouteGeometry?.length || 0} coordinates`, candidateLoaded: `${load.candidateLoadedRouteGeometry?.length || 0} coordinates`, plannedLoaded: `${load.plannedLoadedRouteGeometry?.length || 0} coordinates`, activeRoute: route === load.plannedLoadedRouteGeometry ? 'plannedLoaded' : route === load.plannedDeadheadRouteGeometry ? 'plannedDeadhead' : 'none', activeRouteCoordinates: route?.length || 0, MarcusPosition: runtimePositions.marcus })
  }, [loads, runtimePositions])

  useEffect(() => {
    // Only the driver's promoted active load is allowed to own movement.
    // A queued/stale load must never steal Marcus and pull him toward its delivery.
    const load = getDriverActiveLoad(loads, 'marcus')
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
    setRuntimePositions((current) => ({ ...current, [load.assignedDriverId]: progress >= 1 && destination ? { longitude: destination.longitude, latitude: destination.latitude } : { longitude: a[0] + (b[0] - a[0]) * local, latitude: a[1] + (b[1] - a[1]) * local } }))
    if (progress >= 1) { const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay; setLoads((current) => current.map((item) => item.id === load.id ? { ...item, tripStatus: delivery ? 'at-delivery' : 'at-pickup', ...(delivery ? { deliveryArrivalGameMinute: item.deliveryArrivalGameMinute ?? now } : {}) } : item)) }
  }, [gameTime, loads])

  useEffect(() => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    // Advance operational pickup phases from the authoritative game clock.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoads((current) => current.map((load) => {
      if (load.tripStatus === 'at-pickup') return {
        ...load,
        tripStatus: 'checking-in-pickup',
        pickupArrivalGameMinute: Number.isFinite(load.pickupArrivalGameMinute) ? load.pickupArrivalGameMinute : now,
        pickupCheckInStartGameMinute: now,
      }
      if (load.tripStatus === 'checking-in-pickup' && Number.isFinite(load.pickupCheckInStartGameMinute) && now - load.pickupCheckInStartGameMinute >= PICKUP_CHECKIN_MINUTES) {
        const pickupCheckInGameMinute = now
        return {
          ...load,
          tripStatus: 'waiting-at-pickup',
          pickupCheckInGameMinute,
          pickupDockReadyGameMinute: pickupCheckInGameMinute + getPickupDockWaitMinutes(load, pickupCheckInGameMinute),
        }
      }
      if (load.tripStatus === 'waiting-at-pickup' && Number.isFinite(load.pickupDockReadyGameMinute) && now >= load.pickupDockReadyGameMinute) {
        return { ...load, tripStatus: 'checked-in-pickup' }
      }
      if (load.tripStatus === 'loading-at-pickup' && now - load.loadingStartGameMinute >= PICKUP_LOADING_MINUTES) return { ...load, tripStatus: 'loaded', deliveryPlanningStatus: null, plannedLoadedRouteGeometry: null, plannedLoadedMiles: null, plannedLoadedDriveTimeMinutes: null, selectedLoadedRouteId: null }
      if (load.tripStatus === 'checked-in-delivery') return { ...load, tripStatus: 'unloading-delivery', deliveryUnloadStartGameMinute: now }
      if (load.tripStatus === 'unloading-delivery' && now - load.deliveryUnloadStartGameMinute >= DELIVERY_UNLOAD_DURATION_MINUTES) return { ...load, tripStatus: 'awaiting-pod', pod: { status: 'complete', receivedGameMinute: now, viewedGameMinute: null, signedBy: 'Jordan Rivera', piecesExpected: 12, piecesReceived: 12, damage: 'None', verification: { signature: false, pieceCount: false, damage: false, deliveryInfo: false }, verified: false, verifiedGameMinute: null } }
      return load
    }))
  }, [gameTime])

  // Recovery path for legacy saves/dev states that still enter the old
  // intermediate `delivered` state. Normal POD approval now closes out
  // atomically through approvePodAndCloseout().
  useEffect(() => {
    const completed = loads.find((load) => load.tripStatus === 'delivered' && load.assignedDriverId)
    if (!completed) return
    const delivery = mapLocations.find((location) => location.id === completed.deliveryLocationId)
    if (!delivery) return

    const driverId = completed.assignedDriverId
    const queuedBeforePromotion = getDriverQueue(loads, driverId)
    const nextQueued = queuedBeforePromotion[0] || null

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoads((current) => {
      const closed = current.map((load) => load.id === completed.id && load.tripStatus === 'delivered'
        ? { ...load, tripStatus: 'completed', status: 'completed', completedDriverId: driverId, assignedDriverId: null, queuePosition: null, completedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay, completedOperationDay: dayLoop.operationDay }
        : load)
      return promoteNextQueuedLoad(closed, driverId).loads
    })

    setDrivers((current) => current.map((driver) => driver.id === driverId
      ? {
          ...driver,
          status: nextQueued ? 'unavailable' : 'available',
          assignedLoadId: nextQueued?.id || null,
          queuedLoadIds: (driver.queuedLoadIds || []).filter((id) => id !== nextQueued?.id),
          longitude: delivery.longitude,
          latitude: delivery.latitude,
          lastKnownLocationId: completed.deliveryLocationId,
          idleSinceGameMinute: nextQueued ? null : gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay,
          idleTargetLocationId: nextQueued ? null : getIdleTargetLocationId(completed.deliveryLocationId),
          idleRouteStatus: nextQueued ? null : 'dwell',
          idleRouteGeometry: null,
          idleRouteStartGameMinute: null,
          idleRouteDurationMinutes: null,
        }
      : driver))

    // The driver's physical position survives load closeout. The next load must
    // deadhead from the previous receiver, never from a new load's pickup/delivery
    // marker or from the original carrier yard. Keep runtime position authoritative.
    setRuntimePositions((current) => ({
      ...current,
      [driverId]: { longitude: delivery.longitude, latitude: delivery.latitude },
    }))
    setRuntimeProgress(null)
  }, [loads, gameTime, dayLoop.operationDay])


  // Dynamic Driver Positioning v1: an idle driver does not freeze forever at the
  // receiver. After a short post-delivery dwell, Marcus heads toward a sensible
  // staging/fuel/yard location. The live runtime position remains authoritative,
  // so FreightLink fit and the next trip plan use where he actually is.
  useEffect(() => {
    if (!hydrated || stage !== 'game' || dayLoop.phase !== 'operating') return undefined
    const marcus = drivers.find((driver) => driver.id === 'marcus')
    if (!marcus || getDriverActiveLoad(loads, 'marcus')) return undefined
    if (marcus.idleRouteStatus !== 'dwell' || !Number.isFinite(marcus.idleSinceGameMinute) || !marcus.idleTargetLocationId) return undefined
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (now - marcus.idleSinceGameMinute < IDLE_DWELL_MINUTES) return undefined
    const origin = runtimePositions.marcus
    const target = mapLocations.find((location) => location.id === marcus.idleTargetLocationId)
    if (!origin || !target) return undefined

    setDrivers((current) => current.map((driver) => driver.id === 'marcus' && driver.idleRouteStatus === 'dwell'
      ? { ...driver, idleRouteStatus: 'calculating' }
      : driver))
    calculateRoute(origin, target).then((route) => {
      setDrivers((current) => current.map((driver) => driver.id === 'marcus' && driver.idleRouteStatus === 'calculating'
        ? {
            ...driver,
            idleRouteStatus: 'traveling',
            idleRouteGeometry: route.routeShape,
            idleRouteStartGameMinute: now,
            idleRouteDurationMinutes: Math.max(1, route.durationMinutes),
          }
        : driver))
    }).catch((error) => {
      console.error('Idle positioning route unavailable:', error)
      setDrivers((current) => current.map((driver) => driver.id === 'marcus' && driver.idleRouteStatus === 'calculating'
        ? { ...driver, idleRouteStatus: 'route-unavailable' }
        : driver))
    })
  }, [hydrated, stage, dayLoop.phase, drivers, loads, gameTime, runtimePositions.marcus])

  useEffect(() => {
    const marcus = drivers.find((driver) => driver.id === 'marcus')
    if (!marcus || marcus.idleRouteStatus !== 'traveling' || getDriverActiveLoad(loads, 'marcus')) return
    if (!Array.isArray(marcus.idleRouteGeometry) || marcus.idleRouteGeometry.length < 2 || !Number.isFinite(marcus.idleRouteStartGameMinute) || !Number.isFinite(marcus.idleRouteDurationMinutes)) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const progress = Math.max(0, Math.min(1, (now - marcus.idleRouteStartGameMinute) / marcus.idleRouteDurationMinutes))
    const position = pointAlongRoute(marcus.idleRouteGeometry, progress)
    if (position) setRuntimePositions((current) => ({ ...current, marcus: position }))
    if (progress < 1) return
    const target = mapLocations.find((location) => location.id === marcus.idleTargetLocationId)
    if (target) setRuntimePositions((current) => ({ ...current, marcus: { longitude: target.longitude, latitude: target.latitude } }))
    setDrivers((current) => current.map((driver) => driver.id === 'marcus'
      ? {
          ...driver,
          idleRouteStatus: 'arrived',
          lastKnownLocationId: driver.idleTargetLocationId,
          longitude: target?.longitude ?? driver.longitude,
          latitude: target?.latitude ?? driver.latitude,
        }
      : driver))
  }, [gameTime, drivers, loads])

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


  const awardLoadXp = (loadId, amount) => {
    setPlayerProgression((current) => {
      const awardedLoadXpIds = Array.isArray(current.awardedLoadXpIds) ? current.awardedLoadXpIds : []
      if (awardedLoadXpIds.includes(loadId)) return current
      return { ...current, xp: Number(current.xp || 0) + Number(amount || 0), awardedLoadXpIds: [...awardedLoadXpIds, loadId] }
    })
  }

  const closeOperationDay = () => {
    const receivables = getReceivables(loads, carriers, ledgerWorkflowByLoadId)
    const closeStatus = getEndDayStatus(loads, receivables)
    if (!closeStatus.canEnd || dayLoop.phase !== 'operating') return

    const report = createDayReport({
      operationDay: dayLoop.operationDay,
      currentStartGameDayIndex: dayLoop.currentStartGameDayIndex,
      gameTime,
      loads,
      receivables,
    })

    setIsGameClockPaused(true)
    setSimulationSpeed(1)
    setLoads((current) => current.map((load) => load.tripStatus === 'completed' && !Number.isFinite(load.completedOperationDay)
      ? { ...load, completedOperationDay: dayLoop.operationDay }
      : load))
    setPlayerProgression((current) => ({
      ...current,
      xp: Number(current.xp || 0),
      reputation: Number(current.reputation || 0) + report.reputationChange,
    }))
    setDayLoop((current) => ({
      ...current,
      phase: 'results',
      report,
      history: [...(current.history || []), report],
    }))
  }

  const continueToNextDayBriefing = () => {
    if (!dayLoop.report || dayLoop.phase !== 'results') return
    setDayLoop((current) => ({ ...current, phase: 'briefing' }))
  }

  const beginNextOperationDay = () => {
    const report = dayLoop.report
    if (!report || dayLoop.phase !== 'briefing') return
    const nextOperationDay = dayLoop.operationDay + 1
    setGameTime({ gameDayIndex: report.nextStartGameDayIndex, totalMinutesOfDay: report.nextStartMinutes })
    setDayLoop((current) => ({
      ...current,
      operationDay: nextOperationDay,
      phase: 'operating',
      currentStartGameDayIndex: report.nextStartGameDayIndex,
      report: null,
    }))
    setTutorialState((current) => ({ ...current, enabled: false, completed: true }))
    // No special Day-2 freight reset or mentor unlock. The market continues from its
    // own posting/expiration state across operation days.
    setSimulationSpeed(1)
    setIsGameClockPaused(false)
  }

  return (
    <main className="app">
      <section className="phone-shell">
        {stage !== 'game' && <EntryLiveMap stage={stage} selectedMarket={selectedMarket} />}
        {stage === 'start' && (
          <StartScreen
            saveSlots={saveSlots}
            activeSaveSlotId={activeSaveSlotId}
            onResumeSave={resumeSave}
            onDeleteSave={deleteSaveSlot}
            onStartNew={startNewOperation}
          />
        )}
        {stage === 'market' && (
          <MarketSelectionScreen
            selectedMarket={selectedMarket}
            onSelectMarket={() => setSelectedMarket('new-york')}
            onBack={() => { setSelectedMarket(null); setStage('start') }}
            onConfirm={() => { setHasExistingOperation(true); setResumeStage('game'); setIsGameClockPaused(false); setStage('game') }}
          />
        )}
        {stage === 'game' && (
          <MainGameScreen
            selectedMarket={selectedMarket}
            gameTime={gameTime}
            setGameTime={setGameTime}
            loads={loads}
            setLoads={setLoads}
            drivers={drivers}
            carriers={carriers}
            onActivateCarrier={activateCarrier}
            carrierApplicationsById={carrierApplicationsById}
            onApplyCarrier={applyCarrier}
            onAcceptAgreement={acceptCarrierAgreement}
            onApprovePod={approvePodAndCloseout}
            emailMessages={emailMessages}
            driverMessages={driverMessages}
            setDriverMessages={setDriverMessages}
            businessDocuments={businessDocuments}
            tutorialEnabled={tutorialState.enabled && !tutorialState.completed}
            operationDay={dayLoop.operationDay}
            dayLoopPhase={dayLoop.phase}
            dayReport={dayLoop.report}
            playerProgression={playerProgression}
            onAwardLoadXp={awardLoadXp}
            onEndDay={closeOperationDay}
            onContinueDay={continueToNextDayBriefing}
            onBeginOperations={beginNextOperationDay}
            setEmailMessages={setEmailMessages}
            setDrivers={setDrivers}
            plannedRoute={plannedRoute}
            setPlannedRoute={setPlannedRoute}
            isGameClockPaused={isGameClockPaused}
            setGameClockPaused={setIsGameClockPaused}
            runtimePositions={runtimePositions}
            runtimeProgress={runtimeProgress}
            setRuntimeProgress={setRuntimeProgress}
            simulationSpeed={simulationSpeed}
            setSimulationSpeed={setSimulationSpeed}
            onOpenMarkets={() => setStage('market')}
            onApplyDevPreset={applySelectedDevPreset}
            onResetGame={resetGame}
            seenLedgerReceivableIds={seenLedgerReceivableIds}
            onOpenLedger={() => { const records = getReceivables(loads, carriers, ledgerWorkflowByLoadId); setSeenLedgerReceivableIds((current) => Array.from(new Set([...current, ...records.map((item) => item.loadId)]))); setSeenLedgerPaymentReceivedIds((current) => Array.from(new Set([...current, ...records.filter((item) => item.financialStatus === 'PAID').map((item) => item.loadId)]))) }}
            ledgerWorkflowByLoadId={ledgerWorkflowByLoadId}
            setLedgerWorkflowByLoadId={setLedgerWorkflowByLoadId}
            seenLedgerPaymentReadyIds={seenLedgerPaymentReceivedIds}
          />
        )}
      </section>
    </main>
  )
}

export default App
