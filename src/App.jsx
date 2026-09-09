import { useEffect, useRef, useState } from 'react'
import './App.css'
import seedLoads from './data/loads.js'
import seedCarriers from './data/carriers.js'
import seedDrivers from './data/drivers.js'
import mapLocations from './data/mapLocations.js'
import { DELIVERY_CHECKIN_MINUTES, PICKUP_CHECKIN_MINUTES, getDeliveryDockWaitMinutes, getPickupDockWaitMinutes } from './data/pickupConfig.js'
import { logDocOsState } from './utils/debugLogger.js'
import { getDriverPanelModel } from './utils/driverOperationalState.js'
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

function reconcileDriverRuntimeState(driver, activeLoad, savedPosition, now) {
  if (!driver) return { position: savedPosition || null, progress: null }
  if (!activeLoad) {
    const fallback = mapLocations.find((location) => location.id === (driver.lastKnownLocationId || driver.homeBaseLocationId))
    return { position: savedPosition || (fallback ? { longitude: fallback.longitude, latitude: fallback.latitude } : null), progress: null }
  }

  const isPickupTravel = activeLoad.tripStatus === 'en-route-pickup'
  const isDeliveryTravel = activeLoad.tripStatus === 'en-route-delivery'
  const route = isPickupTravel ? activeLoad.plannedDeadheadRouteGeometry : isDeliveryTravel ? activeLoad.plannedLoadedRouteGeometry : null
  const departure = isPickupTravel ? activeLoad.departureGameMinute : isDeliveryTravel ? activeLoad.deliveryDepartureGameMinute : null
  const duration = isPickupTravel ? activeLoad.plannedDeadheadDriveTimeMinutes : isDeliveryTravel ? activeLoad.plannedLoadedDriveTimeMinutes : null

  if (Array.isArray(route) && route.length >= 2 && Number.isFinite(departure) && Number.isFinite(duration) && duration > 0) {
    const progress = Math.max(0, Math.min(1, (now - departure) / duration))
    const position = pointAlongRoute(route, progress)
    if (position) return { position, progress }
  }

  const pickupStates = new Set(['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'])
  const deliveryStates = new Set(['at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod'])
  const facilityId = pickupStates.has(activeLoad.tripStatus) ? activeLoad.pickupLocationId : deliveryStates.has(activeLoad.tripStatus) ? activeLoad.deliveryLocationId : null
  const facility = facilityId ? mapLocations.find((location) => location.id === facilityId) : null
  if (facility) return { position: { longitude: facility.longitude, latitude: facility.latitude }, progress: null }

  const fallback = mapLocations.find((location) => location.id === (driver.lastKnownLocationId || driver.homeBaseLocationId))
  return { position: savedPosition || (fallback ? { longitude: fallback.longitude, latitude: fallback.latitude } : null), progress: null }
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
  const [runtimeProgressByDriver, setRuntimeProgressByDriver] = useState({})
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
  const [dayLoop, setDayLoop] = useState(() => ({ ...DEFAULT_DAY_LOOP_STATE }))
  const [playerProgression, setPlayerProgression] = useState(() => ({ ...DEFAULT_PLAYER_PROGRESSION }))
  const [saveSlots, setSaveSlots] = useState([])
  const [activeSaveSlotId, setActiveSaveSlotId] = useState(null)
  const lifecycleSaveSignatureRef = useRef('')

  const approvePodAndCloseout = (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load || load.tripStatus !== 'awaiting-pod' || !load.pod?.verified || !load.assignedDriverId) return false
    const recordPieces = Number.isFinite(Number(load.pod?.freightCondition?.loadedAtPickup)) ? Number(load.pod.freightCondition.loadedAtPickup) : Number(load.pod.piecesReceived)
    const recordDamageCount = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
    const recordDamage = recordDamageCount > 0 ? `${recordDamageCount} pallet${recordDamageCount === 1 ? '' : 's'} noted` : 'None'
    if (Number(load.pod.piecesReceived) !== Number(recordPieces) || String(load.pod.damage || '').trim() !== recordDamage) return false

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
    setRuntimeProgressByDriver((current) => ({ ...current, [driverId]: null }))
    return true
  }

  const mergeSavedLoads = (savedLoads = []) => [
    ...savedLoads.map((load) => {
      const seed = seedLoads.find((item) => item.id === load.id)
      if (!seed) return load
      const merged = { ...seed, ...load }
      if (seed.loadNumber) merged.loadNumber = seed.loadNumber
      // Unified market-flow migration: progression/operation-day gates never control freight visibility.
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
    const hydratedCarriers = (saved.carriers ?? seedCarriers).map((carrier) => {
      const seed = seedCarriers.find((item) => item.id === carrier.id)
      return seed ? { ...seed, ...carrier, dispatchAgreement: { ...(seed.dispatchAgreement || {}), ...(carrier.dispatchAgreement || {}) } } : carrier
    })
    let hydratedLoads = mergeSavedLoads(saved.loads ?? [])
    const savedNow = (saved.gameTime?.gameDayIndex ?? 0) * 1440 + (saved.gameTime?.totalMinutesOfDay ?? 420)
    hydratedLoads = hydratedLoads.map((load) => {
      if (load.tripStatus === 'at-delivery' && !Number.isFinite(load.deliveryArrivalGameMinute)) return { ...load, deliveryArrivalGameMinute: savedNow }
      if (load.tripStatus === 'waiting-at-delivery') {
        const deliveryArrivalGameMinute = Number.isFinite(load.deliveryArrivalGameMinute) ? load.deliveryArrivalGameMinute : savedNow
        const deliveryCheckInGameMinute = Number.isFinite(load.deliveryCheckInGameMinute) ? load.deliveryCheckInGameMinute : savedNow
        const deliveryDockReadyGameMinute = deliveryCheckInGameMinute + getDeliveryDockWaitMinutes(load, deliveryCheckInGameMinute)
        return { ...load, deliveryArrivalGameMinute, deliveryCheckInGameMinute, deliveryDockReadyGameMinute }
      }
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
    const nextRuntimeProgress = {}
    hydratedDrivers.forEach((driver) => {
      const activeLoad = getDriverActiveLoad(hydratedLoads, driver.id)
      const reconciled = reconcileDriverRuntimeState(driver, activeLoad, nextPositions[driver.id], savedNow)
      if (reconciled.position) nextPositions[driver.id] = reconciled.position
      if (Number.isFinite(reconciled.progress)) nextRuntimeProgress[driver.id] = reconciled.progress
    })

    setSelectedMarket(saved.selectedMarket ?? null)
    setGameTime(saved.gameTime ?? { gameDayIndex: 0, totalMinutesOfDay: 420 })
    setLoads(hydratedLoads)
    setDrivers(hydratedDrivers)
    setCarriers(hydratedCarriers)
    setRuntimePositions(nextPositions)
    setRuntimeProgressByDriver(nextRuntimeProgress)
    setSeenLedgerReceivableIds(Array.isArray(saved.seenLedgerReceivableIds) ? saved.seenLedgerReceivableIds : [])
    setSeenLedgerPaymentReceivedIds(Array.isArray(saved.seenLedgerPaymentReceivedIds) ? saved.seenLedgerPaymentReceivedIds : [])
    setLedgerWorkflowByLoadId(saved.ledgerWorkflowByLoadId || {})
    setCarrierApplicationsById(saved.carrierApplicationsById || {})
    setEmailMessages(Array.isArray(saved.emailMessages) ? saved.emailMessages.filter((message) => !message.templateId) : [])
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
    setRuntimeProgressByDriver({})
    setSeenLedgerReceivableIds([])
    setSeenLedgerPaymentReceivedIds([])
    setLedgerWorkflowByLoadId({})
    setCarrierApplicationsById({})
    setEmailMessages([])
    setDriverMessages([])
    setBusinessDocuments([])
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
      saveGame({ stage: persistedStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, carrierApplicationsById, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression }, activeSaveSlotId)
      setSaveSlots(getSaveSlots())
    }, 700)
    return () => clearTimeout(timer)
  }, [hydrated, activeSaveSlotId, stage, hasExistingOperation, resumeStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, carrierApplicationsById, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression])

  // AV lifecycle persistence: critical operational boundaries flush immediately.
  // Routine animation/clock changes still use the normal debounce above.
  useEffect(() => {
    if (!hydrated || !activeSaveSlotId || (stage === 'start' && !hasExistingOperation)) return
    const signature = loads
      .filter((load) => load.assignedDriverId || ['accepted', 'assigned', 'queued', 'completed'].includes(load.status))
      .map((load) => `${load.id}:${load.assignedDriverId || load.completedDriverId || '-'}:${load.status}:${load.tripStatus}:${load.planningStatus || '-'}:${load.deliveryPlanningStatus || '-'}:${load.pod?.approved ? 'pod-approved' : '-'}`)
      .sort()
      .join('|')
    if (!signature || signature === lifecycleSaveSignatureRef.current) return
    lifecycleSaveSignatureRef.current = signature
    const persistedStage = stage === 'start' && hasExistingOperation ? (resumeStage || 'game') : stage
    saveGame({ stage: persistedStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, carrierApplicationsById, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression }, activeSaveSlotId)
  }, [hydrated, activeSaveSlotId, stage, hasExistingOperation, resumeStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, carrierApplicationsById, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression])

  // AU3 mobile persistence hardening: keep the normal debounce for routine
  // updates, but flush the current snapshot immediately when iOS backgrounds
  // or unloads the web view. This closes the common sub-second lifecycle gap.
  useEffect(() => {
    if (!hydrated || !activeSaveSlotId) return undefined
    const flushSave = () => {
      const persistedStage = stage === 'start' && hasExistingOperation ? (resumeStage || 'game') : stage
      saveGame({ stage: persistedStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, carrierApplicationsById, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression }, activeSaveSlotId)
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushSave() }
    window.addEventListener('pagehide', flushSave)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flushSave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [hydrated, activeSaveSlotId, stage, hasExistingOperation, resumeStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, carrierApplicationsById, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression])

  // Market appointments are seeded directly; operation-day gates do not rewrite them.


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
    if (!hydrated || stage !== 'game') return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const pending = emailMessages.find((message) => message.direction === 'outbound'
      && message.workflowType && message.workflowType !== 'general'
      && Number.isFinite(message.responseGameMinute)
      && now >= message.responseGameMinute
      && !emailMessages.some((entry) => entry.replyToEmailId === message.id))
    if (!pending) return

    const load = loads.find((item) => item.id === pending.loadId)
    const loadNumber = load?.loadNumber || pending.loadId || 'load'
    let senderOverride = 'Metroline Transport'
    let subject = `Re: ${pending.subject || loadNumber}`
    let bodyOverride = 'Received. Thank you.'
    let attachments = []

    if (pending.workflowType === 'carrier-approval') {
      senderOverride = 'Metroline Transport · Operations'
      if (pending.workflowValid) {
        bodyOverride = `Approved. Go ahead and book ${loadNumber}. Keep us posted if the schedule or rate changes.`
        setLoads((current) => current.map((item) => item.id === pending.loadId ? { ...item, carrierApprovalStatus: 'APPROVED', carrierApprovedGameMinute: now } : item))
      } else {
        bodyOverride = `We can’t approve ${loadNumber} yet. Please resend the request to Operations with the FreightLink load offer attached.`
        setLoads((current) => current.map((item) => item.id === pending.loadId ? { ...item, carrierApprovalStatus: 'NEEDS_INFO' } : item))
      }
    }

    if (pending.workflowType === 'pod-correction') {
      senderOverride = 'Metroline Transport · Documentation'
      if (pending.workflowValid && load?.pod) {
        const piecesReceived = Number.isFinite(Number(load.pod.freightCondition?.loadedAtPickup)) ? Number(load.pod.freightCondition.loadedAtPickup) : Number(load.pod.piecesReceived)
        const damaged = Number(load.pod.freightCondition?.damagedAtPickup || 0)
        const damage = damaged > 0 ? `${damaged} pallet${damaged === 1 ? '' : 's'} noted` : 'None'
        bodyOverride = `Corrected POD for ${loadNumber} is attached. Piece count and freight condition now match the delivery record.`
        attachments = [{ id: `corrected-pod:${pending.loadId}`, type: 'pod', title: `Corrected POD · ${loadNumber}`, meta: 'Corrected copy', loadId: pending.loadId }]
        setLoads((current) => current.map((item) => item.id === pending.loadId && item.pod ? { ...item, pod: { ...item.pod, piecesReceived, damage, correctionStatus: 'CORRECTED', correctedGameMinute: now, verification: { signature: false, pieceCount: false, damage: false, deliveryInfo: false }, verified: false, verifiedGameMinute: null } } : item))
      } else {
        bodyOverride = `We need the current POD and supporting exception report before we can issue a correction for ${loadNumber}. Please resend to Documentation with both attached.`
        setLoads((current) => current.map((item) => item.id === pending.loadId && item.pod ? { ...item, pod: { ...item.pod, correctionStatus: 'NEEDS_INFO' } } : item))
      }
    }

    if (pending.workflowType === 'invoice-submission') {
      senderOverride = 'Metroline Transport · Accounting'
      if (pending.workflowValid) {
        bodyOverride = `Invoice received for ${loadNumber} with supporting POD. Payment terms are active.`
      } else {
        bodyOverride = `We can’t process this invoice yet. Please resend to Accounting with the invoice and signed POD attached.`
        setLedgerWorkflowByLoadId((current) => ({ ...current, [pending.loadId]: { ...(current[pending.loadId] || {}), financialStatus: 'DRAFT', invoiceSentGameMinute: null, paymentAvailableGameMinute: null, submissionStatus: 'DOCUMENTATION_REQUIRED' } }))
      }
    }

    setEmailMessages((current) => current.some((entry) => entry.replyToEmailId === pending.id) ? current : [...current, {
      id: `email-reply-${pending.id}`,
      type: 'operational-email-reply',
      direction: 'inbound',
      senderOverride,
      carrierId: pending.carrierId || 'metroline',
      subject,
      bodyOverride,
      attachments,
      loadId: pending.loadId,
      replyToEmailId: pending.id,
      receivedGameMinute: now,
      read: false,
    }])
  }, [hydrated, stage, gameTime, emailMessages, loads])


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


  const applyDevPreset = async (name) => { try { const preset = await createDevPreset(name, { gameTime, currentLoads: loads, currentDrivers: drivers }); setStage(preset.stage); setSelectedMarket(preset.selectedMarket); setLoads([...preset.loads, ...loads.filter((load) => !preset.loads.some((item) => item.id === load.id)), ...seedLoads.filter((seed) => !preset.loads.some((item) => item.id === seed.id) && !loads.some((item) => item.id === seed.id))]); setDrivers(preset.drivers); if (preset.carriers) setCarriers(preset.carriers); setRuntimePositions(preset.runtimePositions); setRuntimeProgressByDriver(preset.runtimeProgressByDriver || (Number.isFinite(preset.runtimeProgress) ? { marcus: preset.runtimeProgress } : {})) } catch (error) { console.error('DEV preset route unavailable:', error) } }
  const applySelectedDevPreset = async (name, selectedLoadId) => { try { const preset = await createDevPreset(name, { gameTime, currentLoads: loads, currentDrivers: drivers, currentRuntimePositions: runtimePositions, currentCarriers: carriers, selectedLoadId }); setStage(preset.stage); setSelectedMarket(preset.selectedMarket); setLoads([...preset.loads, ...loads.filter((load) => !preset.loads.some((item) => item.id === load.id)), ...seedLoads.filter((seed) => !preset.loads.some((item) => item.id === seed.id) && !loads.some((item) => item.id === seed.id))]); setDrivers(preset.drivers); if (preset.carriers) setCarriers(preset.carriers); setRuntimePositions(preset.runtimePositions); setRuntimeProgressByDriver(preset.runtimeProgressByDriver || (Number.isFinite(preset.runtimeProgress) ? { marcus: preset.runtimeProgress } : {})) } catch (error) { console.error('DEV preset route unavailable:', error) } }
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
  const activateCarrier = () => {
    const nextCarriers = carriers.map((carrier) => carrier.id === 'metroline' ? { ...carrier, status: 'active' } : carrier)
    setCarriers(nextCarriers)
    setDrivers((current) => {
      const nextDrivers = reconcileActiveCarrierDrivers(current, nextCarriers)
      setRuntimePositions((positions) => {
        const next = { ...positions }
        nextDrivers.forEach((driver) => {
          if (next[driver.id]) return
          const home = mapLocations.find((location) => location.id === driver.homeBaseLocationId)
          if (home) next[driver.id] = { longitude: home.longitude, latitude: home.latitude }
        })
        return next
      })
      return nextDrivers
    })
  }
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
      terms: { dispatchFee: '8% of carrier gross', loadApprovalRequired: true, paymentTermsDays: 1 },
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
      }
    })
  }, [gameTime, carrierApplicationsById])




  useEffect(() => {
    const load = loads.find((item) => item.assignedDriverId && ['en-route-pickup', 'en-route-delivery'].includes(item.tripStatus)) || loads.find((item) => item.assignedDriverId && item.tripStatus !== 'queued') || {}
    const driver = drivers.find((item) => item.id === load.assignedDriverId)
    const route = load.tripStatus === 'en-route-delivery' ? load.plannedLoadedRouteGeometry : load.tripStatus === 'en-route-pickup' ? load.plannedDeadheadRouteGeometry : load.plannedLoadedRouteGeometry || load.plannedDeadheadRouteGeometry
    const activeTravelLeg = load.tripStatus === 'en-route-delivery' ? 'loaded' : load.tripStatus === 'en-route-pickup' ? 'deadhead' : null
    const panel = getDriverPanelModel({ driver, assignedLoad: load, gameTime, runtimeProgress: runtimeProgressByDriver[driver?.id] ?? 0, pickup: mapLocations.find((item) => item.id === load.pickupLocationId), delivery: mapLocations.find((item) => item.id === load.deliveryLocationId) })
    const hasActiveAcceptedLoad = Boolean(load.assignedDriverId) && !['delivered', 'completed'].includes(load.tripStatus)
    const pickupFinished = ['loaded', 'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'].includes(load.tripStatus)
    const loadFinished = ['delivered', 'completed'].includes(load.tripStatus)
    logDocOsState({ tripStatus: load.tripStatus, planningStatus: load.planningStatus, deliveryPlanningStatus: load.deliveryPlanningStatus, activeTravelLeg, driverOperationalState: panel?.operationalState, panelAction: panel?.actionType, candidateDriverId: load.candidateDriverId, assignedDriverId: load.assignedDriverId, hasActiveAcceptedLoad, showPickupMarker: hasActiveAcceptedLoad && !pickupFinished, showDeliveryMarker: hasActiveAcceptedLoad && !loadFinished, candidateDeadhead: `${load.candidateDeadheadRouteGeometry?.length || 0} coordinates`, plannedDeadhead: `${load.plannedDeadheadRouteGeometry?.length || 0} coordinates`, candidateLoaded: `${load.candidateLoadedRouteGeometry?.length || 0} coordinates`, plannedLoaded: `${load.plannedLoadedRouteGeometry?.length || 0} coordinates`, activeRoute: route === load.plannedLoadedRouteGeometry ? 'plannedLoaded' : route === load.plannedDeadheadRouteGeometry ? 'plannedDeadhead' : 'none', activeRouteCoordinates: route?.length || 0, driverPosition: runtimePositions[load.assignedDriverId] })
  }, [loads, drivers, runtimePositions, runtimeProgressByDriver, gameTime])

  useEffect(() => {
    // AV: each driver owns independent travel progress and route state. This keeps
    // simultaneous drivers from stealing one another's movement.
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const travelingLoads = loads.filter((load) => load.assignedDriverId && ['en-route-pickup', 'en-route-delivery'].includes(load.tripStatus))
    if (!travelingLoads.length) return

    const progressUpdates = {}
    const positionUpdates = {}
    const arrivedLoadIds = new Set()

    travelingLoads.forEach((load) => {
      const delivery = load.tripStatus === 'en-route-delivery'
      const route = delivery ? load.plannedLoadedRouteGeometry : load.plannedDeadheadRouteGeometry
      const departure = delivery ? load.deliveryDepartureGameMinute : load.departureGameMinute
      const duration = delivery ? load.plannedLoadedDriveTimeMinutes : load.plannedDeadheadDriveTimeMinutes
      if (!Array.isArray(route) || route.length < 2 || !Number.isFinite(departure) || !Number.isFinite(duration) || duration <= 0) return
      const progress = Math.max(0, Math.min(1, (now - departure) / duration))
      progressUpdates[load.assignedDriverId] = progress
      const position = pointAlongRoute(route, progress)
      const destination = mapLocations.find((location) => location.id === (delivery ? load.deliveryLocationId : load.pickupLocationId))
      if (progress >= 1 && destination) positionUpdates[load.assignedDriverId] = { longitude: destination.longitude, latitude: destination.latitude }
      else if (position) positionUpdates[load.assignedDriverId] = position
      if (progress >= 1) arrivedLoadIds.add(load.id)
    })

    if (Object.keys(progressUpdates).length) setRuntimeProgressByDriver((current) => ({ ...current, ...progressUpdates }))
    if (Object.keys(positionUpdates).length) setRuntimePositions((current) => ({ ...current, ...positionUpdates }))
    if (arrivedLoadIds.size) {
      setLoads((current) => current.map((item) => {
        if (!arrivedLoadIds.has(item.id)) return item
        const delivery = item.tripStatus === 'en-route-delivery'
        return {
          ...item,
          tripStatus: delivery ? 'at-delivery' : 'at-pickup',
          ...(delivery ? { deliveryArrivalGameMinute: item.deliveryArrivalGameMinute ?? now } : { pickupArrivalGameMinute: item.pickupArrivalGameMinute ?? now }),
        }
      }))
    }
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
      if (load.tripStatus === 'at-delivery') return {
        ...load,
        tripStatus: 'checking-in-delivery',
        deliveryArrivalGameMinute: Number.isFinite(load.deliveryArrivalGameMinute) ? load.deliveryArrivalGameMinute : now,
        deliveryCheckInStartGameMinute: now,
      }
      if (load.tripStatus === 'checking-in-delivery' && Number.isFinite(load.deliveryCheckInStartGameMinute) && now - load.deliveryCheckInStartGameMinute >= DELIVERY_CHECKIN_MINUTES) {
        const deliveryCheckInGameMinute = now
        return {
          ...load,
          tripStatus: 'waiting-at-delivery',
          deliveryCheckInGameMinute,
          deliveryDockReadyGameMinute: deliveryCheckInGameMinute + getDeliveryDockWaitMinutes(load, deliveryCheckInGameMinute),
        }
      }
      if (load.tripStatus === 'waiting-at-delivery' && Number.isFinite(load.deliveryDockReadyGameMinute) && now >= load.deliveryDockReadyGameMinute) {
        return { ...load, tripStatus: 'checked-in-delivery' }
      }
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
    setRuntimeProgressByDriver((current) => ({ ...current, [driverId]: null }))
  }, [loads, gameTime, dayLoop.operationDay])


  // AV: idle repositioning is per-driver and interruptible. Returning to a yard
  // is a default destination, never a commitment; assigning a load clears the idle route.
  useEffect(() => {
    if (!hydrated || stage !== 'game' || dayLoop.phase !== 'operating') return undefined
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    drivers.forEach((driver) => {
      if (getDriverActiveLoad(loads, driver.id)) return
      if (driver.idleRouteStatus !== 'dwell' || !Number.isFinite(driver.idleSinceGameMinute) || !driver.idleTargetLocationId) return
      if (now - driver.idleSinceGameMinute < IDLE_DWELL_MINUTES) return
      const origin = runtimePositions[driver.id]
      const target = mapLocations.find((location) => location.id === driver.idleTargetLocationId)
      if (!origin || !target) return
      setDrivers((current) => current.map((item) => item.id === driver.id && item.idleRouteStatus === 'dwell' ? { ...item, idleRouteStatus: 'calculating' } : item))
      calculateRoute(origin, target).then((route) => {
        setDrivers((current) => current.map((item) => item.id === driver.id && item.idleRouteStatus === 'calculating' && !getDriverActiveLoad(loads, driver.id)
          ? { ...item, idleRouteStatus: 'traveling', idleRouteGeometry: route.routeShape, idleRouteStartGameMinute: now, idleRouteDurationMinutes: Math.max(1, route.durationMinutes) }
          : item))
      }).catch((error) => {
        console.error('Idle positioning route unavailable:', driver.id, error)
        setDrivers((current) => current.map((item) => item.id === driver.id && item.idleRouteStatus === 'calculating' ? { ...item, idleRouteStatus: 'route-unavailable' } : item))
      })
    })
  }, [hydrated, stage, dayLoop.phase, drivers, loads, gameTime, runtimePositions])

  useEffect(() => {
    if (!hydrated) return
    setDrivers((current) => current.map((driver) => {
      const active = getDriverActiveLoad(loads, driver.id)
      const queued = getDriverQueue(loads, driver.id)
      const assignedLoadId = active?.id || null
      const queuedLoadIds = queued.map((load) => load.id)
      const shouldBeUnavailable = Boolean(active || queued.length)
      if (driver.assignedLoadId === assignedLoadId
        && JSON.stringify(driver.queuedLoadIds || []) === JSON.stringify(queuedLoadIds)
        && (shouldBeUnavailable ? driver.status === 'unavailable' : true)) return driver
      return {
        ...driver,
        assignedLoadId,
        queuedLoadIds,
        status: shouldBeUnavailable ? 'unavailable' : driver.status,
      }
    }))
  }, [hydrated, loads])

  useEffect(() => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const positionUpdates = {}
    const arrivedDriverIds = new Set()
    drivers.forEach((driver) => {
      if (driver.idleRouteStatus !== 'traveling' || getDriverActiveLoad(loads, driver.id)) return
      if (!Array.isArray(driver.idleRouteGeometry) || driver.idleRouteGeometry.length < 2 || !Number.isFinite(driver.idleRouteStartGameMinute) || !Number.isFinite(driver.idleRouteDurationMinutes)) return
      const progress = Math.max(0, Math.min(1, (now - driver.idleRouteStartGameMinute) / driver.idleRouteDurationMinutes))
      const position = pointAlongRoute(driver.idleRouteGeometry, progress)
      if (position) positionUpdates[driver.id] = position
      if (progress >= 1) arrivedDriverIds.add(driver.id)
    })
    if (Object.keys(positionUpdates).length) setRuntimePositions((current) => ({ ...current, ...positionUpdates }))
    if (arrivedDriverIds.size) setDrivers((current) => current.map((driver) => {
      if (!arrivedDriverIds.has(driver.id)) return driver
      const target = mapLocations.find((location) => location.id === driver.idleTargetLocationId)
      return { ...driver, idleRouteStatus: 'arrived', lastKnownLocationId: driver.idleTargetLocationId, longitude: target?.longitude ?? driver.longitude, latitude: target?.latitude ?? driver.latitude }
    }))
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
    // The freight market continues from its own posting/expiration state across operation days.
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
            runtimeProgressByDriver={runtimeProgressByDriver}
            setRuntimeProgressByDriver={setRuntimeProgressByDriver}
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
