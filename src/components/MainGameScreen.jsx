import { useEffect, useRef, useState } from 'react'
import GameMap from './GameMap.jsx'
import LoadingChallenge from './LoadingChallenge.jsx'
import UnloadSequencingChallenge from './UnloadSequencingChallenge.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'
import OperationsBar from './OperationsBar.jsx'
import EndDaySheet from './EndDaySheet.jsx'
import DayResultsScreen from './DayResultsScreen.jsx'
import DayBriefingScreen from './DayBriefingScreen.jsx'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute, getLocationDistanceMiles, getRouteEndpointDistanceMiles, normalizeRouteGeometry } from '../services/routingService.js'
import { logDocOsEvent } from '../utils/debugLogger.js'
import { getLedgerSummary, getReceivables } from '../utils/ledger.js'
import { PICKUP_LOADING_MINUTES } from '../data/pickupConfig.js'
import { getEndDayStatus } from '../utils/dayLoop.js'
import { getDriverActiveLoad, getDriverQueue, getNextQueuePosition, getProjectedDriverOrigin } from '../utils/driverQueue.js'
import { getDriverPanelModel } from '../utils/driverOperationalState.js'


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
    'checking-in-delivery': 'CHECKING IN',
    'waiting-at-delivery': 'WAITING FOR DOCK',
    'checked-in-delivery': 'DOCK READY',
    'unloading-delivery': 'UNLOADING',
    'awaiting-pod': 'DELIVERED · POD PENDING',
  }
  return labels[status] || status.replaceAll('-', ' ').toUpperCase()
}

function getScheduleRisk({ windowEndAbsolute, projectedArrivalAbsolute, now }) {
  const arrival = Number.isFinite(projectedArrivalAbsolute) ? projectedArrivalAbsolute : now
  const buffer = windowEndAbsolute - arrival
  if (buffer < 0) return { label: 'AT RISK', tone: 'danger' }
  if (buffer <= 30) return { label: 'TIGHT', tone: 'attention' }
  return { label: 'GOOD', tone: 'good' }
}

function buildDaySchedule(loads, drivers, gameTime) {
  const dayIndex = gameTime.gameDayIndex
  const now = dayIndex * 1440 + gameTime.totalMinutesOfDay
  const driverNameById = Object.fromEntries(drivers.map((driver) => [driver.id, driver.fullName || driver.name || 'Driver']))
  const entries = []

  loads.forEach((load) => {
    const driverId = load.assignedDriverId || load.completedDriverId
    if (!driverId) return
    const loadRef = load.loadNumber || load.id
    const pickupEndAbsolute = (load.pickupDayIndex ?? dayIndex) * 1440 + (load.pickupWindowEndMinutes ?? 0)
    const deliveryEndAbsolute = (load.deliveryDayIndex ?? dayIndex) * 1440 + (load.deliveryWindowEndMinutes ?? 0)
    const pickupProjected = Number.isFinite(load.pickupArrivalGameMinute)
      ? load.pickupArrivalGameMinute
      : Number.isFinite(load.departureGameMinute) && Number.isFinite(load.plannedDeadheadDriveTimeMinutes)
        ? load.departureGameMinute + load.plannedDeadheadDriveTimeMinutes
        : Number.isFinite(load.assignmentProjection?.arrivalMinutes)
          ? (load.assignmentProjection.arrivalDay ?? load.pickupDayIndex ?? dayIndex) * 1440 + load.assignmentProjection.arrivalMinutes
          : null
    const deliveryProjected = Number.isFinite(load.deliveryArrivalGameMinute)
      ? load.deliveryArrivalGameMinute
      : Number.isFinite(load.deliveryDepartureGameMinute) && Number.isFinite(load.plannedLoadedDriveTimeMinutes)
        ? load.deliveryDepartureGameMinute + load.plannedLoadedDriveTimeMinutes
        : null

    if ((load.pickupDayIndex ?? dayIndex) === dayIndex && !['loaded','en-route-delivery','at-delivery','checking-in-delivery','waiting-at-delivery','checked-in-delivery','unloading-delivery','awaiting-pod','delivered','completed'].includes(load.tripStatus)) {
      const risk = getScheduleRisk({ windowEndAbsolute: pickupEndAbsolute, projectedArrivalAbsolute: pickupProjected, now })
      entries.push({
        id: `${load.id}-pickup`, loadId: load.id, driverId, driverName: driverNameById[driverId], loadRef,
        kind: 'PICKUP', start: load.pickupWindowStartMinutes, end: load.pickupWindowEndMinutes,
        sortMinute: (load.pickupDayIndex ?? dayIndex) * 1440 + load.pickupWindowStartMinutes,
        status: load.tripStatus === 'queued' ? 'QUEUED' : formatStatusLabel(load.tripStatus), risk,
      })
    }

    if ((load.deliveryDayIndex ?? dayIndex) === dayIndex && !['delivered','completed'].includes(load.tripStatus)) {
      const risk = getScheduleRisk({ windowEndAbsolute: deliveryEndAbsolute, projectedArrivalAbsolute: deliveryProjected, now })
      entries.push({
        id: `${load.id}-delivery`, loadId: load.id, driverId, driverName: driverNameById[driverId], loadRef,
        kind: 'DELIVERY', start: load.deliveryWindowStartMinutes, end: load.deliveryWindowEndMinutes,
        sortMinute: (load.deliveryDayIndex ?? dayIndex) * 1440 + load.deliveryWindowStartMinutes,
        status: ['queued','assigned','en-route-pickup','at-pickup','checking-in-pickup','waiting-at-pickup','checked-in-pickup','loading-at-pickup'].includes(load.tripStatus) ? 'UPCOMING' : formatStatusLabel(load.tripStatus), risk,
      })
    }
  })

  return entries.sort((a, b) => a.sortMinute - b.sortMinute)
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



const PICKUP_COMPLETE_STATUSES = new Set(['loading-at-pickup', 'loaded', 'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'])
const DELIVERY_ARRIVED_STATUSES = new Set(['at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'])

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
  const pickupOps = load?.facilityOps?.pickup || {}
  const deliveryOps = load?.facilityOps?.delivery || {}
  // AU: unused real-time dock seconds become a small skill reward, but only when
  // the operation itself was clean. Speed never cancels a freight/handling mistake.
  const pickupEfficiencyXp = pickupOps.perfect ? Math.min(10, Math.floor((pickupOps.secondsRemaining || 0) / 3)) : 0
  const deliveryEfficiencyXp = deliveryOps.perfect ? Math.min(10, Math.floor((deliveryOps.secondsRemaining || 0) / 5)) : 0
  return { pickup, delivery, base, pickupXp, deliveryXp, podXp, pickupEfficiencyXp, deliveryEfficiencyXp, total: Math.max(0, base + pickupXp + deliveryXp + podXp + pickupEfficiencyXp + deliveryEfficiencyXp) }
}

function getAppointmentAlerts(loads, now) {
  const alerts = []
  const formatMinutes = (minutes) => `${Math.max(0, Math.ceil(minutes))} MIN`

  loads.forEach((load) => {
    const playerOwned = ['accepted', 'assigned', 'queued'].includes(load?.status) || Boolean(load?.assignedDriverId)
    if (!load || !playerOwned || ['available', 'expired', 'completed', 'delivered'].includes(load.tripStatus)) return
    const loadRef = load.loadNumber || load.id
    const pickupArrival = load.pickupArrivalGameMinute
    const pickupStart = Number.isFinite(load.pickupDayIndex) && Number.isFinite(load.pickupWindowStartMinutes) ? load.pickupDayIndex * 1440 + load.pickupWindowStartMinutes : null
    const pickupEnd = Number.isFinite(load.pickupDayIndex) && Number.isFinite(load.pickupWindowEndMinutes) ? load.pickupDayIndex * 1440 + load.pickupWindowEndMinutes : null
    const pickupStillRelevant = !Number.isFinite(pickupArrival) && !PICKUP_COMPLETE_STATUSES.has(load.tripStatus)

    if (pickupStillRelevant && Number.isFinite(pickupStart) && Number.isFinite(pickupEnd)) {
      if (now > pickupEnd) {
        const late = now - pickupEnd
        alerts.push({ id: `appt-pickup-${load.id}`, tone: 'danger', action: 'load', loadId: load.id, title: `${loadRef} · PICKUP LATE`, detail: `Pickup window has closed. ${formatMinutes(late)} late.`, value: `${formatMinutes(late)} LATE` })
      } else if (now >= pickupStart) {
        alerts.push({ id: `appt-pickup-${load.id}`, tone: 'attention', action: 'load', loadId: load.id, title: `${loadRef} · PICKUP WINDOW OPEN`, detail: `Pickup window is open now. ${formatMinutes(pickupEnd - now)} remain.`, value: `${formatMinutes(pickupEnd - now)} LEFT` })
      } else if (pickupStart - now <= 30) {
        alerts.push({ id: `appt-pickup-${load.id}`, tone: 'attention', action: 'load', loadId: load.id, title: `${loadRef} · PICKUP APPROACHING`, detail: `Pickup window opens in ${formatMinutes(pickupStart - now)}.`, value: formatMinutes(pickupStart - now) })
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
      alerts.push({ id: `appt-delivery-${load.id}`, tone: 'danger', action: 'load', loadId: load.id, title: `${loadRef} · DELIVERY LATE`, detail: `Delivery window has closed. ${formatMinutes(late)} late.`, value: `${formatMinutes(late)} LATE` })
    } else if (now >= deliveryStart) {
      alerts.push({ id: `appt-delivery-${load.id}`, tone: 'attention', action: 'load', loadId: load.id, title: `${loadRef} · DELIVERY WINDOW OPEN`, detail: `Delivery window is open now. ${formatMinutes(deliveryEnd - now)} remain.`, value: `${formatMinutes(deliveryEnd - now)} LEFT` })
    } else if (deliveryStart - now <= 30) {
      alerts.push({ id: `appt-delivery-${load.id}`, tone: 'attention', action: 'load', loadId: load.id, title: `${loadRef} · DELIVERY APPROACHING`, detail: `Delivery window opens in ${formatMinutes(deliveryStart - now)}.`, value: formatMinutes(deliveryStart - now) })
    }
  })
  return alerts
}

function MainGameScreen({ selectedMarket, gameTime, loads, setLoads, drivers, setDrivers, carriers, onActivateCarrier, carrierApplicationsById, onApplyCarrier, onAcceptAgreement, onApprovePod, emailMessages, setEmailMessages, driverMessages: persistedDriverMessages = [], setDriverMessages, businessDocuments = [], operationDay = 1, dayLoopPhase = 'operating', dayReport = null, playerProgression, onEndDay, onContinueDay, onBeginOperations, plannedRoute, setPlannedRoute, isGameClockPaused = false, setGameClockPaused, runtimePositions, runtimeProgressByDriver = {}, setRuntimeProgressByDriver, simulationSpeed, setSimulationSpeed, onOpenMarkets, onResetGame, seenLedgerReceivableIds, seenLedgerPaymentReadyIds, onOpenLedger, ledgerWorkflowByLoadId, setLedgerWorkflowByLoadId, setGameTime, onAwardLoadXp }) {
  const [devOpen, setDevOpen] = useState(false)
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [phoneInitialScreen, setPhoneInitialScreen] = useState('home')
  const [driverFitEvaluation, setDriverFitEvaluation] = useState(null)
  const [phoneLoadId, setPhoneLoadId] = useState(null)
  const [phoneInitialDriverId, setPhoneInitialDriverId] = useState(null)
  const [planningMode, setPlanningMode] = useState(null)
  const [deliveryPlanning, setDeliveryPlanning] = useState(null)
  const modalPauseWasAlreadyPausedRef = useRef(false)
  const [operationsOpen, setOperationsOpen] = useState(false)
  const [endDayOpen, setEndDayOpen] = useState(false)
  const [loadingChallengeLoadId, setLoadingChallengeLoadId] = useState(null)
  const [unloadSequenceLoadId, setUnloadSequenceLoadId] = useState(null)
  const [driverFocusRequest, setDriverFocusRequest] = useState(0)
  const [boardViewRequest, setBoardViewRequest] = useState(0)
  const [facilityFocusRequest, setFacilityFocusRequest] = useState(0)
  const [facilityFocusRole, setFacilityFocusRole] = useState(null)
  const [driverFocusId, setDriverFocusId] = useState(null)
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
  const endDayLockedForCloseout = false
  const dayLoopOverlayActive = dayLoopPhase === 'results' || dayLoopPhase === 'briefing'

  // AV: the screen may focus one operation for facility/planning UI, but load
  // ownership is driver-independent. Prefer a traveling/attention load, then any
  // active driver load. No component assumes Marcus is the company.
  const activeDriverLoads = drivers.map((driver) => getDriverActiveLoad(loads, driver.id)).filter(Boolean)
  const assignedLoad = activeDriverLoads.find((load) => ['en-route-pickup', 'en-route-delivery', 'checked-in-pickup', 'checked-in-delivery', 'loaded', 'awaiting-pod'].includes(load.tripStatus))
    || activeDriverLoads[0]
    || null
  const assignedDriverId = assignedLoad?.assignedDriverId || null
  const runtimeProgress = assignedDriverId ? (runtimeProgressByDriver?.[assignedDriverId] ?? null) : null
  const setDriverRuntimeProgress = (driverId, value) => setRuntimeProgressByDriver?.((current) => ({ ...(current || {}), [driverId]: value }))
  const podNotificationCount = loads.filter((load) => load.tripStatus === 'awaiting-pod').length
  const emailUnreadCount = emailMessages?.filter((message) => !message.read).length || 0
  const currentAbsoluteGameMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const ledgerNotificationCount = loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved && !seenLedgerReceivableIds.includes(load.id)).length + receivables.filter((item) => item.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(item.loadId)).length
  const lifecycleDriverMessages = loads.flatMap((load) => {
    // Simulation events can create human communication, but the messages never
    // create or advance those events. The load remains the source of truth.
    const messageDriverId = load.assignedDriverId || load.completedDriverId
    const driver = drivers.find((item) => item.id === messageDriverId)
    const driverName = driver?.fullName || driver?.name || 'Driver'
    const messages = []
    if (Number.isFinite(load.pickupCheckInGameMinute)) {
      const pickupFacility = mapLocations.find((location) => location.id === load.pickupLocationId)
      messages.push({
        id: `${load.id}-pickup-checked-in`,
        loadId: load.id,
        driverId: messageDriverId,
        sender: driverName,
        senderRole: 'Driver',
        direction: 'inbound',
        body: `I'm at ${pickupFacility?.name || 'pickup'}. Checked in, paperwork's handled, and they've got me waiting on a door. I'll keep you posted.`,
        read: Boolean(load.pickupCheckedInDriverMessageRead),
        receivedGameMinute: load.pickupCheckInGameMinute,
      })
    }
    if (['loaded', 'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'].includes(load.tripStatus) && Number.isFinite(load.loadingStartGameMinute)) {
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
    if (Number.isFinite(load.deliveryCheckInGameMinute)) {
      const deliveryFacility = mapLocations.find((location) => location.id === load.deliveryLocationId)
      messages.push({
        id: `${load.id}-delivery-checked-in`,
        loadId: load.id,
        driverId: messageDriverId,
        sender: driverName,
        senderRole: 'Driver',
        direction: 'inbound',
        body: `I'm at ${deliveryFacility?.name || 'the receiver'}. Checked in and they've got me waiting on a door. I'll let you know when they call me in.`,
        read: Boolean(load.deliveryCheckedInDriverMessageRead),
        receivedGameMinute: load.deliveryCheckInGameMinute,
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
  const driverOperationAlerts = activeDriverLoads.flatMap((load) => {
    const driver = drivers.find((item) => item.id === load.assignedDriverId)
    const driverName = driver?.fullName || driver?.name || 'Driver'
    const pickupName = mapLocations.find((location) => location.id === load.pickupLocationId)?.name || 'pickup'
    const deliveryName = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'delivery'
    const loadRef = load.loadNumber || load.id
    const base = { driverId: load.assignedDriverId, loadId: load.id, tone: 'attention' }
    if (load.tripStatus === 'checked-in-pickup') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-pickup-ready`, action: 'pickup', title: `${loadRef} · DOCK READY`, detail: `${driverName} has been called to a door at ${pickupName}.`, value: 'BEGIN LOADING' }]
    if (load.tripStatus === 'checked-in-delivery') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-delivery-ready`, action: 'delivery', title: `${loadRef} · DOCK READY`, detail: `${driverName} has been called to a door at ${deliveryName}.`, value: 'BEGIN UNLOADING' }]
    if (load.tripStatus === 'assigned' && !Number.isFinite(load.pickupDriverBriefedGameMinute)) return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-brief`, action: 'messages', title: `${loadRef} · SEND LOAD INFO REQUIRED`, detail: `Send ${driverName} the load information before planning the pickup route.`, value: 'MESSAGE DRIVER' }]
    if (load.tripStatus === 'assigned' && load.planningStatus !== 'route-ready') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-pickup-plan`, action: 'plan-pickup', title: `${loadRef} · PICKUP PLAN REQUIRED`, detail: `Plan ${driverName}'s pickup trip.`, value: 'PLAN PICKUP' }]
    if (load.tripStatus === 'assigned' && !Number.isFinite(load.pickupRouteSentGameMinute)) return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-route-pickup`, action: 'messages', title: `${loadRef} · ROUTE SEND REQUIRED`, detail: `Send ${driverName} the pickup route. Sending it releases the truck to depart.`, value: 'SEND ROUTE' }]
    if (load.tripStatus === 'assigned') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-route-pickup-recovery`, action: 'messages', title: `${loadRef} · ROUTE ACTION REQUIRED`, detail: `Open Messages and resend the pickup route to release ${driverName}.`, value: 'SEND ROUTE' }]
    if (load.tripStatus === 'loaded' && load.deliveryPlanningStatus === 'route-ready' && !Number.isFinite(load.deliveryRouteSentGameMinute)) return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-route-delivery`, action: 'messages', title: `${loadRef} · ROUTE SEND REQUIRED`, detail: `Send ${driverName} the delivery route. Sending it releases the truck to depart.`, value: 'SEND ROUTE' }]
    if (load.tripStatus === 'loaded' && load.deliveryPlanningStatus === 'route-ready') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-route-delivery-recovery`, action: 'messages', title: `${loadRef} · ROUTE ACTION REQUIRED`, detail: `Open Messages and resend the delivery route to release ${driverName}.`, value: 'SEND ROUTE' }]
    if (load.tripStatus === 'loaded') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-delivery-plan`, action: 'plan-delivery', title: `${loadRef} · DELIVERY PLAN REQUIRED`, detail: `${driverName} is loaded and waiting for a delivery route.`, value: 'PLAN DELIVERY' }]
    return []
  })

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
  const daySchedule = buildDaySchedule(loads, drivers, gameTime)
  const nextScheduleItem = daySchedule.find((item) => item.sortMinute + 60 >= currentAbsoluteGameMinute) || daySchedule[0] || null
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
    ...driverOperationAlerts,
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
  ].sort((a, b) => {
    const priority = (item) => {
      if (['driver', 'messages', 'plan-pickup', 'plan-delivery', 'pickup', 'delivery', 'facility'].includes(item?.action) || item?.tone === 'danger' || item?.tone === 'attention') return 0
      if (['documents', 'ledger'].includes(item?.action)) return 1
      return 2
    }
    return priority(a) - priority(b)
  })
  // The badge is a true aggregate count: every unresolved actionable item counts.
  const operationsNotificationCount = appointmentAlerts.length + podNotificationCount + ledgerNotificationCount + unseenCompletedLoads.length + driverOperationAlerts.length

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
    if (['checked-in-pickup', 'checked-in-delivery', 'loaded', 'awaiting-pod'].includes(assignedLoad.tripStatus) && simulationSpeed > 1) {
      setSimulationSpeed(1)
    }
  }, [assignedLoad?.tripStatus, isGameClockPaused, setSimulationSpeed, simulationSpeed])

  // AU1: Dock-ready is an attention state, not a global pause. With multiple
  // drivers, one facility cannot freeze the entire operation. Fast-forward still
  // normalizes to 1x so the player has a fair chance to react.

  // AV resume safety: loading/unloading challenges are driver-owned workflows.
  // Reopen them after hydration without freezing the rest of the simulation.
  useEffect(() => {
    const interruptedLoading = loads.find((load) => load.tripStatus === 'loading-at-pickup' && load.assignedDriverId)
    if (!interruptedLoading || loadingChallengeLoadId) return
    if (simulationSpeed !== 1) setSimulationSpeed(1)
    setLoadingChallengeLoadId(interruptedLoading.id)
  }, [loads, loadingChallengeLoadId, setSimulationSpeed, simulationSpeed])

  // Resume safety: unloading is an owned player workflow, not a timed simulation state.
  // If the app is backgrounded/closed mid-challenge, hydration restores the load as
  // `unloading-delivery`; reopen the challenge and keep the clock safely paused.
  useEffect(() => {
    const interruptedUnload = loads.find((load) => load.tripStatus === 'unloading-delivery' && load.assignedDriverId)
    if (!interruptedUnload || unloadSequenceLoadId) return
    if (simulationSpeed !== 1) setSimulationSpeed(1)
    setUnloadSequenceLoadId(interruptedUnload.id)
  }, [loads, unloadSequenceLoadId, setGameClockPaused, setSimulationSpeed, simulationSpeed])

  const pauseClockForModal = () => {
    modalPauseWasAlreadyPausedRef.current = isGameClockPaused
    if (simulationSpeed > 1) setSimulationSpeed(1)
    setGameClockPaused(true)
  }
  const restoreClockAfterModal = () => {
    setGameClockPaused(modalPauseWasAlreadyPausedRef.current)
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
  const combineRouteGeometry = (...shapes) => shapes.filter((shape) => Array.isArray(shape) && shape.length).reduce((combined, shape) => {
    if (!combined.length) return [...shape]
    const last = combined[combined.length - 1]
    return [...combined, ...shape.filter((point, index) => index !== 0 || !last || last[0] !== point[0] || last[1] !== point[1])]
  }, [])
  const planningFullRouteGeometry = planningMode && planningMode.route && typeof planningMode.route === 'object'
    ? combineRouteGeometry(planningMode.route.routeShape, planningMode.loadedRoute?.routeShape)
    : null
  // AV2.5.3: estimated fallback geometry is allowed to keep simulation timing
  // resilient, but it is never rendered as a fake straight-line road on the map.
  const deliveryPlanningGeometry = deliveryPlanning?.route?.source === 'fallback' ? null : deliveryPlanning?.route?.routeShape
  const planningGeometry = planningMode?.route?.source === 'fallback'
    ? (planningMode?.loadedRoute?.source === 'fallback' ? null : planningMode?.loadedRoute?.routeShape)
    : planningFullRouteGeometry
  const activeRouteGeometry = deliveryPlanningGeometry
    || (evaluationRouteGeometry?.length ? evaluationRouteGeometry : null)
    || (planningGeometry?.length ? planningGeometry : null)
    || (assignedLoad?.tripStatus === 'en-route-delivery' && assignedLoad.plannedLoadedRouteSource !== 'fallback' ? assignedLoad.plannedLoadedRouteGeometry : null)
    || (assignedLoad?.tripStatus === 'en-route-pickup' && assignedLoad.plannedDeadheadRouteSource !== 'fallback' ? assignedLoad.plannedDeadheadRouteGeometry : null)
    || ((!assignedLoad?.tripStatus || assignedLoad.tripStatus === 'assigned') && assignedLoad?.planningStatus === 'route-ready' && assignedLoad.plannedDeadheadRouteSource !== 'fallback' ? assignedLoad.plannedDeadheadRouteGeometry : null)
  const startDeliveryPlanning = async (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    const pickup = mapLocations.find((location) => location.id === load?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load?.deliveryLocationId)
    pauseClockForModal()
    logDocOsEvent('OPEN DELIVERY PLANNING')
    setDeliveryPlanning({ loadId, route: 'loading', selected: false })
    try {
      const route = await calculateRoute(pickup, delivery)
      // AV2.3.3: calculateRoute owns route orientation. Never perform a second,
      // asymmetric reversal here; that was capable of flipping a correct route.
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
      // AV2.5: planning is a full-load spatial review. Calculate the deadhead and
      // loaded lane together so the map can frame driver → pickup → delivery while
      // the operational plan still commits only the deadhead leg at this step.
      const [deadheadResult, loadedResult] = await Promise.allSettled([
        calculateRoute(driver, pickup),
        calculateRoute(pickup, mapLocations.find((location) => location.id === load?.deliveryLocationId)),
      ])
      if (deadheadResult.status !== 'fulfilled') throw deadheadResult.reason
      const route = deadheadResult.value
      const loadedRoute = loadedResult.status === 'fulfilled' ? loadedResult.value : null
      setPlanningMode((current) => current ? { ...current, route, loadedRoute, selected: true } : current)
    } catch (error) {
      console.error('Planning route unavailable:', error)
      setPlanningMode((current) => current ? { ...current, route: 'unavailable' } : current)
    }
  }

  const startEvaluation = (loadId, driverId, fit) => {
    const selectedDriver = drivers.find((driver) => driver.id === driverId)
    if (!selectedDriver || !fit) return false

    // AU3: Driver Fit is a review step only. Selecting a driver must never
    // commit freight. Keep the market load available until the player presses
    // the explicit ACCEPT & ASSIGN action back on FreightLink.
    setLoads((current) => current.map((load) => load.id === loadId ? {
      ...load,
      candidateDriverId: driverId,
      driverFitVerified: true,
      carrierId: selectedDriver.carrierId ?? load.carrierId ?? null,
      assignmentProjection: {
        deadheadMiles: fit.miles,
        deadheadMinutes: fit.minutes,
        arrivalDay: fit.arrivalDay,
        arrivalMinutes: fit.arrivalMinutes,
        status: fit.status || fit.label || null,
        afterLoadId: fit.afterLoadId || null,
        queueLength: fit.queueLength || 0,
      },
    } : load))
    return true
  }

  const acceptCandidateAssignment = (loadId) => {
    const currentLoad = loads.find((item) => item.id === loadId)
    const driverId = currentLoad?.candidateDriverId
    if (!currentLoad || currentLoad.status !== 'available' || !currentLoad.driverFitVerified || !driverId) return false
    const selectedDriver = drivers.find((driver) => driver.id === driverId)
    if (!selectedDriver) return false
    const carrier = carriers.find((item) => item.id === selectedDriver.carrierId)
    if (carrier?.dispatchAgreement?.loadApprovalRequired && currentLoad.carrierApprovalStatus !== 'APPROVED') return false

    const existingActive = getDriverActiveLoad(loads, driverId)

    setLoads((current) => {
      const activeAtCommit = getDriverActiveLoad(current, driverId)
      const queuePosition = activeAtCommit ? getNextQueuePosition(current, driverId) : 0
      const nextTripStatus = activeAtCommit ? 'queued' : 'assigned'
      return current.map((load) => load.id === loadId && load.status === 'available' ? {
        ...load,
        status: nextTripStatus,
        tripStatus: nextTripStatus,
        assignedDriverId: driverId,
        candidateDriverId: null,
        driverFitVerified: true,
        queuePosition,
        planningStatus: null,
        loadingChallengeState: null,
        unloadChallengeState: null,
        deliveryPlanningStatus: null,
      } : load)
    })

    setDrivers((current) => current.map((driver) => driver.id === driverId
      ? {
          ...driver,
          status: 'unavailable',
          assignedLoadId: existingActive?.id || loadId,
          queuedLoadIds: existingActive
            ? Array.from(new Set([...(driver.queuedLoadIds || []), loadId]))
            : (driver.queuedLoadIds || []),
          idleSinceGameMinute: null,
          idleTargetLocationId: null,
          idleRouteStatus: null,
          idleRouteGeometry: null,
          idleRouteStartGameMinute: null,
          idleRouteDurationMinutes: null,
        }
      : driver))
    return true
  }

  const handleDriverAction = (actionType, loadId, driverId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (actionType === 'MESSAGE_DRIVER') {
      setPhoneInitialScreen('messageThread')
      setPhoneInitialDriverId(driverId || load.assignedDriverId || null)
      setIsPhoneOpen(true)
    }
    else if (actionType === 'PLAN_TRIP' && load.tripStatus === 'assigned') startPlanning(loadId, driverId)
    else if (actionType === 'SEND_TO_PICKUP' && load.tripStatus === 'assigned') {
      setPhoneInitialScreen('messageThread')
      setPhoneInitialDriverId(driverId || load.assignedDriverId || null)
      setIsPhoneOpen(true)
    } else if (actionType === 'PLAN_DELIVERY_TRIP' && load.tripStatus === 'loaded') startDeliveryPlanning(loadId)
    else if (actionType === 'BEGIN_UNLOADING' && load.tripStatus === 'checked-in-delivery') {
      // AV: hands-on challenges are local workflows. Other drivers and appointments keep running.
      if (simulationSpeed !== 1) setSimulationSpeed(1)
      setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'unloading-delivery', deliveryUnloadStartGameMinute: now } : item))
      setUnloadSequenceLoadId(loadId)
    }
    else if (actionType === 'BEGIN_LOADING' && load.tripStatus === 'checked-in-pickup') {
      // AV: hands-on challenges are local workflows. Other drivers and appointments keep running.
      if (simulationSpeed !== 1) setSimulationSpeed(1)
      setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'loading-at-pickup', loadingStartGameMinute: now } : item))
      setLoadingChallengeLoadId(loadId)
    }
  }

  const completeLoadingChallenge = (result) => {
    const loadId = loadingChallengeLoadId
    if (!loadId || !result) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    setLoads((current) => current.map((item) => item.id === loadId ? {
      ...item,
      tripStatus: 'loaded',
      loadingStartGameMinute: Number.isFinite(item.loadingStartGameMinute) ? item.loadingStartGameMinute : now,
      pickupLoadingCompleteGameMinute: now,
      loadingChallengeState: null,
      facilityOps: {
        ...(item.facilityOps || {}),
        pickup: { ...result, completedGameMinute: now },
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
    setLoadingChallengeLoadId(null)
  }

  const completeUnloadSequence = (result) => {
    const loadId = unloadSequenceLoadId
    if (!loadId || !result) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const completeMinute = now
    setLoads((current) => current.map((item) => {
      if (item.id !== loadId) return item

      // Shipment condition is established at pickup and follows the freight through delivery.
      // Delivery/POD report that existing truth instead of inventing a new condition.
      const shipment = item.shipment || {}
      const manifest = Array.isArray(shipment.palletManifest) ? shipment.palletManifest : []
      const shipmentExpected = Number(shipment.expectedPallets)
      const resultExpected = Number(result.expectedPallets)
      const shipmentLoaded = Number(shipment.loadedPallets)
      const resultReceived = Number(result.actualReceivedPallets)
      const piecesExpected = Number.isFinite(shipmentExpected)
        ? shipmentExpected
        : Number.isFinite(resultExpected)
          ? resultExpected
          : manifest.length
      const piecesReceived = Number.isFinite(shipmentLoaded)
        ? shipmentLoaded
        : Number.isFinite(resultReceived)
          ? resultReceived
          : manifest.filter((pallet) => pallet?.loaded !== false).length
      const missingPallets = Number.isFinite(Number(shipment.missingPallets))
        ? Number(shipment.missingPallets)
        : Math.max(0, piecesExpected - piecesReceived)
      const damagedPallets = Number.isFinite(Number(shipment.damagedPallets))
        ? Number(shipment.damagedPallets)
        : manifest.filter((pallet) => pallet?.loaded !== false && pallet?.damaged).length
      const damageLabel = damagedPallets > 0 ? `${damagedPallets} pallet${damagedPallets === 1 ? '' : 's'} noted` : 'None'
      // AV2.2: exception freight can produce paperwork that needs real review.
      // The shipment record remains authoritative; the receiver POD may contain a
      // documentation error that must be corrected through Email before approval.
      const podPiecesReceived = missingPallets > 0 ? piecesExpected : piecesReceived
      const podDamageLabel = damagedPallets > 0 ? 'None' : damageLabel

      return {
        ...item,
        tripStatus: 'awaiting-pod',
        unloadChallengeState: null,
        deliveryUnloadCompleteGameMinute: completeMinute,
        facilityOps: {
          ...(item.facilityOps || {}),
          delivery: {
            ...result,
            expectedPallets: piecesExpected,
            actualReceivedPallets: piecesReceived,
            missingPallets,
            damagedPallets,
            completedGameMinute: completeMinute,
          },
        },
        pod: {
          status: 'complete', receivedGameMinute: completeMinute, viewedGameMinute: null, signedBy: 'Jordan Rivera',
          piecesExpected, piecesReceived: podPiecesReceived, damage: podDamageLabel,
          correctionStatus: null,
          freightCondition: {
            source: 'pickup-shipment',
            expectedPallets: piecesExpected,
            loadedAtPickup: piecesReceived,
            missingAtPickup: missingPallets,
            damagedAtPickup: damagedPallets,
          },
          verification: { signature: false, pieceCount: false, damage: false, deliveryInfo: false },
          verified: false, verifiedGameMinute: null,
        },
      }
    }))
    setUnloadSequenceLoadId(null)
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
      if (message.id.endsWith('-delivery-checked-in')) return { ...load, deliveryCheckedInDriverMessageRead: true }
      return load
    }))
  }

  const adjustDriverRelationship = (driverId, delta, eventKey = null) => {
    if (!driverId || !Number.isFinite(Number(delta)) || Number(delta) === 0) return
    setDrivers((current) => current.map((driver) => {
      if (driver.id !== driverId) return driver
      const scoredEvents = Array.isArray(driver.relationshipScoredEvents) ? driver.relationshipScoredEvents : []
      if (eventKey && scoredEvents.includes(eventKey)) return driver
      return {
        ...driver,
        communicationRapport: Math.max(0, Math.min(100, Number(driver.communicationRapport ?? 50) + Number(delta))),
        relationshipScoredEvents: eventKey ? [...scoredEvents.slice(-59), eventKey] : scoredEvents,
      }
    }))
  }

  const sendDriverLoadUpdate = (loadId, driverIdArg = null) => {
    const load = loads.find((item) => item.id === loadId)
    const driverId = driverIdArg || load?.assignedDriverId
    if (!load || !driverId || !setDriverMessages) return
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
    const isQueuedLoad = load.tripStatus === 'queued' && load.assignedDriverId === driverId
    const briefingReady = isCurrentLoad && load.tripStatus === 'assigned'
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
        sender: drivers.find((item) => item.id === driverId)?.fullName || drivers.find((item) => item.id === driverId)?.name || 'Driver',
        senderRole: 'Driver',
        direction: 'inbound',
        loadId: load.id,
        body: briefingReady
          ? 'Got it.'
          : isQueuedLoad
            ? `Got it. I’ll keep ${loadRef} next on my board after ${activeDriverLoad?.loadNumber || activeDriverLoad?.id || 'this load'}.`
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
      const firstBriefing = !Number.isFinite(load.pickupDriverBriefedGameMinute)
      setLoads((current) => current.map((item) => item.id === load.id ? {
        ...item,
        pickupDriverBriefedGameMinute: Number.isFinite(item.pickupDriverBriefedGameMinute) ? item.pickupDriverBriefedGameMinute : now,
        pickupDriverBriefedLoadId: load.id,
      } : item))
      if (firstBriefing) adjustDriverRelationship(driverId, 1, `briefing:${load.id}`)
    } else if (!isQueuedLoad && activeDriverLoad && activeDriverLoad.id !== load.id) {
      adjustDriverRelationship(driverId, -2, `wrong-load:${load.id}:${activeDriverLoad.id}`)
    }
  }


  const sendDriverQuickReply = (body, driverId = null, meta = null) => {
    if (!body?.trim() || !driverId) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const token = `${now}-${Math.random().toString(36).slice(2, 8)}`
    const outbound = {
      id: `dispatcher-reply-${driverId}-${token}`,
      driverId,
      sender: 'You',
      senderRole: 'Dispatcher',
      direction: 'outbound',
      body: body.trim(),
      receivedGameMinute: now,
      read: true,
      communicationType: meta?.communication || null,
      communicationScore: Number(meta?.score || 0),
      loadId: meta?.loadId || null,
    }
    const isRouteSend = meta?.operationalAction === 'route-sent' && meta?.loadId && ['pickup', 'delivery'].includes(meta?.phase)
    const routeLoad = isRouteSend ? loads.find((item) => item.id === meta.loadId) : null
    const routeDriver = drivers.find((item) => item.id === driverId)
    const currentOrigin = isRouteSend
      ? (runtimePositions?.[driverId]
        || (Number.isFinite(routeDriver?.longitude) && Number.isFinite(routeDriver?.latitude)
          ? { longitude: routeDriver.longitude, latitude: routeDriver.latitude }
          : mapLocations.find((location) => location.id === routeDriver?.homeBaseLocationId)))
      : null
    const routeDestination = isRouteSend
      ? mapLocations.find((location) => location.id === (meta.phase === 'delivery' ? routeLoad?.deliveryLocationId : routeLoad?.pickupLocationId))
      : null
    const storedGeometry = isRouteSend
      ? (meta.phase === 'delivery' ? routeLoad?.plannedLoadedRouteGeometry : routeLoad?.plannedDeadheadRouteGeometry)
      : null
    const normalizedStoredGeometry = isRouteSend && currentOrigin && routeDestination
      ? normalizeRouteGeometry(storedGeometry, currentOrigin, routeDestination)
      : storedGeometry
    const originEndpointMiles = isRouteSend
      ? getRouteEndpointDistanceMiles(normalizedStoredGeometry, currentOrigin)
      : 0
    const directDistanceMiles = isRouteSend && currentOrigin && routeDestination
      ? getLocationDistanceMiles(currentOrigin, routeDestination)
      : Number.POSITIVE_INFINITY
    const isNearZeroDeparture = isRouteSend && directDistanceMiles <= 0.25
    const normalizedDepartureGeometry = isNearZeroDeparture && currentOrigin && routeDestination
      ? [
          [currentOrigin.longitude, currentOrigin.latitude],
          [routeDestination.longitude, routeDestination.latitude],
        ]
      : normalizedStoredGeometry
    const routeVerifiedForDeparture = !isRouteSend
      || isNearZeroDeparture
      || (Array.isArray(normalizedDepartureGeometry) && normalizedDepartureGeometry.length >= 2 && originEndpointMiles <= 5)

    // Last line of defense: a route whose first point is nowhere near the truck
    // is not allowed to own movement. Near-zero moves are valid when the truck is
    // already effectively at the intended facility; use a tiny synthetic geometry
    // instead of forcing a pointless re-plan loop or allowing a teleport.
    if (!routeVerifiedForDeparture) {
      console.error('DOC OS ROUTE DEPARTURE BLOCKED', {
        driverId,
        loadId: meta?.loadId,
        phase: meta?.phase,
        originEndpointMiles,
        directDistanceMiles,
      })
      setDriverMessages((current) => {
        const duplicateRecently = current.some((message) => message.driverId === driverId
          && message.loadId === (meta?.loadId || null)
          && message.senderRole === 'System'
          && message.body === 'Route verification failed. Re-plan the route before sending it to the driver.'
          && Number.isFinite(message.receivedGameMinute)
          && now - message.receivedGameMinute < 15)
        if (duplicateRecently) return current
        return [...current, {
          id: `route-verify-${driverId}-${meta?.loadId}-${token}`,
          driverId,
          sender: 'DOC OS',
          senderRole: 'System',
          direction: 'inbound',
          body: 'Route verification failed. Re-plan the route before sending it to the driver.',
          receivedGameMinute: now,
          read: false,
          loadId: meta?.loadId || null,
        }]
      })
      return
    }

    const driverName = routeDriver?.fullName || routeDriver?.name || 'Driver'
    const confirmation = isRouteSend ? {
      id: `driver-route-confirm-${driverId}-${meta.loadId}-${token}`,
      driverId,
      sender: driverName,
      senderRole: 'Driver',
      direction: 'inbound',
      body: 'Got it. Heading out now. I’ll update you when I’m at the dock.',
      receivedGameMinute: now + 0.01,
      read: false,
      loadId: meta.loadId,
    } : null
    setDriverMessages((current) => confirmation ? [...current, outbound, confirmation] : [...current, outbound])
    if (isRouteSend) {
      setDriverRuntimeProgress(driverId, 0)
      setLoads((current) => current.map((load) => load.id !== meta.loadId ? load : meta.phase === 'delivery' ? {
        ...load,
        plannedLoadedRouteGeometry: normalizedDepartureGeometry,
        plannedLoadedDriveTimeMinutes: isNearZeroDeparture ? Math.max(1, Number(load.plannedLoadedDriveTimeMinutes) || 1) : load.plannedLoadedDriveTimeMinutes,
        deliveryRouteSentGameMinute: now,
        deliveryDriverConfirmedRouteGameMinute: now + 0.01,
        tripStatus: 'en-route-delivery',
        deliveryDepartureGameMinute: now,
      } : {
        ...load,
        plannedDeadheadRouteGeometry: normalizedDepartureGeometry,
        plannedDeadheadDriveTimeMinutes: isNearZeroDeparture ? Math.max(1, Number(load.plannedDeadheadDriveTimeMinutes) || 1) : load.plannedDeadheadDriveTimeMinutes,
        pickupRouteSentGameMinute: now,
        pickupDriverConfirmedRouteGameMinute: now + 0.01,
        tripStatus: 'en-route-pickup',
        departureGameMinute: now,
      }))
    }
    if (Number.isFinite(Number(meta?.score))) { const stateLoad = meta?.loadId ? loads.find((item) => item.id === meta.loadId) : null; const eventKey = meta?.communication ? `reply:${meta.loadId || 'general'}:${stateLoad?.tripStatus || 'general'}` : null; adjustDriverRelationship(driverId, Number(meta.score || 0), eventKey) }
    if (isRouteSend) {
      const alreadySent = meta.phase === 'delivery' ? Number.isFinite(loads.find((item) => item.id === meta.loadId)?.deliveryRouteSentGameMinute) : Number.isFinite(loads.find((item) => item.id === meta.loadId)?.pickupRouteSentGameMinute)
      if (!alreadySent) adjustDriverRelationship(driverId, 2, `route-dispatch:${meta.phase}:${meta.loadId}`)
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
  const deliveryPlanningLoadRecord = loads.find((item) => item.id === deliveryPlanning?.loadId)
  const deliveryPlanningDriver = drivers.find((driver) => driver.id === deliveryPlanningLoadRecord?.assignedDriverId)
  const deliveryPlanningRoute = deliveryPlanning && deliveryPlanning.route && typeof deliveryPlanning.route === 'object' ? deliveryPlanning.route : null
  const deliveryPlanningArrivalAbsoluteMinutes = deliveryPlanningRoute ? (gameTime.gameDayIndex * 1440) + gameTime.totalMinutesOfDay + deliveryPlanningRoute.durationMinutes : null
  const deliveryPlanningBufferMinutes = deliveryPlanningLoad && deliveryPlanningRoute ? getDeliveryPlanningBufferMinutes(deliveryPlanningLoad, deliveryPlanningRoute, gameTime) : null
  const timeControlsLocked = Boolean(endDayOpen || dayLoopOverlayActive)
  const pauseActive = isGameClockPaused
  const playActive = !isGameClockPaused && simulationSpeed === 1
  const fastForwardActive = !isGameClockPaused && [2, 5, 10].includes(simulationSpeed)

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
    if (action === 'driver') { setDriverFocusId(notification?.driverId || assignedLoad?.assignedDriverId || assignedLoad?.completedDriverId || null); setDriverFocusRequest((value) => value + 1); return }
    if (action === 'plan-pickup') {
      const loadId = notification?.loadId || assignedLoad?.id
      const driverId = notification?.driverId || loads.find((item) => item.id === loadId)?.assignedDriverId || assignedLoad?.assignedDriverId
      if (loadId && driverId) startPlanning(loadId, driverId)
      return
    }
    if (action === 'pickup') {
      const loadId = notification?.loadId || assignedLoad?.id
      const driverId = notification?.driverId || loads.find((item) => item.id === loadId)?.assignedDriverId || assignedLoad?.assignedDriverId
      if (loadId) handleDriverAction('BEGIN_LOADING', loadId, driverId)
      return
    }
    if (action === 'delivery') {
      const loadId = notification?.loadId || assignedLoad?.id
      const driverId = notification?.driverId || loads.find((item) => item.id === loadId)?.assignedDriverId || assignedLoad?.assignedDriverId
      if (loadId) handleDriverAction('BEGIN_UNLOADING', loadId, driverId)
      return
    }
    if (action === 'plan-delivery') {
      const loadId = notification?.loadId || assignedLoad?.id
      if (loadId) startDeliveryPlanning(loadId)
      return
    }
    // Backward-safe handling for older hydrated notification action names.
    if (['dispatch-delivery', 'send-pickup'].includes(action)) {
      setDriverFocusId(notification?.driverId || assignedLoad?.assignedDriverId || assignedLoad?.completedDriverId || null)
      setDriverFocusRequest((value) => value + 1)
      return
    }
    if (action === 'messages') { setPhoneInitialScreen('messageThread'); setPhoneInitialDriverId(notification?.driverId || assignedLoad?.assignedDriverId || null); setPhoneLoadId(notification?.loadId || null); setIsPhoneOpen(true); return }
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
        scheduleEntries={daySchedule}
        nextScheduleItem={nextScheduleItem}
        onOpenChange={setOperationsOpen}
        onNotificationAction={openOperationNotification}
        showEndDay={showEndDay}
        endDayDisabled={endDayLockedForCloseout || isPhoneOpen || Boolean(planningMode) || Boolean(deliveryPlanning) || endDayOpen}
        onEndDay={() => { pauseClockForModal(); setEndDayOpen(true) }}
        onOpenMarkets={onOpenMarkets}
      />
      <div className={`map-area ${operationsOpen ? 'operations-open' : ''}`}>
        {import.meta.env.DEV && <><button type="button" className="dev-button" onClick={() => setDevOpen((open) => !open)}>DEV</button>{devOpen && <div className="dev-menu"><div className="dev-menu-header"><strong>DEV TOOLS</strong><button type="button" onClick={() => setDevOpen(false)} aria-label="Close developer tools">×</button></div><div className="dev-presets"><strong>TIME</strong><span>DAY {gameTime.gameDayIndex + 1}<br />{formatCompactDate(gameTime.gameDayIndex)} • {formatTime(gameTime.totalMinutesOfDay)}</span>{[60, 360].map((minutes) => <button type="button" key={minutes} onClick={() => setGameTime((time) => { const total = time.gameDayIndex * 1440 + time.totalMinutesOfDay + minutes; return { gameDayIndex: Math.floor(total / 1440), totalMinutesOfDay: total % 1440 } })}>+{minutes === 60 ? '1 HR' : '6 HR'}</button>)}{[1, 3, 7].map((days) => <button type="button" key={days} onClick={() => setGameTime((time) => ({ ...time, gameDayIndex: time.gameDayIndex + days }))}>+{days} DAY{days > 1 ? 'S' : ''}</button>)}</div><button type="button" className="dev-reset" onClick={() => { onResetGame(); setDevOpen(false) }}>RESET GAME</button></div>}</>}
        {!freightBrowseMode && !planningMode && !deliveryPlanning && (
          <button type="button" className="board-view-control" onClick={() => setBoardViewRequest((value) => value + 1)} aria-label="Fit all active operations on map">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><circle cx="12" cy="12" r="2.4"/></svg>
            <span>BOARD</span>
          </button>
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
            className={fastForwardActive ? 'active' : ''}
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
            onCancel={() => { const loadId = loadingChallengeLoadId; setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'checked-in-pickup', loadingStartGameMinute: null } : item)); setLoadingChallengeLoadId(null) }}
            onProgress={(state) => { const loadId = loadingChallengeLoadId; if (!loadId) return; setLoads((current) => current.map((item) => item.id === loadId ? { ...item, loadingChallengeState: state } : item)) }}
            onComplete={completeLoadingChallenge}
          />
        )}

        {unloadSequenceLoadId && (
          <UnloadSequencingChallenge
            load={loads.find((item) => item.id === unloadSequenceLoadId)}
            onCancel={() => {
              const loadId = unloadSequenceLoadId
              setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'checked-in-delivery', deliveryUnloadStartGameMinute: null } : item))
              setUnloadSequenceLoadId(null)
            }}
            onProgress={(state) => { const loadId = unloadSequenceLoadId; if (!loadId) return; setLoads((current) => current.map((item) => item.id === loadId ? { ...item, unloadChallengeState: state } : item)) }}
            onComplete={completeUnloadSequence}
          />
        )}
        <GameMap boardViewRequest={boardViewRequest} driverFocusRequest={driverFocusRequest} driverFocusId={driverFocusId} facilityFocusRequest={facilityFocusRequest} facilityFocusRole={facilityFocusRole} loads={loads} activeRouteGeometry={freightBrowseMode ? freightBrowseRouteGeometry : activeRouteGeometry} routeFocusMode={freightBrowseMode && freightBrowseRouteGeometry ? 'freight-browse' : planningMode || deliveryPlanning ? 'planning' : null} routeReviewLoad={planningLoad || deliveryPlanningLoad} tripStatus={assignedLoad?.tripStatus} drivers={drivers} carriers={carriers} runtimePositions={runtimePositions} runtimeProgressByDriver={runtimeProgressByDriver} simulationSpeed={simulationSpeed} isGameClockPaused={isGameClockPaused} assignedLoad={assignedLoad} evaluationLoad={null} isDriverFitEvaluation={false} suppressAttention={Boolean(deliveryPlanning)} gameTime={gameTime} onDriverAction={handleDriverAction} freightBrowseMode={freightBrowseMode} freightBrowseLoads={freightBrowseLoads} freightBrowseSelectedLoadId={freightBrowseLoadId} onFreightBrowseSelect={selectFreightBrowseLoad} />
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
                {deliveryPlanningRoute ? (deliveryPlanningRoute.source === 'fallback' ? 'ESTIMATED' : deliveryPlanningRoute.source === 'cache' ? 'CACHED ROAD' : 'RECOMMENDED') : 'CALCULATING'}
              </span>
            </div>

            <div className="trip-plan-v2-driver-row">
              <div className="trip-plan-v2-driver-badge" aria-hidden="true">M</div>
              <div>
                <span>DRIVER</span>
                <strong>{deliveryPlanningDriver?.fullName || deliveryPlanningDriver?.name || 'Driver'}</strong>
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
              <span>{deliveryPlanningRoute?.source === 'fallback' ? 'ROUTE DATA LIMITED' : deliveryPlanningRoute?.source === 'cache' ? 'ROUTE A — CACHED ROAD' : 'ROUTE A — RECOMMENDED'}</span>
              <small>{deliveryPlanningRoute?.source === 'fallback' ? 'Estimated timing only · road geometry unavailable' : deliveryPlanningRoute?.source === 'cache' ? 'Saved road route · available offline' : 'Loaded route'}</small>
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
                className="trip-plan-v2-confirm"
                disabled={!deliveryPlanningRoute}
                onClick={() => {
                  setLoads((current) => current.map((load) => load.id === deliveryPlanning.loadId ? {
                    ...load,
                    deliveryPlanningStatus: 'route-ready',
                    plannedLoadedMiles: deliveryPlanningRoute.distanceMiles,
                    plannedLoadedDriveTimeMinutes: deliveryPlanningRoute.durationMinutes,
                    plannedLoadedRouteGeometry: deliveryPlanningRoute.routeShape,
                    plannedLoadedRouteSource: deliveryPlanningRoute.source,
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
                {planningRoute ? (planningRoute.source === 'fallback' ? 'ESTIMATED' : planningRoute.source === 'cache' ? 'CACHED ROAD' : 'RECOMMENDED') : 'CALCULATING'}
              </span>
            </div>

            <div className="trip-plan-v2-driver-row">
              <div className="trip-plan-v2-driver-badge" aria-hidden="true">M</div>
              <div>
                <span>DRIVER</span>
                <strong>{planningDriver?.fullName || planningDriver?.name || 'Driver'}</strong>
              </div>
            </div>

            <div className="trip-plan-v2-stop-row">
              <span>NEXT STOP</span>
              <strong>{planningPickup?.name || 'Pickup'}</strong>
              <small>{planningLoad ? formatAppointment(planningLoad.pickupDayIndex, planningLoad.pickupWindowStartMinutes, planningLoad.pickupWindowEndMinutes) : '—'}</small>
            </div>

            <div className="trip-plan-v2-route-label">
              <span>{planningRoute?.source === 'fallback' ? 'ROUTE DATA LIMITED' : planningRoute?.source === 'cache' ? 'ROUTE TO PICKUP — CACHED ROAD' : 'ROUTE TO PICKUP'}</span>
              <small>{planningRoute?.source === 'fallback' ? 'Estimated timing only · road geometry unavailable' : planningRoute?.source === 'cache' ? 'Saved road route · available offline' : 'Timing and load decision'}</small>
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
                      <span>WINDOW</span>
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
                className="trip-plan-v2-confirm"
                disabled={!planningRoute}
                onClick={() => {
                  setLoads((current) => current.map((load) => load.id === planningMode.loadId ? {
                    ...load,
                    planningStatus: 'route-ready',
                    plannedDeadheadMiles: planningRoute.distanceMiles,
                    plannedDeadheadDriveTimeMinutes: planningRoute.durationMinutes,
                    plannedDeadheadRouteGeometry: planningRoute.routeShape,
                    plannedDeadheadRouteSource: planningRoute.source,
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
                      || loads.find((load) => load.assignedDriverId === driver.id && load.tripStatus !== 'queued' && !['delivered', 'completed'].includes(load.tripStatus))
                    const driverQueue = getDriverQueue(loads, driver.id)
                    const projected = getProjectedDriverOrigin({ driver, loads, runtimePositions, gameTime })
                    const driverName = driver.fullName || driver.name || 'Driver'
                    const panel = driverLoad ? getDriverPanelModel({ driver, assignedLoad: driverLoad, gameTime, runtimeProgress: runtimeProgressByDriver?.[driver.id] ?? 0, pickup: mapLocations.find((location) => location.id === driverLoad.pickupLocationId), delivery: mapLocations.find((location) => location.id === driverLoad.deliveryLocationId) }) : null
                    const driverStatus = panel?.statusLabel?.toUpperCase() || (driver.status === 'available' ? 'AVAILABLE' : String(driver.status || 'OFF DUTY').replaceAll('-', ' ').toUpperCase())
                    const nextLoad = driverQueue[0]
                    const availableLabel = Number.isFinite(projected.availableAbsoluteMinute)
                      ? `${formatCompactDate(Math.floor(projected.availableAbsoluteMinute / 1440))} · ${formatTime(projected.availableAbsoluteMinute % 1440)}`
                      : '—'
                    return (
                      <button
                        type="button"
                        className={`driver-hub-row state-${driverLoad?.tripStatus || driver.status || 'idle'}`}
                        key={driver.id}
                        onClick={() => {
                          const actionType = panel?.actionType
                          setDriverHubOpen(false)
                          if (actionType === 'PLAN_TRIP' && driverLoad) {
                            startPlanning(driverLoad.id, driver.id)
                            return
                          }
                          if (actionType === 'PLAN_DELIVERY_TRIP' && driverLoad) {
                            startDeliveryPlanning(driverLoad.id)
                            return
                          }
                          if (actionType === 'MESSAGE_DRIVER') {
                            setPhoneInitialScreen('messageThread')
                            setPhoneInitialDriverId(driver.id)
                            setPhoneLoadId(driverLoad?.id || null)
                            setIsPhoneOpen(true)
                            return
                          }
                          if (actionType === 'OPEN_PICKUP') {
                            setFacilityFocusRole('pickup')
                            setFacilityFocusRequest((value) => value + 1)
                            return
                          }
                          if (actionType === 'OPEN_DELIVERY') {
                            setFacilityFocusRole('delivery')
                            setFacilityFocusRequest((value) => value + 1)
                            return
                          }
                          if (actionType === 'REVIEW_POD') {
                            setPhoneInitialScreen('documents')
                            setPhoneLoadId(driverLoad?.id || null)
                            setIsPhoneOpen(true)
                            return
                          }
                          setDriverFocusId(driver.id)
                          setDriverFocusRequest((value) => value + 1)
                        }}
                      >
                        <span className="driver-hub-avatar">{driverName.charAt(0).toUpperCase()}</span>
                        <span className="driver-hub-copy">
                          <strong>{driverName}{driverLoad ? <small> · {driverLoad.id}</small> : null}</strong>
                          <span>{driverStatus}</span>
                          {driverLoad ? <small>{getActiveDriverMeta(driverLoad, gameTime, runtimeProgressByDriver?.[driver.id] ?? null)}</small> : null}
                          {nextLoad ? <small>NEXT · {nextLoad.loadNumber || nextLoad.id} · {formatTime(nextLoad.pickupWindowStartMinutes)}–{formatTime(nextLoad.pickupWindowEndMinutes)}</small> : null}
                          <small>AVAILABLE · {availableLabel}</small>
                          <span className="driver-relationship"><span className="driver-relationship-label"><small>RELATIONSHIP</small><small>{Number(driver.communicationRapport ?? 50) >= 80 ? 'STRONG' : Number(driver.communicationRapport ?? 50) >= 65 ? 'TRUSTED' : Number(driver.communicationRapport ?? 50) >= 45 ? 'PROFESSIONAL' : Number(driver.communicationRapport ?? 50) >= 25 ? 'STRAINED' : 'POOR'}</small></span><span className="driver-relationship-track"><i style={{ width: `${Math.max(4, Math.min(100, Number(driver.communicationRapport ?? 50)))}%` }} /></span></span>
                        </span>
                        <span className="driver-hub-jump">{panel?.actionLabel ? `${panel.actionLabel} →` : 'VIEW →'}</span>
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
          const resultDriver = drivers.find((driver) => driver.id === (resultLoad.completedDriverId || resultLoad.assignedDriverId))
          const relationshipValue = Number(resultDriver?.communicationRapport ?? 50)
          const relationshipLabel = relationshipValue >= 80 ? 'STRONG' : relationshipValue >= 65 ? 'TRUSTED' : relationshipValue >= 45 ? 'PROFESSIONAL' : relationshipValue >= 25 ? 'STRAINED' : 'POOR'
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
                  <div><span>RELATIONSHIP</span><strong>{relationshipLabel}</strong></div>
                </div>

                <section className="load-result-xp load-result-xp-v2">
                  <div><span>XP EARNED</span><strong>+{xpBreakdown.total} XP</strong></div>
                  <small>Complete +100 · Pickup {xpBreakdown.pickupXp >= 0 ? '+' : ''}{xpBreakdown.pickupXp} · Delivery {xpBreakdown.deliveryXp >= 0 ? '+' : ''}{xpBreakdown.deliveryXp} · POD +{xpBreakdown.podXp}{(xpBreakdown.pickupEfficiencyXp + xpBreakdown.deliveryEfficiencyXp) > 0 ? ` · Efficiency +${xpBreakdown.pickupEfficiencyXp + xpBreakdown.deliveryEfficiencyXp}` : ''}</small>
                </section>

                <button className="load-result-done load-result-done-v2" type="button" onClick={() => setCompletionResultLoadId(null)}>DONE</button>
              </section>
            </div>
          )
        })()}

        {!isPhoneOpen && !driverFitEvaluation && !planningMode && !deliveryPlanning && !freightBrowseMode && (
          <button
            type="button"
            className="phone-button"
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
            onAcceptAgreement={onAcceptAgreement}
            onApprovePod={(loadId) => {
              const approved = onApprovePod?.(loadId)
              if (!approved) return
              setDriverFocusId(assignedLoad?.assignedDriverId || null)
              setDriverFocusRequest((value) => value + 1)
              setIsPhoneOpen(false)
            }}
            emailMessages={emailMessages}
            setEmailMessages={setEmailMessages}
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
            onSendDriverQuickReply={sendDriverQuickReply}
            onPlanDeliveryRoute={(loadId) => { setIsPhoneOpen(false); startDeliveryPlanning(loadId) }}
            onOpenLedger={onOpenLedger}
            ledgerWorkflowByLoadId={ledgerWorkflowByLoadId}
            setLedgerWorkflowByLoadId={setLedgerWorkflowByLoadId}
            onEvaluateFit={startEvaluation}
            onAcceptCandidateAssignment={acceptCandidateAssignment}
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
