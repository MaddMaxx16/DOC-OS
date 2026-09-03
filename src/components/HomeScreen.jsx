function BrowserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" />
      <path d="M3.75 12h16.5M12 3.75c2.2 2.25 3.3 5 3.3 8.25S14.2 18 12 20.25C9.8 18 8.7 15.25 8.7 12S9.8 6 12 3.75Z" />
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

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.75" y="5.5" width="16.5" height="13" rx="2" />
      <path d="m5 7 7 5.75L19 7" />
    </svg>
  )
}

function AppTile({ label, icon, onClick, badgeCount = 0, tutorial = false, badgeClassName = '' }) {
  return (
    <button type="button" className="app-icon" onClick={onClick}>
      <span className="app-icon-visual">
        <span className={`app-icon-square ${tutorial ? 'tutorial-target' : ''}`}>{icon}</span>
        {badgeCount > 0 && (
          <span className={`app-icon-badge ${badgeClassName}`.trim()}>{badgeCount > 9 ? '9+' : badgeCount}</span>
        )}
      </span>
      <span className="app-icon-label">{label}</span>
    </button>
  )
}

function HomeScreen({ onOpenBrowser, onOpenDocuments, onOpenLedger, onOpenEmail, emailBadgeCount = 0, documentsBadgeCount = 0, ledgerUnreadCount = 0, tutorialTarget = null }) {
  return (
    <div className="phone-page home-screen">
      <div className="phone-app-grid" aria-label="DOC OS apps">
        <AppTile label="Browser" icon={<BrowserIcon />} onClick={onOpenBrowser} />
        <AppTile label="Documents" icon={<DocumentsIcon />} onClick={onOpenDocuments} badgeCount={documentsBadgeCount} tutorial={tutorialTarget === 'documents-app'} />
        <AppTile label="LedgerDesk" icon={<LedgerIcon />} onClick={onOpenLedger} badgeCount={ledgerUnreadCount} tutorial={tutorialTarget === 'ledger-app'} badgeClassName="ledger-badge" />
        <AppTile label="Email" icon={<EmailIcon />} onClick={onOpenEmail} badgeCount={emailBadgeCount} tutorial={tutorialTarget === 'email-app'} />
      </div>
      <div className="phone-home-version" aria-hidden="true">DISPATCH TERMINAL</div>
    </div>
  )
}

export default HomeScreen
