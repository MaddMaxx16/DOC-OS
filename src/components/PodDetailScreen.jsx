import { useState } from 'react'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import DocumentZoomOverlay from './DocumentZoomOverlay.jsx'

function formatGameTimestamp(minutes) {
  if (!Number.isFinite(minutes)) return 'Unavailable'
  const rounded = Math.round(minutes)
  return `${formatCompactDate(Math.floor(rounded / 1440))} · ${formatTime(rounded % 1440)}`
}

function PodDetailScreen({ load, driver, delivery, onBack, onUpdateVerification, onApprovePod, onRequestCorrection, readOnly = false }) {
  const [approvalError, setApprovalError] = useState('')
  if (!load?.pod) return <DocumentZoomOverlay title="POD unavailable" onClose={onBack}><div className="docos-document-missing">Document unavailable.</div></DocumentZoomOverlay>

  const pod = load.pod
  const verification = { signature: false, pieceCount: false, damage: false, deliveryInfo: false, ...(pod.verification || {}) }
  const recordPieces = Number.isFinite(Number(pod.freightCondition?.loadedAtPickup)) ? Number(pod.freightCondition.loadedAtPickup) : Number(pod.piecesReceived)
  const recordDamageCount = Number(pod.freightCondition?.damagedAtPickup || 0)
  const recordDamage = recordDamageCount > 0 ? `${recordDamageCount} pallet${recordDamageCount === 1 ? '' : 's'} noted` : 'None'
  const pieceMismatch = Number(pod.piecesReceived) !== Number(recordPieces)
  const damageMismatch = String(pod.damage || '').trim() !== recordDamage
  const hasMismatch = pieceMismatch || damageMismatch
  const correctionPending = pod.correctionStatus === 'PENDING'
  const corrected = pod.correctionStatus === 'CORRECTED'

  const checks = [
    ['signature', 'Receiver signature is present', Boolean(pod.signedBy)],
    ['pieceCount', `POD piece count · ${pod.piecesReceived} / ${pod.piecesExpected}`, Number.isFinite(Number(pod.piecesReceived)) && Number.isFinite(Number(pod.piecesExpected))],
    ['damage', `POD damage notation · ${pod.damage || 'Blank'}`, Boolean(pod.damage)],
    ['deliveryInfo', 'Delivery information is complete', Number.isFinite(pod.receivedGameMinute) && Boolean(driver && delivery && load.id)],
  ]
  const verified = checks.every(([key, , valid]) => valid && verification[key])
  const driverName = driver?.fullName || driver?.name || 'Unknown'
  const documentStatus = readOnly ? 'APPROVED' : correctionPending ? 'CORRECTION PENDING' : corrected ? 'CORRECTED · REVIEW' : verified ? 'REVIEW COMPLETE' : 'PENDING REVIEW'

  const approve = () => {
    setApprovalError('')
    const ok = onApprovePod?.()
    if (ok === false) setApprovalError('This POD does not match the shipment record. Request a correction before approving it for billing.')
  }

  const footer = readOnly ? null : correctionPending ? <div className="pod-overlay-footer-status"><span>CORRECTION REQUEST SENT</span><strong>Waiting for corrected paperwork</strong></div> : (
    <div className="pod-overlay-actions">
      <button type="button" className="pod-secondary-button" onClick={() => { setApprovalError(''); onRequestCorrection?.() }}>REQUEST CORRECTION</button>
      <button type="button" className="pod-approve-button" disabled={!verified} onClick={approve}>APPROVE POD</button>
    </div>
  )

  return (
    <DocumentZoomOverlay title={`POD · ${load.loadNumber || load.id}`} eyebrow="DOC OS · DELIVERY DOCUMENT" onClose={onBack} footer={footer}>
      <div className="pod-expanded-layout">
        <article className="pod-paper docos-document-surface" aria-label="Proof of delivery document">
          <div className="pod-paper-masthead"><span>DOC OS · PROOF OF DELIVERY</span><strong>{load.loadNumber || load.id}</strong><small>{delivery?.name || 'Receiver'} · {formatGameTimestamp(pod.receivedGameMinute)}</small></div>
          <div className="pod-paper-route"><div><span>DRIVER</span><strong>{driverName}</strong></div><div><span>RECEIVER</span><strong>{delivery?.name || 'Unknown'}</strong></div></div>
          <div className="pod-paper-freight">
            <div><span>PIECES RECEIVED</span><strong>{pod.piecesReceived} / {pod.piecesExpected}</strong></div>
            <div className={String(pod.damage) !== 'None' ? 'exception' : ''}><span>DAMAGE NOTED</span><strong>{pod.damage || 'Blank'}</strong></div>
          </div>
          <div className="pod-paper-signature"><span>RECEIVER SIGNATURE</span><strong>{pod.signedBy || 'Not provided'}</strong><small>Electronically captured at delivery</small></div>
          {corrected && <div className="pod-corrected-stamp">CORRECTED COPY</div>}
        </article>

        {!readOnly && (
          <section className="pod-shipment-record docos-review-panel">
            <div className="pod-section-heading"><div><span className="pod-kicker">DOC OS SHIPMENT RECORD</span><h3>Compare before approving</h3></div><span className="pod-mini-status">COMPARE</span></div>
            <div className="pod-record-grid"><div><span>Recorded pieces</span><strong>{recordPieces} / {pod.piecesExpected}</strong></div><div><span>Recorded damage</span><strong>{recordDamage}</strong></div></div>
            <p>The POD is receiver paperwork. DOC OS carries the shipment truth forward from pickup and delivery. Confirm they agree.</p>
          </section>
        )}

        <section className="pod-verification docos-review-panel" aria-label="POD verification checklist">
          <div className="pod-section-heading"><div><span className="pod-kicker">DOCUMENT CHECK</span><h3>{documentStatus}</h3></div><span className={`pod-mini-status ${verified || readOnly ? 'complete' : ''}`}>{readOnly ? 'APPROVED' : `${checks.filter(([key]) => verification[key]).length} / ${checks.length}`}</span></div>
          <div className="pod-verification-list">
            {checks.map(([key, label, valid]) => {
              const checked = Boolean(verification[key])
              return <label key={key} className={`pod-check-row ${checked ? 'checked' : ''} ${!valid ? 'invalid' : ''}`}><input type="checkbox" disabled={readOnly || correctionPending || !valid} checked={checked} onChange={(event) => onUpdateVerification(key, event.target.checked)} /><span className="pod-check-control" aria-hidden="true">{checked ? '✓' : ''}</span><span className="pod-check-copy"><strong>{label}</strong>{!valid && <small>Missing information</small>}</span></label>
            })}
          </div>
          {approvalError && <div className="pod-approval-error" role="alert">{approvalError}</div>}
          {correctionPending && <div className="pod-correction-pending"><span>CORRECTION REQUEST SENT</span><strong>Waiting for corrected paperwork</strong><small>Email will notify you when the corrected POD arrives.</small></div>}
          {readOnly && <div className="pod-approved-card"><span>Approval complete</span><strong>{formatGameTimestamp(pod.approvedGameMinute)}</strong><small>Released to LedgerDesk for billing.</small></div>}
        </section>
      </div>
    </DocumentZoomOverlay>
  )
}
export default PodDetailScreen
