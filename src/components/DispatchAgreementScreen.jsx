import { useState } from 'react'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import DocumentZoomOverlay from './DocumentZoomOverlay.jsx'

function DispatchAgreementScreen({
  carrier,
  dispatcherProfile,
  gameTime,
  onAccept,
  onBack,
}) {
  const rules = getAgreementRules(carrier)

  const now =
    (gameTime?.gameDayIndex ?? 0) * 1440 +
    (gameTime?.totalMinutesOfDay ?? 0)

  const signedDate =
    `${formatCompactDate(Math.floor(now / 1440))} · ${formatTime(now % 1440)}`

  const [reviewed, setReviewed] = useState({
    compensation: false,
    authority: false,
    scope: false,
    expectations: false,
  })

  const ready = Object.values(reviewed).every(Boolean)

  const reviewedCount =
    Object.values(reviewed).filter(Boolean).length

  const reviewTerm = (key) => {
    setReviewed((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const clauses = [
    {
      key: 'compensation',
      number: '01',
      title: 'Compensation',
      value: `${rules.percentage}% of carrier gross`,
      body:
        'Dispatch fee is earned from completed freight and follows the carrier payment workflow.',
    },
    {
      key: 'authority',
      number: '02',
      title: 'Booking Authority',
      value: rules.loadApprovalRequired
        ? 'Carrier approval required'
        : 'Dispatcher may book freight',
      body: rules.loadApprovalRequired
        ? 'Qualifying freight requires carrier approval before booking.'
        : 'Qualifying freight may be accepted without carrier pre-approval.',
    },
    {
      key: 'scope',
      number: '03',
      title: 'Operating Scope',
      value: `${rules.equipmentScope.join(', ')} · ${rules.preferredRegion}`,
      body: `${
        rules.minimumRatePerLoadedMile
          ? `Target $${rules.minimumRatePerLoadedMile.toFixed(2)}+ per loaded mile. `
          : 'Rate target is flexible. '
      }Driver assignment authority: ${
        rules.driverAssignmentAuthority
          ? 'authorized'
          : 'carrier controlled'
      }.`,
    },
    {
      key: 'expectations',
      number: '04',
      title: 'Service Expectations',
      value: 'Protect service, paperwork and communication',
      body:
        'On-time windows · clean PODs · clear driver communication · reasonable positioning.',
    },
  ]

  const dispatcherName =
    dispatcherProfile?.businessName ||
    dispatcherProfile?.displayName ||
    'Independent Dispatcher'

  return (
    <DocumentZoomOverlay
      variant="paper"
      title="Dispatch Agreement"
      eyebrow="CARRIERSOURCE · LIVE OPERATING TERMS"
      onClose={onBack}
    >
      <article className="agreement-paper agreement-paper-v2 docos-document-surface">

        <header className="agreement-v2-masthead">
          <span>CARRIERSOURCE · OPERATING AGREEMENT</span>

          <h2>Independent Dispatch Agreement</h2>

          <div className="agreement-v2-document-meta">
            <p>
              {carrier?.name || 'Carrier'}
              {' · '}
              {[carrier?.city, carrier?.state]
                .filter(Boolean)
                .join(', ') ||
                carrier?.serviceArea ||
                'Operating market'}
            </p>

            <small>{signedDate}</small>
          </div>
        </header>

        <section className="agreement-v2-parties">
          <div>
            <span>DISPATCHER</span>
            <strong>{dispatcherName}</strong>
          </div>

          <div>
            <span>CARRIER</span>
            <strong>{carrier?.name || 'Carrier'}</strong>
          </div>
        </section>

        <section className="agreement-v2-clauses">
          {clauses.map((clause) => {
            const isReviewed = reviewed[clause.key]

            return (
              <button
                type="button"
                className={`agreement-v2-clause ${
                  isReviewed ? 'reviewed' : ''
                }`}
                key={clause.key}
                onClick={() => reviewTerm(clause.key)}
              >
                <span className="agreement-v2-number">
                  {clause.number}
                </span>

                <div className="agreement-v2-clause-copy">
                  <span>{clause.title}</span>
                  <strong>{clause.value}</strong>
                  <p>{clause.body}</p>
                </div>

                <span
                  className="agreement-v2-check"
                  aria-hidden="true"
                >
                  {isReviewed ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </section>

        <section className="agreement-v2-system-note">
          <span>OPERATING EFFECT</span>

          <p>
            Once signed, these terms become the active operating
            agreement used by FreightLink, CarrierSource,
            LedgerDesk and Daily Closeout.
          </p>
        </section>

        <section className="agreement-v2-signature">
          <div className="agreement-v2-signature-heading">
            <span>ELECTRONIC ACCEPTANCE</span>
            <p>
              Review all four clauses before signing.
            </p>
          </div>

          <div className="agreement-v2-signature-row">
            <div className="agreement-v2-signature-line">
              <span>AUTHORIZED DISPATCHER</span>
              <strong>{dispatcherName}</strong>
              <i aria-hidden="true" />
            </div>

            <button
              type="button"
              className="agreement-v2-sign"
              disabled={!ready}
              onClick={() => onAccept?.()}
            >
              {ready
                ? 'SIGN AGREEMENT'
                : `REVIEW ${reviewedCount}/4`}
            </button>
          </div>

          <small className="agreement-v2-acceptance-note">
            Electronic acceptance activates this carrier relationship.
          </small>
        </section>

      </article>
    </DocumentZoomOverlay>
  )
}

export default DispatchAgreementScreen
