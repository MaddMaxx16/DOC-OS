import { useMemo, useState } from 'react'

// B.5.4D.4.3.4 — Startup Experience Polish
function StartScreen({
  saveSlots = [],
  activeSaveSlotId = null,
  onResumeSave,
  onDeleteSave,
  onStartNew,
}) {
  const [manageOpen, setManageOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const stateFor = (slot) =>
    slot?.state ||
    slot?.snapshot ||
    slot?.data ||
    slot?.save ||
    slot ||
    {}

  const labelForSlot = (slot, index) => {
    const raw = String(slot?.label || slot?.name || slot?.id || '').trim()
    if (raw) return raw.replace(/[-_]+/g, ' ').toUpperCase()
    return `OPERATION ${index + 1}`
  }

  const operationName = (slot) => {
    const state = stateFor(slot)
    return (
      state?.dispatcherProfile?.businessName ||
      state?.dispatcherProfile?.companyName ||
      state?.dispatcherProfile?.displayName ||
      state?.businessName ||
      'Independent Dispatch'
    )
  }

  const marketName = (slot) => {
    const state = stateFor(slot)
    const market = state?.selectedMarket
    if (market === 'new-york') return 'New York'
    if (typeof market === 'string' && market.trim()) {
      return market.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }
    return 'Market not selected'
  }

  const operationMeta = (slot) => {
    const state = stateFor(slot)
    const operationDay = Number(state?.dayLoop?.operationDay || 1)
    const minute = Number(state?.gameTime?.totalMinutesOfDay)
    if (!Number.isFinite(minute)) return `${marketName(slot)} · Day ${operationDay}`
    const hours = Math.floor(minute / 60)
    const mins = Math.floor(minute % 60)
    const suffix = hours >= 12 ? 'PM' : 'AM'
    const displayHour = ((hours + 11) % 12) + 1
    return `${marketName(slot)} · Day ${operationDay} · ${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`
  }

  const activeSave = useMemo(
    () => saveSlots.find((slot) => slot?.id === activeSaveSlotId) || saveSlots[0] || null,
    [saveSlots, activeSaveSlotId],
  )

  const hasSavedOperation = saveSlots.length > 0
  const hasEmptySlot = saveSlots.length < 3

  return (
    <div className="entry-screen start-screen-cinematic start-screen-d434">
      <section className="start-cinematic-shell start-cinematic-shell-d434">
        <header className="start-cinematic-brand start-cinematic-brand-d434">
          <span className="start-network-line">
            <i aria-hidden="true" />
            DISPATCH NETWORK · {hasSavedOperation ? 'ONLINE' : 'READY'}
          </span>
          <span className="start-cinematic-eyebrow">DISPATCH OPERATIONS CENTER</span>
          <h1>DOC OS</h1>
          <p>Build your operation. Move freight. Keep your drivers moving.</p>
        </header>

        <main className="start-menu-panel start-menu-panel-d434">
          {activeSave ? (
            <section className="start-current-operation-d434" aria-label="Current operation">
              <span>CURRENT OPERATION</span>
              <strong>{operationName(activeSave)}</strong>
              <small>{operationMeta(activeSave)}</small>
            </section>
          ) : (
            <section className="start-current-operation-d434 empty" aria-label="No current operation">
              <span>NEW DISPATCH OPERATION</span>
              <strong>Your desk is ready.</strong>
              <small>Create an operation, choose a market, and begin Day 1.</small>
            </section>
          )}

          <div className="start-primary-actions-d434">
            {activeSave && (
              <button
                type="button"
                className="start-menu-action start-menu-action-primary"
                onClick={() => onResumeSave?.(activeSave.id)}
              >
                <span>CONTINUE OPERATIONS</span>
                <b aria-hidden="true">›</b>
              </button>
            )}

            <button
              type="button"
              className="start-menu-action"
              onClick={onStartNew}
              disabled={!hasEmptySlot}
            >
              <span>{hasEmptySlot ? 'NEW OPERATION' : 'OPERATION SLOTS FULL'}</span>
              <b aria-hidden="true">＋</b>
            </button>

            {hasSavedOperation && (
              <button
                type="button"
                className={`start-menu-action start-manage-toggle ${manageOpen ? 'open' : ''}`}
                onClick={() => setManageOpen((value) => !value)}
                aria-expanded={manageOpen}
              >
                <span>MANAGE OPERATIONS</span>
                <b aria-hidden="true">{manageOpen ? '−' : '⌄'}</b>
              </button>
            )}
          </div>

          {manageOpen && hasSavedOperation && (
            <section className="start-operation-manager-d434" aria-label="Saved operations">
              {saveSlots.map((slot, index) => (
                <div
                  className={`start-operation-row-d434 ${slot?.id === activeSaveSlotId ? 'active' : ''}`}
                  key={slot?.id || index}
                >
                  <button
                    type="button"
                    className="start-operation-resume-d434"
                    onClick={() => onResumeSave?.(slot?.id)}
                  >
                    <span>{labelForSlot(slot, index)}</span>
                    <strong>{operationName(slot)}</strong>
                    <small>{operationMeta(slot)}</small>
                  </button>
                  <button
                    type="button"
                    className="start-operation-delete-d434"
                    onClick={() => onDeleteSave?.(slot?.id)}
                    aria-label={`Delete ${operationName(slot)}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </section>
          )}
        </main>

        <footer className="start-cinematic-footer start-cinematic-footer-d434">
          <div>
            <span>INDEPENDENT DISPATCH</span>
            <strong>{saveSlots.length} OPERATION{saveSlots.length === 1 ? '' : 'S'}</strong>
          </div>

          <button
            type="button"
            className="start-settings-button-d434"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <span aria-hidden="true">⚙</span>
            SETTINGS
          </button>
        </footer>
      </section>

      {settingsOpen && (
        <div
          className="start-settings-overlay-d434"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-settings-title"
          onClick={() => setSettingsOpen(false)}
        >
          <section
            className="start-settings-sheet-d434"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <span>DOC OS</span>
              <h2 id="start-settings-title">Settings</h2>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
            </header>
            <div className="start-settings-placeholder-d434">
              <span>SYSTEM SETTINGS</span>
              <strong>Controls are coming online.</strong>
              <p>
                DOC OS is currently using its default gameplay, audio and interface settings.
                This menu is now part of the title screen so future options have a permanent home.
              </p>
            </div>
            <button type="button" className="start-settings-close-d434" onClick={() => setSettingsOpen(false)}>
              DONE
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

export default StartScreen
