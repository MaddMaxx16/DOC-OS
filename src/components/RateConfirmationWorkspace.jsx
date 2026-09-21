import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import mapLocations from '../data/mapLocations.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function money(value) {
  return Number.isFinite(Number(value))
    ? `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : '—'
}

function miles(value) {
  return Number.isFinite(Number(value))
    ? `${Number(value).toFixed(1)} mi`
    : '—'
}

// B.5.4C.4.1 — Rate Confirmation Comparison Desk
function RateConfirmationWorkspace({
  attachment,
  loads = [],
  onClose,
  onRateConCheck,
  onConfirmRateCon,
  onRequestRateConCorrection,
}) {
  const [frontDocument, setFrontDocument] = useState('ratecon')

  const load = attachment?.loadId
    ? loads.find((item) => item.id === attachment.loadId)
    : null

  const rc = load?.rateConfirmation || null

  const pickup = load
    ? mapLocations.find((item) => item.id === load.pickupLocationId)
    : null

  const delivery = load
    ? mapLocations.find((item) => item.id === load.deliveryLocationId)
    : null

  const rcPickup = rc
    ? mapLocations.find((item) => item.id === rc.pickupLocationId)
    : null

  const rcDelivery = rc
    ? mapLocations.find((item) => item.id === rc.deliveryLocationId)
    : null

  const reviewFields = [
    {
      key: 'pickup',
      label: 'Pickup',
      offer: pickup?.name || 'Pickup',
      ratecon: rcPickup?.name || 'Pickup',
    },
    {
      key: 'delivery',
      label: 'Delivery',
      offer: delivery?.name || 'Delivery',
      ratecon: rcDelivery?.name || 'Delivery',
    },
    {
      key: 'rate',
      label: 'Rate',
      offer: money(load?.rate),
      ratecon: money(rc?.rate),
    },
    {
      key: 'miles',
      label: 'Miles',
      offer: miles(load?.listedMiles),
      ratecon: miles(rc?.listedMiles),
    },
  ]

  const hasFlag = Object.values(rc?.reviewChecks || {}).includes('flag')
  const allMatched = reviewFields.every(
    ({ key }) => rc?.reviewChecks?.[key] === 'match'
  )

  const confirmed = rc?.status === 'CONFIRMED'
  const correctionRequested = rc?.status === 'CORRECTION_REQUESTED'
  const readOnly = confirmed || correctionRequested

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (typeof document === 'undefined') return null

  if (!load || !rc) {
    return createPortal(
      <div className="ratecon-workspace-overlay">
        <section className="ratecon-workspace-screen missing">
          <header className="ratecon-workspace-toolbar">
            <button type="button" onClick={onClose} aria-label="Close">‹</button>
            <div>
              <span>DOC OS · DOCUMENT REVIEW</span>
              <strong>Rate Confirmation</strong>
            </div>
          </header>
          <div className="ratecon-workspace-missing">
            Rate Confirmation unavailable.
          </div>
        </section>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div
      className="ratecon-workspace-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${getFreightRouteName(load)} Rate Confirmation review`}
    >
      <section className="ratecon-workspace-screen">

        <header className="ratecon-workspace-toolbar">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Rate Confirmation review"
          >
            ‹
          </button>

          <div>
            <span>DOC OS · DOCUMENT REVIEW</span>
            <strong>{getFreightRouteName(load)}</strong>
          </div>

          <small>
            {confirmed
              ? 'CONFIRMED'
              : correctionRequested
                ? 'CORRECTION PENDING'
                : 'RATE CON REVIEW'}
          </small>
        </header>

        <main className="ratecon-desk">

          <div className="ratecon-desk-folder" aria-hidden="true">
            <span>LOAD FILE</span>
            <strong>{getFreightRouteName(load)}</strong>
            <small>{rc.reference || `RC-${load.id}`}</small>
          </div>

          <section
            className={`ratecon-paper-layer ratecon-offer-layer ${
              frontDocument === 'offer' ? 'front' : 'rear'
            }`}
          >
            <article className="ratecon-physical-paper freightlink-offer-paper">
              <header className="ratecon-paper-masthead offer">
                <span>DOC OS · FREIGHTLINK</span>
                <h2>Load Offer</h2>
                <p>Booking record</p>
              </header>

              <section className="ratecon-offer-route">
                <div>
                  <span>PICKUP</span>
                  <strong>{pickup?.name || 'Pickup'}</strong>
                </div>

                <b aria-hidden="true">→</b>

                <div>
                  <span>DELIVERY</span>
                  <strong>{delivery?.name || 'Delivery'}</strong>
                </div>
              </section>

              <section className="ratecon-offer-grid">
                <div>
                  <span>OFFER RATE</span>
                  <strong>{money(load.rate)}</strong>
                </div>

                <div>
                  <span>LISTED MILES</span>
                  <strong>{miles(load.listedMiles)}</strong>
                </div>

                <div>
                  <span>LOAD STATUS</span>
                  <strong>{load.carrierApprovalStatus || load.status || 'APPROVED'}</strong>
                </div>

                <div>
                  <span>LOAD ID</span>
                  <strong>{load.id}</strong>
                </div>
              </section>

              <section className="ratecon-offer-reference">
                <span>REFERENCE COPY</span>
                <p>
                  Use this FreightLink booking record to verify the carrier-issued
                  Rate Confirmation before dispatch.
                </p>
              </section>
            </article>

            {frontDocument !== 'offer' && (
              <button
                type="button"
                className="ratecon-paper-hitbox"
                onClick={() => setFrontDocument('offer')}
                aria-label="Bring FreightLink Load Offer forward"
              />
            )}
          </section>

          <section
            className={`ratecon-paper-layer ratecon-document-layer ${
              frontDocument === 'ratecon' ? 'front' : 'rear'
            }`}
          >
            <article className="ratecon-physical-paper carrier-ratecon-paper">
              <header className="ratecon-paper-masthead carrier">
                <span>{rc.carrierName || 'CARRIER'} · RATE CONFIRMATION</span>
                <h2>{rc.reference || `RC-${load.id}`}</h2>
                <p>
                  {getFreightRouteName(load)}
                  {' · '}
                  Version {rc.version || 1}
                </p>
              </header>

              <section className="ratecon-carrier-meta">
                <div>
                  <span>CARRIER</span>
                  <strong>{rc.carrierName || 'Carrier'}</strong>
                </div>

                <div>
                  <span>DOCUMENT STATUS</span>
                  <strong>{rc.status || 'RECEIVED'}</strong>
                </div>
              </section>

              <section className="ratecon-carrier-route">
                <div>
                  <span>PICKUP</span>
                  <strong>{rcPickup?.name || 'Pickup'}</strong>
                </div>

                <b aria-hidden="true">→</b>

                <div>
                  <span>DELIVERY</span>
                  <strong>{rcDelivery?.name || 'Delivery'}</strong>
                </div>
              </section>

              <section className="ratecon-carrier-money">
                <div>
                  <span>AGREED RATE</span>
                  <strong>{money(rc.rate)}</strong>
                </div>

                <div>
                  <span>LISTED MILES</span>
                  <strong>{miles(rc.listedMiles)}</strong>
                </div>
              </section>

              <section className="ratecon-physical-review">
                <header>
                  <span>DOCUMENT VERIFICATION</span>
                  <p>
                    {correctionRequested
                      ? 'Correction requested. Waiting for a revised carrier document.'
                      : confirmed
                        ? 'Rate Confirmation verified against FreightLink.'
                        : 'Compare each line against the FreightLink offer.'}
                  </p>
                </header>

                <div className="ratecon-review-lines">
                  {reviewFields.map((field) => {
                    const check = rc.reviewChecks?.[field.key] || null

                    return (
                      <div
                        className={`ratecon-review-line ${
                          check ? `checked ${check}` : ''
                        }`}
                        key={field.key}
                      >
                        <div className="ratecon-review-field">
                          <span>{field.label}</span>
                          <strong>{field.ratecon}</strong>
                          <small>
                            FreightLink: {field.offer}
                          </small>
                        </div>

                        <div className="ratecon-review-marks">
                          <button
                            type="button"
                            disabled={readOnly}
                            className={check === 'match' ? 'selected match' : 'match'}
                            onClick={() =>
                              onRateConCheck?.(load.id, field.key, 'match')
                            }
                            aria-label={`${field.label} matches`}
                          >
                            ✓
                          </button>

                          <button
                            type="button"
                            disabled={readOnly}
                            className={check === 'flag' ? 'selected flag' : 'flag'}
                            onClick={() =>
                              onRateConCheck?.(load.id, field.key, 'flag')
                            }
                            aria-label={`${field.label} does not match`}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <footer className="ratecon-paper-action">
                {confirmed ? (
                  <div className="ratecon-paper-status confirmed">
                    <span>VERIFIED</span>
                    <strong>RATE CONFIRMATION CONFIRMED</strong>
                  </div>
                ) : correctionRequested ? (
                  <div className="ratecon-paper-status waiting">
                    <span>CORRECTION REQUESTED</span>
                    <strong>AWAITING REVISED DOCUMENT</strong>
                  </div>
                ) : hasFlag ? (
                  <button
                    type="button"
                    className="ratecon-primary-action correction"
                    onClick={() => onRequestRateConCorrection?.(load.id)}
                  >
                    REQUEST CORRECTION
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ratecon-primary-action"
                    disabled={!allMatched}
                    onClick={() => onConfirmRateCon?.(load.id)}
                  >
                    {allMatched
                      ? 'CONFIRM RATE CON'
                      : `VERIFY ${Object.values(rc.reviewChecks || {}).filter((value) => value === 'match').length}/4`}
                  </button>
                )}
              </footer>
            </article>

            {frontDocument !== 'ratecon' && (
              <button
                type="button"
                className="ratecon-paper-hitbox"
                onClick={() => setFrontDocument('ratecon')}
                aria-label="Bring Rate Confirmation forward"
              />
            )}
          </section>

        </main>

        <footer className="ratecon-workspace-footer">
          <span>
            {frontDocument === 'ratecon'
              ? 'Carrier Rate Confirmation · tap exposed FreightLink offer to compare.'
              : 'FreightLink reference copy · tap exposed Rate Confirmation to review.'}
          </span>
        </footer>

      </section>
    </div>,
    document.body,
  )
}

export default RateConfirmationWorkspace
