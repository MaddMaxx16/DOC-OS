import { useState } from 'react'
import LoadBoardScreen from './LoadBoardScreen.jsx'

function BrowserScreen({ loads, onSelectLoad, onBackToPhone }) {
  const [page, setPage] = useState('home')

  return (
    <div className="browser-screen">
      <div className="browser-header"><span>Browser</span></div>
      <div className="browser-bar">
        <button type="button" className="browser-back" onClick={page === 'home' ? onBackToPhone : () => setPage('home')}>‹</button>
        <span className="browser-address">{page === 'home' ? 'doc://home' : 'freightlink.local'}</span>
        <button type="button" className="browser-home-control" onClick={() => setPage('home')}>⌂</button>
      </div>
      {page === 'home' ? (
        <div className="browser-home">
          <div className="browser-search">Search or enter address</div>
          <strong>Bookmarks</strong>
          <button type="button" className="site-link" onClick={() => setPage('freightlink')}>
            <span className="site-icon">FL</span>
            <span>FreightLink</span>
            <small>freightlink.local</small>
          </button>
        </div>
      ) : (
        <div className="browser-site-content"><div className="freightlink-branding"><strong>FREIGHTLINK</strong><span>Load Board</span></div><LoadBoardScreen embedded loads={loads} onSelectLoad={onSelectLoad} /></div>
      )}
    </div>
  )
}

export default BrowserScreen
