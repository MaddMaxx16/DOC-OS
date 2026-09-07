function BrowserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 12h16.4M12 3.5c2.35 2.3 3.55 5.15 3.55 8.5S14.35 18.2 12 20.5C9.65 18.2 8.45 15.35 8.45 12S9.65 5.8 12 3.5Z" />
    </svg>
  )
}

function DocumentsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.25 3.75h7.25l4.25 4.25v12.25H6.25V3.75Z" />
      <path d="M13.5 3.75V8h4.25M9 12h6M9 15.5h6" />
    </svg>
  )
}

function LedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19.5V11.75M10 19.5V7.5M15 19.5v-5.25M20 19.5V4.5" />
      <path d="M3.5 19.5h18" />
    </svg>
  )
}


function MessagesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.5h14v10H9l-4 3v-13Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.75" y="5.5" width="16.5" height="13" rx="2" />
      <path d="m5 7 7 5.75L19 7" />
    </svg>
  )
}

function AppTile({ label, description, icon, onClick, badgeCount = 0, badgeClassName = '' }) {
  return (
    <button type="button" className="app-icon app-grid-tile" onClick={onClick} aria-label={`${label}. ${description}`}>
      <span className="app-icon-visual">
        <span className="app-icon-square">{icon}</span>
        {badgeCount > 0 && (
          <span className={`app-icon-badge ${badgeClassName}`.trim()}>{badgeCount > 9 ? '9+' : badgeCount}</span>
        )}
      </span>
      <strong className="app-icon-label">{label}</strong>
    </button>
  )
}

function HomeScreen({ onOpenBrowser, onOpenDocuments, onOpenLedger, onOpenMessages, onOpenEmail, emailBadgeCount = 0, messagesBadgeCount = 0, documentsBadgeCount = 0, ledgerUnreadCount = 0 }) {
  return (
    <div className="phone-page home-screen docos-ui-page">
      <header className="device-home-header docos-ui-header">
        <span className="docos-ui-kicker">WORKSPACE</span>
        <h1>Dispatch Console</h1>
        <p>Open an app to manage the operation.</p>
      </header>

      <section className="device-home-section" aria-labelledby="device-tools-title">
        <div className="docos-section-heading">
          <span id="device-tools-title">OPERATIONS TOOLS</span>
          <small>SELECT AN APP</small>
        </div>
        <div className="phone-app-grid" aria-label="DOC OS apps">
          <AppTile label="Browser" description="FreightLink and Carrier Source" icon={<BrowserIcon />} onClick={onOpenBrowser} />
          <AppTile label="Documents" description="PODs and operation records" icon={<DocumentsIcon />} onClick={onOpenDocuments} badgeCount={documentsBadgeCount} />
          <AppTile label="LedgerDesk" description="Invoices and receivables" icon={<LedgerIcon />} onClick={onOpenLedger} badgeCount={ledgerUnreadCount} badgeClassName="ledger-badge" />
          <AppTile label="Messages" description="Driver communication" icon={<MessagesIcon />} onClick={onOpenMessages} badgeCount={messagesBadgeCount} />
          <AppTile label="Email" description="Carrier and business mail" icon={<EmailIcon />} onClick={onOpenEmail} badgeCount={emailBadgeCount} />
        </div>
      </section>

      <div className="phone-home-version" aria-hidden="true">DOC OS · OPERATIONS DEVICE</div>
    </div>
  )
}

export default HomeScreen
