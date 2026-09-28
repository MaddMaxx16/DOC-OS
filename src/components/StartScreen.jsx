import { useEffect, useRef, useState } from 'react'
import docosLoginMark from '../assets/docos-login-mark-p243.svg'
import './StartScreen.css'
import './StartScreenPolish.css'
import './WorkstationEntryTransition.css'

let startupSplashHasPlayed = false

// P2.4.3 — the title monitor is a presentation layer over existing save authority.
function StartScreen({ saveSlots = [], saveSlotIds = [], activeSaveSlotId = null, onResumeSave, onDeleteSave, onStartNew }) {
  const [monitorView, setMonitorView] = useState('home')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [showStartupSplash, setShowStartupSplash] = useState(() => !startupSplashHasPlayed)
  const [workstationEntryPhase, setWorkstationEntryPhase] = useState('idle')
  const workstationEntryTimerRef = useRef(null)

  useEffect(() => {
    if (!showStartupSplash) return undefined

    // P2.4.4.1 — play the branded startup only once per app runtime.
    // Returning to the title from Career Setup/gameplay must not replay it.
    startupSplashHasPlayed = true
    const timer = window.setTimeout(() => setShowStartupSplash(false), 3400)
    return () => window.clearTimeout(timer)
  }, [showStartupSplash])

  useEffect(() => () => {
    if (workstationEntryTimerRef.current) window.clearTimeout(workstationEntryTimerRef.current)
  }, [])

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
  const nameLengthClass = (value) => {
    const length = Array.from(String(value || '').trim()).length
    if (length > 30) return 'xlong'
    if (length > 20) return 'long'
    return 'normal'
  }

  const hasSavedOperation = saveSlots.length > 0
  const hasEmptySlot = saveSlots.length < 3
  const activeSlot = saveSlots.find((slot) => slot?.id === activeSaveSlotId) || saveSlots[0] || null
  const activeSessionName = activeSlot ? sessionName(activeSlot) : 'New Dispatcher'
  const accountSlots = saveSlotIds.map((slotId) => ({
    id: slotId,
    slot: saveSlots.find((savedSlot) => savedSlot?.id === slotId) || null,
  }))
  const workstationEntering = workstationEntryPhase !== 'idle'

  // P2.4.4.2 — ENTER is now a physical move into the workstation, not an instant screen swap.
  // Keep the approved login mounted long enough for the office + monitor to become the viewport,
  // then hand control back to the existing save/new-operation authority.
  const enterWorkstation = (action) => {
    if (workstationEntering || typeof action !== 'function') return

    setPendingDeleteId(null)
    setWorkstationEntryPhase('entering')

    workstationEntryTimerRef.current = window.setTimeout(() => {
      setWorkstationEntryPhase('handoff')
      window.requestAnimationFrame(() => action())
    }, 1180)
  }

  const enterActiveSession = () => {
    if (activeSlot) enterWorkstation(() => onResumeSave?.(activeSlot.id))
    else if (hasEmptySlot) enterWorkstation(() => onStartNew?.())
  }

  const returnHome = () => {
    if (workstationEntering) return
    setPendingDeleteId(null)
    setMonitorView('home')
  }

  const UserGlyph = ({ isNew = false }) => isNew ? (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M22 8h4v14h14v4H26v14h-4V26H8v-4h14z" />
    </svg>
  ) : (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="17" r="9" />
      <path d="M8 41c1.4-9.3 7.3-14 16-14s14.6 4.7 16 14H8z" />
    </svg>
  )

  const SettingsGlyph = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19 13.5v-3l-2.1-.7a7 7 0 0 0-.8-1.8l1-2-2.1-2.1-2 1a7 7 0 0 0-1.8-.8L10.5 2h-3l-.7 2.1a7 7 0 0 0-1.8.8l-2-1L.9 6l1 2a7 7 0 0 0-.8 1.8L-1 10.5v3l2.1.7a7 7 0 0 0 .8 1.8l-1 2L3 20.1l2-1a7 7 0 0 0 1.8.8l.7 2.1h3l.7-2.1a7 7 0 0 0 1.8-.8l2 1 2.1-2.1-1-2a7 7 0 0 0 .8-1.8L19 13.5z" transform="translate(2 0) scale(.9)" />
    </svg>
  )

  const StartupTruck = () => (
    <svg viewBox="0 0 68 28" aria-hidden="true">
      <path d="M4 7.5h36v13H4zM40 11h11.5l8 6v3.5H40z" />
      <path d="M47 12.8h3.7l4.9 3.8H47z" className="startup-truck-window-p244" />
      <circle cx="16" cy="22" r="3.4" />
      <circle cx="50" cy="22" r="3.4" />
      <circle cx="16" cy="22" r="1.5" className="startup-truck-hub-p244" />
      <circle cx="50" cy="22" r="1.5" className="startup-truck-hub-p244" />
    </svg>
  )

  const SystemMark = () => (
    <span className="docos-system-mark-p243" aria-label="DOC OS">
      <b>DOC</b><i>OS</i>
    </span>
  )

  return (
    <div
      className={`entry-screen start-screen-cinematic start-screen-d434 start-desk-title-p243 ${workstationEntering ? `workstation-entry-p2442 ${workstationEntryPhase}` : ''}`}
      aria-busy={workstationEntering ? 'true' : undefined}
    >
      {showStartupSplash && (
        <section
          className="docos-startup-splash-p244"
          role="status"
          aria-label="DOC OS starting"
          style={{ animationDuration: '3400ms' }}
        >
          <div className="docos-startup-content-p244" style={{ animationDuration: '760ms' }}>
            <div className="docos-startup-wordmark-p244" aria-hidden="true">
              <strong>DOC</strong>
              <i />
              <b>OS</b>
            </div>
            <div className="docos-startup-subtitle-p244">Dispatch Operations Center</div>

            <div className="docos-startup-loader-p244" aria-hidden="true">
              <span
                className="docos-startup-truck-p244"
                style={{ animationDuration: '2150ms', animationDelay: '650ms' }}
              >
                <StartupTruck />
              </span>
              <span className="docos-startup-dot-p244 dot-one" style={{ animationDuration: '420ms', animationDelay: '1230ms' }} />
              <span className="docos-startup-dot-p244 dot-two" style={{ animationDuration: '420ms', animationDelay: '1700ms' }} />
              <span className="docos-startup-dot-p244 dot-three" style={{ animationDuration: '420ms', animationDelay: '2160ms' }} />
            </div>
          </div>
        </section>
      )}

      <main
        className="start-monitor-ui-p243"
        aria-hidden={showStartupSplash ? 'true' : undefined}
      >
        {monitorView === 'home' && (
          <section className="docos-login-home-p243" aria-label="DOC OS workstation sign in">
            <header className="docos-login-brand-p243">
              <img src={docosLoginMark} alt="DOC OS — Dispatch Operations Control" />
            </header>

            <div className="docos-login-session-p243">
              <button
                type="button"
                className="docos-login-account-p243"
                onClick={enterActiveSession}
                disabled={workstationEntering || (!activeSlot && !hasEmptySlot)}
                aria-label={activeSlot ? `Continue as ${activeSessionName}` : 'Begin a new dispatcher career'}
              >
                <span className={`docos-login-avatar-p243 ${activeSlot ? 'active' : 'new'}`}>
                  <UserGlyph isNew={!activeSlot} />
                </span>
                <strong className={`docos-login-name-p243 ${nameLengthClass(activeSessionName)}`}>{activeSessionName}</strong>
                <small>{activeSlot ? 'Dispatcher' : 'Workstation unconfigured'}</small>
              </button>

              <button
                type="button"
                className="docos-login-enter-p243"
                onClick={enterActiveSession}
                disabled={workstationEntering || (!activeSlot && !hasEmptySlot)}
                aria-label={activeSlot ? `Enter ${activeSessionName} operation` : 'Begin career'}
              >
                <span>Enter</span>
                <span className="enter-arrow-p243" aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                className="docos-login-switch-p243"
                disabled={workstationEntering}
                onClick={() => hasSavedOperation ? setMonitorView('operations') : enterWorkstation(() => onStartNew?.())}
              >
                {hasSavedOperation ? 'Switch User' : 'Begin Career'}
              </button>
            </div>

            <button
              type="button"
              className="docos-login-settings-p243"
              disabled={workstationEntering}
              onClick={() => setMonitorView('settings')}
            >
              <SettingsGlyph />
              <span>Settings</span>
            </button>
          </section>
        )}

        {monitorView === 'operations' && (
          <section className="docos-login-subview-p243" aria-labelledby="other-operations-title-p243">
            <header className="docos-login-subview-header-p243">
              <button type="button" className="docos-login-back-p243" onClick={returnHome} aria-label="Back to sign in">‹</button>
              <div className="docos-login-subview-heading-p243">
                <span>DOC OS · Session Control</span>
                <h2 id="other-operations-title-p243">Switch User</h2>
              </div>
              <SystemMark />
            </header>

            <div className="docos-login-slot-list-p243">
              {accountSlots.map(({ id, slot }, index) => slot ? (
                <div className="docos-login-slot-row-p243" key={id}>
                  <button
                    type="button"
                    className={`docos-login-slot-p243 ${id === activeSlot?.id ? 'active' : ''}`}
                    disabled={workstationEntering}
                    onClick={() => enterWorkstation(() => onResumeSave?.(id))}
                  >
                    <i className="docos-login-slot-avatar-p243" aria-hidden="true">{initialFor(sessionName(slot))}</i>
                    <span className="docos-login-slot-copy-p243">
                      <strong>{sessionName(slot)}</strong>
                      <span>{operationName(slot)}</span>
                      <small>{operationMeta(slot)}</small>
                    </span>
                    <i className="docos-login-slot-arrow-p243" aria-hidden="true">→</i>
                  </button>

                  {pendingDeleteId === id ? (
                    <div className="docos-login-delete-confirm-p243">
                      <button type="button" onClick={() => setPendingDeleteId(null)}>KEEP</button>
                      <button type="button" onClick={() => { setPendingDeleteId(null); onDeleteSave?.(id) }}>DELETE</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="docos-login-delete-p243"
                      disabled={workstationEntering}
                      onClick={() => setPendingDeleteId(id)}
                      aria-label={`Delete ${sessionName(slot)}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="docos-login-new-p243"
                  disabled={workstationEntering}
                  onClick={() => enterWorkstation(() => onStartNew?.(id))}
                  key={id}
                >
                  <i className="docos-login-slot-avatar-p243" aria-hidden="true">+</i>
                  <span className="docos-login-slot-copy-p243">
                    <strong>New Dispatcher</strong>
                    <span>Available workstation profile</span>
                    <small>{labelForSlot({ id }, index)}</small>
                  </span>
                  <i className="docos-login-slot-arrow-p243" aria-hidden="true">→</i>
                </button>
              ))}
            </div>
          </section>
        )}

        {monitorView === 'settings' && (
          <section className="docos-login-subview-p243" aria-labelledby="start-settings-title">
            <header className="docos-login-subview-header-p243">
              <button type="button" className="docos-login-back-p243" onClick={returnHome} aria-label="Back to sign in">‹</button>
              <div className="docos-login-subview-heading-p243">
                <span>DOC OS · System</span>
                <h2 id="start-settings-title">Settings</h2>
              </div>
              <SystemMark />
            </header>
            <div className="docos-login-settings-panel-p243">
              <span>SYSTEM SETTINGS</span>
              <strong>Default operating profile</strong>
              <p>Gameplay, audio, and interface controls will be configured here in a later checkpoint.</p>
            </div>
          </section>
        )}
      </main>

      {workstationEntering && <div className="workstation-entry-glass-p2442" aria-hidden="true" />}
    </div>
  )
}

export default StartScreen
