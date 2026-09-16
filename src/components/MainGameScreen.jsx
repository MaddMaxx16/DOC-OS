import { useEffect, useRef, useState } from 'react'
import GameMap from './GameMap.jsx'
import LoadingChallenge from './LoadingChallenge.jsx'
import UnloadSequencingChallenge from './UnloadSequencingChallenge.jsx'
import PhoneOverlay from './PhoneOverlay.jsx'
import StatusBar from './StatusBar.jsx'
import OperationsBar from './OperationsBar.jsx'
import EndDaySheet from './EndDaySheet.jsx'
import LunchDecisionOverlay from './LunchDecisionOverlay.jsx'
import DayResultsScreen from './DayResultsScreen.jsx'
import DayBriefingScreen from './DayBriefingScreen.jsx'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute, getLocationDistanceMiles, getRouteEndpointDistanceMiles, normalizeRouteGeometry } from '../services/routingService.js'
import { logDocOsEvent } from '../utils/debugLogger.js'
import { getLedgerSummary, getReceivables } from '../utils/ledger.js'
import { PICKUP_LOADING_MINUTES } from '../data/pickupConfig.js'
import { getEndDayStatus } from '../utils/dayLoop.js'
import { getDriverActiveLoad, getDriverOnboardLoads, getDriverQueue, getNextQueuePosition, getProjectedDriverOrigin, promoteNextQueuedLoad } from '../utils/driverQueue.js'
import { getDriverPanelModel } from '../utils/driverOperationalState.js'
import { buildDriverItinerary, getNextActionableDriverStop } from '../utils/driverItinerary.js'
import { getFreightBusinessName, getFreightCommodity, getFreightRouteName } from '../utils/freightIdentity.js'
import { getFreightHaulClass, getPlanningImpact } from '../utils/planningIntelligence.js'
import { getRouteLifecycleLabel } from '../utils/routeLifecycle.js'
import { getDelayMessage, getDepartureMessage, getPickupExceptionMessage, getScheduleAcknowledgement, getUnloadExceptionMessage } from '../utils/driverCommunications.js'
import { applyLunchDuration, getLunchDecisionChoices, isDriverOnLunch, isLunchDecisionReady } from '../utils/lunchDecisionEvents.js'


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

function getWindowEndAbsolute(dayIndex, startMinutes, endMinutes) {
  if (![dayIndex, startMinutes, endMinutes].every(Number.isFinite)) return null
  const rollover = endMinutes < startMinutes ? 1440 : 0
  return dayIndex * 1440 + endMinutes + rollover
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
    loaded: 'LOADED · ROUTE READY',
    'onboard-hold': 'ONBOARD · NEXT STOP PENDING',
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
  const entries = []

  drivers.forEach((driver) => {
    buildDriverItinerary(loads, driver.id).forEach((stop) => {
      if (stop.dayIndex !== dayIndex) return
      const load = stop.load
      const location = mapLocations.find((item) => item.id === stop.locationId)?.name || (stop.type === 'pickup' ? 'Pickup' : 'Delivery')
      const counterpart = mapLocations.find((item) => item.id === (stop.type === 'pickup' ? load.deliveryLocationId : load.pickupLocationId))?.name || ''
      const windowEndAbsolute = getWindowEndAbsolute(stop.dayIndex, stop.windowStartMinutes, stop.windowEndMinutes)
      const projectedArrival = stop.type === 'pickup'
        ? (Number.isFinite(load.pickupArrivalGameMinute) ? load.pickupArrivalGameMinute : Number.isFinite(load.assignmentProjection?.arrivalMinutes) ? (load.assignmentProjection.arrivalDay ?? stop.dayIndex) * 1440 + load.assignmentProjection.arrivalMinutes : null)
        : (Number.isFinite(load.deliveryArrivalGameMinute) ? load.deliveryArrivalGameMinute : Number.isFinite(load.deliveryDepartureGameMinute) && Number.isFinite(load.plannedLoadedDriveTimeMinutes) ? load.deliveryDepartureGameMinute + load.plannedLoadedDriveTimeMinutes : null)
      const isCompleted = stop.state === 'completed'
      const risk = isCompleted ? { label: 'COMPLETED', tone: 'completed' } : getScheduleRisk({ windowEndAbsolute, projectedArrivalAbsolute: projectedArrival, now })
      // CS2.0A.9 — Scheduler and Driver Hub consume the same route lifecycle
      // before operations begin. Once the route is physically active, the stop
      // state can add operational detail without inventing a second booking state.
      let status = getRouteLifecycleLabel(load)
      if (stop.type === 'delivery' && load.tripStatus === 'onboard-hold') status = 'ONBOARD · DELIVERY PENDING'
      else if (stop.type === 'delivery' && load.tripStatus === 'loaded' && load.waitingReason === 'appointment-protected' && Number.isFinite(load.plannedDeliveryDepartureGameMinute)) status = `LOADED · DEPART ${formatTime(load.plannedDeliveryDepartureGameMinute % 1440)}`
      else if (isCompleted) status = stop.type === 'delivery' && load.pod?.approved ? 'COMPLETE · POD APPROVED' : 'COMPLETE'

      entries.push({
        id: stop.id, entryType: 'stop', stopType: stop.type, loadId: load.id, driverId: driver.id,
        driverName: driver.fullName || driver.name || 'Driver', loadRef: stop.loadRef, freightName: getFreightCommodity(load), locationName: location,
        counterpartName: counterpart, pickupName: stop.type === 'pickup' ? location : counterpart, deliveryName: stop.type === 'delivery' ? location : counterpart,
        start: stop.windowStartMinutes, end: stop.windowEndMinutes, pickupStart: stop.windowStartMinutes, pickupEnd: stop.windowEndMinutes,
        deliveryStart: stop.windowStartMinutes, deliveryEnd: stop.windowEndMinutes, sortMinute: stop.sortMinute, itineraryOrder: stop.itineraryOrder, status, risk, isCompleted,
        rate: load.rate, planningImpact: getPlanningImpact(load, loads, driver.id), haulClass: getFreightHaulClass(load),
        travelMinutes: stop.type === 'pickup'
          ? Number(load.plannedDeadheadDriveTimeMinutes ?? load.assignmentProjection?.deadheadMinutes ?? load.tripPlan?.legs?.deadhead?.minutes ?? 0)
          : Number(load.plannedLoadedDriveTimeMinutes ?? load.assignmentProjection?.loadedMinutes ?? load.tripPlan?.legs?.loaded?.minutes ?? 0),
        podPending: stop.type === 'delivery' && Boolean(load.pod && !load.pod.approved),
      })
    })
  })

  // Carrier approval holds remain visible even before a load is actually booked into the itinerary.
  loads.forEach((load) => {
    if (!(load.status === 'available' && load.candidateDriverId && (load.scheduleApprovalQueued || ['PENDING','APPROVED','NEEDS_INFO'].includes(load.carrierApprovalStatus)))) return
    const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)?.name || 'Pickup'
    const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'Delivery'
    entries.push({
      id: `${load.id}-hold`, entryType: 'hold', loadId: load.id, driverId: load.candidateDriverId,
      driverName: drivers.find((driver) => driver.id === load.candidateDriverId)?.fullName || 'Driver', loadRef: getFreightRouteName(load), freightName: getFreightCommodity(load),
      pickupName: pickup, deliveryName: delivery, locationName: pickup, counterpartName: delivery,
      pickupStart: load.pickupWindowStartMinutes, pickupEnd: load.pickupWindowEndMinutes, deliveryStart: load.deliveryWindowStartMinutes, deliveryEnd: load.deliveryWindowEndMinutes,
      start: load.pickupWindowStartMinutes, end: load.deliveryWindowEndMinutes,
      sortMinute: (load.pickupDayIndex ?? dayIndex) * 1440 + (load.pickupWindowStartMinutes ?? 0),
      status: load.carrierApprovalStatus === 'APPROVED' ? 'READY TO BOOK' : load.carrierApprovalStatus === 'PENDING' ? 'WAITING ON CARRIER' : load.carrierApprovalStatus === 'NEEDS_INFO' ? 'PLANNING · NEEDS INFO' : 'PLANNING',
      planningImpact: getPlanningImpact(load, loads, load.candidateDriverId), haulClass: getFreightHaulClass(load),
      rate: load.rate,
      risk: (() => { const impact = getPlanningImpact(load, loads, load.candidateDriverId); return impact ? { label: impact.label, tone: impact.tone } : { label: 'WORKABLE', tone: 'neutral' } })(), isCompleted: false,
    })
  })

  return entries.sort((a, b) => {
    if (a.driverId && a.driverId === b.driverId && Number.isFinite(a.itineraryOrder) && Number.isFinite(b.itineraryOrder)) {
      return a.itineraryOrder - b.itineraryOrder
    }
    return a.sortMinute - b.sortMinute
  })
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
  const windowEnd = getWindowEndAbsolute(dayIndex, start, end)
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
    const pickupName = mapLocations.find((location) => location.id === load.pickupLocationId)?.name || 'Pickup'
    const deliveryName = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'Delivery'
    const pickupArrival = load.pickupArrivalGameMinute
    const pickupStart = Number.isFinite(load.pickupDayIndex) && Number.isFinite(load.pickupWindowStartMinutes) ? load.pickupDayIndex * 1440 + load.pickupWindowStartMinutes : null
    const pickupEnd = Number.isFinite(load.pickupDayIndex) && Number.isFinite(load.pickupWindowEndMinutes) ? getWindowEndAbsolute(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes) : null
    const pickupStillRelevant = !Number.isFinite(pickupArrival) && !PICKUP_COMPLETE_STATUSES.has(load.tripStatus)

    if (pickupStillRelevant && Number.isFinite(pickupStart) && Number.isFinite(pickupEnd)) {
      if (now > pickupEnd) {
        const late = now - pickupEnd
        alerts.push({ id: `appt-pickup-${load.id}`, alertClass: 'urgent', tone: 'danger', action: 'load', loadId: load.id, title: `${pickupName} · PICKUP LATE`, detail: `Pickup window has closed. ${formatMinutes(late)} late.`, value: `${formatMinutes(late)} LATE` })
      } else if (now >= pickupStart) {
        alerts.push({ id: `appt-pickup-${load.id}`, alertClass: 'action', tone: 'attention', action: 'load', loadId: load.id, title: `${pickupName} · PICKUP WINDOW OPEN`, detail: `${formatMinutes(pickupEnd - now)} remain in the pickup window.`, value: `${formatMinutes(pickupEnd - now)} LEFT` })
      }
      return
    }

    const deliveryArrival = load.deliveryArrivalGameMinute
    let deliveryStart = Number.isFinite(load.deliveryDayIndex) && Number.isFinite(load.deliveryWindowStartMinutes) ? load.deliveryDayIndex * 1440 + load.deliveryWindowStartMinutes : null
    let deliveryEnd = Number.isFinite(load.deliveryDayIndex) && Number.isFinite(load.deliveryWindowEndMinutes) ? getWindowEndAbsolute(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes) : null
    // AV2.10.1: protect overnight appointments from stale day-index math. If an
    // overnight window is rendered more than half a day behind the current clock,
    // it belongs to the next service day rather than being 20+ hours late.
    if (Number.isFinite(deliveryStart) && Number.isFinite(deliveryEnd) && deliveryEnd < now - 720) {
      deliveryStart += 1440
      deliveryEnd += 1440
    }
    const deliveryRelevant = PICKUP_COMPLETE_STATUSES.has(load.tripStatus) && !Number.isFinite(deliveryArrival) && !DELIVERY_ARRIVED_STATUSES.has(load.tripStatus)
    if (!deliveryRelevant || !Number.isFinite(deliveryStart) || !Number.isFinite(deliveryEnd)) return

    if (now > deliveryEnd) {
      const late = now - deliveryEnd
      alerts.push({ id: `appt-delivery-${load.id}`, alertClass: 'urgent', tone: 'danger', action: 'load', loadId: load.id, title: `${deliveryName} · DELIVERY LATE`, detail: `Delivery window has closed. ${formatMinutes(late)} late.`, value: `${formatMinutes(late)} LATE` })
    } else if (now >= deliveryStart) {
      alerts.push({ id: `appt-delivery-${load.id}`, alertClass: 'action', tone: 'attention', action: 'load', loadId: load.id, title: `${deliveryName} · DELIVERY WINDOW OPEN`, detail: `${formatMinutes(deliveryEnd - now)} remain in the delivery window.`, value: `${formatMinutes(deliveryEnd - now)} LEFT` })
    }
  })
  return alerts
}

function MainGameScreen({ selectedMarket, gameTime, loads, setLoads, drivers, setDrivers, carriers, dispatcherProfile, onSaveDispatcherProfile, onActivateCarrier, carrierApplicationsById, carrierCareerById, onApplyCarrier, onAcceptAgreement, onApprovePod, emailMessages, setEmailMessages, driverMessages: persistedDriverMessages = [], setDriverMessages, businessDocuments = [], operationDay = 1, dayLoopPhase = 'operating', dayReport = null, playerProgression, onEndDay, onContinueDay, onBeginOperations, plannedRoute, setPlannedRoute, isGameClockPaused = false, setGameClockPaused, runtimePositions, setRuntimePositions, runtimeProgressByDriver = {}, setRuntimeProgressByDriver, simulationSpeed, setSimulationSpeed, onOpenMarkets, onResetGame, onResetDayAfterCarrierApproval, seenLedgerReceivableIds, seenLedgerPaymentReadyIds, onOpenLedger, ledgerWorkflowByLoadId, setLedgerWorkflowByLoadId, setGameTime, onAwardLoadXp, onSetupOvernightDevScenario }) {
  const [devOpen, setDevOpen] = useState(false)
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [phoneInitialScreen, setPhoneInitialScreen] = useState('home')
  const [driverFitEvaluation, setDriverFitEvaluation] = useState(null)
  const [phoneLoadId, setPhoneLoadId] = useState(null)
  const [phoneInitialDriverId, setPhoneInitialDriverId] = useState(null)
  const [planningMode, setPlanningMode] = useState(null)
  const [deliveryPlanning, setDeliveryPlanning] = useState(null)
  const modalPauseWasAlreadyPausedRef = useRef(false)
  const loadingPauseWasAlreadyPausedRef = useRef(false)
  const unloadingPauseWasAlreadyPausedRef = useRef(false)
  const [operationsOpen, setOperationsOpen] = useState(false)
  const [endDayOpen, setEndDayOpen] = useState(false)
  const [loadingChallengeLoadId, setLoadingChallengeLoadId] = useState(null)
  const [pendingLoadingHandoff, setPendingLoadingHandoff] = useState(null)
  const [unloadSequenceLoadId, setUnloadSequenceLoadId] = useState(null)
  const [driverFocusRequest, setDriverFocusRequest] = useState(0)
  const [boardViewRequest, setBoardViewRequest] = useState(0)
  const [facilityFocusRequest, setFacilityFocusRequest] = useState(0)
  const [facilityFocusRole, setFacilityFocusRole] = useState(null)
  const [driverFocusId, setDriverFocusId] = useState(null)
  const [driverHubOpen, setDriverHubOpen] = useState(false)
  const [expandedDriverScheduleId, setExpandedDriverScheduleId] = useState(null)
  const [seenLoadResultIds, setSeenLoadResultIds] = useState([])
  const [completionResultLoadId, setCompletionResultLoadId] = useState(null)
  const [freightBrowseMode, setFreightBrowseMode] = useState(false)
  const [freightBrowseLoadId, setFreightBrowseLoadId] = useState(null)
  const [freightBrowseRouteGeometry, setFreightBrowseRouteGeometry] = useState(null)
  const [freightBrowseRouteStatus, setFreightBrowseRouteStatus] = useState('idle')
  const [lunchDecisionDriverId, setLunchDecisionDriverId] = useState(null)
  const lunchPauseWasAlreadyPausedRef = useRef(false)
  const lunchPriorSpeedRef = useRef(1)
  const freightBrowseRouteRequestRef = useRef(0)
  const itineraryMovementSyncRef = useRef(new Map())
  const itineraryMovementTokenRef = useRef(0)

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
  const assignedLoad = activeDriverLoads.find((load) => ['en-route-pickup', 'en-route-delivery', 'checked-in-pickup', 'checked-in-delivery', 'pickup-issue'].includes(load.tripStatus))
    || activeDriverLoads[0]
    || null
  const assignedDriverId = assignedLoad?.assignedDriverId || null
  const assignedDriverOnLunch = isDriverOnLunch(drivers.find((driver) => driver.id === assignedDriverId), gameTime)
  const runtimeProgress = assignedDriverId ? (runtimeProgressByDriver?.[assignedDriverId] ?? null) : null
  const setDriverRuntimeProgress = (driverId, value) => setRuntimeProgressByDriver?.((current) => ({ ...(current || {}), [driverId]: value }))
  const podNotificationCount = loads.filter((load) => load.tripStatus === 'awaiting-pod').length
  const emailUnreadCount = emailMessages?.filter((message) => !message.read).length || 0
  const currentAbsoluteGameMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay

  // CS2.0B.4.1.3.1 — lunch is now a ready task, not an interrupt. DOC OS
  // flags eligible drivers, but the dispatcher decides when to open the decision.
  const lunchReadyDriverIds = drivers.filter((driver) => isLunchDecisionReady({ driver, loads, gameTime })).map((driver) => driver.id)

  const openLunchDecisionForDriver = (driverId) => {
    const candidate = drivers.find((driver) => driver.id === driverId) || null
    if (!candidate || !isLunchDecisionReady({ driver: candidate, loads, gameTime })) return false
    lunchPauseWasAlreadyPausedRef.current = isGameClockPaused
    lunchPriorSpeedRef.current = Number(simulationSpeed) || 1
    setSimulationSpeed(0.75)
    setGameClockPaused(false)
    setLunchDecisionDriverId(candidate.id)
    setIsPhoneOpen(false)
    return true
  }

  const closeLunchDecision = () => {
    setLunchDecisionDriverId(null)
    setSimulationSpeed(lunchPriorSpeedRef.current || 1)
    setGameClockPaused(lunchPauseWasAlreadyPausedRef.current)
  }

  const lunchDecisionDriver = drivers.find((driver) => driver.id === lunchDecisionDriverId) || null
  const lunchDecisionWorkday = lunchDecisionDriver?.workdayByDay?.[String(gameTime.gameDayIndex)] || lunchDecisionDriver?.workdayByDay?.[gameTime.gameDayIndex] || null
  const lunchDecisionChoices = lunchDecisionDriver && lunchDecisionWorkday
    ? getLunchDecisionChoices({ driver: lunchDecisionDriver, loads, gameTime, operationDay })
    : []

  const chooseLunchDecision = (choice) => {
    if (!choice || !lunchDecisionDriver || !lunchDecisionWorkday) return
    const offeredChoiceIds = lunchDecisionChoices.map((item) => item.id)
    const dayKey = String(gameTime.gameDayIndex)
    const relationshipDelta = Number(choice.effects?.relationship || 0)
    const actualLunchStartMinutes = Number(gameTime.totalMinutesOfDay || lunchDecisionWorkday.lunchStartMinutes || 0)
    const nextDuration = applyLunchDuration(lunchDecisionWorkday.lunchDurationMinutes, choice.effects?.durationOverrideMinutes)
    const lunchEnd = Math.min(Number(lunchDecisionWorkday.endMinutes || 1440), actualLunchStartMinutes + nextDuration)
    const duration = Math.max(20, lunchEnd - actualLunchStartMinutes)

    setDrivers((current) => current.map((driver) => {
      if (driver.id !== lunchDecisionDriver.id) return driver
      const workdayByDay = { ...(driver.workdayByDay || {}) }
      const currentWorkday = workdayByDay[dayKey] || lunchDecisionWorkday
      if (currentWorkday?.lunchEvent?.selectedChoiceId) return driver
      workdayByDay[dayKey] = {
        ...currentWorkday,
        lunchStartMinutes: actualLunchStartMinutes,
        lunchDurationMinutes: duration,
        lunchEvent: {
          selectedChoiceId: choice.id,
          title: choice.title,
          category: choice.category,
          selectedGameMinute: currentAbsoluteGameMinute,
          offeredChoiceIds,
          effects: { ...(choice.effects || {}) },
        },
      }
      const lunchOfferHistory = [
        ...(Array.isArray(driver.lunchOfferHistory) ? driver.lunchOfferHistory : []).filter((entry) => entry?.dayIndex !== gameTime.gameDayIndex),
        { dayIndex: gameTime.gameDayIndex, optionIds: offeredChoiceIds, selectedChoiceId: choice.id },
      ].slice(-6)
      const lunchEffectsByDay = {
        ...(driver.lunchEffectsByDay || {}),
        [dayKey]: {
          recovery: Number(choice.effects?.recovery || 0),
          earlyCheckInBonusMinutes: Number(choice.effects?.earlyCheckInBonusMinutes || 0),
          prepBonusMinutes: Number(choice.effects?.prepBonusMinutes || 0),
          choiceId: choice.id,
          title: choice.title,
        },
      }
      return {
        ...driver,
        workdayByDay,
        lunchOfferHistory,
        lunchEffectsByDay,
        communicationRapport: Math.max(0, Math.min(100, Number(driver.communicationRapport ?? 50) + relationshipDelta)),
      }
    }))

    setLunchDecisionDriverId(null)
    setSimulationSpeed(lunchPriorSpeedRef.current || 1)
    setGameClockPaused(lunchPauseWasAlreadyPausedRef.current)
  }

  const ledgerNotificationCount = loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved && !seenLedgerReceivableIds.includes(load.id)).length + receivables.filter((item) => item.financialStatus === 'PAID' && !seenLedgerPaymentReadyIds.includes(item.loadId)).length
  const lifecycleDriverMessages = loads.flatMap((load) => {
    // CS2.0B.4.1 — routine check-in is silent. The driver only texts once the
    // facility wait becomes operationally meaningful (20+ minutes).
    const messageDriverId = load.assignedDriverId || load.completedDriverId
    const driver = drivers.find((item) => item.id === messageDriverId)
    const driverName = driver?.fullName || driver?.name || 'Driver'
    const messages = []
    if (Number.isFinite(load.pickupCheckInGameMinute)) {
      const waitEnd = Number.isFinite(load.pickupDockReadyGameMinute) ? Math.min(currentAbsoluteGameMinute, load.pickupDockReadyGameMinute) : currentAbsoluteGameMinute
      const waitedMinutes = Math.max(0, waitEnd - load.pickupCheckInGameMinute)
      if (currentAbsoluteGameMinute >= load.pickupCheckInGameMinute + 20 && waitedMinutes >= 20) {
        const pickupFacility = mapLocations.find((location) => location.id === load.pickupLocationId)
        const facilityName = getFreightBusinessName(load, 'pickup') || pickupFacility?.name || 'the pickup'
        messages.push({
          id: `${load.id}-pickup-checked-in`, loadId: load.id, driverId: messageDriverId, sender: driverName, senderRole: 'Driver', direction: 'inbound',
          body: getDelayMessage({ facilityName, phase: 'pickup', waitedMinutes }), messageIntent: 'facility-delay', requiresResponse: true,
          read: Boolean(load.pickupCheckedInDriverMessageRead), receivedGameMinute: load.pickupCheckInGameMinute + 20,
        })
      }
    }
    if (Number.isFinite(load.deliveryCheckInGameMinute)) {
      const waitEnd = Number.isFinite(load.deliveryDockReadyGameMinute) ? Math.min(currentAbsoluteGameMinute, load.deliveryDockReadyGameMinute) : currentAbsoluteGameMinute
      const waitedMinutes = Math.max(0, waitEnd - load.deliveryCheckInGameMinute)
      if (currentAbsoluteGameMinute >= load.deliveryCheckInGameMinute + 20 && waitedMinutes >= 20) {
        const deliveryFacility = mapLocations.find((location) => location.id === load.deliveryLocationId)
        const facilityName = getFreightBusinessName(load, 'delivery') || deliveryFacility?.name || 'the receiver'
        messages.push({
          id: `${load.id}-delivery-checked-in`, loadId: load.id, driverId: messageDriverId, sender: driverName, senderRole: 'Driver', direction: 'inbound',
          body: getDelayMessage({ facilityName, phase: 'delivery', waitedMinutes }), messageIntent: 'facility-delay', requiresResponse: true,
          read: Boolean(load.deliveryCheckedInDriverMessageRead), receivedGameMinute: load.deliveryCheckInGameMinute + 20,
        })
      }
    }
    return messages
  })
  const lifecycleMessageIds = new Set(lifecycleDriverMessages.map((message) => message.id))
  const driverMessages = [
    ...persistedDriverMessages.filter((message) => !lifecycleMessageIds.has(message.id)),
    ...lifecycleDriverMessages,
  ]
  const driverMessageUnreadCount = driverMessages.filter((message) => message.direction !== 'outbound' && !message.read).length
  const phoneNotificationCount = emailUnreadCount + driverMessageUnreadCount + lunchReadyDriverIds.length
  const driverLunchAlerts = lunchReadyDriverIds.map((driverId) => {
    const driver = drivers.find((item) => item.id === driverId)
    const driverName = driver?.fullName || driver?.name || 'Driver'
    return {
      id: `driver-${driverId}-lunch-ready-${gameTime.gameDayIndex}`,
      driverId, alertClass: 'action', tone: 'attention', action: 'lunch-decision',
      title: `${driverName} · LUNCH READY`,
      detail: 'Lunch window is open. Choose the afternoon strategy when ready.',
      value: 'CHOOSE LUNCH',
    }
  })

  const driverOperationAlerts = activeDriverLoads.flatMap((load) => {
    const driver = drivers.find((item) => item.id === load.assignedDriverId)
    if (isDriverOnLunch(driver, gameTime)) return []
    const driverName = driver?.fullName || driver?.name || 'Driver'
    const pickupName = mapLocations.find((location) => location.id === load.pickupLocationId)?.name || 'pickup'
    const deliveryName = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'delivery'
    const base = { driverId: load.assignedDriverId, loadId: load.id, tone: 'attention', alertClass: 'action' }
    if (load.tripStatus === 'checked-in-pickup') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-pickup-ready`, action: 'pickup', title: `${pickupName} · DOCK READY`, detail: `${driverName} has been called to a door.`, value: 'BEGIN LOADING' }]
    if (load.tripStatus === 'checked-in-delivery') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-delivery-ready`, action: 'delivery', title: `${deliveryName} · DOCK READY`, detail: `${driverName} has been called to a door.`, value: 'BEGIN UNLOADING' }]
    if (load.tripStatus === 'assigned' && !Number.isFinite(load.pickupDriverBriefedGameMinute)) return []
    if (load.tripStatus === 'pickup-issue') return [{ ...base, id: `driver-${load.assignedDriverId}-${load.id}-pickup-issue`, action: 'resolve-pickup-issue', title: `${pickupName} · PICKUP ISSUE`, detail: `${driverName} is being held while the freight issue is corrected.`, value: 'REQUEST CORRECTION' }]
    return []
  })
  const driverCommunicationAlerts = activeDriverLoads.flatMap((load) => {
    if (!['waiting-at-pickup', 'waiting-at-delivery'].includes(load.tripStatus)) return []
    const driver = drivers.find((item) => item.id === load.assignedDriverId)
    if (isDriverOnLunch(driver, gameTime)) return []
    const driverName = driver?.fullName || driver?.name || 'Driver'
    const atDelivery = load.tripStatus === 'waiting-at-delivery'
    const facilityName = mapLocations.find((location) => location.id === (atDelivery ? load.deliveryLocationId : load.pickupLocationId))?.name || 'Facility'
    const waitStart = atDelivery ? load.deliveryCheckInGameMinute : load.pickupCheckInGameMinute
    if (!Number.isFinite(waitStart)) return []
    const waited = Math.max(0, currentAbsoluteGameMinute - waitStart)
    const appointmentStart = atDelivery
      ? ((load.deliveryDayIndex ?? gameTime.gameDayIndex) * 1440 + (load.deliveryWindowStartMinutes ?? 0))
      : ((load.pickupDayIndex ?? gameTime.gameDayIndex) * 1440 + (load.pickupWindowStartMinutes ?? 0))
    // AV2.9.8: appointment-protected waiting is expected operational time, not a dispatcher failure.
    if (Number.isFinite(appointmentStart) && currentAbsoluteGameMinute < appointmentStart) return []
    if (waited < 20) return []
    return [{
      id: `driver-wait-${load.assignedDriverId}-${load.id}`,
      driverId: load.assignedDriverId,
      loadId: load.id,
      alertClass: waited >= 30 ? 'urgent' : 'action',
      tone: waited >= 30 ? 'danger' : 'attention',
      action: 'messages',
      title: `${driverName} · WAITING ${Math.round(waited)} MIN`,
      detail: `${facilityName} · Check in with the driver and manage the delay.`,
      value: 'MESSAGE',
    }]
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

  // AV2.11: appointment timers are no longer allowed to hijack the driver.
  // A staged load may depart for its receiver only when that delivery is still
  // the canonical next actionable stop on the driver's itinerary.
  useEffect(() => {
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const ready = loads.filter((load) => {
      if (!load.assignedDriverId
        || load.tripStatus !== 'loaded'
        || load.waitingReason !== 'appointment-protected'
        || !Number.isFinite(load.plannedDeliveryDepartureGameMinute)
        || now < load.plannedDeliveryDepartureGameMinute) return false
      const nextStop = getNextActionableDriverStop(loads, load.assignedDriverId)
      return nextStop?.loadId === load.id && nextStop?.type === 'delivery'
    })
    if (!ready.length) return
    const readyIds = new Set(ready.map((load) => load.id))
    setLoads((current) => current.map((load) => readyIds.has(load.id) ? {
      ...load,
      tripStatus: 'en-route-delivery',
      deliveryDepartureGameMinute: now,
      waitingReason: null,
    } : load))
    ready.forEach((load) => {
      setDriverRuntimeProgress(load.assignedDriverId, 0)
      const driver = drivers.find((item) => item.id === load.assignedDriverId)
      const driverName = driver?.fullName || 'Driver'
      const deliveryName = getFreightBusinessName(load, 'delivery') || mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'the receiver'
      setDriverMessages?.((current) => current.some((message) => message.id === `appointment-depart-${load.id}`) ? current : [...current, {
        id: `appointment-depart-${load.id}`, driverId: load.assignedDriverId, sender: driverName, senderRole: 'Driver', direction: 'inbound', loadId: load.id,
        body: getDepartureMessage({ driver, load, phase: 'delivery', facilityName: deliveryName, operationDay }), messageIntent: 'major-departure', phase: 'delivery', requiresResponse: false,
        receivedGameMinute: now + 0.01, read: false,
      }])
    })
  }, [gameTime, loads, drivers, setDriverMessages])

  // CS2.0B.4.1 — major departures are communication events even when movement was
  // started automatically by itinerary reconciliation rather than a manual route send.
  // This effect only observes authoritative travel state; it never changes movement.
  useEffect(() => {
    if (!setDriverMessages) return
    const traveling = loads.filter((load) => {
      if (!load.assignedDriverId) return false
      if (load.tripStatus === 'en-route-pickup') return Number.isFinite(load.departureGameMinute)
      if (load.tripStatus === 'en-route-delivery') return Number.isFinite(load.deliveryDepartureGameMinute)
      return false
    })
    if (!traveling.length) return
    setDriverMessages((current) => {
      let next = current
      traveling.forEach((load) => {
        const phase = load.tripStatus === 'en-route-pickup' ? 'pickup' : 'delivery'
        const departureMinute = phase === 'pickup' ? load.departureGameMinute : load.deliveryDepartureGameMinute
        const alreadySent = next.some((message) => message.driverId === load.assignedDriverId && message.loadId === load.id && message.messageIntent === 'major-departure' && message.phase === phase)
        if (alreadySent) return
        const driver = drivers.find((item) => item.id === load.assignedDriverId)
        const facilityId = phase === 'pickup' ? load.pickupLocationId : load.deliveryLocationId
        const facilityName = getFreightBusinessName(load, phase) || mapLocations.find((location) => location.id === facilityId)?.name || (phase === 'pickup' ? 'the pickup' : 'the receiver')
        const message = {
          id: `major-departure-${phase}-${load.id}-${departureMinute}`, driverId: load.assignedDriverId, sender: driver?.fullName || driver?.name || 'Driver', senderRole: 'Driver', direction: 'inbound', loadId: load.id,
          body: getDepartureMessage({ driver, load, phase, facilityName, operationDay }), messageIntent: 'major-departure', phase, requiresResponse: false,
          receivedGameMinute: departureMinute + 0.01, read: false,
        }
        next = next === current ? [...current, message] : [...next, message]
      })
      return next
    })
  }, [loads, drivers, operationDay, setDriverMessages])

  // CS2.0A.7 — schedule reconciliation only starts work when there is no active
  // physical leg/facility operation. getNextActionableDriverStop() now returns
  // the current physical stop first, so future windows cannot divert a truck or
  // replace facility work that is already underway.
  useEffect(() => {
    // CS2.0A.10.3: never choose/reassign movement while Confirm Load is in its
    // atomic post-minigame handoff. The next render will reconcile normally.
    if (pendingLoadingHandoff) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    drivers.forEach((driver) => {
      // CS2.0B.4.1.3.2 — lunch pauses only this driver. The world and other
      // drivers continue, but this driver cannot start or advance a new leg.
      if (isDriverOnLunch(driver, gameTime)) return
      const nextStop = getNextActionableDriverStop(loads, driver.id)
      if (!nextStop) return
      const nextLoad = loads.find((item) => item.id === nextStop.loadId)
      if (!nextLoad) return

      const liveLoad = getDriverActiveLoad(loads, driver.id)
      const liveTrip = liveLoad?.tripStatus
      const targetTravelStatus = nextStop.type === 'pickup' ? 'en-route-pickup' : 'en-route-delivery'
      const alreadyOnTarget = nextLoad.tripStatus === targetTravelStatus

      // AV2.12 invariant: one driver, one physical movement leg. Clean up stale
      // travel states even when the correct target is already moving.
      const staleTravelIds = loads.filter((item) => item.assignedDriverId === driver.id
        && item.id !== nextLoad.id
        && ['en-route-pickup', 'en-route-delivery'].includes(item.tripStatus)).map((item) => item.id)
      if (staleTravelIds.length) {
        const staleSet = new Set(staleTravelIds)
        setLoads((current) => current.map((item) => {
          if (!staleSet.has(item.id)) return item
          if (item.tripStatus === 'en-route-delivery') return { ...item, tripStatus: 'onboard-hold', status: 'onboard', waitingReason: 'itinerary-next-stop', deliveryDepartureGameMinute: null }
          return { ...item, tripStatus: 'queued', status: 'queued', departureGameMinute: null, waitingReason: 'itinerary-next-stop' }
        }))
      }
      if (alreadyOnTarget) return

      // Do not interrupt facility work. Reconciliation happens again immediately
      // after that stop completes.
      if (['at-pickup','checking-in-pickup','waiting-at-pickup','checked-in-pickup','loading-at-pickup','pickup-issue',
        'at-delivery','checking-in-delivery','waiting-at-delivery','checked-in-delivery','unloading-delivery'].includes(liveTrip)) return

      const destination = mapLocations.find((location) => location.id === (nextStop.type === 'pickup' ? nextLoad.pickupLocationId : nextLoad.deliveryLocationId))
      if (!destination) return
      const origin = runtimePositions[driver.id]
        || mapLocations.find((location) => location.id === (liveLoad?.tripStatus === 'en-route-delivery' ? liveLoad.deliveryLocationId : liveLoad?.pickupLocationId))
        || mapLocations.find((location) => location.id === driver.homeBaseLocationId)
      if (!origin) return

      const syncKey = `${driver.id}:${nextStop.id}`
      const existingSync = itineraryMovementSyncRef.current.get(driver.id)
      if (existingSync?.key === syncKey) return
      const token = ++itineraryMovementTokenRef.current
      itineraryMovementSyncRef.current.set(driver.id, { key: syncKey, token })

      // AV2.11.1 — movement authority changes BEFORE route calculation.
      // AV2.11 still left the current loaded/en-route delivery in control until an
      // async routing request completed. If routing was slow or failed, a 9 PM
      // delivery could remain the apparent active movement even though the
      // canonical itinerary already said an earlier pickup was next.
      // Demote the old delivery immediately. Routing is now an enhancement, not
      // the gate that decides which stop owns Marcus.
      if (nextStop.type === 'pickup' && liveLoad && liveLoad.id !== nextLoad.id
        && ['loaded','en-route-delivery','onboard-hold'].includes(liveLoad.tripStatus)) {
        setLoads((current) => current.map((item) => item.id === liveLoad.id ? {
          ...item, tripStatus: 'onboard-hold', status: 'onboard', waitingReason: 'itinerary-next-stop',
          deliveryDepartureGameMinute: null,
        } : item))
        setDrivers((current) => current.map((item) => item.id === driver.id ? {
          ...item, assignedLoadId: nextLoad.id,
        } : item))
      }

      ;(async () => {
        try {
          const storedGeometry = nextStop.type === 'pickup' ? nextLoad.plannedDeadheadRouteGeometry : nextLoad.plannedLoadedRouteGeometry
          const storedSource = nextStop.type === 'pickup' ? nextLoad.plannedDeadheadRouteSource : nextLoad.plannedLoadedRouteSource
          let route = null
          let geometry = normalizeRouteGeometry(storedGeometry, origin, destination)
          const storedStartsNearTruck = Array.isArray(geometry) && geometry.length > 1 && getRouteEndpointDistanceMiles(geometry, origin) <= 1.0
          if (storedStartsNearTruck) {
            route = {
              routeShape: geometry,
              distanceMiles: nextStop.type === 'pickup' ? nextLoad.plannedDeadheadMiles : nextLoad.plannedLoadedMiles,
              durationMinutes: nextStop.type === 'pickup' ? nextLoad.plannedDeadheadDriveTimeMinutes : nextLoad.plannedLoadedDriveTimeMinutes,
              source: storedSource || 'cached',
            }
          } else {
            route = await calculateRoute(origin, destination)
            geometry = normalizeRouteGeometry(route.routeShape, origin, destination)
          }
          const activeSync = itineraryMovementSyncRef.current.get(driver.id)
          if (!activeSync || activeSync.token !== token || activeSync.key !== syncKey) return
          const stopWindowStart = nextStop.dayIndex * 1440 + nextStop.windowStartMinutes
          const driveMinutes = Number(route.durationMinutes || 0)
          const departureMinute = Math.max(now, stopWindowStart - driveMinutes - 10)

          // If this next stop is still well in the future, keep the truck staged,
          // but keep the *next pickup* as the driver's authoritative assignment.
          if (now + 1 < departureMinute) {
            setLoads((current) => current.map((item) => {
              if (item.id === nextLoad.id && nextStop.type === 'pickup') return {
                ...item,
                plannedPickupDepartureGameMinute: departureMinute,
                plannedDeadheadMiles: route.distanceMiles,
                plannedDeadheadDriveTimeMinutes: route.durationMinutes,
                plannedDeadheadRouteGeometry: geometry,
                plannedDeadheadRouteSource: route.source,
              }
              if (liveLoad && item.id === liveLoad.id && ['loaded','en-route-delivery','onboard-hold'].includes(item.tripStatus)) return {
                ...item, tripStatus: 'onboard-hold', status: 'onboard', waitingReason: 'itinerary-next-stop', deliveryDepartureGameMinute: null,
              }
              return item
            }))
            return
          }

          setLoads((current) => current.map((item) => {
            if (liveLoad && item.id === liveLoad.id && item.id !== nextLoad.id && ['loaded','en-route-delivery','onboard-hold'].includes(item.tripStatus)) return {
              ...item, tripStatus: 'onboard-hold', status: 'onboard', waitingReason: 'itinerary-next-stop', deliveryDepartureGameMinute: null,
            }
            if (item.id !== nextLoad.id) return item
            if (nextStop.type === 'pickup') return {
              ...item, tripStatus: 'en-route-pickup', status: 'en-route-pickup', queuePosition: 0,
              plannedDeadheadMiles: route.distanceMiles, plannedDeadheadDriveTimeMinutes: route.durationMinutes,
              plannedDeadheadRouteGeometry: geometry, plannedDeadheadRouteSource: route.source,
              departureGameMinute: now, pickupArrivalGameMinute: null, plannedPickupDepartureGameMinute: null, waitingReason: null,
            }
            return {
              ...item, tripStatus: 'en-route-delivery', status: 'en-route-delivery',
              plannedLoadedMiles: route.distanceMiles, plannedLoadedDriveTimeMinutes: route.durationMinutes,
              plannedLoadedRouteGeometry: geometry, plannedLoadedRouteSource: route.source,
              deliveryDepartureGameMinute: now, waitingReason: null,
            }
          }))
          setDrivers((current) => current.map((item) => item.id === driver.id ? {
            ...item, assignedLoadId: nextLoad.id, queuedLoadIds: (item.queuedLoadIds || []).filter((id) => id !== nextLoad.id),
          } : item))
          setDriverRuntimeProgress(driver.id, 0)
        } catch (error) {
          // Do not restore the old delivery as movement authority. The itinerary
          // remains correct even if road geometry is temporarily unavailable.
          console.error('DOC OS AUTHORITATIVE ITINERARY ROUTE FAILED', error)
        } finally {
          const activeSync = itineraryMovementSyncRef.current.get(driver.id)
          if (activeSync?.token === token) itineraryMovementSyncRef.current.delete(driver.id)
        }
      })()
    })
  }, [gameTime, loads, drivers, runtimePositions, pendingLoadingHandoff])

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
      alertClass: 'info',
      tone: 'success',
      title: `${mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || getFreightRouteName(load)} · COMPLETE`,
      detail: 'Load closed successfully. Tap to view results.',
      value: 'VIEW RESULTS',
      action: 'load-result',
      loadId: load.id,
    })),
    ...driverLunchAlerts,
    ...driverCommunicationAlerts,
    ...driverOperationAlerts,
    ...(podNotificationCount > 0 ? [{
      id: 'pod-review',
      alertClass: 'action',
      tone: 'attention',
      title: 'DOCUMENTS',
      detail: podNotificationCount === 1 ? '1 POD ready for review.' : `${podNotificationCount} PODs ready for review.`,
      value: podNotificationCount === 1 ? '1 READY' : `${podNotificationCount} READY`,
      action: 'documents',
    }] : []),
    ...(ledgerNotificationCount > 0 ? [{
      id: 'ledgerdesk',
      alertClass: 'info',
      tone: 'success',
      title: 'LEDGERDESK',
      detail: ledgerNotificationCount === 1 ? '1 payment or receivable update.' : `${ledgerNotificationCount} payment or receivable updates.`,
      value: ledgerNotificationCount === 1 ? '1 UPDATE' : `${ledgerNotificationCount} UPDATES`,
      action: 'ledger',
    }] : []),
  ].sort((a, b) => {
    const priority = (item) => {
      if (item?.alertClass === 'urgent') return 0
      if (item?.alertClass === 'action' || ['driver', 'messages', 'plan-pickup', 'plan-delivery', 'pickup', 'delivery', 'facility'].includes(item?.action)) return 1
      if (['documents', 'ledger'].includes(item?.action)) return 2
      return 3
    }
    return priority(a) - priority(b)
  })
  // The badge is a true aggregate count: every unresolved actionable item counts.
  const operationsNotificationCount = operationNotifications.filter((item) => ['action', 'urgent'].includes(item.alertClass)).length

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
    if (!assignedLoad || isGameClockPaused || assignedDriverOnLunch) return
    if (['checked-in-pickup', 'checked-in-delivery', 'pickup-issue'].includes(assignedLoad.tripStatus) && simulationSpeed > 1) {
      setSimulationSpeed(1)
    }
  }, [assignedLoad?.tripStatus, assignedDriverOnLunch, isGameClockPaused, setSimulationSpeed, simulationSpeed])

  // AW1.6.11: Facility challenges are explicit player-owned workflows.
  // Once loading/unloading begins, freeze the simulation so itinerary reconciliation
  // cannot advance the load out from under the minigame.
  useEffect(() => {
    // CS2.0A.12.1 — do not auto-resume the pickup challenge while Confirm Load
    // is performing its two-phase handoff. Without this guard, the challenge
    // closes, this earlier effect sees the still-transitional loading state,
    // and immediately mounts a brand-new challenge before the handoff commits.
    if (pendingLoadingHandoff) return
    const interruptedLoading = loads.find((load) => load.tripStatus === 'loading-at-pickup' && load.assignedDriverId)
    if (!interruptedLoading || loadingChallengeLoadId) return
    loadingPauseWasAlreadyPausedRef.current = isGameClockPaused
    if (simulationSpeed !== 1) setSimulationSpeed(1)
    setGameClockPaused(true)
    setLoadingChallengeLoadId(interruptedLoading.id)
  }, [loads, loadingChallengeLoadId, pendingLoadingHandoff, isGameClockPaused, setGameClockPaused, setSimulationSpeed, simulationSpeed])

  useEffect(() => {
    const interruptedUnload = loads.find((load) => load.tripStatus === 'unloading-delivery' && load.assignedDriverId)
    if (!interruptedUnload || unloadSequenceLoadId) return
    unloadingPauseWasAlreadyPausedRef.current = isGameClockPaused
    if (simulationSpeed !== 1) setSimulationSpeed(1)
    setGameClockPaused(true)
    setUnloadSequenceLoadId(interruptedUnload.id)
  }, [loads, unloadSequenceLoadId, isGameClockPaused, setGameClockPaused, setSimulationSpeed, simulationSpeed])

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

  const addLoadToSchedule = async (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    const eligible = drivers.filter((driver) => driver.carrierId)
    if (!load || !eligible.length) return false
    // AV2.9: with one eligible driver, DOC OS evaluates the schedule automatically.
    // Driver selection only returns when there is an actual staffing decision.
    const driver = eligible.length === 1 ? eligible[0] : eligible[0]
    const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
    const projection = getProjectedDriverOrigin({ driver, loads, runtimePositions, gameTime })
    const activeLoad = getDriverActiveLoad(loads, driver.id)
    const nowAbsolute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const activePickup = activeLoad ? mapLocations.find((location) => location.id === activeLoad.pickupLocationId) : null
    const activeDelivery = activeLoad ? mapLocations.find((location) => location.id === activeLoad.deliveryLocationId) : null
    const insertionEligibleStatuses = new Set(['en-route-pickup', 'at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup', 'loaded', 'onboard-hold', 'en-route-delivery'])
    const canConsiderInsertion = Boolean(activeLoad && insertionEligibleStatuses.has(activeLoad.tripStatus) && activePickup && activeDelivery)
    const pickupWindowStartAbsolute = activeLoad ? (activeLoad.pickupDayIndex || 0) * 1440 + (activeLoad.pickupWindowStartMinutes || 0) : nowAbsolute
    const remainingDeadhead = activeLoad?.tripStatus === 'en-route-pickup' && Number.isFinite(activeLoad.departureGameMinute) && Number.isFinite(activeLoad.plannedDeadheadDriveTimeMinutes)
      ? Math.max(0, activeLoad.departureGameMinute + activeLoad.plannedDeadheadDriveTimeMinutes - nowAbsolute)
      : 0
    const projectedActivePickupArrival = Math.max(nowAbsolute + remainingDeadhead, pickupWindowStartAbsolute)
    const pickupAlreadyComplete = ['loaded', 'onboard-hold', 'en-route-delivery'].includes(activeLoad?.tripStatus)
    const projectedPickupServiceMinutes = activeLoad?.tripStatus === 'loading-at-pickup' ? 20 : pickupAlreadyComplete ? 0 : 35
    // AV2.10.7: once freight is onboard, a new compatible pickup may divert the driver
    // from a later delivery. Use the truck's live position and current game minute rather
    // than pretending the driver must continue to the receiver first.
    const insertionAvailableAbsolute = pickupAlreadyComplete
      ? nowAbsolute
      : Math.max(nowAbsolute, projectedActivePickupArrival + projectedPickupServiceMinutes)
    const insertionOrigin = pickupAlreadyComplete ? (runtimePositions[driver.id] || activePickup) : activePickup
    if (!pickup || !delivery || (!projection.location && !insertionOrigin)) return false
    try {
      let insertionPlan = null
      let deadhead
      let loaded
      let arrivalAbsolute
      if (canConsiderInsertion) {
        const [toPickup, candidateLoaded, pickupToAnchorDelivery] = await Promise.all([
          calculateRoute(insertionOrigin, pickup),
          calculateRoute(pickup, delivery),
          calculateRoute(pickup, activeDelivery),
        ])
        const pickupStart = load.pickupDayIndex * 1440 + load.pickupWindowStartMinutes
        const pickupEnd = load.pickupDayIndex * 1440 + load.pickupWindowEndMinutes
        const candidatePickupArrival = Math.max(insertionAvailableAbsolute + toPickup.durationMinutes, pickupStart)
        const candidateServiceReserveMinutes = 35
        const anchorDeliveryEnd = getWindowEndAbsolute(activeLoad.deliveryDayIndex, activeLoad.deliveryWindowStartMinutes, activeLoad.deliveryWindowEndMinutes)
        const anchorDeliveryArrival = candidatePickupArrival + candidateServiceReserveMinutes + pickupToAnchorDelivery.durationMinutes
        if (candidatePickupArrival <= pickupEnd && anchorDeliveryArrival <= anchorDeliveryEnd) {
          const anchorRef = getFreightRouteName(activeLoad)
          insertionPlan = {
            type: 'pickup-before-delivery',
            anchorLoadId: activeLoad.id,
            anchorLoadRef: anchorRef,
            status: anchorDeliveryEnd - anchorDeliveryArrival <= 30 ? 'TIGHT' : 'GOOD',
            summary: `${Math.round(toPickup.durationMinutes)} min to pickup · ${candidateServiceReserveMinutes} min service reserve · ${Math.round(anchorDeliveryEnd - anchorDeliveryArrival)} min delivery buffer preserved`,
            sequenceLabel: `PICKUP ${anchorRef} → PICKUP ${getFreightRouteName(load)} → DELIVER ${anchorRef} → DELIVER ${getFreightRouteName(load)}`,
            sequenceSteps: [
              { action: 'PICKUP', loadRef: anchorRef, loadId: activeLoad.id },
              { action: 'PICKUP', loadRef: getFreightRouteName(load), loadId: load.id },
              { action: 'DELIVERY', loadRef: anchorRef, loadId: activeLoad.id },
              { action: 'DELIVERY', loadRef: getFreightRouteName(load), loadId: load.id },
            ],
            provisional: !['loaded', 'onboard-hold', 'en-route-delivery'].includes(activeLoad.tripStatus),
            serviceReserveMinutes: candidateServiceReserveMinutes,
            detourClass: toPickup.durationMinutes <= 20 ? 'ON ROUTE' : toPickup.durationMinutes <= 45 ? 'MINOR DETOUR' : 'MAJOR DETOUR',
            detourMinutes: Math.round(toPickup.durationMinutes),
          }
          deadhead = toPickup
          loaded = candidateLoaded
          arrivalAbsolute = candidatePickupArrival
        }
      }
      if (!deadhead) {
        deadhead = await calculateRoute(projection.location, pickup)
        loaded = await calculateRoute(pickup, delivery)
        arrivalAbsolute = projection.availableAbsoluteMinute + deadhead.durationMinutes
      }
      const pickupEnd = load.pickupDayIndex * 1440 + load.pickupWindowEndMinutes
      const buffer = pickupEnd - arrivalAbsolute
      const status = buffer < 0 ? 'AT RISK' : buffer <= 30 ? 'TIGHT' : 'GOOD'
      const fit = {
        miles: deadhead.distanceMiles, minutes: deadhead.durationMinutes, routeShape: deadhead.routeShape, routeSource: deadhead.source,
        arrivalDay: Math.floor(arrivalAbsolute / 1440), arrivalMinutes: arrivalAbsolute % 1440, status,
        projectedOriginName: insertionPlan ? activePickup?.name || 'Current stop' : projection.location?.name || null,
        afterLoadId: insertionPlan?.anchorLoadId || projection.afterLoadId || null, queueLength: projection.queueLength || 0,
        insertionPlan,
        loadedLeg: loaded,
      }
      startEvaluation(loadId, driver.id, fit)
      return true
    } catch (error) {
      console.error('AV2.9 schedule evaluation failed', error)
      return false
    }
  }

  const startEvaluation = (loadId, driverId, fit) => {
    const selectedDriver = drivers.find((driver) => driver.id === driverId)
    if (!selectedDriver || !fit) return false

    // AV2.8: selecting a driver creates one provisional Trip Plan.
    // Freight remains unbooked until carrier approval (when required) and BOOK LOAD.
    // The route work is preserved so the player never has to re-plan the same trip.
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
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
        projectedOriginName: fit.projectedOriginName || null,
        afterLoadId: fit.afterLoadId || null,
        queueLength: fit.queueLength || 0,
        insertionPlan: fit.insertionPlan || null,
      },
      tripPlan: {
        status: 'provisional',
        driverId,
        createdGameMinute: now,
        projectedAfterLoadId: fit.afterLoadId || null,
        insertionPlan: fit.insertionPlan || null,
        legs: {
          deadhead: {
            miles: fit.miles,
            minutes: fit.minutes,
            routeGeometry: fit.routeShape || null,
            routeSource: fit.routeSource || 'recommended',
          },
          loaded: fit.loadedLeg ? {
            miles: fit.loadedLeg.distanceMiles,
            minutes: fit.loadedLeg.durationMinutes,
            routeGeometry: fit.loadedLeg.routeShape || null,
            routeSource: fit.loadedLeg.source || 'recommended',
          } : null,
        },
      },
    } : load))
    return true
  }

  const acceptCandidateAssignment = (loadId) => {
    const currentLoad = loads.find((item) => item.id === loadId)
    const driverId = currentLoad?.candidateDriverId
    if (!currentLoad || currentLoad.status !== 'available' || !currentLoad.driverFitVerified || !driverId) return false
    const selectedDriver = drivers.find((driver) => driver.id === driverId)
    if (!selectedDriver || isDriverOnLunch(selectedDriver, gameTime)) return false
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
        itineraryInsertion: load.tripPlan?.insertionPlan || load.assignmentProjection?.insertionPlan || null,
        scheduleApprovalQueued: false,
        tripPlan: load.tripPlan ? { ...load.tripPlan, status: 'booked', bookedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay } : load.tripPlan,
        planningStatus: load.tripPlan?.legs?.deadhead?.routeGeometry ? 'route-ready' : null,
        plannedDeadheadMiles: load.tripPlan?.legs?.deadhead?.miles ?? load.plannedDeadheadMiles ?? null,
        plannedDeadheadDriveTimeMinutes: load.tripPlan?.legs?.deadhead?.minutes ?? load.plannedDeadheadDriveTimeMinutes ?? null,
        plannedDeadheadRouteGeometry: load.tripPlan?.legs?.deadhead?.routeGeometry ?? load.plannedDeadheadRouteGeometry ?? null,
        plannedDeadheadRouteSource: load.tripPlan?.legs?.deadhead?.routeSource ?? load.plannedDeadheadRouteSource ?? null,
        selectedDeadheadRouteId: load.tripPlan?.legs?.deadhead?.routeGeometry ? 'recommended' : load.selectedDeadheadRouteId ?? null,
        deliveryPlanningStatus: load.tripPlan?.legs?.loaded?.routeGeometry ? 'route-ready' : null,
        plannedLoadedMiles: load.tripPlan?.legs?.loaded?.miles ?? load.plannedLoadedMiles ?? null,
        plannedLoadedDriveTimeMinutes: load.tripPlan?.legs?.loaded?.minutes ?? load.plannedLoadedDriveTimeMinutes ?? null,
        plannedLoadedRouteGeometry: load.tripPlan?.legs?.loaded?.routeGeometry ?? load.plannedLoadedRouteGeometry ?? null,
        plannedLoadedRouteSource: load.tripPlan?.legs?.loaded?.routeSource ?? load.plannedLoadedRouteSource ?? null,
        selectedLoadedRouteId: load.tripPlan?.legs?.loaded?.routeGeometry ? 'recommended' : load.selectedLoadedRouteId ?? null,
        loadingChallengeState: null,
        unloadChallengeState: null,
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
    const fitStatus = String(currentLoad.assignmentProjection?.status || '').toUpperCase()
    const deadheadMiles = Number(currentLoad.assignmentProjection?.deadheadMiles)
    const queued = Boolean(existingActive)
    const relationshipDelta = fitStatus.includes('AT RISK') ? -2 : fitStatus.includes('TIGHT') ? 0 : (queued && Number.isFinite(deadheadMiles) && deadheadMiles <= 15 ? 2 : 1)
    adjustDriverRelationship(driverId, relationshipDelta, `assignment-quality:${loadId}`)
    return true
  }

  const launchLoadingChallenge = (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load || !['waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'].includes(load.tripStatus)) return false
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (loadingChallengeLoadId !== loadId) loadingPauseWasAlreadyPausedRef.current = isGameClockPaused
    if (simulationSpeed !== 1) setSimulationSpeed(1)
    setGameClockPaused(true)
    setLoads((current) => current.map((item) => item.id === loadId ? {
      ...item,
      tripStatus: 'loading-at-pickup',
      loadingStartGameMinute: Number.isFinite(item.loadingStartGameMinute) ? item.loadingStartGameMinute : now,
    } : item))
    setLoadingChallengeLoadId(loadId)
    return true
  }

  const launchUnloadingChallenge = (loadId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load || !['waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery'].includes(load.tripStatus)) return false
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (unloadSequenceLoadId !== loadId) unloadingPauseWasAlreadyPausedRef.current = isGameClockPaused
    if (simulationSpeed !== 1) setSimulationSpeed(1)
    setGameClockPaused(true)
    setLoads((current) => current.map((item) => item.id === loadId ? {
      ...item,
      tripStatus: 'unloading-delivery',
      deliveryUnloadStartGameMinute: Number.isFinite(item.deliveryUnloadStartGameMinute) ? item.deliveryUnloadStartGameMinute : now,
    } : item))
    setUnloadSequenceLoadId(loadId)
    return true
  }

  const handleDriverAction = (actionType, loadId, driverId) => {
    const load = loads.find((item) => item.id === loadId)
    if (!load) return
    const actionDriver = drivers.find((item) => item.id === (driverId || load.assignedDriverId))
    if (actionType !== 'MESSAGE_DRIVER' && isDriverOnLunch(actionDriver, gameTime)) return
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
    else if (actionType === 'BEGIN_UNLOADING') launchUnloadingChallenge(loadId)
    else if (actionType === 'BEGIN_LOADING') launchLoadingChallenge(loadId)
  }

  // CS2.0A.10.3 — Confirm Load is a two-phase handoff.
  // Phase 1 closes the loading UI while the game remains paused. Phase 2 commits
  // pickup completion from a stable map render. This prevents itinerary / movement
  // reconciliation from racing the LoadingChallenge unmount in the same render.
  const completeLoadingChallenge = async (result) => {
    const loadId = loadingChallengeLoadId
    if (!loadId || !result || pendingLoadingHandoff) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const sourceLoad = loads.find((item) => item.id === loadId)
    if (!sourceLoad) return

    setPendingLoadingHandoff({
      loadId,
      result,
      now,
      driverId: sourceLoad.assignedDriverId || null,
      restorePaused: loadingPauseWasAlreadyPausedRef.current,
    })
    // Unmount the minigame first. Keep the simulation paused until the stable
    // handoff effect below has committed shipment truth and the next-stop state.
    setLoadingChallengeLoadId(null)
  }

  useEffect(() => {
    if (!pendingLoadingHandoff || loadingChallengeLoadId) return

    const { loadId, result, now, driverId, restorePaused } = pendingLoadingHandoff
    const sourceLoad = loads.find((item) => item.id === loadId)
    if (!sourceLoad) {
      setPendingLoadingHandoff(null)
      setGameClockPaused(restorePaused)
      return
    }

    const driverName = drivers.find((driver) => driver.id === driverId)?.fullName || 'Driver'
    const hasIssue = Number(result.missingPallets || 0) > 0 || Number(result.damagedPallets || 0) > 0
    const projectedLoads = loads.map((item) => item.id === loadId ? {
      ...item,
      tripStatus: hasIssue ? 'pickup-issue' : 'onboard-hold',
      status: hasIssue ? item.status : 'onboard',
      loadingStartGameMinute: Number.isFinite(item.loadingStartGameMinute) ? item.loadingStartGameMinute : now,
      pickupLoadingCompleteGameMinute: now,
      plannedDeliveryDepartureGameMinute: null,
      deliveryDepartureGameMinute: null,
      waitingReason: hasIssue ? 'pickup-issue' : 'itinerary-next-stop',
      loadingChallengeState: null,
      facilityOps: { ...(item.facilityOps || {}), pickup: { ...result, completedGameMinute: now } },
      shipment: {
        expectedPallets: result.expectedPallets,
        loadedPallets: result.loadedPallets,
        missingPallets: result.missingPallets,
        damagedPallets: result.damagedPallets || 0,
        misplacedPallets: result.misplacedPallets || 0,
        palletManifest: result.palletManifest || [],
      },
    } : item)

    // Commit one coherent shipment snapshot. Reconciliation is guarded while
    // pendingLoadingHandoff is non-null, so no route can be reassigned mid-commit.
    setLoads(projectedLoads)

    if (hasIssue && driverId && setDriverMessages) {
      const damagedPallets = Number(result.damagedPallets || 0)
      const missingPallets = Number(result.missingPallets || 0)
      setDriverMessages((current) => current.some((message) => message.id === `pickup-outcome-${loadId}-${now}`) ? current : [...current, {
        id: `pickup-outcome-${loadId}-${now}`,
        driverId,
        sender: driverName,
        senderRole: 'Driver',
        direction: 'inbound',
        loadId,
        body: getPickupExceptionMessage({ damagedPallets, missingPallets }),
        messageIntent: 'pickup-exception',
        requiresResponse: true,
        receivedGameMinute: now + 0.01,
        read: false,
      }])
    }

    if (!hasIssue && driverId) setDriverRuntimeProgress(driverId, 0)

    // Clear the guard only after the stable load snapshot has been queued. React
    // batches these updates into the next render; reconciliation then sees the
    // completed pickup, with the loading overlay already gone.
    // Keep the challenge closed as shipment truth becomes authoritative. This is
    // intentionally redundant with Phase 1 so a stale interrupted-loading effect
    // can never leave the overlay mounted after confirmation.
    setLoadingChallengeLoadId(null)
    setPendingLoadingHandoff(null)
    setGameClockPaused(restorePaused)
  }, [pendingLoadingHandoff, loadingChallengeLoadId, loads, drivers, setDriverMessages, setLoads, setGameClockPaused])

  const completeUnloadSequence = async (result) => {
    const loadId = unloadSequenceLoadId
    if (!loadId || !result) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const completeMinute = now
    const deliveredLoad = loads.find((item) => item.id === loadId)
    const releasedDriverId = deliveredLoad?.assignedDriverId
    const onboardNext = releasedDriverId ? getDriverOnboardLoads(loads, releasedDriverId).find((item) => item.id !== loadId) || null : null
    const nextQueued = releasedDriverId && !onboardNext ? getDriverQueue(loads, releasedDriverId)[0] || null : null
    const delivery = mapLocations.find((location) => location.id === deliveredLoad?.deliveryLocationId)
    const nextPickup = nextQueued ? mapLocations.find((location) => location.id === nextQueued.pickupLocationId) : null
    const nextWasBriefed = Number.isFinite(nextQueued?.pickupDriverBriefedGameMinute) && Number.isFinite(nextQueued?.driverAcknowledgedGameMinute)
    // CS2.0B.4.2.4.1: a communicated schedule is not movement authority outside
    // the driver's scheduled workday. This is especially important after a
    // cross-midnight delivery: the next morning's pickup may already be known,
    // but overnight staging owns repositioning until the next shift begins.
    const releasedDriver = drivers.find((driver) => driver.id === releasedDriverId) || null
    const currentWorkday = releasedDriver?.workdayByDay?.[String(gameTime.gameDayIndex)] || releasedDriver?.workdayByDay?.[gameTime.gameDayIndex] || null
    const currentWorkdayStart = Number(currentWorkday?.startMinutes)
    const currentWorkdayEnd = Number(currentWorkday?.endMinutes)
    const currentWorkdayEndOffset = Number.isFinite(Number(currentWorkday?.endDayOffset))
      ? Number(currentWorkday.endDayOffset)
      : (Number.isFinite(currentWorkdayStart) && Number.isFinite(currentWorkdayEnd) && currentWorkdayEnd <= currentWorkdayStart ? 1 : 0)
    const currentWorkdayStartAbsolute = gameTime.gameDayIndex * 1440 + currentWorkdayStart
    const currentWorkdayEndAbsolute = gameTime.gameDayIndex * 1440 + currentWorkdayEnd + currentWorkdayEndOffset * 1440
    const withinCurrentWorkday = Number.isFinite(currentWorkdayStart) && Number.isFinite(currentWorkdayEnd) && now >= currentWorkdayStartAbsolute && now < currentWorkdayEndAbsolute
    const nextPickupIsCurrentOrEarlierDay = !Number.isFinite(Number(nextQueued?.pickupDayIndex)) || Number(nextQueued.pickupDayIndex) <= gameTime.gameDayIndex
    const nextCanAutoHandoff = Boolean(nextQueued && nextWasBriefed && withinCurrentWorkday && nextPickupIsCurrentOrEarlierDay)

    // Close the delivered load and promote the queued load without departing yet.
    // AV2.9.6 recalculates the deadhead from the driver's ACTUAL receiver position
    // before movement begins. This prevents a queued projection from ever teleporting
    // the driver to the next pickup when the prior delivery completes.
    setLoads((current) => {
      const updated = current.map((item) => {
        if (item.id !== loadId) return item

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
        const podPiecesReceived = missingPallets > 0 ? piecesExpected : piecesReceived
        const podDamageLabel = damagedPallets > 0 ? 'None' : damageLabel

        return {
          ...item,
          tripStatus: 'awaiting-pod',
          status: 'delivered',
          completedDriverId: releasedDriverId || item.completedDriverId || null,
          assignedDriverId: null,
          queuePosition: null,
          driverReleasedGameMinute: completeMinute,
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
      })
      if (releasedDriverId && onboardNext) return updated
      return releasedDriverId ? promoteNextQueuedLoad(updated, releasedDriverId, null).loads : updated
    })

    if (!releasedDriverId) setUnloadSequenceLoadId(null)
    if (releasedDriverId && Number(result.wrongMoves || 0) > 0) {
      const releasedDriver = drivers.find((driver) => driver.id === releasedDriverId)
      setDriverMessages?.((current) => [...current, {
        id: `unload-exception-${loadId}-${now}`,
        driverId: releasedDriverId,
        sender: releasedDriver?.fullName || releasedDriver?.name || 'Driver',
        senderRole: 'Driver',
        direction: 'inbound',
        loadId,
        body: getUnloadExceptionMessage({ wrongMoves: result.wrongMoves, delayMinutes: result.unloadingDelayMinutes }),
        messageIntent: 'unload-exception',
        requiresResponse: false,
        receivedGameMinute: now + 0.005,
        read: false,
      }])
    }
    if (releasedDriverId) {
      setDrivers((current) => current.map((driver) => driver.id === releasedDriverId ? {
        ...driver,
        status: onboardNext || nextQueued ? 'unavailable' : 'available',
        assignedLoadId: onboardNext?.id || nextQueued?.id || null,
        queuedLoadIds: (driver.queuedLoadIds || []).filter((id) => id !== nextQueued?.id),
        longitude: delivery?.longitude ?? driver.longitude,
        latitude: delivery?.latitude ?? driver.latitude,
        lastKnownLocationId: deliveredLoad?.deliveryLocationId || driver.lastKnownLocationId,
      } : driver))
      if (delivery) setRuntimePositions((current) => ({ ...current, [releasedDriverId]: { longitude: delivery.longitude, latitude: delivery.latitude } }))
      setDriverRuntimeProgress(releasedDriverId, 0)
      setUnloadSequenceLoadId(null)

      if (onboardNext && delivery) {
        const onboardDelivery = mapLocations.find((location) => location.id === onboardNext.deliveryLocationId)
        if (onboardDelivery) {
          try {
            const route = await calculateRoute(delivery, onboardDelivery)
            const geometry = normalizeRouteGeometry(route.routeShape, delivery, onboardDelivery)
            setLoads((current) => current.map((item) => item.id === onboardNext.id ? {
              ...item,
              tripStatus: 'en-route-delivery', status: 'en-route-delivery', waitingReason: null,
              plannedLoadedMiles: route.distanceMiles, plannedLoadedDriveTimeMinutes: route.durationMinutes,
              plannedLoadedRouteGeometry: geometry, plannedLoadedRouteSource: route.source,
              deliveryDepartureGameMinute: completeMinute,
            } : item))
            setDriverRuntimeProgress(releasedDriverId, 0)
            const releasedDriver = drivers.find((driver) => driver.id === releasedDriverId)
            const onboardDeliveryName = getFreightBusinessName(onboardNext, 'delivery') || onboardDelivery.name || 'the receiver'
            setDriverMessages?.((current) => [...current, {
              id: `multistop-delivery-${loadId}-${now}`, driverId: releasedDriverId, sender: releasedDriver?.fullName || 'Driver', senderRole: 'Driver', direction: 'inbound', loadId: onboardNext.id,
              body: getDepartureMessage({ driver: releasedDriver, load: onboardNext, phase: 'delivery', facilityName: onboardDeliveryName, operationDay }), messageIntent: 'major-departure', phase: 'delivery', requiresResponse: false,
              receivedGameMinute: now + 0.01, read: false,
            }])
          } catch (error) { console.error('DOC OS ONBOARD DELIVERY HANDOFF FAILED', error) }
        }
      } else if (nextQueued && nextCanAutoHandoff && delivery && nextPickup) {
        try {
          const handoffRoute = await calculateRoute(delivery, nextPickup)
          const routeGeometry = normalizeRouteGeometry(handoffRoute.routeShape, delivery, nextPickup)
          setLoads((current) => current.map((item) => item.id === nextQueued.id ? {
            ...item,
            tripStatus: 'en-route-pickup',
            status: 'en-route-pickup',
            planningStatus: Array.isArray(routeGeometry) && routeGeometry.length >= 2 ? 'route-ready' : item.planningStatus,
            plannedDeadheadMiles: handoffRoute.distanceMiles,
            plannedDeadheadDriveTimeMinutes: handoffRoute.durationMinutes,
            plannedDeadheadRouteGeometry: routeGeometry,
            plannedDeadheadRouteSource: handoffRoute.source,
            selectedDeadheadRouteId: Array.isArray(routeGeometry) && routeGeometry.length >= 2 ? 'handoff-road' : item.selectedDeadheadRouteId,
            departureGameMinute: completeMinute,
            pickupArrivalGameMinute: null,
          } : item))
          setDriverRuntimeProgress(releasedDriverId, 0)
          const releasedDriver = drivers.find((driver) => driver.id === releasedDriverId)
          const nextPickupName = getFreightBusinessName(nextQueued, 'pickup') || nextPickup.name || 'the next pickup'
          setDriverMessages?.((current) => [...current, {
            id: `delivery-release-${loadId}-${now}`, driverId: releasedDriverId, sender: releasedDriver?.fullName || 'Driver', senderRole: 'Driver', direction: 'inbound', loadId: nextQueued.id,
            body: getDepartureMessage({ driver: releasedDriver, load: nextQueued, phase: 'pickup', facilityName: nextPickupName, operationDay }), messageIntent: 'major-departure', phase: 'pickup', requiresResponse: false,
            receivedGameMinute: now + 0.01, read: false,
          }])
        } catch (error) {
          console.error('DOC OS NEXT-LOAD HANDOFF ROUTE FAILED', error)
          // Routing failure is a system concern, not a reason for the driver to ask
          // dispatch what comes next when the schedule is already known.
        }
      }
    }
    setGameClockPaused(unloadingPauseWasAlreadyPausedRef.current)
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

  const removeScheduleLoad = (loadId) => {
    const target = loads.find((item) => item.id === loadId)
    if (!target) return false
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const targetDriverId = target.assignedDriverId || target.candidateDriverId || null
    const preMovementBooked = target.status !== 'available' && ['queued', 'assigned'].includes(target.tripStatus) && !Number.isFinite(target.departureGameMinute) && !Number.isFinite(target.pickupArrivalGameMinute)

    // Planned / approval-stage work returns to FreightLink cleanly. Pending approval is
    // explicitly marked withdrawn so a late carrier reply cannot resurrect the route.
    if (target.status === 'available') {
      setLoads((current) => current.map((item) => item.id === loadId ? {
        ...item,
        candidateDriverId: null,
        driverFitVerified: false,
        scheduleApprovalQueued: false,
        carrierApprovalStatus: null,
        carrierApprovalRequestedGameMinute: null,
        carrierApprovalEmailId: null,
        approvalWithdrawnGameMinute: now,
      } : item))
      return true
    }

    if (!preMovementBooked) return false

    // CS2.0A.13 — booked / communicated work may be revised until the truck actually
    // begins the leg. Remove the route from the live itinerary and driver queue in one
    // transaction, then promote the next queued route to READY rather than leaving a
    // dangling assignedLoadId behind.
    const remainingForDriver = loads
      .filter((item) => item.id !== loadId && item.assignedDriverId === targetDriverId && !['completed', 'delivered'].includes(item.tripStatus))
      .sort((a, b) => {
        const aq = Number.isFinite(a.queuePosition) ? a.queuePosition : Number.POSITIVE_INFINITY
        const bq = Number.isFinite(b.queuePosition) ? b.queuePosition : Number.POSITIVE_INFINITY
        if (aq !== bq) return aq - bq
        const as = Number.isFinite(a.scheduleOrderIndex) ? a.scheduleOrderIndex : Number.POSITIVE_INFINITY
        const bs = Number.isFinite(b.scheduleOrderIndex) ? b.scheduleOrderIndex : Number.POSITIVE_INFINITY
        if (as !== bs) return as - bs
        return ((a.pickupDayIndex || 0) * 1440 + (a.pickupWindowStartMinutes || 0)) - ((b.pickupDayIndex || 0) * 1440 + (b.pickupWindowStartMinutes || 0))
      })
    const nextLoad = target.tripStatus === 'assigned' ? remainingForDriver[0] || null : null

    setLoads((current) => current.map((item) => {
      if (item.id === loadId) return {
        ...item,
        status: 'available',
        tripStatus: null,
        assignedDriverId: null,
        candidateDriverId: null,
        driverFitVerified: false,
        queuePosition: null,
        scheduleOrderIndex: null,
        scheduleBookedGameMinute: null,
        scheduleApprovalQueued: false,
        carrierApprovalStatus: null,
        carrierApprovalRequestedGameMinute: null,
        carrierApprovalEmailId: null,
        pickupDriverBriefedGameMinute: null,
        pickupDriverBriefedLoadId: null,
        driverAcknowledgedGameMinute: null,
        scheduleCommunicatedGameMinute: null,
        departureGameMinute: null,
        pickupArrivalGameMinute: null,
        deliveryDepartureGameMinute: null,
        deliveryArrivalGameMinute: null,
        waitingReason: null,
      }
      if (nextLoad && item.id === nextLoad.id && item.tripStatus === 'queued') return {
        ...item,
        status: 'assigned',
        tripStatus: 'assigned',
        queuePosition: 0,
      }
      return item
    }))

    if (targetDriverId) {
      setDrivers((current) => current.map((driver) => {
        if (driver.id !== targetDriverId) return driver
        const queuedLoadIds = (driver.queuedLoadIds || []).filter((id) => id !== loadId && id !== nextLoad?.id)
        if (driver.assignedLoadId === loadId) {
          return {
            ...driver,
            assignedLoadId: nextLoad?.id || null,
            queuedLoadIds,
            status: nextLoad ? 'unavailable' : 'available',
          }
        }
        return { ...driver, queuedLoadIds }
      }))
    }
    return true
  }


  // AV2.14 — the Schedule owns the workday. Messages communicate the plan;
  // they do not advance load state. Send the current itinerary as one natural
  // pre-shift / revised schedule message and remember which loads Marcus has seen.
  const sendDriverSchedule = (driverId) => {
    if (!driverId || !setDriverMessages) return
    const scheduledDriver = drivers.find((item) => item.id === driverId)
    if (isDriverOnLunch(scheduledDriver, gameTime)) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const driver = drivers.find((item) => item.id === driverId)
    const firstName = String(driver?.fullName || driver?.name || 'Driver').split(' ')[0]
    const itinerary = buildDriverItinerary(loads, driverId).filter((stop) => !stop.completed)
    if (!itinerary.length) return
    const seenLoadIds = [...new Set(itinerary.map((stop) => stop.loadId).filter(Boolean))]
    const stopLines = itinerary.slice(0, 8).map((stop) => {
      const load = loads.find((item) => item.id === stop.loadId)
      const place = load ? getFreightBusinessName(load, stop.type) : (stop.locationName || 'the stop')
      const at = Number.isFinite(stop.windowStartAbsolute) ? formatTime(stop.windowStartAbsolute % 1440) : ''
      return `${stop.type === 'pickup' ? 'Pickup' : 'Delivery'} · ${place}${at ? ` · ${at}` : ''}`
    })
    const signature = itinerary.map((stop) => `${stop.loadId}:${stop.type}:${stop.windowStartAbsolute ?? stop.sortMinute ?? ''}`).join('|')
    const currentStops = itinerary.map((stop) => ({ loadId: stop.loadId, type: stop.type, at: stop.windowStartAbsolute ?? stop.sortMinute ?? null }))
    const previousStops = Array.isArray(driver?.lastCommunicatedScheduleStops) ? driver.lastCommunicatedScheduleStops : []
    const isRevision = Boolean(driver?.lastCommunicatedScheduleSignature)
    const previousKeys = new Set(previousStops.map((stop) => `${stop.loadId}:${stop.type}:${stop.at ?? ''}`))
    const currentKeys = new Set(currentStops.map((stop) => `${stop.loadId}:${stop.type}:${stop.at ?? ''}`))
    const addedStops = itinerary.filter((stop) => !previousKeys.has(`${stop.loadId}:${stop.type}:${stop.windowStartAbsolute ?? stop.sortMinute ?? ''}`))
    const removedStops = previousStops.filter((stop) => !currentKeys.has(`${stop.loadId}:${stop.type}:${stop.at ?? ''}`))
    let outboundBody = `Here’s today’s schedule:\n${stopLines.join('\n')}`
    if (isRevision) {
      const changes = []
      addedStops.forEach((stop) => { const load = loads.find((item) => item.id === stop.loadId); const place = load ? getFreightBusinessName(load, stop.type) : 'the stop'; changes.push(`Added ${stop.type} · ${place}${Number.isFinite(stop.windowStartAbsolute) ? ` · ${formatTime(stop.windowStartAbsolute % 1440)}` : ''}`) })
      removedStops.forEach((stop) => { const load = loads.find((item) => item.id === stop.loadId); const place = load ? getFreightBusinessName(load, stop.type) : 'that stop'; changes.push(`Removed ${stop.type} · ${place}`) })
      outboundBody = `Quick update — ${changes.length ? changes.join('\n') : 'the timing changed on today’s schedule.'}`
    }
    const replyBody = getScheduleAcknowledgement(driver, operationDay, isRevision)
    const token = `${now}-${Math.random().toString(36).slice(2, 8)}`
    setDriverMessages((current) => [...current,
      { id: `schedule-out-${driverId}-${token}`, driverId, sender: 'You', senderRole: 'Coordinator', direction: 'outbound', body: outboundBody, messageIntent: isRevision ? 'schedule-update' : 'day-schedule', receivedGameMinute: now, read: true },
      { id: `schedule-ack-${driverId}-${token}`, driverId, sender: driver?.fullName || driver?.name || firstName, senderRole: 'Driver', direction: 'inbound', body: replyBody, messageIntent: 'schedule-ack', requiresResponse: false, receivedGameMinute: now + 0.01, read: false },
    ])
    const seen = new Set(seenLoadIds)
    setLoads((current) => current.map((item) => item.assignedDriverId === driverId && seen.has(item.id) ? {
      ...item,
      scheduleCommunicatedGameMinute: now,
      pickupDriverBriefedGameMinute: Number.isFinite(item.pickupDriverBriefedGameMinute) ? item.pickupDriverBriefedGameMinute : now,
      driverAcknowledgedGameMinute: Number.isFinite(item.driverAcknowledgedGameMinute) ? item.driverAcknowledgedGameMinute : now + 0.01,
    } : item))
    setDrivers((current) => current.map((item) => item.id === driverId ? { ...item, lastCommunicatedScheduleSignature: signature, lastCommunicatedScheduleStops: currentStops, scheduleCommunicatedGameMinute: now } : item))
    adjustDriverRelationship(driverId, isRevision ? 0 : 1, `day-schedule:${gameTime.gameDayIndex}:${driverId}`)
  }

  // AV2.17 — one carrier approval request per planned schedule batch.
  // FreightLink only adds fitted freight to the proposed plan; the Schedule is the
  // single place that actually contacts the carrier. One email can cover many loads.
  const requestScheduleApproval = (driverId) => {
    if (!driverId) return false
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const driver = drivers.find((item) => item.id === driverId)
    const carrier = carriers.find((item) => item.id === driver?.carrierId)
    const candidates = loads
      .filter((load) => load.status === 'available' && load.candidateDriverId === driverId && load.scheduleApprovalQueued && !['PENDING','APPROVED'].includes(load.carrierApprovalStatus))
      .sort((a, b) => ((a.pickupDayIndex || 0) * 1440 + (a.pickupWindowStartMinutes || 0)) - ((b.pickupDayIndex || 0) * 1440 + (b.pickupWindowStartMinutes || 0)))
    if (!candidates.length) return false

    const batch = `${now}-${Math.random().toString(36).slice(2, 7)}`
    const messageId = `email-out-schedule-${batch}`
    const firstName = (driver?.fullName || driver?.name || 'Driver').split(' ')[0]
    const lines = candidates.map((load) => `${formatTime(load.pickupWindowStartMinutes)} — ${getFreightBusinessName(load, 'pickup')} → ${getFreightBusinessName(load, 'delivery')}`)
    const email = {
      id: messageId,
      type: 'operational-email',
      direction: 'outbound',
      recipientId: `${carrier?.id || 'metroline'}-operations`,
      recipientLabel: `${carrier?.name || 'Metroline Transport'} · Operations`,
      carrierId: carrier?.id || driver?.carrierId || null,
      subject: `Approval request · ${firstName} · ${candidates.length} load${candidates.length === 1 ? '' : 's'}`,
      bodyOverride: `Morning,\n\nPlease review the following freight for ${firstName}'s planned schedule:\n\n${lines.join('\n')}\n\nDOC OS has checked the schedule fit for the full plan. Please confirm which loads are approved.\n\nThank you.`,
      attachments: candidates.map((load) => ({ id: `load-offer:${load.id}`, type: 'load-offer', title: `${getFreightBusinessName(load, 'pickup')} → ${getFreightBusinessName(load, 'delivery')}`, meta: 'FreightLink offer', loadId: load.id })),
      workflowType: 'carrier-approval',
      workflowValid: true,
      loadId: candidates[0].id,
      loadIds: candidates.map((load) => load.id),
      driverId,
      receivedGameMinute: now,
      responseGameMinute: now + 5,
      read: true,
    }
    setEmailMessages?.((current) => [...current, email])
    const ids = new Set(candidates.map((load) => load.id))
    setLoads((current) => current.map((load) => ids.has(load.id) ? { ...load, carrierApprovalStatus: 'PENDING', carrierApprovalRequestedGameMinute: now, carrierApprovalEmailId: messageId } : load))
    return true
  }

  const bookApprovedScheduleLoads = (driverId) => {
    const bookingDriver = drivers.find((item) => item.id === driverId)
    if (isDriverOnLunch(bookingDriver, gameTime)) return false
    const approvedLoads = loads
      .filter((load) => load.status === 'available' && load.candidateDriverId === driverId && load.driverFitVerified && load.carrierApprovalStatus === 'APPROVED')
      .sort((a, b) => ((a.pickupDayIndex || 0) * 1440 + (a.pickupWindowStartMinutes || 0)) - ((b.pickupDayIndex || 0) * 1440 + (b.pickupWindowStartMinutes || 0)))
    if (!approvedLoads.length) return false

    const approvedIds = new Set(approvedLoads.map((load) => load.id))
    const approvedOrder = new Map(approvedLoads.map((load, index) => [load.id, index]))
    const bookedMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay

    setLoads((current) => {
      const activeAtCommit = getDriverActiveLoad(current, driverId)
      const firstActiveId = activeAtCommit?.id || approvedLoads[0].id
      const existingQueueStart = activeAtCommit ? getNextQueuePosition(current, driverId) : 1

      return current.map((load) => {
        if (!approvedIds.has(load.id) || load.status !== 'available') return load
        const scheduleOrderIndex = approvedOrder.get(load.id) ?? 0
        const isActive = load.id === firstActiveId
        // AW1.6.3: queue order is derived once from the approved Today’s Plan and
        // is never rebuilt from array order while booking. Booking changes state,
        // not sequence.
        const queuePosition = isActive ? 0 : existingQueueStart + (activeAtCommit ? scheduleOrderIndex : Math.max(0, scheduleOrderIndex - 1))
        const nextTripStatus = isActive ? 'assigned' : 'queued'
        return {
          ...load,
          status: nextTripStatus,
          tripStatus: nextTripStatus,
          assignedDriverId: driverId,
          candidateDriverId: null,
          driverFitVerified: true,
          queuePosition,
          scheduleOrderIndex,
          scheduleBookedGameMinute: bookedMinute,
          itineraryInsertion: load.tripPlan?.insertionPlan || load.assignmentProjection?.insertionPlan || null,
          scheduleApprovalQueued: false,
          tripPlan: load.tripPlan ? { ...load.tripPlan, status: 'booked', bookedGameMinute: bookedMinute } : load.tripPlan,
          planningStatus: load.tripPlan?.legs?.deadhead?.routeGeometry ? 'route-ready' : null,
          plannedDeadheadMiles: load.tripPlan?.legs?.deadhead?.miles ?? load.plannedDeadheadMiles ?? null,
          plannedDeadheadDriveTimeMinutes: load.tripPlan?.legs?.deadhead?.minutes ?? load.plannedDeadheadDriveTimeMinutes ?? null,
          plannedDeadheadRouteGeometry: load.tripPlan?.legs?.deadhead?.routeGeometry ?? load.plannedDeadheadRouteGeometry ?? null,
          plannedDeadheadRouteSource: load.tripPlan?.legs?.deadhead?.routeSource ?? load.plannedDeadheadRouteSource ?? null,
          selectedDeadheadRouteId: load.tripPlan?.legs?.deadhead?.routeGeometry ? 'recommended' : load.selectedDeadheadRouteId ?? null,
          deliveryPlanningStatus: load.tripPlan?.legs?.loaded?.routeGeometry ? 'route-ready' : null,
          plannedLoadedMiles: load.tripPlan?.legs?.loaded?.miles ?? load.plannedLoadedMiles ?? null,
          plannedLoadedDriveTimeMinutes: load.tripPlan?.legs?.loaded?.minutes ?? load.plannedLoadedDriveTimeMinutes ?? null,
          plannedLoadedRouteGeometry: load.tripPlan?.legs?.loaded?.routeGeometry ?? load.plannedLoadedRouteGeometry ?? null,
          plannedLoadedRouteSource: load.tripPlan?.legs?.loaded?.routeSource ?? load.plannedLoadedRouteSource ?? null,
          selectedLoadedRouteId: load.tripPlan?.legs?.loaded?.routeGeometry ? 'recommended' : load.selectedLoadedRouteId ?? null,
          loadingChallengeState: null,
          unloadChallengeState: null,
        }
      })
    })

    const existingActive = getDriverActiveLoad(loads, driverId)
    const queueIds = existingActive ? approvedLoads.map((load) => load.id) : approvedLoads.slice(1).map((load) => load.id)
    setDrivers((current) => current.map((driver) => driver.id === driverId ? {
      ...driver,
      status: 'unavailable',
      assignedLoadId: existingActive?.id || approvedLoads[0].id,
      queuedLoadIds: Array.from(new Set([...(driver.queuedLoadIds || []), ...queueIds])),
      idleSinceGameMinute: null,
      idleTargetLocationId: null,
      idleRouteStatus: null,
      idleRouteGeometry: null,
      idleRouteStartGameMinute: null,
      idleRouteDurationMinutes: null,
    } : driver))

    approvedLoads.forEach((load, index) => {
      const fitStatus = String(load.assignmentProjection?.status || '').toUpperCase()
      const deadheadMiles = Number(load.assignmentProjection?.deadheadMiles)
      const queued = Boolean(existingActive) || index > 0
      const relationshipDelta = fitStatus.includes('AT RISK') ? -2 : fitStatus.includes('TIGHT') ? 0 : (queued && Number.isFinite(deadheadMiles) && deadheadMiles <= 15 ? 2 : 1)
      adjustDriverRelationship(driverId, relationshipDelta, `assignment-quality:${load.id}`)
    })
    return true
  }

  const sendDriverLoadUpdate = async (loadId, driverIdArg = null) => {
    const load = loads.find((item) => item.id === loadId)
    const driverId = driverIdArg || load?.assignedDriverId
    if (!load || !driverId || !setDriverMessages) return
    const updateDriver = drivers.find((item) => item.id === driverId)
    if (isDriverOnLunch(updateDriver, gameTime)) return
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    const driver = drivers.find((item) => item.id === driverId)
    const nextStop = getNextActionableDriverStop(loads, driverId)
    const pickupName = getFreightBusinessName(load, 'pickup')
    const deliveryName = getFreightBusinessName(load, 'delivery')
    const body = `Quick update — I added ${pickupName} to today’s schedule. Pickup is ${formatTime(load.pickupWindowStartMinutes)}, then ${deliveryName}.`
    const token = `${now}-${Math.random().toString(36).slice(2, 8)}`
    setDriverMessages((current) => [...current,
      { id: `schedule-change-out-${driverId}-${load.id}-${token}`, driverId, sender: 'You', senderRole: 'Coordinator', direction: 'outbound', loadId: load.id, body, communicationType: 'schedule-change', messageIntent: 'schedule-update', receivedGameMinute: now, read: true },
      { id: `schedule-change-ack-${driverId}-${load.id}-${token}`, driverId, sender: driver?.fullName || driver?.name || 'Driver', senderRole: 'Driver', direction: 'inbound', loadId: load.id, body: getScheduleAcknowledgement(driver, operationDay, true), messageIntent: 'schedule-ack', requiresResponse: false, receivedGameMinute: now + 0.01, read: false },
    ])
    setLoads((current) => current.map((item) => item.id === load.id ? { ...item, scheduleCommunicatedGameMinute: now, pickupDriverBriefedGameMinute: Number.isFinite(item.pickupDriverBriefedGameMinute) ? item.pickupDriverBriefedGameMinute : now, driverAcknowledgedGameMinute: Number.isFinite(item.driverAcknowledgedGameMinute) ? item.driverAcknowledgedGameMinute : now + 0.01 } : item))
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
    const contextLoad = meta?.loadId ? loads.find((item) => item.id === meta.loadId) : null
    const routeLoad = isRouteSend ? contextLoad : null
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
      // System routing failures stay out of human driver conversations.
      return
    }

    const driverName = routeDriver?.fullName || routeDriver?.name || 'Driver'
    const routeFacilityName = isRouteSend ? (getFreightBusinessName(routeLoad, meta.phase) || routeDestination?.name || (meta.phase === 'delivery' ? 'the receiver' : 'the pickup')) : null
    const confirmation = isRouteSend ? {
      id: `driver-route-confirm-${driverId}-${meta.loadId}-${token}`,
      driverId,
      sender: driverName,
      senderRole: 'Driver',
      direction: 'inbound',
      body: getDepartureMessage({ driver: routeDriver, load: routeLoad, phase: meta.phase, facilityName: routeFacilityName, operationDay }),
      messageIntent: 'major-departure',
      phase: meta.phase,
      requiresResponse: false,
      receivedGameMinute: now + 0.01,
      read: false,
      loadId: meta.loadId,
    } : null
    let communicationResponse = null
    if (!isRouteSend && meta?.communication === 'request-eta') {
      const status = contextLoad?.tripStatus || ''
      const departureMinute = status === 'en-route-pickup' ? contextLoad?.departureGameMinute : status === 'en-route-delivery' ? contextLoad?.deliveryDepartureGameMinute : null
      const driveMinutes = status === 'en-route-pickup' ? contextLoad?.plannedDeadheadDriveTimeMinutes : status === 'en-route-delivery' ? contextLoad?.plannedLoadedDriveTimeMinutes : null
      const etaMinute = Number.isFinite(departureMinute) && Number.isFinite(driveMinutes) ? departureMinute + driveMinutes : null
      communicationResponse = {
        id: `driver-eta-response-${driverId}-${meta?.loadId || 'general'}-${token}`,
        driverId,
        sender: driverName,
        senderRole: 'Driver',
        direction: 'inbound',
        loadId: meta?.loadId || null,
        body: Number.isFinite(etaMinute) ? `Right now I’m showing about ${formatTime(etaMinute % 1440)}.` : 'I’ll send you an updated ETA as soon as I’m moving.',
        messageIntent: 'eta-response',
        requiresResponse: false,
        receivedGameMinute: now + 0.01,
        read: false,
      }
    }
    setDriverMessages((current) => {
      const additions = [outbound]
      if (confirmation) additions.push(confirmation)
      if (communicationResponse) additions.push(communicationResponse)
      return [...current, ...additions]
    })
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
    if (action === 'resolve-pickup-issue' && notification?.loadId) {
      const load = loads.find((item) => item.id === notification.loadId)
      const driverId = load?.assignedDriverId
      const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
      if (load && driverId) {
        // AV2.11.2: correcting a pickup exception resolves the facility problem;
        // it does NOT choose that load's delivery. Put the freight onboard, then
        // let the same canonical itinerary authority used by clean pickups decide
        // Marcus's next stop.
        const projectedLoads = loads.map((item) => item.id === load.id ? {
          ...item,
          tripStatus: 'onboard-hold', status: 'onboard', pickupIssueResolvedGameMinute: now,
          deliveryDepartureGameMinute: null, plannedDeliveryDepartureGameMinute: null,
          waitingReason: 'itinerary-next-stop',
        } : item)
        setLoads(projectedLoads)
        setDriverRuntimeProgress(driverId, 0)
        setDriverMessages?.((current) => [...current, {
          id: `pickup-corrected-${load.id}-${now}`, driverId,
          sender: drivers.find((driver) => driver.id === driverId)?.fullName || 'Driver', senderRole: 'Driver', direction: 'inbound', loadId: load.id,
          body: 'They got it corrected. Freight is secure now.', messageIntent: 'exception-resolved', requiresResponse: false,
          receivedGameMinute: now + 0.01, read: false,
        }])
      }
      return
    }
    if (action === 'pickup') {
      const loadId = notification?.loadId || assignedLoad?.id
      const driverId = notification?.driverId || loads.find((item) => item.id === loadId)?.assignedDriverId || assignedLoad?.assignedDriverId
      if (loadId) launchLoadingChallenge(loadId)
      return
    }
    if (action === 'delivery') {
      const loadId = notification?.loadId || assignedLoad?.id
      const driverId = notification?.driverId || loads.find((item) => item.id === loadId)?.assignedDriverId || assignedLoad?.assignedDriverId
      if (loadId) launchUnloadingChallenge(loadId)
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
    if (action === 'lunch-decision') { openLunchDecisionForDriver(notification?.driverId); return }
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
        drivers={drivers}
        onOpenChange={setOperationsOpen}
        onNotificationAction={openOperationNotification}
        onSendSchedule={sendDriverSchedule}
        onRequestScheduleApproval={requestScheduleApproval}
        onBookApprovedSchedule={bookApprovedScheduleLoads}
        onRemoveScheduleLoad={removeScheduleLoad}
        scheduleCommunicationByDriver={Object.fromEntries(drivers.map((driver) => {
          const itinerary = buildDriverItinerary(loads, driver.id).filter((stop) => !stop.completed)
          const signature = itinerary.map((stop) => `${stop.loadId}:${stop.type}:${stop.windowStartAbsolute ?? stop.sortMinute ?? ''}`).join('|')
          return [driver.id, { lastSignature: driver.lastCommunicatedScheduleSignature || '', currentSignature: signature }]
        }))}
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
            onCancel={() => { const loadId = loadingChallengeLoadId; setLoads((current) => current.map((item) => item.id === loadId ? { ...item, tripStatus: 'checked-in-pickup', loadingStartGameMinute: null } : item)); setLoadingChallengeLoadId(null); setGameClockPaused(loadingPauseWasAlreadyPausedRef.current) }}
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
              setGameClockPaused(unloadingPauseWasAlreadyPausedRef.current)
            }}
            onProgress={(state) => { const loadId = unloadSequenceLoadId; if (!loadId) return; setLoads((current) => current.map((item) => item.id === loadId ? { ...item, unloadChallengeState: state } : item)) }}
            onComplete={completeUnloadSequence}
          />
        )}
        <GameMap boardViewRequest={boardViewRequest} driverFocusRequest={driverFocusRequest} driverFocusId={driverFocusId} facilityFocusRequest={facilityFocusRequest} facilityFocusRole={facilityFocusRole} loads={loads} activeRouteGeometry={freightBrowseMode ? freightBrowseRouteGeometry : activeRouteGeometry} routeFocusMode={freightBrowseMode && freightBrowseRouteGeometry ? 'freight-browse' : planningMode || deliveryPlanning ? 'planning' : null} routeReviewLoad={planningLoad || deliveryPlanningLoad} tripStatus={assignedLoad?.tripStatus} drivers={drivers.map((driver) => isDriverOnLunch(driver, gameTime) ? { ...driver, status: 'unavailable' } : driver)} carriers={carriers} runtimePositions={runtimePositions} runtimeProgressByDriver={runtimeProgressByDriver} simulationSpeed={simulationSpeed} isGameClockPaused={isGameClockPaused} assignedLoad={assignedLoad} evaluationLoad={null} isDriverFitEvaluation={false} suppressAttention={Boolean(deliveryPlanning)} gameTime={gameTime} onDriverAction={handleDriverAction} freightBrowseMode={freightBrowseMode} freightBrowseLoads={freightBrowseLoads} freightBrowseSelectedLoadId={freightBrowseLoadId} onFreightBrowseSelect={selectFreightBrowseLoad} />
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
                  <div><span>{getFreightRouteName(freightBrowseLoad)}</span><small>{freightBrowseRouteStatus === 'loading' ? 'CALCULATING ROUTE…' : freightBrowseRouteStatus === 'unavailable' ? 'ROUTE UNAVAILABLE' : `ROUTE ${freightBrowseLoad.listedMiles?.toFixed?.(1) || '—'} MI`}</small></div>
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
                <strong>{getFreightRouteName(loads.find((item) => item.id === deliveryPlanning.loadId))}</strong>
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
                <strong>{getFreightRouteName(loads.find((item) => item.id === planningMode.loadId))}</strong>
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

        {lunchDecisionDriver && lunchDecisionWorkday && lunchDecisionChoices.length > 0 && (
          <LunchDecisionOverlay
            driver={lunchDecisionDriver}
            choices={lunchDecisionChoices}
            gameTime={gameTime}
            onChoose={chooseLunchDecision}
            onClose={closeLunchDecision}
          />
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
                    const nextActionableStop = getNextActionableDriverStop(loads, driver.id)
                    const nextActionableLoad = nextActionableStop ? loads.find((load) => load.id === nextActionableStop.loadId) : null
                    const driverLoad = nextActionableLoad
                      || getDriverActiveLoad(loads, driver.id)
                      || loads.find((load) => load.assignedDriverId === driver.id && !['queued', 'onboard-hold'].includes(load.tripStatus) && !['delivered', 'completed'].includes(load.tripStatus))
                    const driverQueue = getDriverQueue(loads, driver.id)
                    const visibleItinerary = buildDriverItinerary(loads, driver.id).filter((stop) => stop.state !== 'completed')
                    const currentStopIndex = nextActionableStop ? visibleItinerary.findIndex((stop) => stop.id === nextActionableStop.id) : -1
                    // CS2.0A.10.2 — NEXT is a stop, not a load. The old card skipped
                    // same-load delivery stops and then printed the next load's pickup
                    // window even when the actual next stop was a delivery. That made a
                    // correct interleaved itinerary look wrong in the Driver Hub.
                    const followingStop = (currentStopIndex >= 0 ? visibleItinerary.slice(currentStopIndex + 1) : visibleItinerary)[0] || null
                    const projected = getProjectedDriverOrigin({ driver, loads, runtimePositions, gameTime })
                    const driverName = driver.fullName || driver.name || 'Driver'
                    const panel = driverLoad ? getDriverPanelModel({ driver, assignedLoad: driverLoad, gameTime, runtimeProgress: runtimeProgressByDriver?.[driver.id] ?? 0, pickup: mapLocations.find((location) => location.id === driverLoad.pickupLocationId), delivery: mapLocations.find((location) => location.id === driverLoad.deliveryLocationId) }) : null
                    const lunchReady = lunchReadyDriverIds.includes(driver.id)
                    const driverStatus = isDriverOnLunch(driver, gameTime) ? 'ON LUNCH' : lunchReady ? 'LUNCH READY' : (panel?.statusLabel?.toUpperCase() || (driver.status === 'available' ? 'AVAILABLE' : String(driver.status || 'OFF DUTY').replaceAll('-', ' ').toUpperCase()))
                    const nextLoad = followingStop
                      ? loads.find((item) => item.id === followingStop.loadId) || null
                      : driverQueue.find((item) => item.id !== driverLoad?.id) || null
                    const nextStopLocation = followingStop
                      ? mapLocations.find((location) => location.id === followingStop.locationId) || null
                      : null
                    const nextStopRole = followingStop?.type === 'delivery' ? 'DELIVERY' : followingStop?.type === 'pickup' ? 'PICKUP' : null
                    const nextStopWindow = followingStop
                      ? `${formatTime(followingStop.windowStartMinutes)}–${formatTime(followingStop.windowEndMinutes)}`
                      : nextLoad ? `${formatTime(nextLoad.pickupWindowStartMinutes)}–${formatTime(nextLoad.pickupWindowEndMinutes)}` : null
                    const availableLabel = Number.isFinite(projected.availableAbsoluteMinute)
                      ? `${formatCompactDate(Math.floor(projected.availableAbsoluteMinute / 1440))} · ${formatTime(projected.availableAbsoluteMinute % 1440)}`
                      : '—'
                    return (
                      <button
                        type="button"
                        className={`driver-hub-row state-${driverLoad?.tripStatus || driver.status || 'idle'}`}
                        key={driver.id}
                        onClick={() => { if (lunchReady) { openLunchDecisionForDriver(driver.id); return } setExpandedDriverScheduleId((current) => current === driver.id ? null : driver.id); setDriverFocusId(driver.id); setDriverFocusRequest((value) => value + 1) }}
                      >
                        <span className="driver-hub-avatar">{driverName.charAt(0).toUpperCase()}</span>
                        <span className="driver-hub-copy">
                          <strong>{driverName}{driverLoad ? <small> · {getFreightRouteName(driverLoad)}</small> : null}</strong>
                          <span>{driverStatus}</span>
                          {driverLoad ? <small>{getActiveDriverMeta(driverLoad, gameTime, runtimeProgressByDriver?.[driver.id] ?? null)}</small> : null}
                          {nextLoad ? <small>NEXT · {nextStopRole ? `${nextStopRole} · ` : ''}{nextStopLocation?.name || getFreightRouteName(nextLoad)}{nextStopWindow ? ` · ${nextStopWindow}` : ''}</small> : null}
                          <small>AVAILABLE · {availableLabel}</small>
                          {expandedDriverScheduleId === driver.id && <span className="driver-card-full-schedule"><b>TODAY'S SCHEDULE</b>{daySchedule.filter((entry) => entry.driverId === driver.id && !entry.isCompleted).sort((a,b) => (a.sortMinute || 0) - (b.sortMinute || 0)).map((entry) => <span className="driver-card-schedule-stop" key={entry.id}><strong>{entry.pickupName} → {entry.deliveryName}</strong><small>{entry.status} · {formatTime(entry.start)}{Number.isFinite(entry.end) ? `–${formatTime(entry.end)}` : ''}</small></span>)}{!daySchedule.some((entry) => entry.driverId === driver.id && !entry.isCompleted) ? <small>NO ROUTES SCHEDULED</small> : null}</span>}
                          <span className="driver-relationship"><span className="driver-relationship-label"><small>RELATIONSHIP</small><small>{Number(driver.communicationRapport ?? 50) >= 80 ? 'STRONG' : Number(driver.communicationRapport ?? 50) >= 65 ? 'TRUSTED' : Number(driver.communicationRapport ?? 50) >= 45 ? 'PROFESSIONAL' : Number(driver.communicationRapport ?? 50) >= 25 ? 'STRAINED' : 'POOR'}</small></span><span className="driver-relationship-track"><i style={{ width: `${Math.max(4, Math.min(100, Number(driver.communicationRapport ?? 50)))}%` }} /></span></span>
                        </span>
                        <span className={`driver-hub-jump${lunchReady ? ' lunch-ready' : ''}`}>{lunchReady ? 'CHOOSE LUNCH →' : expandedDriverScheduleId === driver.id ? 'COLLAPSE ↑' : 'SCHEDULE ↑'}</span>
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
            <div className="load-result-backdrop" role="dialog" aria-modal="true" aria-label={`${getFreightRouteName(resultLoad)} route result`}>
              <section className="load-result-card load-result-card-v2">
                <header className="load-result-header-v2">
                  <div>
                    <span className="load-result-kicker">ROUTE RESULT</span>
                    <h2>{getFreightRouteName(resultLoad)}</h2>
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
            dispatcherProfile={dispatcherProfile}
            onSaveDispatcherProfile={onSaveDispatcherProfile}
            onActivateCarrier={onActivateCarrier}
            carrierApplicationsById={carrierApplicationsById}
            carrierCareerById={carrierCareerById}
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
            setGameTime={setGameTime}
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
            onSendDriverSchedule={sendDriverSchedule}
            onSendDriverQuickReply={sendDriverQuickReply}
            onPlanDeliveryRoute={(loadId) => { setIsPhoneOpen(false); startDeliveryPlanning(loadId) }}
            onOpenLedger={onOpenLedger}
            ledgerWorkflowByLoadId={ledgerWorkflowByLoadId}
            setLedgerWorkflowByLoadId={setLedgerWorkflowByLoadId}
            onEvaluateFit={startEvaluation} onAddToSchedule={addLoadToSchedule}
            onAcceptCandidateAssignment={acceptCandidateAssignment}
            onPlanTrip={(loadId, driverId) => { setIsPhoneOpen(false); startPlanning(loadId, driverId) }}
            onResetGame={onResetGame}
            onSetupOvernightDevScenario={onSetupOvernightDevScenario}
            onResetDayAfterCarrierApproval={onResetDayAfterCarrierApproval}
            onOpenDriverSchedule={(driverId) => { setIsPhoneOpen(false); setDriverHubOpen(true); if (driverId) { setDriverFocusId(driverId); setDriverFocusRequest((value) => value + 1) } }}
            onRequestScheduleApproval={requestScheduleApproval}
            onBookApprovedSchedule={bookApprovedScheduleLoads}
            onRemoveScheduleLoad={removeScheduleLoad}
            onOpenLunchDecision={openLunchDecisionForDriver}
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
          availableDrivers={drivers.filter((driver) => driver.status === 'available' && !isDriverOnLunch(driver, gameTime)).length}
          openReceivables={ledgerSummary.outstanding}
          onBegin={onBeginOperations}
        />
      )}
    </div>
  )
}

export default MainGameScreen
