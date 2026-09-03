import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function formatGameTimestamp(minutes) {
  if (!Number.isFinite(minutes)) return ''
  return `${formatCompactDate(Math.floor(minutes / 1440))} · ${formatTime(minutes % 1440)}`
}

function formatApproval(minutes) {
  return Number.isFinite(minutes) ? formatGameTimestamp(minutes) : 'Approved'
}

function getDocumentStatus(load, activeTab) {
  if (activeTab === 'archive') return 'APPROVED'
  if (load.pod?.verified) return 'VERIFIED'
  if (Number.isFinite(load.pod?.viewedGameMinute)) return 'IN REVIEW'
  return 'NEW'
}

function DocumentsScreen({ loads, activeTab = 'pending', onChangeTab, onOpenPod, onBack, tutorialTarget = null }) {
  const pendingDocuments = loads.filter((load) => load.tripStatus === 'awaiting-pod' && load.pod && !load.pod.approved)
  const archivedDocuments = loads.filter((load) => load.pod?.approved && ['delivered', 'completed'].includes(load.tripStatus))
  const documents = activeTab === 'archive' ? archivedDocuments : pendingDocuments

  return (
    <div className="phone-page documents-screen documents-v2">
      <header className="documents-toolbar">
        <button type="button" className="documents-back" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div>
          <span className="documents-toolbar-kicker">Document Center</span>
          <strong>Documents</strong>
        </div>
      </header>

      <section className="documents-heading">
        <span className="documents-kicker">Load paperwork</span>
        <h2>Proof of Delivery</h2>
        <p>Review delivery paperwork before releasing a completed load for billing.</p>
      </section>

      <div className="documents-tabs" role="tablist" aria-label="Document status">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pending'}
          className={`documents-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => onChangeTab?.('pending')}
        >
          <span>Pending</span>
          <strong>{pendingDocuments.length}</strong>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'archive'}
          className={`documents-tab ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => onChangeTab?.('archive')}
        >
          <span>Archive</span>
          <strong>{archivedDocuments.length}</strong>
        </button>
      </div>

      <section className="documents-list" aria-label={activeTab === 'archive' ? 'Archived documents' : 'Pending documents'}>
        <span className="documents-section-label">{activeTab === 'archive' ? 'Approved documents' : 'Needs review'}</span>
        {documents.length ? documents.map((load) => {
          const deliveryName = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'Unknown receiver'
          const status = getDocumentStatus(load, activeTab)
          const deliveredAt = formatGameTimestamp(load.pod?.receivedGameMinute)
          const isTutorialTarget = tutorialTarget === `pod-card:${load.id}`

          return (
            <button
              className={`document-card document-card-v2 status-${status.toLowerCase().replace(/\s+/g, '-')} ${isTutorialTarget ? 'tutorial-target' : ''}`}
              type="button"
              key={load.id}
              onClick={() => onOpenPod(load.id)}
            >
              <div className="document-card-topline">
                <div>
                  <span className="document-card-eyebrow">Proof of Delivery</span>
                  <strong className="document-card-id">{load.id}</strong>
                </div>
                <span className="document-card-status">{status}</span>
              </div>

              <div className="document-card-route">
                <span>Receiver</span>
                <strong>{deliveryName}</strong>
              </div>

              <div className="document-card-footer">
                <span>{activeTab === 'archive' ? `Approved ${formatApproval(load.pod?.approvedGameMinute)}` : deliveredAt ? `Delivered ${deliveredAt}` : 'Delivery received'}</span>
                <span className="document-card-open" aria-hidden="true">›</span>
              </div>
            </button>
          )
        }) : (
          <div className="documents-empty">
            <strong>{activeTab === 'archive' ? 'No archived documents' : 'No pending documents'}</strong>
            <span>{activeTab === 'archive' ? 'Approved PODs will stay here for reference.' : 'New PODs will appear here after a delivery is completed.'}</span>
          </div>
        )}
      </section>
    </div>
  )
}

export default DocumentsScreen
