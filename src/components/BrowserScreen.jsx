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
        <div className="browser-home">
          <div className="browser-search">Search or enter address</div>
          <strong>Bookmarks</strong>
          <button type="button" className="site-link" onClick={onOpenCarrierSource}><span className="site-icon">CS</span><span>CarrierSource</span></button>
          <button type="button" className="site-link" onClick={onOpenFreightLink}><span className="site-icon">FL</span><span>FreightLink</span></button>
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
