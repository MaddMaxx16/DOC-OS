import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import DocumentZoomOverlay from './DocumentZoomOverlay.jsx'

function AgreementPaper({ document, signedDate }) {
  return <article className="agreement-paper read-only-agreement docos-document-surface">
    <div className="agreement-paper-masthead"><span>DOC OS · SIGNED AGREEMENT</span><h2>Independent Dispatch Agreement</h2><p>{document.carrierName || 'Carrier'} · Executed operating agreement</p></div>
    <section className="agreement-contract-parties"><div><span>DISPATCHER</span><strong>DOC OS Dispatch</strong></div><div><span>CARRIER</span><strong>{document.carrierName}</strong></div></section>
    <section className="agreement-key-terms static">
      <div><span>01 · COMPENSATION</span><strong>{document.terms?.dispatchFee || '8% of carrier gross'}</strong><small>Dispatch services compensation.</small></div>
      <div><span>02 · BOOKING AUTHORITY</span><strong>{document.terms?.loadApprovalRequired ? 'Carrier approval required' : 'Dispatcher booking authority'}</strong><small>{document.terms?.loadApprovalRequired ? 'Carrier must approve freight before acceptance.' : 'Dispatcher may accept qualifying freight.'}</small></div>
      <div><span>03 · OPERATING EXPECTATIONS</span><strong>On-time service · communication · positioning</strong><small>Reasonable judgment applies as market conditions change.</small></div>
    </section>
    <section className="agreement-signed-block"><span>ELECTRONICALLY SIGNED BY</span><strong>{document.signedBy || 'Authorized Dispatcher'}</strong><small>{signedDate}</small></section>
  </article>
}

function BusinessDocumentDetailScreen({ document, onBack }) {
  if (!document) return null
  const signedDate = Number.isFinite(document.signedGameMinute) ? `${formatCompactDate(Math.floor(document.signedGameMinute / 1440))} · ${formatTime(document.signedGameMinute % 1440)}` : 'Signed'
  return <DocumentZoomOverlay title={`${document.carrierName || 'Carrier'} Agreement`} eyebrow="DOC OS · SIGNED DOCUMENT" onClose={onBack}><AgreementPaper document={document} signedDate={signedDate} /></DocumentZoomOverlay>
}
export default BusinessDocumentDetailScreen
