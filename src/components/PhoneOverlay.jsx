import { useRef, useState } from 'react'
import HomeScreen from './HomeScreen.jsx'
import LoadDetailsScreen from './LoadDetailsScreen.jsx'
import LoadBoardScreen from './LoadBoardScreen.jsx'
import RoutePlanningScreen from './RoutePlanningScreen.jsx'
import BrowserScreen from './BrowserScreen.jsx'
import DriverFitScreen from './DriverFitScreen.jsx'
import TripPlanScreen from './TripPlanScreen.jsx'
import FleetSchedulerScreen from './FleetSchedulerScreen.jsx'
import DocumentsScreen from './DocumentsScreen.jsx'
import PodDetailScreen from './PodDetailScreen.jsx'
import CarrierSourceScreen from './CarrierSourceScreen.jsx'
import CarrierOpportunityScreen from './CarrierOpportunityScreen.jsx'
import DispatcherProfileScreen from './DispatcherProfileScreen.jsx'
import LedgerDeskScreen from './LedgerDeskScreen.jsx'
import LedgerReceivableScreen from './LedgerReceivableScreen.jsx'
import EmailScreen from './EmailScreen.jsx'
import EmailDetailScreen from './EmailDetailScreen.jsx'
import EmailComposeScreen from './EmailComposeScreen.jsx'
import DispatchAgreementScreen from './DispatchAgreementScreen.jsx'
import MessagesScreen from './MessagesScreen.jsx'
import DriverMessageThreadScreen from './DriverMessageThreadScreen.jsx'
import BusinessDocumentDetailScreen from './BusinessDocumentDetailScreen.jsx'
import OperationalDocumentViewer from './OperationalDocumentViewer.jsx'
import mapLocations from '../data/mapLocations.js'
import { getReceivables } from '../utils/ledger.js'
import { formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function getReceivable(loads, carriers, workflows, id) { return getReceivables(loads, carriers, workflows).find((item) => item.loadId === id) }

function PhoneOverlay({ loads, setLoads, drivers, setDrivers, carriers = [], operationDay = 1, dispatcherProfile, onSaveDispatcherProfile, carrierApplicationsById = {}, onApplyCarrier, onAcceptAgreement, onApprovePod, emailMessages = [], setEmailMessages, driverMessages = [], businessDocuments = [], driverMessageUnreadCount = 0, onReadDriverMessage, onSendDriverLoadUpdate, onSendDriverQuickReply, onPlanDeliveryRoute, runtimePositions = {}, plannedRoute, setPlannedRoute, gameTime, onEvaluateFit, onAddToSchedule, onAcceptCandidateAssignment, onPlanTrip, initialScreen = 'home', initialLoadId = null, initialDriverId = null, documentsBadgeCount = 0, ledgerUnreadCount = 0, emailUnreadCount = 0, onOpenLedger, ledgerWorkflowByLoadId = {}, setLedgerWorkflowByLoadId, onResetGame, onResetDayAfterCarrierApproval, onOpenDriverSchedule, onRequestScheduleApproval, onBookApprovedSchedule, onRemoveScheduleLoad, onSendDriverSchedule, onClose }) {
  const [screen, setScreen] = useState(initialScreen)
  const [documentsTab, setDocumentsTab] = useState('pending')
  const [selectedLoadId, setSelectedLoadId] = useState(initialLoadId)
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [emailReturnScreen, setEmailReturnScreen] = useState('email')
  const [emailComposeContext, setEmailComposeContext] = useState({})
  const [selectedDriverId, setSelectedDriverId] = useState(initialDriverId)
  const [messageLoadContextId, setMessageLoadContextId] = useState(null)
  const [selectedBusinessDocumentId, setSelectedBusinessDocumentId] = useState(null)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [documentReturnScreen, setDocumentReturnScreen] = useState('documents')
  const [devToolsOpen, setDevToolsOpen] = useState(false)
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

  const nowGameMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const hasActiveCarrier = carriers.some((carrier) => carrier.status === 'active') && drivers.length > 0
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
    ...loads.filter((load) => load.pod).map((load) => ({ id: `pod:${load.id}`, type: 'pod', title: `POD · ${getFreightRouteName(load)}`, meta: load.pod.approved ? 'Approved POD' : load.pod.correctionStatus === 'CORRECTED' ? 'Corrected POD' : 'Delivery paperwork', loadId: load.id })),
    ...loads.filter((load) => load.status === 'available' || load.carrierApprovalStatus).map((load) => ({ id: `load-offer:${load.id}`, type: 'load-offer', title: `Load Offer · ${getFreightRouteName(load)}`, meta: `$${load.rate} · FreightLink`, loadId: load.id })),
    ...loads.filter((load) => Number(load.pod?.freightCondition?.damagedAtPickup || 0) > 0 || Number(load.pod?.freightCondition?.missingAtPickup || 0) > 0).map((load) => ({ id: `exception:${load.id}`, type: 'exception-report', title: `Exception Report · ${getFreightRouteName(load)}`, meta: 'Freight condition record', loadId: load.id })),
    ...Object.entries(ledgerWorkflowByLoadId).filter(([, workflow]) => workflow.invoiceNumber).map(([loadId, workflow]) => { const load = loads.find((item) => item.id === loadId); return { id: `invoice:${loadId}`, type: 'invoice', title: `${workflow.invoiceNumber} · ${load ? getFreightRouteName(load) : 'Route'}`, meta: 'Dispatch invoice', loadId } }),
  ]

  const openComposer = (context = {}) => { setEmailComposeContext(context); setScreen('emailCompose') }

  const openAttachment = (item) => {
    if (!item) return
    if (item.type === 'pod' && item.loadId) { setDocumentReturnScreen(screen); setSelectedLoadId(item.loadId); setScreen('podDetail'); return }
    if (['dispatch-agreement', 'agreement'].includes(item.type) && item.sourceId) { setDocumentReturnScreen(screen); setSelectedBusinessDocumentId(item.sourceId); setScreen('businessDocumentDetail'); return }
    setPreviewAttachment(item)
  }

  const sendOperationalEmail = ({ recipient, subject, body, attachments, context }) => {
    const workflowType = context?.workflowType || 'general'
    const loadId = context?.loadId || null
    const hasAttachment = (type) => attachments.some((item) => item.type === type && (!loadId || !item.loadId || item.loadId === loadId))
    let workflowValid = true
    if (workflowType === 'carrier-approval') workflowValid = recipient.role === 'operations' && hasAttachment('load-offer')
    if (workflowType === 'pod-correction') {
      workflowValid = recipient.role === 'documents' && hasAttachment('pod')
      const load = loads.find((item) => item.id === loadId)
      const hasException = Number(load?.pod?.freightCondition?.damagedAtPickup || 0) > 0 || Number(load?.pod?.freightCondition?.missingAtPickup || 0) > 0
      if (hasException) workflowValid = workflowValid && hasAttachment('exception-report')
    }
    if (workflowType === 'invoice-submission') workflowValid = recipient.role === 'accounting' && hasAttachment('invoice') && hasAttachment('pod')

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
      read: true,
    }])

    if (workflowType === 'carrier-approval' && loadId) setLoads((current) => current.map((load) => load.id === loadId ? { ...load, carrierApprovalStatus: workflowValid ? 'PENDING' : 'NEEDS_INFO', carrierApprovalRequestedGameMinute: nowGameMinute, carrierApprovalEmailId: messageId } : load))
    if (workflowType === 'pod-correction' && loadId) setLoads((current) => current.map((load) => load.id === loadId && load.pod ? { ...load, pod: { ...load.pod, correctionStatus: workflowValid ? 'PENDING' : 'NEEDS_INFO', correctionRequestedGameMinute: nowGameMinute } } : load))
    if (workflowType === 'invoice-submission' && loadId) {
      const current = ledgerWorkflowByLoadId[loadId] || {}
      setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [loadId]: { ...current, financialStatus: workflowValid ? 'AWAITING_PAYMENT' : 'DRAFT', invoiceSentGameMinute: workflowValid ? nowGameMinute : null, paymentAvailableGameMinute: workflowValid ? nowGameMinute + 1440 : null, submissionStatus: workflowValid ? 'SUBMITTED' : 'DOCUMENTATION_REQUIRED' } })
    }
    setScreen(context?.returnScreen || 'email')
    return true
  }

  const selectedLoad = loads.find((load) => load.id === selectedLoadId)
  const devApprovalLoad = selectedLoad || loads.find((load) => load.carrierApprovalStatus === 'PENDING') || loads.find((load) => load.status === 'available' || load.status === 'accepted') || null
  const devApprovalPickup = devApprovalLoad ? mapLocations.find((location) => location.id === devApprovalLoad.pickupLocationId) : null
  const devApprovalDelivery = devApprovalLoad ? mapLocations.find((location) => location.id === devApprovalLoad.deliveryLocationId) : null
  const updatePodVerification = (field, checked) => setLoads((current) => current.map((load) => { if (load.id !== selectedLoadId || !load.pod) return load; const verification = { signature: false, pieceCount: false, damage: false, deliveryInfo: false, ...(load.pod.verification || {}), [field]: checked }; const verified = Object.values(verification).every(Boolean); return { ...load, pod: { ...load.pod, verification, verified, verifiedGameMinute: verified ? gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay : null } } }))

  return (
    <aside className={`phone-overlay ${screen === 'scheduler' ? 'scheduler-expanded' : ''}`} aria-label="DOC OS operations device">
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
              <span className="phone-reset-kicker">IPHONE DEV TOOLS</span>
              <strong id="phone-dev-title">DOC OS Development</strong>
              <p>Shortcuts for repeated gameplay testing. These controls only change the current test save.</p>

              <div className="phone-dev-tool-list">
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
                    <b>{carriers.some((carrier) => carrier.status === 'active') ? 'CARRIER READY' : 'CARRIER REQUIRED'}</b>
                    <small>Restart Day 1 at 6:00 AM for planning tests while keeping the accepted carrier, signed agreement, profile, and driver roster.</small>
                  </div>
                  <button
                    type="button"
                    disabled={!carriers.some((carrier) => carrier.status === 'active')}
                    onClick={() => {
                      const reset = onResetDayAfterCarrierApproval?.()
                      if (reset !== false) setDevToolsOpen(false)
                    }}
                  >
                    RESET DAY
                  </button>
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
                    <button type="button" disabled={!devApprovalLoad} onClick={() => setLoads((current) => current.map((load) => load.id === devApprovalLoad?.id ? { ...load, carrierApprovalStatus: null, carrierApprovalRequestedGameMinute: null, carrierApprovedGameMinute: null } : load))}>CLEAR</button>
                  </div>
                </div>
              </div>

              <div className="phone-reset-actions phone-dev-actions">
                <button type="button" onClick={() => setDevToolsOpen(false)}>CLOSE</button>
                <button type="button" className="danger" onClick={() => { onResetGame?.(); setDevToolsOpen(false) }}>RESET GAME</button>
              </div>
            </div>
          </div>
        )}
        <div className="phone-app-viewport">

      {screen === 'home' ? (
        <HomeScreen onOpenBrowser={() => setScreen('browser')} onOpenDocuments={() => setScreen('documents')} onOpenLedger={() => { onOpenLedger?.(); setScreen('ledger') }} onOpenMessages={() => setScreen('messages')} onOpenEmail={() => setScreen('email')} emailBadgeCount={emailUnreadCount} messagesBadgeCount={driverMessageUnreadCount} documentsBadgeCount={documentsBadgeCount} ledgerUnreadCount={ledgerUnreadCount} />
      ) : screen === 'messages' ? (
        <MessagesScreen
          messages={driverMessages}
          drivers={drivers}
          onBack={() => setScreen('home')}
          onOpenThread={(driverId) => { setSelectedDriverId(driverId); setScreen('messageThread') }}
        />
      ) : screen === 'messageThread' ? (
        <DriverMessageThreadScreen
          driver={drivers.find((driver) => driver.id === selectedDriverId) || null}
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
        <EmailScreen messages={emailMessages} carriers={carriers} currentGameMinute={nowGameMinute} onBack={() => setScreen('home')} onCompose={() => openComposer({ workflowType: 'general', label: 'NEW EMAIL', subject: '', body: '' })} onOpenMessage={(message) => { setEmailMessages?.((current) => current.map((item) => item.id === message.id ? { ...item, read: true } : item)); setSelectedEmailId(message.id); setEmailReturnScreen('email'); setScreen('emailDetail') }} />
      ) : screen === 'emailCompose' ? (
        <EmailComposeScreen contacts={emailContacts} attachments={emailAttachments} context={emailComposeContext} onBack={() => setScreen(emailComposeContext.returnScreen || 'email')} onSend={sendOperationalEmail} onOpenAttachment={openAttachment} />
      ) : screen === 'emailDetail' ? (
        <EmailDetailScreen message={emailMessages.find((item) => item.id === selectedEmailId)} loads={loads} carrier={carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId)} onBack={() => { setScreen(emailReturnScreen || 'email') }} onReview={(destination) => { setScreen(destination === 'freightlink' ? 'loadBoard' : destination === 'agreement' ? 'agreement' : 'carrierSource') }} onOpenAttachment={openAttachment} onOpenRelated={(type, id) => { if (type === 'schedule') { const related = loads.find((item) => item.id === id); setSelectedLoadId(null); setSelectedDriverId(related?.candidateDriverId || related?.assignedDriverId || null); setScreen('scheduler'); return } if (type === 'load') { setSelectedLoadId(id); setScreen('loadDetails') } else if (type === 'pod') { setDocumentReturnScreen('emailDetail'); setSelectedLoadId(id); setScreen('podDetail') } else if (type === 'invoice') { setSelectedLoadId(id); setScreen('ledgerReceivable') } else if (type === 'document') { setDocumentReturnScreen('emailDetail'); setSelectedBusinessDocumentId(id); setScreen('businessDocumentDetail') } }} />
      ) : screen === 'agreement' ? (
        <DispatchAgreementScreen
          carrier={carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId) || carriers[0]}
          dispatcherProfile={dispatcherProfile}
          gameTime={gameTime}
          onBack={() => setScreen('emailDetail')}
          onAccept={() => { const carrierId = carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId)?.id || carriers[0]?.id; if (carrierId) onAcceptAgreement?.(carrierId); setScreen('email') }}
        />
      ) : screen === 'ledger' ? (
        <LedgerDeskScreen loads={loads} carriers={carriers} ledgerWorkflowByLoadId={ledgerWorkflowByLoadId} onBack={() => setScreen('home')} onOpenReceivable={(item) => { setSelectedLoadId(item.loadId); setScreen('ledgerReceivable') }} />
      ) : screen === 'ledgerReceivable' ? (
        <LedgerReceivableScreen receivable={getReceivable(loads, carriers, ledgerWorkflowByLoadId, selectedLoadId)} currentGameMinute={gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay} onBack={() => setScreen('ledger')} onAction={(action) => { const current = ledgerWorkflowByLoadId[selectedLoadId] || {}; if (action === 'create') { setLedgerWorkflowByLoadId((previous) => { const numbers = Object.values(previous).map((item) => Number(String(item.invoiceNumber || '').replace('INV-', ''))).filter(Number.isFinite); const next = Math.max(0, ...numbers) + 1; const existing = previous[selectedLoadId] || {}; return { ...previous, [selectedLoadId]: { ...existing, financialStatus: 'DRAFT', invoiceNumber: existing.invoiceNumber || `INV-${String(next).padStart(4, '0')}`, invoiceCreatedGameMinute: existing.invoiceCreatedGameMinute ?? gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay, invoiceSentGameMinute: null, paymentReceivedGameMinute: null } } }) } if (action === 'send') { const load = loads.find((item) => item.id === selectedLoadId); const carrier = carriers.find((item) => item.id === load?.carrierId) || carriers[0]; openComposer({ workflowType: 'invoice-submission', label: 'INVOICE SUBMISSION', loadId: selectedLoadId, loadNumber: load ? getFreightRouteName(load) : 'Route', suggestedRecipientId: `${carrier?.id || 'metroline'}-accounting`, subject: `Invoice ${current.invoiceNumber || ''} · ${load ? getFreightRouteName(load) : 'Route'}`, body: `Hello,\n\nPlease find our dispatch invoice and supporting POD attached for ${load ? getFreightRouteName(load) : 'Route'}.\n\nThank you,\nDOC OS Dispatch`, returnScreen: 'ledgerReceivable' }) }; if (action === 'pay') setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'PAID', paymentReceivedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay } }) }} />
      ) : screen === 'documents' ? (
        <DocumentsScreen loads={loads} businessDocuments={businessDocuments} ledgerWorkflowByLoadId={ledgerWorkflowByLoadId} activeTab={documentsTab} onChangeTab={setDocumentsTab} onBack={() => setScreen('home')} onOpenLoad={(id) => { setSelectedLoadId(id); setScreen('loadDetails') }} onOpenInvoice={(id) => { setSelectedLoadId(id); setScreen('ledgerReceivable') }} onOpenBusinessDocument={(id) => { setDocumentReturnScreen('documents'); setSelectedBusinessDocumentId(id); setScreen('businessDocumentDetail') }} onOpenPod={(id) => { const load = loads.find((item) => item.id === id); if (load?.pod && !load.pod.approved && !Number.isFinite(load.pod.viewedGameMinute)) { const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay; setLoads((current) => current.map((item) => item.id === id ? { ...item, pod: { ...item.pod, viewedGameMinute: now } } : item)) } setDocumentReturnScreen('documents'); setSelectedLoadId(id); setScreen('podDetail') }} />
      ) : screen === 'businessDocumentDetail' ? (
        <BusinessDocumentDetailScreen document={businessDocuments.find((document) => document.id === selectedBusinessDocumentId)} onBack={() => { if (documentReturnScreen === 'documents') setDocumentsTab('archive'); setScreen(documentReturnScreen || 'documents') }} />
      ) : screen === 'podDetail' ? (
        <PodDetailScreen load={loads.find((load) => load.id === selectedLoadId)} driver={drivers.find((driver) => driver.id === (loads.find((load) => load.id === selectedLoadId)?.assignedDriverId ?? loads.find((load) => load.id === selectedLoadId)?.completedDriverId))} delivery={mapLocations.find((location) => location.id === loads.find((load) => load.id === selectedLoadId)?.deliveryLocationId)} readOnly={Boolean(loads.find((load) => load.id === selectedLoadId)?.pod?.approved)} onUpdateVerification={updatePodVerification} onApprovePod={() => onApprovePod?.(selectedLoadId)} onRequestCorrection={() => { const load = loads.find((item) => item.id === selectedLoadId); const carrier = carriers.find((item) => item.id === load?.carrierId) || carriers[0]; openComposer({ workflowType: 'pod-correction', label: 'POD CORRECTION', loadId: selectedLoadId, loadNumber: load ? getFreightRouteName(load) : 'Route', suggestedRecipientId: `${carrier?.id || 'metroline'}-documents`, subject: `POD correction required · ${load ? getFreightRouteName(load) : 'Route'}`, body: `Hello,\n\nThe submitted POD does not match the shipment record. Please review the attached POD and exception documentation and return a corrected copy.\n\nThank you,\nDOC OS Dispatch`, returnScreen: 'podDetail' }) }} onBack={() => setScreen(documentReturnScreen || 'documents')} />
      ) : screen === 'dispatcherProfile' ? (
        <BrowserScreen page="carriersource.local/signup" onBack={() => setScreen('carrierSource')} onHome={() => setScreen('browser')} showSiteBranding={false}><DispatcherProfileScreen profile={dispatcherProfile} onBack={() => setScreen('carrierSource')} onSave={(profile) => { onSaveDispatcherProfile?.(profile); setScreen('carrierSource') }} /></BrowserScreen>
      ) : screen === 'carrierSource' || screen === 'carrierOpportunity' ? (
        <BrowserScreen page="carriersource.local" onBack={() => setScreen(screen === 'carrierSource' ? 'browser' : 'carrierSource')} onHome={() => setScreen('browser')} siteTitle="CARRIERSOURCE" siteSubtitle="Carrier Network" showSiteBranding={false}><>{screen === 'carrierSource' && <CarrierSourceScreen carrier={carriers[0]} application={carrierApplicationsById.metroline} dispatcherProfile={dispatcherProfile} onSignUp={() => setScreen('dispatcherProfile')} onOpen={() => setScreen('carrierOpportunity')} />}{screen === 'carrierOpportunity' && <CarrierOpportunityScreen carrier={carriers[0]} driver={drivers.find((driver) => driver.id === carriers[0]?.driverIds?.[0])} application={carrierApplicationsById.metroline} dispatcherProfile={dispatcherProfile} onApply={() => dispatcherProfile?.created ? onApplyCarrier?.(carriers[0]?.id) : setScreen('dispatcherProfile')} onOpenOffer={() => setScreen('email')} />}</></BrowserScreen>
      ) : screen === 'browser' || screen === 'loadBoard' || screen === 'loadDetails' || screen === 'scheduler' || screen === 'driverFit' || screen === 'tripPlan' || screen === 'routePlanning' ? (
        <BrowserScreen
          page={screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'freightlink.local' : screen === 'loadDetails' ? `freightlink.local/load/${selectedLoadId}` : screen === 'scheduler' ? 'freightlink.local/scheduler' : screen === 'driverFit' ? `freightlink.local/load/${selectedLoadId}/driver-select` : screen === 'tripPlan' ? `freightlink.local/load/${selectedLoadId}/trip-plan` : `freightlink.local/load/${selectedLoadId}/route`}
          freightLinkLocked={!hasActiveCarrier}
          onOpenFreightLink={() => { if (hasActiveCarrier) setScreen('loadBoard') }}
          onOpenCarrierSource={() => setScreen('carrierSource')}
          onBack={() => {
            if (screen === 'browser') setScreen('home')
            else if (screen === 'loadBoard') setScreen('browser')
            else if (screen === 'loadDetails') setScreen('loadBoard')
            else if (screen === 'scheduler') setScreen('loadBoard')
            else if (screen === 'driverFit') setScreen('loadDetails')
            else if (screen === 'tripPlan') setScreen('loadDetails')
            else if (screen === 'routePlanning') setScreen('loadDetails')
          }}
          onHome={() => setScreen('browser')}
          showSiteBranding={false}
        >
          {screen === 'loadBoard' && <LoadBoardScreen embedded loads={loads} drivers={drivers} runtimePositions={runtimePositions} gameTime={gameTime} operationDay={operationDay} onSelectLoad={(loadId) => { setSelectedLoadId(loadId); setScreen('loadDetails') }} onOpenScheduler={() => { setSelectedLoadId(null); setSelectedDriverId(drivers.find((driver) => driver.carrierId)?.id || null); setScreen('scheduler') }} />}
          {screen === 'loadDetails' && <LoadDetailsScreen loads={loads} drivers={drivers} carriers={carriers} loadId={selectedLoadId} onAddToSchedule={(loadId) => onAddToSchedule?.(loadId)} onOpenScheduler={async (loadId) => { const target = loads.find((item) => item.id === loadId); if (target?.status === 'available' && !target.scheduleApprovalQueued) { const ok = target.candidateDriverId ? true : await onAddToSchedule?.(loadId); if (ok === false) return; setLoads((current) => current.map((item) => item.id === loadId ? { ...item, scheduleApprovalQueued: true } : item)); } setSelectedLoadId(loadId); setSelectedDriverId(target?.candidateDriverId || target?.assignedDriverId || drivers.find((driver) => driver.carrierId)?.id || null); setScreen('scheduler') }} onSendLoadDetails={(loadId, driverId) => { const targetLoad = loads.find((item) => item.id === loadId); if (!Number.isFinite(targetLoad?.pickupDriverBriefedGameMinute)) onSendDriverLoadUpdate?.(loadId, driverId); setSelectedLoadId(loadId); setSelectedDriverId(driverId); setMessageLoadContextId(loadId); setScreen('messageThread') }} onBack={() => setScreen('loadBoard')} />}
          {screen === 'scheduler' && <FleetSchedulerScreen loads={loads} drivers={drivers} carriers={carriers} gameTime={gameTime} focusLoadId={selectedLoadId} initialDriverId={selectedDriverId} onBackToFreightLink={() => setScreen('loadBoard')} onRequestScheduleApproval={(driverId) => onRequestScheduleApproval?.(driverId)} onBookRoute={(loadId) => onAcceptCandidateAssignment?.(loadId)} onBookApprovedSchedule={(driverId) => onBookApprovedSchedule?.(driverId)} onRemoveFromPlan={(loadId) => onRemoveScheduleLoad?.(loadId)} onSendDriverSchedule={(driverId) => onSendDriverSchedule?.(driverId)} />}
          {screen === 'driverFit' && <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} loads={loads} drivers={drivers} runtimePositions={runtimePositions} gameTime={gameTime} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onEvaluate={(driverId, fit) => {
            onEvaluateFit(selectedLoadId, driverId, fit)
            setScreen('tripPlan')
          }} />}
          {screen === 'tripPlan' && <TripPlanScreen loads={loads} drivers={drivers} carriers={carriers} loadId={selectedLoadId} onChangeDriver={() => setScreen('driverFit')} onRequestCarrierApproval={(loadId, sendApproval = false) => { setLoads((current) => current.map((load) => load.id === loadId ? { ...load, scheduleApprovalQueued: true, carrierApprovalStatus: sendApproval ? (load.carrierApprovalStatus || null) : load.carrierApprovalStatus } : load)); if (sendApproval) setScreen('loadBoard') }} onViewCarrierApproval={(loadId) => { const load = loads.find((item) => item.id === loadId); const emailId = load?.carrierApprovalEmailId; if (emailId && emailMessages.some((message) => message.id === emailId)) { setSelectedEmailId(emailId); setEmailReturnScreen('tripPlan'); setScreen('emailDetail') } else { const fallback = [...emailMessages].reverse().find((message) => message.loadId === loadId && message.workflowType === 'carrier-approval'); if (fallback) { setSelectedEmailId(fallback.id); setEmailReturnScreen('tripPlan'); setScreen('emailDetail') } else setScreen('email') } }} onBook={(loadId) => { const accepted = onAcceptCandidateAssignment?.(loadId); if (accepted !== false) setScreen('tripPlan') }} onOpenDriverThread={(loadId, driverId) => { setSelectedLoadId(loadId); setSelectedDriverId(driverId); setMessageLoadContextId(loadId); setScreen('messageThread') }} onBack={() => setScreen('loadDetails')} />}
          {screen === 'routePlanning' && <RoutePlanningScreen loads={loads} plannedRoute={plannedRoute} setPlannedRoute={setPlannedRoute} loadId={selectedLoadId} drivers={drivers} onSelectRoute={() => setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, selectedRouteId: 'recommended', plannedMiles: plannedRoute.distanceMiles, plannedDriveTimeMinutes: plannedRoute.durationMinutes } : load))} onBack={() => setScreen('loadDetails')} onContinue={() => { setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'route-ready' } : load)); setScreen('loadDetails') }} />}
        </BrowserScreen>
      ) : null}
        </div>
        {previewAttachment && <OperationalDocumentViewer attachment={previewAttachment} loads={loads} workflows={ledgerWorkflowByLoadId} businessDocuments={businessDocuments} onClose={() => setPreviewAttachment(null)} />}
        <div className="phone-navigation-bar">
          <button type="button" className="phone-home-button" onClick={() => setScreen('home')} aria-label="Phone home">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.5 12 4l7.5 6.5v8.75H14v-5.5h-4v5.5H4.5V10.5Z"/></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default PhoneOverlay
