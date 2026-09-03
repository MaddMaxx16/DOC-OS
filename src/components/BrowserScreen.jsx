function BrowserScreen({ page, children, onOpenFreightLink, onOpenCarrierSource, onBack, onHome, siteTitle = 'FREIGHTLINK', siteSubtitle = 'Load Board', showSiteBranding = true }) {
  return (
    <div className="phone-page browser-screen">
      <div className="browser-header"><span>Browser</span></div>
      <div className="browser-bar">
        <button type="button" className="browser-back" onClick={onBack} aria-label="Back">‹</button>
        <span className="browser-address">{page === 'home' ? 'doc://home' : page}</span>
        <button type="button" className="browser-home-control" onClick={onHome} aria-label="Browser home">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.5 12 4l7.5 6.5v8.75H14v-5.5h-4v5.5H4.5V10.5Z"/></svg>
        </button>
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
              <button type="button" className="site-link browser-bookmark-card" onClick={onOpenFreightLink}>
                <span className="browser-bookmark-icon freight" aria-hidden="true">FL</span>
                <span className="browser-bookmark-copy">
                  <strong>FreightLink</strong>
                  <small>Freight market</small>
                </span>
                <span className="browser-bookmark-open" aria-hidden="true">›</span>
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
