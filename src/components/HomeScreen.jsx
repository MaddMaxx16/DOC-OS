function HomeScreen({ onOpenBrowser, onOpenDocuments, onOpenLedger, documentsBadgeCount = 0, ledgerUnreadCount = 0 }) {
  return (
    <div className="phone-page home-screen">
      <h1>DOC OS</h1>

      <div className="phone-app-grid"><button type="button" className="app-icon" onClick={onOpenBrowser}>
        <div className="app-icon-square" aria-hidden="true">W</div>
        <span>Browser</span>
      </button><button type="button" className="app-icon" onClick={onOpenDocuments}><div className="app-icon-square" aria-hidden="true">D</div><span>Documents</span>{documentsBadgeCount > 0 && <span className="app-icon-badge">{documentsBadgeCount}</span>}</button><button type="button" className="app-icon" onClick={onOpenLedger}><div className="app-icon-square" aria-hidden="true">L</div><span>LedgerDesk</span>{ledgerUnreadCount > 0 && <span className="app-icon-badge ledger-badge">{ledgerUnreadCount > 9 ? '9+' : ledgerUnreadCount}</span>}</button></div></div>
  )
}

export default HomeScreen
