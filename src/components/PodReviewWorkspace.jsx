import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function formatGameTimestamp(minutes) {
  if (!Number.isFinite(Number(minutes))) return 'Unavailable'
  const rounded = Math.max(0, Math.floor(Number(minutes)))
  return `${formatCompactDate(Math.floor(rounded / 1440))} · ${formatTime(rounded % 1440)}`
}

// B.5.4C.5.1.1 — POD Physical Comparison v2
function PodReviewWorkspace({
  load,
  driver,
  delivery,
  onBack,
  onUpdateVerification,
  onApprovePod,
  onRequestCorrection,
  readOnly = false,
}) {
  const [frontDocument, setFrontDocument] = useState('pod')
  const [approvalError, setApprovalError] = useState('')

  const pod = load?.pod || null
  const pickup = load
    ? mapLocations.find((location) => location.id === load.pickupLocationId)
    : null

  const verification = {
    signature: false,
    pieceCount: false,
    damage: false,
    deliveryInfo: false,
    ...(pod?.verification || {}),
  }

  const recordPieces = Number.isFinite(Number(pod?.freightCondition?.loadedAtPickup))
    ? Number(pod.freightCondition.loadedAtPickup)
    : Number(pod?.piecesReceived)

  const recordDamageCount = Number(pod?.freightCondition?.damagedAtPickup || 0)
  const recordMissingCount = Number(pod?.freightCondition?.missingAtPickup || 0)

  const recordDamage =
    recordDamageCount > 0
      ? `${recordDamageCount} pallet${recordDamageCount === 1 ? '' : 's'} noted`
      : 'None'

  const pieceMismatch = Number(pod?.piecesReceived) !== Number(recordPieces)
  const damageMismatch = String(pod?.damage || '').trim() !== recordDamage
  const hasMismatch = pieceMismatch || damageMismatch
  const hasException = recordDamageCount > 0 || recordMissingCount > 0

  const correctionPending = pod?.correctionStatus === 'PENDING'
  const corrected = pod?.correctionStatus === 'CORRECTED'
  const approved = readOnly || Boolean(pod?.approved)

  const driverName =
    driver?.fullName ||
    driver?.name ||
    'Unknown driver'

  const reviewItems = [
    {
      key: 'deliveryInfo',
      label: 'Delivery information',
      valid:
        Number.isFinite(Number(pod?.receivedGameMinute)) &&
        Boolean(driver && delivery && load?.id),
    },
    {
      key: 'pieceCount',
      label: 'Piece count',
      valid:
        Number.isFinite(Number(pod?.piecesReceived)) &&
        Number.isFinite(Number(pod?.piecesExpected)),
    },
    {
      key: 'damage',
      label: 'Damage notation',
      valid: Boolean(pod?.damage),
    },
    {
      key: 'signature',
      label: 'Receiver signature',
      valid: Boolean(pod?.signedBy),
    },
  ]

  const verified = reviewItems.every(
    ({ key, valid }) => valid && verification[key]
  )

  const checkedCount = reviewItems.filter(
    ({ key }) => verification[key]
  ).length

  const toggleVerification = (key, valid) => {
    if (approved || correctionPending || !valid) return
    setApprovalError('')
    onUpdateVerification?.(key, !verification[key])
  }

  const approve = () => {
    if (approved || correctionPending || !verified) return

    setApprovalError('')
    const ok = onApprovePod?.()

    if (ok === false) {
      setApprovalError(
        'The POD does not match the shipment record. Request corrected paperwork before billing.'
      )
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (typeof document === 'undefined') return null

  if (!load || !pod) {
    return createPortal(
      <div className="pod2-overlay">
        <section className="pod2-screen">
          <header className="pod2-toolbar">
            <button type="button" onClick={onBack}>‹</button>
            <div>
              <span>DOC OS · DELIVERY FILE</span>
              <strong>POD unavailable</strong>
            </div>
          </header>
        </section>
      </div>,
      document.body,
    )
  }

  const reviewMark = (key, label, valid) => {
    const checked = Boolean(verification[key])

    return (
      <button
        type="button"
        className={`pod2-review-mark ${checked ? 'checked' : ''} ${!valid ? 'invalid' : ''}`}
        disabled={approved || correctionPending || !valid}
        onClick={() => toggleVerification(key, valid)}
        aria-label={`${label}: ${checked ? 'verified' : 'not verified'}`}
      >
        <i aria-hidden="true">{checked ? '✓' : ''}</i>
        <span>{checked ? 'VERIFIED' : 'VERIFY'}</span>
      </button>
    )
  }

  return createPortal(
    <div
      className="pod2-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${getFreightRouteName(load)} POD review`}
    >
      <section className="pod2-screen">

        <header className="pod2-toolbar">
          <button
            type="button"
            onClick={onBack}
            aria-label="Close POD review"
          >
            ‹
          </button>

          <div>
            <span>DOC OS · DELIVERY FILE</span>
            <strong>{getFreightRouteName(load)}</strong>
          </div>

          <small>
            {approved
              ? 'APPROVED'
              : correctionPending
                ? 'CORRECTION PENDING'
                : corrected
                  ? 'CORRECTED COPY'
                  : 'POD REVIEW'}
          </small>
        </header>

        <main className="pod2-desk">

          <div className="pod2-folder" aria-hidden="true">
            <span>LOAD FILE</span>
            <strong>{load.loadNumber || load.id}</strong>
            <small>Delivery documentation</small>
          </div>

          <section
            className={`pod2-layer pod2-shipment-layer ${
              frontDocument === 'shipment' ? 'front' : 'rear'
            }`}
          >
            <article className="pod2-paper pod2-shipment-paper">
              <header>
                <span>DOC OS · SHIPMENT RECORD</span>
                <h2>{load.loadNumber || load.id}</h2>
                <p>Dispatch reference copy</p>
              </header>

              <div className="pod2-route">
                <div>
                  <span>PICKUP</span>
                  <strong>{pickup?.name || 'Pickup'}</strong>
                </div>

                <b aria-hidden="true">→</b>

                <div>
                  <span>DELIVERY</span>
                  <strong>{delivery?.name || 'Delivery'}</strong>
                </div>
              </div>

              <div className="pod2-record-grid">
                <div>
                  <span>DRIVER</span>
                  <strong>{driverName}</strong>
                </div>

                <div>
                  <span>EXPECTED PIECES</span>
                  <strong>{pod.piecesExpected ?? '—'}</strong>
                </div>

                <div className={pieceMismatch ? 'attention' : ''}>
                  <span>LOADED AT PICKUP</span>
                  <strong>{Number.isFinite(recordPieces) ? recordPieces : '—'}</strong>
                </div>

                <div className={damageMismatch ? 'attention' : ''}>
                  <span>DAMAGE AT PICKUP</span>
                  <strong>{recordDamage}</strong>
                </div>

                <div className={recordMissingCount > 0 ? 'attention' : ''}>
                  <span>MISSING AT PICKUP</span>
                  <strong>{recordMissingCount}</strong>
                </div>

                <div>
                  <span>LOAD STATUS</span>
                  <strong>{load.tripStatus || load.status || 'DELIVERED'}</strong>
                </div>
              </div>

              <div className="pod2-record-note">
                <span>REFERENCE COPY</span>
                <p>
                  Compare this dispatch record against the receiver-issued
                  Proof of Delivery before releasing documentation to billing.
                </p>
              </div>
            </article>

            {frontDocument !== 'shipment' && (
              <button
                type="button"
                className="pod2-hitbox"
                onClick={() => setFrontDocument('shipment')}
                aria-label="Bring Shipment Record forward"
              />
            )}
          </section>

          {hasException && (
            <section
              className={`pod2-layer pod2-exception-layer ${
                frontDocument === 'exception' ? 'front' : 'rear'
              }`}
            >
              <article className="pod2-paper pod2-exception-paper">
                <header>
                  <span>FREIGHT EXCEPTION</span>
                  <h2>Condition Record</h2>
                  <p>{load.loadNumber || load.id}</p>
                </header>

                <div className="pod2-exception-counts">
                  <div>
                    <span>DAMAGED</span>
                    <strong>{recordDamageCount}</strong>
                  </div>

                  <div>
                    <span>MISSING</span>
                    <strong>{recordMissingCount}</strong>
                  </div>
                </div>

                <p className="pod2-exception-note">
                  Supporting exception documentation accompanies correction
                  requests involving damaged or missing freight.
                </p>
              </article>

              {frontDocument !== 'exception' && (
                <button
                  type="button"
                  className="pod2-hitbox"
                  onClick={() => setFrontDocument('exception')}
                  aria-label="Bring Exception Record forward"
                />
              )}
            </section>
          )}

          <section
            className={`pod2-layer pod2-pod-layer ${
              frontDocument === 'pod' ? 'front' : 'rear'
            }`}
          >
            <article className="pod2-paper pod2-pod-paper">

              <header className="pod2-pod-masthead">
                <div>
                  <span>PROOF OF DELIVERY</span>
                  <h2>{load.loadNumber || load.id}</h2>
                  <p>
                    {delivery?.name || 'Receiver'}
                    {' · '}
                    {formatGameTimestamp(pod.receivedGameMinute)}
                  </p>
                </div>

                {reviewMark(
                  'deliveryInfo',
                  'Delivery information',
                  reviewItems.find((item) => item.key === 'deliveryInfo')?.valid
                )}
              </header>

              <section className="pod2-party-row">
                <div>
                  <span>DRIVER</span>
                  <strong>{driverName}</strong>
                </div>

                <div>
                  <span>RECEIVER</span>
                  <strong>{delivery?.name || 'Unknown'}</strong>
                </div>
              </section>

              <section className="pod2-data-row">
                <div className={pieceMismatch ? 'attention' : ''}>
                  <span>PIECES RECEIVED</span>
                  <strong>
                    {pod.piecesReceived ?? '—'} / {pod.piecesExpected ?? '—'}
                  </strong>

                  {reviewMark(
                    'pieceCount',
                    'Piece count',
                    reviewItems.find((item) => item.key === 'pieceCount')?.valid
                  )}
                </div>

                <div className={damageMismatch ? 'attention' : ''}>
                  <span>DAMAGE NOTED</span>
                  <strong>{pod.damage || 'Blank'}</strong>

                  {reviewMark(
                    'damage',
                    'Damage notation',
                    reviewItems.find((item) => item.key === 'damage')?.valid
                  )}
                </div>
              </section>

              <section className="pod2-signature-block">
                <div>
                  <span>RECEIVER SIGNATURE</span>
                  <strong>{pod.signedBy || 'Not provided'}</strong>
                  <small>Electronically captured at delivery</small>
                </div>

                {reviewMark(
                  'signature',
                  'Receiver signature',
                  reviewItems.find((item) => item.key === 'signature')?.valid
                )}
              </section>

              <section className="pod2-document-note">
                <span>DELIVERY CERTIFICATION</span>
                <p>
                  This document records freight received at delivery and
                  supports final load closeout and billing.
                </p>
              </section>

              {corrected && (
                <div className="pod2-stamp corrected">
                  CORRECTED COPY
                </div>
              )}

              {approved && (
                <div className="pod2-stamp approved">
                  APPROVED
                </div>
              )}

              <footer className="pod2-paper-footer">
                <span>
                  REVIEW STATUS · {approved ? 'APPROVED' : `${checkedCount}/4 VERIFIED`}
                </span>

                <small>
                  Version {pod.version || 1}
                </small>
              </footer>
            </article>

            {frontDocument !== 'pod' && (
              <button
                type="button"
                className="pod2-hitbox"
                onClick={() => setFrontDocument('pod')}
                aria-label="Bring POD forward"
              />
            )}
          </section>

        </main>

        <footer className="pod2-desk-actions">
          <div className="pod2-action-copy">
            {approvalError ? (
              <>
                <span>DOCUMENT MISMATCH</span>
                <strong>{approvalError}</strong>
              </>
            ) : approved ? (
              <>
                <span>FILE COMPLETE</span>
                <strong>
                  POD approved · {formatGameTimestamp(pod.approvedGameMinute)}
                </strong>
              </>
            ) : correctionPending ? (
              <>
                <span>CORRECTION REQUESTED</span>
                <strong>Waiting for revised paperwork.</strong>
              </>
            ) : hasMismatch ? (
              <>
                <span>COMPARE DOCUMENTS</span>
                <strong>Shipment record and POD contain a discrepancy.</strong>
              </>
            ) : (
              <>
                <span>DOCUMENT REVIEW</span>
                <strong>
                  Verify the four marked areas directly on the POD.
                </strong>
              </>
            )}
          </div>

          {!approved && !correctionPending && (
            <div className="pod2-action-buttons">
              <button
                type="button"
                className={`pod2-request ${hasMismatch ? 'attention' : ''}`}
                onClick={() => {
                  setApprovalError('')
                  onRequestCorrection?.()
                }}
              >
                REQUEST CORRECTION
              </button>

              <button
                type="button"
                className="pod2-approve"
                disabled={!verified}
                onClick={approve}
              >
                {verified ? 'APPROVE POD' : `VERIFY ${checkedCount}/4`}
              </button>
            </div>
          )}
        </footer>

      </section>
    </div>,
    document.body,
  )
}

export default PodReviewWorkspace
