import { useEffect, useRef, useState } from 'react'
import GameMap from './GameMap.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { logDocOsEvent } from '../utils/debugLogger.js'
import { getLedgerSummary, getReceivables } from '../utils/ledger.js'
import { PICKUP_WAIT_MINUTES } from '../data/pickupConfig.js'
import { getCurrentTutorialObjective } from '../utils/tutorialObjective.js'

function MainGameScreen({ selectedMarket, gameTime, loads, setLoads, drivers, setDrivers, carriers, onActivateCarrier, carrierApplicationsById, onApplyCarrier, onAcceptAgreement, emailMessages, setEmailMessages, tutorialEnabled = false, plannedRoute, setPlannedRoute, isGameClockPaused = false, setGameClockPaused, runtimePositions, runtimeProgress, setRuntimeProgress, simulationSpeed, setSimulationSpeed, onOpenMarkets, onResetGame, seenLedgerReceivableIds, seenLedgerPaymentReadyIds, onOpenLedger, ledgerWorkflowByLoadId, setLedgerWorkflowByLoadId, setGameTime }) {
  const [devOpen, setDevOpen] = useState(false)
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [phoneInitialScreen, setPhoneInitialScreen] = useState('home')
  const [driverFitEvaluation, setDriverFitEvaluation] = useState(null)
  const [phoneLoadId, setPhoneLoadId] = useState(null)
  const [planningMode, setPlanningMode] = useState(null)
  const [deliveryPlanning, setDeliveryPlanning] = useState(null)
  const [pauseStateBeforeModal, setPauseStateBeforeModal] = useState(false)
  const phonePauseStateBeforeOpenRef = useRef(null)

  const assignedLoad = loads.find((load) => load.assignedDriverId === 'marcus')
  const podNotificationCount = loads.filter((load) => load.tripStatus === 'awaiting-pod').length
  const emailUnreadCount = emailMessages?.filter((message) => !message.read).length || 0
  const ledgerNotificationCount = loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved && !seenLedgerReceivableIds.includes(load.id)).length + getReceivables(loads, carriers, ledgerWorkflowByLoadId).filter((item) => item.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(item.loadId)).length
  const phoneNotificationCount = podNotificationCount + ledgerNotificationCount + emailUnreadCount
  const tutorialObjective = getCurrentTutorialObjective({ tutorialEnabled, stage: 'game', applications: carrierApplicationsById, emails: emailMessages, loads, ledger: ledgerWorkflowByLoadId })
  const tutorialLoadId = emailMessages.some((message) => message.id === 'mentor-round-two') ? 'DOC002' : 'DOC001'
  const tutorialLoad = loads.find((load) => load.id === tutorialLoadId)
  const tutorialReceivable = getReceivables(loads, carriers, ledgerWorkflowByLoadId).find((item) => item.loadId === tutorialLoadId)
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
  const hasUnreadTutorialEmail = tutorialEnabled && emailMessages.some((message) => ['mentor-welcome', 'metroline-application-approved', 'mentor-first-carrier', 'mentor-round-two', 'mentor-tutorial-complete'].includes(message.id) && !message.read)
  const shouldHighlightPhoneForPod = tutorialEnabled && tutorialLoad?.tripStatus === 'awaiting-pod' && !isPhoneOpen
  const tutorialLedgerNeedsAttention = tutorialEnabled && (
    (tutorialLoad?.tripStatus === 'completed' && tutorialLoad.pod?.approved && !seenLedgerReceivableIds.includes(tutorialLoadId))
    || (tutorialReceivable?.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(tutorialLoadId))
  )
  const shouldHighlightPhoneForLedger = tutorialLedgerNeedsAttention && !isPhoneOpen

  // Simulation safety rules:
  // - The DOC OS phone is decision space, so opening it pauses the world.
  // - Leaving the app/backgrounding it always pauses and never auto-resumes.
  // - Thirty seconds without interaction on the live map auto-pauses the clock.
  // The phone restores the player's prior pause state when it closes unless a
  // safety pause occurred while the phone was open.
  useEffect(() => {
    if (isPhoneOpen) {
      if (phonePauseStateBeforeOpenRef.current === null) {
        phonePauseStateBeforeOpenRef.current = isGameClockPaused
      }
      if (!isGameClockPaused) setGameClockPaused(true)
      return
    }

    if (phonePauseStateBeforeOpenRef.current !== null) {
      const wasPausedBeforePhone = phonePauseStateBeforeOpenRef.current
      phonePauseStateBeforeOpenRef.current = null
      setGameClockPaused(wasPausedBeforePhone)
    }
  }, [isPhoneOpen, isGameClockPaused, setGameClockPaused])

  useEffect(() => {
    const safetyPause = () => {
      if (isPhoneOpen) phonePauseStateBeforeOpenRef.current = true
      setGameClockPaused(true)
    }
    const handleVisibilityChange = () => {
      if (document.hidden) safetyPause()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', safetyPause)
    window.addEventListener('blur', safetyPause)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', safetyPause)
      window.removeEventListener('blur', safetyPause)
    }
  }, [isPhoneOpen, setGameClockPaused])

  useEffect(() => {
    if (isPhoneOpen || isGameClockPaused) return undefined

    let inactivityTimer = null
    const armInactivityPause = () => {
      window.clearTimeout(inactivityTimer)
      inactivityTimer = window.setTimeout(() => setGameClockPaused(true), 30000)
    }

    const activityEvents = ['pointerdown', 'touchstart', 'keydown']
    activityEvents.forEach((eventName) => window.addEventListener(eventName, armInactivityPause, { passive: true }))
    armInactivityPause()

    return () => {
      window.clearTimeout(inactivityTimer)
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, armInactivityPause))
    }
  }, [isPhoneOpen, isGameClockPaused, setGameClockPaused])
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
    setDeliveryPlanning({ loadId, route: 'loading' })
    try {
      const route = await calculateRoute(pickup, delivery)
      const first = route.routeShape[0]; const last = route.routeShape[route.routeShape.length - 1]
      const startDistance = Math.hypot(first[0] - pickup.longitude, first[1] - pickup.latitude)
      const endDistance = Math.hypot(last[0] - delivery.longitude, last[1] - delivery.latitude)
      if (startDistance > endDistance) route.routeShape.reverse()
      setDeliveryPlanning({ loadId, route })
    } catch (error) { console.error(error); setDeliveryPlanning({ loadId, route: 'unavailable' }) }
  }
  const startPlanning = async (loadId, driverId) => {
    const load = loads.find((item) => item.id === loadId)
    const driverRecord = drivers.find((driver) => driver.id === driverId)
    const driver = runtimePositions[driverId] || mapLocations.find((location) => location.id === driverRecord?.homeBaseLocationId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    pauseClockForModal()
    setPlanningMode({ loadId, driverId, active: true, route: 'loading' })
    try {
      const route = await calculateRoute(driver, pickup)
      setPlanningMode((current) => current ? { ...current, route } : current)
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
    setDriverFitEvaluation({ loadId, driverId, driverName: drivers.find((driver) => driver.id === driverId)?.name, deadheadMiles: fit.miles, deadheadMinutes: fit.minutes, deadheadRoute: fit.routeShape, arrivalDay: fit.arrivalDay, arrivalMinutes: fit.arrivalMinutes, pickupDayIndex: load.pickupDayIndex, pickupStart: load.pickupWindowStartMinutes, pickupEnd: load.pickupWindowEndMinutes, status: fit.status, loadedEstimate: 'loading' })
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
  const deliveryPlanningLoad = deliveryPlanning ? loads.find((load) => load.id === deliveryPlanning.loadId) : null
  const deliveryPlanningPickup = deliveryPlanningLoad ? mapLocations.find((location) => location.id === deliveryPlanningLoad.pickupLocationId) : null
  const deliveryPlanningDelivery = deliveryPlanningLoad ? mapLocations.find((location) => location.id === deliveryPlanningLoad.deliveryLocationId) : null
  const timeControlsLocked = Boolean(isPhoneOpen || driverFitEvaluation || planningMode || deliveryPlanning)
  const fastForwardActive = simulationSpeed === 5 && !isGameClockPaused
  const togglePause = () => {
    if (timeControlsLocked) return
    setGameClockPaused(!isGameClockPaused)
  }
  const handlePlayFastForward = () => {
    if (timeControlsLocked) return

    // Paused → Play always resumes at normal speed.
    if (isGameClockPaused) {
      setSimulationSpeed(1)
      setGameClockPaused(false)
      return
    }

    // Normal → Fast Forward. Fast Forward → Normal.
    setSimulationSpeed(fastForwardActive ? 1 : 5)
  }

  return (
    <div className="main-game-screen">
      <StatusBar selectedMarket={selectedMarket} gameTime={gameTime} cash={getLedgerSummary(getReceivables(loads, carriers, ledgerWorkflowByLoadId)).collected} />
      <div className="map-area">
        {import.meta.env.DEV && <><button type="button" className="dev-button" onClick={() => setDevOpen((open) => !open)}>DEV</button>{devOpen && <div className="dev-menu"><div className="dev-menu-header"><strong>DEV TOOLS</strong><button type="button" onClick={() => setDevOpen(false)} aria-label="Close developer tools">×</button></div><div className="dev-presets"><strong>TIME</strong><span>DAY {gameTime.gameDayIndex + 1}<br />{formatCompactDate(gameTime.gameDayIndex)} • {formatTime(gameTime.totalMinutesOfDay)}</span>{[60, 360].map((minutes) => <button type="button" key={minutes} onClick={() => setGameTime((time) => { const total = time.gameDayIndex * 1440 + time.totalMinutesOfDay + minutes; return { gameDayIndex: Math.floor(total / 1440), totalMinutesOfDay: total % 1440 } })}>+{minutes === 60 ? '1 HR' : '6 HR'}</button>)}{[1, 3, 7].map((days) => <button type="button" key={days} onClick={() => setGameTime((time) => ({ ...time, gameDayIndex: time.gameDayIndex + days }))}>+{days} DAY{days > 1 ? 'S' : ''}</button>)}</div><button type="button" className="dev-reset" onClick={() => { onResetGame(); setDevOpen(false) }}>RESET GAME</button></div>}</>}
        <div className="time-controls" aria-label="Simulation time controls">
          <button
            type="button"
            className={isGameClockPaused ? 'active' : ''}
            onClick={togglePause}
            aria-label={isGameClockPaused ? 'Resume simulation' : 'Pause simulation'}
            aria-pressed={isGameClockPaused}
            disabled={timeControlsLocked}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          </button>
          <button
            type="button"
            className={fastForwardActive ? 'active' : ''}
            onClick={handlePlayFastForward}
            aria-label={isGameClockPaused ? 'Play simulation' : fastForwardActive ? 'Return to normal speed' : 'Fast forward simulation'}
            aria-pressed={fastForwardActive}
            disabled={timeControlsLocked}
          >
            {isGameClockPaused ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5 18 12 7 18.5V5.5Z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5 12 12l-7.5 6.5V5.5Z"/><path d="M11.5 5.5 19 12l-7.5 6.5V5.5Z"/></svg>
            )}
          </button>
        </div>
        <GameMap activeRouteGeometry={activeRouteGeometry} tripStatus={assignedLoad?.tripStatus} drivers={drivers} carriers={carriers} runtimePositions={runtimePositions} runtimeProgress={runtimeProgress} runtimeRoute={assignedLoad?.tripStatus === 'en-route-delivery' ? assignedLoad.plannedLoadedRouteGeometry : assignedLoad?.plannedDeadheadRouteGeometry} assignedLoad={assignedLoad} evaluationLoad={driverFitEvaluation ? loads.find((load) => load.id === driverFitEvaluation.loadId) : null} isDriverFitEvaluation={Boolean(driverFitEvaluation)} suppressAttention={Boolean(deliveryPlanning)} gameTime={gameTime} onDriverAction={handleDriverAction} tutorialEnabled={tutorialEnabled} tutorialDriverAction={tutorialDriverAction} />
        {deliveryPlanning && <div className="map-evaluation"><strong>DELIVERY PLANNING</strong><span>{deliveryPlanning.loadId}</span><span>Driver: Marcus</span><strong>FROM</strong><span>{deliveryPlanningPickup?.name || 'Pickup'}</span><strong>NEXT STOP</strong><span>{deliveryPlanningDelivery?.name || 'Delivery'}</span><strong>ROUTE OPTIONS</strong>{deliveryPlanning.route === 'loading' && <span>Calculating...</span>}{deliveryPlanning.route === 'unavailable' && <span>Route unavailable</span>}{deliveryPlanning.route?.distanceMiles && <><span>Distance: {deliveryPlanning.route.distanceMiles.toFixed(1)} miles</span><span>Drive Time: {deliveryPlanning.route.durationMinutes} minutes</span><button type="button" className={tutorialEnabled && deliveryPlanning.loadId === tutorialLoadId && !deliveryPlanning.selected ? 'tutorial-target' : ''} onClick={() => setDeliveryPlanning((current) => ({ ...current, selected: true }))}>{deliveryPlanning.selected ? 'ROUTE SELECTED' : 'SELECT ROUTE'}</button></>}<div><button type="button" onClick={() => { setDeliveryPlanning(null); restoreClockAfterModal() }}>BACK</button><button type="button" className={tutorialEnabled && deliveryPlanning.loadId === tutorialLoadId && deliveryPlanning.selected ? 'tutorial-target' : ''} disabled={!deliveryPlanning.selected} onClick={() => { setLoads((current) => current.map((load) => load.id === deliveryPlanning.loadId ? { ...load, deliveryPlanningStatus: 'route-ready', plannedLoadedMiles: deliveryPlanning.route.distanceMiles, plannedLoadedDriveTimeMinutes: deliveryPlanning.route.durationMinutes, plannedLoadedRouteGeometry: deliveryPlanning.route.routeShape, selectedLoadedRouteId: 'recommended' } : load)); setDeliveryPlanning(null); restoreClockAfterModal() }}>CONFIRM PLAN</button></div></div>}
        {planningMode && <div className="map-evaluation"><strong>TRIP PLANNING</strong><span>{planningMode.loadId}</span><span>Driver: Marcus</span><strong>NEXT STOP</strong><span>{planningPickup?.name || 'Pickup'}</span><span>Pickup Window: {planningLoad ? formatAppointment(planningLoad.pickupDayIndex, planningLoad.pickupWindowStartMinutes, planningLoad.pickupWindowEndMinutes) : '—'}</span><strong>ROUTE OPTIONS</strong>{planningMode.route === 'loading' && <span>Calculating...</span>}{planningMode.route === 'unavailable' && <span>Route unavailable</span>}{planningMode.route?.distanceMiles && <><span>Distance: {planningMode.route.distanceMiles.toFixed(1)} miles</span><span>Drive Time: {planningMode.route.durationMinutes} minutes</span><span>Estimated Arrival: {formatCompactDate(gameTime.gameDayIndex)} • {formatTime(gameTime.totalMinutesOfDay + planningMode.route.durationMinutes)}</span><button type="button" className={tutorialEnabled && planningMode.loadId === tutorialLoadId && !planningMode.selected ? 'tutorial-target' : ''} onClick={() => setPlanningMode((current) => ({ ...current, selected: true }))}>{planningMode.selected ? 'ROUTE SELECTED' : 'SELECT ROUTE'}</button></>}<div><button type="button" onClick={() => { setPlanningMode(null); restoreClockAfterModal() }}>BACK</button><button type="button" className={tutorialEnabled && planningMode.loadId === tutorialLoadId && planningMode.selected ? 'tutorial-target' : ''} disabled={!planningMode.selected} onClick={() => { setLoads((current) => current.map((load) => load.id === planningMode.loadId ? { ...load, planningStatus: 'route-ready', plannedDeadheadMiles: planningMode.route.distanceMiles, plannedDeadheadDriveTimeMinutes: planningMode.route.durationMinutes, plannedDeadheadRouteGeometry: planningMode.route.routeShape, selectedDeadheadRouteId: 'recommended' } : load)); setPlanningMode(null); restoreClockAfterModal() }}>CONFIRM PLAN</button></div></div>}
        {driverFitEvaluation && <div className="map-evaluation"><strong>DRIVER FIT</strong><span>{driverFitEvaluation.loadId}</span><span>Candidate: {driverFitEvaluation.driverName}</span><strong>DEADHEAD</strong><span>Distance: {driverFitEvaluation.deadheadMiles.toFixed(1)} miles</span><span>Drive Time: {driverFitEvaluation.deadheadMinutes} minutes</span><strong>PICKUP</strong><span>Estimated Arrival: {formatCompactDate(driverFitEvaluation.arrivalDay)} • {formatTime(driverFitEvaluation.arrivalMinutes)}</span><span>Window: {formatAppointment(driverFitEvaluation.pickupDayIndex, driverFitEvaluation.pickupStart, driverFitEvaluation.pickupEnd)}</span><span>Status: {driverFitEvaluation.status}</span><strong>LOADED ESTIMATE</strong>{driverFitEvaluation.loadedEstimate === 'loading' && <span>Calculating...</span>}{driverFitEvaluation.loadedEstimate === 'unavailable' && <span>Estimate unavailable</span>}{driverFitEvaluation.loadedEstimate && typeof driverFitEvaluation.loadedEstimate === 'object' && <><span>Distance: {driverFitEvaluation.loadedEstimate.loadedEstimateMiles.toFixed(1)} miles</span><span>Drive Time: {driverFitEvaluation.loadedEstimate.loadedEstimateDriveTimeMinutes} minutes</span></>}<div><button type="button" onClick={() => { setDriverFitEvaluation(null); restoreClockAfterModal(); setPhoneInitialScreen('driverFit'); setPhoneLoadId(driverFitEvaluation.loadId); setIsPhoneOpen(true) }}>BACK</button><button type="button" className={tutorialEnabled && driverFitEvaluation.loadId === tutorialLoadId ? 'tutorial-target' : ''} onClick={() => { setLoads((current) => current.map((load) => load.id === driverFitEvaluation.loadId ? { ...load, driverFitVerified: true, candidateDriverId: driverFitEvaluation.driverId } : load)); setDriverFitEvaluation(null); restoreClockAfterModal(); setPhoneInitialScreen('loadDetails'); setPhoneLoadId(driverFitEvaluation.loadId); setIsPhoneOpen(true) }}>CONFIRM FIT</button></div></div>}
        <button
          type="button"
          className="markets-button"
          onClick={onOpenMarkets}
          aria-label="Open market selection"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V11M10 18V7M15 18v-5M20 18V4"/></svg>
          <span>MARKET</span>
        </button>
        {!isPhoneOpen && (
          <button
            type="button"
            className={`phone-button ${!isPhoneOpen && (hasUnreadTutorialEmail || shouldHighlightPhoneForPod || shouldHighlightPhoneForLedger) && !driverFitEvaluation ? 'tutorial-target' : ''}`}
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
            ledgerUnreadCount={loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved && !seenLedgerReceivableIds.includes(load.id)).length + getReceivables(loads, carriers, ledgerWorkflowByLoadId).filter((item) => item.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(item.loadId)).length}
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
    </div>
  )
}

export default MainGameScreen
