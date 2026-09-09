import { useState } from 'react'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import DocumentZoomOverlay from './DocumentZoomOverlay.jsx'

function DispatchAgreementScreen({ carrier, gameTime, onAccept, onBack }) {
  const fee = carrier?.dispatchAgreement?.percentage ?? 8
  const approvalRequired = carrier?.dispatchAgreement?.loadApprovalRequired !== false
  const now = (gameTime?.gameDayIndex ?? 0) * 1440 + (gameTime?.totalMinutesOfDay ?? 0)
  const signedDate = `${formatCompactDate(Math.floor(now / 1440))} · ${formatTime(now % 1440)}`
  const [reviewed, setReviewed] = useState({ compensation: false, authority: false, expectations: false })
  const ready = Object.values(reviewed).every(Boolean)
  const reviewTerm = (key) => setReviewed((current) => ({ ...current, [key]: !current[key] }))

  return (
    <DocumentZoomOverlay
      title="Dispatch Agreement"
      eyebrow="DOC OS · CARRIER RELATIONSHIP"
      onClose={onBack}
      footer={<button type="button" className="docos-primary-action document-sign-action" disabled={!ready} onClick={() => onAccept?.()}>{ready ? 'SIGN & ACTIVATE AGREEMENT' : `REVIEW TERMS · ${Object.values(reviewed).filter(Boolean).length}/3`}</button>}
    >
      <article className="agreement-paper docos-document-surface">
        <div className="agreement-paper-masthead"><span>DOC OS · OPERATING AGREEMENT</span><h2>Independent Dispatch Agreement</h2><p>{carrier?.name || 'Metroline Transport'} · New York market</p></div>
        <section className="agreement-contract-parties"><div><span>DISPATCHER</span><strong>DOC OS Dispatch</strong></div><div><span>CARRIER</span><strong>{carrier?.name || 'Metroline Transport'}</strong></div></section>
        <section className="agreement-key-terms">
          <button type="button" className={reviewed.compensation ? 'reviewed' : ''} onClick={() => reviewTerm('compensation')}><span>01 · COMPENSATION</span><strong>{fee}% of carrier gross</strong><small>Dispatch fee is earned after an approved POD clears the load for billing.</small><b>{reviewed.compensation ? 'REVIEWED ✓' : 'TAP TO REVIEW'}</b></button>
          <button type="button" className={reviewed.authority ? 'reviewed' : ''} onClick={() => reviewTerm('authority')}><span>02 · BOOKING AUTHORITY</span><strong>{approvalRequired ? 'Carrier approval required' : 'Dispatcher may book freight'}</strong><small>{approvalRequired ? 'Email carrier operations for approval before accepting each FreightLink load.' : 'Qualifying freight may be accepted without carrier pre-approval.'}</small><b>{reviewed.authority ? 'REVIEWED ✓' : 'TAP TO REVIEW'}</b></button>
          <button type="button" className={reviewed.expectations ? 'reviewed' : ''} onClick={() => reviewTerm('expectations')}><span>03 · OPERATING EXPECTATIONS</span><strong>Protect the truck and the relationship</strong><small>Reasonable deadhead · on-time windows · clear driver communication · smart positioning.</small><b>{reviewed.expectations ? 'REVIEWED ✓' : 'TAP TO REVIEW'}</b></button>
        </section>
        <section className="agreement-operational-consequence"><span>OPERATIONAL EFFECT</span><strong>{approvalRequired ? 'Carrier approval becomes part of the booking workflow.' : 'Booking authority becomes active immediately.'}</strong><p>DOC OS will enforce these terms after signature.</p></section>
        <section className="agreement-signature-form electronic-signature"><div className="electronic-signature-copy"><span>ELECTRONIC ACCEPTANCE</span><p>Review all three key terms, then sign below.</p></div><div className="agreement-signature-meta"><div><span>SIGNER</span><strong>Authorized Dispatcher</strong></div><div><span>DATE</span><strong>{signedDate}</strong></div></div></section>
      </article>
    </DocumentZoomOverlay>
  )
}
export default DispatchAgreementScreen
