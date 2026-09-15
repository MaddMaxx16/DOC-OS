import { useState } from 'react'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import { getCarrierRelationshipStateLabel } from '../utils/carrierCareer.js'
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

function relationshipScoreFor(carrier, career) {
  const value = Number.isFinite(Number(career?.relationshipScore)) ? Number(career.relationshipScore) : Number(carrier?.relationshipScore ?? 50)
  return Math.max(0, Math.min(100, value))
}

function CarrierSourceScreen({ carriers = [], applicationsById = {}, careerById = {}, dispatcherProfile, onOpenCarrier, onSignUp }) {
  const activeCarriers = carriers.filter((carrier) => isCarrierSourceActive(carrier, applicationsById[carrier.id]))
  const hasActiveCarrier = activeCarriers.length > 0
  const [tab, setTab] = useState(hasActiveCarrier ? 'carriers' : 'opportunities')
  const featuredCarrier = carriers.find((carrier) => !isCarrierSourceActive(carrier, applicationsById[carrier.id])) || carriers[0] || null
  const activeDriverCount = activeCarriers.reduce((sum, carrier) => sum + Number(carrier?.driverIds?.length ?? carrier?.fleetSize ?? 0), 0)

  if (!dispatcherProfile?.created) return <div className="phone-page carriersource-screen cs-public-landing">
    <header className="cs-public-top"><div className="cs-docos-brand"><strong>DOC OS</strong><span>CARRIERSOURCE · DISPATCHER NETWORK</span></div><button type="button" className="cs-signup-button" onClick={onSignUp}>SIGN UP</button></header>
    <section className="cs-search-panel"><div><span>⌕</span><p>Carrier name, equipment, or region</p></div><div><span>⌖</span><p>{dispatcherProfile?.homeMarket || getCarrierSourceLocation(featuredCarrier)}</p></div><button type="button">SEARCH</button></section>
    <section className="cs-public-hero"><span className="cs-service-label">CARRIERSOURCE</span><strong className="cs-docos-hero">DOC OS</strong><h2>Build your dispatch business.</h2><p>Create your dispatcher identity, connect with carriers, and manage the agreements that power your operation.</p><button type="button" className="docos-primary-action" onClick={onSignUp}>CREATE DISPATCHER PROFILE →</button></section>
    {featuredCarrier && <section className="cs-preview"><span>FEATURED OPPORTUNITY</span><strong>{featuredCarrier.name}</strong><p>{getCarrierSourceRosterLabel(featuredCarrier)} · {getCarrierSourceEquipmentLabel(featuredCarrier)} · {featuredCarrier.serviceArea || 'Regional'} regional</p></section>}
  </div>

  return <div className="phone-page carriersource-screen cs-account-home cs-workspace-b2">
    <header className="cs-account-header cs-workspace-header">
      <div><span>CARRIERSOURCE</span><h2>{dispatcherProfile.displayName}</h2><p>{dispatcherProfile.homeMarket} · {dispatcherProfile.preferredEquipment}</p></div>
      <button type="button" className="cs-profile-chip" onClick={onSignUp}>PROFILE</button>
    </header>

    <section className="cs-network-snapshot" aria-label="Carrier network summary">
      <div className="cs-network-copy"><span>YOUR NETWORK</span><strong>{hasActiveCarrier ? `${activeCarriers.length} active carrier${activeCarriers.length === 1 ? '' : 's'}` : 'Ready to build'}</strong><small>{hasActiveCarrier ? `${activeDriverCount} driver${activeDriverCount === 1 ? '' : 's'} under dispatch` : 'Sign your first carrier agreement to activate operations.'}</small></div>
      <div className={`cs-network-indicator ${hasActiveCarrier ? 'online' : ''}`}><i />{hasActiveCarrier ? 'LIVE' : 'OPEN'}</div>
    </section>

    <nav className="cs-tabs cs-workspace-tabs"><button className={tab==='carriers'?'active':''} onClick={()=>setTab('carriers')}>MY CARRIERS <b>{activeCarriers.length}</b></button><button className={tab==='opportunities'?'active':''} onClick={()=>setTab('opportunities')}>OPPORTUNITIES <b>{carriers.filter((carrier) => !isCarrierSourceActive(carrier, applicationsById[carrier.id])).length}</b></button></nav>

    {tab === 'carriers' ? <section className="cs-content cs-workspace-content">
      <div className="cs-section-intro"><div><span>ACTIVE ACCOUNTS</span><strong>Carrier relationships</strong></div><small>Agreement terms and account health</small></div>
      {!activeCarriers.length ? <div className="cs-empty"><strong>No active carriers yet.</strong><p>Review opportunities and sign your first dispatch agreement.</p><button onClick={()=>setTab('opportunities')}>BROWSE OPPORTUNITIES</button></div> : activeCarriers.map((carrier) => {
        const rules = getAgreementRules(carrier)
        const career = careerById[carrier.id]
        const score = relationshipScoreFor(carrier, career)
        const relationshipState = career?.relationshipState || 'ACTIVE'
        const relationshipStateLabel = getCarrierRelationshipStateLabel(relationshipState)
        const recentReview = Array.isArray(career?.performanceHistory) ? career.performanceHistory[0] : null
        return <button key={carrier.id} className={`cs-carrier-dashboard-card cs-account-card-b2 cs-account-card-b3 ${relationshipState === 'AT_RISK' ? 'at-risk' : relationshipState === 'PROBATION' ? 'probation' : ''}`} onClick={() => onOpenCarrier?.(carrier.id)}>
          <div className="cs-account-card-head">
            <div className="cs-carrier-title"><div className="carrier-job-logo">{getCarrierSourceInitials(carrier)}</div><div><strong>{carrier.name}</strong><span>{getCarrierSourceLocation(carrier).toUpperCase()} · {getCarrierSourceEquipmentLabel(carrier).toUpperCase()}</span></div></div>
            <span className={`carrier-job-status ${relationshipState === 'AT_RISK' ? 'attention' : relationshipState === 'PROBATION' ? 'warning' : 'active'}`}>{relationshipStateLabel}</span>
          </div>
          <div className="cs-account-health">
            <div><span>RELATIONSHIP</span><strong>{getCarrierSourceStanding(carrier, career)}</strong></div>
            <div className="cs-account-health-score"><b>{Math.round(score)}</b><small>/100</small></div>
            <div className="cs-relationship-track"><i style={{ width: `${score}%` }} /></div>
          </div>
          <div className="cs-account-metric-row"><div><span>DISPATCH FEE</span><b>{rules.percentage}%</b></div><div><span>DRIVERS</span><b>{carrier.driverIds?.length ?? carrier.fleetSize}</b></div><div><span>REGION</span><b>{rules.preferredRegion}</b></div></div>
          <div className="cs-career-strip-b3"><span>LEVEL {Math.max(1, Number(career?.carrierLevel || 1))}</span><span>{recentReview ? `LAST REVIEW ${recentReview.grade}` : 'NO REVIEWS YET'}</span><span>{Number(career?.strikeCount || 0)} STRIKE{Number(career?.strikeCount || 0) === 1 ? '' : 'S'}</span></div>
          <div className="cs-account-open"><span>OPEN CARRIER ACCOUNT</span><span>›</span></div>
        </button>
      })}
    </section> : <section className="cs-content cs-workspace-content">
      <div className="cs-section-intro"><div><span>CARRIER MARKET</span><strong>Opportunities for you</strong></div><small>{getCarrierSourceMarketLabel(featuredCarrier)}</small></div>
      {carriers.map((carrier) => {
        const application = applicationsById[carrier.id]
        const status = getCarrierSourceStatus(application, carrier)
        const rules = getAgreementRules(carrier)
        const active = isCarrierSourceActive(carrier, application)
        return <button key={carrier.id} type="button" className={`carrier-job-card carrier-job-card-summary cs-opportunity-card-b2 ${active ? 'active-account' : ''}`} onClick={() => onOpenCarrier?.(carrier.id)}>
          <div className="carrier-job-top"><div className="carrier-job-logo">{getCarrierSourceInitials(carrier)}</div><div className="carrier-job-title"><strong>{carrier.name}</strong><span>{getCarrierSourceAccountType(carrier)} · {getCarrierSourceLocation(carrier)}</span></div><span className={`carrier-job-status ${status.key}`}>{status.label}</span></div>
          <p className="carrier-job-summary">{getCarrierSourceSummary(carrier)}</p>
          <div className="cs-opportunity-tags"><span>{getCarrierSourceEquipmentLabel(carrier)}</span><span>{rules.preferredRegion}</span><span>{rules.percentage}% dispatch</span></div>
          <div className="carrier-job-action"><span>{active ? 'OPEN CARRIER ACCOUNT' : application?.status === 'PENDING' ? 'VIEW APPLICATION' : application?.status === 'OFFER_RECEIVED' ? 'REVIEW OFFER' : 'VIEW OPPORTUNITY'}</span><span>›</span></div>
        </button>
      })}
    </section>}
  </div>
}
export default CarrierSourceScreen
