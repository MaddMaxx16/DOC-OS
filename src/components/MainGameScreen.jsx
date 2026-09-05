import { useEffect, useState } from 'react'
import GameMap from './GameMap.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'
import OperationsBar from './OperationsBar.jsx'
import EndDaySheet from './EndDaySheet.jsx'
import DayResultsScreen from './DayResultsScreen.jsx'
import DayBriefingScreen from './DayBriefingScreen.jsx'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { logDocOsEvent } from '../utils/debugLogger.js'
import { getLedgerSummary, getReceivables } from '../utils/ledger.js'
import { PICKUP_WAIT_MINUTES } from '../data/pickupConfig.js'
import { getCurrentTutorialObjective } from '../utils/tutorialObjective.js'
import { getEndDayStatus } from '../utils/dayLoop.js'


function getEvaluationBufferMinutes(evaluation) {
  if (!evaluation) return null

  const arrival = evaluation.arrivalDay * 1440 + evaluation.arrivalMinutes
  const windowStart = evaluation.pickupDayIndex * 1440 + evaluation.pickupStart
  const windowEnd = evaluation.pickupDayIndex * 1440 + evaluation.pickupEnd

  if (arrival < windowStart) return windowStart - arrival
  if (arrival <= windowEnd) return windowEnd - arrival
  return windowEnd - arrival
}

function formatEvaluationBuffer(minutes) {
  if (!Number.isFinite(minutes)) return '—'
  if (minutes < 0) return `${Math.abs(minutes)} min late`
  return `${minutes} min`
}

function formatDurationLabel(minutes) {
  if (!Number.isFinite(minutes)) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`
}

function getPlanningBufferMinutes(load, route, gameTime) {
  if (!load || !route) return null
  const arrival = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay + route.durationMinutes
  const windowStart = load.pickupDayIndex * 1440 + load.pickupWindowStartMinutes
  const windowEnd = load.pickupDayIndex * 1440 + load.pickupWindowEndMinutes

  if (arrival < windowStart) return windowStart - arrival
  if (arrival <= windowEnd) return windowEnd - arrival
  return windowEnd - arrival
}

function getDeliveryPlanningBufferMinutes(load, route, gameTime) {
  if (!load || !route) return null
  const arrival = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay + route.durationMinutes
  const windowStart = load.deliveryDayIndex * 1440 + load.deliveryWindowStartMinutes
  const windowEnd = load.deliveryDayIndex * 1440 + load.deliveryWindowEndMinutes

  if (arrival < windowStart) return windowStart - arrival
  if (arrival <= windowEnd) return windowEnd - arrival
  return windowEnd - arrival
}

function formatPlanningBuffer(minutes) {
  if (!Number.isFinite(minutes)) return '—'
  if (minutes < 0) return `${formatDurationLabel(Math.abs(minutes))} late`
  return formatDurationLabel(minutes)
}

function MainGameScreen({ selectedMarket, gameTime, loads, setLoads, drivers, setDrivers, carriers, onActivateCarrier, carrierApplicationsById, onApplyCarrier, onAcceptAgreement, emailMessages, setEmailMessages, tutorialEnabled = false, operationDay = 1, dayLoopPhase = 'operating', dayReport = null, playerProgression, onEndDay, onContinueDay, onBeginOperations, plannedRoute, setPlannedRoute, isGameClockPaused = false, setGameClockPaused, runtimePositions, runtimeProgress, setRuntimeProgress, simulationSpeed, setSimulationSpeed, onOpenMarkets, onResetGame, seenLedgerReceivableIds, seenLedgerPaymentReadyIds, onOpenLedger, ledgerWorkflowByLoadId, setLedgerWorkflowByLoadId, setGameTime }) {
  const [devOpen, setDevOpen] = useState(false)
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [phoneInitialScreen, setPhoneInitialScreen] = useState('home')
  const [driverFitEvaluation, setDriverFitEvaluation] = useState(null)
  const [phoneLoadId, setPhoneLoadId] = useState(null)
  const [planningMode, setPlanningMode] = useState(null)
  const [deliveryPlanning, setDeliveryPlanning] = useState(null)
  const [pauseStateBeforeModal, setPauseStateBeforeModal] = useState(false)
  const [operationsOpen, setOperationsOpen] = useState(false)
  const [endDayOpen, setEndDayOpen] = useState(false)

  const receivables = getReceivables(loads, carriers, ledgerWorkflowByLoadId)
  const ledgerSummary = getLedgerSummary(receivables)
  const endDayStatus = getEndDayStatus(loads, receivables)
  const closeoutEmail = emailMessages.find((message) => message.id === 'mentor-tutorial-complete')
  // Once Jordan's closeout message exists, expose the control so an upgraded save
  // visibly has somewhere to go. It remains neutral/locked until the message is read,
  // then becomes the single blue tutorial target.
  const showEndDay = dayLoopPhase === 'operating' && (operationDay > 1 || Boolean(closeoutEmail))
  const endDayTutorialTarget = operationDay === 1 && dayLoopPhase === 'operating' && Boolean(closeoutEmail?.read) && !endDayOpen && !isPhoneOpen
  const endDayLockedForCloseout = operationDay === 1 && dayLoopPhase === 'operating' && Boolean(closeoutEmail) && !closeoutEmail.read
  const dayLoopOverlayActive = dayLoopPhase === 'results' || dayLoopPhase === 'briefing'

  // Prefer Marcus's live operation. A completed tutorial load can briefly coexist in
  // hydrated saves, and must never drive the map/popup for the newer load.
  const assignedLoad = loads.find((load) => load.assignedDriverId === 'marcus' && !['delivered', 'completed'].includes(load.tripStatus))
    || loads.find((load) => load.assignedDriverId === 'marcus')
  const podNotificationCount = loads.filter((load) => load.tripStatus === 'awaiting-pod').length
  const emailUnreadCount = emailMessages?.filter((message) => !message.read).length || 0
  const ledgerNotificationCount = loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved && !seenLedgerReceivableIds.includes(load.id)).length + receivables.filter((item) => item.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(item.loadId)).length
  const phoneNotificationCount = podNotificationCount + ledgerNotificationCount + emailUnreadCount
  const currentAbsoluteGameMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const pendingCarrierReview = Object.entries(carrierApplicationsById).find(([, application]) => application?.status === 'PENDING')
  const pendingCarrierReviewMinutes = pendingCarrierReview ? Math.max(0, pendingCarrierReview[1].responseGameMinute - currentAbsoluteGameMinute) : null
  const tutorialObjective = getCurrentTutorialObjective({ tutorialEnabled, stage: 'game', applications: carrierApplicationsById, emails: emailMessages, loads, ledger: ledgerWorkflowByLoadId })
  const shouldGuideCarrierResponseWait = tutorialEnabled && tutorialObjective === 'fast-forward-carrier-response' && !isPhoneOpen
  const tutorialLoadId = emailMessages.some((message) => message.id === 'mentor-round-two') ? 'DOC002' : 'DOC001'
  const tutorialLoad = loads.find((load) => load.id === tutorialLoadId)
  const tutorialReceivable = receivables.find((item) => item.loadId === tutorialLoadId)
  const tutorialPaymentRemainingMinutes = tutorialReceivable?.financialStatus === 'AWAITING_PAYMENT' && Number.isFinite(tutorialReceivable.paymentAvailableGameMinute)
    ? Math.max(0, tutorialReceivable.paymentAvailableGameMinute - currentAbsoluteGameMinute)
    : null
  const shouldGuideDoc002PaymentWait = tutorialEnabled
    && tutorialLoadId === 'DOC002'
    && tutorialReceivable?.financialStatus === 'AWAITING_PAYMENT'
    && !isPhoneOpen
  const tutorialDriverAction = (() => {
    if (!tutorialEnabled || isPhoneOpen || driverFitEvaluation || planningMode || deliveryPlanning || tutorialLoad?.assignedDriverId !== 'marcus') return null
    if (tutorialLoad.tripStatus === 'assigned') return tutorialLoad.planningStatus === 'route-ready' ? 'SEND_TO_PICKUP' : 'PLAN_TRIP'
    if (tutorialLoad.tripStatus === 'waiting-at-pickup') {
      const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
      const remainingWaitMinutes = Number.isFinite(tutorialLoad.pickupArrivalGameMinute)
        ? Math.max(0, PICKUP_WAIT_MINUTES - (now - tutorialLoad.pickupArrivalGameMinute))
        : 0
      return remainingWaitMinutes <= 0 ? 'CHECK_IN' : null
    }
    if (tutorialLoad.tripStatus === 'at-pickup') return 'CHECK_IN'
    if (tutorialLoad.tripStatus === 'loaded') return tutorialLoad.deliveryPlanningStatus === 'route-ready' ? 'DISPATCH' : 'PLAN_DELIVERY_TRIP'
    if (tutorialLoad.tripStatus === 'at-delivery') return 'CHECK_IN'
    return null
  })()
  const hasUnreadCloseoutEmail = operationDay === 1 && Boolean(closeoutEmail) && !closeoutEmail.read
  const hasUnreadTutorialEmail = (tutorialEnabled && emailMessages.some((message) => ['mentor-welcome', 'metroline-application-approved', 'mentor-first-carrier', 'mentor-round-two', 'mentor-tutorial-complete'].includes(message.id) && !message.read)) || hasUnreadCloseoutEmail
  const shouldHighlightPhoneForPod = tutorialEnabled && tutorialLoad?.tripStatus === 'awaiting-pod' && !isPhoneOpen
  const tutorialLedgerNeedsAttention = tutorialEnabled && (
    (tutorialLoad?.tripStatus === 'completed' && tutorialLoad.pod?.approved && !seenLedgerReceivableIds.includes(tutorialLoadId))
    || (tutorialReceivable?.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(tutorialLoadId))
  )
  const shouldHighlightPhoneForLedger = tutorialLedgerNeedsAttention && !isPhoneOpen
  const driverOperationAlert = (() => {
    if (!assignedLoad) return null
    if (assignedLoad.tripStatus === 'waiting-at-pickup') return { title: 'MARCUS REED', detail: 'Waiting at pickup — check-in action pending.', value: 'PICKUP' }
    if (assignedLoad.tripStatus === 'at-delivery') return { title: 'MARCUS REED', detail: 'Waiting at delivery — check-in action pending.', value: 'DELIVERY' }
    if (assignedLoad.tripStatus === 'assigned' && assignedLoad.planningStatus === 'route-ready') return { title: 'MARCUS REED', detail: 'Route ready — send Marcus to pickup.', value: 'READY' }
    if (assignedLoad.tripStatus === 'loaded' && assignedLoad.deliveryPlanningStatus === 'route-ready') return { title: 'MARCUS REED', detail: 'Delivery route ready — dispatch Marcus.', value: 'READY' }
    if (assignedLoad.tripStatus === 'loaded') return { title: 'MARCUS REED', detail: 'Loaded — delivery trip planning is required.', value: 'ACTION' }
    return null
  })()

  const operationNotifications = [
    ...(driverOperationAlert ? [{ id: 'driver-action', tone: 'attention', ...driverOperationAlert }] : []),
    ...(emailUnreadCount > 0 ? [{
      id: 'email-unread',
      tone: 'info',
      title: 'EMAIL',
      detail: emailUnreadCount === 1 ? '1 unread message.' : `${emailUnreadCount} unread messages.`,
      value: emailUnreadCount === 1 ? '1 NEW' : `${emailUnreadCount} NEW`,
      action: 'email',
    }] : []),
    ...(podNotificationCount > 0 ? [{
      id: 'pod-review',
      tone: 'attention',
      title: 'DOCUMENTS',
      detail: podNotificationCount === 1 ? '1 POD ready for review.' : `${podNotificationCount} PODs ready for review.`,
      value: podNotificationCount === 1 ? '1 READY' : `${podNotificationCount} READY`,
      action: 'documents',
    }] : []),
    ...(ledgerNotificationCount > 0 ? [{
      id: 'ledgerdesk',
      tone: 'success',
      title: 'LEDGERDESK',
      detail: ledgerNotificationCount === 1 ? '1 payment or receivable update.' : `${ledgerNotificationCount} payment or receivable updates.`,
      value: ledgerNotificationCount === 1 ? '1 UPDATE' : `${ledgerNotificationCount} UPDATES`,
      action: 'ledger',
    }] : []),
  ]
  // The badge is a true aggregate count: every unresolved actionable item counts.
  const operationsNotificationCount = emailUnreadCount + podNotificationCount + ledgerNotificationCount + (driverOperationAlert ? 1 : 0)

  // Simulation safety rules:
  // - The phone is part of the live operation: opening it does NOT pause time.
  // - Leaving/backgrounding the app still pauses for safety.
  // - Planning/evaluation/end-of-day modal decisions pause while the player reads.
  useEffect(() => {
    const safetyPause = () => setGameClockPaused(true)
    const handleVisibilityChange = () => {
      if (document.hidden) safetyPause()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', safetyPause)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', safetyPause)
    }
  }, [setGameClockPaused])

  // Actionable driver events bring the simulation back to normal speed instead
  // of letting 10× carry the player past a decision point.
  useEffect(() => {
    if (!assignedLoad || isGameClockPaused) return
    if (['waiting-at-pickup', 'loaded', 'at-delivery', 'awaiting-pod'].includes(assignedLoad.tripStatus) && simulationSpeed > 1) {
      setSimulationSpeed(1)
    }
  }, [assignedLoad?.tripStatus, isGameClockPaused, setSimulationSpeed, simulationSpeed])

  const pauseClockForModal = () => {
    setPauseStateBeforeModal(isGameClockPaused)
    setGameClockPaused(true)
  }
  const restoreClockAfterModal = () => {
    setGameClockPaused(pauseStateBeforeModal)
  }
  const activeRouteGeometry = deliveryPlanning?.route?.routeShape
    || driverFitEvaluation?.deadheadRoute
    || planningMode?.route?.routeShape
    || (assignedLoad?.tripStatus === 'en-route-delivery' ? assignedLoad.plannedLoadedRouteGeometry : null)
    || (assignedLoad?.tripStatus === 'loaded' && assignedLoad.deliveryPlanningStatus === 'route-ready' ? assignedLoad.plannedLoadedRouteGeometry : null)
    || (assignedLoad?.tripStatus === 'en-route-pickup' ? assignedLoad.plannedDeadheadRouteGeometry : null)
    || ((!assignedLoad?.tripStatus || assignedLoad.tripStatus === 'assigned') && assignedLoad?.planningStatus === 'route-ready' ? assignedLoad.plannedDeadheadRouteGeometry : null)
  const startDeliveryPlanning = async (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load?.deliveryLocationId)
    pauseClockForModal()
    logDocOsEvent('OPEN DELIVERY PLANNING')
    setDeliveryPlanning({ loadId, route: 'loading', selected: false })
    try {
      const route = await calculateRoute(pickup, delivery)
      const first = route.routeShape[0]; const last = route.routeShape[route.routeShape.length - 1]
      const startDistance = Math.hypot(first[0] - pickup.longitude, first[1] - pickup.latitude)
      const endDistance = Math.hypot(last[0] - delivery.longitude, last[1] - delivery.latitude)
      if (startDistance > endDistance) route.routeShape.reverse()
      setDeliveryPlanning({ loadId, route, selected: true })
    } catch (error) { console.error(error); setDeliveryPlanning({ loadId, route: 'unavailable' }) }
  }
  const startPlanning = async (loadId, driverId) => {
    const load = loads.find((item) => item.id === loadId)
    const driverRecord = drivers.find((driver) => driver.id === driverId)
    const driver = runtimePositions[driverId] || mapLocations.find((location) => location.id === driverRecord?.homeBaseLocationId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    pauseClockForModal()
    setPlanningMode({ loadId, driverId, active: true, route: 'loading', selected: false })
    try {
      const route = await calculateRoute(driver, pickup)
      setPlanningMode((current) => current ? { ...current, route, selected: true } : current)
    } catch (error) {
      console.error('Planning route unavailable:', error)
      setPlanningMode((current) => current ? { ...current, route: 'unavailable' } : current)
    }
  }

  const startEvaluation = async (loadId, driverId, fit) => {
    const load = loads.find((item) => item.id === loadId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load?.deliveryLocationId)
    setLoads((current) => current.map((item) => item.id === loadId ? { ...item, candidateDriverId: driverId } : item))
    setPhoneLoadId(loadId)
    setDriverFitEvaluation({ loadId, driverId, driverName: drivers.find((driver) => driver.id === driverId)?.fullName || drivers.find((driver) => driver.id === driverId)?.name, deadheadMiles: fit.miles, deadheadMinutes: fit.minutes, deadheadRoute: fit.routeShape, arrivalDay: fit.arrivalDay, arrivalMinutes: fit.arrivalMinutes, pickupDayIndex: load.pickupDayIndex, pickupStart: load.pickupWindowStartMinutes, pickupEnd: load.pickupWindowEndMinutes, status: fit.status, loadedEstimate: 'loading' })
    pauseClockForModal()
    setIsPhoneOpen(false)
    try {
      const route = await calculateRoute(pickup, delivery)
      setDriverFitEvaluation((current) => current ? { ...current, loadedEstimate: { loadedEstimateMiles: route.distanceMiles, loadedEstimateDriveTimeMinutes: route.durationMinutes } } : current)
    } catch (error) {
      console.error('Loaded estimate unavailable:', error)
      setDriverFitEvaluation((current) => current ? { ...current, loadedEstimate: 'unavailable' } : current)
    }
  }
  const handleDriverAction = (actionType, loadId, driverId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (actionType === 'PLAN_TRIP' && load.tripStatus === 'assigned') startPlanning(loadId, driverId)
    else if (actionType === 'SEND_TO_PICKUP' && load.tripStatus === 'assigned' && load.planningStatus === 'route-ready' && load.plannedDeadheadRouteGeometry) {
      setRuntimeProgress(0); setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'en-route-pickup', departureGameMinute: now } : item))
    } else if (actionType === 'PLAN_DELIVERY_TRIP' && load.tripStatus === 'loaded') startDeliveryPlanning(loadId)
    else if (actionType === 'DISPATCH' && load.tripStatus === 'loaded' && load.deliveryPlanningStatus === 'route-ready' && load.plannedLoadedRouteGeometry) {
      setRuntimeProgress(0); setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'en-route-delivery', deliveryDepartureGameMinute: now } : item))
    } else if (actionType === 'CHECK_IN' && load.tripStatus === 'at-delivery') setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'checked-in-delivery', deliveryCheckInGameMinute: now } : item))
    else if (actionType === 'CHECK_IN' && ['at-pickup', 'waiting-at-pickup'].includes(load.tripStatus)) {
      const remainingWaitMinutes = load.tripStatus === 'waiting-at-pickup' && Number.isFinite(load.pickupArrivalGameMinute)
        ? Math.max(0, PICKUP_WAIT_MINUTES - (now - load.pickupArrivalGameMinute))
        : 0
      if (remainingWaitMinutes <= 0) setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'checked-in-pickup', pickupCheckInGameMinute: now } : item))
    }
  }

  const planningLoad = planningMode ? loads.find((load) => load.id === planningMode.loadId) : null
  const planningPickup = planningLoad ? mapLocations.find((location) => location.id === planningLoad.pickupLocationId) : null
  const planningDriver = planningMode ? drivers.find((driver) => driver.id === planningMode.driverId) : null
  const planningRoute = planningMode && planningMode.route && typeof planningMode.route === 'object' ? planningMode.route : null
  const planningArrivalAbsoluteMinutes = planningRoute ? (gameTime.gameDayIndex * 1440) + gameTime.totalMinutesOfDay + planningRoute.durationMinutes : null
  const planningBufferMinutes = planningLoad && planningRoute ? getPlanningBufferMinutes(planningLoad, planningRoute, gameTime) : null
  const deliveryPlanningLoad = deliveryPlanning ? loads.find((load) => load.id === deliveryPlanning.loadId) : null
  const deliveryPlanningPickup = deliveryPlanningLoad ? mapLocations.find((location) => location.id === deliveryPlanningLoad.pickupLocationId) : null
  const deliveryPlanningDelivery = deliveryPlanningLoad ? mapLocations.find((location) => location.id === deliveryPlanningLoad.deliveryLocationId) : null
  const deliveryPlanningDriver = drivers.find((driver) => driver.id === 'marcus')
  const deliveryPlanningRoute = deliveryPlanning && deliveryPlanning.route && typeof deliveryPlanning.route === 'object' ? deliveryPlanning.route : null
  const deliveryPlanningArrivalAbsoluteMinutes = deliveryPlanningRoute ? (gameTime.gameDayIndex * 1440) + gameTime.totalMinutesOfDay + deliveryPlanningRoute.durationMinutes : null
  const deliveryPlanningBufferMinutes = deliveryPlanningLoad && deliveryPlanningRoute ? getDeliveryPlanningBufferMinutes(deliveryPlanningLoad, deliveryPlanningRoute, gameTime) : null
  const timeControlsLocked = Boolean(driverFitEvaluation || planningMode || deliveryPlanning || endDayOpen || dayLoopOverlayActive)
  const pauseActive = isGameClockPaused
  const playActive = !isGameClockPaused && simulationSpeed === 1
  const fastForwardActive = !isGameClockPaused && [2, 5, 10].includes(simulationSpeed)
  const tutorialFastForwardTarget = shouldGuideCarrierResponseWait || shouldGuideDoc002PaymentWait

  const handlePause = () => {
    if (timeControlsLocked) return
    setGameClockPaused(true)
  }
  const handlePlay = () => {
    if (timeControlsLocked) return
    setSimulationSpeed(1)
    setGameClockPaused(false)
  }
  const handleFastForward = () => {
    if (timeControlsLocked) return
    const nextSpeed = simulationSpeed < 2 ? 2 : simulationSpeed < 5 ? 5 : simulationSpeed < 10 ? 10 : 2
    setSimulationSpeed(nextSpeed)
    setGameClockPaused(false)
  }

  const openOperationNotification = (action) => {
    if (action === 'ledger') onOpenLedger?.()
    if (!['email', 'documents', 'ledger'].includes(action)) return
    setPhoneInitialScreen(action)
    setPhoneLoadId(null)
    setIsPhoneOpen(true)
  }

  return (
    <div className="main-game-screen">
      <StatusBar selectedMarket={selectedMarket} gameTime={gameTime} cash={ledgerSummary.collected} operationDay={operationDay} />
      <OperationsBar
        selectedMarket={selectedMarket}
        notificationCount={operationsNotificationCount}
        notifications={operationNotifications}
        onOpenChange={setOperationsOpen}
        onNotificationAction={openOperationNotification}
        showEndDay={showEndDay}
        endDayTutorialTarget={endDayTutorialTarget}
        endDayDisabled={endDayLockedForCloseout || isPhoneOpen || Boolean(driverFitEvaluation) || Boolean(planningMode) || Boolean(deliveryPlanning) || endDayOpen}
        onEndDay={() => { pauseClockForModal(); setEndDayOpen(true) }}
      />
      <div className={`map-area ${operationsOpen ? 'operations-open' : ''}`}>
        {import.meta.env.DEV && <><button type="button" className="dev-button" onClick={() => setDevOpen((open) => !open)}>DEV</button>{devOpen && <div className="dev-menu"><div className="dev-menu-header"><strong>DEV TOOLS</strong><button type="button" onClick={() => setDevOpen(false)} aria-label="Close developer tools">×</button></div><div className="dev-presets"><strong>TIME</strong><span>DAY {gameTime.gameDayIndex + 1}<br />{formatCompactDate(gameTime.gameDayIndex)} • {formatTime(gameTime.totalMinutesOfDay)}</span>{[60, 360].map((minutes) => <button type="button" key={minutes} onClick={() => setGameTime((time) => { const total = time.gameDayIndex * 1440 + time.totalMinutesOfDay + minutes; return { gameDayIndex: Math.floor(total / 1440), totalMinutesOfDay: total % 1440 } })}>+{minutes === 60 ? '1 HR' : '6 HR'}</button>)}{[1, 3, 7].map((days) => <button type="button" key={days} onClick={() => setGameTime((time) => ({ ...time, gameDayIndex: time.gameDayIndex + days }))}>+{days} DAY{days > 1 ? 'S' : ''}</button>)}</div><button type="button" className="dev-reset" onClick={() => { onResetGame(); setDevOpen(false) }}>RESET GAME</button></div>}</>}
        {shouldGuideCarrierResponseWait && (
          <div className="carrier-review-wait" role="status" aria-live="polite">
            <span className="carrier-review-wait-dot" aria-hidden="true" />
            <span>METROLINE REVIEW</span>
            <strong>{pendingCarrierReviewMinutes ?? 10} MIN</strong>
          </div>
        )}
        {shouldGuideDoc002PaymentWait && (
          <div className="carrier-review-wait payment-review-wait" role="status" aria-live="polite">
            <span className="carrier-review-wait-dot" aria-hidden="true" />
            <span>DOC002 PAYMENT</span>
            <strong>{tutorialPaymentRemainingMinutes ?? 30} MIN</strong>
          </div>
        )}
        <div className="time-controls-wrap">
          <span className="time-state-label" aria-live="polite">{pauseActive ? 'PAUSED' : `${simulationSpeed}× SPEED`}</span>
          <div className="time-controls" aria-label="Simulation time controls">
          <button
            type="button"
            className={pauseActive ? 'active' : ''}
            onClick={handlePause}
            aria-label="Pause simulation"
            aria-pressed={pauseActive}
            disabled={timeControlsLocked}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          </button>
          <button
            type="button"
            className={playActive ? 'active' : ''}
            onClick={handlePlay}
            aria-label="Play simulation at normal speed"
            aria-pressed={playActive}
            disabled={timeControlsLocked}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5 18 12 7 18.5V5.5Z"/></svg>
          </button>
          <button
            type="button"
            className={`${fastForwardActive ? 'active' : ''} ${tutorialFastForwardTarget ? 'tutorial-target tutorial-time-control' : ''}`.trim()}
            onClick={handleFastForward}
            aria-label={`Fast forward simulation. Current speed ${simulationSpeed} times`}
            aria-pressed={fastForwardActive}
            disabled={timeControlsLocked}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5 12 12l-7.5 6.5V5.5Z"/><path d="M11.5 5.5 19 12l-7.5 6.5V5.5Z"/></svg>
          </button>
          </div>
        </div>
        {endDayOpen && (
          <EndDaySheet
            operationDay={operationDay}
            status={endDayStatus}
            onCancel={() => { setEndDayOpen(false); restoreClockAfterModal() }}
            onConfirm={() => { setEndDayOpen(false); onEndDay?.() }}
          />
        )}
        <GameMap activeRouteGeometry={activeRouteGeometry} routeFocusMode={driverFitEvaluation ? 'evaluation' : (planningMode || deliveryPlanning ? 'planning' : null)} tripStatus={assignedLoad?.tripStatus} drivers={drivers} carriers={carriers} runtimePositions={runtimePositions} runtimeProgress={runtimeProgress} runtimeRoute={assignedLoad?.tripStatus === 'en-route-delivery' ? assignedLoad.plannedLoadedRouteGeometry : assignedLoad?.plannedDeadheadRouteGeometry} assignedLoad={assignedLoad} evaluationLoad={driverFitEvaluation ? loads.find((load) => load.id === driverFitEvaluation.loadId) : null} isDriverFitEvaluation={Boolean(driverFitEvaluation)} suppressAttention={Boolean(deliveryPlanning)} gameTime={gameTime} onDriverAction={handleDriverAction} tutorialEnabled={tutorialEnabled} tutorialDriverAction={tutorialDriverAction} />
        {deliveryPlanning && (
          <div className="map-evaluation trip-planning-v2 delivery-planning-v2">
            <div className="trip-plan-v2-heading">
              <div>
                <span className="trip-plan-v2-kicker">DELIVERY PLANNING</span>
                <strong>{deliveryPlanning.loadId}</strong>
              </div>
              <span className={`trip-plan-v2-status ${deliveryPlanningRoute ? 'selected' : 'pending'}`}>
                {deliveryPlanningRoute ? 'RECOMMENDED' : 'CALCULATING'}
              </span>
            </div>

            <div className="trip-plan-v2-driver-row">
              <div className="trip-plan-v2-driver-badge" aria-hidden="true">M</div>
              <div>
                <span>DRIVER</span>
                <strong>{deliveryPlanningDriver?.fullName || deliveryPlanningDriver?.name || 'Marcus Reed'}</strong>
              </div>
            </div>

            <div className="delivery-plan-v2-stops">
              <div>
                <span>FROM</span>
                <strong>{deliveryPlanningPickup?.name || 'Pickup'}</strong>
                <small>Loaded at pickup</small>
              </div>
              <div className="delivery-plan-v2-arrow" aria-hidden="true">→</div>
              <div>
                <span>NEXT STOP</span>
                <strong>{deliveryPlanningDelivery?.name || 'Delivery'}</strong>
                <small>{deliveryPlanningLoad ? formatAppointment(deliveryPlanningLoad.deliveryDayIndex, deliveryPlanningLoad.deliveryWindowStartMinutes, deliveryPlanningLoad.deliveryWindowEndMinutes) : '—'}</small>
              </div>
            </div>

            <div className="trip-plan-v2-route-label">
              <span>ROUTE A — RECOMMENDED</span>
              <small>Loaded route</small>
            </div>

            <div className="trip-plan-v2-body">
              {deliveryPlanning.route === 'loading' && <div className="trip-plan-v2-empty">Calculating route…</div>}
              {deliveryPlanning.route === 'unavailable' && <div className="trip-plan-v2-empty">Route unavailable</div>}
              {deliveryPlanningRoute && (
                <>
                  <div className="trip-plan-v2-metrics">
                    <div>
                      <span>DISTANCE</span>
                      <strong>{deliveryPlanningRoute.distanceMiles.toFixed(1)} mi</strong>
                    </div>
                    <div>
                      <span>DRIVE TIME</span>
                      <strong>{deliveryPlanningRoute.durationMinutes} min</strong>
                    </div>
                    <div>
                      <span>ETA</span>
                      <strong>{formatCompactDate(Math.floor(deliveryPlanningArrivalAbsoluteMinutes / 1440))} • {formatTime(deliveryPlanningArrivalAbsoluteMinutes % 1440)}</strong>
                    </div>
                    <div>
                      <span>BUFFER</span>
                      <strong>{formatPlanningBuffer(deliveryPlanningBufferMinutes)}</strong>
                    </div>
                  </div>

                </>
              )}
            </div>

            <div className="trip-plan-v2-actions">
              <button
                type="button"
                className="trip-plan-v2-back"
                onClick={() => {
                  setDeliveryPlanning(null)
                  restoreClockAfterModal()
                }}
              >
                BACK
              </button>
              <button
                type="button"
                className={`trip-plan-v2-confirm ${tutorialEnabled && deliveryPlanning.loadId === tutorialLoadId && deliveryPlanningRoute ? 'tutorial-target' : ''}`}
                disabled={!deliveryPlanningRoute}
                onClick={() => {
                  setLoads((current) => current.map((load) => load.id === deliveryPlanning.loadId ? {
                    ...load,
                    deliveryPlanningStatus: 'route-ready',
                    plannedLoadedMiles: deliveryPlanningRoute.distanceMiles,
                    plannedLoadedDriveTimeMinutes: deliveryPlanningRoute.durationMinutes,
                    plannedLoadedRouteGeometry: deliveryPlanningRoute.routeShape,
                    selectedLoadedRouteId: 'recommended',
                  } : load))
                  setDeliveryPlanning(null)
                  restoreClockAfterModal()
                }}
              >
                CONFIRM PLAN
              </button>
            </div>
          </div>
        )}
        {planningMode && (
          <div className="map-evaluation trip-planning-v2">
            <div className="trip-plan-v2-heading">
              <div>
                <span className="trip-plan-v2-kicker">TRIP PLANNING</span>
                <strong>{planningMode.loadId}</strong>
              </div>
              <span className={`trip-plan-v2-status ${planningRoute ? 'selected' : 'pending'}`}>
                {planningRoute ? 'RECOMMENDED' : 'CALCULATING'}
              </span>
            </div>

            <div className="trip-plan-v2-driver-row">
              <div className="trip-plan-v2-driver-badge" aria-hidden="true">M</div>
              <div>
                <span>DRIVER</span>
                <strong>{planningDriver?.fullName || planningDriver?.name || 'Marcus Reed'}</strong>
              </div>
            </div>

            <div className="trip-plan-v2-stop-row">
              <span>NEXT STOP</span>
              <strong>{planningPickup?.name || 'Pickup'}</strong>
              <small>{planningLoad ? formatAppointment(planningLoad.pickupDayIndex, planningLoad.pickupWindowStartMinutes, planningLoad.pickupWindowEndMinutes) : '—'}</small>
            </div>

            <div className="trip-plan-v2-route-label">
              <span>ROUTE A — RECOMMENDED</span>
              <small>Deadhead to pickup</small>
            </div>

            <div className="trip-plan-v2-body">
              {planningMode.route === 'loading' && <div className="trip-plan-v2-empty">Calculating route…</div>}
              {planningMode.route === 'unavailable' && <div className="trip-plan-v2-empty">Route unavailable</div>}
              {planningRoute && (
                <>
                  <div className="trip-plan-v2-metrics">
                    <div>
                      <span>DISTANCE</span>
                      <strong>{planningRoute.distanceMiles.toFixed(1)} mi</strong>
                    </div>
                    <div>
                      <span>DRIVE TIME</span>
                      <strong>{planningRoute.durationMinutes} min</strong>
                    </div>
                    <div>
                      <span>ETA</span>
                      <strong>{formatCompactDate(Math.floor(planningArrivalAbsoluteMinutes / 1440))} • {formatTime(planningArrivalAbsoluteMinutes % 1440)}</strong>
                    </div>
                    <div>
                      <span>BUFFER</span>
                      <strong>{formatPlanningBuffer(planningBufferMinutes)}</strong>
                    </div>
                  </div>

                </>
              )}
            </div>

            <div className="trip-plan-v2-actions">
              <button
                type="button"
                className="trip-plan-v2-back"
                onClick={() => {
                  setPlanningMode(null)
                  restoreClockAfterModal()
                }}
              >
                BACK
              </button>
              <button
                type="button"
                className={`trip-plan-v2-confirm ${tutorialEnabled && planningMode.loadId === tutorialLoadId && planningRoute ? 'tutorial-target' : ''}`}
                disabled={!planningRoute}
                onClick={() => {
                  setLoads((current) => current.map((load) => load.id === planningMode.loadId ? {
                    ...load,
                    planningStatus: 'route-ready',
                    plannedDeadheadMiles: planningRoute.distanceMiles,
                    plannedDeadheadDriveTimeMinutes: planningRoute.durationMinutes,
                    plannedDeadheadRouteGeometry: planningRoute.routeShape,
                    selectedDeadheadRouteId: 'recommended',
                  } : load))
                  setPlanningMode(null)
                  restoreClockAfterModal()
                }}
              >
                CONFIRM PLAN
              </button>
            </div>
          </div>
        )}
        {driverFitEvaluation && (
          <div className="map-evaluation route-evaluation-v2">
            <div className="route-eval-v2-heading">
              <div>
                <span className="route-eval-v2-kicker">ROUTE EVALUATION</span>
                <strong>{driverFitEvaluation.loadId}</strong>
              </div>
              <span className={`route-eval-v2-fit ${driverFitEvaluation.status === 'LATE' ? 'late' : driverFitEvaluation.status === 'ON TIME' ? 'on-time' : 'early'}`}>
                {driverFitEvaluation.status}
              </span>
            </div>

            <div className="route-eval-v2-driver-row">
              <div className="route-eval-v2-driver-badge" aria-hidden="true">M</div>
              <div>
                <span>CANDIDATE</span>
                <strong>{driverFitEvaluation.driverName || 'Marcus Reed'}</strong>
              </div>
              <div className="route-eval-v2-map-key">
                <span><i className="driver-dot">M</i> Driver</span>
                <span><i className="pickup-dot">P</i> Pickup</span>
              </div>
            </div>

            <div className="route-eval-v2-route-label">
              <span>RECOMMENDED ROUTE</span>
              <small>Deadhead to pickup</small>
            </div>

            <div className="route-eval-v2-metrics">
              <div>
                <span>DEADHEAD</span>
                <strong>{driverFitEvaluation.deadheadMiles.toFixed(1)} mi</strong>
              </div>
              <div>
                <span>DRIVE TIME</span>
                <strong>{driverFitEvaluation.deadheadMinutes} min</strong>
              </div>
              <div>
                <span>ARRIVAL</span>
                <strong>{formatTime(driverFitEvaluation.arrivalMinutes)}</strong>
              </div>
              <div>
                <span>BUFFER</span>
                <strong>{formatEvaluationBuffer(getEvaluationBufferMinutes(driverFitEvaluation))}</strong>
              </div>
            </div>

            <div className="route-eval-v2-window-row">
              <span>PICKUP WINDOW</span>
              <strong>{formatAppointment(driverFitEvaluation.pickupDayIndex, driverFitEvaluation.pickupStart, driverFitEvaluation.pickupEnd)}</strong>
            </div>

            <div className="route-eval-v2-loaded-row">
              <span>LOADED ESTIMATE</span>
              {driverFitEvaluation.loadedEstimate === 'loading' && <strong>Calculating…</strong>}
              {driverFitEvaluation.loadedEstimate === 'unavailable' && <strong>Unavailable</strong>}
              {driverFitEvaluation.loadedEstimate && typeof driverFitEvaluation.loadedEstimate === 'object' && (
                <strong>
                  {driverFitEvaluation.loadedEstimate.loadedEstimateMiles.toFixed(1)} mi · {driverFitEvaluation.loadedEstimate.loadedEstimateDriveTimeMinutes} min
                </strong>
              )}
            </div>

            <div className="route-eval-v2-actions">
              <button
                type="button"
                className="route-eval-v2-back"
                onClick={() => {
                  const loadId = driverFitEvaluation.loadId
                  setDriverFitEvaluation(null)
                  restoreClockAfterModal()
                  setPhoneInitialScreen('driverFit')
                  setPhoneLoadId(loadId)
                  setIsPhoneOpen(true)
                }}
              >
                BACK
              </button>
              <button
                type="button"
                className={`route-eval-v2-confirm ${tutorialEnabled && driverFitEvaluation.loadId === tutorialLoadId ? 'tutorial-target' : ''}`}
                onClick={() => {
                  const evaluation = driverFitEvaluation
                  setLoads((current) => current.map((load) => load.id === evaluation.loadId ? { ...load, driverFitVerified: true, candidateDriverId: evaluation.driverId } : load))
                  setDriverFitEvaluation(null)
                  restoreClockAfterModal()
                  setPhoneInitialScreen('loadDetails')
                  setPhoneLoadId(evaluation.loadId)
                  setIsPhoneOpen(true)
                }}
              >
                CONFIRM FIT
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className="markets-button"
          onClick={onOpenMarkets}
          aria-label="Open market selection"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V11M10 18V7M15 18v-5M20 18V4"/></svg>
          <span>MARKET</span>
        </button>
        {!isPhoneOpen && !driverFitEvaluation && !planningMode && !deliveryPlanning && (
          <button
            type="button"
            className={`phone-button ${!isPhoneOpen && !shouldGuideCarrierResponseWait && !shouldGuideDoc002PaymentWait && (hasUnreadTutorialEmail || shouldHighlightPhoneForPod || shouldHighlightPhoneForLedger) && !driverFitEvaluation ? 'tutorial-target' : ''}`}
            onClick={() => { setPhoneInitialScreen('home'); setIsPhoneOpen(true) }}
            aria-label="Open phone"
          >
            <svg className="phone-button-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10 5h4"/><circle cx="12" cy="18.5" r=".8"/></svg>
            {phoneNotificationCount > 0 && <span className="phone-notification-badge">{phoneNotificationCount > 9 ? '9+' : phoneNotificationCount}</span>}
          </button>
        )}
        {isPhoneOpen && (
          <PhoneOverlay
            loads={loads}
            setLoads={setLoads}
            drivers={drivers}
            carriers={carriers}
            onActivateCarrier={onActivateCarrier}
            carrierApplicationsById={carrierApplicationsById}
            onApplyCarrier={onApplyCarrier}
            onBeginCarrierWait={() => { setSimulationSpeed(1); setIsPhoneOpen(false) }}
            onAcceptAgreement={onAcceptAgreement}
            emailMessages={emailMessages}
            setEmailMessages={setEmailMessages}
            tutorialEnabled={tutorialEnabled}
            tutorialObjective={tutorialObjective}
            runtimePositions={runtimePositions}
            setDrivers={setDrivers}
            plannedRoute={plannedRoute}
            setPlannedRoute={setPlannedRoute}
            gameTime={gameTime}
            initialScreen={phoneInitialScreen}
            initialLoadId={phoneLoadId}
            documentsBadgeCount={podNotificationCount}
            ledgerUnreadCount={loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved && !seenLedgerReceivableIds.includes(load.id)).length + receivables.filter((item) => item.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(item.loadId)).length}
            emailUnreadCount={emailUnreadCount}
            onOpenLedger={onOpenLedger}
            ledgerWorkflowByLoadId={ledgerWorkflowByLoadId}
            setLedgerWorkflowByLoadId={setLedgerWorkflowByLoadId}
            onEvaluateFit={startEvaluation}
            onResetGame={onResetGame}
            onClose={() => setIsPhoneOpen(false)}
          />
        )}
      </div>

      {dayLoopPhase === 'results' && (
        <DayResultsScreen
          report={dayReport}
          progression={playerProgression}
          onContinue={onContinueDay}
        />
      )}

      {dayLoopPhase === 'briefing' && (
        <DayBriefingScreen
          operationDay={operationDay + 1}
          report={dayReport}
          cash={ledgerSummary.collected}
          activeCarriers={carriers.filter((carrier) => carrier.status === 'active').length}
          availableDrivers={drivers.filter((driver) => driver.status === 'available').length}
          openReceivables={ledgerSummary.outstanding}
          onBegin={onBeginOperations}
        />
      )}
    </div>
  )
}

export default MainGameScreen
