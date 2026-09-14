import { getAgreementRules } from '../utils/carrierAgreement.js'
import {
  getCarrierSourceAccountType,
  getCarrierSourceDescription,
  getCarrierSourceInitials,
  getCarrierSourceLocation,
  getCarrierSourceStanding,
  isCarrierSourceActive,
} from '../utils/carrierSource.js'

function CarrierOpportunityScreen({ carrier, drivers = [], onApply, onOpenOffer, application, dispatcherProfile, career }) {
  if (!carrier) return <div className="phone-page carrier-detail-screen"><p>Carrier opportunity unavailable.</p></div>
  const status = application?.status
  const active = isCarrierSourceActive(carrier, application)
  const offer = status === 'OFFER_RECEIVED'
  const pending = status === 'PENDING'
  const rules = getAgreementRules(carrier)
  const carrierDrivers = carrier.driverIds?.map((driverId) => drivers.find((driver) => driver.id === driverId)).filter(Boolean) || []
  return <div className="phone-page carrier-detail-screen carrier-posting-v2">
    <header className="docos-page-hero carrier-posting-hero"><span className="docos-page-kicker">{active?'MY CARRIER':'CARRIER OPPORTUNITY'}</span><div className="carrier-posting-company"><div className="carrier-job-logo large">{getCarrierSourceInitials(carrier)}</div><div><h2>{carrier.name}</h2><p>{getCarrierSourceLocation(carrier)} · {getCarrierSourceAccountType(carrier).replace('Dispatch', 'dispatch')} account</p></div></div><span className={`carrier-job-status ${active?'active':offer?'offer':pending?'pending':'prospect'}`}>{active?'ACTIVE AGREEMENT':offer?'OFFER RECEIVED':pending?'APPLICATION PENDING':'OPEN OPPORTUNITY'}</span></header>
    <div className="docos-page-body">
      <section className="docos-section"><div className="docos-section-heading"><span>{active?'ACCOUNT OVERVIEW':'ABOUT THE CARRIER'}</span></div><div className="docos-panel"><p className="carrier-posting-description">{getCarrierSourceDescription(carrier)}</p><div className="docos-fact-list"><div><span>Fleet</span><strong>{carrier.fleetSize} driver{Number(carrier.fleetSize) === 1 ? '' : 's'}</strong></div><div><span>Equipment</span><strong>{rules.equipmentScope.join(', ')}</strong></div><div><span>Preferred Region</span><strong>{rules.preferredRegion}</strong></div><div><span>Home Base</span><strong>{getCarrierSourceLocation(carrier)}</strong></div></div></div></section>
      <section className="docos-section"><div className="docos-section-heading"><span>LIVE AGREEMENT TERMS</span></div><div className="docos-panel docos-fact-list"><div><span>Dispatch Fee</span><strong>{rules.percentage}% of carrier gross</strong></div><div><span>Booking Authority</span><strong>{rules.loadApprovalRequired?'Carrier approval required':'Dispatcher authorized'}</strong></div><div><span>Rate Preference</span><strong>{rules.minimumRatePerLoadedMile?`$${rules.minimumRatePerLoadedMile.toFixed(2)}+ / loaded mi`:'Flexible'}</strong></div><div><span>Payment Terms</span><strong>{rules.paymentTermsDays} day</strong></div></div></section>
      {active && <section className="docos-section"><div className="docos-section-heading"><span>RELATIONSHIP & ROSTER</span></div><div className="docos-panel docos-fact-list"><div><span>Carrier Relationship</span><strong>{getCarrierSourceStanding(carrier, career)}</strong></div><div><span>Dispatcher</span><strong>{dispatcherProfile?.displayName || 'Independent Dispatcher'}</strong></div></div>{carrierDrivers.map((driver) => <div key={driver.id} className="docos-panel carrier-driver-row-v2"><span className="driver-avatar-v2">{String(driver.fullName || driver.name || 'D')[0]}</span><div><strong>{driver.fullName || driver.name}</strong><small>{driver.equipment?.label || rules.equipmentScope[0]}</small></div><span className="docos-status-text">ACTIVE</span></div>)}</section>}
      {!active && (pending ? <div className="docos-state-card pending"><span>APPLICATION SUBMITTED</span><strong>{carrier.name} is reviewing your profile.</strong><p>{dispatcherProfile?.displayName} will be notified when an agreement is ready.</p></div> : offer ? <><div className="docos-state-card offer"><span>AGREEMENT READY</span><strong>{carrier.name} sent your dispatch agreement.</strong><p>Review the live operating terms before activating the carrier.</p></div><div className="docos-sticky-actions"><button className="docos-primary-action" onClick={onOpenOffer}>OPEN AGREEMENT EMAIL</button></div></> : <div className="docos-sticky-actions"><button className="docos-primary-action" onClick={onApply}>APPLY WITH PROFILE</button></div>)}
    </div>
  </div>
}
export default CarrierOpportunityScreen
