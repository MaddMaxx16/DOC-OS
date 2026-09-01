function BrowserScreen({ page, children, onOpenFreightLink, onOpenCarrierSource, onBack, onHome, siteTitle = 'FREIGHTLINK', siteSubtitle = 'Load Board' }) {

  return (
    <div className="phone-page browser-screen">
      <div className="browser-header"><span>Browser</span></div>
      <div className="browser-bar">
        <button type="button" className="browser-back" onClick={onBack}>‹</button>
        <span className="browser-address">{page === 'home' ? 'doc://home' : page}</span>
        <button type="button" className="browser-home-control" onClick={onHome}>⌂</button>
      </div>
      {page === 'home' ? (
        <div className="browser-home">
          <div className="browser-search">Search or enter address</div>
          <strong>Bookmarks</strong>
          <button type="button" className="site-link" onClick={onOpenCarrierSource}><span className="site-icon">CS</span><span>CarrierSource</span></button>
          <button type="button" className="site-link" onClick={onOpenFreightLink}><span className="site-icon">FL</span><span>FreightLink</span></button>
        </div>
      ) : (
        <div className="browser-site-content"><div className="freightlink-branding"><strong>{siteTitle}</strong><span>{siteSubtitle}</span></div>{children}</div>
      )}
    </div>
  )
}

export default BrowserScreen
