function getCarrierState(carrier, application) {
  const status = application?.status
  if (status === 'PENDING') return { label: 'APPLICATION PENDING', action: 'VIEW POSTING', tone: 'pending' }
  if (status === 'OFFER_RECEIVED') return { label: 'OFFER RECEIVED', action: 'VIEW POSTING', tone: 'offer' }
  if (status === 'ACCEPTED' || carrier?.status === 'active') return { label: 'ACTIVE CLIENT', action: 'VIEW POSTING', tone: 'active' }
  return { label: 'NOW HIRING', action: 'VIEW POSTING', tone: 'prospect' }
}

function CarrierSourceScreen({ carrier, application, onOpen }) {
  if (!carrier) {
    return <div className="phone-page carriersource-screen"><header className="docos-page-hero"><span className="docos-page-kicker">CARRIER JOB MARKET</span><h2>CarrierSource</h2><p>Carrier opportunities are loading.</p></header></div>
  }
  const state = getCarrierState(carrier, application)
  return (
    <div className="phone-page carriersource-screen carriersource-jobs-v2">
      <header className="docos-page-hero carrier-source-list-hero">
        <span className="docos-page-kicker">CARRIER JOB MARKET</span>
        <div className="docos-page-title-row"><div><h2>CarrierSource</h2><p>Find carriers looking for dispatch support.</p></div><span className="docos-count-chip">1 POSTING</span></div>
      </header>
      <section className="docos-section carrier-source-list-section">
        <div className="docos-section-heading"><span>RECOMMENDED FOR YOU</span><small>NEW YORK</small></div>
        <button type="button" className="carrier-job-card carrier-job-card-summary" onClick={onOpen}>
          <div className="carrier-job-top">
            <div className="carrier-job-logo" aria-hidden="true">MT</div>
            <div className="carrier-job-title"><strong>{carrier.name}</strong><span>Independent Dispatch · Brooklyn, NY</span></div>
            <span className={`carrier-job-status ${state.tone}`}>{state.label}</span>
          </div>
          <p className="carrier-job-summary">Regional carrier seeking day-to-day dispatch support for load sourcing, trip planning, appointment coordination, and driver support.</p>
          <div className="carrier-job-action"><span>{state.action}</span><span aria-hidden="true">›</span></div>
        </button>
      </section>
    </div>
  )
}
export default CarrierSourceScreen
