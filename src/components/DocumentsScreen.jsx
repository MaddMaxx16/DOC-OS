import mapLocations from '../data/mapLocations.js'

function DocumentsScreen({ loads, onOpenPod, onBack }) {
  const documents = loads.filter((load) => load.tripStatus === 'awaiting-pod' && load.pod)
  return <div className="phone-page documents-screen"><header><button type="button" onClick={onBack}>‹</button><strong>DOCUMENTS</strong></header><p>Load paperwork</p>{documents.length ? documents.map((load) => <button className="document-card" type="button" key={load.id} onClick={() => onOpenPod(load.id)}><strong>{load.id}</strong><span>Proof of Delivery</span><span>{mapLocations.find((location) => location.id === load.deliveryLocationId)?.name}</span><em>{load.pod.verified ? 'VERIFIED' : 'NEW'}</em></button>) : <div>No documents waiting.</div>}</div>
}
export default DocumentsScreen
