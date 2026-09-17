import DocumentZoomOverlay from './DocumentZoomOverlay.jsx'
import mapLocations from '../data/mapLocations.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'
}

function OperationalDocumentViewer({ attachment, loads = [], workflows = {}, businessDocuments = [], onClose, onRateConCheck, onConfirmRateCon, onRequestRateConCorrection }) {
  if (!attachment) return null
  const load = attachment.loadId ? loads.find((item) => item.id === attachment.loadId) : null
  const workflow = attachment.loadId ? workflows[attachment.loadId] || {} : {}
  const pickup = load ? mapLocations.find((item) => item.id === load.pickupLocationId) : null
  const delivery = load ? mapLocations.find((item) => item.id === load.deliveryLocationId) : null
  const businessDocument = attachment.sourceId ? businessDocuments.find((item) => item.id === attachment.sourceId) : null

  let title = attachment.title || 'Document'
  let body = null

  if (attachment.type === 'load-offer' && load) {
    body = <article className="docos-document-surface operational-document-paper">
      <div className="operational-document-masthead"><span>DOC OS · FREIGHTLINK LOAD OFFER</span><h2>{getFreightRouteName(load)}</h2><p>Load offer snapshot</p></div>
      <div className="operational-document-grid"><div><span>PICKUP</span><strong>{pickup?.name || 'Pickup'}</strong></div><div><span>DELIVERY</span><strong>{delivery?.name || 'Delivery'}</strong></div><div><span>RATE</span><strong>{money(load.rate)}</strong></div><div><span>STATUS</span><strong>{load.carrierApprovalStatus || load.status || 'AVAILABLE'}</strong></div></div>
      <div className="operational-document-note"><span>RELATED WORKFLOW</span><strong>{load.carrierApprovalStatus === 'PENDING' ? 'Awaiting carrier approval' : load.carrierApprovalStatus === 'APPROVED' ? 'Approved to book' : 'FreightLink record'}</strong></div>
    </article>
  } else if (attachment.type === 'rate-confirmation' && load && load.rateConfirmation) {
    const rc = load.rateConfirmation
    body = <article className="docos-document-surface ratecon-paper">
      <div className="pod-paper-masthead"><span>METROLINE TRANSPORT · RATE CONFIRMATION</span><strong>{rc.reference || `RC-${load.id}`}</strong><small>{getFreightRouteName(load)} · Version {rc.version || 1}</small></div>
      <div className="pod-paper-route"><div><span>CARRIER</span><strong>{rc.carrierName || 'Carrier'}</strong></div><div><span>STATUS</span><strong>{rc.status || 'RECEIVED'}</strong></div></div>
      <div className="ratecon-lane"><div><span>PICKUP</span><strong>{pickup?.name || 'Pickup'}</strong></div><b>→</b><div><span>DELIVERY</span><strong>{delivery?.name || 'Delivery'}</strong></div></div>
      <div className="pod-paper-freight ratecon-summary"><div><span>AGREED RATE</span><strong>{money(rc.rate)}</strong></div><div><span>LISTED MILES</span><strong>{Number.isFinite(Number(rc.listedMiles)) ? `${Number(rc.listedMiles).toFixed(1)} mi` : '—'}</strong></div></div>
      <div className="ratecon-review-note"><span>{rc.status === 'CORRECTION_REQUESTED' ? 'CORRECTION REQUESTED' : 'MANUAL REVIEW'}</span><strong>{rc.status === 'CORRECTION_REQUESTED' ? 'Waiting for Metroline Documentation to return a corrected Rate Confirmation.' : 'Compare the FreightLink offer with the carrier document. Mark each field ✓ or X.'}</strong></div>
      {rc.status !== 'CORRECTION_REQUESTED' && rc.status !== 'CONFIRMED' && <div className="ratecon-compare">
        <div className="ratecon-compare-head"><span>FIELD</span><span>FREIGHTLINK</span><span>RATE CON</span><span>CHECK</span></div>
        {[
          ['pickup','Pickup',pickup?.name || 'Pickup', mapLocations.find((item) => item.id === rc.pickupLocationId)?.name || 'Pickup'],
          ['delivery','Delivery',delivery?.name || 'Delivery', mapLocations.find((item) => item.id === rc.deliveryLocationId)?.name || 'Delivery'],
          ['rate','Rate',money(load.rate),money(rc.rate)],
          ['miles','Miles',Number.isFinite(Number(load.listedMiles)) ? `${Number(load.listedMiles).toFixed(1)} mi` : '—',Number.isFinite(Number(rc.listedMiles)) ? `${Number(rc.listedMiles).toFixed(1)} mi` : '—'],
        ].map(([key,label,offerValue,rcValue]) => <div className="ratecon-compare-row" key={key}><strong>{label}</strong><span>{offerValue}</span><span>{rcValue}</span><div className="ratecon-check-actions"><button className={rc.reviewChecks?.[key] === 'match' ? 'selected' : ''} type="button" onClick={() => onRateConCheck?.(load.id,key,'match')}>✓</button><button className={rc.reviewChecks?.[key] === 'flag' ? 'flag selected' : 'flag'} type="button" onClick={() => onRateConCheck?.(load.id,key,'flag')}>×</button></div></div>)}
      </div>}
      {rc.status === 'CONFIRMED' ? <div className="ratecon-confirmed">✓ RATE CONFIRMATION CONFIRMED</div> : rc.status !== 'CORRECTION_REQUESTED' && <div className="ratecon-review-actions">{Object.values(rc.reviewChecks || {}).includes('flag') ? <button type="button" onClick={() => onRequestRateConCorrection?.(load.id)}>REQUEST CORRECTION</button> : <button type="button" disabled={!['pickup','delivery','rate','miles'].every((key) => rc.reviewChecks?.[key] === 'match')} onClick={() => onConfirmRateCon?.(load.id)}>CONFIRM RATE CON</button>}</div>}
    </article>
  } else if (attachment.type === 'settlement-packet' && load) {
    const rc = load.rateConfirmation
    const damaged = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
    const missing = Number(load.pod?.freightCondition?.missingAtPickup || 0)
    const hasException = damaged > 0 || missing > 0
    body = <article className="docos-document-surface operational-document-paper">
      <div className="operational-document-masthead"><span>DOC OS · LOAD PACKET</span><h2>{getFreightRouteName(load)}</h2><p>Permanent dispatch & settlement record</p></div>
      <div className="operational-document-grid"><div><span>GOVERNING RATE</span><strong>{money(rc?.rate ?? load.rate)}</strong></div><div><span>PAYMENT</span><strong>{workflow.financialStatus || 'PENDING'}</strong></div><div><span>RATE CONFIRMATION</span><strong>{rc?.status === 'CONFIRMED' ? `${rc.reference} · CONFIRMED` : 'NOT CONFIRMED'}</strong></div><div><span>POD</span><strong>{load.pod?.approved ? `APPROVED · V${load.pod?.version || 1}` : 'NOT APPROVED'}</strong></div></div>
      <div className="operational-document-note"><span>PACKET CONTENTS</span><strong>FreightLink Offer · Rate Confirmation v{rc?.version || 1} · {hasException ? 'Exception Record · ' : ''}POD v{load.pod?.version || 1} · {workflow.invoiceNumber || 'Invoice pending'}</strong></div>
      <div className="operational-document-note"><span>SETTLEMENT STATUS</span><strong>{workflow.financialStatus === 'PAID' ? 'Payment received. Packet retained as the final business record.' : workflow.submissionStatus === 'SUBMITTED' ? 'Invoice submitted. Supporting documents retained while payment is pending.' : 'Invoice created. Submission or payment is still outstanding.'}</strong></div>
    </article>
  } else if (attachment.type === 'invoice' && load) {
    body = <article className="docos-document-surface operational-document-paper">
      <div className="operational-document-masthead"><span>DOC OS · DISPATCH INVOICE</span><h2>{workflow.invoiceNumber || attachment.title}</h2><p>{getFreightRouteName(load)}</p></div>
      <div className="operational-document-grid"><div><span>CARRIER GROSS</span><strong>{money(load.rate)}</strong></div><div><span>INVOICE STATUS</span><strong>{workflow.submissionStatus || workflow.financialStatus || 'DRAFT'}</strong></div><div><span>ROUTE</span><strong>{getFreightRouteName(load)}</strong></div><div><span>SUPPORTING POD</span><strong>{load.pod?.approved ? 'APPROVED' : load.pod ? 'AVAILABLE' : 'NOT AVAILABLE'}</strong></div></div>
    </article>
  } else if (attachment.type === 'exception-report' && load) {
    const damaged = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
    const missing = Number(load.pod?.freightCondition?.missingAtPickup || 0)
    body = <article className="docos-document-surface operational-document-paper"><div className="operational-document-masthead"><span>DOC OS · FREIGHT EXCEPTION</span><h2>{getFreightRouteName(load)}</h2><p>Shipment condition record</p></div><div className="operational-document-grid"><div><span>DAMAGED</span><strong>{damaged}</strong></div><div><span>MISSING</span><strong>{missing}</strong></div></div></article>
  } else if (businessDocument) {
    body = <article className="docos-document-surface operational-document-paper"><div className="operational-document-masthead"><span>DOC OS · BUSINESS DOCUMENT</span><h2>{businessDocument.title || title}</h2><p>{businessDocument.carrierName || 'Carrier document'}</p></div><div className="operational-document-note"><span>STATUS</span><strong>{businessDocument.status || 'ACTIVE'}</strong></div></article>
  } else {
    body = <article className="docos-document-surface operational-document-paper"><div className="operational-document-masthead"><span>DOC OS · DOCUMENT</span><h2>{title}</h2><p>{attachment.meta || attachment.type || 'Operational file'}</p></div></article>
  }

  return <DocumentZoomOverlay title={title} eyebrow="DOC OS · DOCUMENT VIEW" onClose={onClose}>{body}</DocumentZoomOverlay>
}

export default OperationalDocumentViewer
