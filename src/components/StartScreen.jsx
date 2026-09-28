import { useState } from 'react'

// P2.4.3 — the title monitor is a presentation layer over existing save authority.
function StartScreen({ saveSlots = [], saveSlotIds = [], activeSaveSlotId = null, onResumeSave, onDeleteSave, onStartNew }) {
  const [monitorView, setMonitorView] = useState('home')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  const stateFor = (slot) => slot?.state || slot?.snapshot || slot?.data || slot?.save || slot || {}

  const labelForSlot = (slot, index) => {
    const raw = String(slot?.label || slot?.name || slot?.id || '').trim()
    if (raw) return raw.replace(/[-_]+/g, ' ').toUpperCase()
    return `OPERATION ${index + 1}`
  }

  const sessionName = (slot) => {
    const state = stateFor(slot)
    return state?.dispatcherProfile?.dispatcherName || state?.dispatcherProfile?.displayName ||
      state?.dispatcherProfile?.businessName || state?.dispatcherProfile?.companyName ||
      state?.businessName || 'Independent Dispatch'
  }

  const operationName = (slot) => {
    const state = stateFor(slot)
    return state?.dispatcherProfile?.businessName || state?.dispatcherProfile?.companyName ||
      state?.businessName || sessionName(slot)
  }

  const marketName = (slot) => {
    const market = stateFor(slot)?.selectedMarket
    if (market === 'new-york') return 'New York'
    if (typeof market === 'string' && market.trim()) {
      return market.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
    }
    return 'Market not selected'
  }

  const operationMeta = (slot) => {
    const operationDay = Number(stateFor(slot)?.dayLoop?.operationDay || 1)
    return `${marketName(slot)} · Day ${operationDay}`
  }

  const initialFor = (value) => String(value || '').trim().match(/[A-Z0-9]/i)?.[0]?.toUpperCase() || 'D'
  const hasSavedOperation = saveSlots.length > 0
  const hasEmptySlot = saveSlots.length < 3
  const activeSlot = saveSlots.find((slot) => slot?.id === activeSaveSlotId) || saveSlots[0] || null
  const activeSessionName = activeSlot ? sessionName(activeSlot) : 'New Dispatcher'
  const accountSlots = saveSlotIds.map((slotId) => ({
    id: slotId,
    slot: saveSlots.find((savedSlot) => savedSlot?.id === slotId) || null,
  }))

  const enterActiveSession = () => {
    if (activeSlot) onResumeSave?.(activeSlot.id)
    else onStartNew?.()
  }

  return (
    <div className="entry-screen start-screen-cinematic start-screen-d434 start-desk-title-p243">
      <main className="start-monitor-ui-p243">
        {monitorView === 'home' && (
          <section className="start-monitor-home-p243" aria-labelledby="docos-title-p243">
            <header className="start-login-brand-p243">
              <h1 id="docos-title-p243"><b>DOC</b><i>OS</i></h1>
              <span>DISPATCH OPERATIONS CONTROL</span>
            </header>

            <div className="start-login-account-p243">
              <button
                type="button"
                className="start-login-identity-p243"
                onClick={enterActiveSession}
                disabled={!hasSavedOperation && !hasEmptySlot}
              >
                <span className={`start-login-avatar-p243 ${hasSavedOperation ? 'active' : 'new'}`} aria-hidden="true">
                  {hasSavedOperation ? initialFor(activeSessionName) : '+'}
                </span>
                <strong>{activeSessionName}</strong>
                <i aria-hidden="true">→</i>
              </button>
              <button type="button" className="start-login-switch-p243" onClick={() => hasSavedOperation ? setMonitorView('operations') : onStartNew?.()}>
                {hasSavedOperation ? 'SWITCH USER' : 'SET UP WORKSTATION'}
              </button>
            </div>

            <button type="button" className="start-login-settings-p243" onClick={() => setMonitorView('settings')}>
              <span aria-hidden="true">⚙</span> SETTINGS
            </button>
          </section>
        )}

        {monitorView === 'operations' && (
          <section className="start-monitor-subview-p243" aria-labelledby="other-operations-title-p243">
            <header>
              <button type="button" onClick={() => { setPendingDeleteId(null); setMonitorView('home') }} aria-label="Back to session">‹</button>
                <div><span>DOC OS · SESSION CONTROL</span><h2 id="other-operations-title-p243">Switch User</h2></div>
            </header>

            <div className="start-monitor-save-list-p243">
              {accountSlots.map(({ id, slot }, index) => slot ? (
                <div className={`start-monitor-save-p243 ${id === activeSlot?.id ? 'active' : ''} ${pendingDeleteId === id ? 'confirming' : ''}`} key={id}>
                  <button type="button" onClick={() => onResumeSave?.(id)}>
                    <i aria-hidden="true">{initialFor(sessionName(slot))}</i>
                    <span>{labelForSlot(slot, index)}</span>
                    <strong>{sessionName(slot)}</strong>
                    <small>{operationName(slot)} · {operationMeta(slot)}</small>
                  </button>
                  {pendingDeleteId === id ? (
                    <div className="start-monitor-delete-confirm-p243">
                      <button type="button" onClick={() => setPendingDeleteId(null)}>KEEP</button>
                      <button type="button" onClick={() => { setPendingDeleteId(null); onDeleteSave?.(id) }}>DELETE</button>
                    </div>
                  ) : (
                    <button type="button" className="delete" onClick={() => setPendingDeleteId(id)} aria-label={`Delete ${sessionName(slot)}`}>×</button>
                  )}
                </div>
              ) : (
                <button type="button" className="start-monitor-new-career-p243" onClick={() => onStartNew?.(id)} key={id}>
                  <b aria-hidden="true">+</b><span><strong>New Dispatcher</strong><small>{labelForSlot({ id }, index)}</small></span>
                </button>
              ))}
            </div>
          </section>
        )}

        {monitorView === 'settings' && (
          <section className="start-monitor-subview-p243" aria-labelledby="start-settings-title">
            <header>
              <button type="button" onClick={() => setMonitorView('home')} aria-label="Back to session">‹</button>
              <div><span>DOC OS · SYSTEM</span><h2 id="start-settings-title">Settings</h2></div>
            </header>
            <div className="start-monitor-settings-p243">
              <span>SYSTEM SETTINGS</span>
              <strong>Default operating profile</strong>
              <p>Gameplay, audio, and interface controls will be configured here in a later checkpoint.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default StartScreen
