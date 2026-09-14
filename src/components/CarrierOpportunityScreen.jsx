import { getAgreementRules } from '../utils/carrierAgreement.js'
import {
  getCarrierSourceAccountType,
  getCarrierSourceDescription,
  getCarrierSourceEquipmentLabel,
  getCarrierSourceInitials,
  getCarrierSourceLocation,
  getCarrierSourceStanding,
  isCarrierSourceActive,
} from '../utils/carrierSource.js'

function relationshipScoreFor(carrier, career) {
  const value = Number.isFinite(Number(career?.relationshipScore)) ? Number(career.relationshipScore) : Number(carrier?.relationshipScore ?? 50)
  return Math.max(0, Math.min(100, value))
}

function serviceLabel(enabled, label) {
  return <span className={enabled ? 'required' : 'optional'}><i>{enabled ? '✓' : '–'}</i>{label}</span>
}

function CarrierOpportunityScreen({ carrier, drivers = [], onApply, onOpenOffer, application, dispatcherProfile, career }) {
  if (!carrier) return <div className="phone-page carrier-detail-screen"><p>Carrier opportunity unavailable.</p></div>
  const status = application?.status
  const active = isCarrierSourceActive(carrier, application)
  const offer = status === 'OFFER_RECEIVED'
  const pending = status === 'PENDING'
  const rules = getAgreementRules(carrier)
  const score = relationshipScoreFor(carrier, career)
  const strikeCount = Number(career?.strikeCount || 0)
  const performanceCount = Array.isArray(career?.performanceHistory) ? career.performanceHistory.length : 0
  const carrierDrivers = carrier.driverIds?.map((driverId) => drivers.find((driver) => driver.id === driverId)).filter(Boolean) || []

  return <div className="phone-page carrier-detail-screen carrier-posting-v2 cs-account-detail-b2">
    <header className="docos-page-hero carrier-posting-hero cs-carrier-hero-b2">
      <div className="cs-carrier-hero-kicker"><span>{active?'CARRIER ACCOUNT':'CARRIER OPPORTUNITY'}</span><span className={`carrier-job-status ${active?'active':offer?'offer':pending?'pending':'prospect'}`}>{active?'ACTIVE AGREEMENT':offer?'OFFER RECEIVED':pending?'APPLICATION PENDING':'OPEN OPPORTUNITY'}</span></div>
      <div className="carrier-posting-company"><div className="carrier-job-logo large">{getCarrierSourceInitials(carrier)}</div><div><h2>{carrier.name}</h2><p>{getCarrierSourceLocation(carrier)} · {getCarrierSourceAccountType(carrier).replace('Dispatch', 'dispatch')}</p></div></div>
      {active && <div className="cs-hero-relationship"><div><span>RELATIONSHIP</span><strong>{getCarrierSourceStanding(carrier, career)}</strong></div><div className="cs-account-health-score"><b>{Math.round(score)}</b><small>/100</small></div><div className="cs-relationship-track"><i style={{ width: `${score}%` }} /></div></div>}
    </header>

    <div className="docos-page-body cs-account-detail-body">
      <section className="docos-section cs-account-section">
        <div className="docos-section-heading"><span>{active?'ACCOUNT PROFILE':'ABOUT THE CARRIER'}</span></div>
        <div className="docos-panel cs-profile-panel-b2"><p className="carrier-posting-description">{getCarrierSourceDescription(carrier)}</p><div className="cs-account-metric-grid"><div><span>FLEET</span><strong>{carrier.fleetSize} driver{Number(carrier.fleetSize) === 1 ? '' : 's'}</strong></div><div><span>EQUIPMENT</span><strong>{getCarrierSourceEquipmentLabel(carrier)}</strong></div><div><span>REGION</span><strong>{rules.preferredRegion}</strong></div><div><span>HOME BASE</span><strong>{getCarrierSourceLocation(carrier)}</strong></div></div></div>
      </section>

      <section className="docos-section cs-account-section">
        <div className="docos-section-heading"><span>AGREEMENT TERMS</span><small>{active ? 'LIVE' : 'OFFER TERMS'}</small></div>
        <div className="cs-terms-grid-b2"><div className="primary"><span>DISPATCH FEE</span><strong>{rules.percentage}%</strong><small>of carrier gross</small></div><div><span>BOOKING</span><strong>{rules.loadApprovalRequired?'Approval':'Authorized'}</strong><small>{rules.loadApprovalRequired?'carrier confirms loads':'dispatcher may book'}</small></div><div><span>MIN RATE</span><strong>{rules.minimumRatePerLoadedMile?`$${rules.minimumRatePerLoadedMile.toFixed(2)}`:'Flexible'}</strong><small>{rules.minimumRatePerLoadedMile?'per loaded mile':'carrier discretion'}</small></div><div><span>PAYMENT</span><strong>{rules.paymentTermsDays} day</strong><small>dispatcher terms</small></div></div>
      </section>

      <section className="docos-section cs-account-section">
        <div className="docos-section-heading"><span>SERVICE STANDARDS</span></div>
        <div className="cs-service-standards-b2">{serviceLabel(rules.serviceExpectations.onTimeWindows, 'On-time windows')}{serviceLabel(rules.serviceExpectations.cleanPaperwork, 'Clean paperwork')}{serviceLabel(rules.serviceExpectations.driverCommunication, 'Driver communication')}</div>
      </section>

      {active && <>
        <section className="docos-section cs-account-section">
          <div className="docos-section-heading"><span>ACCOUNT HEALTH</span><small>{performanceCount ? `${performanceCount} REVIEWS` : 'LIVE'}</small></div>
          <div className="cs-health-grid-b2"><div><span>STANDING</span><strong>{getCarrierSourceStanding(carrier, career)}</strong></div><div><span>STRIKES</span><strong>{strikeCount}</strong></div><div><span>LEVEL</span><strong>{Number(career?.carrierLevel || 0)}</strong></div><div><span>CARRIER XP</span><strong>{Number(career?.carrierXp || 0)}</strong></div></div>
        </section>

        <section className="docos-section cs-account-section">
          <div className="docos-section-heading"><span>DRIVER ROSTER</span><small>{carrierDrivers.length} ACTIVE</small></div>
          <div className="cs-driver-roster-b2">{carrierDrivers.map((driver) => <div key={driver.id} className="cs-driver-card-b2"><span className="driver-avatar-v2">{String(driver.fullName || driver.name || 'D')[0]}</span><div><strong>{driver.fullName || driver.name}</strong><small>{driver.equipment?.label || rules.equipmentScope[0]}</small></div><span className="cs-driver-live-dot"><i />ACTIVE</span></div>)}</div>
          <div className="cs-dispatcher-owner"><span>DISPATCHED BY</span><strong>{dispatcherProfile?.displayName || 'Independent Dispatcher'}</strong></div>
        </section>
      </>}

      {!active && (pending ? <div className="docos-state-card pending"><span>APPLICATION SUBMITTED</span><strong>{carrier.name} is reviewing your profile.</strong><p>{dispatcherProfile?.displayName} will be notified when an agreement is ready.</p></div> : offer ? <><div className="docos-state-card offer"><span>AGREEMENT READY</span><strong>{carrier.name} sent your dispatch agreement.</strong><p>Review the live operating terms before activating the carrier.</p></div><div className="docos-sticky-actions"><button className="docos-primary-action" onClick={onOpenOffer}>OPEN AGREEMENT EMAIL</button></div></> : <div className="docos-sticky-actions"><button className="docos-primary-action" onClick={onApply}>APPLY WITH PROFILE</button></div>)}
    </div>
  </div>
}
export default CarrierOpportunityScreen
