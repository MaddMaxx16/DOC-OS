function getCarrierState(carrier, application) {
  const status = application?.status

  if (status === 'PENDING') {
    return {
      eyebrow: 'APPLICATION PENDING',
      action: 'PENDING REVIEW',
      tone: 'pending',
    }
  }

  if (status === 'OFFER_RECEIVED') {
    return {
      eyebrow: 'AGREEMENT READY',
      action: 'REVIEW AGREEMENT',
      tone: 'offer',
    }
  }

  if (status === 'ACCEPTED' || carrier?.status === 'active') {
    return {
      eyebrow: 'CLIENT ACTIVE',
      action: 'VIEW CLIENT',
      tone: 'active',
    }
  }

  return {
    eyebrow: 'SEEKING DISPATCH SERVICE',
    action: 'VIEW OPPORTUNITY',
    tone: 'prospect',
  }
}

function CarrierSourceScreen({ carrier, application, onOpen, tutorialTarget = null }) {
  if (!carrier) {
    return (
      <div className="phone-page carriersource-screen carriersource-empty">
        <div className="carriersource-page-heading">
          <span className="carriersource-kicker">CARRIER NETWORK</span>
          <h2>CarrierSource</h2>
          <p>Carrier opportunities are loading.</p>
        </div>
      </div>
    )
  }

  const state = getCarrierState(carrier, application)
  const fleetLabel = `${carrier.fleetSize || 0} ${carrier.fleetSize === 1 ? 'Driver' : 'Drivers'}`
  const equipmentLabel = carrier.equipment?.[0] || 'Equipment not listed'
  const agreementPercent = carrier.dispatchAgreement?.percentage

  return (
    <div className="phone-page carriersource-screen">
      <header className="carriersource-page-heading">
        <span className="carriersource-kicker">CARRIER NETWORK</span>
        <h2>CarrierSource</h2>
        <p>Find and manage carrier opportunities.</p>
      </header>

      <section className="carriersource-opportunities" aria-label="Carrier opportunities">
        <div className="carriersource-section-label">OPPORTUNITIES</div>

        <button
          type="button"
          className={`carrier-opportunity-card ${tutorialTarget === 'metroline-card' ? 'tutorial-target' : ''}`}
          onClick={onOpen}
        >
          <div className="carrier-card-topline">
            <div>
              <strong>{carrier.name}</strong>
              <span>Brooklyn, NY</span>
            </div>
            <span className={`carrier-status-pill ${state.tone}`}>{state.eyebrow}</span>
          </div>

          <div className="carrier-card-primary-meta">
            <span>{fleetLabel}</span>
            <i aria-hidden="true">•</i>
            <span>{equipmentLabel}</span>
          </div>

          <div className="carrier-card-facts">
            <div>
              <span>SERVICE AREA</span>
              <strong>{carrier.serviceArea || 'Not listed'}</strong>
            </div>
            <div>
              <span>DISPATCH FEE</span>
              <strong>{Number.isFinite(agreementPercent) ? `${agreementPercent}%` : '—'}</strong>
            </div>
          </div>

          <div className="carrier-card-action">
            <span>{state.action}</span>
            <span aria-hidden="true">›</span>
          </div>
        </button>
      </section>
    </div>
  )
}

export default CarrierSourceScreen
