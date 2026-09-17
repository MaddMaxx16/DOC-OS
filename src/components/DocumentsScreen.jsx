import { useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function formatGameTimestamp(minutes) {
  if (!Number.isFinite(minutes)) return ''
  return `${formatCompactDate(Math.floor(minutes / 1440))} · ${formatTime(minutes % 1440)}`
}

function formatApproval(minutes) {
  return Number.isFinite(minutes) ? formatGameTimestamp(minutes) : 'Approved'
}

function getDocumentStatus(load, activeTab) {
  if (activeTab === 'archive') return 'APPROVED'
  if (load.pod?.correctionStatus === 'PENDING') return 'AWAITING CORRECTION'
  if (load.pod?.correctionStatus === 'CORRECTED') return 'CORRECTED · REVIEW'
  if (load.pod?.verified) return 'VERIFIED'
  if (Number.isFinite(load.pod?.viewedGameMinute)) return 'IN REVIEW'
  return 'NEW'
}

function DocumentsScreen({ loads, businessDocuments = [], ledgerWorkflowByLoadId = {}, activeTab = 'pending', onChangeTab, onOpenPod, onOpenBusinessDocument, onOpenLoad, onOpenInvoice, onOpenRateConfirmation, onOpenSettlementPacket, onBack }) {
  const pendingDocuments = loads.filter((load) => load.tripStatus === 'awaiting-pod' && load.pod && !load.pod.approved)
  const pendingRateConfirmations = loads.filter((load) => load.rateConfirmation?.id && !['CONFIRMED', 'APPROVED'].includes(load.rateConfirmation.status))
  const archivedPODs = loads.filter((load) => load.pod?.approved && ['delivered', 'completed'].includes(load.tripStatus))
  const trackedLoads = useMemo(() => loads.filter((load) => load.assignedDriverId || load.completedDriverId || load.candidateDriverId || load.carrierApprovalStatus || ['assigned', 'en-route-pickup', 'waiting-at-pickup', 'loading-at-pickup', 'loaded', 'en-route-delivery', 'waiting-at-delivery', 'awaiting-pod', 'completed', 'delivered'].includes(load.tripStatus)), [loads])
  const invoices = useMemo(() => Object.entries(ledgerWorkflowByLoadId).filter(([, workflow]) => workflow?.invoiceNumber).map(([loadId, workflow]) => ({ loadId, workflow, load: loads.find((load) => load.id === loadId) })).filter((item) => item.load), [ledgerWorkflowByLoadId, loads])
  const rateConfirmations = useMemo(() => loads.filter((load) => load.rateConfirmation?.id && ['CONFIRMED', 'APPROVED'].includes(load.rateConfirmation.status)), [loads])
  const settlementPackets = useMemo(() => loads.filter((load) => load.rateConfirmation?.status === 'CONFIRMED' && load.pod?.approved && ledgerWorkflowByLoadId[load.id]?.invoiceNumber), [loads, ledgerWorkflowByLoadId])
  const archiveCount = archivedPODs.length + businessDocuments.length + trackedLoads.length + invoices.length + rateConfirmations.length + settlementPackets.length
  const [openGroup, setOpenGroup] = useState('freight')

  const groups = [
    { id: 'packets', label: 'Load Packets', count: settlementPackets.length },
    { id: 'freight', label: 'FreightLink Loads', count: trackedLoads.length },
    { id: 'ratecons', label: 'Rate Confirmations', count: rateConfirmations.length },
    { id: 'pods', label: 'PODs', count: archivedPODs.length },
    { id: 'invoices', label: 'Invoices', count: invoices.length },
    { id: 'agreements', label: 'Agreements', count: businessDocuments.length },
  ]

  return (
    <div className="phone-page documents-screen documents-v3">
      <header className="documents-toolbar">
        <button type="button" className="documents-back" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div><span className="documents-toolbar-kicker">Document Center</span><strong>Documents</strong></div>
      </header>

      <section className="documents-heading">
        <span className="documents-kicker">Business records</span>
        <h2>Documents</h2>
        <p>Review paperwork by type instead of searching one long file list.</p>
      </section>

      <div className="documents-tabs" role="tablist" aria-label="Document status">
        <button type="button" role="tab" aria-selected={activeTab === 'pending'} className={`documents-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => onChangeTab?.('pending')}><span>Pending</span><strong>{pendingDocuments.length + pendingRateConfirmations.length}</strong></button>
        <button type="button" role="tab" aria-selected={activeTab === 'archive'} className={`documents-tab ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => onChangeTab?.('archive')}><span>Files</span><strong>{archiveCount}</strong></button>
      </div>

      {activeTab === 'pending' ? (
        <section className="documents-list" aria-label="Pending documents">
          <span className="documents-section-label">Needs review</span>
          {pendingRateConfirmations.map((load) => (
            <button className="document-card document-card-v2 status-new" type="button" key={load.rateConfirmation.id} onClick={() => onOpenRateConfirmation?.(load.id)}>
              <div className="document-card-topline"><div><span className="document-card-eyebrow">Rate Confirmation</span><strong className="document-card-id">{getFreightRouteName(load)}</strong></div><span className="document-card-status">{load.rateConfirmation.status === 'CORRECTION_REQUESTED' ? 'AWAITING CORRECTION' : load.rateConfirmation.reviewStatus === 'IN_REVIEW' ? 'IN REVIEW' : 'NEW · REVIEW'}</span></div>
              <div className="document-card-route"><span>Carrier document</span><strong>{load.rateConfirmation.reference}</strong></div>
              <div className="document-card-footer"><span>Received via Email</span><span className="document-card-open" aria-hidden="true">›</span></div>
            </button>
          ))}
          {pendingDocuments.map((load) => {
            const deliveryName = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'Unknown receiver'
            const status = getDocumentStatus(load, activeTab)
            const deliveredAt = formatGameTimestamp(load.pod?.receivedGameMinute)
            return (
              <button className={`document-card document-card-v2 status-${status.toLowerCase().replace(/\s+/g, '-')}`} type="button" key={load.id} onClick={() => onOpenPod(load.id)}>
                <div className="document-card-topline"><div><span className="document-card-eyebrow">Proof of Delivery</span><strong className="document-card-id">{getFreightRouteName(load)}</strong></div><span className="document-card-status">{status}</span></div>
                <div className="document-card-route"><span>Receiver</span><strong>{deliveryName}</strong></div>
                <div className="document-card-footer"><span>{deliveredAt ? `Delivered ${deliveredAt}` : 'Delivery received'}</span><span className="document-card-open" aria-hidden="true">›</span></div>
              </button>
            )
          })}
          {pendingDocuments.length === 0 && pendingRateConfirmations.length === 0 && <div className="documents-empty"><strong>No pending documents</strong><span>New carrier paperwork and PODs will appear here when review is required.</span></div>}
        </section>
      ) : (
        <section className="document-folders" aria-label="Document folders">
          {groups.map((group) => {
            const isOpen = openGroup === group.id
            return (
              <div className={`document-folder ${isOpen ? 'open' : ''}`} key={group.id}>
                <button type="button" className="document-folder-toggle" onClick={() => setOpenGroup(isOpen ? '' : group.id)} aria-expanded={isOpen}>
                  <span><strong>{group.label}</strong><small>{group.count} file{group.count === 1 ? '' : 's'}</small></span><b>{isOpen ? '⌃' : '⌄'}</b>
                </button>
                {isOpen && <div className="document-folder-rows">
                  {group.id === 'packets' && settlementPackets.map((load) => { const workflow = ledgerWorkflowByLoadId[load.id] || {}; return <button type="button" className="document-file-row" key={`packet:${load.id}`} onClick={() => onOpenSettlementPacket?.(load.id)}><span className="document-file-icon">PKT</span><span><strong>{getFreightRouteName(load)}</strong><small>{workflow.financialStatus === 'PAID' ? 'Settled · permanent record' : 'Settlement packet · payment pending'}</small></span><b>Open</b></button> })}
                  {group.id === 'freight' && trackedLoads.map((load) => <button type="button" className="document-file-row" key={load.id} onClick={() => onOpenLoad?.(load.id)}><span className="document-file-icon">↗</span><span><strong>{getFreightRouteName(load)}</strong><small>{load.carrierApprovalStatus === 'PENDING' ? 'Awaiting carrier approval' : load.carrierApprovalStatus === 'APPROVED' ? 'Approved to book' : String(load.tripStatus || load.status || 'Load').replace(/-/g, ' ')}</small></span><b>View route</b></button>)}
                  {group.id === 'ratecons' && rateConfirmations.map((load) => <button type="button" className="document-file-row" key={load.rateConfirmation.id} onClick={() => onOpenRateConfirmation?.(load.id)}><span className="document-file-icon">RC</span><span><strong>{load.rateConfirmation.reference}</strong><small>{getFreightRouteName(load)} · {load.rateConfirmation.status || 'RECEIVED'}</small></span><b>Open</b></button>)}
                  {group.id === 'pods' && archivedPODs.map((load) => { const receiver = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'Receiver'; return <button type="button" className="document-file-row" key={load.id} onClick={() => onOpenPod(load.id)}><span className="document-file-icon">POD</span><span><strong>{getFreightRouteName(load)}</strong><small>{receiver} · Approved {formatApproval(load.pod?.approvedGameMinute)}</small></span><b>Open</b></button> })}
                  {group.id === 'invoices' && invoices.map(({ loadId, workflow, load }) => <button type="button" className="document-file-row" key={loadId} onClick={() => onOpenInvoice?.(loadId)}><span className="document-file-icon">$</span><span><strong>{workflow.invoiceNumber}</strong><small>{getFreightRouteName(load)} · {workflow.submissionStatus || workflow.financialStatus || 'Draft'}</small></span><b>Open</b></button>)}
                  {group.id === 'agreements' && businessDocuments.map((document) => <button type="button" className="document-file-row" key={document.id} onClick={() => onOpenBusinessDocument?.(document.id)}><span className="document-file-icon">DOC</span><span><strong>{document.carrierName || 'Carrier'} Agreement</strong><small>{Number.isFinite(document.signedGameMinute) ? `Signed ${formatGameTimestamp(document.signedGameMinute)}` : 'Signed agreement'}</small></span><b>Open</b></button>)}
                  {group.count === 0 && <div className="document-folder-empty">No files in this folder yet.</div>}
                </div>}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

export default DocumentsScreen
