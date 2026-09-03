import { useState } from 'react'
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
import mapLocations from '../data/mapLocations.js'
import { getReceivables } from '../utils/ledger.js'

function getReceivable(loads, carriers, workflows, id) { return getReceivables(loads, carriers, workflows).find((item) => item.loadId === id) }

function PhoneOverlay({ loads, setLoads, drivers, setDrivers, carriers = [], carrierApplicationsById = {}, onApplyCarrier, onAcceptAgreement, emailMessages = [], setEmailMessages, runtimePositions = {}, plannedRoute, setPlannedRoute, gameTime, onEvaluateFit, tutorialEnabled = false, initialScreen = 'home', initialLoadId = null, documentsBadgeCount = 0, ledgerUnreadCount = 0, emailUnreadCount = 0, onOpenLedger, ledgerWorkflowByLoadId = {}, setLedgerWorkflowByLoadId, onClose }) {
  const [screen, setScreen] = useState(initialScreen)
  const [documentsTab, setDocumentsTab] = useState('pending')
  const [selectedLoadId, setSelectedLoadId] = useState(initialLoadId)
  const [selectedEmailId, setSelectedEmailId] = useState(null)
  const [activeTutorialEmailId, setActiveTutorialEmailId] = useState(null)
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
    else if (screen === 'carrierOpportunity' && application?.status === 'PENDING') tutorialTarget = 'phone-home'
    else if (screen === 'carrierOpportunity' && application?.status === 'OFFER_RECEIVED') tutorialTarget = 'accept-agreement'
    else if (screen === 'carrierOpportunity' && application?.status === 'ACCEPTED') tutorialTarget = 'phone-home'
    else if (screen === 'loadDetails' && selectedLoadId === tutorialLoadId && selectedLoad?.tripStatus === 'assigned' && selectedLoad?.planningStatus !== 'route-ready') tutorialTarget = 'phone-close'
    else if (screen === 'documents' && tutorialLoad?.tripStatus === 'awaiting-pod' && !tutorialLoad?.pod?.approved && documentsTab === 'pending') tutorialTarget = `pod-card:${tutorialLoadId}`
    else if (screen === 'podDetail' && selectedLoadId === tutorialLoadId && tutorialLoad?.pod && !tutorialLoad.pod.approved) {
      const verification = { signature: false, pieceCount: false, damage: false, deliveryInfo: false, ...(tutorialLoad.pod.verification || {}) }
      const nextCheck = ['signature', 'pieceCount', 'damage', 'deliveryInfo'].find((key) => !verification[key])
      tutorialTarget = nextCheck ? `pod-check:${nextCheck}` : 'approve-pod'
    }
    else if (screen === 'documents' && tutorialLoad?.pod?.approved) tutorialTarget = 'phone-home'
    else if (screen === 'ledger' && tutorialReceivable && ['READY_TO_INVOICE', 'DRAFT', 'AWAITING_PAYMENT', 'PAID'].includes(tutorialReceivable.financialStatus)) tutorialTarget = `ledger-card:${tutorialLoadId}`
    else if (screen === 'ledgerReceivable' && selectedLoadId === tutorialLoadId && tutorialReceivable?.financialStatus === 'READY_TO_INVOICE') tutorialTarget = 'create-invoice'
    else if (screen === 'ledgerReceivable' && selectedLoadId === tutorialLoadId && tutorialReceivable?.financialStatus === 'DRAFT') tutorialTarget = 'send-invoice'
    else if (screen === 'ledgerReceivable' && selectedLoadId === 'DOC001' && doc001Receivable?.financialStatus === 'AWAITING_PAYMENT') tutorialTarget = 'phone-home'
    else if (screen === 'ledgerReceivable' && selectedLoadId === tutorialLoadId && ['AWAITING_PAYMENT', 'PAID'].includes(tutorialReceivable?.financialStatus)) tutorialTarget = 'phone-home'
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
  const updatePodVerification = (field, checked) => setLoads((current) => current.map((load) => { if (load.id !== selectedLoadId || !load.pod) return load; const verification = { signature: false, pieceCount: false, damage: false, deliveryInfo: false, ...(load.pod.verification || {}), [field]: checked }; const verified = Object.values(verification).every(Boolean); return { ...load, pod: { ...load.pod, verification, verified, verifiedGameMinute: verified ? gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay : null } } }))
  const approvePod = () => setLoads((current) => current.map((load) => load.id === selectedLoadId && load.tripStatus === 'awaiting-pod' && load.pod?.verified ? { ...load, tripStatus: 'delivered', status: 'delivered', pod: { ...load.pod, approved: true, approvedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay } } : load))

  return (
    <aside className="phone-overlay">
      <span className="phone-hardware-speaker" aria-hidden="true" />
      <button type="button" className={`phone-close-button ${tutorialTarget === 'phone-close' ? 'tutorial-target' : ''}`} onClick={onClose} aria-label="Close phone">×</button>
      <div className="phone-device-screen">
        <div className="phone-status-bar" aria-hidden="true">
          <span className="phone-status-brand">DOC OS</span>
          <span className="phone-status-icons">
            <svg className="phone-status-signal" viewBox="0 0 18 12"><rect x="1" y="8" width="2" height="3" rx=".6"/><rect x="5" y="6" width="2" height="5" rx=".6"/><rect x="9" y="3.5" width="2" height="7.5" rx=".6"/><rect x="13" y="1" width="2" height="10" rx=".6"/></svg>
            <svg className="phone-status-wifi" viewBox="0 0 18 12"><path d="M2 4.5c4.4-3.3 9.6-3.3 14 0M4.8 7.1c2.7-2 5.7-2 8.4 0M7.4 9.4c1-.7 2.2-.7 3.2 0"/></svg>
            <span className="phone-status-battery"><span /></span>
          </span>
        </div>
        <div className="phone-app-viewport">

      {screen === 'home' ? (
        <HomeScreen tutorialTarget={tutorialTarget} onOpenBrowser={() => setScreen('browser')} onOpenDocuments={() => setScreen('documents')} onOpenLedger={() => { onOpenLedger?.(); setScreen('ledger') }} onOpenEmail={() => setScreen('email')} emailBadgeCount={emailUnreadCount} documentsBadgeCount={documentsBadgeCount} ledgerUnreadCount={ledgerUnreadCount} />
      ) : screen === 'email' ? (
        <EmailScreen messages={emailMessages} carriers={carriers} tutorialTarget={tutorialTarget} onBack={() => setScreen('home')} onOpenMessage={(message) => { const isCurrentTutorialEmail = tutorialTarget === `email:${message.id}`; setActiveTutorialEmailId(isCurrentTutorialEmail ? message.id : null); setEmailMessages?.((current) => current.map((item) => item.id === message.id ? { ...item, read: true } : item)); setSelectedEmailId(message.id); setScreen('emailDetail') }} />
      ) : screen === 'emailDetail' ? (
        <EmailDetailScreen message={emailMessages.find((item) => item.id === selectedEmailId)} carrier={carriers.find((item) => item.id === emailMessages.find((entry) => entry.id === selectedEmailId)?.carrierId)} tutorialTarget={tutorialTarget} onBack={() => { setActiveTutorialEmailId(null); setScreen('email') }} onReview={(destination) => { setActiveTutorialEmailId(null); setScreen(destination === 'freightlink' ? 'loadBoard' : destination === 'agreement' ? 'carrierOpportunity' : 'carrierSource') }} />
      ) : screen === 'ledger' ? (
        <LedgerDeskScreen loads={loads} carriers={carriers} ledgerWorkflowByLoadId={ledgerWorkflowByLoadId} tutorialTarget={tutorialTarget} onBack={() => setScreen('home')} onOpenReceivable={(item) => { setSelectedLoadId(item.loadId); setScreen('ledgerReceivable') }} />
      ) : screen === 'ledgerReceivable' ? (
        <LedgerReceivableScreen receivable={getReceivable(loads, carriers, ledgerWorkflowByLoadId, selectedLoadId)} tutorialTarget={tutorialTarget} currentGameMinute={gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay} onBack={() => setScreen('ledger')} onAction={(action) => { const current = ledgerWorkflowByLoadId[selectedLoadId] || {}; if (action === 'create') { const numbers = Object.values(ledgerWorkflowByLoadId).map((item) => Number(String(item.invoiceNumber || '').replace('INV-', ''))).filter(Number.isFinite); const next = Math.max(0, ...numbers) + 1; setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'DRAFT', invoiceNumber: `INV-${String(next).padStart(4, '0')}`, invoiceCreatedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay, invoiceSentGameMinute: null, paymentReceivedGameMinute: null } }) } if (action === 'send') { const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay; const tutorialPaymentDelay = tutorialEnabled && ['DOC001', 'DOC002'].includes(selectedLoadId) ? 30 : 1440; setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'AWAITING_PAYMENT', invoiceSentGameMinute: now, paymentAvailableGameMinute: now + tutorialPaymentDelay } }) }; if (action === 'pay') setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'PAID', paymentReceivedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay } }) }} />
      ) : screen === 'documents' ? (
        <DocumentsScreen loads={loads} activeTab={documentsTab} tutorialTarget={tutorialTarget} onChangeTab={setDocumentsTab} onBack={() => setScreen('home')} onOpenPod={(id) => { const load = loads.find((item) => item.id === id); if (load?.pod && !load.pod.approved && !Number.isFinite(load.pod.viewedGameMinute)) { const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay; setLoads((current) => current.map((item) => item.id === id ? { ...item, pod: { ...item.pod, viewedGameMinute: now } } : item)) } setSelectedLoadId(id); setScreen('podDetail') }} />
      ) : screen === 'podDetail' ? (
        <PodDetailScreen tutorialTarget={tutorialTarget} load={loads.find((load) => load.id === selectedLoadId)} driver={drivers.find((driver) => driver.id === (loads.find((load) => load.id === selectedLoadId)?.assignedDriverId ?? loads.find((load) => load.id === selectedLoadId)?.completedDriverId))} delivery={mapLocations.find((location) => location.id === loads.find((load) => load.id === selectedLoadId)?.deliveryLocationId)} readOnly={Boolean(loads.find((load) => load.id === selectedLoadId)?.pod?.approved)} onUpdateVerification={updatePodVerification} onApprovePod={() => { approvePod(); setDocumentsTab('archive'); setScreen('documents') }} onBack={() => setScreen('documents')} />
      ) : screen === 'carrierSource' || screen === 'carrierOpportunity' ? (
        <BrowserScreen page="carriersource.local" onBack={() => setScreen(screen === 'carrierSource' ? 'browser' : 'carrierSource')} onHome={() => setScreen('browser')} siteTitle="CARRIERSOURCE" siteSubtitle="Carrier Opportunities"><>{screen === 'carrierSource' && <CarrierSourceScreen carrier={carriers[0]} application={carrierApplicationsById.metroline} tutorialTarget={tutorialTarget} onOpen={() => setScreen('carrierOpportunity')} />}{screen === 'carrierOpportunity' && <CarrierOpportunityScreen carrier={carriers[0]} application={carrierApplicationsById.metroline} tutorialTarget={tutorialTarget} onApply={() => { if (carrierApplicationsById.metroline?.status === 'OFFER_RECEIVED') onAcceptAgreement?.(); else onApplyCarrier?.() }} onContinue={() => setScreen('browser')} />}</></BrowserScreen>
      ) : screen === 'browser' || screen === 'loadBoard' || screen === 'loadDetails' || screen === 'driverFit' || screen === 'routePlanning' ? (
        <BrowserScreen
          page={screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'freightlink.local' : screen === 'loadDetails' ? `freightlink.local/load/${selectedLoadId}` : screen === 'driverFit' ? `freightlink.local/load/${selectedLoadId}/driver-fit` : `freightlink.local/load/${selectedLoadId}/route`}
          onOpenFreightLink={() => setScreen('loadBoard')}
          onOpenCarrierSource={() => setScreen('carrierSource')}
          onBack={() => setScreen(screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'browser' : 'loadDetails')}
          onHome={() => setScreen('browser')}
        >
          {screen === 'loadBoard' && <LoadBoardScreen embedded loads={loads} gameTime={gameTime} tutorialEnabled={tutorialEnabled} tutorialLoadId={tutorialLoadId} onSelectLoad={(loadId) => { setSelectedLoadId(loadId); setScreen('loadDetails') }} />}
          {screen === 'loadDetails' && <LoadDetailsScreen loads={loads} drivers={drivers} loadId={selectedLoadId} tutorialEnabled={tutorialEnabled && selectedLoadId === tutorialLoadId} showTutorialNote={selectedLoadId === 'DOC001'} onCheckDriverFit={() => setScreen('driverFit')} onAccept={() => { const currentLoad = loads.find((load) => load.id === selectedLoadId); const candidate = currentLoad?.candidateDriverId; const candidateDriver = drivers.find((driver) => driver.id === candidate); setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'accepted', tripStatus: 'assigned', planningStatus: null, deliveryPlanningStatus: null, assignedDriverId: candidate, candidateDriverId: null, carrierId: candidateDriver?.carrierId ?? null } : load)); setDrivers((currentDrivers) => currentDrivers.map((driver) => driver.id === candidate ? { ...driver, status: 'unavailable', assignedLoadId: selectedLoadId } : driver)) }} onPlanRoute={() => setScreen('routePlanning')} onDispatch={() => setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'dispatched' } : load))} onBack={() => setScreen('loadBoard')} />}
          {screen === 'driverFit' && <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} drivers={drivers} runtimePositions={runtimePositions} gameTime={gameTime} tutorialEnabled={tutorialEnabled && selectedLoadId === tutorialLoadId} showTutorialNote={selectedLoadId === 'DOC001'} tutorialTarget={tutorialTarget} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onEvaluate={(driverId, fit) => onEvaluateFit(selectedLoadId, driverId, fit)} onBack={() => setScreen('loadDetails')} />}
          {screen === 'routePlanning' && <RoutePlanningScreen loads={loads} plannedRoute={plannedRoute} setPlannedRoute={setPlannedRoute} loadId={selectedLoadId} drivers={drivers} tutorialEnabled={tutorialEnabled && selectedLoadId === tutorialLoadId} onSelectRoute={() => setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, selectedRouteId: 'recommended', plannedMiles: plannedRoute.distanceMiles, plannedDriveTimeMinutes: plannedRoute.durationMinutes } : load))} onBack={() => setScreen('loadDetails')} onContinue={() => { setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'route-ready' } : load)); setScreen('loadDetails') }} />}
        </BrowserScreen>
      ) : null}
        </div>
        <div className="phone-navigation-bar">
          <button type="button" className={`phone-home-button ${tutorialTarget === 'phone-home' ? 'tutorial-target' : ''}`} onClick={() => setScreen('home')} aria-label="Phone home">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.5 12 4l7.5 6.5v8.75H14v-5.5h-4v5.5H4.5V10.5Z"/></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default PhoneOverlay
