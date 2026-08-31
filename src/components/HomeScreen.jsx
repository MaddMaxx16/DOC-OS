function HomeScreen({ onOpenBrowser, onOpenDocuments, documentsBadgeCount = 0 }) {
  return (
    <div className="phone-page home-screen">
      <h1>DOC OS</h1>

      <div className="phone-app-grid"><button type="button" className="app-icon" onClick={onOpenBrowser}>
        <div className="app-icon-square">WEB</div>
        <span>Browser</span>
      </button><button type="button" className="app-icon" onClick={onOpenDocuments}><div className="app-icon-square">DOCS</div><span>Documents</span>{documentsBadgeCount > 0 && <span className="app-icon-badge">{documentsBadgeCount}</span>}</button></div>
    </div>
  )
}

export default HomeScreen
