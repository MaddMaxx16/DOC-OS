import { useState } from 'react'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { SAVE_SLOT_IDS } from '../utils/saveGame.js'

const marketNames = { 'new-york': 'New York' }

function getOperationInfo(slot) {
  const state = slot?.state || {}

  const market =
    marketNames[state.selectedMarket] ||
    state.dispatcherProfile?.homeMarket ||
    'Operation'

  const time =
    state.gameTime || {
      gameDayIndex: 0,
      totalMinutesOfDay: 360,
    }

  const businessName =
    state.dispatcherProfile?.businessName ||
    state.dispatcherProfile?.displayName ||
    null

  return {
    name: businessName || `${market} Operation`,
    market,
    time,
    operationDay:
      Number(state.dayLoop?.operationDay) ||
      Number(time.gameDayIndex || 0) + 1,
  }
}

// B.5.4C — Manage Operations
function StartScreen({
  saveSlots = [],
  activeSaveSlotId = null,
  onResumeSave,
  onDeleteSave,
  onStartNew,
}) {
  const [manageOpen, setManageOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  const hasSavedOperation = saveSlots.length > 0
  const slotMap = new Map(saveSlots.map((slot) => [slot.id, slot]))
  const hasEmptySlot = saveSlots.length < SAVE_SLOT_IDS.length

  const currentSlot =
    (activeSaveSlotId && slotMap.get(activeSaveSlotId)) ||
    saveSlots[0] ||
    null

  const currentInfo = currentSlot
    ? getOperationInfo(currentSlot)
    : null

  const handleDelete = (slotId) => {
    onDeleteSave?.(slotId)
    setPendingDeleteId(null)
  }

  return (
    <div className="entry-screen start-screen start-screen-v2 start-screen-cinematic">
      <section className="start-cinematic-shell">

        <header className="start-cinematic-brand">
          <div
            className={`start-cinematic-status ${
              hasSavedOperation ? 'online' : 'ready'
            }`}
          >
            <span className="start-cinematic-status-dot" aria-hidden="true" />
            <span>
              {hasSavedOperation
                ? 'DISPATCH NETWORK · ONLINE'
                : 'DISPATCH NETWORK · READY'}
            </span>
          </div>

          <span className="start-cinematic-kicker">
            DISPATCH OPERATIONS CENTER
          </span>

          <h1>DOC OS</h1>

          <p>
            Build your operation. Move freight.
            <br />
            Keep your drivers moving.
          </p>
        </header>

        <div className="start-cinematic-menu">
          {manageOpen ? (
            <section className="start-operation-manager">
              <header className="start-operation-manager-header">
                <button
                  type="button"
                  className="start-operation-manager-back"
                  onClick={() => {
                    setPendingDeleteId(null)
                    setManageOpen(false)
                  }}
                >
                  ‹ BACK
                </button>

                <div>
                  <span>DISPATCH NETWORK</span>
                  <h2>Manage Operations</h2>
                  <p>
                    Continue an existing career, clear an old save,
                    or begin a fresh operation.
                  </p>
                </div>
              </header>

              <div className="start-operation-slots">
                {SAVE_SLOT_IDS.map((slotId, index) => {
                  const slot = slotMap.get(slotId)

                  if (!slot) {
                    return (
                      <article
                        className="start-operation-slot empty"
                        key={slotId}
                      >
                        <div className="start-operation-slot-heading">
                          <span>
                            OPERATION SLOT {String(index + 1).padStart(2, '0')}
                          </span>
                          <small>EMPTY</small>
                        </div>

                        <strong>New Dispatch Operation</strong>

                        <p>
                          Create a new business and begin from Day 1.
                        </p>

                        <button
                          type="button"
                          className="start-operation-slot-action new"
                          onClick={() => onStartNew?.(slotId)}
                        >
                          START NEW OPERATION
                          <span aria-hidden="true">›</span>
                        </button>
                      </article>
                    )
                  }

                  const info = getOperationInfo(slot)
                  const deleting = pendingDeleteId === slotId
                  const active = activeSaveSlotId === slotId

                  return (
                    <article
                      className={`start-operation-slot${active ? ' active' : ''}`}
                      key={slotId}
                    >
                      <div className="start-operation-slot-heading">
                        <span>
                          OPERATION SLOT {String(index + 1).padStart(2, '0')}
                        </span>

                        {active && <small>CURRENT</small>}
                      </div>

                      <strong>{info.name}</strong>

                      <p>
                        {info.market}
                        {' · '}
                        Day {info.operationDay}
                        {' · '}
                        {formatCompactDate(info.time.gameDayIndex)}
                        {' · '}
                        {formatTime(info.time.totalMinutesOfDay)}
                      </p>

                      {!deleting ? (
                        <div className="start-operation-slot-actions">
                          <button
                            type="button"
                            className="start-operation-slot-action continue"
                            onClick={() => onResumeSave?.(slotId)}
                          >
                            CONTINUE
                          </button>

                          <button
                            type="button"
                            className="start-operation-slot-delete"
                            onClick={() => setPendingDeleteId(slotId)}
                          >
                            DELETE
                          </button>
                        </div>
                      ) : (
                        <div className="start-operation-delete-confirm">
                          <div>
                            <strong>Delete this operation?</strong>
                            <small>
                              This career and its progress will be permanently removed.
                            </small>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                            >
                              CANCEL
                            </button>

                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDelete(slotId)}
                            >
                              DELETE PERMANENTLY
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          ) : hasSavedOperation ? (
            <>
              <div className="start-cinematic-operation">
                <span>CURRENT OPERATION</span>

                <strong>{currentInfo?.name}</strong>

                <small>
                  {currentInfo?.market}
                  {' · '}
                  Day {currentInfo?.operationDay}
                  {' · '}
                  {formatTime(currentInfo?.time.totalMinutesOfDay)}
                </small>
              </div>

              <button
                type="button"
                className="start-menu-action primary"
                onClick={() => onResumeSave?.(currentSlot.id)}
              >
                <span>CONTINUE OPERATIONS</span>
                <span aria-hidden="true">›</span>
              </button>

              {hasEmptySlot && (
                <button
                  type="button"
                  className="start-menu-action secondary"
                  onClick={() => onStartNew?.()}
                >
                  <span>NEW OPERATION</span>
                  <span aria-hidden="true">›</span>
                </button>
              )}

              <button
                type="button"
                className="start-menu-action tertiary"
                onClick={() => setManageOpen(true)}
              >
                <span>MANAGE OPERATIONS</span>
                <span aria-hidden="true">›</span>
              </button>
            </>
          ) : (
            <>
              <div className="start-cinematic-operation new-career">
                <span>BEGIN YOUR DISPATCH CAREER</span>

                <strong>Your operation starts here.</strong>

                <small>
                  Build carrier relationships, manage drivers,
                  and keep freight moving.
                </small>
              </div>

              <button
                type="button"
                className="start-menu-action primary"
                onClick={() => onStartNew?.()}
              >
                <span>START NEW OPERATION</span>
                <span aria-hidden="true">›</span>
              </button>

              <button
                type="button"
                className="start-menu-action tertiary"
                onClick={() => setManageOpen(true)}
              >
                <span>MANAGE OPERATIONS</span>
                <span aria-hidden="true">›</span>
              </button>
            </>
          )}
        </div>

        <footer className="start-cinematic-footer">
          <span>INDEPENDENT DISPATCH</span>

          <span>
            {hasSavedOperation
              ? `${saveSlots.length} OPERATION${saveSlots.length === 1 ? '' : 'S'}`
              : 'DAY ONE'}
          </span>
        </footer>
      </section>
    </div>
  )
}

export default StartScreen
