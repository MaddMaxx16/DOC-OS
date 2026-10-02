function BrowserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 12h16.4M12 3.5c2.35 2.3 3.55 5.15 3.55 8.5S14.35 18.2 12 20.5C9.65 18.2 8.45 15.35 8.45 12S9.65 5.8 12 3.5Z" />
    </svg>
  )
}

function AgendaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.25" />
      <path d="M7.5 3.75v3.5M16.5 3.75v3.5M4 9.25h16" />
      <path d="M7.25 12.25h4.25M7.25 15.25h7.75M7.25 18.25h5.5" />
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.25" />
      <path d="M19 13.3v-2.6l-2-.6a7 7 0 0 0-.7-1.7l1-1.8-1.9-1.9-1.8 1a7 7 0 0 0-1.7-.7L11.3 3H8.7l-.6 2a7 7 0 0 0-1.7.7l-1.8-1-1.9 1.9 1 1.8a7 7 0 0 0-.7 1.7l-2 .6v2.6l2 .6a7 7 0 0 0 .7 1.7l-1 1.8 1.9 1.9 1.8-1a7 7 0 0 0 1.7.7l.6 2h2.6l.6-2a7 7 0 0 0 1.7-.7l1.8 1 1.9-1.9-1-1.8a7 7 0 0 0 .7-1.7l2-.6Z" />
    </svg>
  )
}

function AppTile({ label, description, icon, onClick, disabled = false, badgeCount = 0, badgeClassName = '' }) {
  return (
    <button type="button" className="app-icon app-grid-tile" onClick={onClick} disabled={disabled} aria-label={`${label}. ${description}${disabled ? '. Locked until a carrier joins your operation.' : ''}`}>
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

function HomeScreen({ surface = 'console', onOpenContacts, onOpenBrowser, onOpenAgenda, agendaLocked = false, agendaBadgeCount = 0, onOpenDocuments, onOpenLedger, onOpenMessages, onOpenEmail, onOpenSettings, emailBadgeCount = 0, messagesBadgeCount = 0, documentsBadgeCount = 0, ledgerUnreadCount = 0 }) {
  const isPhone = surface === 'phone'
  return (
    <div className="phone-page home-screen docos-ui-page">
      <header className="device-home-header docos-ui-header">
        <span className="docos-ui-kicker">{isPhone ? 'COMMUNICATIONS' : 'WORKSPACE'}</span>
        <h1>{isPhone ? 'Phone' : 'Dispatch Console'}</h1>
        <p>{isPhone ? 'Your contacts and conversations.' : 'Open an app to manage the operation.'}</p>
      </header>

      <section className="device-home-section" aria-labelledby="device-tools-title">
        <div className="docos-section-heading">
          <span id="device-tools-title">{isPhone ? 'KEEP IN TOUCH' : 'OPERATIONS TOOLS'}</span>
          <small>SELECT AN APP</small>
        </div>
        <div className="phone-app-grid" aria-label={isPhone ? 'Phone apps' : 'Console apps'}>
          {isPhone ? <>
            <AppTile label="Contacts" description="Your driver contacts" icon={<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20v-2a7 7 0 0 1 14 0v2" /></svg>} onClick={onOpenContacts} />
            <AppTile label="Messages" description="Driver communication" icon={<MessagesIcon />} onClick={onOpenMessages} badgeCount={messagesBadgeCount} />
          </> : <>
          <AppTile label="Browser" description="FreightLink and Carrier Source" icon={<BrowserIcon />} onClick={onOpenBrowser} />
          <AppTile label="Scheduler" description="Driver schedules and appointments" icon={<AgendaIcon />} onClick={onOpenAgenda} disabled={agendaLocked} badgeCount={agendaBadgeCount} />
          <AppTile label="Documents" description="PODs and operation records" icon={<DocumentsIcon />} onClick={onOpenDocuments} badgeCount={documentsBadgeCount} />
          <AppTile label="LedgerDesk" description="Invoices and receivables" icon={<LedgerIcon />} onClick={onOpenLedger} badgeCount={ledgerUnreadCount} badgeClassName="ledger-badge" />
          <AppTile label="Email" description="Carrier and business mail" icon={<EmailIcon />} onClick={onOpenEmail} badgeCount={emailBadgeCount} />
          </>}
        </div>
      </section>

      {!isPhone && <button className="console-settings-link" type="button" onClick={onOpenSettings}><SettingsIcon /> Settings</button>}
      <div className="phone-home-version" aria-hidden="true">DOC OS · {isPhone ? 'PHONE' : 'CONSOLE'}</div>
    </div>
  )
}

export default HomeScreen
