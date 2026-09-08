import { useRef, useState } from 'react'
import HomeScreen from './HomeScreen.jsx'
import LoadDetailsScreen from './LoadDetailsScreen.jsx'
import LoadBoardScreen from './LoadBoardScreen.jsx'
import RoutePlanningScreen from './RoutePlanningScreen.jsx'
import BrowserScreen from './BrowserScreen.jsx'
import DriverFitScreen from './DriverFitScreen.jsx'
import DocumentsScreen from './DocumentsScreen.jsx'
import PodDetailScreen from './PodDetailScreen.jsx'
import CarrierSourceScreen from './CarrierSourceScreen.jsx'
import CarrierOpportunityScreen from './CarrierOpportunityScreen.jsx'
import LedgerDeskScreen from './LedgerDeskScreen.jsx'
import LedgerReceivableScreen from './LedgerReceivableScreen.jsx'
import EmailScreen from './EmailScreen.jsx'
import EmailDetailScreen from './EmailDetailScreen.jsx'
import DispatchAgreementScreen from './DispatchAgreementScreen.jsx'
import MessagesScreen from './MessagesScreen.jsx'
import DriverMessageThreadScreen from './DriverMessageThreadScreen.jsx'
import BusinessDocumentDetailScreen from './BusinessDocumentDetailScreen.jsx'
import mapLocations from '../data/mapLocations.js'
import { getReceivables } from '../utils/ledger.js'
import { formatTime } from '../utils/gameTime.js'

function getReceivable(loads, carriers, workflows, id) { return getReceivables(loads, carriers, workflows).find((item) => item.loadId === id) }

function PhoneOverlay({ loads, setLoads, drivers, setDrivers, carriers = [], operationDay = 1, carrierApplicationsById = {}, onApplyCarrier, onBeginCarrierWait, onAcceptAgreement, onApprovePod, emailMessages = [], setEmailMessages, driverMessages = [], businessDocuments = [], driverMessageUnreadCount = 0, onReadDriverMessage, onSendDriverLoadUpdate, onSendDriverQuickReply, onDispatchDriverFromMessage, onPlanDeliveryRoute, runtimePositions = {}, plannedRoute, setPlannedRoute, gameTime, onEvaluateFit, onAcceptCandidateAssignment, onPlanTrip, onOpenFreightMap, tutorialEnabled = false, initialScreen = 'home', initialLoadId = null, initialDriverId = null, documentsBadgeCount = 0, ledgerUnreadCount = 0, emailUnreadCount = 0, onOpenLedger, ledgerWorkflowByLoadId = {}, setLedgerWorkflowByLoadId, onResetGame, onClose }) {
  const [screen, setScreen] = useState(initialScreen)
  const [documentsTab, setDocumentsTab] = useState('pending')
  const [selectedLoadId, setSelectedLoadId] = useState(initialLoadId)
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [selectedDriverId, setSelectedDriverId] = useState(initialDriverId)
  const [selectedBusinessDocumentId, setSelectedBusinessDocumentId] = useState(null)
  const [activeTutorialEmailId, setActiveTutorialEmailId] = useState(null)
  const [resetPromptOpen, setResetPromptOpen] = useState(false)
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
      setResetPromptOpen(true)
      if (navigator.vibrate) navigator.vibrate(25)
    }, 900)
  }

  const selectedLoad = loads.find((load) => load.id === selectedLoadId)
  const roundTwo = emailMessages.find((message) => message.id === 'mentor-round-two')
  const tutorialLoadId = roundTwo ? 'DOC002' : 'DOC001'
  const tutorialLoad = loads.find((load) => load.id === tutorialLoadId)
  const tutorialReceivable = getReceivable(loads, carriers, ledgerWorkflowByLoadId, tutorialLoadId)
  const doc001Receivable = getReceivable(loads, carriers, ledgerWorkflowByLoadId, 'DOC001')
  let tutorialTarget = null
  if (tutorialEnabled) {
    const welcome = emailMessages.find((message) => message.id === 'mentor-welcome')
    const approval = emailMessages.find((message) => message.id === 'metroline-application-approved')
    const firstCarrier = emailMessages.find((message) => message.id === 'mentor-first-carrier')
    const completion = emailMessages.find((message) => message.id === 'mentor-tutorial-complete')
    const application = carrierApplicationsById.metroline
    if (screen === 'carrierOpportunity' && !application) tutorialTarget = 'apply-metroline'
    else if (screen === 'agreement' && application?.status === 'OFFER_RECEIVED') tutorialTarget = 'accept-agreement'
    else if (screen === 'carrierOpportunity' && application?.status === 'ACCEPTED' && firstCarrier && !firstCarrier.read) tutorialTarget = 'phone-home'
    else if (screen === 'loadDetails' && selectedLoadId === tutorialLoadId && selectedLoad?.tripStatus === 'assigned' && selectedLoad?.planningStatus !== 'route-ready') tutorialTarget = 'phone-close'
    else if (screen === 'documents' && tutorialLoad?.tripStatus === 'awaiting-pod' && !tutorialLoad?.pod?.approved && documentsTab === 'pending') tutorialTarget = `pod-card:${tutorialLoadId}`
    else if (screen === 'podDetail' && selectedLoadId === tutorialLoadId && tutorialLoad?.pod && !tutorialLoad.pod.approved) {
      const verification = { signature: false, pieceCount: false, damage: false, deliveryInfo: false, ...(tutorialLoad.pod.verification || {}) }
      const nextCheck = ['signature', 'pieceCount', 'damage', 'deliveryInfo'].find((key) => !verification[key])
      tutorialTarget = nextCheck ? `pod-check:${nextCheck}` : 'approve-pod'
    }
    else if (screen === 'documents' && tutorialLoad?.pod?.approved) tutorialTarget = 'phone-home'
    else if (screen === 'ledger' && tutorialLoadId === 'DOC002' && tutorialReceivable?.financialStatus === 'AWAITING_PAYMENT') tutorialTarget = 'phone-close'
    else if (screen === 'ledger' && tutorialReceivable && ['READY_TO_INVOICE', 'DRAFT', 'PAID'].includes(tutorialReceivable.financialStatus)) tutorialTarget = `ledger-card:${tutorialLoadId}`
    else if (screen === 'ledgerReceivable' && selectedLoadId === tutorialLoadId && tutorialReceivable?.financialStatus === 'READY_TO_INVOICE') tutorialTarget = 'create-invoice'
    else if (screen === 'ledgerReceivable' && selectedLoadId === tutorialLoadId && tutorialReceivable?.financialStatus === 'DRAFT') tutorialTarget = 'send-invoice'
    else if (screen === 'ledgerReceivable' && selectedLoadId === 'DOC001' && doc001Receivable?.financialStatus === 'AWAITING_PAYMENT') tutorialTarget = 'phone-home'
    else if (screen === 'ledgerReceivable' && selectedLoadId === 'DOC002' && tutorialReceivable?.financialStatus === 'AWAITING_PAYMENT') tutorialTarget = 'phone-close'
    else if (screen === 'ledgerReceivable' && selectedLoadId === tutorialLoadId && ['AWAITING_PAYMENT', 'PAID'].includes(tutorialReceivable?.financialStatus)) tutorialTarget = 'phone-home'
    else if (screen === 'home' && tutorialLoadId === 'DOC002' && tutorialReceivable?.financialStatus === 'AWAITING_PAYMENT') tutorialTarget = 'phone-close'
    else if (screen === 'home' && tutorialLoad?.tripStatus === 'awaiting-pod') tutorialTarget = 'documents-app'
    else if (screen === 'home' && tutorialReceivable && (['READY_TO_INVOICE', 'DRAFT'].includes(tutorialReceivable.financialStatus) || (tutorialReceivable.financialStatus === 'PAID' && ledgerUnreadCount > 0))) tutorialTarget = 'ledger-app'
    else if (screen === 'home' && ((completion && !completion.read) || (roundTwo && !roundTwo.read) || (approval && !approval.read) || (firstCarrier && !firstCarrier.read) || (welcome && !welcome.read))) tutorialTarget = 'email-app'
    else if (screen === 'email' && completion && !completion.read) tutorialTarget = 'email:mentor-tutorial-complete'
    else if (screen === 'email' && roundTwo && !roundTwo.read) tutorialTarget = 'email:mentor-round-two'
    else if (screen === 'email' && approval && !approval.read) tutorialTarget = 'email:metroline-application-approved'
    else if (screen === 'email' && firstCarrier && !firstCarrier.read) tutorialTarget = 'email:mentor-first-carrier'
    else if (screen === 'email' && welcome && !welcome.read) tutorialTarget = 'email:mentor-welcome'
    else if (screen === 'emailDetail' && activeTutorialEmailId === selectedEmailId && selectedEmailId === 'mentor-welcome') tutorialTarget = 'open-carriersource'
    else if (screen === 'emailDetail' && activeTutorialEmailId === selectedEmailId && selectedEmailId === 'metroline-application-approved') tutorialTarget = 'review-agreement'
    else if (screen === 'emailDetail' && activeTutorialEmailId === selectedEmailId && ['mentor-first-carrier', 'mentor-round-two'].includes(selectedEmailId)) tutorialTarget = 'open-freightlink'
    else if (screen === 'carrierSource' && !application) tutorialTarget = 'metroline-card'
  }
  const visualTutorialTarget = null // Tutorial presentation is intentionally dormant until the post-Day-3 tutorial pass.
  const updatePodVerification = (field, checked) => setLoads((current) => current.map((load) => { if (load.id !== selectedLoadId || !load.pod) return load; const verification = { signature: false, pieceCount: false, damage: false, deliveryInfo: false, ...(load.pod.verification || {}), [field]: checked }; const verified = Object.values(verification).every(Boolean); return { ...load, pod: { ...load.pod, verification, verified, verifiedGameMinute: verified ? gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay : null } } }))

  return (
    <aside className="phone-overlay" aria-label="DOC OS operations device">
      <div className="device-sheet-handle" aria-hidden="true" />
      <div className="phone-device-screen">
        <div className="phone-status-bar">
          <button
            type="button"
            className="phone-status-brand phone-reset-trigger"
            aria-label="Hold DOC OS to reset game"
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
        {resetPromptOpen && (
          <div className="phone-reset-overlay" role="dialog" aria-modal="true" aria-labelledby="phone-reset-title">
            <div className="phone-reset-dialog">
              <span className="phone-reset-kicker">DEVELOPER RESET</span>
              <strong id="phone-reset-title">Start a fresh game?</strong>
              <p>This clears the current DOC OS save and returns you to the beginning.</p>
              <div className="phone-reset-actions">
                <button type="button" onClick={() => setResetPromptOpen(false)}>CANCEL</button>
                <button type="button" className="danger" onClick={() => onResetGame?.()}>RESET GAME</button>
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
          driver={drivers.find((driver) => driver.id === (selectedDriverId || 'marcus')) || { id: 'marcus', fullName: 'Marcus Reed' }}
          messages={driverMessages.filter((message) => message.driverId === (selectedDriverId || 'marcus'))}
          activeLoads={loads.filter((load) => !['available', 'expired', 'completed', 'delivered'].includes(load.status) && !['expired', 'completed', 'delivered'].includes(load.tripStatus))}
          onBack={() => setScreen('messages')}
          onRead={onReadDriverMessage}
          onSendLoadUpdate={(loadId) => onSendDriverLoadUpdate?.(loadId, selectedDriverId || 'marcus')}
          onSendQuickReply={(body) => onSendDriverQuickReply?.(body, selectedDriverId || 'marcus')}
          onDispatchLoad={(loadId, phase) => onDispatchDriverFromMessage?.(loadId, selectedDriverId || 'marcus', phase)}
          onPlanDeliveryRoute={(loadId) => onPlanDeliveryRoute?.(loadId, selectedDriverId || 'marcus')}
        />
      ) : screen === 'email' ? (
        <EmailScreen messages={emailMessages} carriers={carriers} tutorialTarget={visualTutorialTarget} currentGameMinute={gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay} onBack={() => setScreen('home')} onOpenMessage={(message) => { const isCurrentTutorialEmail = tutorialTarget === `email:${message.id}`; setActiveTutorialEmailId(isCurrentTutorialEmail ? message.id : null); setEmailMessages?.((current) => current.map((item) => item.id === message.id ? { ...item, read: true } : item)); setSelectedEmailId(message.id); setScreen('emailDetail') }} />
      ) : screen === 'emailDetail' ? (
        <EmailDetailScreen message={emailMessages.find((item) => item.id === selectedEmailId)} carrier={carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId)} tutorialTarget={visualTutorialTarget} onBack={() => { setActiveTutorialEmailId(null); setScreen('email') }} onReview={(destination) => { setActiveTutorialEmailId(null); setScreen(destination === 'freightlink' ? 'loadBoard' : destination === 'agreement' ? 'agreement' : 'carrierSource') }} />
      ) : screen === 'agreement' ? (
        <DispatchAgreementScreen
          carrier={carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId) || carriers[0]}
          gameTime={gameTime}
          onBack={() => setScreen('emailDetail')}
          onAccept={() => { onAcceptAgreement?.(); setScreen('email') }}
        />
      ) : screen === 'ledger' ? (
        <LedgerDeskScreen loads={loads} carriers={carriers} ledgerWorkflowByLoadId={ledgerWorkflowByLoadId} tutorialTarget={visualTutorialTarget} onBack={() => setScreen('home')} onOpenReceivable={(item) => { setSelectedLoadId(item.loadId); setScreen('ledgerReceivable') }} />
      ) : screen === 'ledgerReceivable' ? (
        <LedgerReceivableScreen receivable={getReceivable(loads, carriers, ledgerWorkflowByLoadId, selectedLoadId)} tutorialTarget={visualTutorialTarget} currentGameMinute={gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay} onBack={() => setScreen('ledger')} onAction={(action) => { const current = ledgerWorkflowByLoadId[selectedLoadId] || {}; if (action === 'create') { const numbers = Object.values(ledgerWorkflowByLoadId).map((item) => Number(String(item.invoiceNumber || '').replace('INV-', ''))).filter(Number.isFinite); const next = Math.max(0, ...numbers) + 1; setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'DRAFT', invoiceNumber: `INV-${String(next).padStart(4, '0')}`, invoiceCreatedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay, invoiceSentGameMinute: null, paymentReceivedGameMinute: null } }) } if (action === 'send') { const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay; const tutorialPaymentDelay = 1440; setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'AWAITING_PAYMENT', invoiceSentGameMinute: now, paymentAvailableGameMinute: now + tutorialPaymentDelay } }) }; if (action === 'pay') setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'PAID', paymentReceivedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay } }) }} />
      ) : screen === 'documents' ? (
        <DocumentsScreen loads={loads} businessDocuments={businessDocuments} activeTab={documentsTab} tutorialTarget={visualTutorialTarget} onChangeTab={setDocumentsTab} onBack={() => setScreen('home')} onOpenBusinessDocument={(id) => { setSelectedBusinessDocumentId(id); setScreen('businessDocumentDetail') }} onOpenPod={(id) => { const load = loads.find((item) => item.id === id); if (load?.pod && !load.pod.approved && !Number.isFinite(load.pod.viewedGameMinute)) { const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay; setLoads((current) => current.map((item) => item.id === id ? { ...item, pod: { ...item.pod, viewedGameMinute: now } } : item)) } setSelectedLoadId(id); setScreen('podDetail') }} />
      ) : screen === 'businessDocumentDetail' ? (
        <BusinessDocumentDetailScreen document={businessDocuments.find((document) => document.id === selectedBusinessDocumentId)} onBack={() => { setDocumentsTab('archive'); setScreen('documents') }} />
      ) : screen === 'podDetail' ? (
        <PodDetailScreen tutorialTarget={visualTutorialTarget} load={loads.find((load) => load.id === selectedLoadId)} driver={drivers.find((driver) => driver.id === (loads.find((load) => load.id === selectedLoadId)?.assignedDriverId ?? loads.find((load) => load.id === selectedLoadId)?.completedDriverId))} delivery={mapLocations.find((location) => location.id === loads.find((load) => load.id === selectedLoadId)?.deliveryLocationId)} readOnly={Boolean(loads.find((load) => load.id === selectedLoadId)?.pod?.approved)} onUpdateVerification={updatePodVerification} onApprovePod={() => onApprovePod?.(selectedLoadId)} onBack={() => setScreen('documents')} />
      ) : screen === 'carrierSource' || screen === 'carrierOpportunity' ? (
        <BrowserScreen page="carriersource.local" onBack={() => setScreen(screen === 'carrierSource' ? 'browser' : 'carrierSource')} onHome={() => setScreen('browser')} siteTitle="CARRIERSOURCE" siteSubtitle="Carrier Opportunities" showSiteBranding={false}><>{screen === 'carrierSource' && <CarrierSourceScreen carrier={carriers[0]} application={carrierApplicationsById.metroline} tutorialTarget={visualTutorialTarget} onOpen={() => setScreen('carrierOpportunity')} />}{screen === 'carrierOpportunity' && <CarrierOpportunityScreen carrier={carriers[0]} driver={drivers.find((driver) => driver.id === carriers[0]?.driverIds?.[0])} application={carrierApplicationsById.metroline} tutorialTarget={visualTutorialTarget} onApply={() => { onApplyCarrier?.(); if (tutorialEnabled) onBeginCarrierWait?.() }} onOpenOffer={() => setScreen('email')} onContinue={() => setScreen('browser')} />}</></BrowserScreen>
      ) : screen === 'browser' || screen === 'loadBoard' || screen === 'loadDetails' || screen === 'driverFit' || screen === 'routePlanning' ? (
        <BrowserScreen
          page={screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'freightlink.local' : screen === 'loadDetails' ? `freightlink.local/load/${selectedLoadId}` : screen === 'driverFit' ? `freightlink.local/load/${selectedLoadId}/driver-select` : `freightlink.local/load/${selectedLoadId}/route`}
          onOpenFreightLink={() => setScreen('loadBoard')}
          onOpenCarrierSource={() => setScreen('carrierSource')}
          onBack={() => {
            if (screen === 'browser') setScreen('home')
            else if (screen === 'loadBoard') setScreen('browser')
            else if (screen === 'loadDetails') setScreen('loadBoard')
            else if (screen === 'driverFit') setScreen('loadDetails')
            else if (screen === 'routePlanning') setScreen('loadDetails')
          }}
          onHome={() => setScreen('browser')}
          showSiteBranding={false}
        >
          {screen === 'loadBoard' && <LoadBoardScreen embedded loads={loads} drivers={drivers} runtimePositions={runtimePositions} gameTime={gameTime} operationDay={operationDay} tutorialEnabled={tutorialEnabled} tutorialLoadId={tutorialLoadId} onOpenMarketMap={onOpenFreightMap} onSelectLoad={(loadId) => { setSelectedLoadId(loadId); setScreen('loadDetails') }} />}
          {screen === 'loadDetails' && <LoadDetailsScreen loads={loads} drivers={drivers} loadId={selectedLoadId} onCheckDriverFit={() => setScreen('driverFit')} onAccept={() => {
            const accepted = onAcceptCandidateAssignment?.(selectedLoadId)
            if (accepted !== false) setScreen('loadDetails')
          }} onPlanRoute={() => { const load = loads.find((item) => item.id === selectedLoadId); if (load?.assignedDriverId && onPlanTrip) onPlanTrip(selectedLoadId, load.assignedDriverId); else setScreen('routePlanning') }} onBack={() => setScreen('loadBoard')} />}
          {screen === 'driverFit' && <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} loads={loads} drivers={drivers} runtimePositions={runtimePositions} gameTime={gameTime} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onEvaluate={(driverId, fit) => {
            onEvaluateFit(selectedLoadId, driverId, fit)
            setScreen('loadDetails')
          }} />}
          {screen === 'routePlanning' && <RoutePlanningScreen loads={loads} plannedRoute={plannedRoute} setPlannedRoute={setPlannedRoute} loadId={selectedLoadId} drivers={drivers} tutorialEnabled={tutorialEnabled && selectedLoadId === tutorialLoadId} onSelectRoute={() => setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, selectedRouteId: 'recommended', plannedMiles: plannedRoute.distanceMiles, plannedDriveTimeMinutes: plannedRoute.durationMinutes } : load))} onBack={() => setScreen('loadDetails')} onContinue={() => { setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'route-ready' } : load)); setScreen('loadDetails') }} />}
        </BrowserScreen>
      ) : null}
        </div>
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
