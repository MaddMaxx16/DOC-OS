import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function formatGameTimestamp(minutes) {
  if (!Number.isFinite(minutes)) return 'Unavailable'
  const rounded = Math.round(minutes)
  return `${formatCompactDate(Math.floor(rounded / 1440))} · ${formatTime(rounded % 1440)}`
}

function PodDetailScreen({ load, driver, delivery, onBack, onUpdateVerification, onApprovePod, readOnly = false, tutorialTarget = null }) {
  if (!load?.pod) {
    return (
      <div className="phone-page pod-detail-screen pod-detail-v2">
        <header className="pod-toolbar">
          <button type="button" className="pod-back" onClick={onBack} aria-label="Back to documents">‹</button>
          <div><span>POD Review</span><strong>Document unavailable</strong></div>
        </header>
      </div>
    )
  }

  const verification = {
    signature: false,
    pieceCount: false,
    damage: false,
    deliveryInfo: false,
    ...(load.pod.verification || {}),
  }

  const checks = [
    ['signature', 'Receiver signature present', Boolean(load.pod.signedBy)],
    ['pieceCount', `Piece count matches · ${load.pod.piecesReceived} / ${load.pod.piecesExpected}`, load.pod.piecesReceived === load.pod.piecesExpected],
    ['damage', 'No damage reported', load.pod.damage === 'None'],
    ['deliveryInfo', 'Delivery information complete', Number.isFinite(load.pod.receivedGameMinute) && Boolean(driver && delivery && load.id)],
  ]

  const verified = checks.every(([key, , valid]) => valid && verification[key])
  const documentStatus = readOnly ? 'APPROVED' : verified ? 'VERIFIED' : 'PENDING REVIEW'
  const driverName = driver?.fullName || driver?.name || 'Unknown'
  const approvalTime = formatGameTimestamp(load.pod.approvedGameMinute)

  return (
    <div className="phone-page pod-detail-screen pod-detail-v2">
      <header className="pod-toolbar">
        <button type="button" className="pod-back" onClick={onBack} aria-label="Back to documents">‹</button>
        <div>
          <span>POD Review</span>
          <strong>Proof of Delivery</strong>
        </div>
      </header>

      <section className="pod-hero">
        <div>
          <span className="pod-kicker">Document</span>
          <h2>{load.loadNumber || load.id}</h2>
        </div>
        <span className={`pod-status-pill ${readOnly ? 'approved' : verified ? 'verified' : 'pending'}`}>{documentStatus}</span>
      </section>

      <section className="pod-summary-card" aria-label="Proof of delivery details">
        <div className="pod-summary-row">
          <span>Driver</span>
          <strong>{driverName}</strong>
        </div>
        <div className="pod-summary-row">
          <span>Receiver</span>
          <strong>{delivery?.name || 'Unknown'}</strong>
        </div>
        <div className="pod-summary-row">
          <span>Delivered</span>
          <strong>{formatGameTimestamp(load.pod.receivedGameMinute)}</strong>
        </div>
        <div className="pod-summary-grid">
          <div>
            <span>Pieces</span>
            <strong>{load.pod.piecesReceived} / {load.pod.piecesExpected}</strong>
          </div>
          <div>
            <span>Damage</span>
            <strong>{load.pod.damage}</strong>
          </div>
        </div>
        <div className="pod-summary-row signed-by">
          <span>Signed by</span>
          <strong>{load.pod.signedBy || 'Not provided'}</strong>
        </div>
      </section>

      <section className="pod-verification" aria-label="POD verification checklist">
        <div className="pod-section-heading">
          <div>
            <span className="pod-kicker">Verification</span>
            <h3>Confirm the paperwork</h3>
          </div>
          <span className={`pod-mini-status ${verified || readOnly ? 'complete' : ''}`}>{readOnly ? 'APPROVED' : `${checks.filter(([key]) => verification[key]).length} / ${checks.length}`}</span>
        </div>
        <p className="pod-verification-help">Check each item against the POD before approving it for billing.</p>

        <div className="pod-verification-list">
          {checks.map(([key, label, valid]) => {
            const checked = Boolean(verification[key])
            return (
              <label
                key={key}
                className={`pod-check-row ${checked ? 'checked' : ''} ${!valid ? 'invalid' : ''} ${tutorialTarget === `pod-check:${key}` ? 'tutorial-target' : ''}`}
              >
                <input
                  type="checkbox"
                  disabled={readOnly || !valid}
                  checked={checked}
                  onChange={(event) => onUpdateVerification(key, event.target.checked)}
                />
                <span className="pod-check-control" aria-hidden="true">{checked ? '✓' : ''}</span>
                <span className="pod-check-copy">
                  <strong>{label}</strong>
                  {!valid && <small>Needs review before approval</small>}
                </span>
              </label>
            )
          })}
        </div>

        <div className={`pod-verification-status ${verified || readOnly ? 'verified' : ''}`}>
          <div>
            <span>Verification status</span>
            <strong>{readOnly ? 'APPROVED' : verified ? 'VERIFIED' : 'PENDING'}</strong>
          </div>
          <span className="pod-status-indicator" aria-hidden="true">{verified || readOnly ? '✓' : ''}</span>
        </div>

        {!readOnly ? (
          <button
            type="button"
            className={`pod-approve-button ${tutorialTarget === 'approve-pod' ? 'tutorial-target' : ''}`}
            disabled={!verified}
            onClick={onApprovePod}
          >
            APPROVE POD
          </button>
        ) : (
          <div className="pod-approved-card">
            <span>Approval complete</span>
            <strong>{approvalTime}</strong>
            <small>{load.loadNumber || load.id} is cleared for billing and stored in the archive.</small>
          </div>
        )}
      </section>
    </div>
  )
}

export default PodDetailScreen
