import { useState } from 'react'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import {
  getCarrierSourceAccountType,
  getCarrierSourceEquipmentLabel,
  getCarrierSourceInitials,
  getCarrierSourceLocation,
  getCarrierSourceMarketLabel,
  getCarrierSourceRosterLabel,
  getCarrierSourceStanding,
  getCarrierSourceSummary,
  getCarrierSourceStatus,
  isCarrierSourceActive,
} from '../utils/carrierSource.js'

function CarrierSourceScreen({ carriers = [], applicationsById = {}, careerById = {}, dispatcherProfile, onOpenCarrier, onSignUp }) {
  const hasActiveCarrier = carriers.some((carrier) => isCarrierSourceActive(carrier, applicationsById[carrier.id]))
  const [tab, setTab] = useState(hasActiveCarrier ? 'carriers' : 'opportunities')
  const featuredCarrier = carriers[0] || null

  if (!dispatcherProfile?.created) return <div className="phone-page carriersource-screen cs-public-landing">
    <header className="cs-public-top"><div className="cs-docos-brand"><strong>DOC OS</strong><span>CARRIERSOURCE · DISPATCHER NETWORK</span></div><button type="button" className="cs-signup-button" onClick={onSignUp}>SIGN UP</button></header>
    <section className="cs-search-panel"><div><span>⌕</span><p>Carrier name, equipment, or region</p></div><div><span>⌖</span><p>{dispatcherProfile?.homeMarket || getCarrierSourceLocation(featuredCarrier)}</p></div><button type="button">SEARCH</button></section>
    <section className="cs-public-hero"><span className="cs-service-label">CARRIERSOURCE</span><strong className="cs-docos-hero">DOC OS</strong><h2>Build your dispatch business.</h2><p>Create your dispatcher identity, connect with carriers, and manage the agreements that power your operation.</p><button type="button" className="docos-primary-action" onClick={onSignUp}>CREATE DISPATCHER PROFILE →</button></section>
    {featuredCarrier && <section className="cs-preview"><span>FEATURED OPPORTUNITY</span><strong>{featuredCarrier.name}</strong><p>{getCarrierSourceRosterLabel(featuredCarrier)} · {getCarrierSourceEquipmentLabel(featuredCarrier)} · {featuredCarrier.serviceArea || 'Regional'} regional</p></section>}
  </div>

  const activeCarriers = carriers.filter((carrier) => isCarrierSourceActive(carrier, applicationsById[carrier.id]))

  return <div className="phone-page carriersource-screen cs-account-home">
    <header className="cs-account-header"><div><span>CARRIERSOURCE</span><h2>{dispatcherProfile.displayName}</h2><p>{dispatcherProfile.homeMarket} · {dispatcherProfile.preferredEquipment}</p></div><button type="button" className="cs-profile-chip" onClick={onSignUp}>PROFILE</button></header>
    <nav className="cs-tabs"><button className={tab==='carriers'?'active':''} onClick={()=>setTab('carriers')}>MY CARRIERS</button><button className={tab==='opportunities'?'active':''} onClick={()=>setTab('opportunities')}>OPPORTUNITIES</button></nav>
    {tab === 'carriers' ? <section className="cs-content">
      {!activeCarriers.length ? <div className="cs-empty"><strong>No active carriers yet.</strong><p>Review opportunities and sign your first dispatch agreement.</p><button onClick={()=>setTab('opportunities')}>BROWSE OPPORTUNITIES</button></div> : activeCarriers.map((carrier) => {
        const rules = getAgreementRules(carrier)
        const career = careerById[carrier.id]
        return <button key={carrier.id} className="cs-carrier-dashboard-card" onClick={() => onOpenCarrier?.(carrier.id)}>
          <div className="cs-carrier-title"><div className="carrier-job-logo">{getCarrierSourceInitials(carrier)}</div><div><strong>{carrier.name}</strong><span>ACTIVE AGREEMENT · {getCarrierSourceLocation(carrier).toUpperCase()}</span></div></div>
          <div className="cs-carrier-metrics"><div><span>DISPATCH FEE</span><b>{rules.percentage}%</b></div><div><span>DRIVERS</span><b>{carrier.fleetSize}</b></div><div><span>RELATIONSHIP</span><b>{getCarrierSourceStanding(carrier, career)}</b></div><div><span>REGION</span><b>{rules.preferredRegion}</b></div></div>
          <div className="carrier-job-action"><span>OPEN CARRIER ACCOUNT</span><span>›</span></div>
        </button>
      })}
    </section> : <section className="cs-content"><div className="docos-section-heading"><span>RECOMMENDED FOR YOU</span><small>{getCarrierSourceMarketLabel(featuredCarrier)}</small></div>{carriers.map((carrier) => {
      const application = applicationsById[carrier.id]
      const status = getCarrierSourceStatus(application, carrier)
      return <button key={carrier.id} type="button" className="carrier-job-card carrier-job-card-summary" onClick={() => onOpenCarrier?.(carrier.id)}><div className="carrier-job-top"><div className="carrier-job-logo">{getCarrierSourceInitials(carrier)}</div><div className="carrier-job-title"><strong>{carrier.name}</strong><span>{getCarrierSourceAccountType(carrier)} · {getCarrierSourceLocation(carrier)}</span></div><span className={`carrier-job-status ${status.key}`}>{status.label}</span></div><p className="carrier-job-summary">{getCarrierSourceSummary(carrier)}</p><div className="carrier-job-action"><span>VIEW OPPORTUNITY</span><span>›</span></div></button>
    })}</section>}
  </div>
}
export default CarrierSourceScreen
