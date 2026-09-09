function CarrierOpportunityScreen({ carrier, driver, onApply, onOpenOffer, application }) {
  if (!carrier) return <div className="phone-page carrier-detail-screen"><p>Carrier opportunity unavailable.</p></div>

  const status = application?.status
  const isAccepted = status === 'ACCEPTED'
  const isOffer = status === 'OFFER_RECEIVED'
  const isPending = status === 'PENDING'
  const equipmentLabel = carrier.equipment?.[0] || driver?.equipment?.label || 'Not listed'
  const fee = carrier.dispatchAgreement?.percentage

  const statusLabel = isAccepted ? 'ACTIVE CLIENT' : isOffer ? 'OFFER RECEIVED' : isPending ? 'APPLICATION PENDING' : 'OPEN POSTING'
  const actionLabel = isOffer ? 'OPEN AGREEMENT EMAIL' : 'APPLY FOR ACCOUNT'

  return (
    <div className="phone-page carrier-detail-screen carrier-posting-v2">
      <header className="docos-page-hero carrier-posting-hero">
        <span className="docos-page-kicker">{isAccepted ? 'CARRIER ACCOUNT' : 'CARRIER POSTING'}</span>
        <div className="carrier-posting-company">
          <div className="carrier-job-logo large" aria-hidden="true">MT</div>
          <div>
            <h2>{carrier.name}</h2>
            <p>Brooklyn, NY · Independent dispatch account</p>
          </div>
        </div>
        <span className={`carrier-job-status ${isAccepted ? 'active' : isOffer ? 'offer' : isPending ? 'pending' : 'prospect'}`}>{statusLabel}</span>
      </header>

      <div className="docos-page-body">
        <section className="docos-section">
          <div className="docos-section-heading"><span>ABOUT THE ACCOUNT</span></div>
          <div className="docos-panel">
            <p className="carrier-posting-description">
              Metroline is looking for a dispatcher to source freight, coordinate pickup and delivery windows, plan trips and support daily driver operations.
            </p>
            <div className="docos-fact-list">
              <div><span>Fleet</span><strong>{carrier.fleetSize || 0} {carrier.fleetSize === 1 ? 'driver' : 'drivers'}</strong></div>
              <div><span>Equipment</span><strong>{equipmentLabel}</strong></div>
              <div><span>Service Area</span><strong>{carrier.serviceArea || 'Not listed'}</strong></div>
              <div><span>Home Base</span><strong>Brooklyn, NY</strong></div>
            </div>
          </div>
        </section>

        <section className="docos-section">
          <div className="docos-section-heading"><span>COMPENSATION & TERMS</span></div>
          <div className="docos-panel docos-fact-list">
            <div><span>Dispatch Fee</span><strong>{Number.isFinite(fee) ? `${fee}% of carrier gross` : '—'}</strong></div>
            <div><span>Payment Terms</span><strong>1 day</strong></div>
            <div><span>Relationship</span><strong>{isAccepted ? 'Active client' : isPending ? 'Under review' : isOffer ? 'Offer ready' : 'Prospective client'}</strong></div>
          </div>
        </section>

        <section className="docos-section">
          <div className="docos-section-heading"><span>DRIVER ROSTER</span></div>
          <div className="docos-panel carrier-driver-row-v2">
            <span className="driver-avatar-v2" aria-hidden="true">M</span>
            <div><strong>{driver?.fullName || driver?.name || 'Marcus Reed'}</strong><small>{driver?.equipment?.label || equipmentLabel}</small></div>
            <span className="docos-status-text">{isAccepted ? 'ACTIVE' : '1 DRIVER'}</span>
          </div>
        </section>

        {isAccepted ? (
          <div className="docos-state-card success">
            <span>ACCOUNT ACTIVE</span>
            <strong>Metroline is ready for operations.</strong>
            <p>{driver?.fullName || driver?.name || 'Marcus Reed'} is available in your driver roster.</p>
          </div>
        ) : isPending ? (
          <div className="docos-state-card pending">
            <span>APPLICATION SUBMITTED</span>
            <strong>Metroline is reviewing your application.</strong>
            <p>You can leave this page and continue using DOC OS.</p>
          </div>
        ) : isOffer ? (
          <>
            <div className="docos-state-card offer">
              <span>OFFER RECEIVED</span>
              <strong>Metroline sent your dispatch service agreement by email.</strong>
              <p>Review the agreement attachment from your inbox before accepting the account.</p>
            </div>
            <div className="docos-sticky-actions"><button type="button" className="docos-primary-action" onClick={onOpenOffer}>{actionLabel}</button></div>
          </>
        ) : (
          <div className="docos-sticky-actions"><button type="button" className="docos-primary-action" onClick={onApply}>{actionLabel}</button></div>
        )}
      </div>
    </div>
  )
}

export default CarrierOpportunityScreen
