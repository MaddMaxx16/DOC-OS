import DocumentZoomOverlay from './DocumentZoomOverlay.jsx'
import mapLocations from '../data/mapLocations.js'

function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'
}

function OperationalDocumentViewer({ attachment, loads = [], workflows = {}, businessDocuments = [], onClose }) {
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
      <div className="operational-document-masthead"><span>DOC OS · FREIGHTLINK LOAD OFFER</span><h2>{load.loadNumber || load.id}</h2><p>Load offer snapshot</p></div>
      <div className="operational-document-grid"><div><span>PICKUP</span><strong>{pickup?.name || 'Pickup'}</strong></div><div><span>DELIVERY</span><strong>{delivery?.name || 'Delivery'}</strong></div><div><span>RATE</span><strong>{money(load.rate)}</strong></div><div><span>STATUS</span><strong>{load.carrierApprovalStatus || load.status || 'AVAILABLE'}</strong></div></div>
      <div className="operational-document-note"><span>RELATED WORKFLOW</span><strong>{load.carrierApprovalStatus === 'PENDING' ? 'Awaiting carrier approval' : load.carrierApprovalStatus === 'APPROVED' ? 'Approved to book' : 'FreightLink record'}</strong></div>
    </article>
  } else if (attachment.type === 'invoice' && load) {
    body = <article className="docos-document-surface operational-document-paper">
      <div className="operational-document-masthead"><span>DOC OS · DISPATCH INVOICE</span><h2>{workflow.invoiceNumber || attachment.title}</h2><p>{load.loadNumber || load.id}</p></div>
      <div className="operational-document-grid"><div><span>CARRIER GROSS</span><strong>{money(load.rate)}</strong></div><div><span>INVOICE STATUS</span><strong>{workflow.submissionStatus || workflow.financialStatus || 'DRAFT'}</strong></div><div><span>LOAD</span><strong>{load.loadNumber || load.id}</strong></div><div><span>SUPPORTING POD</span><strong>{load.pod?.approved ? 'APPROVED' : load.pod ? 'AVAILABLE' : 'NOT AVAILABLE'}</strong></div></div>
    </article>
  } else if (attachment.type === 'exception-report' && load) {
    const damaged = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
    const missing = Number(load.pod?.freightCondition?.missingAtPickup || 0)
    body = <article className="docos-document-surface operational-document-paper"><div className="operational-document-masthead"><span>DOC OS · FREIGHT EXCEPTION</span><h2>{load.loadNumber || load.id}</h2><p>Shipment condition record</p></div><div className="operational-document-grid"><div><span>DAMAGED</span><strong>{damaged}</strong></div><div><span>MISSING</span><strong>{missing}</strong></div></div></article>
  } else if (businessDocument) {
    body = <article className="docos-document-surface operational-document-paper"><div className="operational-document-masthead"><span>DOC OS · BUSINESS DOCUMENT</span><h2>{businessDocument.title || title}</h2><p>{businessDocument.carrierName || 'Carrier document'}</p></div><div className="operational-document-note"><span>STATUS</span><strong>{businessDocument.status || 'ACTIVE'}</strong></div></article>
  } else {
    body = <article className="docos-document-surface operational-document-paper"><div className="operational-document-masthead"><span>DOC OS · DOCUMENT</span><h2>{title}</h2><p>{attachment.meta || attachment.type || 'Operational file'}</p></div></article>
  }

  return <DocumentZoomOverlay title={title} eyebrow="DOC OS · DOCUMENT VIEW" onClose={onClose}>{body}</DocumentZoomOverlay>
}

export default OperationalDocumentViewer
