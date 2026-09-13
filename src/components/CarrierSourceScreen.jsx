import { useState } from 'react'
import { getCarrierRelationshipLabel, getAgreementRules } from '../utils/carrierAgreement.js'

function CarrierSourceScreen({ carrier, application, dispatcherProfile, onOpen, onSignUp }) {
  const [tab, setTab] = useState(carrier?.status === 'active' ? 'carriers' : 'opportunities')
  const rules = getAgreementRules(carrier)
  const active = application?.status === 'ACCEPTED' || carrier?.status === 'active'
  if (!dispatcherProfile?.created) return <div className="phone-page carriersource-screen cs-public-landing">
    <header className="cs-public-top"><div className="cs-docos-brand"><strong>DOC OS</strong><span>CARRIERSOURCE · DISPATCHER NETWORK</span></div><button type="button" className="cs-signup-button" onClick={onSignUp}>SIGN UP</button></header>
    <section className="cs-search-panel"><div><span>⌕</span><p>Carrier name, equipment, or region</p></div><div><span>⌖</span><p>Brooklyn, NY</p></div><button type="button">SEARCH</button></section>
    <section className="cs-public-hero"><span className="cs-service-label">CARRIERSOURCE</span><strong className="cs-docos-hero">DOC OS</strong><h2>Build your dispatch business.</h2><p>Create your dispatcher identity, connect with carriers, and manage the agreements that power your operation.</p><button type="button" className="docos-primary-action" onClick={onSignUp}>CREATE DISPATCHER PROFILE →</button></section>
    <section className="cs-preview"><span>FEATURED OPPORTUNITY</span><strong>{carrier?.name || 'Metroline Transport'}</strong><p>1 driver · Dry Van · Northeast regional</p></section>
  </div>

  return <div className="phone-page carriersource-screen cs-account-home">
    <header className="cs-account-header"><div><span>CARRIERSOURCE</span><h2>{dispatcherProfile.displayName}</h2><p>{dispatcherProfile.homeMarket} · {dispatcherProfile.preferredEquipment}</p></div><button type="button" className="cs-profile-chip" onClick={onSignUp}>PROFILE</button></header>
    <nav className="cs-tabs"><button className={tab==='carriers'?'active':''} onClick={()=>setTab('carriers')}>MY CARRIERS</button><button className={tab==='opportunities'?'active':''} onClick={()=>setTab('opportunities')}>OPPORTUNITIES</button></nav>
    {tab === 'carriers' ? <section className="cs-content">
      {!active ? <div className="cs-empty"><strong>No active carriers yet.</strong><p>Review opportunities and sign your first dispatch agreement.</p><button onClick={()=>setTab('opportunities')}>BROWSE OPPORTUNITIES</button></div> : <button className="cs-carrier-dashboard-card" onClick={onOpen}>
        <div className="cs-carrier-title"><div className="carrier-job-logo">MT</div><div><strong>{carrier.name}</strong><span>ACTIVE AGREEMENT · BROOKLYN, NY</span></div></div>
        <div className="cs-carrier-metrics"><div><span>DISPATCH FEE</span><b>{rules.percentage}%</b></div><div><span>DRIVERS</span><b>{carrier.fleetSize}</b></div><div><span>RELATIONSHIP</span><b>{getCarrierRelationshipLabel(carrier.relationshipScore)}</b></div><div><span>REGION</span><b>{rules.preferredRegion}</b></div></div>
        <div className="carrier-job-action"><span>OPEN CARRIER ACCOUNT</span><span>›</span></div>
      </button>}
    </section> : <section className="cs-content"><div className="docos-section-heading"><span>RECOMMENDED FOR YOU</span><small>NEW YORK</small></div><button type="button" className="carrier-job-card carrier-job-card-summary" onClick={onOpen}><div className="carrier-job-top"><div className="carrier-job-logo">MT</div><div className="carrier-job-title"><strong>{carrier.name}</strong><span>Independent Dispatch · Brooklyn, NY</span></div><span className={`carrier-job-status ${active?'active':application?.status==='OFFER_RECEIVED'?'offer':application?.status==='PENDING'?'pending':'prospect'}`}>{active?'ACTIVE CLIENT':application?.status==='OFFER_RECEIVED'?'OFFER RECEIVED':application?.status==='PENDING'?'APPLICATION PENDING':'NOW HIRING'}</span></div><p className="carrier-job-summary">Regional carrier seeking dispatch support for freight sourcing, trip planning, service windows and driver communication.</p><div className="carrier-job-action"><span>VIEW OPPORTUNITY</span><span>›</span></div></button></section>}
  </div>
}
export default CarrierSourceScreen
