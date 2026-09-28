import { useRef, useState } from 'react'
import HomeScreen from './HomeScreen.jsx'
import LoadDetailsScreen from './LoadDetailsScreen.jsx'
import LoadBoardScreen from './LoadBoardScreen.jsx'
import BrowserScreen from './BrowserScreen.jsx'
import DriverFitScreen from './DriverFitScreen.jsx'
import TripPlanScreen from './TripPlanScreen.jsx'
import FleetSchedulerScreen from './FleetSchedulerScreen.jsx'
// B.5.4D.3.1 — First Workday Agenda Polish
// B.5.4D.4.1 — Driver Scheduler Foundation
import DriverSchedulerScreen from './DriverSchedulerScreen.jsx'
import { applyLunchWindowToOwnedWorkday, resolveDriverWorkdayOwnership } from '../utils/driverWorkdayOwnership.js'
import DocumentsScreen from './DocumentsScreen.jsx'
import PodDetailScreen from './PodDetailScreen.jsx'
import CarrierSourceScreen from './CarrierSourceScreen.jsx'
// B.5.4D.2 — CarrierSource Player Experience
import CarrierSourceFirstVisitGuide from './CarrierSourceFirstVisitGuide.jsx'
// B.5.4D.3 — First Driver Onboarding & Workday Setup
import CarrierActivationScreen from './CarrierActivationScreen.jsx'
import CarrierOpportunityScreen from './CarrierOpportunityScreen.jsx'
import DispatcherProfileScreen from './DispatcherProfileScreen.jsx'
import LedgerDeskScreen from './LedgerDeskScreen.jsx'
import LedgerReceivableScreen from './LedgerReceivableScreen.jsx'
import EmailScreen from './EmailScreen.jsx'
import EmailDetailScreen from './EmailDetailScreen.jsx'
import EmailComposeScreen from './EmailComposeScreen.jsx'
import PaperworkWorkspace from './PaperworkWorkspace.jsx'
import MessagesScreen from './MessagesScreen.jsx'
import DriverMessageThreadScreen from './DriverMessageThreadScreen.jsx'
import BusinessDocumentDetailScreen from './BusinessDocumentDetailScreen.jsx'
import OperationalDocumentViewer from './OperationalDocumentViewer.jsx'
// B.5.4C.4.1 — Rate Confirmation Comparison Desk
import RateConfirmationWorkspace from './RateConfirmationWorkspace.jsx'
import PodReviewWorkspace from './PodReviewWorkspace.jsx'
// B.5.4C.6.1 — Invoice & Billing Workspace
import InvoiceWorkspace from './InvoiceWorkspace.jsx'
// B.5.4C.7.1 — Physical Load Packet Workspace
import LoadPacketWorkspace from './LoadPacketWorkspace.jsx'
// B.5.4C.7.2 — Documents Filing Cabinet
import DocumentFilingCabinetScreen from './DocumentFilingCabinetScreen.jsx'
// B.5.4C.7.3.0 — Filing Desk Foundation
import DocumentsFilingDeskScreen from './DocumentsFilingDeskScreen.jsx'
// B.5.4C.7.3.1 — Physical Manila Folder Workspace
import ManilaLoadFolderWorkspace from './ManilaLoadFolderWorkspace.jsx'
import mapLocations from '../data/mapLocations.js'
import { getReceivables } from '../utils/ledger.js'
import { formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'
import { getLoadFolderLifecycle } from '../utils/documentFolderLifecycle.js'
import { isLunchDecisionReady } from '../utils/lunchDecisionEvents.js'
import SettingsScreen from './SettingsScreen.jsx'
import { getControlled5pmDeliveryTiming } from '../dev/devScenarioTiming.js'
import { hasActiveCarrierRoster } from '../utils/carrierOperationalContext.js'

function getReceivable(loads, carriers, workflows, id) { return getReceivables(loads, carriers, workflows).find((item) => item.loadId === id) }

// B.5.4D.4.3.1B — Legacy Route + Diagnostic Cleanup Final
function PhoneOverlay({ loads, setLoads, drivers, setDrivers, carriers = [], operationDay = 1, dispatcherProfile, onSaveDispatcherProfile, carrierApplicationsById = {}, carrierCareerById = {}, onApplyCarrier, onAcceptAgreement, onApprovePod, emailMessages = [], setEmailMessages, driverMessages = [], businessDocuments = [], driverMessageUnreadCount = 0, onReadDriverMessage, onSendDriverLoadUpdate, onSendDriverQuickReply, onPlanDeliveryRoute, runtimePositions = {}, gameTime, setGameTime, setGameClockPaused, onEvaluateFit, onAddToSchedule, onAcceptCandidateAssignment, initialScreen = 'home', initialLoadId = null, initialDriverId = null, initialShiftEndPromptDriverId = null, onShiftEndPromptConsumed, onShiftEndAlertFlowExit, initialEmailComposeContext = null, documentsBadgeCount = 0, ledgerUnreadCount = 0, emailUnreadCount = 0, onOpenLedger, ledgerWorkflowByLoadId = {}, ledgerBanking, setLedgerWorkflowByLoadId, onResetGame, onReturnToTitle, onRequestScheduleApproval, onBookApprovedSchedule, onRemoveScheduleLoad, onSendDriverSchedule, onOpenLunchDecision, onPickupCorrectionSent, onSetupOvernightDevScenario, onInitializeEmployeeCareer, onClose, onCarrierSourceOpened }) {
  // B.5.4D.4.2.5A — Flexible Plan Return Navigation
  const [driverOpsReturnScreen, setDriverOpsReturnScreen] = useState('home')

  const [screen, setScreenState] = useState(initialScreen)
// =========================================================
  // B.5.4C.2 — Directional Phone Navigation
  // =========================================================
  const setScreen = (nextScreen) => {
    if (!nextScreen || nextScreen === screen) return

    const backTargets = {
      messageThread: 'messages',
      emailDetail: 'email',
      agreement: 'emailDetail',
      ledgerReceivable: 'ledger',
      businessDocumentDetail: 'documents',
      podDetail: 'documents',
      dispatcherProfile: 'carrierSource',
      carrierOpportunity: 'carrierSource',
      carrierSource: 'browser',
      loadBoard: 'browser',
      loadDetails: 'loadBoard',
      scheduler: 'loadBoard',
      driverFit: 'loadDetails',
      tripPlan: 'loadDetails',
    }

    const depth = {
      home: 0,

      browser: 1,
      email: 1,
      messages: 1,
      ledger: 1,
      documents: 1,
      settings: 1,
      agenda: 1,

      carrierSource: 2,
      loadBoard: 2,
      emailDetail: 2,
      emailCompose: 2,
      messageThread: 2,
      ledgerReceivable: 2,
      businessDocumentDetail: 2,
      podDetail: 2,

      carrierOpportunity: 3,
      dispatcherProfile: 3,
      agreement: 3,
      loadDetails: 3,
      scheduler: 3,

      driverFit: 4,
      tripPlan: 4,
    }

    let direction = 'forward'

    if (nextScreen === 'home') {
      direction = 'home'
    } else if (backTargets[screen] === nextScreen) {
      direction = 'back'
    } else if ((depth[nextScreen] ?? 1) < (depth[screen] ?? 1)) {
      direction = 'back'
    }

    document.documentElement.dataset.docosPhoneNav = direction
    setScreenState(nextScreen)
  }

  // END B.5.4C.2
  const [documentsTab, setDocumentsTab] = useState('pending')
  const [selectedLoadId, setSelectedLoadId] = useState(initialLoadId)
  const [selectedFolderLoadId, setSelectedFolderLoadId] = useState(null)
  // B.5.4C.5.2 — Context-Aware Load Return
  const [loadReturnScreen, setLoadReturnScreen] = useState(null)
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [selectedCarrierId, setSelectedCarrierId] = useState(() => carriers[0]?.id || null)
  const [emailReturnScreen, setEmailReturnScreen] = useState('email')
  const [emailComposeContext, setEmailComposeContext] = useState(() => initialEmailComposeContext || {})
  const [selectedDriverId, setSelectedDriverId] = useState(initialDriverId)
  const [messageLoadContextId, setMessageLoadContextId] = useState(null)
  const [selectedBusinessDocumentId, setSelectedBusinessDocumentId] = useState(null)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [documentReturnScreen, setDocumentReturnScreen] = useState('documents')
  const [devToolsOpen, setDevToolsOpen] = useState(false)
  const [devConfirm, setDevConfirm] = useState(null)
  const resetHoldTimer = useRef(null)

  const cancelResetHold = () => {
    if (resetHoldTimer.current) {
      window.clearTimeout(resetHoldTimer.current)
      resetHoldTimer.current = null
    }
  }

  const beginResetHold = () => {
    cancelResetHold()
    resetHoldTimer.current = window.setTimeout(() => {
      resetHoldTimer.current = null
      setDevToolsOpen(true)
      if (navigator.vibrate) navigator.vibrate(25)
    }, 900)
  }

  const selectedCarrier = carriers.find((carrier) => carrier.id === selectedCarrierId) || carriers[0] || null
  const nowGameMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const hasActiveCarrier = hasActiveCarrierRoster(carriers, drivers)
  const lunchReadyCount = drivers.filter((driver) => isLunchDecisionReady({ driver, loads, gameTime })).length
  const emailContacts = [
    ...carriers.filter((carrier) => carrier.status === 'active').flatMap((carrier) => [
      { id: `${carrier.id}-operations`, label: `${carrier.name} · Operations`, carrierId: carrier.id, role: 'operations' },
      { id: `${carrier.id}-documents`, label: `${carrier.name} · Documentation`, carrierId: carrier.id, role: 'documents' },
      { id: `${carrier.id}-accounting`, label: `${carrier.name} · Accounting`, carrierId: carrier.id, role: 'accounting' },
    ]),
    ...drivers.map((driver) => ({ id: `${driver.id}-driver`, label: `${driver.fullName || driver.name} · Driver`, driverId: driver.id, role: 'driver' })),
  ]
  const emailAttachments = [
    ...businessDocuments.map((document) => ({ id: `business:${document.id}`, type: document.type, title: document.title, meta: document.status || 'Document', sourceId: document.id })),
    ...loads.filter((load) => load.rateConfirmation?.id).map((load) => ({ id: load.rateConfirmation.id, type: 'rate-confirmation', title: `Rate Confirmation · ${getFreightRouteName(load)}`, meta: load.rateConfirmation.reference, loadId: load.id })),
    ...loads.filter((load) => load.pod).map((load) => ({ id: `pod:${load.id}`, type: 'pod', title: `POD · ${getFreightRouteName(load)}`, meta: load.pod.approved ? 'Approved POD' : load.pod.correctionStatus === 'CORRECTED' ? 'Corrected POD' : 'Delivery paperwork', loadId: load.id })),
    ...loads.filter((load) => load.status === 'available' || load.carrierApprovalStatus).map((load) => ({ id: `load-offer:${load.id}`, type: 'load-offer', title: `Load Offer · ${getFreightRouteName(load)}`, meta: `$${load.rate} · FreightLink`, loadId: load.id })),
    ...loads.filter((load) => Number(load.pod?.freightCondition?.damagedAtPickup || load.shipment?.damagedPallets || 0) > 0 || Number(load.pod?.freightCondition?.missingAtPickup || load.shipment?.missingPallets || 0) > 0).map((load) => ({ id: `exception:${load.id}`, type: 'exception-report', title: `Exception Report · ${getFreightRouteName(load)}`, meta: 'Freight condition record', loadId: load.id })),
    ...Object.entries(ledgerWorkflowByLoadId).filter(([, workflow]) => workflow.invoiceNumber).map(([loadId, workflow]) => { const load = loads.find((item) => item.id === loadId); return { id: `invoice:${loadId}`, type: 'invoice', title: `${workflow.invoiceNumber} · ${load ? getFreightRouteName(load) : 'Route'}`, meta: 'Dispatch invoice', loadId } }),

    ...loads
      .filter((load) => load.documentFiling?.packetAssembled)
      .map((load) => ({
        id: `settlement-packet:${load.id}`,
        type: 'settlement-packet',
        title: `Closeout Packet · ${load.loadNumber || load.id}`,
        meta: 'Assembled load closeout packet',
        loadId: load.id,
      })),

  ]

  const openComposer = (context = {}) => { setEmailComposeContext(context); setScreen('emailCompose') }

  // B.4.2.6 — Schedule approval is reviewed before the existing batch send executes.
  const openScheduleApprovalReview = (driverId) => {
    const driver = drivers.find((item) => item.id === driverId)
    const carrier = carriers.find((item) => item.id === driver?.carrierId) || carriers[0]
    const candidates = loads
      .filter((load) => load.status === 'available' && load.candidateDriverId === driverId && load.scheduleApprovalQueued && !['PENDING', 'APPROVED'].includes(load.carrierApprovalStatus))
      .sort((a, b) => ((a.pickupDayIndex || 0) * 1440 + (a.pickupWindowStartMinutes || 0)) - ((b.pickupDayIndex || 0) * 1440 + (b.pickupWindowStartMinutes || 0)))
    if (!candidates.length) return false
    const firstName = (driver?.fullName || driver?.name || 'Driver').split(' ')[0]
    openComposer({
      workflowType: 'carrier-approval',
      label: 'SCHEDULE APPROVAL',
      batchDriverId: driverId,
      suggestedRecipientId: `${carrier?.id || 'metroline'}-operations`,
      subject: `Approval request · ${firstName} · ${candidates.length} load${candidates.length === 1 ? '' : 's'}`,
      body: `Please review the attached FreightLink offer${candidates.length === 1 ? '' : 's'} for ${firstName}'s planned schedule. Confirm which loads are approved.`,
      attachmentIds: candidates.map((load) => `load-offer:${load.id}`),
      returnScreen: 'scheduler',
    })
    return true
  }

  const openAttachment = (item) => {
    if (!item) return
    if (item.type === 'pod' && item.loadId) { setDocumentReturnScreen(screen); setSelectedLoadId(item.loadId); setScreen('podDetail'); return }
    if (['dispatch-agreement', 'agreement'].includes(item.type) && item.sourceId) { setDocumentReturnScreen(screen); setSelectedBusinessDocumentId(item.sourceId); setScreen('businessDocumentDetail'); return }
    setPreviewAttachment(item)
  }

  const sendOperationalEmail = ({ recipient, subject, body, attachments, context }) => {
    const workflowType = context?.workflowType || 'general'
    const loadId = context?.loadId || null
    if (workflowType === 'carrier-approval' && context?.batchDriverId) {
      const sent = onRequestScheduleApproval?.(context.batchDriverId, { subject, body })
      if (sent === false) return false
      setScreen(context?.returnScreen || 'scheduler')
      return true
    }
    const hasAttachment = (type) => attachments.some((item) => item.type === type && (!loadId || !item.loadId || item.loadId === loadId))
    let workflowValid = true
    if (workflowType === 'carrier-approval') workflowValid = recipient.role === 'operations' && hasAttachment('load-offer')
    if (workflowType === 'pod-correction') {
      workflowValid = recipient.role === 'documents' && hasAttachment('pod')
      const load = loads.find((item) => item.id === loadId)
      const hasException = Number(load?.pod?.freightCondition?.damagedAtPickup || 0) > 0 || Number(load?.pod?.freightCondition?.missingAtPickup || 0) > 0
      if (hasException) workflowValid = workflowValid && hasAttachment('exception-report')
    }
    if (workflowType === 'ratecon-correction') workflowValid = recipient.role === 'documents' && hasAttachment('rate-confirmation') && hasAttachment('load-offer')
    if (workflowType === 'invoice-submission') workflowValid = recipient.role === 'accounting' && hasAttachment('invoice') && hasAttachment('pod')
    if (workflowType === 'pickup-correction') workflowValid = recipient.role === 'documents' && hasAttachment('exception-report')
    if (workflowType === 'load-closeout') workflowValid = recipient.role === 'operations' && hasAttachment('settlement-packet')

    if (workflowType === 'pickup-correction' && workflowValid) {
      const released = onPickupCorrectionSent?.(loadId)
      if (released === false) return false
    }

    const messageId = `email-out-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setEmailMessages?.((current) => [...current, {
      id: messageId,
      type: 'operational-email',
      direction: 'outbound',
      recipientId: recipient.id,
      recipientLabel: recipient.label,
      carrierId: recipient.carrierId || null,
      subject,
      bodyOverride: body,
      attachments,
      workflowType,
      workflowValid,
      loadId,
      receivedGameMinute: nowGameMinute,
      responseGameMinute: nowGameMinute + (workflowType === 'general' ? 0 : 5),
      // B.5.4D.4.2.10A — Business Response Bridge
      responseBusinessAtMs: workflowType === 'general' ? null : Date.now() + 6000,
      read: true,
    }])

    if (workflowType === 'carrier-approval' && loadId) setLoads((current) => current.map((load) => load.id === loadId ? { ...load, carrierApprovalStatus: workflowValid ? 'PENDING' : 'NEEDS_INFO', carrierApprovalRequestedGameMinute: nowGameMinute, carrierApprovalEmailId: messageId } : load))
    if (workflowType === 'pod-correction' && loadId) setLoads((current) => current.map((load) => load.id === loadId && load.pod ? { ...load, pod: { ...load.pod, correctionStatus: workflowValid ? 'PENDING' : 'NEEDS_INFO', correctionRequestedGameMinute: nowGameMinute } } : load))
    if (workflowType === 'ratecon-correction' && loadId) setLoads((current) => current.map((load) => load.id === loadId && load.rateConfirmation ? { ...load, rateConfirmation: { ...load.rateConfirmation, status: workflowValid ? 'CORRECTION_REQUESTED' : 'RECEIVED', reviewStatus: workflowValid ? 'CORRECTION_REQUESTED' : 'PENDING', correctionRequestedGameMinute: workflowValid ? nowGameMinute : null } } : load))
    if (workflowType === 'invoice-submission' && loadId) {
      const current = ledgerWorkflowByLoadId[loadId] || {}
      setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [loadId]: { ...current, financialStatus: workflowValid ? 'AWAITING_PAYMENT' : 'DRAFT', invoiceSentGameMinute: workflowValid ? nowGameMinute : null, paymentAvailableGameMinute: workflowValid ? nowGameMinute + 1440 : null, submissionStatus: workflowValid ? 'SUBMITTED' : 'DOCUMENTATION_REQUIRED' } })
    }
    if (workflowType === 'load-closeout' && loadId && workflowValid) {
      setLoads((current) =>
        current.map((load) =>
          load.id === loadId
            ? {
                ...load,
                documentFiling: {
                  ...(load.documentFiling || {}),
                  closeoutStatus: 'CLOSED',
                  closeoutSentGameMinute: nowGameMinute,
                },
              }
            : load
        )
      )
    }

    setScreen(context?.returnScreen || 'email')
    return true
  }

  const updateDriverWorkday = (driverId, dayIndex, workday) => {
    if (!driverId || !Number.isFinite(Number(dayIndex))) return
    setDrivers?.((current) => current.map((driver) => {
      if (driver.id !== driverId) return driver

      const existing = { ...(driver.workdayByDay || {}) }
      const key = String(dayIndex)
      const currentWorkday = existing[key] || null
      const lockedStart = Number(currentWorkday?.startMinutes)
      const startedToday =
        Number(dayIndex) === Number(gameTime.gameDayIndex || 0) &&
        Number.isFinite(lockedStart) &&
        Number(gameTime.totalMinutesOfDay || 0) >= lockedStart

      // B.5.4D.3.1 — today's scheduled start becomes historical once reached.
      if (startedToday) {
        if (!workday) return driver
        existing[key] = { ...workday, startMinutes: lockedStart, updatedGameMinute: nowGameMinute }
      } else if (workday) {
        existing[key] = { ...workday, updatedGameMinute: nowGameMinute }
      } else {
        delete existing[key]
      }

      return { ...driver, workdayByDay: existing }
    }))
  }

  const selectedLoad = loads.find((load) => load.id === selectedLoadId)
  const devApprovalLoad = loads.find((load) => load.carrierApprovalStatus === 'PENDING') || selectedLoad || loads.find((load) => load.status === 'available' || load.status === 'accepted') || null
  const devApprovalPickup = devApprovalLoad ? mapLocations.find((location) => location.id === devApprovalLoad.pickupLocationId) : null
  const devApprovalDelivery = devApprovalLoad ? mapLocations.find((location) => location.id === devApprovalLoad.deliveryLocationId) : null


  const openLoadDetails = (loadId, returnScreen = null) => {
    setSelectedLoadId(loadId)
    setLoadReturnScreen(returnScreen)
    setScreen('loadDetails')
  }

  const returnFromBrowserContext = () => {
    if (!loadReturnScreen) return
    const destination = loadReturnScreen
    setLoadReturnScreen(null)
    setScreen(destination)
  }

  // B.5.4C.5.2S — System Nav Context Return
  const browserContextScreens = ['browser', 'loadBoard', 'loadDetails', 'scheduler', 'driverFit', 'tripPlan']
  const showSystemContextReturn = Boolean(loadReturnScreen) && browserContextScreens.includes(screen)
  const systemContextReturnLabel =
    loadReturnScreen === 'emailDetail'
      ? 'Email'
      : loadReturnScreen === 'documents'
        ? 'Documents'
        : 'Previous app'

  const updatePodVerification = (field, checked) => setLoads((current) => current.map((load) => { if (load.id !== selectedLoadId || !load.pod) return load; const verification = { signature: false, pieceCount: false, damage: false, deliveryInfo: false, ...(load.pod.verification || {}), [field]: checked }; const verified = Object.values(verification).every(Boolean); return { ...load, pod: { ...load.pod, verification, verified, verifiedGameMinute: verified ? gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay : null } } }))

// B.5.4D.4.2.7A — Standard Phone + Visible Plan Entry
  return (
    <aside className="phone-overlay scheduler-expanded" aria-label="DOC OS operations device">
      <div className="device-sheet-handle" aria-hidden="true" />
      <div className="phone-device-screen">
        <div className="phone-status-bar">
          <button
            type="button"
            className="phone-status-brand phone-reset-trigger"
            aria-label="Hold DOC OS to open developer tools"
            onPointerDown={beginResetHold}
            onPointerUp={cancelResetHold}
            onPointerCancel={cancelResetHold}
            onPointerLeave={cancelResetHold}
            onContextMenu={(event) => event.preventDefault()}
          >
            DOC OS
          </button>
          <div className="device-status-context" aria-label={`Day ${operationDay}, ${formatTime(gameTime.totalMinutesOfDay)}`}>
            <span>OPERATIONS DEVICE</span>
            <strong>DAY {operationDay} · {formatTime(gameTime.totalMinutesOfDay)}</strong>
          </div>
          <button type="button" className="phone-close-button" onClick={onClose} aria-label="Close device">×</button>
        </div>
        {devToolsOpen && (
          <div className="phone-reset-overlay" role="dialog" aria-modal="true" aria-labelledby="phone-dev-title">
            <div className="phone-reset-dialog phone-dev-dialog">
              <div className="phone-dev-sticky-header">
                <div>
                  <span className="phone-reset-kicker">IPHONE DEV TOOLS</span>
                  <strong id="phone-dev-title">DOC OS Development</strong>
                </div>
                <button type="button" className="phone-dev-close" onClick={() => { setDevConfirm(null); setDevToolsOpen(false) }} aria-label="Close developer tools">×</button>
              </div>
              <div className="phone-dev-scroll">
              <p>Shortcuts for repeated gameplay testing. These controls only change the current test save.</p>

              <div className="phone-dev-tool-list">
                <div className="phone-dev-tool-row">
                  <div>
                    <span>P2.4 EMPLOYEE INITIALIZER</span>
                    <b>METROLINE · JUNIOR DISPATCHER</b>
                    <small>Replaces this test save with the employee runtime baseline at 6:00 AM, paused. No CarrierSource application or signed dispatch agreement is created.</small>
                  </div>
                  <button type="button" disabled={!onInitializeEmployeeCareer} onClick={() => onInitializeEmployeeCareer?.()}>
                    CREATE EMPLOYEE TEST
                  </button>
                </div>

                <div className="phone-dev-tool-row">
                  <div>
                    <span>DISPATCHER PROFILE</span>
                    <b>{dispatcherProfile?.created ? dispatcherProfile.displayName : 'NOT CREATED'}</b>
                    <small>Skip CarrierSource profile creation and use a standard test identity.</small>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(dispatcherProfile?.created)}
                    onClick={() => {
                      onSaveDispatcherProfile?.({
                        displayName: 'DOC OS Test Dispatch',
                        homeMarket: 'New York Metro',
                        targetFeePercent: 8,
                        preferredEquipment: "53' Dry Van",
                        preferredRegion: 'Northeast',
                        created: true,
                        devGenerated: true,
                      })
                    }}
                  >
                    {dispatcherProfile?.created ? 'PROFILE READY' : 'CREATE TEST PROFILE'}
                  </button>
                </div>

                <div className="phone-dev-tool-row">
                  <div>
                    <span>DAY RESET</span>
                    <b>DISABLED FOR MULTI-DAY TESTING</b>
                    <small>The legacy Day 1 reset was removed because it could destroy multi-day test state. RESET GAME is now the only full-run reset.</small>
                  </div>
                </div>

                <div className="phone-dev-tool-row phone-dev-tool-row-stack">
                  <div>
                    <span>TIME & DAY</span>
                    <b>DAY {gameTime.gameDayIndex + 1} · {formatTime(gameTime.totalMinutesOfDay)}</b>
                    <small>Testing shortcuts only. These controls change the game clock without dispatching, moving, completing, closing, or reassigning freight.</small>
                  </div>
                  <div className="phone-dev-inline-actions phone-dev-time-actions">
                    <button type="button" disabled={!setGameTime} onClick={() => setGameTime?.((time) => ({ ...time, totalMinutesOfDay: 23 * 60 + 55 }))}>11:55 PM</button>
                    <button type="button" disabled={!setGameTime} onClick={() => setGameTime?.((time) => { const total = time.gameDayIndex * 1440 + time.totalMinutesOfDay + 60; return { gameDayIndex: Math.floor(total / 1440), totalMinutesOfDay: total % 1440 } })}>+1 HOUR</button>
                    <button type="button" disabled={!setGameTime} onClick={() => setGameTime?.((time) => { const total = time.gameDayIndex * 1440 + time.totalMinutesOfDay + 360; return { gameDayIndex: Math.floor(total / 1440), totalMinutesOfDay: total % 1440 } })}>+6 HOURS</button>
                    <button type="button" disabled={!setGameTime} onClick={() => setGameTime?.((time) => ({ ...time, gameDayIndex: time.gameDayIndex + 1 }))}>+1 DAY</button>
                  </div>
                </div>

                <div className="phone-dev-tool-row phone-dev-tool-row-stack">
                  <div>
                    <span>OVERNIGHT TEST</span>
                    <b>CONTROLLED MIDNIGHT SCENARIO</b>
                    <small>Temporarily gives Marcus a 2:00 PM–3:00 AM cross-midnight shift, places him en route to a delivery due after midnight, and starts paused at 11:45 PM for inspection.</small>
                  </div>
                  <div className="phone-dev-inline-actions">
                    <button type="button" disabled={!onSetupOvernightDevScenario} onClick={() => { onSetupOvernightDevScenario?.(); setDevToolsOpen(false) }}>SETUP OVERNIGHT TEST</button>
                  </div>
                </div>

                {/* P2.1.2 — Hidden DEV 5PM Carryover Harness */}
                <div className="phone-dev-tool-row phone-dev-tool-row-stack">
                  <div>
                    <span>SHIFT BOUNDARY TEST</span>
                    <b>CONTROLLED 5:00 PM CARRYOVER</b>
                    <small>Places Marcus en route at 4:55 PM and pauses the clock for inspection. Close DEV and press Play to advance freight, dock timers, completion, and staging.</small>
                  </div>
                  <div className="phone-dev-inline-actions">
                    <button
                      type="button"
                      disabled={!onSetupOvernightDevScenario || !setGameTime}
                      onClick={async () => {
                        if (!onSetupOvernightDevScenario || !setGameTime) return
                        const testDay = gameTime.gameDayIndex
                        const testMinute = 16 * 60 + 55
                        await onSetupOvernightDevScenario()
                        setGameClockPaused?.(true)
                        setLoads((current) => current.map((load) =>
                          load.id === controlledLoadId
                            ? { ...load, ...getControlled5pmDeliveryTiming(testDay) }
                            : load
                        ))
                        setGameTime({ gameDayIndex: testDay, totalMinutesOfDay: testMinute })
                        setDevToolsOpen(false)
                      }}
                    >
                      TEST 5PM CARRYOVER
                    </button>
                  </div>
                </div>

                <div className="phone-dev-tool-row phone-dev-tool-row-stack">
                  <div>
                    <span>CARRIER APPROVAL</span>
                    <b>{devApprovalLoad ? (devApprovalLoad.carrierApprovalStatus || 'NO APPROVAL STATE') : 'NO TEST LOAD'}</b>
                    <small>{devApprovalLoad ? `${devApprovalPickup?.name || 'Pickup'} → ${devApprovalDelivery?.name || 'Delivery'}` : 'Open a FreightLink load or create freight first.'}</small>
                  </div>
                  <div className="phone-dev-inline-actions">
<button type="button" disabled={!devApprovalLoad} onClick={() => setLoads((current) => current.map((load) => load.id === devApprovalLoad?.id ? { ...load, carrierApprovalStatus: 'PENDING', carrierApprovalRequestedGameMinute: nowGameMinute, carrierApprovedGameMinute: null } : load))}>PENDING</button>
                    <button type="button" disabled={!devApprovalLoad} onClick={() => setLoads((current) => current.map((load) => load.id === devApprovalLoad?.id ? { ...load, carrierApprovalStatus: 'APPROVED', carrierApprovedGameMinute: nowGameMinute } : load))}>APPROVE</button>
                    <button type="button" disabled={!devApprovalLoad} onClick={() => setLoads((current) => current.map((load) => load.id === devApprovalLoad?.id ? { ...load, carrierApprovalStatus: 'NEEDS_INFO', carrierApprovedGameMinute: null } : load))}>NEEDS INFO</button>
                    <button
                      type="button"
                      disabled={!devApprovalLoad}
                      onClick={() => {
                        const targetLoadId = devApprovalLoad?.id
                        if (!targetLoadId) return

                        // B.5.4D.4.2.12 — clean test reset.
                        setLoads((current) => current.map((load) =>
                          load.id === targetLoadId
                            ? {
                                ...load,
                                carrierApprovalStatus: null,
                                carrierApprovalRequestedGameMinute: null,
                                carrierApprovedGameMinute: null,
                                carrierApprovalEmailId: null,
                                rateConfirmation: null,
                              }
                            : load
                        ))

                        setEmailMessages?.((current) => current.filter((message) =>
                          !(
                            message.type === 'rate-confirmation-delivery'
                            && message.loadId === targetLoadId
                          )
                        ))
                      }}
                    >
                      CLEAR
                    </button>
                  </div>
                </div>
              </div>

              <div className="phone-reset-actions phone-dev-actions">
                <button type="button" onClick={() => { setDevConfirm(null); setDevToolsOpen(false) }}>CLOSE</button>
                <button type="button" className="danger" onClick={() => setDevConfirm('game')}>RESET GAME</button>
              </div>
              </div>
              {devConfirm === 'game' && (
                <div className="phone-dev-confirm" role="alertdialog" aria-modal="true" aria-label="Confirm reset game">
                  <strong>RESET ENTIRE GAME?</strong>
                  <p>This returns DOC OS to the beginning and clears the current save slot. This cannot be undone.</p>
                  <div className="phone-reset-actions">
                    <button type="button" onClick={() => setDevConfirm(null)}>CANCEL</button>
                    <button type="button" className="danger" onClick={() => { setDevConfirm(null); onResetGame?.() }}>RESET GAME</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="phone-app-viewport">

      {screen === 'home' ? (
        <HomeScreen
          onOpenBrowser={() => setScreen('browser')}
          onOpenAgenda={() => {
            setSelectedLoadId(null)
            setSelectedDriverId(drivers.find((driver) => driver.carrierId)?.id || null)
            setDriverOpsReturnScreen('home'); setScreen('agenda')
          }}
          agendaLocked={!hasActiveCarrier}
          agendaBadgeCount={lunchReadyCount}
          onOpenDocuments={() => setScreen('documents')}
          onOpenLedger={() => { onOpenLedger?.(); setScreen('ledger') }}
          onOpenMessages={() => setScreen('messages')}
          onOpenEmail={() => setScreen('email')}
          onOpenSettings={() => setScreen('settings')}
          emailBadgeCount={emailUnreadCount}
          messagesBadgeCount={driverMessageUnreadCount}
          documentsBadgeCount={documentsBadgeCount}
          ledgerUnreadCount={ledgerUnreadCount}
        />
      ) : screen === 'settings' ? (
        <SettingsScreen
          onBack={() => setScreen('home')}
          onReturnToTitle={() => onReturnToTitle?.()}
        />
      ) : screen === 'agenda' ? (
        <DriverSchedulerScreen
          drivers={drivers}
          carriers={carriers}
          loads={loads}
          runtimePositions={runtimePositions}
          gameTime={gameTime}
          initialDriverId={selectedDriverId}
          initialShiftEndPromptDriverId={initialShiftEndPromptDriverId}
          onShiftEndPromptConsumed={onShiftEndPromptConsumed}
          onShiftEndAlertFlowExit={onShiftEndAlertFlowExit}
          onBack={() => setScreen(driverOpsReturnScreen || 'home')}
          onUpdateWorkday={updateDriverWorkday}
          // B.5.4D.4.1.3 — Scheduler Functional Linkage
          onOpenLunchDecision={(driverId) => {
            if (driverId) setSelectedDriverId(driverId)
            onOpenLunchDecision?.(driverId)
            onClose?.()
          }}
          onSetLunchWindow={(driverId, dayIndex, lunchWindow) => {
            setDrivers?.((current) => current.map((driver) => {
              if (driver.id !== driverId) return driver
              const ownership = resolveDriverWorkdayOwnership({ driver, loads, gameTime })
              if (Number(ownership.ownerDayIndex) !== Number(dayIndex)) return driver
              return applyLunchWindowToOwnedWorkday(driver, loads, gameTime, lunchWindow, nowGameMinute)
            }))
          }}
          onSetShiftEndPlan={(driverId, dayIndex, plan) => {
            const plannedGameMinute =
              Number(gameTime?.gameDayIndex || 0) * 1440 +
              Number(gameTime?.totalMinutesOfDay || 0)

            setDrivers?.((current) => current.map((driver) => (
              driver.id === driverId
                ? {
                    ...driver,
                    shiftEndPlanDayIndex: dayIndex,
                    shiftEndPlanType: plan.type,
                    shiftEndLocationId: plan.locationId,
                    shiftEndLocationName: plan.label,
                    shiftEndPlannedGameMinute: plannedGameMinute,
                    // P2.3.1F — queued shift-end plans stay passive.
                    // Do NOT write idleTargetLocationId while freight still owns
                    // the driver. P2.3.2 will promote this saved plan into an
                    // actual staging route only after active freight is complete.
                  }
                : driver
            )))
          }}
          onOpenTodayPlan={(driverId) => {
            if (driverId) setSelectedDriverId(driverId)
            setSelectedLoadId(null)
            setScreen('scheduler')
          }}
          onSendDriverSchedule={(driverId) => onSendDriverSchedule?.(driverId)}
          onDriverContextChange={setSelectedDriverId}
          onFindFreight={(driverId) => {
            setSelectedLoadId(null)
            if (driverId) setSelectedDriverId(driverId)
            setScreen('loadBoard')
          }}
        />
      ) : screen === 'messages' ? (
        <MessagesScreen
          messages={driverMessages}
          drivers={drivers}
          loads={loads}
          carriers={carriers}
          gameTime={gameTime}
          onBack={() => setScreen('home')}
          onOpenThread={(driverId) => { setSelectedDriverId(driverId); setScreen('messageThread') }}
        />
      ) : screen === 'messageThread' ? (
        <DriverMessageThreadScreen
          driver={drivers.find((driver) => driver.id === selectedDriverId) || null}
          carrier={carriers.find((carrier) => carrier.id === drivers.find((driver) => driver.id === selectedDriverId)?.carrierId) || null}
          driverPosition={runtimePositions[selectedDriverId] || null}
          gameTime={gameTime}
          messages={selectedDriverId ? driverMessages.filter((message) => message.driverId === selectedDriverId) : []}
          activeLoads={loads.filter((load) => !['available', 'expired', 'completed', 'delivered'].includes(load.status) && !['expired', 'completed', 'delivered'].includes(load.tripStatus))}
          initialLoadId={messageLoadContextId || ''}
          initialLoadPickerOpen={Boolean(messageLoadContextId)}
          onBack={() => { setMessageLoadContextId(null); setScreen('messages') }}
          onRead={onReadDriverMessage}
          onSendLoadUpdate={(loadId) => selectedDriverId && onSendDriverLoadUpdate?.(loadId, selectedDriverId)}
          onSendQuickReply={(body, meta) => selectedDriverId && onSendDriverQuickReply?.(body, selectedDriverId, meta)}
          onPlanDeliveryRoute={(loadId) => selectedDriverId && onPlanDeliveryRoute?.(loadId, selectedDriverId)}
        />
      ) : screen === 'email' ? (
        <EmailScreen messages={emailMessages} carriers={carriers} currentGameMinute={nowGameMinute} onBack={() => setScreen('home')} onOpenMessage={(message) => { setEmailMessages?.((current) => current.map((item) => item.id === message.id ? { ...item, read: true } : item)); setSelectedEmailId(message.id); setEmailReturnScreen('email'); setScreen('emailDetail') }} />
      ) : screen === 'emailCompose' ? (
        <EmailComposeScreen contacts={emailContacts} attachments={emailAttachments} context={emailComposeContext} onBack={() => setScreen(emailComposeContext.returnScreen || 'email')} onSend={sendOperationalEmail} onOpenAttachment={openAttachment} />
      ) : screen === 'emailDetail' ? (
        <EmailDetailScreen message={emailMessages.find((item) => item.id === selectedEmailId)} loads={loads} carrier={carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId)} agreementSigned={Boolean(emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId && carrierCareerById?.[emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId]?.agreementAccepted)} onBack={() => { setScreen(emailReturnScreen || 'email') }} onReview={(destination) => {
          const messageCarrierId = emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId
          if (messageCarrierId) setSelectedCarrierId(messageCarrierId)

          if (
            destination === 'agreement' &&
            messageCarrierId &&
            carrierCareerById?.[messageCarrierId]?.agreementAccepted
          ) {
            setSelectedBusinessDocumentId(`${messageCarrierId}-dispatch-agreement`)
            setDocumentReturnScreen('emailDetail')
            setScreen('signedAgreement')
            return
          }

          setScreen(
            destination === 'freightlink'
              ? 'loadBoard'
              : destination === 'agreement'
                ? 'agreement'
                : 'carrierSource'
          )
        }} onOpenAttachment={openAttachment} onOpenRelated={(type, id) => { if (type === 'schedule') { const related = loads.find((item) => item.id === id); setSelectedLoadId(null); setSelectedDriverId(related?.candidateDriverId || related?.assignedDriverId || null); setScreen('scheduler'); return } if (type === 'load') { openLoadDetails(id, 'emailDetail') } else if (type === 'pod') { setDocumentReturnScreen('emailDetail'); setSelectedLoadId(id); setScreen('podDetail') } else if (type === 'invoice') { setSelectedLoadId(id); setScreen('ledgerReceivable') } else if (type === 'document') {
      setDocumentReturnScreen('emailDetail')
      setSelectedBusinessDocumentId(id)
      const document = businessDocuments.find((item) => item.id === id)
      setScreen(document?.type === 'dispatch-agreement' ? 'signedAgreement' : 'businessDocumentDetail')
    } }} />
      ) : screen === 'carrierActivated' ? (
        <CarrierActivationScreen
          carrier={carriers.find((item) => item.id === selectedCarrierId) || carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId) || carriers[0] || null}
          driver={(() => {
            const activationCarrier = carriers.find((item) => item.id === selectedCarrierId) || carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId) || carriers[0] || null
            return drivers.find((driver) => driver.carrierId === activationCarrier?.id) || drivers.find((driver) => activationCarrier?.driverIds?.includes(driver.id)) || null
          })()}
          operationDay={operationDay}
          onReturnToEmail={() => setScreen('email')}
          onOpenAgenda={() => {
            const activationCarrier = carriers.find((item) => item.id === selectedCarrierId) || carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId) || carriers[0] || null
            const activationDriver = drivers.find((driver) => driver.carrierId === activationCarrier?.id) || drivers.find((driver) => activationCarrier?.driverIds?.includes(driver.id)) || null
            setSelectedLoadId(null)
            if (activationDriver?.id) setSelectedDriverId(activationDriver.id)
            setScreen('agenda')
          }}
        />
      ) : screen === 'signedAgreement' ? (
        <PaperworkWorkspace
          carrier={carriers.find((item) => item.id === businessDocuments.find((document) => document.id === selectedBusinessDocumentId)?.carrierId) || carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId) || carriers[0]}
          dispatcherProfile={dispatcherProfile}
          gameTime={gameTime}
          signedDocument={businessDocuments.find((document) => document.id === selectedBusinessDocumentId) || null}
          onBack={() => setScreen(documentReturnScreen || 'emailDetail')}
        />
      ) : screen === 'agreement' ? (
        // B.5.4C.3.2.1 — Signed Agreement Re-entry Guard
        <PaperworkWorkspace
          carrier={carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId) || carriers[0]}
          dispatcherProfile={dispatcherProfile}
          gameTime={gameTime}
          onBack={() => setScreen('emailDetail')}
          onAccept={() => {
            const carrierId = carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId)?.id || carriers[0]?.id
            if (!carrierId) return
            setSelectedCarrierId(carrierId)
            onAcceptAgreement?.(carrierId)
            setScreen('carrierActivated')
          }}
        />
      ) : screen === 'ledger' ? (
        <LedgerDeskScreen loads={loads} carriers={carriers} ledgerWorkflowByLoadId={ledgerWorkflowByLoadId} ledgerBanking={ledgerBanking} onBack={() => setScreen('home')} onOpenReceivable={(item) => { setSelectedLoadId(item.loadId); setScreen('ledgerReceivable') }} />
      ) : screen === 'ledgerReceivable' ? (
        <InvoiceWorkspace
          load={loads.find((item) => item.id === selectedLoadId)}
          carrier={carriers.find((item) => item.id === loads.find((load) => load.id === selectedLoadId)?.carrierId) || carriers[0]}
          dispatcherProfile={dispatcherProfile}
          workflow={ledgerWorkflowByLoadId[selectedLoadId] || {}}
          receivable={getReceivable(loads, carriers, ledgerWorkflowByLoadId, selectedLoadId)}
          onBack={() => setScreen('ledger')}
          onCreateInvoice={() => {
            setLedgerWorkflowByLoadId((previous) => {
              const numbers = Object.values(previous)
                .map((item) => Number(String(item.invoiceNumber || '').replace('INV-', '')))
                .filter(Number.isFinite)
              const next = Math.max(0, ...numbers) + 1
              const existing = previous[selectedLoadId] || {}
              return {
                ...previous,
                [selectedLoadId]: {
                  ...existing,
                  financialStatus: 'DRAFT',
                  invoiceNumber: existing.invoiceNumber || `INV-${String(next).padStart(4, '0')}`,
                  invoiceCreatedGameMinute:
                    existing.invoiceCreatedGameMinute ??
                    gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay,
                  invoiceSentGameMinute: null,
                  paymentReceivedGameMinute: null,
                },
              }
            })
          }}
          onSendInvoice={() => {
            const current = ledgerWorkflowByLoadId[selectedLoadId] || {}
            const load = loads.find((item) => item.id === selectedLoadId)
            const carrier = carriers.find((item) => item.id === load?.carrierId) || carriers[0]
            openComposer({
              workflowType: 'invoice-submission',
              label: 'INVOICE SUBMISSION',
              loadId: selectedLoadId,
              loadNumber: load ? getFreightRouteName(load) : 'Route',
              suggestedRecipientId: `${carrier?.id || 'metroline'}-accounting`,
              subject: `Invoice ${current.invoiceNumber || ''} · ${load ? getFreightRouteName(load) : 'Route'}`,
              body: `Hello,\n\nPlease find our dispatch invoice and supporting POD attached for ${load ? getFreightRouteName(load) : 'Route'}.\n\nThank you,\nDOC OS Dispatch`,
              returnScreen: 'ledgerReceivable',
            })
          }}
        />
      ) : screen === 'documents' ? (
                <DocumentFilingCabinetScreen
          loads={loads}
          businessDocuments={businessDocuments}
          ledgerWorkflowByLoadId={ledgerWorkflowByLoadId}
          onBack={() => setScreen('home')}
          onStartFiling={() => setScreen('documentsFilingDesk')}
          onOpenFolder={(id) => {
            setSelectedFolderLoadId(id)
            setScreen('documentsFolder')
          }}
          onOpenLoad={(id) => openLoadDetails(id, 'documents')}
          onOpenInvoice={(id) => {
            setSelectedLoadId(id)
            setScreen('ledgerReceivable')
          }}
          onOpenRateConfirmation={(id) => {
            const load = loads.find((item) => item.id === id)
            if (!load?.rateConfirmation) return
            setPreviewAttachment({
              id: load.rateConfirmation.id,
              type: 'rate-confirmation',
              title: `Rate Confirmation · ${getFreightRouteName(load)}`,
              meta: load.rateConfirmation.reference,
              loadId: id,
            })
          }}
          onOpenException={(id) => {
            const load = loads.find((item) => item.id === id)
            if (!load) return
            setPreviewAttachment({
              id: `exception:${id}`,
              type: 'exception-report',
              title: `Freight Exception · ${getFreightRouteName(load)}`,
              meta: 'Shipment condition record',
              loadId: id,
            })
          }}
          onOpenBusinessDocument={(id) => {
            setDocumentReturnScreen('documents')
            setSelectedBusinessDocumentId(id)
            const document = businessDocuments.find((item) => item.id === id)
            setScreen(document?.type === 'dispatch-agreement' ? 'signedAgreement' : 'businessDocumentDetail')
          }}
          onOpenPod={(id) => {
            const load = loads.find((item) => item.id === id)
            if (
              load?.pod &&
              !load.pod.approved &&
              !Number.isFinite(load.pod.viewedGameMinute)
            ) {
              const now =
                gameTime.gameDayIndex * 1440 +
                gameTime.totalMinutesOfDay
        
              setLoads((current) =>
                current.map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        pod: {
                          ...item.pod,
                          viewedGameMinute: now,
                        },
                      }
                    : item
                )
              )
            }
        
            setDocumentReturnScreen('documents')
            setSelectedLoadId(id)
            setScreen('podDetail')
          }}
          onFileDocument={(targetLoadId, documentId) => {
            setLoads((current) =>
              current.map((load) => {
                const currentIds =
                  load.documentFiling?.filedDocumentIds || []
        
                const withoutDocument =
                  currentIds.filter((id) => id !== documentId)
        
                const nextIds =
                  load.id === targetLoadId
                    ? [...withoutDocument, documentId]
                    : withoutDocument
        
                const unchanged =
                  nextIds.length === currentIds.length &&
                  nextIds.every((id, index) => id === currentIds[index])
        
                if (unchanged) return load
        
                return {
                  ...load,
                  documentFiling: {
                    ...(load.documentFiling || {}),
                    filedDocumentIds: nextIds,
                  },
                }
              })
            )
          }}
          onUnfileDocument={(documentId) => {
            setLoads((current) =>
              current.map((load) => {
                const currentIds =
                  load.documentFiling?.filedDocumentIds || []
        
                if (!currentIds.includes(documentId)) return load
        
                return {
                  ...load,
                  documentFiling: {
                    ...(load.documentFiling || {}),
                    filedDocumentIds:
                      currentIds.filter((id) => id !== documentId),
                  },
                }
              })
            )
          }}
/>
      ) : screen === 'documentsFolder' ? (
        <ManilaLoadFolderWorkspace
          folderLoadId={selectedFolderLoadId}
          loads={loads}
          carriers={carriers}
          workflows={ledgerWorkflowByLoadId}
          dispatcherProfile={dispatcherProfile}
          onBack={() => setScreen('documents')}
          onAssemblePacket={(loadId) => {
            const load = loads.find((item) => item.id === loadId)
            if (!load) return { ok: false, message: 'Load file not found.' }

            const lifecycle = getLoadFolderLifecycle(
              load,
              ledgerWorkflowByLoadId,
              loads
            )

            if (!lifecycle.readyToAssemble) {
              if (lifecycle.wrongFiledCount > 0) {
                return {
                  ok: false,
                  message: `REFERENCE MISMATCH · ${lifecycle.wrongFiledCount} filed paper${lifecycle.wrongFiledCount === 1 ? '' : 's'} belong to another load.`,
                }
              }

              return {
                ok: false,
                message: lifecycle.missing.length
                  ? `PACKET INCOMPLETE · Missing ${lifecycle.missing.join(' · ')}.`
                  : 'PACKET NOT READY · Review the load file before assembly.',
              }
            }

            const assembledIds = [
              `offer:${loadId}`,
              ...(load.documentFiling?.filedDocumentIds || []),
            ]

            setLoads((current) =>
              current.map((item) =>
                item.id === loadId
                  ? {
                      ...item,
                      documentFiling: {
                        ...(item.documentFiling || {}),
                        packetAssembled: true,
                        packetAssembledGameMinute: nowGameMinute,
                        assembledDocumentIds: assembledIds,
                      },
                    }
                  : item
              )
            )

            return { ok: true }
          }}
          onSendCloseout={(loadId) => {
            const load = loads.find((item) => item.id === loadId)
            if (!load?.documentFiling?.packetAssembled) return

            const carrier =
              carriers.find((item) => item.id === load.carrierId) ||
              carriers[0]

            openComposer({
              workflowType: 'load-closeout',
              label: 'LOAD CLOSEOUT',
              loadId,
              loadNumber: load.loadNumber || load.id,
              suggestedRecipientId: `${carrier?.id || 'metroline'}-operations`,
              subject: `Load closeout · ${getFreightRouteName(load)}`,
              body: `Hello,

Attached is the completed closeout packet for ${getFreightRouteName(load)}. Thank you for your business.

Best,
${dispatcherProfile?.businessName || dispatcherProfile?.displayName || 'DOC OS Dispatch'}`,
              attachmentIds: [`settlement-packet:${loadId}`],
              returnScreen: 'documentsFolder',
            })
          }}
          onUnfileDocument={(documentId) => {
            setLoads((current) =>
              current.map((load) => {
                const currentIds =
                  load.documentFiling?.filedDocumentIds || []

                if (!currentIds.includes(documentId)) return load

                return {
                  ...load,
                  documentFiling: {
                    ...(load.documentFiling || {}),
                    filedDocumentIds:
                      currentIds.filter((id) => id !== documentId),
                  },
                }
              })
            )
          }}
        />
      ) : screen === 'documentsFilingDesk' ? (
        <DocumentsFilingDeskScreen
          loads={loads}
          carriers={carriers}
          ledgerWorkflowByLoadId={ledgerWorkflowByLoadId}
          onBack={() => setScreen('documents')}
          onFileDocument={(targetLoadId, documentId) => {
            setLoads((current) =>
              current.map((load) => {
                const currentIds =
                  load.documentFiling?.filedDocumentIds || []

                const withoutDocument =
                  currentIds.filter((id) => id !== documentId)

                const nextIds =
                  load.id === targetLoadId
                    ? [...withoutDocument, documentId]
                    : withoutDocument

                const unchanged =
                  nextIds.length === currentIds.length &&
                  nextIds.every(
                    (id, index) => id === currentIds[index]
                  )

                if (unchanged) return load

                return {
                  ...load,
                  documentFiling: {
                    ...(load.documentFiling || {}),
                    filedDocumentIds: nextIds,
                  },
                }
              })
            )
          }}
        />
      ) : screen === 'businessDocumentDetail' ? (
        <BusinessDocumentDetailScreen document={businessDocuments.find((document) => document.id === selectedBusinessDocumentId)} onBack={() => { if (documentReturnScreen === 'documents') setDocumentsTab('archive'); setScreen(documentReturnScreen || 'documents') }} />
      ) : screen === 'podDetail' ? (
        <PodReviewWorkspace
          load={loads.find((load) => load.id === selectedLoadId)}
          driver={drivers.find((driver) =>
            driver.id === (
              loads.find((load) => load.id === selectedLoadId)?.assignedDriverId ??
              loads.find((load) => load.id === selectedLoadId)?.completedDriverId
            )
          )}
          delivery={mapLocations.find((location) =>
            location.id === loads.find((load) => load.id === selectedLoadId)?.deliveryLocationId
          )}
          readOnly={Boolean(loads.find((load) => load.id === selectedLoadId)?.pod?.approved)}
          onUpdateVerification={updatePodVerification}
          onApprovePod={() => onApprovePod?.(selectedLoadId)}
          onRequestCorrection={() => {
            const load = loads.find((item) => item.id === selectedLoadId)
            const carrier =
              carriers.find((item) => item.id === load?.carrierId) ||
              carriers[0]
        
            openComposer({
              workflowType: 'pod-correction',
              label: 'POD CORRECTION',
              loadId: selectedLoadId,
              loadNumber: load ? getFreightRouteName(load) : 'Route',
              suggestedRecipientId: `${carrier?.id || 'metroline'}-documents`,
              subject: `POD correction required · ${load ? getFreightRouteName(load) : 'Route'}`,
              body: `Hello,\n\nThe submitted POD does not match the shipment record. Please review the attached POD and exception documentation and return a corrected copy.\n\nThank you,\nDOC OS Dispatch`,
              returnScreen: 'podDetail',
            })
          }}
          onBack={() => setScreen(documentReturnScreen || 'documents')}
        />
      ) : screen === 'dispatcherProfile' ? (
        <BrowserScreen key={screen} page="carriersource.local/signup" onBack={() => setScreen('carrierSource')} onHome={() => setScreen('browser')} showSiteBranding={false}><DispatcherProfileScreen profile={dispatcherProfile} onBack={() => setScreen('carrierSource')} onSave={(profile) => { onSaveDispatcherProfile?.(profile); setScreen('carrierSource') }} /></BrowserScreen>
      ) : screen === 'carrierSource' || screen === 'carrierOpportunity' ? (
        <BrowserScreen key={screen} page={screen === 'carrierOpportunity' && selectedCarrier ? `carriersource.local/carriers/${selectedCarrier.id}` : 'carriersource.local'} onBack={() => setScreen(screen === 'carrierSource' ? 'browser' : 'carrierSource')} onHome={() => setScreen('browser')} siteTitle="CARRIERSOURCE" siteSubtitle="Carrier Network" showSiteBranding={false}><>{screen === 'carrierSource' && <div className="carrier-source-d2-stack"><CarrierSourceFirstVisitGuide mode="network" carriers={carriers} applicationsById={carrierApplicationsById} careerById={carrierCareerById} onOpenEmail={() => setScreen('email')} /><CarrierSourceScreen carriers={carriers} applicationsById={carrierApplicationsById} careerById={carrierCareerById} dispatcherProfile={dispatcherProfile} onSignUp={() => setScreen('dispatcherProfile')} onOpenCarrier={(carrierId) => { setSelectedCarrierId(carrierId); setScreen('carrierOpportunity') }} /></div>}{screen === 'carrierOpportunity' && <div className="carrier-source-d2-stack"><CarrierSourceFirstVisitGuide mode="opportunity" carrier={selectedCarrier} application={selectedCarrier ? carrierApplicationsById[selectedCarrier.id] : null} career={selectedCarrier ? carrierCareerById[selectedCarrier.id] : null} onOpenEmail={() => setScreen('email')} /><CarrierOpportunityScreen carrier={selectedCarrier} drivers={drivers} application={selectedCarrier ? carrierApplicationsById[selectedCarrier.id] : null} career={selectedCarrier ? carrierCareerById[selectedCarrier.id] : null} dispatcherProfile={dispatcherProfile} onApply={() => selectedCarrier && (dispatcherProfile?.created ? onApplyCarrier?.(selectedCarrier.id) : setScreen('dispatcherProfile'))} onOpenOffer={() => setScreen('email')} /></div>}</></BrowserScreen>
      ) : screen === 'browser' || screen === 'loadBoard' || screen === 'loadDetails' || screen === 'scheduler' || screen === 'driverFit' || screen === 'tripPlan' ? (
        <BrowserScreen
          key={screen}
          page={screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'freightlink.local' : screen === 'loadDetails' ? `freightlink.local/load/${selectedLoadId}` : screen === 'scheduler' ? 'freightlink.local/plan' : screen === 'driverFit' ? `freightlink.local/load/${selectedLoadId}/driver-select` : `freightlink.local/load/${selectedLoadId}/trip-plan`}
          freightLinkLocked={!hasActiveCarrier}
          onOpenFreightLink={() => { if (hasActiveCarrier) { setSelectedDriverId(null); setScreen('loadBoard') } }}
          onOpenCarrierSource={() => { onCarrierSourceOpened?.(); setScreen('carrierSource') }}
          onBack={() => {
            if (screen === 'browser') setScreen('home')
            else if (screen === 'loadBoard') setScreen('browser')
            else if (screen === 'loadDetails') setScreen('loadBoard')
            else if (screen === 'scheduler') setScreen('loadBoard')
            else if (screen === 'driverFit') setScreen('loadDetails')
            else if (screen === 'tripPlan') setScreen('loadDetails')
          }}
          onHome={() => setScreen('browser')}
          showSiteBranding={false}
        >
          {screen === 'loadBoard' && <LoadBoardScreen embedded loads={loads} drivers={drivers} runtimePositions={runtimePositions} gameTime={gameTime} operationDay={operationDay} planningDriverId={selectedDriverId} onPlanningDriverChange={setSelectedDriverId} onSelectLoad={(loadId) => openLoadDetails(loadId, null)} onOpenScheduler={() => {
            setSelectedLoadId(null)
            setSelectedDriverId((current) => current || drivers.find((driver) => driver.carrierId)?.id || null)
            setScreen('scheduler')
          }} />}
          {screen === 'loadDetails' && <LoadDetailsScreen loads={loads} drivers={drivers} carriers={carriers} loadId={selectedLoadId} planningDriverId={selectedDriverId} runtimePositions={runtimePositions} gameTime={gameTime} onAddToSchedule={(loadId, driverId) => onAddToSchedule?.(loadId, driverId)} onOpenScheduler={async (loadId) => { const target = loads.find((item) => item.id === loadId); if (target?.status === 'available' && !target.scheduleApprovalQueued) { const ok = target.candidateDriverId ? true : await onAddToSchedule?.(loadId); if (ok === false) return; setLoads((current) => current.map((item) => item.id === loadId ? { ...item, scheduleApprovalQueued: true } : item)); } setSelectedLoadId(loadId); setSelectedDriverId(target?.candidateDriverId || target?.assignedDriverId || selectedDriverId || drivers.find((driver) => driver.carrierId)?.id || null); setScreen('scheduler') }} onSendLoadDetails={(loadId, driverId) => { const targetLoad = loads.find((item) => item.id === loadId); if (!Number.isFinite(targetLoad?.pickupDriverBriefedGameMinute)) onSendDriverLoadUpdate?.(loadId, driverId); setSelectedLoadId(loadId); setSelectedDriverId(driverId); setMessageLoadContextId(loadId); setScreen('messageThread') }} onBack={() => setScreen('loadBoard')} />}
          {/* B.5.4D.4.2.3 — One Scheduler Authority: freight-plan only */}
          {screen === 'scheduler' && <FleetSchedulerScreen loads={loads} drivers={drivers} carriers={carriers} gameTime={gameTime} focusLoadId={selectedLoadId} initialDriverId={selectedDriverId} onBackToFreightLink={() => setScreen('loadBoard')} onRequestScheduleApproval={(driverId) => openScheduleApprovalReview(driverId)} onBookRoute={(loadId) => onAcceptCandidateAssignment?.(loadId)} onBookApprovedSchedule={(driverId) => onBookApprovedSchedule?.(driverId)} onRemoveFromPlan={(loadId) => onRemoveScheduleLoad?.(loadId)} onSendDriverSchedule={(driverId) => onSendDriverSchedule?.(driverId)} onOpenDriverOperations={(driverId) => { if (driverId) setSelectedDriverId(driverId); setDriverOpsReturnScreen('scheduler'); setScreen('agenda') }} onDriverContextChange={setSelectedDriverId} />}
          {screen === 'driverFit' && <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} loads={loads} drivers={drivers} runtimePositions={runtimePositions} gameTime={gameTime} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onEvaluate={(driverId, fit) => {
            onEvaluateFit(selectedLoadId, driverId, fit)
            setScreen('tripPlan')
          }} />}
          {screen === 'tripPlan' && <TripPlanScreen loads={loads} drivers={drivers} carriers={carriers} loadId={selectedLoadId} onChangeDriver={() => setScreen('driverFit')} onRequestCarrierApproval={(loadId, sendApproval = false) => { setLoads((current) => current.map((load) => load.id === loadId ? { ...load, scheduleApprovalQueued: true, carrierApprovalStatus: sendApproval ? (load.carrierApprovalStatus || null) : load.carrierApprovalStatus } : load)); if (sendApproval) setScreen('loadBoard') }} onViewCarrierApproval={(loadId) => { const load = loads.find((item) => item.id === loadId); const emailId = load?.carrierApprovalEmailId; if (emailId && emailMessages.some((message) => message.id === emailId)) { setSelectedEmailId(emailId); setEmailReturnScreen('tripPlan'); setScreen('emailDetail') } else { const fallback = [...emailMessages].reverse().find((message) => message.loadId === loadId && message.workflowType === 'carrier-approval'); if (fallback) { setSelectedEmailId(fallback.id); setEmailReturnScreen('tripPlan'); setScreen('emailDetail') } else setScreen('email') } }} onBook={(loadId) => { const accepted = onAcceptCandidateAssignment?.(loadId); if (accepted !== false) setScreen('tripPlan') }} onOpenDriverThread={(loadId, driverId) => { setSelectedLoadId(loadId); setSelectedDriverId(driverId); setMessageLoadContextId(loadId); setScreen('messageThread') }} onBack={() => setScreen('loadDetails')} />}
        </BrowserScreen>
      ) : null}
        </div>
        {previewAttachment?.type === 'rate-confirmation' && (
          <RateConfirmationWorkspace
            attachment={previewAttachment}
            loads={loads}
            onClose={() => setPreviewAttachment(null)}
            onRateConCheck={(loadId, key, value) =>
              setLoads((current) =>
                current.map((load) =>
                  load.id === loadId && load.rateConfirmation
                    ? {
                        ...load,
                        rateConfirmation: {
                          ...load.rateConfirmation,
                          reviewChecks: {
                            ...(load.rateConfirmation.reviewChecks || {}),
                            [key]: value,
                          },
                          reviewStatus: 'IN_REVIEW',
                        },
                      }
                    : load
                )
              )
            }
            onConfirmRateCon={(loadId) =>
              setLoads((current) =>
                current.map((load) =>
                  load.id === loadId && load.rateConfirmation
                    ? {
                        ...load,
                        rateConfirmation: {
                          ...load.rateConfirmation,
                          status: 'CONFIRMED',
                          reviewStatus: 'CONFIRMED',
                          confirmedGameMinute: nowGameMinute,
                        },
                      }
                    : load
                )
              )
            }
            onRequestRateConCorrection={(loadId) => {
              const load = loads.find((item) => item.id === loadId)
              const carrier =
                carriers.find((item) => item.id === load?.carrierId) ||
                carriers[0]
        
              setPreviewAttachment(null)
        
              openComposer({
                workflowType: 'ratecon-correction',
                label: 'RATE CONFIRMATION CORRECTION',
                loadId,
                loadNumber: load ? getFreightRouteName(load) : 'Route',
                suggestedRecipientId: `${carrier?.id || 'metroline'}-documents`,
                subject: `Rate Confirmation correction required · ${load ? getFreightRouteName(load) : 'Route'}`,
                body: 'Please review the attached FreightLink offer and Rate Confirmation. The Rate Confirmation contains a discrepancy and a corrected copy is required.',
                attachmentIds: [
                  `load-offer:${loadId}`,
                  load?.rateConfirmation?.id,
                ].filter(Boolean),
                returnScreen: 'documents',
              })
            }}
          />
        )}

        {previewAttachment?.type === 'settlement-packet' && (
          <LoadPacketWorkspace
            attachment={previewAttachment}
            loads={loads}
            carriers={carriers}
            workflows={ledgerWorkflowByLoadId}
            dispatcherProfile={dispatcherProfile}
            onClose={() => setPreviewAttachment(null)}
          />
        )}

        {previewAttachment && previewAttachment.type !== 'rate-confirmation' && previewAttachment.type !== 'settlement-packet' && (
          <OperationalDocumentViewer
            attachment={previewAttachment}
            loads={loads}
            workflows={ledgerWorkflowByLoadId}
            businessDocuments={businessDocuments}
            onClose={() => setPreviewAttachment(null)}
          />
        )}
        <div className="phone-navigation-bar">
          {showSystemContextReturn && (
            <button
              type="button"
              className="phone-context-return-button"
              onClick={returnFromBrowserContext}
              aria-label={`Return to ${systemContextReturnLabel}`}
              title={`Return to ${systemContextReturnLabel}`}
            >
              {/* B.5.4C.5.2S.1 — DOC OS Return Control */}
              <svg className="phone-context-return-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6.5 4.5 11 9 15.5" />
                <path d="M5 11h8.25c3.65 0 5.75 1.95 5.75 5.5" />
              </svg>
            </button>
          )}

          <button type="button" className="phone-home-button" onClick={() => setScreen('home')} aria-label="Phone home">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.5 12 4l7.5 6.5v8.75H14v-5.5h-4v5.5H4.5V10.5Z"/></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default PhoneOverlay
