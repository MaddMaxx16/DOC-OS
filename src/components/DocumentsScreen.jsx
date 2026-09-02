import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function DocumentsScreen({ loads, activeTab = 'pending', onChangeTab, onOpenPod, onBack, tutorialTarget = null }) {
  const pendingDocuments = loads.filter((load) => load.tripStatus === 'awaiting-pod' && load.pod && !load.pod.approved)
  const archivedDocuments = loads.filter((load) => load.pod?.approved && ['delivered', 'completed'].includes(load.tripStatus))
  const documents = activeTab === 'archive' ? archivedDocuments : pendingDocuments
  return <div className="phone-page documents-screen"><header><button type="button" onClick={onBack}>‹</button><strong>DOCUMENTS</strong></header><p>Load paperwork</p><div className="documents-tabs"><button type="button" className={`documents-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => onChangeTab?.('pending')}>PENDING {pendingDocuments.length}</button><button type="button" className={`documents-tab ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => onChangeTab?.('archive')}>ARCHIVE {archivedDocuments.length}</button></div>{documents.length ? documents.map((load) => { const status = activeTab === 'archive' ? 'APPROVED' : load.pod.verified ? 'VERIFIED' : Number.isFinite(load.pod.viewedGameMinute) ? 'IN REVIEW' : 'NEW'; return <button className={`document-card ${tutorialTarget === `pod-card:${load.id}` ? 'tutorial-target' : ''}`} type="button" key={load.id} onClick={() => onOpenPod(load.id)}><div className="document-card-header"><strong>{load.id}</strong><span className="document-card-status">{status}</span></div><span>Proof of Delivery</span><span>{mapLocations.find((location) => location.id === load.deliveryLocationId)?.name}</span>{activeTab === 'archive' && <span className="document-card-meta">Approved {formatApproval(load.pod.approvedGameMinute)}</span>}</button> }) : <div>{activeTab === 'archive' ? 'No archived documents.' : 'No pending documents.'}</div>}</div>
}
function formatApproval(minutes) { return Number.isFinite(minutes) ? `${formatCompactDate(Math.floor(minutes / 1440))} • ${formatTime(minutes % 1440)}` : 'APPROVED' }
export default DocumentsScreen
