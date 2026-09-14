import { useState } from 'react'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import DocumentZoomOverlay from './DocumentZoomOverlay.jsx'

function DispatchAgreementScreen({ carrier, dispatcherProfile, gameTime, onAccept, onBack }) {
  const rules = getAgreementRules(carrier)
  const now = (gameTime?.gameDayIndex ?? 0) * 1440 + (gameTime?.totalMinutesOfDay ?? 0)
  const signedDate = `${formatCompactDate(Math.floor(now / 1440))} · ${formatTime(now % 1440)}`
  const [reviewed, setReviewed] = useState({ compensation: false, authority: false, expectations: false, scope: false })
  const ready = Object.values(reviewed).every(Boolean)
  const reviewTerm = (key) => setReviewed((current) => ({ ...current, [key]: !current[key] }))
  const reviewedCount = Object.values(reviewed).filter(Boolean).length
  return <DocumentZoomOverlay title="Dispatch Agreement" eyebrow="CARRIERSOURCE · LIVE OPERATING TERMS" onClose={onBack} footer={<button type="button" className="docos-primary-action document-sign-action" disabled={!ready} onClick={()=>onAccept?.()}>{ready?'SIGN & ACTIVATE AGREEMENT':`REVIEW TERMS · ${reviewedCount}/4`}</button>}>
    <article className="agreement-paper docos-document-surface">
      <div className="agreement-paper-masthead"><span>CARRIERSOURCE · OPERATING AGREEMENT</span><h2>Independent Dispatch Agreement</h2><p>{carrier?.name || 'Carrier'} · {[carrier?.city, carrier?.state].filter(Boolean).join(', ') || carrier?.serviceArea || 'Operating market'}</p></div>
      <section className="agreement-contract-parties"><div><span>DISPATCHER</span><strong>{dispatcherProfile?.displayName || 'Independent Dispatcher'}</strong></div><div><span>CARRIER</span><strong>{carrier?.name || 'Carrier'}</strong></div></section>
      <section className="agreement-key-terms">
        <button type="button" className={reviewed.compensation?'reviewed':''} onClick={()=>reviewTerm('compensation')}><span>01 · COMPENSATION</span><strong>{rules.percentage}% of carrier gross</strong><small>Dispatch fee is earned from completed freight and follows the carrier payment workflow.</small><b>{reviewed.compensation?'REVIEWED ✓':'TAP TO REVIEW'}</b></button>
        <button type="button" className={reviewed.authority?'reviewed':''} onClick={()=>reviewTerm('authority')}><span>02 · BOOKING AUTHORITY</span><strong>{rules.loadApprovalRequired?'Carrier approval required':'Dispatcher may book freight'}</strong><small>{rules.loadApprovalRequired?'FreightLink requires carrier approval before booking qualifying freight.':'Qualifying freight may be accepted without carrier pre-approval.'}</small><b>{reviewed.authority?'REVIEWED ✓':'TAP TO REVIEW'}</b></button>
        <button type="button" className={reviewed.scope?'reviewed':''} onClick={()=>reviewTerm('scope')}><span>03 · OPERATING SCOPE</span><strong>{rules.equipmentScope.join(', ')} · {rules.preferredRegion}</strong><small>{rules.minimumRatePerLoadedMile?`Target $${rules.minimumRatePerLoadedMile.toFixed(2)}+ per loaded mile.`:'Rate target is flexible.'} Driver assignment authority: {rules.driverAssignmentAuthority?'authorized':'carrier controlled'}.</small><b>{reviewed.scope?'REVIEWED ✓':'TAP TO REVIEW'}</b></button>
        <button type="button" className={reviewed.expectations?'reviewed':''} onClick={()=>reviewTerm('expectations')}><span>04 · SERVICE EXPECTATIONS</span><strong>Protect service, paperwork and communication</strong><small>On-time windows · clean PODs · clear driver communication · reasonable positioning.</small><b>{reviewed.expectations?'REVIEWED ✓':'TAP TO REVIEW'}</b></button>
      </section>
      <section className="agreement-operational-consequence"><span>LIVE SYSTEM EFFECT</span><strong>These terms become DOC OS operating rules after signature.</strong><p>FreightLink, LedgerDesk, CarrierSource and Daily Closeout will use this agreement as their source of truth.</p></section>
      <section className="agreement-signature-form electronic-signature"><div className="electronic-signature-copy"><span>ELECTRONIC ACCEPTANCE</span><p>Review all four live terms, then sign below.</p></div><div className="agreement-signature-meta"><div><span>SIGNER</span><strong>{dispatcherProfile?.displayName || 'Authorized Dispatcher'}</strong></div><div><span>DATE</span><strong>{signedDate}</strong></div></div></section>
    </article>
  </DocumentZoomOverlay>
}
export default DispatchAgreementScreen
