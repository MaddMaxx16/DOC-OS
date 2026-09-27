// B.5.4D.4.3.4 — Startup Experience Polish
function MarketSelectionScreen({ selectedMarket, onSelectMarket, onConfirm, onBack }) {
  const newYorkSelected = selectedMarket === 'new-york'

  const startNewYork = () => {
    onSelectMarket?.('new-york')
    onConfirm?.()
  }

  return (
    <div className="entry-screen market-selection-screen market-selection-v2 market-selection-d434">
      <section className="market-terminal-card market-terminal-card-d434">
        <header className="market-selection-header market-selection-header-d434">
          <div className="market-selection-topline">
            <button type="button" className="market-back-button" onClick={onBack}>‹ BACK</button>
            <span className="market-kicker">OPERATION SETUP · 02</span>
          </div>

          <div className="market-heading-row market-heading-row-d434">
            <div>
              <span className="market-heading-eyebrow-d434">STARTING MARKET</span>
              <h1>Choose where you begin.</h1>
              <p>
                Your starting market shapes the freight around you. More regions will unlock
                as DOC OS expands.
              </p>
            </div>
            <span className="market-count market-count-d434">1 MARKET AVAILABLE</span>
          </div>
        </header>

        <div className="market-list market-list-v2 market-list-d434">
          <button
            type="button"
            className={`market-card market-card-featured market-card-available-d434 ${newYorkSelected ? 'selected' : ''}`}
            onClick={startNewYork}
            aria-pressed={newYorkSelected}
          >
            <div className="market-card-topline">
              <span className="market-region">AVAILABLE NOW</span>
              <span className="market-status available">START HERE</span>
            </div>

            <div className="market-card-title-row market-card-title-row-d434">
              <div>
                <strong>New York</strong>
                <small>NY / NJ Metro</small>
              </div>
              <span className="market-arrow" aria-hidden="true">›</span>
            </div>

            <div className="market-feature-grid market-feature-grid-d434">
              <span><small>NETWORK</small><strong>Dense</strong></span>
              <span><small>LANES</small><strong>Urban</strong></span>
              <span><small>PRESSURE</small><strong>Moderate</strong></span>
            </div>

            <div className="market-start-line-d434">
              <span>START IN NEW YORK</span>
              <b aria-hidden="true">→</b>
            </div>
          </button>

          <section className="market-locked-grid-d434" aria-label="Locked markets">
            <div className="market-card market-card-locked unavailable market-card-locked-d434" aria-disabled="true">
              <div>
                <span className="market-region">COMING LATER</span>
                <strong>Atlanta</strong>
                <small>Regional distribution · long-haul corridors</small>
              </div>
              <span className="market-status locked">LOCKED</span>
            </div>

            <div className="market-card market-card-locked unavailable market-card-locked-d434" aria-disabled="true">
              <div>
                <span className="market-region">COMING LATER</span>
                <strong>Dallas</strong>
                <small>High-volume distribution · long-distance lanes</small>
              </div>
              <span className="market-status locked">LOCKED</span>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default MarketSelectionScreen
