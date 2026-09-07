import { useEffect, useRef, useState } from 'react'
import GameMap from './GameMap.jsx'
import LoadingChallenge from './LoadingChallenge.jsx'
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
import { PICKUP_LOADING_MINUTES } from '../data/pickupConfig.js'
import { getCurrentTutorialObjective } from '../utils/tutorialObjective.js'
import { getEndDayStatus } from '../utils/dayLoop.js'
import { getDriverActiveLoad, getNextQueuePosition } from '../utils/driverQueue.js'


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


function formatStatusLabel(status = '') {
  const labels = {
    assigned: 'READY TO PLAN',
    'en-route-pickup': 'EN ROUTE TO PICKUP',
    'at-pickup': 'ARRIVED AT PICKUP',
    'checking-in-pickup': 'CHECKING IN',
    'waiting-at-pickup': 'WAITING FOR DOCK',
    'checked-in-pickup': 'DOCK READY',
    'loading-at-pickup': 'LOADING',
    loaded: 'LOADED · PLAN DELIVERY',
    'en-route-delivery': 'EN ROUTE TO DELIVERY',
    'at-delivery': 'ARRIVED AT DELIVERY',
    'checked-in-delivery': 'CHECKED IN AT DELIVERY',
    'unloading-delivery': 'UNLOADING',
    'awaiting-pod': 'DELIVERED · POD PENDING',
  }
  return labels[status] || status.replaceAll('-', ' ').toUpperCase()
}

function getActiveDriverMeta(load, gameTime, runtimeProgress) {
  if (!load) return ''
  if (load.tripStatus === 'en-route-pickup' && Number.isFinite(load.plannedDeadheadDriveTimeMinutes) && Number.isFinite(load.departureGameMinute)) {
    const eta = load.departureGameMinute + load.plannedDeadheadDriveTimeMinutes
    return `ETA ${formatTime(eta % 1440)}`
  }
  if (load.tripStatus === 'en-route-delivery' && Number.isFinite(load.plannedLoadedDriveTimeMinutes) && Number.isFinite(load.deliveryDepartureGameMinute)) {
    const eta = load.deliveryDepartureGameMinute + load.plannedLoadedDriveTimeMinutes
    return `ETA ${formatTime(eta % 1440)}`
  }
  if (Number.isFinite(runtimeProgress) && ['en-route-pickup', 'en-route-delivery'].includes(load.tripStatus)) return `${Math.round(runtimeProgress * 100)}%`
  return 'TAP FOR DRIVER'
}



const PICKUP_COMPLETE_STATUSES = new Set(['loading-at-pickup', 'loaded', 'en-route-delivery', 'at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'])
const DELIVERY_ARRIVED_STATUSES = new Set(['at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'])

function getAppointmentResult(load, leg) {
  if (!load) return { status: 'unknown', label: '—', lateMinutes: 0, onTime: false }
  const isPickup = leg === 'pickup'
  const arrival = isPickup ? load.pickupArrivalGameMinute : load.deliveryArrivalGameMinute
  const dayIndex = isPickup ? load.pickupDayIndex : load.deliveryDayIndex
  const start = isPickup ? load.pickupWindowStartMinutes : load.deliveryWindowStartMinutes
  const end = isPickup ? load.pickupWindowEndMinutes : load.deliveryWindowEndMinutes
  if (![arrival, dayIndex, start, end].every(Number.isFinite)) return { status: 'unknown', label: '—', lateMinutes: 0, onTime: false }
  const windowStart = dayIndex * 1440 + start
  const windowEnd = dayIndex * 1440 + end
  if (arrival > windowEnd) {
    const lateMinutes = Math.max(1, Math.round(arrival - windowEnd))
    return { status: 'late', label: `${lateMinutes} MIN LATE`, lateMinutes, onTime: false }
  }
  if (arrival < windowStart) return { status: 'early', label: 'EARLY', lateMinutes: 0, onTime: true }
  return { status: 'on-time', label: 'ON TIME', lateMinutes: 0, onTime: true }
}

function getLoadXpBreakdown(load) {
  const pickup = getAppointmentResult(load, 'pickup')
  const delivery = getAppointmentResult(load, 'delivery')
  const base = 100
  const pickupXp = pickup.status === 'late' ? -10 : pickup.onTime ? 15 : 0
  const deliveryXp = delivery.status === 'late' ? -20 : delivery.onTime ? 20 : 0
  const podXp = load?.pod?.approved ? 15 : 0
  return { pickup, delivery, base, pickupXp, deliveryXp, podXp, total: Math.max(0, base + pickupXp + deliveryXp + podXp) }
}

function getAppointmentAlerts(loads, now) {
  const alerts = []
  const formatMinutes = (minutes) => `${Math.max(0, Math.ceil(minutes))} MIN`

  loads.forEach((load) => {
    if (!load || load.status === 'available' || ['completed', 'delivered'].includes(load.tripStatus)) return
    const loadRef = load.loadNumber || load.id
    const pickupArrival = load.pickupArrivalGameMinute
    const pickupStart = Number.isFinite(load.pickupDayIndex) && Number.isFinite(load.pickupWindowStartMinutes) ? load.pickupDayIndex * 1440 + load.pickupWindowStartMinutes : null
    const pickupEnd = Number.isFinite(load.pickupDayIndex) && Number.isFinite(load.pickupWindowEndMinutes) ? load.pickupDayIndex * 1440 + load.pickupWindowEndMinutes : null
    const pickupStillRelevant = !Number.isFinite(pickupArrival) && !PICKUP_COMPLETE_STATUSES.has(load.tripStatus)

    if (pickupStillRelevant && Number.isFinite(pickupStart) && Number.isFinite(pickupEnd)) {
      if (now > pickupEnd) {
        const late = now - pickupEnd
        alerts.push({ id: `appt-pickup-${load.id}`, tone: 'danger', action: 'load', loadId: load.id, title: `${loadRef} · PICKUP LATE`, detail: `Pickup appointment has been missed. ${formatMinutes(late)} late.`, value: `${formatMinutes(late)} LATE` })
      } else if (now >= pickupStart) {
        alerts.push({ id: `appt-pickup-${load.id}`, tone: 'attention', action: 'load', loadId: load.id, title: `${loadRef} · PICKUP WINDOW OPEN`, detail: `Pickup appointment is active now. ${formatMinutes(pickupEnd - now)} remain.`, value: `${formatMinutes(pickupEnd - now)} LEFT` })
      } else if (pickupStart - now <= 30) {
        alerts.push({ id: `appt-pickup-${load.id}`, tone: 'attention', action: 'load', loadId: load.id, title: `${loadRef} · PICKUP APPROACHING`, detail: `Pickup appointment opens in ${formatMinutes(pickupStart - now)}.`, value: formatMinutes(pickupStart - now) })
      }
      return
    }

    const deliveryArrival = load.deliveryArrivalGameMinute
    const deliveryStart = Number.isFinite(load.deliveryDayIndex) && Number.isFinite(load.deliveryWindowStartMinutes) ? load.deliveryDayIndex * 1440 + load.deliveryWindowStartMinutes : null
    const deliveryEnd = Number.isFinite(load.deliveryDayIndex) && Number.isFinite(load.deliveryWindowEndMinutes) ? load.deliveryDayIndex * 1440 + load.deliveryWindowEndMinutes : null
    const deliveryRelevant = PICKUP_COMPLETE_STATUSES.has(load.tripStatus) && !Number.isFinite(deliveryArrival) && !DELIVERY_ARRIVED_STATUSES.has(load.tripStatus)
    if (!deliveryRelevant || !Number.isFinite(deliveryStart) || !Number.isFinite(deliveryEnd)) return

    if (now > deliveryEnd) {
      const late = now - deliveryEnd
      alerts.push({ id: `appt-delivery-${load.id}`, tone: 'danger', action: 'load', loadId: load.id, title: `${loadRef} · DELIVERY LATE`, detail: `Delivery appointment has been missed. ${formatMinutes(late)} late.`, value: `${formatMinutes(late)} LATE` })
    } else if (now >= deliveryStart) {
      alerts.push({ id: `appt-delivery-${load.id}`, tone: 'attention', action: 'load', loadId: load.id, title: `${loadRef} · DELIVERY WINDOW OPEN`, detail: `Delivery appointment is active now. ${formatMinutes(deliveryEnd - now)} remain.`, value: `${formatMinutes(deliveryEnd - now)} LEFT` })
    } else if (deliveryStart - now <= 30) {
      alerts.push({ id: `appt-delivery-${load.id}`, tone: 'attention', action: 'load', loadId: load.id, title: `${loadRef} · DELIVERY APPROACHING`, detail: `Delivery appointment opens in ${formatMinutes(deliveryStart - now)}.`, value: formatMinutes(deliveryStart - now) })
    }
  })
  return alerts
}

function MainGameScreen({ selectedMarket, gameTime, loads, setLoads, drivers, setDrivers, carriers, onActivateCarrier, carrierApplicationsById, onApplyCarrier, onAcceptAgreement, onApprovePod, emailMessages, setEmailMessages, driverMessages: persistedDriverMessages = [], setDriverMessages, businessDocuments = [], tutorialEnabled = false, operationDay = 1, dayLoopPhase = 'operating', dayReport = null, playerProgression, onEndDay, onContinueDay, onBeginOperations, plannedRoute, setPlannedRoute, isGameClockPaused = false, setGameClockPaused, runtimePositions, runtimeProgress, setRuntimeProgress, simulationSpeed, setSimulationSpeed, onOpenMarkets, onResetGame, seenLedgerReceivableIds, seenLedgerPaymentReadyIds, onOpenLedger, ledgerWorkflowByLoadId, setLedgerWorkflowByLoadId, setGameTime, onAwardLoadXp }) {
  const [devOpen, setDevOpen] = useState(false)
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [phoneInitialScreen, setPhoneInitialScreen] = useState('home')
  const [driverFitEvaluation, setDriverFitEvaluation] = useState(null)
  const [phoneLoadId, setPhoneLoadId] = useState(null)
  const [phoneInitialDriverId, setPhoneInitialDriverId] = useState(null)
  const [planningMode, setPlanningMode] = useState(null)
  const [deliveryPlanning, setDeliveryPlanning] = useState(null)
  const [pauseStateBeforeModal, setPauseStateBeforeModal] = useState(false)
  const [operationsOpen, setOperationsOpen] = useState(false)
  const [endDayOpen, setEndDayOpen] = useState(false)
  const [loadingChallengeLoadId, setLoadingChallengeLoadId] = useState(null)
  const [driverFocusRequest, setDriverFocusRequest] = useState(0)
  const [facilityFocusRequest, setFacilityFocusRequest] = useState(0)
  const [facilityFocusRole, setFacilityFocusRole] = useState(null)
  const [driverFocusId, setDriverFocusId] = useState('marcus')
  const [driverHubOpen, setDriverHubOpen] = useState(false)
  const [seenLoadResultIds, setSeenLoadResultIds] = useState([])
  const [completionResultLoadId, setCompletionResultLoadId] = useState(null)
  const [freightBrowseMode, setFreightBrowseMode] = useState(false)
  const [freightBrowseLoadId, setFreightBrowseLoadId] = useState(null)
  const [freightBrowseRouteGeometry, setFreightBrowseRouteGeometry] = useState(null)
  const [freightBrowseRouteStatus, setFreightBrowseRouteStatus] = useState('idle')
  const freightBrowseRouteRequestRef = useRef(0)

  const receivables = getReceivables(loads, carriers, ledgerWorkflowByLoadId)
  const ledgerSummary = getLedgerSummary(receivables)
  const endDayStatus = getEndDayStatus(loads, receivables)
  const closeoutEmail = emailMessages.find((message) => message.id === 'mentor-tutorial-complete')
  const currentBrowseMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const freightBrowseLoads = loads.filter((load) => {
    const marketPostMinute = Number.isFinite(load.marketPostMinutes) ? ((load.pickupDayIndex ?? gameTime.gameDayIndex) * 1440 + load.marketPostMinutes) : null
    const timeUnlocked = Number.isFinite(load.postedGameMinute) ? currentBrowseMinute >= load.postedGameMinute : !Number.isFinite(marketPostMinute) || currentBrowseMinute >= marketPostMinute
    return load.status === 'available' && timeUnlocked
  })
  const freightBrowseLoad = freightBrowseLoads.find((load) => load.id === freightBrowseLoadId) || null
  const freightBrowsePickup = mapLocations.find((location) => location.id === freightBrowseLoad?.pickupLocationId) || null
  const freightBrowseDelivery = mapLocations.find((location) => location.id === freightBrowseLoad?.deliveryLocationId) || null
  // End Day is part of the normal operation loop. Communications may report closeout,
  // but they never unlock or gate the control.
  const showEndDay = dayLoopPhase === 'operating'
  const endDayTutorialTarget = false
  const endDayLockedForCloseout = false
  const dayLoopOverlayActive = dayLoopPhase === 'results' || dayLoopPhase === 'briefing'

  // Prefer Marcus's live operation. A completed tutorial load can briefly coexist in
  // hydrated saves, and must never drive the map/popup for the newer load.
  const assignedLoad = getDriverActiveLoad(loads, 'marcus')
    || loads.find((load) => load.assignedDriverId === 'marcus' && !['queued', 'delivered', 'completed'].includes(load.tripStatus))
    || null
  const podNotificationCount = loads.filter((load) => load.tripStatus === 'awaiting-pod').length
  const emailUnreadCount = emailMessages?.filter((message) => !message.read).length || 0
  const currentAbsoluteGameMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const ledgerNotificationCount = loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved && !seenLedgerReceivableIds.includes(load.id)).length + receivables.filter((item) => item.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(item.loadId)).length
  const lifecycleDriverMessages = loads.flatMap((load) => {
    // Simulation events can create human communication, but the messages never
    // create or advance those events. The load remains the source of truth.
    const messageDriverId = load.assignedDriverId || load.completedDriverId
    const driver = drivers.find((item) => item.id === messageDriverId)
    const driverName = driver?.fullName || driver?.name || (messageDriverId === 'marcus' ? 'Marcus Reed' : 'Driver')
    const messages = []
    if (Number.isFinite(load.pickupArrivalGameMinute)) {
      const pickupFacility = mapLocations.find((location) => location.id === load.pickupLocationId)
      messages.push({
        id: `${load.id}-pickup-arrival`,
        loadId: load.id,
        driverId: messageDriverId,
        sender: driverName,
        senderRole: 'Driver',
        direction: 'inbound',
        body: `I'm here at ${pickupFacility?.name || 'pickup'}. Checking in now and grabbing the paperwork.`,
        read: Boolean(load.pickupDriverMessageRead),
        receivedGameMinute: load.pickupArrivalGameMinute,
      })
    }
    if (Number.isFinite(load.pickupCheckInGameMinute)) {
      messages.push({
        id: `${load.id}-pickup-checked-in`,
        loadId: load.id,
        driverId: messageDriverId,
        sender: driverName,
        senderRole: 'Driver',
        direction: 'inbound',
        body: "Checked in. They've got me waiting on a door.",
        read: Boolean(load.pickupCheckedInDriverMessageRead),
        receivedGameMinute: load.pickupCheckInGameMinute,
      })
    }
    if (['loaded', 'en-route-delivery', 'at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'].includes(load.tripStatus) && Number.isFinite(load.loadingStartGameMinute)) {
      messages.push({
        id: `${load.id}-loaded-ready`,
        loadId: load.id,
        driverId: messageDriverId,
        sender: driverName,
        senderRole: 'Driver',
        direction: 'inbound',
        body: 'Loaded. Got the paperwork. Ready to roll.',
        read: Boolean(load.loadedDriverMessageRead),
        receivedGameMinute: load.pickupLoadingCompleteGameMinute ?? (load.loadingStartGameMinute + PICKUP_LOADING_MINUTES),
      })
    }
    if (Number.isFinite(load.deliveryArrivalGameMinute)) {
      const deliveryFacility = mapLocations.find((location) => location.id === load.deliveryLocationId)
      messages.push({
        id: `${load.id}-delivery-arrival`,
        loadId: load.id,
        driverId: messageDriverId,
        sender: driverName,
        senderRole: 'Driver',
        direction: 'inbound',
        body: `At delivery — ${deliveryFacility?.name || 'receiver'}. Heading in to check in.`,
        read: Boolean(load.deliveryDriverMessageRead),
        receivedGameMinute: load.deliveryArrivalGameMinute ?? currentAbsoluteGameMinute,
      })
    }
    return messages
  })
  const lifecycleMessageIds = new Set(lifecycleDriverMessages.map((message) => message.id))
  const driverMessages = [
    ...persistedDriverMessages.filter((message) => !lifecycleMessageIds.has(message.id)),
    ...lifecycleDriverMessages,
  ]
  const driverMessageUnreadCount = driverMessages.filter((message) => message.direction !== 'outbound' && !message.read).length
  const phoneNotificationCount = emailUnreadCount + driverMessageUnreadCount
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
    if (tutorialLoad.tripStatus === 'checked-in-pickup') return 'BEGIN_LOADING'
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
    const pickupName = mapLocations.find((location) => location.id === assignedLoad.pickupLocationId)?.name || 'pickup'
    const deliveryName = mapLocations.find((location) => location.id === assignedLoad.deliveryLocationId)?.name || 'delivery'
    const loadRef = assignedLoad.loadNumber || assignedLoad.id
    // Alerts surface operational attention; tapping them navigates but never mutates
    // trip state. Explicit game actions live on the driver/facility workflow itself.
    if (assignedLoad.tripStatus === 'checked-in-pickup') return { action: 'pickup', title: `${loadRef} · DOCK READY`, detail: `Marcus has been called to a door at ${pickupName}. Loading is ready to begin.`, value: 'BEGIN LOADING' }
    if (assignedLoad.tripStatus === 'at-delivery') return { action: 'delivery', title: `${loadRef} · DELIVERY`, detail: `Marcus is waiting at ${deliveryName}. Check in when ready.`, value: 'OPEN DELIVERY' }
    if (assignedLoad.tripStatus === 'assigned' && assignedLoad.planningStatus !== 'route-ready') return { action: 'driver', title: `${loadRef} · PICKUP PLAN REQUIRED`, detail: 'Plan the pickup trip before dispatch.', value: 'VIEW DRIVER' }
    if (assignedLoad.tripStatus === 'assigned' && assignedLoad.planningStatus === 'route-ready' && !Number.isFinite(assignedLoad.pickupDriverBriefedGameMinute)) return { action: 'messages', title: `${loadRef} · DRIVER UPDATE REQUIRED`, detail: 'Send Marcus the correct load details before dispatch.', value: 'MESSAGE MARCUS' }
    if (assignedLoad.tripStatus === 'assigned' && assignedLoad.planningStatus === 'route-ready') return { action: 'driver', title: 'MARCUS REED', detail: 'Driver briefed · pickup dispatch ready.', value: 'VIEW DRIVER' }
    if (assignedLoad.tripStatus === 'loaded' && assignedLoad.deliveryPlanningStatus === 'route-ready') return { action: 'driver', title: 'MARCUS REED', detail: 'Delivery route ready — Marcus can be dispatched.', value: 'VIEW DRIVER' }
    if (assignedLoad.tripStatus === 'loaded') return { action: 'driver', title: `${loadRef} · DELIVERY PLAN REQUIRED`, detail: 'Loaded — delivery trip planning is required.', value: 'VIEW DRIVER' }
    return null
  })()

  const openFreightBrowseMap = () => {
    setFreightBrowseMode(true)
    setFreightBrowseLoadId(null)
    setFreightBrowseRouteGeometry(null)
    setFreightBrowseRouteStatus('idle')
    setIsPhoneOpen(false)
  }

  const closeFreightBrowseMap = () => {
    setFreightBrowseMode(false)
    setFreightBrowseLoadId(null)
    setFreightBrowseRouteGeometry(null)
    setFreightBrowseRouteStatus('idle')
  }

  const selectFreightBrowseLoad = (loadId) => {
    const load = freightBrowseLoads.find((item) => item.id === loadId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load?.deliveryLocationId)
    if (!load || !pickup || !delivery) return

    const requestId = freightBrowseRouteRequestRef.current + 1
    freightBrowseRouteRequestRef.current = requestId
    setFreightBrowseLoadId(loadId)
    setFreightBrowseRouteStatus('loading')
    // Do not flash a straight-line placeholder. The map stays clean until the
    // routed road geometry is ready, then draws the final lane once.
    setFreightBrowseRouteGeometry(null)
    calculateRoute(pickup, delivery)
      .then((route) => {
        if (freightBrowseRouteRequestRef.current !== requestId) return
        setFreightBrowseRouteGeometry(route.routeShape)
        setFreightBrowseRouteStatus('ready')
      })
      .catch(() => {
        if (freightBrowseRouteRequestRef.current !== requestId) return
        setFreightBrowseRouteGeometry(null)
        setFreightBrowseRouteStatus('unavailable')
      })
  }

  const clearFreightBrowseSelection = () => {
    freightBrowseRouteRequestRef.current += 1
    setFreightBrowseLoadId(null)
    setFreightBrowseRouteGeometry(null)
    setFreightBrowseRouteStatus('idle')
  }

  const openFreightBrowseLoad = (loadId) => {
    // Leaving FreightLink Browse Mode transfers ownership back to the phone.
    // Clear every browse-only selection before the phone opens so later load
    // lifecycle changes (accept/assign/plan) cannot leave the main map holding
    // a stale reference to a load that is no longer in the AVAILABLE set.
    setPhoneLoadId(loadId)
    setPhoneInitialScreen('loadDetails')
    setFreightBrowseMode(false)
    setFreightBrowseLoadId(null)
    setFreightBrowseRouteGeometry(null)
    setFreightBrowseRouteStatus('idle')
    setIsPhoneOpen(true)
  }

  useEffect(() => {
    if (!onAwardLoadXp) return
    loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved).forEach((load) => {
      onAwardLoadXp(load.id, getLoadXpBreakdown(load).total)
    })
  }, [loads, onAwardLoadXp])

  const unseenCompletedLoads = loads.filter((load) => load.tripStatus === 'completed' && load.completedOperationDay === operationDay && !seenLoadResultIds.includes(load.id))
  const appointmentAlerts = getAppointmentAlerts(loads, currentAbsoluteGameMinute)
  const operationNotifications = [
    ...appointmentAlerts,
    ...unseenCompletedLoads.map((load) => ({
      id: `load-result-${load.id}`,
      tone: 'success',
      title: `${load.loadNumber || load.id} COMPLETE`,
      detail: 'Load closed successfully. Tap to view results.',
      value: 'VIEW RESULTS',
      action: 'load-result',
      loadId: load.id,
    })),
    ...(driverOperationAlert ? [{ id: 'driver-action', tone: 'attention', ...driverOperationAlert }] : []),
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
  const operationsNotificationCount = appointmentAlerts.length + podNotificationCount + ledgerNotificationCount + unseenCompletedLoads.length + (driverOperationAlert ? 1 : 0)

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
    if (['checked-in-pickup', 'loaded', 'at-delivery', 'awaiting-pod'].includes(assignedLoad.tripStatus) && simulationSpeed > 1) {
      setSimulationSpeed(1)
    }
  }, [assignedLoad?.tripStatus, isGameClockPaused, setSimulationSpeed, simulationSpeed])

  const pauseClockForModal = () => {
    setPauseStateBeforeModal(isGameClockPaused)
    if (!isGameClockPaused && simulationSpeed > 1) setSimulationSpeed(1)
  }
  const restoreClockAfterModal = () => {
    if (pauseStateBeforeModal) setGameClockPaused(true)
  }
  const evaluationRouteGeometry = driverFitEvaluation
    ? [
        ...(driverFitEvaluation.deadheadRoute || []),
        ...(driverFitEvaluation.loadedRoute || []).filter((point, index) => {
          if (index !== 0 || !(driverFitEvaluation.deadheadRoute || []).length) return true
          const previous = driverFitEvaluation.deadheadRoute[driverFitEvaluation.deadheadRoute.length - 1]
          return !previous || previous[0] !== point[0] || previous[1] !== point[1]
        }),
      ]
    : null
  const activeRouteGeometry = deliveryPlanning?.route?.routeShape
    || (evaluationRouteGeometry?.length ? evaluationRouteGeometry : null)
    || planningMode?.route?.routeShape
    || (assignedLoad?.tripStatus === 'en-route-delivery' ? assignedLoad.plannedLoadedRouteGeometry : null)
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
    const currentLoad = loads.find((item) => item.id === loadId)
    const existingActive = getDriverActiveLoad(loads, driverId)
    const queuePosition = existingActive ? getNextQueuePosition(loads, driverId) : 0
    const nextTripStatus = existingActive ? 'queued' : 'assigned'
    const selectedDriver = drivers.find((driver) => driver.id === driverId)

    setLoads((current) => current.map((load) => load.id === loadId ? {
      ...load,
      status: nextTripStatus,
      tripStatus: nextTripStatus,
      assignedDriverId: driverId,
      candidateDriverId: null,
      driverFitVerified: true,
      queuePosition,
      planningStatus: null,
      deliveryPlanningStatus: null,
      carrierId: selectedDriver?.carrierId ?? currentLoad?.carrierId ?? null,
      assignmentProjection: {
        deadheadMiles: fit.miles,
        deadheadMinutes: fit.minutes,
        arrivalDay: fit.arrivalDay,
        arrivalMinutes: fit.arrivalMinutes,
        status: fit.status || fit.label || null,
        afterLoadId: fit.afterLoadId || null,
      },
    } : load))

    setDrivers((current) => current.map((driver) => driver.id === driverId
      ? {
          ...driver,
          status: 'unavailable',
          assignedLoadId: existingActive?.id || loadId,
          queuedLoadIds: existingActive
            ? Array.from(new Set([...(driver.queuedLoadIds || []), loadId]))
            : (driver.queuedLoadIds || []),
          // Accepting a new assignment takes control away from idle positioning.
          idleSinceGameMinute: null,
          idleTargetLocationId: null,
          idleRouteStatus: null,
          idleRouteGeometry: null,
          idleRouteStartGameMinute: null,
          idleRouteDurationMinutes: null,
        }
      : driver))
  }
  const handleDriverAction = (actionType, loadId, driverId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (actionType === 'MESSAGE_DRIVER') {
      setPhoneInitialScreen('messageThread')
      setPhoneInitialDriverId(driverId || 'marcus')
      setIsPhoneOpen(true)
    }
    else if (actionType === 'PLAN_TRIP' && load.tripStatus === 'assigned') startPlanning(loadId, driverId)
    else if (actionType === 'SEND_TO_PICKUP' && load.tripStatus === 'assigned' && load.planningStatus === 'route-ready' && load.plannedDeadheadRouteGeometry) {
      if (!Number.isFinite(load.pickupDriverBriefedGameMinute)) {
        setPhoneInitialScreen('messageThread')
        setPhoneInitialDriverId(driverId || 'marcus')
        setIsPhoneOpen(true)
        return
      }
      setRuntimeProgress(0); setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'en-route-pickup', departureGameMinute: now } : item))
    } else if (actionType === 'PLAN_DELIVERY_TRIP' && load.tripStatus === 'loaded') startDeliveryPlanning(loadId)
    else if (actionType === 'DISPATCH' && load.tripStatus === 'loaded' && load.deliveryPlanningStatus === 'route-ready' && load.plannedLoadedRouteGeometry) {
      setRuntimeProgress(0); setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'en-route-delivery', deliveryDepartureGameMinute: now } : item))
    } else if (actionType === 'CHECK_IN' && load.tripStatus === 'at-delivery') setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'checked-in-delivery', deliveryCheckInGameMinute: now } : item))
    else if (actionType === 'BEGIN_LOADING' && load.tripStatus === 'checked-in-pickup') {
      pauseClockForModal()
      setLoadingChallengeLoadId(loadId)
    }
  }

  const completeLoadingChallenge = (result) => {
    const loadId = loadingChallengeLoadId
    if (!loadId || !result) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const gameMinutes = PICKUP_LOADING_MINUTES + (result.loadingDelayMinutes || 0)
    setLoads((current) => current.map((item) => item.id === loadId ? {
      ...item,
      tripStatus: 'loaded',
      loadingStartGameMinute: now,
      pickupLoadingCompleteGameMinute: now + gameMinutes,
      facilityOps: {
        ...(item.facilityOps || {}),
        pickup: { ...result, completedGameMinute: now + gameMinutes },
      },
      shipment: {
        expectedPallets: result.expectedPallets,
        loadedPallets: result.loadedPallets,
        missingPallets: result.missingPallets,
        damagedPallets: result.damagedPallets || 0,
        misplacedPallets: result.misplacedPallets || 0,
        palletManifest: result.palletManifest || [],
      },
      deliveryPlanningStatus: null,
      plannedLoadedRouteGeometry: null,
      plannedLoadedMiles: null,
      plannedLoadedDriveTimeMinutes: null,
      selectedLoadedRouteId: null,
    } : item))
    if (gameMinutes > 0) setGameTime?.((current) => {
      const absolute = current.gameDayIndex * 1440 + current.totalMinutesOfDay + gameMinutes
      return { ...current, gameDayIndex: Math.floor(absolute / 1440), totalMinutesOfDay: absolute % 1440 }
    })
    setLoadingChallengeLoadId(null)
    restoreClockAfterModal()
  }

  const markDriverMessageRead = (message) => {
    if (!message?.id) return
    if (persistedDriverMessages.some((item) => item.id === message.id)) {
      setDriverMessages?.((current) => current.map((item) => item.id === message.id ? { ...item, read: true } : item))
      return
    }
    if (!message.loadId) return
    setLoads((current) => current.map((load) => {
      if (load.id !== message.loadId) return load
      if (message.id.endsWith('-pickup-arrival')) return { ...load, pickupDriverMessageRead: true }
      if (message.id.endsWith('-pickup-checked-in')) return { ...load, pickupCheckedInDriverMessageRead: true }
      if (message.id.endsWith('-loaded-ready')) return { ...load, loadedDriverMessageRead: true }
      if (message.id.endsWith('-delivery-arrival')) return { ...load, deliveryDriverMessageRead: true }
      return load
    }))
  }

  const sendDriverLoadUpdate = (loadId, driverId = 'marcus') => {
    const load = loads.find((item) => item.id === loadId)
    if (!load || !setDriverMessages) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
    const loadRef = load.loadNumber || load.id
    const pickupWindow = `${formatCompactDate(load.pickupDayIndex)} ${formatTime(load.pickupWindowStartMinutes)}–${formatTime(load.pickupWindowEndMinutes)}`
    const deliveryWindow = `${formatCompactDate(load.deliveryDayIndex)} ${formatTime(load.deliveryWindowStartMinutes)}–${formatTime(load.deliveryWindowEndMinutes)}`
    const deadhead = Number.isFinite(load.plannedDeadheadMiles) ? `\nDeadhead: ${load.plannedDeadheadMiles.toFixed(1)} mi` : ''
    const body = `${loadRef}\nPickup: ${pickup?.name || 'Pickup'} · ${pickupWindow}\nDelivery: ${delivery?.name || 'Delivery'} · ${deliveryWindow}${deadhead}`
    const activeDriverLoad = getDriverActiveLoad(loads, driverId)
    const isCurrentLoad = activeDriverLoad?.id === load.id
    const briefingReady = isCurrentLoad && load.tripStatus === 'assigned' && load.planningStatus === 'route-ready'
    const token = `${now}-${Math.random().toString(36).slice(2, 8)}`

    setDriverMessages((current) => [...current,
      {
        id: `driver-out-${driverId}-${load.id}-${token}`,
        driverId,
        sender: 'You',
        senderRole: 'Dispatcher',
        direction: 'outbound',
        loadId: load.id,
        body,
        receivedGameMinute: now,
        read: true,
      },
      {
        id: `driver-reply-${driverId}-${load.id}-${token}`,
        driverId,
        sender: 'Marcus Reed',
        senderRole: 'Driver',
        direction: 'inbound',
        loadId: load.id,
        body: briefingReady
          ? 'Got it.'
          : isCurrentLoad
            ? 'I’ve got that one. Send me the plan once you’ve got it locked in.'
            : activeDriverLoad
              ? `Hold up — I thought I was on ${activeDriverLoad.loadNumber || activeDriverLoad.id}. You want me on this one instead?`
              : 'I don’t have that one on my board. You want me on it?',
        receivedGameMinute: now + 0.01,
        read: false,
      },
    ])

    if (briefingReady) {
      setLoads((current) => current.map((item) => item.id === load.id ? {
        ...item,
        pickupDriverBriefedGameMinute: now,
        pickupDriverBriefedLoadId: load.id,
      } : item))
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
  const timeControlsLocked = Boolean(endDayOpen || dayLoopOverlayActive)
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

  const openOperationNotification = (action, notification) => {
    if (action === 'load' && notification?.loadId) {
      setPhoneLoadId(notification.loadId)
      setPhoneInitialScreen('loadDetails')
      setIsPhoneOpen(true)
      return
    }
    if (action === 'load-result' && notification?.loadId) {
      setSeenLoadResultIds((current) => current.includes(notification.loadId) ? current : [...current, notification.loadId])
      setCompletionResultLoadId(notification.loadId)
      return
    }
    if (action === 'driver') { setDriverFocusId(assignedLoad?.assignedDriverId || assignedLoad?.completedDriverId || 'marcus'); setDriverFocusRequest((value) => value + 1); return }
    if (action === 'pickup') { setFacilityFocusRole('pickup'); setFacilityFocusRequest((value) => value + 1); return }
    if (action === 'delivery') { setFacilityFocusRole('delivery'); setFacilityFocusRequest((value) => value + 1); return }
    // Backward-safe handling for any notification created by an older hydrated save:
    // legacy action names now navigate to Marcus instead of dispatching or planning.
    if (['plan-delivery', 'dispatch-delivery', 'send-pickup'].includes(action)) {
      setDriverFocusId(assignedLoad?.assignedDriverId || assignedLoad?.completedDriverId || 'marcus')
      setDriverFocusRequest((value) => value + 1)
      return
    }
    if (action === 'messages') { setPhoneInitialScreen('messageThread'); setPhoneInitialDriverId('marcus'); setPhoneLoadId(null); setIsPhoneOpen(true); return }
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
        endDayDisabled={endDayLockedForCloseout || isPhoneOpen || Boolean(planningMode) || Boolean(deliveryPlanning) || endDayOpen}
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
        {loadingChallengeLoadId && (
          <LoadingChallenge
            load={loads.find((item) => item.id === loadingChallengeLoadId)}
            onCancel={() => { setLoadingChallengeLoadId(null); restoreClockAfterModal() }}
            onComplete={completeLoadingChallenge}
          />
        )}
        <GameMap driverFocusRequest={driverFocusRequest} driverFocusId={driverFocusId} facilityFocusRequest={facilityFocusRequest} facilityFocusRole={facilityFocusRole} loads={loads} activeRouteGeometry={freightBrowseMode ? freightBrowseRouteGeometry : activeRouteGeometry} routeFocusMode={freightBrowseMode && freightBrowseRouteGeometry ? 'freight-browse' : planningMode || deliveryPlanning ? 'planning' : null} routeReviewLoad={planningLoad || deliveryPlanningLoad} tripStatus={assignedLoad?.tripStatus} drivers={drivers} carriers={carriers} runtimePositions={runtimePositions} runtimeProgress={runtimeProgress} runtimeRoute={assignedLoad?.tripStatus === 'en-route-delivery' ? assignedLoad.plannedLoadedRouteGeometry : assignedLoad?.plannedDeadheadRouteGeometry} assignedLoad={assignedLoad} evaluationLoad={null} isDriverFitEvaluation={false} suppressAttention={Boolean(deliveryPlanning)} gameTime={gameTime} onDriverAction={handleDriverAction} tutorialEnabled={tutorialEnabled} tutorialDriverAction={tutorialDriverAction} freightBrowseMode={freightBrowseMode} freightBrowseLoads={freightBrowseLoads} freightBrowseSelectedLoadId={freightBrowseLoadId} onFreightBrowseSelect={selectFreightBrowseLoad} />
        {freightBrowseMode && (
          <>
            <div className="freight-browse-mode-bar">
              <div><span>FREIGHTLINK</span><strong>AVAILABLE LOADS</strong></div>
              <div className="freight-browse-mode-actions">
                {freightBrowseLoad && <button type="button" className="back" onClick={clearFreightBrowseSelection}>← BACK</button>}
                <button type="button" onClick={closeFreightBrowseMap}>EXIT</button>
              </div>
            </div>
            {!freightBrowseLoad && <div className="freight-browse-map-hint">Tap a pickup pin to preview its full pickup → delivery lane.</div>}
            {freightBrowseLoad && (
              <div className="freight-browse-preview-sheet">
                <div className="freight-browse-preview-heading">
                  <div><span>{freightBrowseLoad.loadNumber || freightBrowseLoad.id}</span><small>{freightBrowseRouteStatus === 'loading' ? 'CALCULATING ROUTE…' : freightBrowseRouteStatus === 'unavailable' ? 'ROUTE UNAVAILABLE' : `LOAD ${freightBrowseLoad.listedMiles?.toFixed?.(1) || '—'} MI`}</small></div>
                  <strong>${freightBrowseLoad.rate}</strong>
                </div>
                <div className="freight-browse-preview-route"><span>{freightBrowsePickup?.name || 'Pickup'}</span><b>→</b><span>{freightBrowseDelivery?.name || 'Delivery'}</span></div>
                <div className="freight-browse-preview-meta"><span>PICKUP {formatCompactDate(freightBrowseLoad.pickupDayIndex)} · {formatTime(freightBrowseLoad.pickupWindowStartMinutes)}</span><span>DELIVERY {formatCompactDate(freightBrowseLoad.deliveryDayIndex)} · {formatTime(freightBrowseLoad.deliveryWindowStartMinutes)}</span></div>
                <button type="button" onClick={() => openFreightBrowseLoad(freightBrowseLoad.id)}>VIEW LOAD</button>
              </div>
            )}
          </>
        )}

        {deliveryPlanning && (
          <div className="map-evaluation trip-planning-v2 delivery-planning-v2">
            <div className="trip-plan-v2-heading">
              <div>
                <span className="trip-plan-v2-kicker">DELIVERY PLANNING</span>
                <strong>{loads.find((item) => item.id === deliveryPlanning.loadId)?.loadNumber || deliveryPlanning.loadId}</strong>
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
                <strong>{loads.find((item) => item.id === planningMode.loadId)?.loadNumber || planningMode.loadId}</strong>
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
              <span>ROUTE TO PICKUP</span>
              <small>Timing and load decision</small>
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
                      <span>APPOINTMENT</span>
                      <strong>{formatPlanningBuffer(planningBufferMinutes)}</strong>
                    </div>
                    <div>
                      <span>LOADED MILES</span>
                      <strong>{Number.isFinite(planningLoad?.listedMiles) ? `${planningLoad.listedMiles.toFixed(1)} mi` : '—'}</strong>
                    </div>
                    <div>
                      <span>LOAD PAY</span>
                      <strong>{Number.isFinite(planningLoad?.rate) ? `$${planningLoad.rate.toLocaleString()}` : '—'}</strong>
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

        {!isPhoneOpen && !planningMode && !deliveryPlanning && (
          <>
            <button
              type="button"
              className={`driver-hub-launcher${driverHubOpen ? ' open' : ''}`}
              onClick={() => setDriverHubOpen((value) => !value)}
              aria-expanded={driverHubOpen}
            >
              <span className="driver-hub-launcher-icon">D</span>
              <span>DRIVERS</span>
              <strong>{drivers.length}</strong>
            </button>

            {driverHubOpen && (
              <section className="driver-hub-sheet" aria-label="Drivers">
                <header>
                  <div><small>FLEET</small><strong>Drivers</strong></div>
                  <button type="button" onClick={() => setDriverHubOpen(false)}>CLOSE</button>
                </header>
                <div className="driver-hub-list">
                  {drivers.map((driver) => {
                    const driverLoad = getDriverActiveLoad(loads, driver.id)
                      || loads.find((load) => load.assignedDriverId === driver.id && !['delivered', 'completed'].includes(load.tripStatus))
                      || loads.find((load) => load.assignedDriverId === driver.id)
                    const driverName = driver.fullName || driver.name || 'Driver'
                    const driverStatus = driverLoad ? formatStatusLabel(driverLoad.tripStatus) : (driver.status === 'available' ? 'AVAILABLE' : String(driver.status || 'OFF DUTY').replaceAll('-', ' ').toUpperCase())
                    return (
                      <button
                        type="button"
                        className={`driver-hub-row state-${driverLoad?.tripStatus || driver.status || 'idle'}`}
                        key={driver.id}
                        onClick={() => {
                          setDriverFocusId(driver.id)
                          setDriverFocusRequest((value) => value + 1)
                          setDriverHubOpen(false)
                        }}
                      >
                        <span className="driver-hub-avatar">{driverName.charAt(0).toUpperCase()}</span>
                        <span className="driver-hub-copy">
                          <strong>{driverName}{driverLoad ? <small> · {driverLoad.id}</small> : null}</strong>
                          <span>{driverStatus}</span>
                          {driverLoad && driver.id === 'marcus' ? <small>{getActiveDriverMeta(driverLoad, gameTime, runtimeProgress)}</small> : null}
                        </span>
                        <span className="driver-hub-jump">VIEW →</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {completionResultLoadId && (() => {
          const resultLoad = loads.find((load) => load.id === completionResultLoadId)
          if (!resultLoad) return null
          const resultPickup = mapLocations.find((location) => location.id === resultLoad.pickupLocationId)
          const resultDelivery = mapLocations.find((location) => location.id === resultLoad.deliveryLocationId)
          const deadhead = Number.isFinite(resultLoad.plannedDeadheadMiles) ? resultLoad.plannedDeadheadMiles : null
          const loaded = Number.isFinite(resultLoad.plannedLoadedMiles) ? resultLoad.plannedLoadedMiles : resultLoad.listedMiles
          const receivable = receivables.find((item) => item.loadId === resultLoad.id)
          const feePercent = Number(receivable?.agreementPercentage || 0)
          const dispatcherEarnings = Number(receivable?.dispatchRevenue || 0)
          const xpBreakdown = getLoadXpBreakdown(resultLoad)
          return (
            <div className="load-result-backdrop" role="dialog" aria-modal="true" aria-label={`${resultLoad.id} load result`}>
              <section className="load-result-card load-result-card-v2">
                <header className="load-result-header-v2">
                  <div>
                    <span className="load-result-kicker">LOAD RESULT</span>
                    <h2>{resultLoad.id}</h2>
                    <p>{resultPickup?.name || 'Pickup'} → {resultDelivery?.name || 'Delivery'}</p>
                  </div>
                  <button className="load-result-close" type="button" aria-label="Close results" onClick={() => setCompletionResultLoadId(null)}>×</button>
                </header>

                <div className="load-result-state-v2"><span>LOAD CLOSED</span><strong>✓</strong></div>

                <section className="load-result-earnings load-result-earnings-v2">
                  <span>DISPATCHER EARNINGS</span>
                  <strong>+${dispatcherEarnings.toFixed(2)}</strong>
                  <small>{feePercent}% DISPATCH FEE · EARNED</small>
                  <div>Carrier payout <b>${Number(resultLoad.rate || 0).toLocaleString()}</b></div>
                </section>

                <div className="load-result-performance-v2">
                  <div><span>DEADHEAD</span><strong>{deadhead === null ? '—' : `${deadhead.toFixed(1)} mi`}</strong></div>
                  <div><span>LOADED</span><strong>{Number.isFinite(loaded) ? `${loaded.toFixed(1)} mi` : '—'}</strong></div>
                  <div className={xpBreakdown.pickup.status === 'late' ? 'appointment-late' : 'appointment-good'}><span>PICKUP</span><strong>{xpBreakdown.pickup.label}</strong></div>
                  <div className={xpBreakdown.delivery.status === 'late' ? 'appointment-late' : 'appointment-good'}><span>DELIVERY</span><strong>{xpBreakdown.delivery.label}</strong></div>
                  <div><span>POD</span><strong>{resultLoad.pod?.approved ? 'APPROVED' : 'COMPLETE'}</strong></div>
                </div>

                <section className="load-result-xp load-result-xp-v2">
                  <div><span>XP EARNED</span><strong>+{xpBreakdown.total} XP</strong></div>
                  <small>Complete +100 · Pickup {xpBreakdown.pickupXp >= 0 ? '+' : ''}{xpBreakdown.pickupXp} · Delivery {xpBreakdown.deliveryXp >= 0 ? '+' : ''}{xpBreakdown.deliveryXp} · POD +{xpBreakdown.podXp}</small>
                </section>

                <button className="load-result-done load-result-done-v2" type="button" onClick={() => setCompletionResultLoadId(null)}>DONE</button>
              </section>
            </div>
          )
        })()}

        <button
          type="button"
          className="markets-button"
          onClick={onOpenMarkets}
          aria-label="Open market selection"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V11M10 18V7M15 18v-5M20 18V4"/></svg>
          <span>MARKET</span>
        </button>
        {!isPhoneOpen && !driverFitEvaluation && !planningMode && !deliveryPlanning && !freightBrowseMode && (
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
            operationDay={operationDay}
            drivers={drivers}
            carriers={carriers}
            onActivateCarrier={onActivateCarrier}
            carrierApplicationsById={carrierApplicationsById}
            onApplyCarrier={onApplyCarrier}
            onBeginCarrierWait={() => { setSimulationSpeed(1); setIsPhoneOpen(false) }}
            onAcceptAgreement={onAcceptAgreement}
            onApprovePod={(loadId) => {
              const approved = onApprovePod?.(loadId)
              if (!approved) return
              setDriverFocusId('marcus')
              setDriverFocusRequest((value) => value + 1)
              setIsPhoneOpen(false)
            }}
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
            initialDriverId={phoneInitialDriverId}
            documentsBadgeCount={podNotificationCount}
            ledgerUnreadCount={loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved && !seenLedgerReceivableIds.includes(load.id)).length + receivables.filter((item) => item.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(item.loadId)).length}
            emailUnreadCount={emailUnreadCount}
            driverMessages={driverMessages}
            businessDocuments={businessDocuments}
            driverMessageUnreadCount={driverMessageUnreadCount}
            onReadDriverMessage={markDriverMessageRead}
            onSendDriverLoadUpdate={sendDriverLoadUpdate}
            onOpenLedger={onOpenLedger}
            ledgerWorkflowByLoadId={ledgerWorkflowByLoadId}
            setLedgerWorkflowByLoadId={setLedgerWorkflowByLoadId}
            onEvaluateFit={startEvaluation}
            onPlanTrip={(loadId, driverId) => { setIsPhoneOpen(false); startPlanning(loadId, driverId) }}
            onOpenFreightMap={openFreightBrowseMap}
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
