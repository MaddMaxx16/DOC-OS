import { useState } from 'react'

function getCareerName(slot) {
  return slot?.state?.dispatcherProfile?.displayName || 'Dispatcher'
}

function getCareerMeta(slot) {
  const operationDay = Number(slot?.state?.dayLoop?.operationDay || 1)
  const role = slot?.state?.career?.roleTitle || 'Junior Dispatcher'
  return `Metroline · ${role} · Day ${operationDay}`
}

function DesktopTitleScreen({
  saveSlots = [],
  activeSaveSlotId = null,
  onContinue,
  onNewCareer,
  onLoadCareer,
  onDeleteCareer,
}) {
  const [view, setView] = useState('main')
  const [quitMessage, setQuitMessage] = useState('')
  const activeSlot = saveSlots.find((slot) => slot.id === activeSaveSlotId) || saveSlots[0] || null

  if (view === 'load') {
    return (
      <section className="docos-title-screen docos-title-subview" aria-label="Load career">
        <div className="docos-title-grid" aria-hidden="true" />
        <div className="docos-title-panel">
          <button type="button" className="docos-title-back" onClick={() => setView('main')}>← BACK</button>
          <span className="docos-title-kicker">CAREER FILES</span>
          <h1>Load Career</h1>
          <div className="docos-title-save-list">
            {saveSlots.map((slot) => (
              <div className="docos-title-save-row" key={slot.id}>
                <button type="button" className="career" onClick={() => onLoadCareer?.(slot.id)}>
                  <span className="docos-title-save-avatar">{getCareerName(slot).charAt(0).toUpperCase()}</span>
                  <span><strong>{getCareerName(slot)}</strong><small>{getCareerMeta(slot)}</small></span>
                  <b>CONTINUE →</b>
                </button>
                <button type="button" className="delete" onClick={() => onDeleteCareer?.(slot.id)}>DELETE</button>
              </div>
            ))}
            {!saveSlots.length && <p className="docos-title-empty">No careers have been created yet.</p>}
          </div>
        </div>
      </section>
    )
  }

  if (view === 'settings') {
    return (
      <section className="docos-title-screen docos-title-subview" aria-label="Settings">
        <div className="docos-title-grid" aria-hidden="true" />
        <div className="docos-title-panel">
          <button type="button" className="docos-title-back" onClick={() => setView('main')}>← BACK</button>
          <span className="docos-title-kicker">DOC OS</span>
          <h1>Settings</h1>
          <div className="docos-title-settings-card">
            <span>DESKTOP EXPERIENCE</span>
            <strong>Display, audio, controls, and accessibility</strong>
            <p>These settings will move here as the desktop build grows. Your existing game settings are preserved.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="docos-title-screen" aria-label="DOC OS title screen">
      <div className="docos-title-grid" aria-hidden="true" />
      <div className="docos-title-route route-a" aria-hidden="true" />
      <div className="docos-title-route route-b" aria-hidden="true" />
      <header className="docos-title-brand">
        <span className="docos-title-brand-mark">DOC <i /> OS</span>
        <small>DISPATCH OPERATIONS CENTER</small>
      </header>

      <main className="docos-title-menu">
        <span className="docos-title-kicker">CAREER DISPATCH SIMULATION</span>
        <h1>Run the day.<br />Move the freight.</h1>
        <p>Build your career from a Metroline cubicle to your own operation.</p>
        <div className="docos-title-actions">
          <button type="button" className="primary" disabled={!activeSlot} onClick={() => activeSlot && onContinue?.(activeSlot.id)}>
            <span>CONTINUE</span>
            <small>{activeSlot ? getCareerName(activeSlot) : 'No career yet'}</small>
          </button>
          <button type="button" onClick={() => onNewCareer?.()}>NEW CAREER</button>
          <button type="button" disabled={!saveSlots.length} onClick={() => setView('load')}>LOAD CAREER</button>
          <button type="button" onClick={() => setView('settings')}>SETTINGS</button>
          <button type="button" className="quiet" onClick={() => setQuitMessage('In the packaged PC build, this will close DOC OS.')}>QUIT</button>
        </div>
        {quitMessage && <div className="docos-title-note">{quitMessage}</div>}
      </main>

      <footer className="docos-title-footer">
        <span>METROLINE LOGISTICS · NEW YORK</span>
        <span>DESKTOP EXPERIENCE · BUILD 1</span>
      </footer>
    </section>
  )
}

export default DesktopTitleScreen
