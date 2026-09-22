function normalizeStatus(value) {
  return String(value || '').trim().toUpperCase()
}

function CarrierSourceFirstVisitGuide({
  mode = 'network',
  carriers = [],
  applicationsById = {},
  careerById = {},
  carrier = null,
  application = null,
  career = null,
  onOpenEmail,
}) {
  const allApplications = Object.entries(applicationsById || {})
  const pendingEntry = allApplications.find(([, item]) => normalizeStatus(item?.status) === 'PENDING')
  const approvedEntry = allApplications.find(([, item]) => normalizeStatus(item?.status) === 'OFFER_RECEIVED')
  const acceptedEntry = allApplications.find(([, item]) => normalizeStatus(item?.status) === 'ACCEPTED')

  const activeRelationship =
    carriers.some((item) => normalizeStatus(item?.status) === 'ACTIVE') ||
    Object.values(careerById || {}).some((item) => normalizeStatus(item?.relationshipState) === 'ACTIVE') ||
    Boolean(acceptedEntry)

  const currentStatus = normalizeStatus(application?.status)
  const currentActive =
    normalizeStatus(carrier?.status) === 'ACTIVE' ||
    normalizeStatus(career?.relationshipState) === 'ACTIVE' ||
    currentStatus === 'ACCEPTED'

  if (mode === 'opportunity') {
    if (currentActive) return null

    if (currentStatus === 'OFFER_RECEIVED') {
      return (
        <section className="cs-first-visit-guide state-approved">
          <div className="cs-first-visit-guide-icon">✓</div>
          <div className="cs-first-visit-guide-copy">
            <span>APPLICATION APPROVED</span>
            <strong>Your next step is in Email.</strong>
            <p>
              CarrierSource sent an operating agreement. Review and sign it before this carrier
              and its driver roster become part of your operation.
            </p>
          </div>
          <button type="button" onClick={onOpenEmail}>OPEN EMAIL</button>
        </section>
      )
    }

    if (currentStatus === 'PENDING') {
      return (
        <section className="cs-first-visit-guide state-pending">
          <div className="cs-first-visit-guide-icon">…</div>
          <div className="cs-first-visit-guide-copy">
            <span>APPLICATION SUBMITTED</span>
            <strong>CarrierSource is reviewing your request.</strong>
            <p>
              You do not need to stay on this page. A response will arrive in Email after the
              review period, usually within about 10 game minutes.
            </p>
          </div>
        </section>
      )
    }

    return (
      <section className="cs-first-visit-guide state-new">
        <div className="cs-first-visit-guide-index">02</div>
        <div className="cs-first-visit-guide-copy">
          <span>BEFORE YOU APPLY</span>
          <strong>Read the carrier like a business partner, not a job posting.</strong>
          <p>
            Compare its operating region, equipment, fleet size, dispatch terms, and expectations.
            Applying starts a review — it does not activate the carrier immediately.
          </p>
          <div className="cs-first-visit-mini-flow">
            <b>REVIEW</b><i>→</i><b>APPLY</b><i>→</i><b>EMAIL RESPONSE</b><i>→</i><b>AGREEMENT</b>
          </div>
        </div>
      </section>
    )
  }

  if (approvedEntry) {
    const approvedCarrier = carriers.find((item) => item.id === approvedEntry[0])
    return (
      <section className="cs-first-visit-guide state-approved">
        <div className="cs-first-visit-guide-icon">✓</div>
        <div className="cs-first-visit-guide-copy">
          <span>APPLICATION APPROVED</span>
          <strong>{approvedCarrier?.name || 'A carrier'} responded.</strong>
          <p>
            Open Email to review the operating agreement. The relationship is not active until
            that agreement is accepted.
          </p>
        </div>
        <button type="button" onClick={onOpenEmail}>OPEN EMAIL</button>
      </section>
    )
  }

  if (pendingEntry) {
    const pendingCarrier = carriers.find((item) => item.id === pendingEntry[0])
    return (
      <section className="cs-first-visit-guide state-pending">
        <div className="cs-first-visit-guide-icon">…</div>
        <div className="cs-first-visit-guide-copy">
          <span>APPLICATION IN REVIEW</span>
          <strong>{pendingCarrier?.name || 'Your carrier application'} is pending.</strong>
          <p>
            CarrierSource will reply through Email. You can leave this site and continue exploring
            DOC OS while you wait.
          </p>
        </div>
      </section>
    )
  }

  if (activeRelationship) return null

  return (
    <section className="cs-first-visit-guide state-new">
      <div className="cs-first-visit-guide-index">01</div>
      <div className="cs-first-visit-guide-copy">
        <span>FIRST TIME IN CARRIERSOURCE</span>
        <strong>This is where you build carrier relationships.</strong>
        <p>
          Open a carrier profile and decide whether its operation fits the kind of dispatch
          business you want to run.
        </p>
        <div className="cs-first-visit-steps">
          <div><b>1</b><span>Inspect a carrier</span></div>
          <div><b>2</b><span>Review expectations</span></div>
          <div><b>3</b><span>Apply if it fits</span></div>
        </div>
      </div>
    </section>
  )
}

export default CarrierSourceFirstVisitGuide
