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
import mapLocations from '../data/mapLocations.js'
import { getReceivables } from '../utils/ledger.js'

function getReceivable(loads, carriers, workflows, id) { return getReceivables(loads, carriers, workflows).find((item) => item.loadId === id) }

function PhoneOverlay({ loads, setLoads, drivers, setDrivers, carriers = [], onActivateCarrier, runtimePositions = {}, plannedRoute, setPlannedRoute, gameTime, onEvaluateFit, initialScreen = 'home', initialLoadId = null, documentsBadgeCount = 0, ledgerUnreadCount = 0, onOpenLedger, ledgerWorkflowByLoadId = {}, setLedgerWorkflowByLoadId, onClose }) {
  const [screen, setScreen] = useState(initialScreen)
  const [documentsTab, setDocumentsTab] = useState('pending')
  const [selectedLoadId, setSelectedLoadId] = useState(initialLoadId)
  const updatePodVerification = (field, checked) => setLoads((current) => current.map((load) => { if (load.id !== selectedLoadId || !load.pod) return load; const verification = { signature: false, pieceCount: false, damage: false, deliveryInfo: false, ...(load.pod.verification || {}), [field]: checked }; const verified = Object.values(verification).every(Boolean); return { ...load, pod: { ...load.pod, verification, verified, verifiedGameMinute: verified ? gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay : null } } }))
  const approvePod = () => setLoads((current) => current.map((load) => load.id === selectedLoadId && load.tripStatus === 'awaiting-pod' && load.pod?.verified ? { ...load, tripStatus: 'delivered', status: 'delivered', pod: { ...load.pod, approved: true, approvedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay } } : load))

  return (
    <aside className="phone-overlay">
      <button type="button" className="phone-close-button" onClick={onClose} aria-label="Close phone">×</button>
      <div className="phone-app-viewport">

      {screen === 'home' ? (
        <HomeScreen onOpenBrowser={() => setScreen('browser')} onOpenDocuments={() => setScreen('documents')} onOpenLedger={() => { onOpenLedger?.(); setScreen('ledger') }} documentsBadgeCount={documentsBadgeCount} ledgerUnreadCount={ledgerUnreadCount} />
      ) : screen === 'ledger' ? (
        <LedgerDeskScreen loads={loads} carriers={carriers} ledgerWorkflowByLoadId={ledgerWorkflowByLoadId} onBack={() => setScreen('home')} onOpenReceivable={(item) => { setSelectedLoadId(item.loadId); setScreen('ledgerReceivable') }} />
      ) : screen === 'ledgerReceivable' ? (
        <LedgerReceivableScreen receivable={getReceivable(loads, carriers, ledgerWorkflowByLoadId, selectedLoadId)} currentGameMinute={gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay} onBack={() => setScreen('ledger')} onAction={(action) => { const current = ledgerWorkflowByLoadId[selectedLoadId] || {}; if (action === 'create') { const numbers = Object.values(ledgerWorkflowByLoadId).map((item) => Number(String(item.invoiceNumber || '').replace('INV-', ''))).filter(Number.isFinite); const next = Math.max(0, ...numbers) + 1; setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'DRAFT', invoiceNumber: `INV-${String(next).padStart(4, '0')}`, invoiceCreatedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay, invoiceSentGameMinute: null, paymentReceivedGameMinute: null } }) } if (action === 'send') setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'AWAITING_PAYMENT', invoiceSentGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay, paymentAvailableGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay + 1440 } }); if (action === 'pay') setLedgerWorkflowByLoadId({ ...ledgerWorkflowByLoadId, [selectedLoadId]: { ...current, financialStatus: 'PAID', paymentReceivedGameMinute: gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay } }) }} />
      ) : screen === 'documents' ? (
        <DocumentsScreen loads={loads} activeTab={documentsTab} onChangeTab={setDocumentsTab} onBack={() => setScreen('home')} onOpenPod={(id) => { const load = loads.find((item) => item.id === id); if (load?.pod && !load.pod.approved && !Number.isFinite(load.pod.viewedGameMinute)) { const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay; setLoads((current) => current.map((item) => item.id === id ? { ...item, pod: { ...item.pod, viewedGameMinute: now } } : item)) } setSelectedLoadId(id); setScreen('podDetail') }} />
      ) : screen === 'podDetail' ? (
        <PodDetailScreen load={loads.find((load) => load.id === selectedLoadId)} driver={drivers.find((driver) => driver.id === (loads.find((load) => load.id === selectedLoadId)?.assignedDriverId ?? loads.find((load) => load.id === selectedLoadId)?.completedDriverId))} delivery={mapLocations.find((location) => location.id === loads.find((load) => load.id === selectedLoadId)?.deliveryLocationId)} readOnly={Boolean(loads.find((load) => load.id === selectedLoadId)?.pod?.approved)} onUpdateVerification={updatePodVerification} onApprovePod={() => { approvePod(); setDocumentsTab('archive'); setScreen('documents') }} onBack={() => setScreen('documents')} />
      ) : screen === 'carrierSource' || screen === 'carrierOpportunity' ? (
        <BrowserScreen page="carriersource.local" onBack={() => setScreen(screen === 'carrierSource' ? 'browser' : 'carrierSource')} onHome={() => setScreen('browser')} siteTitle="CARRIERSOURCE" siteSubtitle="Carrier Opportunities"><>{screen === 'carrierSource' && <CarrierSourceScreen carrier={carriers[0]} onOpen={() => setScreen('carrierOpportunity')} />}{screen === 'carrierOpportunity' && <CarrierOpportunityScreen carrier={carriers[0]} applied={carriers[0]?.status === 'active'} onApply={() => onActivateCarrier?.('metroline')} onContinue={() => setScreen('browser')} />}</></BrowserScreen>
      ) : screen === 'browser' || screen === 'loadBoard' || screen === 'loadDetails' || screen === 'driverFit' || screen === 'routePlanning' ? (
        <BrowserScreen
          page={screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'freightlink.local' : screen === 'loadDetails' ? 'freightlink.local/load/DOC001' : screen === 'driverFit' ? 'freightlink.local/load/DOC001/driver-fit' : 'freightlink.local/load/DOC001/route'}
          onOpenFreightLink={() => setScreen('loadBoard')}
          onOpenCarrierSource={() => setScreen('carrierSource')}
          onBack={() => setScreen(screen === 'browser' ? 'home' : screen === 'loadBoard' ? 'browser' : 'loadDetails')}
          onHome={() => setScreen('browser')}
        >
          {screen === 'loadBoard' && <LoadBoardScreen embedded loads={loads} onSelectLoad={(loadId) => { setSelectedLoadId(loadId); setScreen('loadDetails') }} />}
          {screen === 'loadDetails' && <LoadDetailsScreen loads={loads} drivers={drivers} loadId={selectedLoadId} onCheckDriverFit={() => setScreen('driverFit')} onAccept={() => { const currentLoad = loads.find((load) => load.id === selectedLoadId); const candidate = currentLoad?.candidateDriverId; const candidateDriver = drivers.find((driver) => driver.id === candidate); setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'accepted', tripStatus: 'assigned', planningStatus: null, deliveryPlanningStatus: null, assignedDriverId: candidate, candidateDriverId: null, carrierId: candidateDriver?.carrierId ?? null } : load)); setDrivers((currentDrivers) => currentDrivers.map((driver) => driver.id === candidate ? { ...driver, status: 'unavailable' } : driver)) }} onPlanRoute={() => setScreen('routePlanning')} onDispatch={() => setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'dispatched' } : load))} onBack={() => setScreen('loadBoard')} />}
          {screen === 'driverFit' && <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} drivers={drivers} runtimePositions={runtimePositions} gameTime={gameTime} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onEvaluate={(driverId, fit) => onEvaluateFit(selectedLoadId, driverId, fit)} onBack={() => setScreen('loadDetails')} />}
          {screen === 'routePlanning' && <RoutePlanningScreen loads={loads} plannedRoute={plannedRoute} setPlannedRoute={setPlannedRoute} loadId={selectedLoadId} drivers={drivers} onSelectRoute={() => setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, selectedRouteId: 'recommended', plannedMiles: plannedRoute.distanceMiles, plannedDriveTimeMinutes: plannedRoute.durationMinutes } : load))} onBack={() => setScreen('loadDetails')} onContinue={() => { setLoads((currentLoads) => currentLoads.map((load) => load.id === selectedLoadId ? { ...load, status: 'route-ready' } : load)); setScreen('loadDetails') }} />}
        </BrowserScreen>
      ) : screen === 'loadDetails' ? (
        <LoadDetailsScreen
          loads={loads}
          drivers={drivers}
          loadId={selectedLoadId}
          onCheckDriverFit={() => setScreen('driverFit')}
          onAccept={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, status: 'accepted', assignedDriverId: load.candidateDriverId, candidateDriverId: null } : load
            )))
            setDrivers((currentDrivers) => currentDrivers.map((driver) => driver.id === loads.find((load) => load.id === selectedLoadId)?.candidateDriverId ? { ...driver, status: 'unavailable' } : driver))
          }}
          onPlanRoute={() => setScreen('routePlanning')}
          onDispatch={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, status: 'dispatched' } : load
            )))
          }}
          onBack={() => setScreen('loadBoard')}
        />
      ) : screen === 'driverFit' ? (
        <DriverFitScreen load={loads.find((load) => load.id === selectedLoadId)} drivers={drivers} gameTime={gameTime} candidateDriverId={loads.find((load) => load.id === selectedLoadId)?.candidateDriverId} onEvaluate={(driverId, fit) => onEvaluateFit(selectedLoadId, driverId, fit)} onBack={() => setScreen('loadDetails')} />
      ) : screen === 'routePlanning' ? (
        <RoutePlanningScreen
          loads={loads}
          plannedRoute={plannedRoute}
          setPlannedRoute={setPlannedRoute}
          gameTime={gameTime}
          onSelectRoute={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId
                ? { ...load, selectedRouteId: 'recommended', plannedMiles: plannedRoute.distanceMiles, plannedDriveTimeMinutes: plannedRoute.durationMinutes }
                : load
            )))
          }}
          loadId={selectedLoadId}
          drivers={drivers}
          onBack={() => setScreen('loadDetails')}
          onContinue={() => {
            setLoads((currentLoads) => currentLoads.map((load) => (
              load.id === selectedLoadId ? { ...load, status: 'route-ready' } : load
            )))
            setScreen('loadDetails')
          }}
        />
      ) : null}
      </div>
      <button type="button" className="phone-home-button" onClick={() => setScreen('home')} aria-label="Phone home">⌂</button>
    </aside>
  )
}

export default PhoneOverlay
