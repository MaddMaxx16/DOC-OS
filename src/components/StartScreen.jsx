import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { SAVE_SLOT_IDS } from '../utils/saveGame.js'

const marketNames = { 'new-york': 'New York' }

function StartScreen({
  saveSlots = [],
  activeSaveSlotId = null,
  onResumeSave,
  onStartNew,
}) {
  const hasSavedOperation = saveSlots.length > 0
  const slotMap = new Map(saveSlots.map((slot) => [slot.id, slot]))
  const hasEmptySlot = saveSlots.length < SAVE_SLOT_IDS.length

  const currentSlot =
    (activeSaveSlotId && slotMap.get(activeSaveSlotId)) ||
    saveSlots[0] ||
    null

  const otherSlots = currentSlot
    ? saveSlots.filter((slot) => slot.id !== currentSlot.id)
    : []

  const currentState = currentSlot?.state || {}
  const currentMarket =
    marketNames[currentState.selectedMarket] || 'Operation'

  const currentTime =
    currentState.gameTime || {
      gameDayIndex: 0,
      totalMinutesOfDay: 360,
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
          {hasSavedOperation ? (
            <>
              <div className="start-cinematic-operation">
                <span>CURRENT OPERATION</span>

                <strong>
                  {currentMarket} Operation
                </strong>

                <small>
                  {formatCompactDate(currentTime.gameDayIndex)}
                  {' · '}
                  {formatTime(currentTime.totalMinutesOfDay)}
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
                  onClick={onStartNew}
                >
                  <span>NEW OPERATION</span>
                  <span aria-hidden="true">›</span>
                </button>
              )}

              {otherSlots.length > 0 && (
                <div className="start-cinematic-other">
                  <span>OTHER OPERATIONS</span>

                  {otherSlots.map((slot) => {
                    const state = slot.state || {}

                    const market =
                      marketNames[state.selectedMarket] || 'Operation'

                    const time =
                      state.gameTime || {
                        gameDayIndex: 0,
                        totalMinutesOfDay: 360,
                      }

                    return (
                      <button
                        type="button"
                        className="start-operation-switch"
                        key={slot.id}
                        onClick={() => onResumeSave?.(slot.id)}
                      >
                        <span>{market}</span>

                        <small>
                          {formatCompactDate(time.gameDayIndex)}
                          {' · '}
                          {formatTime(time.totalMinutesOfDay)}
                        </small>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="start-cinematic-operation new-career">
                <span>BEGIN YOUR DISPATCH CAREER</span>

                <strong>
                  Your operation starts here.
                </strong>

                <small>
                  Build carrier relationships, manage drivers,
                  and keep freight moving.
                </small>
              </div>

              <button
                type="button"
                className="start-menu-action primary"
                onClick={onStartNew}
              >
                <span>START NEW OPERATION</span>
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
