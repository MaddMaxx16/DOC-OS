import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { SAVE_SLOT_IDS } from '../utils/saveGame.js'

const marketNames = { 'new-york': 'New York' }

function slotLabel(slotId) {
  return slotId.replace('save-', 'SAVE ')
}

function StartScreen({ saveSlots = [], activeSaveSlotId = null, onResumeSave, onDeleteSave, onStartNew }) {
  const hasSavedOperation = saveSlots.length > 0
  const slotMap = new Map(saveSlots.map((slot) => [slot.id, slot]))
  const hasEmptySlot = saveSlots.length < SAVE_SLOT_IDS.length

  return (
    <div className="entry-screen start-screen start-screen-v2">
      <section className="start-terminal-card">
        <div className={`start-network-status ${hasSavedOperation ? 'online' : 'offline'}`}>
          <span className="start-network-dot" aria-hidden="true" />
          <span>{hasSavedOperation ? 'DISPATCH OPERATIONS ONLINE' : 'DISPATCH OPERATIONS OFFLINE'}</span>
        </div>

        <div className="start-brand-lockup">
          <span className="start-kicker">DISPATCH OPERATIONS CENTER</span>
          <h1>DOC OS</h1>
          <p>Build your carrier book. Move freight. Run the operation.</p>
        </div>

        {hasSavedOperation ? (
          <div className="start-save-list" aria-label="Saved operations">
            {SAVE_SLOT_IDS.map((slotId) => {
              const slot = slotMap.get(slotId)
              if (!slot) {
                return (
                  <div className="start-save-slot empty" key={slotId}>
                    <span>{slotLabel(slotId)}</span>
                    <small>EMPTY</small>
                  </div>
                )
              }

              const state = slot.state || {}
              const market = marketNames[state.selectedMarket] || 'Operation'
              const time = state.gameTime || { gameDayIndex: 0, totalMinutesOfDay: 420 }

              return (
                <div className={`start-save-slot saved ${activeSaveSlotId === slotId ? 'active' : ''}`} key={slotId}>
                  <button type="button" className="start-save-resume" onClick={() => onResumeSave?.(slotId)}>
                    <span>{slotLabel(slotId)}</span>
                    <strong>{market}</strong>
                    <small>{formatCompactDate(time.gameDayIndex)} · {formatTime(time.totalMinutesOfDay)}</small>
                  </button>
                  <button type="button" className="start-save-delete" onClick={() => onDeleteSave?.(slotId)} aria-label={`Delete ${slotLabel(slotId)}`}>×</button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="start-system-grid" aria-label="System status">
            <div><span>NETWORK</span><strong>CONNECTED</strong></div>
            <div><span>MARKET DATA</span><strong>LIVE</strong></div>
            <div className="start-core-status offline"><span>DISPATCH CORE</span><strong>OFFLINE</strong></div>
          </div>
        )}

        <button type="button" className="entry-button start-primary-action" onClick={onStartNew} disabled={!hasEmptySlot}>
          <span>{hasSavedOperation ? (hasEmptySlot ? 'NEW OPERATION' : 'SAVE SLOTS FULL') : 'START NEW OPERATION'}</span>
          <span aria-hidden="true">›</span>
        </button>

        <div className="start-terminal-footer">
          <span>INDEPENDENT DISPATCH</span>
          <span>{hasSavedOperation ? `${saveSlots.length} SAVED` : 'DAY ONE'}</span>
        </div>
      </section>
    </div>
  )
}

export default StartScreen
