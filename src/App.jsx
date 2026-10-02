import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'
import './AppShell.css'
import seedLoads from './data/loads.js'
import seedCarriers from './data/carriers.js'
import seedDrivers from './data/drivers.js'
import mapLocations from './data/mapLocations.js'
import { getDeliveryDockWaitMinutes, getPickupDockWaitMinutes } from './data/pickupConfig.js'
import { advanceDockLifecycle } from './utils/dockLifecycle.js'
import { logDocOsState } from './utils/debugLogger.js'
import { getDriverPanelModel } from './utils/driverOperationalState.js'
import CareerSetupScreen from './components/CareerSetupScreen.jsx'
const MainGameScreen = lazy(() => import('./components/MainGameScreen.jsx'))
import StartScreen from './components/StartScreen.jsx'
import StartOfficeBackdrop from './components/StartOfficeBackdrop.jsx'
import { SAVE_SLOT_IDS, clearActiveSaveSlot, clearSave, getActiveSaveSlot, getSaveSlots, loadGame, saveGame, setActiveSaveSlot } from './utils/saveGame.js'
import { createSavePersistenceAuthority, invalidatePendingAutosaveForSlot, persistIfAuthorized } from './utils/savePersistenceAuthority.js'
import { createDevPreset } from './dev/devPresets.js'
import { getReceivables } from './utils/ledger.js'
import { createInitialLedgerBanking, getLedgerAccountSummary, reconcileLedgerBanking } from './utils/ledgerBanking.js'
import { reconcileActiveCarrierDrivers } from './utils/driverRoster.js'
import { getDriverActiveLoad, getDriverQueue, promoteNextQueuedLoad } from './utils/driverQueue.js'
import { createDayReport, DEFAULT_DAY_LOOP_STATE, DEFAULT_PLAYER_PROGRESSION, getEndDayStatus } from './utils/dayLoop.js'
import { applyCarrierPerformanceReview, buildCarrierCareerById, getCarrierRelationshipStateLabel, mergeCarrierCareerEntry, CARRIER_APPLICATION_STATES, CARRIER_RELATIONSHIP_STATES } from './utils/carrierCareer.js'
import { getAgreementRules } from './utils/carrierAgreement.js'
import { calculateRoute } from './services/routingService.js'
import { refreshFreightMarket } from './utils/freightMarket.js'
import { getAuthoritativeDriverTravelLoad } from './utils/driverItinerary.js'
import { getFreightRouteName } from './utils/freightIdentity.js'
import { getClockInMessage, getEndOfDayMessage, getRelationshipStartMessage } from './utils/driverCommunications.js'
import { createCorrectedPodVersion, normalizePodDocument } from './utils/documentLifecycle.js'
import { createRateConfirmation } from './utils/rateConfirmation.js'
import { advanceDriverHours, normalizeDriverHours } from './utils/driverHOS.js'
import { canAcquireDriverMovement } from './utils/driverMovementOwner.js'
import { resolveDriverWorkdayOwnership } from './utils/driverWorkdayOwnership.js'
import { sampleRoutePoint } from './utils/routeSampler.js'
import { anchorMovementRoute, reconcileIdleMovement, reconcileFreightMovement, restoreMovementOwnerContinuity } from './utils/runtimeMovement.js'
import { createLegacyIndependentCareer, normalizeCareerState } from './utils/careerState.js'
import { establishCarrierOperationalContext } from './utils/carrierOperationalContext.js'
import { normalizeFirstDayProgress, migrateFirstDayFlow, isFirstDayTeachingPaused } from './utils/firstDayProgress.js'
import { initializeMetrolineEmployeeOperation } from './utils/employeeCareerInitializer.js'


const IDLE_DWELL_MINUTES = 20

function getOvernightTruckStopId(origin) {
  const truckStops = mapLocations.filter((location) => ['queens-staging-area', 'newark-fuel-stop'].includes(location.id))
  if (!origin || !truckStops.length) return 'newark-fuel-stop'
  return truckStops.reduce((nearest, location) => {
    const distance = ((location.longitude - origin.longitude) ** 2) + ((location.latitude - origin.latitude) ** 2)
    const nearestDistance = ((nearest.longitude - origin.longitude) ** 2) + ((nearest.latitude - origin.latitude) ** 2)
    return distance < nearestDistance ? location : nearest
  }).id
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
    const position = sampleRoutePoint(route, progress)
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

function App({ onReturnToStartup, onWorkstationReady }) {
  const [stage, setStage] = useState(onReturnToStartup ? 'loading' : 'start')
  const [gameEntryScreen, setGameEntryScreen] = useState(null)
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [gameTime, setGameTime] = useState({ gameDayIndex: 0, totalMinutesOfDay: 360 })
  const [loads, setLoads] = useState(() => seedLoads)
  const [drivers, setDrivers] = useState([])
  const [carriers, setCarriers] = useState(() => seedCarriers.map((carrier) => ({ ...carrier })))
  const [plannedRoute, setPlannedRoute] = useState(null)
  const [isGameClockPaused, setIsGameClockPaused] = useState(true)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [runtimePositions, setRuntimePositions] = useState({})
  const [runtimeProgressByDriver, setRuntimeProgressByDriver] = useState({})
  const movementStateRef = useRef(null)
  movementStateRef.current = { drivers, loads, gameTime, runtimePositions, stage }
  const idleRouteRequestsRef = useRef(new Map())
  const suspendedIdleDriversRef = useRef(new Set())

  // P2.3.4 — recheck ownership and physical origin after asynchronous routing.
  const requestIdleRoute = (driver, origin) => {
    if (!origin || idleRouteRequestsRef.current.has(driver.id)) return
    const target = mapLocations.find((location) => location.id === driver.idleTargetLocationId)
    if (!target) return
    const request = {}
    idleRouteRequestsRef.current.set(driver.id, request)
    calculateRoute(origin, target).then((route) => {
      const live = movementStateRef.current
      const currentDriver = live.drivers.find((item) => item.id === driver.id)
      if (live.stage !== 'game' || !currentDriver || currentDriver.idleRouteStatus !== 'calculating'
        || currentDriver.idleTargetLocationId !== target.id
        || !canAcquireDriverMovement({ driver: currentDriver, loads: live.loads, gameTime: live.gameTime }, 'idle')) return
      const position = live.runtimePositions[driver.id]
      if (!position || position.longitude !== origin.longitude || position.latitude !== origin.latitude) return
      const start = live.gameTime.gameDayIndex * 1440 + live.gameTime.totalMinutesOfDay
      setDrivers((current) => current.map((item) => item.id === driver.id && item.idleRouteStatus === 'calculating'
        && item.idleTargetLocationId === target.id
        && canAcquireDriverMovement({ driver: item, loads: movementStateRef.current.loads, gameTime: movementStateRef.current.gameTime }, 'idle')
        ? { ...item, idleRouteStatus: 'traveling', idleRouteGeometry: anchorMovementRoute(route.routeShape, position), idleRouteStartGameMinute: start, idleRouteDurationMinutes: Math.max(1, route.durationMinutes) }
        : item))
    }).catch((error) => {
      console.error('Shift-end staging route unavailable:', driver.id, error)
      setDrivers((current) => current.map((item) => item.id === driver.id && item.idleRouteStatus === 'calculating'
        && item.idleTargetLocationId === target.id
        && canAcquireDriverMovement({ driver: item, loads: movementStateRef.current.loads, gameTime: movementStateRef.current.gameTime }, 'idle')
        ? { ...item, idleRouteStatus: 'route-unavailable' } : item))
    }).finally(() => {
      if (idleRouteRequestsRef.current.get(driver.id) === request) idleRouteRequestsRef.current.delete(driver.id)
    })
  }

  const [hydrated, setHydrated] = useState(false)
  const [hasExistingOperation, setHasExistingOperation] = useState(false)
  const [resumeStage, setResumeStage] = useState(null)
  const [seenLedgerReceivableIds, setSeenLedgerReceivableIds] = useState([])
  const [seenLedgerPaymentReceivedIds, setSeenLedgerPaymentReceivedIds] = useState([])
  const [ledgerWorkflowByLoadId, setLedgerWorkflowByLoadId] = useState({})
  const [ledgerBanking, setLedgerBanking] = useState(() => createInitialLedgerBanking())
  const [carrierApplicationsById, setCarrierApplicationsById] = useState({})
  const [carrierCareerById, setCarrierCareerById] = useState(() => buildCarrierCareerById(seedCarriers))
  const [dispatcherProfile, setDispatcherProfile] = useState(null)
  const [emailMessages, setEmailMessages] = useState([])
  const [driverMessages, setDriverMessages] = useState([])
  const [businessDocuments, setBusinessDocuments] = useState([])
  const [dayLoop, setDayLoop] = useState(() => ({ ...DEFAULT_DAY_LOOP_STATE }))
  const [playerProgression, setPlayerProgression] = useState(() => ({ ...DEFAULT_PLAYER_PROGRESSION }))
  const [firstDay, setFirstDay] = useState(null)
  const [career, setCareer] = useState(() => createLegacyIndependentCareer())
  const [saveSlots, setSaveSlots] = useState([])
  const [activeSaveSlotId, setActiveSaveSlotId] = useState(null)
  const [majorTransition, setMajorTransition] = useState(null)
  const [saveFailureMessage, setSaveFailureMessage] = useState('')
  const lifecycleSaveSignatureRef = useRef('')
  const autosaveTimerRef = useRef(null)
  const autosaveTimerSlotRef = useRef(null)
  const latestAutosaveRef = useRef(null)
  const savePersistenceAuthorityRef = useRef(null)
  if (savePersistenceAuthorityRef.current === null) savePersistenceAuthorityRef.current = createSavePersistenceAuthority()
  const majorTransitionLockRef = useRef(false)
  const majorTransitionTimersRef = useRef([])

    // B.5.4D.4.2.10A — Business Response Bridge
  // Trucks/simulation may remain paused while the Operations Device is open.
  // Office responses still mature in real time. When a business response is due,
  // we release the EXISTING game-time response processor by moving only that
  // email's responseGameMinute to the current frozen game minute.
  useEffect(() => {
    if (!hydrated || stage !== 'game') return undefined

    const hasUnresolvedBusinessReply = emailMessages.some((message) =>
      message.direction === 'outbound' &&
      message.workflowType &&
      message.workflowType !== 'general' &&
      !emailMessages.some((entry) => entry.replyToEmailId === message.id)
    )

    if (!hasUnresolvedBusinessReply) return undefined

    // Old saves / already-pending requests do not have responseBusinessAtMs.
    // Stamp them once so the current save recovers without resending approval.
    setEmailMessages((current) => {
      const repliedIds = new Set(
        current
          .filter((entry) => entry.replyToEmailId)
          .map((entry) => entry.replyToEmailId)
      )

      let changed = false
      const stamped = current.map((message) => {
        const needsStamp =
          message.direction === 'outbound' &&
          message.workflowType &&
          message.workflowType !== 'general' &&
          !repliedIds.has(message.id) &&
          !Number.isFinite(Number(message.responseBusinessAtMs))

        if (!needsStamp) return message

        changed = true
        return {
          ...message,
          responseBusinessAtMs: Date.now() + 3000,
        }
      })

      return changed ? stamped : current
    })

    const timer = window.setInterval(() => {
      const nowGameMinute =
        Number(gameTime.gameDayIndex || 0) * 1440 +
        Number(gameTime.totalMinutesOfDay || 0)
      const nowReal = Date.now()

      setEmailMessages((current) => {
        const repliedIds = new Set(
          current
            .filter((entry) => entry.replyToEmailId)
            .map((entry) => entry.replyToEmailId)
        )

        let changed = false

        const released = current.map((message) => {
          const businessDue =
            message.direction === 'outbound' &&
            message.workflowType &&
            message.workflowType !== 'general' &&
            !repliedIds.has(message.id) &&
            Number.isFinite(Number(message.responseBusinessAtMs)) &&
            nowReal >= Number(message.responseBusinessAtMs)

          if (!businessDue) return message

          if (
            Number.isFinite(Number(message.responseGameMinute)) &&
            Number(message.responseGameMinute) <= nowGameMinute
          ) {
            return message
          }

          changed = true
          return {
            ...message,
            responseGameMinute: nowGameMinute,
            businessResponseReleasedAtMs: nowReal,
          }
        })

        return changed ? released : current
      })
    }, 500)

    return () => window.clearInterval(timer)
  }, [hydrated, stage, emailMessages, gameTime.gameDayIndex, gameTime.totalMinutesOfDay])

useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return

    Promise.allSettled([
      Keyboard.setStyle({ style: KeyboardStyle.Dark }),
      Keyboard.setResizeMode({ mode: KeyboardResize.None }),
      Keyboard.setAccessoryBarVisible({ isVisible: false }),
    ])
  }, [])

  useEffect(() => {
    return () => {
      majorTransitionTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      majorTransitionTimersRef.current = []
    }
  }, [])

  const approvePodAndCloseout = (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load || load.tripStatus !== 'awaiting-pod' || !load.pod?.verified) return false
    const recordPieces = Number.isFinite(Number(load.pod?.freightCondition?.loadedAtPickup)) ? Number(load.pod.freightCondition.loadedAtPickup) : Number(load.pod.piecesReceived)
    const recordDamageCount = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
    const recordDamage = recordDamageCount > 0 ? `${recordDamageCount} pallet${recordDamageCount === 1 ? '' : 's'} noted` : 'None'
    if (Number(load.pod.piecesReceived) !== Number(recordPieces) || String(load.pod.damage || '').trim() !== recordDamage) return false
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    // AV2.9: POD approval is administrative only. The receiver already released
    // the driver at unload completion, so Documents never owns driver movement.
    setLoads((current) => current.map((item) => item.id === loadId ? {
      ...item,
      tripStatus: 'completed',
      status: 'completed',
      completedGameMinute: Number.isFinite(item.completedGameMinute) ? item.completedGameMinute : now,
      completedOperationDay: dayLoop.operationDay,
      pod: { ...item.pod, approved: true, approvedGameMinute: now },
    } : item))
    return true
  }

  const mergeSavedLoads = (savedLoads = []) => [
    ...savedLoads.map((load) => {
      const seed = seedLoads.find((item) => item.id === load.id)
      if (!seed) return load
      const merged = { ...seed, ...load }
      if (merged.pod) merged.pod = normalizePodDocument(merged.pod, merged.id)
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
    const savedNow = (saved.gameTime?.gameDayIndex ?? 0) * 1440 + (saved.gameTime?.totalMinutesOfDay ?? 360)
    hydratedLoads = hydratedLoads.map((load) => {
      if (load.tripStatus === 'at-delivery' && !Number.isFinite(load.deliveryArrivalGameMinute)) return { ...load, deliveryArrivalGameMinute: savedNow }
      if (load.tripStatus === 'waiting-at-delivery') {
        const deliveryArrivalGameMinute = Number.isFinite(load.deliveryArrivalGameMinute) ? load.deliveryArrivalGameMinute : savedNow
        const deliveryCheckInGameMinute = Number.isFinite(load.deliveryCheckInGameMinute) ? load.deliveryCheckInGameMinute : savedNow
        const deliveryDockReadyGameMinute = deliveryCheckInGameMinute + getDeliveryDockWaitMinutes(load, deliveryCheckInGameMinute, load.lunchEarlyCheckInBonusAppliedMinutes || 0)
        return { ...load, deliveryArrivalGameMinute, deliveryCheckInGameMinute, deliveryDockReadyGameMinute }
      }
      if (load.tripStatus === 'waiting-at-pickup') {
        const pickupArrivalGameMinute = Number.isFinite(load.pickupArrivalGameMinute) ? load.pickupArrivalGameMinute : savedNow
        const pickupCheckInGameMinute = Number.isFinite(load.pickupCheckInGameMinute) ? load.pickupCheckInGameMinute : savedNow
        // AP1 normalizes legacy/AP test saves to the current dock-wait contract.
        // Do not preserve an old excessive ready time after the wait rules change.
        const pickupDockReadyGameMinute = pickupCheckInGameMinute + getPickupDockWaitMinutes(load, pickupCheckInGameMinute, load.lunchEarlyCheckInBonusAppliedMinutes || 0)
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
      const hours = normalizeDriverHours(driver.hours, savedNow)
      return assigned
        ? { ...driver, hours, status: 'unavailable', assignedLoadId: assigned.id, queuedLoadIds: queued.map((load) => load.id) }
        : { ...driver, hours, status: queued.length ? 'unavailable' : driver.status, assignedLoadId: null, queuedLoadIds: queued.map((load) => load.id) }
    })

    const nextPositions = { ...(saved.runtimePositions || {}) }
    const nextRuntimeProgress = {}
    hydratedDrivers.forEach((driver) => {
      const activeLoad = getDriverActiveLoad(hydratedLoads, driver.id)
      const savedProgress = saved.runtimeProgressByDriver?.[driver.id]
      const restoredMovement = restoreMovementOwnerContinuity({ driver, loads: hydratedLoads, gameTime: saved.gameTime, savedPosition: nextPositions[driver.id], savedProgress })
      if (['lunch-route', 'lunch-hold', 'idle-route', 'idle-hold'].includes(restoredMovement.ownerType)) {
        if (restoredMovement.position) nextPositions[driver.id] = restoredMovement.position
        if (Number.isFinite(restoredMovement.progress)) nextRuntimeProgress[driver.id] = restoredMovement.progress
        return
      }
      const continuity = restoredMovement.ownerType === 'freight' ? restoredMovement.freightContinuity : null

      if (continuity) {
        nextPositions[driver.id] = continuity.position
        nextRuntimeProgress[driver.id] = continuity.progress
        if (continuity.rebased) {
          hydratedLoads = hydratedLoads.map((load) => load.id !== activeLoad.id ? load : continuity.delivery
            ? { ...load, deliveryDepartureGameMinute: continuity.startGameMinute }
            : { ...load, departureGameMinute: continuity.startGameMinute })
        }
        return
      }

      const reconciled = reconcileDriverRuntimeState(driver, activeLoad, nextPositions[driver.id], savedNow)
      if (reconciled.position) nextPositions[driver.id] = reconciled.position
      if (Number.isFinite(reconciled.progress)) nextRuntimeProgress[driver.id] = reconciled.progress
    })

    setSelectedMarket(saved.selectedMarket ?? null)
    setGameTime(saved.gameTime ?? { gameDayIndex: 0, totalMinutesOfDay: 360 })
    setLoads(hydratedLoads)
    setDrivers(hydratedDrivers)
    setCarriers(hydratedCarriers)
    setRuntimePositions(nextPositions)
    setRuntimeProgressByDriver(nextRuntimeProgress)
    setSeenLedgerReceivableIds(Array.isArray(saved.seenLedgerReceivableIds) ? saved.seenLedgerReceivableIds : [])
    setSeenLedgerPaymentReceivedIds(Array.isArray(saved.seenLedgerPaymentReceivedIds) ? saved.seenLedgerPaymentReceivedIds : [])
    setLedgerWorkflowByLoadId(saved.ledgerWorkflowByLoadId || {})
    setLedgerBanking(reconcileLedgerBanking(saved.ledgerBanking, hydratedLoads, hydratedCarriers, saved.ledgerWorkflowByLoadId || {}))
    const hydratedApplications = saved.carrierApplicationsById || {}
    setCarrierApplicationsById(hydratedApplications)
    setCarrierCareerById(buildCarrierCareerById(hydratedCarriers, hydratedApplications, saved.carrierCareerById || {}))
    setDispatcherProfile(saved.dispatcherProfile || null)
    setEmailMessages(Array.isArray(saved.emailMessages) ? saved.emailMessages.filter((message) => !message.templateId) : [])
    const savedDriverMessages = Array.isArray(saved.driverMessages) ? saved.driverMessages : []
    // CS2.0B.4.1 — collapse the old three-text Marcus tutorial burst into one
    // relationship-start message. Existing saves keep their history without carrying
    // the repetitive onboarding cadence forward.
    const legacyIntro = savedDriverMessages.find((message) => ['marcus-intro', 'marcus-intro-1', 'marcus-intro-2', 'marcus-intro-3'].includes(message.id))
    const migratedDriverMessages = savedDriverMessages.filter((message) => !['marcus-intro', 'marcus-intro-1', 'marcus-intro-2', 'marcus-intro-3'].includes(message.id))
    if (legacyIntro) {
      const marcus = hydratedDrivers.find((driver) => driver.id === 'marcus') || seedDrivers.find((driver) => driver.id === 'marcus')
      migratedDriverMessages.push({
        ...legacyIntro,
        id: 'marcus-relationship-start',
        body: getRelationshipStartMessage(marcus),
        messageIntent: 'relationship-start',
        requiresResponse: false,
        receivedGameMinute: Number.isFinite(legacyIntro.receivedGameMinute) ? legacyIntro.receivedGameMinute : savedNow,
      })
    }
    setDriverMessages(migratedDriverMessages)
    setBusinessDocuments(Array.isArray(saved.businessDocuments) ? saved.businessDocuments : [])
    setDayLoop(saved.dayLoop ? { ...DEFAULT_DAY_LOOP_STATE, ...saved.dayLoop, history: Array.isArray(saved.dayLoop.history) ? saved.dayLoop.history : [] } : { ...DEFAULT_DAY_LOOP_STATE })
    setPlayerProgression(saved.playerProgression ? { ...DEFAULT_PLAYER_PROGRESSION, ...saved.playerProgression } : { ...DEFAULT_PLAYER_PROGRESSION })
    setCareer(normalizeCareerState(saved.career))
    setFirstDay(migrateFirstDayFlow(saved.firstDay, saved.loads))
    setResumeStage(saved.stage && !['start', 'market', 'dayOneIntro'].includes(saved.stage) ? saved.stage : 'game')
  }

  const resetOperationState = () => {
    setSelectedMarket(null)
    setGameTime({ gameDayIndex: 0, totalMinutesOfDay: 360 })
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
    setLedgerBanking(createInitialLedgerBanking())
    setCarrierApplicationsById({})
    setCarrierCareerById(buildCarrierCareerById(seedCarriers))
    setDispatcherProfile(null)
    setEmailMessages([])
    setDriverMessages([])
    setBusinessDocuments([])
    setDayLoop({ ...DEFAULT_DAY_LOOP_STATE })
    setPlayerProgression({ ...DEFAULT_PLAYER_PROGRESSION })
    setCareer(createLegacyIndependentCareer())
  }

  useEffect(() => {
    const slots = getSaveSlots()
    const activeSlot = getActiveSaveSlot() || slots[0]?.id || null
    setSaveSlots(slots)
    setActiveSaveSlotId(activeSlot)
    const saved = loadGame(activeSlot)
    setHasExistingOperation(slots.length > 0)
    if (saved) {
      hydrateSavedOperation(saved)
      if (onReturnToStartup) setStage('game')
    } else if (onReturnToStartup) {
      onReturnToStartup()
      return
    }
    setHydrated(true)
  }, [onReturnToStartup])

  useEffect(() => {
    const onSaveFailure = () => {
      setSaveFailureMessage('Save failed. DOC OS could not protect your latest progress. Free device storage, then keep the game open and try again.')
    }
    window.addEventListener('doc-os-save-failed', onSaveFailure)
    return () => window.removeEventListener('doc-os-save-failed', onSaveFailure)
  }, [])

  // 3B.1 persistence hardening: the old autosave was a true debounce. Because the
  // simulation clock changes continuously while operations are running, every tick
  // cancelled the pending save and a moving driver could go unsaved indefinitely.
  // Keep the newest snapshot in a ref and persist routine movement at a battery-friendly
  // cadence. Lifecycle transitions and iOS background/pagehide still flush immediately.
  useEffect(() => {
    if (!hydrated || !activeSaveSlotId) return
    if (!savePersistenceAuthorityRef.current.canPersistToSlot(activeSaveSlotId)) return
    if (stage === 'start' && !hasExistingOperation) return
    const persistedStage = stage === 'start' && hasExistingOperation ? (resumeStage || 'game') : stage
    latestAutosaveRef.current = {
      slotId: activeSaveSlotId,
      state: { stage: persistedStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, ledgerBanking, carrierApplicationsById, carrierCareerById, dispatcherProfile, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression, career, firstDay },
    }
    autosaveTimerSlotRef.current = activeSaveSlotId
    if (autosaveTimerRef.current !== null) return
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null
      autosaveTimerSlotRef.current = null
      const snapshot = latestAutosaveRef.current
      if (!snapshot) return
      persistIfAuthorized(savePersistenceAuthorityRef.current, saveGame, snapshot.state, snapshot.slotId)
      setSaveSlots(getSaveSlots())
    }, 5000)
  }, [hydrated, activeSaveSlotId, stage, hasExistingOperation, resumeStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, ledgerBanking, carrierApplicationsById, carrierCareerById, dispatcherProfile, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression, career, firstDay])

  useEffect(() => () => {
    if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current)
    autosaveTimerSlotRef.current = null
  }, [])

  // AV lifecycle persistence: critical operational boundaries flush immediately.
  // Routine animation/clock changes still use the normal debounce above.
  useEffect(() => {
    if (!hydrated || !activeSaveSlotId || !savePersistenceAuthorityRef.current.canPersistToSlot(activeSaveSlotId) || (stage === 'start' && !hasExistingOperation)) return
    const signature = loads
      .filter((load) => load.assignedDriverId || ['accepted', 'assigned', 'queued', 'completed'].includes(load.status))
      .map((load) => `${load.id}:${load.assignedDriverId || load.completedDriverId || '-'}:${load.status}:${load.tripStatus}:${load.planningStatus || '-'}:${load.deliveryPlanningStatus || '-'}:${load.pod?.approved ? 'pod-approved' : '-'}`)
      .sort()
      .join('|')
    if (!signature || signature === lifecycleSaveSignatureRef.current) return
    lifecycleSaveSignatureRef.current = signature
    const persistedStage = stage === 'start' && hasExistingOperation ? (resumeStage || 'game') : stage
    persistIfAuthorized(savePersistenceAuthorityRef.current, saveGame, { stage: persistedStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, ledgerBanking, carrierApplicationsById, carrierCareerById, dispatcherProfile, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression, career, firstDay }, activeSaveSlotId)
  }, [hydrated, activeSaveSlotId, stage, hasExistingOperation, resumeStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, ledgerBanking, carrierApplicationsById, carrierCareerById, dispatcherProfile, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression, career, firstDay])

  // AU3 mobile persistence hardening: keep the normal debounce for routine
  // updates, but flush the current snapshot immediately when iOS backgrounds
  // or unloads the web view. This closes the common sub-second lifecycle gap.
  useEffect(() => {
    if (!hydrated || !activeSaveSlotId) return undefined
    const flushSave = () => {
      const persistedStage = stage === 'start' && hasExistingOperation ? (resumeStage || 'game') : stage
      persistIfAuthorized(savePersistenceAuthorityRef.current, saveGame, { stage: persistedStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, ledgerBanking, carrierApplicationsById, carrierCareerById, dispatcherProfile, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression, career, firstDay }, activeSaveSlotId)
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushSave() }
    window.addEventListener('pagehide', flushSave)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flushSave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [hydrated, activeSaveSlotId, stage, hasExistingOperation, resumeStage, selectedMarket, gameTime, loads, drivers, carriers, runtimePositions, runtimeProgressByDriver, seenLedgerReceivableIds, seenLedgerPaymentReceivedIds, ledgerWorkflowByLoadId, ledgerBanking, carrierApplicationsById, carrierCareerById, dispatcherProfile, emailMessages, driverMessages, businessDocuments, dayLoop, playerProgression, career, firstDay])

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

  // AV2.7.1a: FreightLink is a live market every operating day. At each in-game
  // hour boundary it posts fresh freight and tops the actionable board back up
  // to a minimum of ten loads. Generated loads persist in save state.
  const freightMarketHourBucket = Math.floor(gameTime.totalMinutesOfDay / 60)
  useEffect(() => {
    if (!hydrated || stage !== 'game' || dayLoop.phase !== 'operating') return
    setLoads((current) => refreshFreightMarket(current, gameTime))
  }, [hydrated, stage, dayLoop.phase, gameTime.gameDayIndex, freightMarketHourBucket])


    // B.5.4D.4.2.10D — Direct Business Response Processor
  // Business/office replies are independent from truck simulation time.
  // This tick only wakes the existing response processor; that processor
  // remains the single authority that writes APPROVED / NEEDS_INFO and
  // generates Rate Confirmations.
  const [businessResponseTick, setBusinessResponseTick] = useState(0)

  useEffect(() => {
    if (!hydrated || stage !== 'game') return undefined

    const hasUnresolvedBusinessReply = emailMessages.some((message) =>
      message.direction === 'outbound' &&
      message.workflowType &&
      message.workflowType !== 'general' &&
      !emailMessages.some((entry) => entry.replyToEmailId === message.id)
    )

    if (!hasUnresolvedBusinessReply) return undefined

    const timer = window.setInterval(() => {
      setBusinessResponseTick((current) => current + 1)
    }, 500)

    return () => window.clearInterval(timer)
  }, [hydrated, stage, emailMessages])

useEffect(() => {
    if (!hydrated || stage !== 'game') return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const pending = emailMessages.find((message) => {
      const businessDue =
        Number.isFinite(Number(message.responseBusinessAtMs)) &&
        Date.now() >= Number(message.responseBusinessAtMs)
      const gameDue =
        Number.isFinite(Number(message.responseGameMinute)) &&
        now >= Number(message.responseGameMinute)

      return message.direction === 'outbound'
        && message.workflowType
        && message.workflowType !== 'general'
        && (businessDue || gameDue)
        && !emailMessages.some((entry) => entry.replyToEmailId === message.id)
    })
    if (!pending) return

    const load = loads.find((item) => item.id === pending.loadId)
    const pendingCarrier = carriers.find((item) => item.id === pending.carrierId) || carriers[0] || null
    const carrierName = pendingCarrier?.name || 'Carrier'
    const loadNumber = load ? getFreightRouteName(load) : 'route'
    let senderOverride = carrierName
    let subject = `Re: ${pending.subject || loadNumber}`
    let bodyOverride = 'Received. Thank you.'
    let attachments = []

    if (pending.workflowType === 'carrier-approval') {
      senderOverride = `${carrierName} · Operations`
      const requestedIds = Array.isArray(pending.loadIds) && pending.loadIds.length ? pending.loadIds : [pending.loadId].filter(Boolean)
      const requestedLoads = requestedIds.map((id) => loads.find((item) => item.id === id)).filter(Boolean)
      const activeRequestedLoads = requestedLoads.filter((item) => item.carrierApprovalStatus === 'PENDING' && item.scheduleApprovalQueued)
      const activeRequestedIds = activeRequestedLoads.map((item) => item.id)
      if (!activeRequestedIds.length) {
        bodyOverride = `Understood — the approval request was withdrawn. No action taken.`
      } else if (pending.workflowValid) {
        const lines = activeRequestedLoads.map((item) => { const pickupName = mapLocations.find((location) => location.id === item.pickupLocationId)?.name || 'Pickup'; const deliveryName = mapLocations.find((location) => location.id === item.deliveryLocationId)?.name || 'Delivery'; return `Approved — ${pickupName} → ${deliveryName}` })
        bodyOverride = activeRequestedLoads.length > 1
          ? `Approved for today's plan:\n\n${lines.join('\n')}\n\nGo ahead and book the approved freight. Keep us posted if the schedule or rate changes.`
          : `Approved. Go ahead and book ${loadNumber}. Keep us posted if the schedule or rate changes.`
        const idSet = new Set(activeRequestedIds)
        setLoads((current) => current.map((item) => idSet.has(item.id) ? { ...item, carrierApprovalStatus: 'APPROVED', carrierApprovedGameMinute: now, rateConfirmation: createRateConfirmation(item, now, carrierName) } : item))
        const rateConfirmationEmails = activeRequestedLoads.map((approvedLoad) => {
          const rateConfirmation = createRateConfirmation(approvedLoad, now, carrierName)
          const routeName = getFreightRouteName(approvedLoad)
          return {
            id: `ratecon-email:${approvedLoad.id}:v${rateConfirmation.version || 1}`,
            type: 'rate-confirmation-delivery',
            direction: 'inbound',
            senderOverride: `${carrierName} · Documentation`,
            carrierId: pending.carrierId || pendingCarrier?.id || null,
            workflowType: 'rate-confirmation',
            subject: `Rate Confirmation · ${routeName}`,
            bodyOverride: `Rate Confirmation for ${routeName} is attached. Please review the document against the FreightLink offer.`,
            attachments: [{ id: rateConfirmation.id, type: 'rate-confirmation', title: `Rate Confirmation · ${routeName}`, meta: rateConfirmation.reference, loadId: approvedLoad.id }],
            loadId: approvedLoad.id,
            receivedGameMinute: now,
            read: false,
          }
        })
        setEmailMessages((current) => {
          const existingIds = new Set(current.map((entry) => entry.id))
          const fresh = rateConfirmationEmails.filter((entry) => !existingIds.has(entry.id))
          return fresh.length ? [...current, ...fresh] : current
        })
      } else {
        bodyOverride = `We can’t approve this plan yet. Please resend the request to Operations with the FreightLink offers attached.`
        const idSet = new Set(activeRequestedIds)
        setLoads((current) => current.map((item) => idSet.has(item.id) ? { ...item, carrierApprovalStatus: 'NEEDS_INFO' } : item))
      }
    }

    if (pending.workflowType === 'pod-correction') {
      senderOverride = `${carrierName} · Documentation`
      if (pending.workflowValid && load?.pod) {
        const piecesReceived = Number.isFinite(Number(load.pod.freightCondition?.loadedAtPickup)) ? Number(load.pod.freightCondition.loadedAtPickup) : Number(load.pod.piecesReceived)
        const damaged = Number(load.pod.freightCondition?.damagedAtPickup || 0)
        const damage = damaged > 0 ? `${damaged} pallet${damaged === 1 ? '' : 's'} noted` : 'None'
        bodyOverride = `Corrected POD for ${loadNumber} is attached. Piece count and freight condition now match the delivery record.`
        attachments = [{ id: `corrected-pod:${pending.loadId}`, type: 'pod', title: `Corrected POD · ${loadNumber}`, meta: 'Corrected copy', loadId: pending.loadId }]
        setLoads((current) => current.map((item) => item.id === pending.loadId && item.pod ? { ...item, pod: createCorrectedPodVersion(item.pod, item.id, { piecesReceived, damage }, now) } : item))
      } else {
        bodyOverride = `We need the current POD and supporting exception report before we can issue a correction for ${loadNumber}. Please resend to Documentation with both attached.`
        setLoads((current) => current.map((item) => item.id === pending.loadId && item.pod ? { ...item, pod: { ...item.pod, correctionStatus: 'NEEDS_INFO' } } : item))
      }
    }

    if (pending.workflowType === 'ratecon-correction') {
      senderOverride = `${carrierName} · Documentation`
      if (pending.workflowValid && load?.rateConfirmation) {
        const prior = load.rateConfirmation
        const nextVersion = Number(prior.version || 1) + 1
        bodyOverride = `Corrected Rate Confirmation for ${loadNumber} is attached. Please review the revised document against the FreightLink offer.`
        attachments = [{ id: `ratecon:${pending.loadId}:v${nextVersion}`, type: 'rate-confirmation', title: `Corrected Rate Confirmation · ${loadNumber}`, meta: `Version ${nextVersion}`, loadId: pending.loadId }]
        setLoads((current) => current.map((item) => item.id === pending.loadId && item.rateConfirmation ? { ...item, rateConfirmation: { ...item.rateConfirmation, id: `ratecon:${item.id}:v${nextVersion}`, version: nextVersion, status: 'RECEIVED', reviewStatus: 'PENDING', reviewChecks: {}, issuedGameMinute: now, correctionRequestedGameMinute: null, pickupLocationId: item.pickupLocationId, deliveryLocationId: item.deliveryLocationId, rate: Number(item.rate), listedMiles: Number(item.listedMiles), history: [...(item.rateConfirmation.history || []), { ...item.rateConfirmation, isCurrent: false, status: 'SUPERSEDED' }] } } : item))
      } else {
        bodyOverride = `We need both the Rate Confirmation and FreightLink offer before we can issue a corrected document for ${loadNumber}.`
      }
    }

    if (pending.workflowType === 'invoice-submission') {
      senderOverride = `${carrierName} · Accounting`
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
      carrierId: pending.carrierId || pendingCarrier?.id || null,
      workflowType: pending.workflowType,
      workflowValid: pending.workflowValid,
      subject,
      bodyOverride,
      attachments,
      loadId: pending.loadId,
      loadIds: pending.loadIds || null,
      replyToEmailId: pending.id,
      receivedGameMinute: now,
      read: false,
    }])
  }, [hydrated, stage, gameTime, emailMessages, loads, carriers, businessResponseTick])


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

  // CS2.0B.4.4.1 — a paid receivable and a bank deposit are related records,
  // not the same record. Reconcile by deterministic load ID so a payment can
  // never post to the Operating Account twice, including after save/resume.
  useEffect(() => {
    if (!hydrated) return
    setLedgerBanking((current) => reconcileLedgerBanking(current, loads, carriers, ledgerWorkflowByLoadId))
  }, [hydrated, loads, carriers, ledgerWorkflowByLoadId])


  const applyDevPreset = async (name) => { try { const preset = await createDevPreset(name, { gameTime, currentLoads: loads, currentDrivers: drivers }); setStage(preset.stage); setSelectedMarket(preset.selectedMarket); setLoads([...preset.loads, ...loads.filter((load) => !preset.loads.some((item) => item.id === load.id)), ...seedLoads.filter((seed) => !preset.loads.some((item) => item.id === seed.id) && !loads.some((item) => item.id === seed.id))]); setDrivers(preset.drivers); if (preset.carriers) setCarriers(preset.carriers); setRuntimePositions(preset.runtimePositions); setRuntimeProgressByDriver(preset.runtimeProgressByDriver || (Number.isFinite(preset.runtimeProgress) ? { marcus: preset.runtimeProgress } : {})) } catch (error) { console.error('DEV preset route unavailable:', error) } }
  const setupOvernightDevScenario = async () => {
    try {
      const testTime = { gameDayIndex: gameTime.gameDayIndex, totalMinutesOfDay: 23 * 60 + 45 }
      const selectedLoadId = loads.some((load) => load.id === 'DOC113') ? 'DOC113' : (loads[0]?.id || 'DOC001')
      const preset = await createDevPreset('overnight-delivery', { gameTime: testTime, currentLoads: loads, currentDrivers: drivers, currentRuntimePositions: runtimePositions, currentCarriers: carriers, selectedLoadId })
      setStage(preset.stage)
      setSelectedMarket(preset.selectedMarket)
      setLoads([...preset.loads, ...loads.filter((load) => !preset.loads.some((item) => item.id === load.id)), ...seedLoads.filter((seed) => !preset.loads.some((item) => item.id === seed.id) && !loads.some((item) => item.id === seed.id))])
      setDrivers(preset.drivers)
      if (preset.carriers) setCarriers(preset.carriers)
      setRuntimePositions(preset.runtimePositions)
      setRuntimeProgressByDriver(preset.runtimeProgressByDriver || (Number.isFinite(preset.runtimeProgress) ? { marcus: preset.runtimeProgress } : {}))
      setGameTime(testTime)
      setSimulationSpeed(1)
      setIsGameClockPaused(true)
    } catch (error) {
      console.error('DEV overnight scenario unavailable:', error)
    }
  }
  const applySelectedDevPreset = async (name, selectedLoadId) => { try { const preset = await createDevPreset(name, { gameTime, currentLoads: loads, currentDrivers: drivers, currentRuntimePositions: runtimePositions, currentCarriers: carriers, selectedLoadId }); setStage(preset.stage); setSelectedMarket(preset.selectedMarket); setLoads([...preset.loads, ...loads.filter((load) => !preset.loads.some((item) => item.id === load.id)), ...seedLoads.filter((seed) => !preset.loads.some((item) => item.id === seed.id) && !loads.some((item) => item.id === seed.id))]); setDrivers(preset.drivers); if (preset.carriers) setCarriers(preset.carriers); setRuntimePositions(preset.runtimePositions); setRuntimeProgressByDriver(preset.runtimeProgressByDriver || (Number.isFinite(preset.runtimeProgress) ? { marcus: preset.runtimeProgress } : {})) } catch (error) { console.error('DEV preset route unavailable:', error) } }
  void applyDevPreset
  const runMajorTransition = (kind, action) => {
    if (majorTransitionLockRef.current) return

    majorTransitionLockRef.current = true

    majorTransitionTimersRef.current.forEach((timer) =>
      window.clearTimeout(timer)
    )
    majorTransitionTimersRef.current = []

    const coverMs = 260
    const hiddenMountMs = kind === 'operations' ? 620 : 360
    const revealMs = 460

    // Phase 1 — smoothly cover the outgoing scene.
    setMajorTransition({ kind, phase: 'cover' })

    const stageSwapTimer = window.setTimeout(() => {
      // Phase 2 — stay completely covered while the destination mounts.
      setMajorTransition({ kind, phase: 'hold' })

      action?.()

      // Wait through two browser paint opportunities before starting
      // the concealed mount timer. This keeps MapLibre/layout work
      // away from the visible reveal animation.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const revealTimer = window.setTimeout(() => {
            // Phase 3 — destination should now be settled underneath.
            setMajorTransition({ kind, phase: 'reveal' })

            const finishTimer = window.setTimeout(() => {
              setMajorTransition(null)
              majorTransitionLockRef.current = false
              majorTransitionTimersRef.current = []
            }, revealMs)

            majorTransitionTimersRef.current.push(finishTimer)
          }, hiddenMountMs)

          majorTransitionTimersRef.current.push(revealTimer)
        })
      })
    }, coverMs)

    majorTransitionTimersRef.current.push(stageSwapTimer)
  }

  const resumeSave = (slotId) => {
    const saved = loadGame(slotId)
    if (!saved) return

    runMajorTransition('operations', () => {
      setActiveSaveSlot(slotId)
      setActiveSaveSlotId(slotId)
      hydrateSavedOperation(saved)
      setHasExistingOperation(true)
      setStage(saved.stage && !['start', 'market', 'dayOneIntro'].includes(saved.stage) ? saved.stage : 'game')
    })
  }

  const startNewOperation = (preferredSlotId = null) => {
    const used = new Set(saveSlots.map((slot) => slot.id))

    const preferredAvailable =
      preferredSlotId &&
      SAVE_SLOT_IDS.includes(preferredSlotId) &&
      !used.has(preferredSlotId)

    const slotId = preferredAvailable
      ? preferredSlotId
      : SAVE_SLOT_IDS.find((id) => !used.has(id))

    if (!slotId) return

    runMajorTransition('forward', () => {
      // CS2.0B.5.3.1.1 — a new operation must be a hard state boundary.
      // Clear the destination slot first so no prior/partial snapshot can leak
      // driver roster, workday/HOS, runtime position, messages, or banking into
      // the new career before CarrierSource activation.
      savePersistenceAuthorityRef.current.allowSlot(slotId)
      clearSave(slotId)
      lifecycleSaveSignatureRef.current = ''
      resetOperationState()
      setActiveSaveSlot(slotId)
      setActiveSaveSlotId(slotId)
      setHasExistingOperation(true)
      setResumeStage('careerSetup')
      setStage('careerSetup')
    })
  }
  const deleteSaveSlot = (slotId) => {
    savePersistenceAuthorityRef.current.revokeSlot(slotId)
    invalidatePendingAutosaveForSlot({
      slotId,
      latestSnapshotRef: latestAutosaveRef,
      timerRef: autosaveTimerRef,
      timerSlotRef: autosaveTimerSlotRef,
      cancelTimer: clearTimeout,
    })

    const remainingSlots = getSaveSlots().filter((slot) => slot.id !== slotId)
    const deletingActiveSlot = activeSaveSlotId === slotId
    const nextSlotId = deletingActiveSlot ? (remainingSlots[0]?.id || null) : activeSaveSlotId
    if (deletingActiveSlot) {
      if (nextSlotId) setActiveSaveSlot(nextSlotId)
      else clearActiveSaveSlot()
    }

    clearSave(slotId)
    const nextSlots = getSaveSlots()
    setSaveSlots(nextSlots)
    setHasExistingOperation(nextSlots.length > 0)

    if (deletingActiveSlot) {
      setActiveSaveSlotId(nextSlotId)
      const nextSaved = loadGame(nextSlotId)
      if (nextSaved) hydrateSavedOperation(nextSaved)
      else {
        resetOperationState()
        setResumeStage(null)
      }
    }
  }
  const resetGame = () => {
    if (activeSaveSlotId) deleteSaveSlot(activeSaveSlotId)
    window.location.reload()
  }

  const persistFirstDayProgress = (nextProgress) => {
    const snapshot = latestAutosaveRef.current
    if (!snapshot || snapshot.slotId !== activeSaveSlotId) return false
    const next = normalizeFirstDayProgress({ ...snapshot.state.firstDay, ...nextProgress, flowVersion: 2 })
    if (!next) return false
    const state = { ...snapshot.state, firstDay: next }
    if (!persistIfAuthorized(savePersistenceAuthorityRef.current, saveGame, state, activeSaveSlotId)) return false
    latestAutosaveRef.current = { slotId: activeSaveSlotId, state }
    setFirstDay(next)
    return true
  }

  const returnToTitle = () => {
    if (onReturnToStartup) {
      const snapshot = latestAutosaveRef.current
      if (!snapshot || !persistIfAuthorized(savePersistenceAuthorityRef.current, saveGame, snapshot.state, snapshot.slotId)) return
      if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
      onReturnToStartup()
      return
    }
    runMajorTransition('back', () => {
      setResumeStage('game')
      setStage('start')
    })
  }

  // AV2.18.1 dev shortcut: restart Day 1 planning at 6:00 AM while
  // preserving the accepted carrier relationship, signed agreement, profile,
  // and carrier-provided driver roster. This is intentionally test-only state.
  const resetDayAfterCarrierApproval = () => {
    const activeCarriers = carriers.filter((carrier) => carrier.status === 'active')
    if (!activeCarriers.length) return false

    const nextLoads = seedLoads.map((load) => ({ ...load }))
    const nextDrivers = reconcileActiveCarrierDrivers([], carriers).map((driver) => ({
      ...driver,
      status: 'available',
      assignedLoadId: null,
      queuedLoadIds: [],
      idleSinceGameMinute: null,
      idleTargetLocationId: null,
      idleRouteStatus: null,
      idleRouteGeometry: null,
      idleRouteStartGameMinute: null,
      idleRouteDurationMinutes: null,
    }))
    const nextPositions = {}
    nextDrivers.forEach((driver) => {
      const home = mapLocations.find((location) => location.id === driver.homeBaseLocationId)
      if (home) nextPositions[driver.id] = { longitude: home.longitude, latitude: home.latitude }
    })

    setGameTime({ gameDayIndex: 0, totalMinutesOfDay: 360 })
    setLoads(nextLoads)
    setDrivers(nextDrivers)
    setRuntimePositions(nextPositions)
    setRuntimeProgressByDriver({})
    setPlannedRoute(null)
    setSimulationSpeed(1)
    setIsGameClockPaused(false)
    setSeenLedgerReceivableIds([])
    setSeenLedgerPaymentReceivedIds([])
    setLedgerWorkflowByLoadId({})
    setLedgerBanking(createInitialLedgerBanking())
    setEmailMessages((current) => current.filter((message) => /application approved|agreement/i.test(`${message.subject || ''} ${message.body || ''}`)))
    setDriverMessages((current) => current.filter((message) => message.id === 'marcus-intro' || String(message.id || '').startsWith('marcus-intro-')))
    setBusinessDocuments((current) => current.filter((document) => document.type === 'dispatch-agreement'))
    setDayLoop({ ...DEFAULT_DAY_LOOP_STATE, operationDay: 1, phase: 'operating', currentStartGameDayIndex: 0, report: null, history: [] })
    setPlayerProgression({ ...DEFAULT_PLAYER_PROGRESSION })
    return true
  }

  const initializeEmployeeCareerForDev = () => {
    const employeeGameTime = { gameDayIndex: 0, totalMinutesOfDay: 360 }
    const initialized = initializeMetrolineEmployeeOperation({ gameTime: employeeGameTime })
    const nextCarrierCareer = buildCarrierCareerById(initialized.carriers, {}, {})
    if (nextCarrierCareer.metroline) {
      nextCarrierCareer.metroline = {
        ...nextCarrierCareer.metroline,
        relationshipState: CARRIER_RELATIONSHIP_STATES.ACTIVE,
        applicationState: CARRIER_APPLICATION_STATES.NONE,
        agreementAccepted: false,
        agreementAcceptedGameMinute: null,
      }
    }

    setCareer(initialized.career)
    setSelectedMarket('new-york')
    setGameTime(employeeGameTime)
    setLoads(seedLoads.map((load) => ({ ...load })))
    setCarriers(initialized.carriers)
    setDrivers(initialized.drivers)
    setRuntimePositions(initialized.runtimePositions)
    setRuntimeProgressByDriver({})
    setPlannedRoute(null)
    setCarrierApplicationsById(initialized.carrierApplicationsById)
    setCarrierCareerById(nextCarrierCareer)
    setBusinessDocuments(initialized.businessDocuments)
    setDispatcherProfile({ displayName: 'P2.4 Employee Test', homeMarket: 'New York Metro', created: true, devGenerated: true })
    setEmailMessages([])
    setDriverMessages([])
    setLedgerWorkflowByLoadId({})
    setLedgerBanking(createInitialLedgerBanking())
    setSeenLedgerReceivableIds([])
    setSeenLedgerPaymentReceivedIds([])
    setDayLoop({ ...DEFAULT_DAY_LOOP_STATE })
    setPlayerProgression({ ...DEFAULT_PLAYER_PROGRESSION })
    setGameEntryScreen(null)
    setSimulationSpeed(1)
    setIsGameClockPaused(true)
    setResumeStage('game')
    setHasExistingOperation(true)
    setStage('game')
    return true
  }

  const activateCarrier = (carrierId = 'metroline') => {
    const nextCarriers = carriers.map((carrier) => carrier.id === carrierId ? { ...carrier, status: 'active' } : carrier)
    const activatedCarrier = nextCarriers.find((carrier) => carrier.id === carrierId)
    setCarriers(nextCarriers)
    setCarrierCareerById((current) => ({
      ...current,
      [carrierId]: mergeCarrierCareerEntry(current[carrierId], activatedCarrier, { relationshipState: CARRIER_RELATIONSHIP_STATES.ACTIVE }),
    }))
    setDrivers((currentDrivers) => {
      const operational = establishCarrierOperationalContext({
        carriers,
        drivers: currentDrivers,
        runtimePositions: {},
        carrierId,
        gameTime,
      })
      setRuntimePositions((currentPositions) => establishCarrierOperationalContext({
        carriers,
        drivers: operational.drivers,
        runtimePositions: currentPositions,
        carrierId,
        gameTime,
      }).runtimePositions)
      return operational.drivers
    })
  }

  // B.5.4D.2.1 — Metroline Tutorial Fast-Track
  const applyCarrier = (carrierId = 'metroline') => {
    const carrier = carriers.find((item) => item.id === carrierId)
    if (!carrier) return false

    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const isFirstDayMetrolineFastTrack =
      carrierId === 'metroline' &&
      Number(dayLoop?.operationDay || 1) === 1 &&
      !carrierApplicationsById?.[carrierId]

    if (isFirstDayMetrolineFastTrack) {
      setCarrierApplicationsById((current) =>
        current[carrierId]
          ? current
          : {
              ...current,
              [carrierId]: {
                status: 'OFFER_RECEIVED',
                submittedGameMinute: now,
                responseGameMinute: now,
                fastTrackedByMentor: true,
              },
            }
      )

      setCarrierCareerById((current) => ({
        ...current,
        [carrierId]: mergeCarrierCareerEntry(current[carrierId], carrier, {
          applicationState: CARRIER_APPLICATION_STATES.APPROVED,
        }),
      }))

      setEmailMessages((current) =>
        current.some((message) => message.id === `${carrierId}-application-approved`)
          ? current
          : [
              ...current,
              {
                id: `${carrierId}-application-approved`,
                type: 'carrier-application-offer',
                carrierId,
                senderOverride: 'Jordan Blake · Dispatch Mentor',
                subject: 'Metroline got back to me',
                bodyOverride:
                  `Hey,

I know waiting to hear back on a carrier application can take a while, especially when you are just getting started. I know a few people over at Metroline, so I was able to get your application in front of the right person.

They accepted it.

I attached a copy of Metroline's operating agreement. Take your time with it — this is where you will see what they expect from you as their dispatcher. Review the agreement and sign it when you are comfortable with the relationship.

Future carrier applications will not always move this quickly, so do not get too used to me pulling strings.

Thanks,
Jordan Blake
Dispatch Mentor`,
                receivedGameMinute: now + 0.01,
                read: false,
              },
            ]
      )

      return true
    }

    setCarrierApplicationsById((current) =>
      current[carrierId]
        ? current
        : {
            ...current,
            [carrierId]: {
              status: 'PENDING',
              submittedGameMinute: now,
              responseGameMinute: now + 10,
            },
          }
    )

    setCarrierCareerById((current) => ({
      ...current,
      [carrierId]: mergeCarrierCareerEntry(current[carrierId], carrier, {
        applicationState: CARRIER_APPLICATION_STATES.PENDING,
      }),
    }))

    return true
  }

  const acceptCarrierAgreement = (carrierId = 'metroline') => {
    const carrier = carriers.find((item) => item.id === carrierId)
    if (!carrier) return false

    // B.5.4C.3.2.1 — Signed Agreement Re-entry Guard
    const alreadyAccepted =
      Boolean(carrierCareerById?.[carrierId]?.agreementAccepted) ||
      businessDocuments.some(
        (document) =>
          document.id === agreementId &&
          document.status === 'SIGNED'
      )

    if (alreadyAccepted) return false

    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const signedBy =
      dispatcherProfile?.dispatcherName ||
      dispatcherProfile?.displayName ||
      'Authorized Dispatcher'
    const rules = getAgreementRules(carrier)
    setCarrierApplicationsById((current) => ({ ...current, [carrierId]: { ...current[carrierId], status: 'ACCEPTED', acceptedGameMinute: now } }))
    setCarrierCareerById((current) => ({
      ...current,
      [carrierId]: mergeCarrierCareerEntry(current[carrierId], carrier, {
        relationshipState: CARRIER_RELATIONSHIP_STATES.ACTIVE,
        applicationState: CARRIER_APPLICATION_STATES.ACCEPTED,
        agreementAccepted: true,
        agreementAcceptedGameMinute: now,
      }),
    }))
    activateCarrier(carrierId)

    const agreementId = `${carrierId}-dispatch-agreement`
    const equipment = carrierId === 'metroline' ? 'Dry Van / General Freight.' : (rules.equipmentScope.length ? `${rules.equipmentScope.join(', ')}.` : 'Carrier-approved equipment.')
    const rateGoal = Number.isFinite(rules.minimumRatePerLoadedMile) ? `Target $${rules.minimumRatePerLoadedMile.toFixed(2)}+ per loaded mile.` : 'Use sound rate judgment for available freight.'
    setBusinessDocuments((current) => current.some((document) => document.id === agreementId) ? current : [...current, {
      id: agreementId,
      type: 'dispatch-agreement',
      title: `${carrier.name} — Dispatch Operating Agreement`,
      carrierId,
      carrierName: carrier.name,
      status: 'SIGNED',
      signedBy,
      signedGameMinute: now,
      goals: [
        rateGoal,
        equipment,
        `Preferred region: ${rules.preferredRegion}.`,
        'Protect pickup and delivery appointments.',
        'Keep the driver informed before dispatch.',
        `Dispatch fee: ${rules.percentage}% of carrier gross.`,
      ],
      priorities: ['On-time service', 'Rate quality', 'Reasonable deadhead', 'Driver communication', 'Smart truck positioning'],
      terms: { ...carrier.dispatchAgreement, dispatchFee: `${rules.percentage}% of carrier gross` },
      acknowledgment: `These are ${carrier.name}’s operating goals, not absolute rules. Freight markets change throughout the day. Use reasonable judgment when balancing carrier goals, driver preferences, appointment requirements, and available freight.`,
    }])

    // B.5.3.1.3 — agreement acceptance activates the carrier relationship and
    // roster only. Driver communication begins with an actual operational event,
    // not simply because the dispatcher signed a carrier agreement.
    return true
  }



  // CS2.0B.4.1.2 — clock-in is a real scheduled event. Agenda owns the
  // workday; Messages only confirms that the driver actually came on duty.
  useEffect(() => {
    if (!hydrated || dayLoop.phase !== 'operating') return
    const dayIndex = Number(gameTime.gameDayIndex || 0)
    const now = dayIndex * 1440 + Number(gameTime.totalMinutesOfDay || 0)
    const operationDay = Number(dayLoop.operationDay || 1)
    const activeCarrierIds = new Set(carriers.filter((carrier) => carrier.status === 'active').map((carrier) => carrier.id))

    setDriverMessages((current) => {
      let changed = false
      const next = [...current]
      drivers.forEach((driver) => {
        if (!driver?.id || !activeCarrierIds.has(driver.carrierId)) return
        const workday = driver.workdayByDay?.[String(dayIndex)] || driver.workdayByDay?.[dayIndex]
        const startMinutes = Number(workday?.startMinutes)
        if (!Number.isFinite(startMinutes)) return
        const scheduledClockIn = dayIndex * 1440 + startMinutes
        if (now < scheduledClockIn) return
        const messageId = `driver-clock-in-${driver.id}-day-${operationDay}`
        if (next.some((message) => message.id === messageId)) return
        next.push({
          id: messageId,
          driverId: driver.id,
          sender: driver.fullName || driver.name || 'Driver',
          senderRole: 'Driver',
          direction: 'inbound',
          body: getClockInMessage(driver, operationDay),
          messageIntent: 'clock-in',
          requiresResponse: false,
          receivedGameMinute: scheduledClockIn + 0.01,
          read: false,
        })
        changed = true
      })
      return changed ? next : current
    })
  }, [hydrated, dayLoop.phase, dayLoop.operationDay, gameTime.gameDayIndex, gameTime.totalMinutesOfDay, drivers, carriers])

  useEffect(() => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    Object.entries(carrierApplicationsById).forEach(([carrierId, application]) => {
      if (application.status === 'PENDING' && now >= application.responseGameMinute) {
        const carrier = carriers.find((item) => item.id === carrierId)
        if (!carrier) return
        setCarrierApplicationsById((current) => ({ ...current, [carrierId]: { ...current[carrierId], status: 'OFFER_RECEIVED' } }))
        setCarrierCareerById((current) => ({
          ...current,
          [carrierId]: mergeCarrierCareerEntry(current[carrierId], carrier, { applicationState: CARRIER_APPLICATION_STATES.APPROVED }),
        }))
        const approvalBody = carrierId === 'metroline'
          ? 'Hello,\n\nYour dispatch service application for Metroline Transport has been approved.\n\nReview the attached operating agreement before adding Metroline to your active carrier roster. It covers the carrier’s shift goals, operating expectations, and dispatch priorities.\n\nOnce accepted, Metroline Transport and its assigned driver will become available in your operation.\n\nCarrierSource\nCarrier Network Services'
          : `Hello,\n\nYour dispatch service application for ${carrier.name} has been approved.\n\nReview the attached operating agreement before adding ${carrier.name} to your active carrier roster. It covers the carrier’s shift goals, operating expectations, and dispatch priorities.\n\nOnce accepted, ${carrier.name} and its assigned driver roster will become available in your operation.\n\nCarrierSource\nCarrier Network Services`
        setEmailMessages((current) => current.some((message) => message.id === `${carrierId}-application-approved`) ? current : [...current, {
          id: `${carrierId}-application-approved`,
          type: 'carrier-application-offer',
          carrierId,
          senderOverride: 'CarrierSource',
          subject: `${carrier.name} — Application Approved`,
          bodyOverride: approvalBody,
          receivedGameMinute: application.responseGameMinute,
          read: false,
        }])
      }
    })
  }, [gameTime, carrierApplicationsById, carriers])




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
    // P2.3.3 — Freight ticks settle without writing identical runtime state.
    reconcileFreightMovement({
      gameTime, loads, drivers, runtimePositions, runtimeProgressByDriver,
      locations: mapLocations,
    }, { setLoads, setRuntimePositions, setRuntimeProgressByDriver })
  }, [gameTime, loads, drivers, runtimePositions, runtimeProgressByDriver])

  useEffect(() => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    // Advance operational pickup phases from the authoritative game clock.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoads((current) => current.map((load) => advanceDockLifecycle(load, now, { drivers, loads: current, gameDayIndex: gameTime.gameDayIndex })))
  }, [gameTime, drivers])

  // Recovery path for legacy saves/dev states that still enter the old
  // intermediate `delivered` state. Normal POD approval now closes out
  // atomically through approvePodAndCloseout().
  useEffect(() => {
    const completed = loads.find((load) => load.tripStatus === 'delivered' && load.assignedDriverId)
    if (!completed) return
    const delivery = mapLocations.find((location) => location.id === completed.deliveryLocationId)
    if (!delivery) return

    const driverId = completed.assignedDriverId
    if (!canAcquireDriverMovement({ driver: drivers.find((item) => item.id === driverId), loads, gameTime }, 'freight', completed.id)) return
    const queuedBeforePromotion = getDriverQueue(loads, driverId)
    const nextQueued = queuedBeforePromotion[0] || null

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoads((current) => {
      const closed = current.map((load) => load.id === completed.id && load.tripStatus === 'delivered'
        ? { ...load, tripStatus: 'completed', status: 'completed', completedDriverId: driverId, assignedDriverId: null, queuePosition: null, completedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay, completedOperationDay: dayLoop.operationDay }
        : load)
      return promoteNextQueuedLoad(closed, driverId, gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay).loads
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
          idleTargetLocationId: null,
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
  }, [loads, drivers, gameTime, dayLoop.operationDay])


  // B.4.2.4.2: shift-end staging is an explicit per-driver/per-date plan.
  // The scheduled SHIFT END is the trigger; midnight has zero movement authority.
  // Active freight may finish beyond shift end, then the driver follows the saved
  // shift-end staging plan. Existing overnight* data keys remain for save compatibility.
  useEffect(() => {
    if (!hydrated || stage !== 'game' || dayLoop.phase !== 'operating') return undefined
    const dayIndex = gameTime.gameDayIndex
    const now = dayIndex * 1440 + gameTime.totalMinutesOfDay
    drivers.forEach((driver) => {
      if (!canAcquireDriverMovement({ driver, loads, gameTime }, 'idle')) return
      if (driver.idleRouteStatus === 'calculating' && driver.idleTargetLocationId) {
        requestIdleRoute(driver, runtimePositions[driver.id])
        return
      }
      const ownership = resolveDriverWorkdayOwnership({ driver, loads, gameTime })
      const workdayOwnerDay = ownership.ownerDayIndex
      const workday = ownership.workday
      if (driver.overnightAppliedDayIndex === workdayOwnerDay) return
      if (!workday || !Number.isFinite(Number(workday.endMinutes))) return
      const endDayOffset = Number.isFinite(Number(workday.endDayOffset)) ? Number(workday.endDayOffset) : (Number(workday.endMinutes) <= Number(workday.startMinutes) ? 1 : 0)
      const endAbsolute = workdayOwnerDay * 1440 + Number(workday.endMinutes) + endDayOffset * 1440
      if (now < endAbsolute) return

      // P2.3.2A — Shift-End Execution Truth Fix
      // The mobile Shift End planner stores its answer on the DRIVER. The legacy
      // scheduler stored overnight intent on the WORKDAY. Execution must honor
      // the driver's queued plan first, while retaining legacy-save fallback.
      const queuedPlanOwnsThisWorkday =
        Number(driver.shiftEndPlanDayIndex) === Number(workdayOwnerDay) &&
        Boolean(driver.shiftEndLocationId)

      const mode = queuedPlanOwnsThisWorkday
        ? (driver.shiftEndPlanType === 'yard' ? 'yard' : 'truck-stop')
        : workday.overnightMode

      if (!mode) return

      const origin = runtimePositions[driver.id]
      if (!origin) return

      const requestedTargetId = queuedPlanOwnsThisWorkday
        ? driver.shiftEndLocationId
        : workday.overnightTargetLocationId

      const requestedTarget = requestedTargetId
        ? mapLocations.find((location) => location.id === requestedTargetId)
        : null

      const targetId = requestedTarget
        ? requestedTarget.id
        : (mode === 'yard' ? 'metroline-yard' : getOvernightTruckStopId(origin))

      const target = mapLocations.find((location) => location.id === targetId)
      if (!target) return

      setDrivers((current) => current.map((item) => item.id === driver.id && canAcquireDriverMovement({ driver: item, loads: movementStateRef.current.loads, gameTime: movementStateRef.current.gameTime }, 'idle') ? {
        ...item,
        overnightAppliedDayIndex: workdayOwnerDay,
        overnightMode: mode,
        idleTargetLocationId: targetId,
        idleRouteStatus: 'calculating',
        idleSinceGameMinute: now,
      } : item))
    })
  }, [hydrated, stage, dayLoop.phase, drivers, loads, gameTime, runtimePositions])


  // CS2.0B.4.2.4.4: Shift End presentation expires when the driver's next
  // scheduled workday actually begins. Preserve the staged physical position,
  // but release the runtime staging state so normal freight presentation can
  // resume (no lingering moon badge or staging route authority).
  useEffect(() => {
    if (!hydrated || stage !== 'game' || dayLoop.phase !== 'operating') return
    const dayIndex = gameTime.gameDayIndex
    const minuteOfDay = gameTime.totalMinutesOfDay
    setDrivers((current) => current.map((driver) => {
      if (driver.idleRouteStatus !== 'arrived') return driver
      if (!Number.isFinite(Number(driver.overnightAppliedDayIndex)) || Number(driver.overnightAppliedDayIndex) >= dayIndex) return driver
      const workday = driver.workdayByDay?.[String(dayIndex)] || driver.workdayByDay?.[dayIndex]
      const start = Number(workday?.startMinutes)
      if (!Number.isFinite(start) || minuteOfDay < start) return driver
      return {
        ...driver,
        idleRouteStatus: null,
        idleRouteGeometry: null,
        idleRouteStartGameMinute: null,
        idleRouteDurationMinutes: null,
        idleTargetLocationId: null,
        overnightMode: null,
      }
    }))
  }, [hydrated, stage, dayLoop.phase, gameTime.gameDayIndex, gameTime.totalMinutesOfDay])


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
    // P2.3.4 — staging/idle use the same owner decision as freight and map.
    const arrivedDriverIds = reconcileIdleMovement({
      drivers, loads, gameTime, runtimePositions,
      suspendedDriverIds: suspendedIdleDriversRef.current,
    }, {
      setRuntimePositions,
      onResume: (driver) => {
        setDrivers((current) => current.map((item) => item.id === driver.id ? { ...item, idleRouteStatus: 'calculating' } : item))
      },
    })
    if (arrivedDriverIds.size) setDrivers((current) => current.map((driver) => {
      if (!arrivedDriverIds.has(driver.id)) return driver
      const target = mapLocations.find((location) => location.id === driver.idleTargetLocationId)
      return {
        ...driver,
        idleRouteStatus: 'arrived',
        idleRouteGeometry: null,
        idleRouteStartGameMinute: null,
        idleRouteDurationMinutes: null,
        lastKnownLocationId: driver.idleTargetLocationId,
        longitude: target?.longitude ?? driver.longitude,
        latitude: target?.latitude ?? driver.latitude,
        hours: {
          ...(driver.hours || {}),
          status: 'off-duty',
          offDutySinceGameMinute: now,
        },
      }
    }))
  }, [gameTime, drivers, loads, runtimePositions])


  // CS2.0B.5.1 — Driver Duty Clock Foundation. Agenda clock-in owns the
  // beginning of the 14-hour duty window. Actual movement consumes Driving;
  // all active-duty elapsed time consumes Duty. This slice is observational:
  // it does not block dispatch or add rest/reset legality yet.
  useEffect(() => {
    if (!hydrated || stage !== 'game') return
    const activeCarrierIds = new Set(carriers.filter((carrier) => carrier.status === 'active').map((carrier) => carrier.id))
    setDrivers((current) => {
      let changed = false
      const next = current.map((driver) => {
        // HOS has no authority until the carrier relationship is actually
        // activated. A prospect/pending carrier can never put its driver on
        // duty merely because stale schedule data exists.
        if (!activeCarrierIds.has(driver.carrierId)) return driver
        const updated = advanceDriverHours(driver, loads, gameTime)
        if (updated !== driver) changed = true
        return updated
      })
      return changed ? next : current
    })
  }, [hydrated, stage, gameTime.gameDayIndex, gameTime.totalMinutesOfDay, loads, carriers])

  const firstDayTeachingPaused = isFirstDayTeachingPaused(firstDay, loads)

  useEffect(() => {
    if (stage !== 'game' || isGameClockPaused || firstDayTeachingPaused) return undefined
    const timer = setInterval(() => setGameTime((time) => {
      const nextMinutes = time.totalMinutesOfDay + 1
      return nextMinutes >= 1440
        ? { gameDayIndex: time.gameDayIndex + 1, totalMinutesOfDay: 0 }
        : { ...time, totalMinutesOfDay: nextMinutes }
    }), 3000 / simulationSpeed)
    return () => clearInterval(timer)
  }, [stage, isGameClockPaused, simulationSpeed, firstDayTeachingPaused])


  // B.4.2.2: operation-day identity follows the calendar after midnight without
  // moving the world clock. This is bookkeeping only; runtime positions, routes,
  // assignments, load lifecycle, and appointments retain their existing state.
  useEffect(() => {
    if (!hydrated || stage !== 'game') return
    setDayLoop((current) => {
      const expectedOperationDay = Number(gameTime.gameDayIndex || 0) + 1
      if (current.operationDay === expectedOperationDay && current.currentStartGameDayIndex === gameTime.gameDayIndex) return current
      return {
        ...current,
        operationDay: expectedOperationDay,
        currentStartGameDayIndex: gameTime.gameDayIndex,
      }
    })
  }, [hydrated, stage, gameTime.gameDayIndex])


  // B.4.4.3.2 — End Operations can request a controlled overnight advance,
  // but the live clock still owns every minute and the midnight boundary.
  // At the fixed 07:00 DOC OS operating start, pause and surface the briefing.
  useEffect(() => {
    if (!hydrated || stage !== 'game' || dayLoop.phase !== 'operating') return
    const history = Array.isArray(dayLoop.history) ? dayLoop.history : []
    const latestReport = history[history.length - 1]
    if (!latestReport || !Number.isFinite(dayLoop.lastClosedGameDayIndex)) return
    // Only an explicit pending overnight target may open the briefing. Once the
    // target is consumed at 07:00 it is cleared, so BEGIN OPERATIONS cannot
    // immediately re-trigger the same briefing from historical report data.
    if (!Number.isFinite(dayLoop.overnightAdvanceTargetGameDayIndex) || !Number.isFinite(dayLoop.overnightAdvanceTargetMinutes)) return
    const targetDay = Number(dayLoop.overnightAdvanceTargetGameDayIndex)
    const targetMinutes = Number(dayLoop.overnightAdvanceTargetMinutes)
    const reachedStart = gameTime.gameDayIndex > targetDay
      || (gameTime.gameDayIndex === targetDay && gameTime.totalMinutesOfDay >= targetMinutes)
    if (!reachedStart) return
    setDayLoop((current) => ({
      ...current,
      phase: 'briefing',
      report: latestReport,
      lastBriefedGameDayIndex: gameTime.gameDayIndex,
      overnightAdvanceTargetGameDayIndex: null,
      overnightAdvanceTargetMinutes: null,
    }))
    setSimulationSpeed(1)
    setIsGameClockPaused(true)
  }, [hydrated, stage, dayLoop.phase, dayLoop.history, dayLoop.lastClosedGameDayIndex, dayLoop.lastBriefedGameDayIndex, dayLoop.overnightAdvanceTargetGameDayIndex, dayLoop.overnightAdvanceTargetMinutes, gameTime.gameDayIndex, gameTime.totalMinutesOfDay])

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
    // B.4.4.4.1 — closeout authority belongs to the current operating session,
    // not simply the calendar date. A prior closeout may legitimately share this
    // calendar date when End Operations occurred after midnight and the next
    // operating session began at 07:00. Once that morning briefing has been
    // consumed, a later closeout on the same date must still be allowed.
    const closedThisUnconsumedSession = dayLoop.lastClosedGameDayIndex === gameTime.gameDayIndex
      && dayLoop.lastBriefedGameDayIndex !== gameTime.gameDayIndex
    if (!closeStatus.canEnd || dayLoop.phase !== 'operating' || closedThisUnconsumedSession) return

    const baseReport = createDayReport({
      operationDay: dayLoop.operationDay,
      currentStartGameDayIndex: dayLoop.currentStartGameDayIndex,
      gameTime,
      loads,
      receivables,
      carriers,
    })
    const reviewedGameMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const operatingAccountBalance = getLedgerAccountSummary(ledgerBanking).availableBalance
    const careerReviewsByCarrierId = {}
    const report = {
      ...baseReport,
      operatingAccountBalance,
      carrierBreakdown: (baseReport.carrierBreakdown || []).map((result) => {
        const carrier = carriers.find((item) => item.id === result.carrierId)
        const reviewResult = applyCarrierPerformanceReview({
          career: carrierCareerById[result.carrierId] || {},
          carrier,
          breakdown: result,
          operationDay: dayLoop.operationDay,
          reviewedGameMinute,
        })
        careerReviewsByCarrierId[result.carrierId] = reviewResult
        return { ...result, careerReview: reviewResult.review }
      }),
    }

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
    setCarriers((current) => current.map((carrier) => {
      const result = report.carrierBreakdown?.find((item) => item.carrierId === carrier.id)
      return result ? { ...carrier, relationshipScore: result.relationshipAfter } : carrier
    }))
    setCarrierCareerById((current) => {
      const next = { ...current }
      report.carrierBreakdown?.forEach((result) => {
        const carrier = carriers.find((item) => item.id === result.carrierId)
        const reviewResult = applyCarrierPerformanceReview({
          career: current[result.carrierId] || {},
          carrier,
          breakdown: result,
          operationDay: dayLoop.operationDay,
          reviewedGameMinute,
        })
        next[result.carrierId] = mergeCarrierCareerEntry(current[result.carrierId], carrier, reviewResult.patch)
      })
      return next
    })

    Object.entries(careerReviewsByCarrierId).forEach(([carrierId, reviewResult]) => {
      const review = reviewResult?.review
      if (!reviewResult?.isNewReview || !review) return
      const carrier = carriers.find((item) => item.id === carrierId)
      if (!carrier) return
      const statusChanged = review.relationshipStateAfter !== review.relationshipStateBefore
      const noteworthy = review.strikeIssued || review.strikeForgiven || review.levelUp || statusChanged
      if (!noteworthy) return
      const subject = review.strikeIssued
        ? `${carrier.name} — Service Warning`
        : review.levelUp
          ? `${carrier.name} — Account Level ${review.levelAfter}`
          : `${carrier.name} — Account Standing Updated`
      const statusLabel = getCarrierRelationshipStateLabel(review.relationshipStateAfter)
      const warningLine = review.strikeIssued ? `\nService warning: ${review.strikeReason}. Strike ${review.strikeCountAfter} is now on the account.\n` : review.strikeForgiven ? `\nRecovery credit: one service strike was removed after a clean performance review.\n` : '\n'
      const levelLine = review.levelUp ? `\nAccount progression: Level ${review.levelBefore} → Level ${review.levelAfter}.\n` : ''
      const careerHeadline = review.strikeIssued
        ? `${carrier.name} has issued a service warning following Day ${dayLoop.operationDay}.`
        : review.levelUp
          ? `Your ${carrier.name} account advanced to Level ${review.levelAfter} following Day ${dayLoop.operationDay}.`
          : `Your Day ${dayLoop.operationDay} ${carrier.name} performance review has been posted.`
      const bodyOverride = `${careerHeadline}

Grade: ${review.grade}
Service windows: ${review.serviceWindowsMet}/${review.serviceWindowsTotal}
Relationship: ${review.relationshipBefore} → ${review.relationshipAfter} (${review.relationshipChange >= 0 ? '+' : ''}${review.relationshipChange})
Carrier XP: +${review.carrierXpGain}
Account status: ${statusLabel}${warningLine}${levelLine}
Open CarrierSource to review your full account history.`
      const messageId = `${carrierId}-career-review-${dayLoop.operationDay}`
      setEmailMessages((current) => current.some((message) => message.id === messageId) ? current : [...current, {
        id: messageId,
        type: 'carrier-performance-review',
        carrierId,
        senderOverride: 'CarrierSource',
        subject,
        bodyOverride,
        careerReview: {
          operationDay: dayLoop.operationDay,
          grade: review.grade,
          serviceWindowsMet: review.serviceWindowsMet,
          serviceWindowsTotal: review.serviceWindowsTotal,
          relationshipChange: review.relationshipChange,
          carrierXpGain: review.carrierXpGain,
          statusLabel,
          levelBefore: review.levelBefore,
          levelAfter: review.levelAfter,
          levelUp: review.levelUp,
          strikeIssued: review.strikeIssued,
          strikeForgiven: review.strikeForgiven,
          strikeCountAfter: review.strikeCountAfter,
        },
        receivedGameMinute: reviewedGameMinute,
        read: false,
      }])
    })

    // CS2.0B.4.1 — a normal closeout gets one human sign-off per active driver.
    // The driver does not restate hours, schedule, or completed stops.
    setDriverMessages((current) => {
      const next = [...current]
      drivers.forEach((driver) => {
        const messageId = `driver-signoff-${driver.id}-day-${dayLoop.operationDay}`
        if (next.some((message) => message.id === messageId)) return
        next.push({
          id: messageId,
          driverId: driver.id,
          sender: driver.fullName || driver.name || 'Driver',
          senderRole: 'Driver',
          direction: 'inbound',
          body: getEndOfDayMessage(driver, dayLoop.operationDay),
          messageIntent: 'end-of-day',
          requiresResponse: false,
          receivedGameMinute: reviewedGameMinute + 0.01,
          read: false,
        })
      })
      return next
    })

    setDayLoop((current) => ({
      ...current,
      phase: 'results',
      report,
      history: [...(current.history || []), report],
    }))
  }

  const continueToNextDayBriefing = () => {
    const report = dayLoop.report
    if (!report || dayLoop.phase !== 'results') return
    // B.4.4.3.2: the closeout itself still changes no world state. Continuing
    // starts a high-speed live-clock advance to the fixed 07:00 DOC OS start.
    // Existing simulation effects continue to own payments, routes, positions,
    // freight, messages, and the midnight calendar boundary along the way.
    setDayLoop((current) => ({
      ...current,
      phase: 'operating',
      lastClosedGameDayIndex: report.closeGameDayIndex,
      overnightAdvanceTargetGameDayIndex: report.nextStartGameDayIndex,
      overnightAdvanceTargetMinutes: report.nextStartMinutes,
      report: null,
    }))
    setSimulationSpeed(60)
    setIsGameClockPaused(false)
  }

  const beginNextOperationDay = () => {
    const report = dayLoop.report
    if (!report || dayLoop.phase !== 'briefing') return
    // The clock already reached this operation start naturally. Beginning the
    // briefing only dismisses the overlay; it never teleports time or freight.
    setDayLoop((current) => ({
      ...current,
      phase: 'operating',
      currentStartGameDayIndex: gameTime.gameDayIndex,
      report: null,
    }))
    setSimulationSpeed(1)
    setIsGameClockPaused(false)
    // The freight market continues from its own posting/expiration state across operation days.
  }

  return (
    <main className="app">
      <section className="phone-shell">
        {saveFailureMessage && (
          <div className="save-failure-banner" role="alert">
            <span>{saveFailureMessage}</span>
            <button type="button" onClick={() => setSaveFailureMessage('')} aria-label="Dismiss save warning">×</button>
          </div>
        )}
        {majorTransition && (
          <div
            className={`app-stage-transition ${majorTransition.phase} ${majorTransition.kind}`}
            aria-hidden="true"
          />
        )}

        {stage === 'loading' && !onWorkstationReady && <div className="workstation-opening" role="status"><span>METROLINE</span><strong>Opening your workstation…</strong></div>}
        {stage === 'start' && <StartOfficeBackdrop />}
        {stage === 'start' && (
          <StartScreen
            saveSlots={saveSlots}
            saveSlotIds={SAVE_SLOT_IDS}
            activeSaveSlotId={activeSaveSlotId}
            onResumeSave={resumeSave}
            onDeleteSave={deleteSaveSlot}
            onStartNew={startNewOperation}
          />
        )}
        {stage === 'careerSetup' && (
          <CareerSetupScreen
            profile={dispatcherProfile}
            onBack={() => runMajorTransition('back', () => {
              setResumeStage('careerSetup')
              setStage('start')
            })}
          />
        )}
        {stage === 'game' && (
          <Suspense
            fallback={onWorkstationReady ? null : <div className="workstation-opening" role="status"><span>METROLINE</span><strong>Opening your workstation…</strong></div>}
          >
            <MainGameScreen
            onWorkstationReady={onWorkstationReady}
            career={career}
            firstDay={firstDay}
            onFirstDayProgress={persistFirstDayProgress}
            selectedMarket={selectedMarket}
            initialPhoneOpen={Boolean(gameEntryScreen)}
            initialPhoneScreen={gameEntryScreen || 'home'}
            onInitialPhoneEntryConsumed={() => setGameEntryScreen(null)}
            gameTime={gameTime}
            setGameTime={setGameTime}
            loads={loads}
            setLoads={setLoads}
            drivers={drivers}
            carriers={carriers}
            dispatcherProfile={dispatcherProfile}
            onSaveDispatcherProfile={setDispatcherProfile}
            onActivateCarrier={activateCarrier}
            carrierApplicationsById={carrierApplicationsById}
            carrierCareerById={carrierCareerById}
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
            isGameClockPaused={isGameClockPaused || firstDayTeachingPaused}
            setGameClockPaused={setIsGameClockPaused}
            runtimePositions={runtimePositions}
            setRuntimePositions={setRuntimePositions}
            runtimeProgressByDriver={runtimeProgressByDriver}
            setRuntimeProgressByDriver={setRuntimeProgressByDriver}
            simulationSpeed={simulationSpeed}
            setSimulationSpeed={setSimulationSpeed}
            onApplyDevPreset={applySelectedDevPreset}
            onSetupOvernightDevScenario={setupOvernightDevScenario}
            onInitializeEmployeeCareer={initializeEmployeeCareerForDev}
            onResetGame={resetGame}
            onReturnToTitle={returnToTitle}
            onResetDayAfterCarrierApproval={resetDayAfterCarrierApproval}
            seenLedgerReceivableIds={seenLedgerReceivableIds}
            onOpenLedger={() => { const records = getReceivables(loads, carriers, ledgerWorkflowByLoadId); setSeenLedgerReceivableIds((current) => Array.from(new Set([...current, ...records.map((item) => item.loadId)]))); setSeenLedgerPaymentReceivedIds((current) => Array.from(new Set([...current, ...records.filter((item) => item.financialStatus === 'PAID').map((item) => item.loadId)]))) }}
            ledgerWorkflowByLoadId={ledgerWorkflowByLoadId}
            ledgerBanking={ledgerBanking}
            setLedgerWorkflowByLoadId={setLedgerWorkflowByLoadId}
            seenLedgerPaymentReadyIds={seenLedgerPaymentReceivedIds}
          />
          </Suspense>
        )}
      </section>
    </main>
  )
}

export default App
