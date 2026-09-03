function CarrierOpportunityScreen({ carrier, driver, onApply, application, tutorialTarget = null }) {
  if (!carrier) {
    return (
      <div className="phone-page carrier-detail-screen carrier-detail-empty">
        <p>Carrier opportunity unavailable.</p>
      </div>
    )
  }

  const status = application?.status
  const isAccepted = status === 'ACCEPTED'
  const isOffer = status === 'OFFER_RECEIVED'
  const isPending = status === 'PENDING'
  const equipmentLabel = carrier.equipment?.[0] || driver?.equipment?.label || 'Not listed'
  const agreementPercent = carrier.dispatchAgreement?.percentage
  const fleetLabel = `${carrier.fleetSize || 0} ${carrier.fleetSize === 1 ? 'Driver' : 'Drivers'}`

  const statusLabel = isAccepted
    ? 'CLIENT ACTIVE'
    : isOffer
      ? 'AGREEMENT READY'
      : isPending
        ? 'APPLICATION PENDING'
        : 'SEEKING DISPATCH SERVICE'

  const statusTone = isAccepted ? 'active' : isOffer ? 'offer' : isPending ? 'pending' : 'prospect'

  return (
    <div className="phone-page carrier-detail-screen">
      <header className="carrier-detail-hero">
        <span className="carriersource-kicker">CARRIER PROFILE</span>
        <div className="carrier-detail-title-row">
          <div>
            <h2>{carrier.name}</h2>
            <p>Brooklyn, NY</p>
          </div>
          <span className={`carrier-status-pill ${statusTone}`}>{statusLabel}</span>
        </div>
      </header>

      <div className="carrier-detail-content">
        <section className="carrier-detail-section">
          <h3>Operation</h3>
          <div className="carrier-detail-fact-list">
            <div><span>Fleet</span><strong>{fleetLabel}</strong></div>
            <div><span>Equipment</span><strong>{equipmentLabel}</strong></div>
            <div><span>Service Area</span><strong>{carrier.serviceArea || 'Not listed'}</strong></div>
            <div><span>Home Base</span><strong>Brooklyn, NY</strong></div>
          </div>
        </section>

        <section className="carrier-detail-section">
          <div className="carrier-detail-section-heading">
            <h3>Driver</h3>
            <span>{carrier.fleetSize || 0} {carrier.fleetSize === 1 ? 'DRIVER' : 'DRIVERS'}</span>
          </div>
          <div className="carrier-driver-card">
            <div className="carrier-driver-avatar" aria-hidden="true">M</div>
            <div>
              <strong>{driver?.fullName || driver?.name || 'Marcus Reed'}</strong>
              <span>{driver?.equipment?.label || equipmentLabel} · Brooklyn, NY</span>
            </div>
          </div>
        </section>

        <section className="carrier-detail-section">
          <h3>Business Terms</h3>
          <div className="carrier-detail-fact-list">
            <div><span>Dispatch Fee</span><strong>{Number.isFinite(agreementPercent) ? `${agreementPercent}% of Carrier Gross` : '—'}</strong></div>
            <div><span>Payment Terms</span><strong>1 Day</strong></div>
            <div><span>Relationship</span><strong>{isAccepted ? 'Active Client' : isOffer ? 'Agreement Ready' : isPending ? 'Under Review' : 'Prospective Client'}</strong></div>
          </div>
        </section>

        <section className="carrier-detail-section carrier-needs-section">
          <h3>What They Need</h3>
          <p>Load sourcing, trip planning, broker communication, and day-to-day dispatch support for a single dry-van driver.</p>
        </section>

        {isAccepted ? (
          <div className="carrier-detail-state-card active">
            <span>ACCOUNT ACTIVE</span>
            <strong>{agreementPercent || 8}% dispatch agreement active</strong>
            <p>{driver?.name || 'Marcus'} is available for dispatch.</p>
          </div>
        ) : isPending ? (
          <div className="carrier-detail-state-card pending">
            <span>APPLICATION SUBMITTED</span>
            <strong>Metroline is reviewing your application.</strong>
            <p>DOC OS will notify you when the carrier responds.</p>
          </div>
        ) : (
          <button
            type="button"
            className={`carrier-primary-action ${tutorialTarget === (isOffer ? 'accept-agreement' : 'apply-metroline') ? 'tutorial-target' : ''}`}
            onClick={onApply}
          >
            <span>{isOffer ? 'ACCEPT AGREEMENT' : 'APPLY FOR ACCOUNT'}</span>
            <span aria-hidden="true">›</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default CarrierOpportunityScreen
