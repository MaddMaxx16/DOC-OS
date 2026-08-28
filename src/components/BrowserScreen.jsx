import { useState } from 'react'
import LoadBoardScreen from './LoadBoardScreen.jsx'

function BrowserScreen({ loads, onSelectLoad, onBackToPhone, onBackFromSite }) {
  const [page, setPage] = useState('home')

  return (
    <div className="browser-screen">
      <div className="browser-bar">
        <button type="button" className="browser-back" onClick={page === 'home' ? onBackToPhone : onBackFromSite}>Back</button>
        <span className="browser-address">{page === 'home' ? 'DOC OS Browser' : 'freightlink.local'}</span>
      </div>
      {page === 'home' ? (
        <div className="browser-home">
          <h1>DOC OS Browser</h1>
          <strong>Bookmarks / Sites</strong>
          <button type="button" className="site-link" onClick={() => setPage('freightlink')}>
            <span>FreightLink Board</span>
            <small>freightlink.local</small>
          </button>
        </div>
      ) : (
        <LoadBoardScreen loads={loads} onSelectLoad={onSelectLoad} onBack={() => setPage('home')} />
      )}
    </div>
  )
}

export default BrowserScreen
