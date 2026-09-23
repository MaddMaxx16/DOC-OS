// B.5.4C.5.2R — Browser History + Context Return
// B.5.4D.4.2.9A — Navigation Finalization Repair
function BrowserScreen({ page, children, onOpenFreightLink, onOpenCarrierSource, onBack, onHome, siteTitle = 'FREIGHTLINK', siteSubtitle = 'Load Board', showSiteBranding = true, freightLinkLocked = false }) {
  return (
    <div className="phone-page browser-screen">
      <div className="browser-header"><span>Browser</span></div>
      <div className={`browser-bar ${page === 'home' ? 'browser-root' : ''}`}>
        {page !== 'home' && <button type="button" className="browser-back" onClick={onBack} aria-label="Browser back">‹</button>}
        <span className="browser-address">{page === 'home' ? 'doc://home' : page}</span>
        {page !== 'home' && (
          <button
            type="button"
            className="browser-home-control browser-workspace-control"
            onClick={onHome}
            aria-label="Browser workspace"
            title="Workspace"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5h5v5H5V5Zm9 0h5v5h-5V5ZM5 14h5v5H5v-5Zm9 0h5v5h-5Z"/>
            </svg>
          </button>
        )}

      </div>
      {page === 'home' ? (
        <div className="browser-home browser-home-v2">
          <section className="browser-home-heading">
            <span className="browser-home-kicker">Dispatch browser</span>
            <h2>Workspace</h2>
            <p>Open a saved dispatch site or enter an address.</p>
          </section>

          <div className="browser-search browser-search-v2" aria-label="Search or enter address">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.75" cy="10.75" r="5.75"/><path d="m15.2 15.2 4.3 4.3"/></svg>
            <span>Search or enter address</span>
          </div>

          <section className="browser-bookmarks-v2" aria-label="Bookmarks">
            <span className="browser-bookmarks-label">Bookmarks</span>
            <div className="browser-bookmark-list">
              <button type="button" className="site-link browser-bookmark-card" onClick={onOpenCarrierSource}>
                <span className="browser-bookmark-icon carrier" aria-hidden="true">CS</span>
                <span className="browser-bookmark-copy">
                  <strong>CarrierSource</strong>
                  <small>Carrier network</small>
                </span>
                <span className="browser-bookmark-open" aria-hidden="true">›</span>
              </button>
              <button type="button" className={`site-link browser-bookmark-card${freightLinkLocked ? ' locked' : ''}`} onClick={freightLinkLocked ? undefined : onOpenFreightLink} disabled={freightLinkLocked}>
                <span className="browser-bookmark-icon freight" aria-hidden="true">FL</span>
                <span className="browser-bookmark-copy">
                  <strong>FreightLink</strong>
                  <small>{freightLinkLocked ? 'Available after a carrier joins your operation' : 'Freight market'}</small>
                </span>
                <span className="browser-bookmark-open" aria-hidden="true">{freightLinkLocked ? 'LOCKED' : '›'}</span>
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="browser-site-content">
          {showSiteBranding && <div className="freightlink-branding"><strong>{siteTitle}</strong><span>{siteSubtitle}</span></div>}
          {children}
        </div>
      )}
    </div>
  )
}

export default BrowserScreen
