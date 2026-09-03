function MarketSelectionScreen({ selectedMarket, onSelectMarket, onConfirm }) {
  const newYorkSelected = selectedMarket === 'new-york'

  return (
    <div className="entry-screen market-selection-screen market-selection-v2">
      <section className="market-terminal-card">
        <header className="market-selection-header">
          <span className="market-kicker">OPERATION SETUP</span>
          <div className="market-heading-row">
            <div>
              <h1>Choose Your Market</h1>
              <p>Every market will bring its own freight patterns, operating pressure and lane strategy.</p>
            </div>
            <span className="market-count">01 / 03</span>
          </div>
        </header>

        <div className="market-list market-list-v2">
          <button
            type="button"
            className={`market-card market-card-featured ${newYorkSelected ? 'selected' : ''}`}
            onClick={onSelectMarket}
            aria-pressed={newYorkSelected}
          >
            <div className="market-card-topline">
              <span className="market-region">NORTHEAST FREIGHT MARKET</span>
              <span className="market-status available">AVAILABLE</span>
            </div>
            <div className="market-card-title-row">
              <div>
                <strong>New York</strong>
                <small>NY / NJ Metro</small>
              </div>
              <span className="market-arrow" aria-hidden="true">›</span>
            </div>
            <div className="market-feature-grid">
              <span><small>NETWORK</small><strong>Dense</strong></span>
              <span><small>LANES</small><strong>Urban</strong></span>
              <span><small>COMPLEXITY</small><strong>Moderate</strong></span>
            </div>
          </button>

          <div className="market-card market-card-locked unavailable" aria-disabled="true">
            <div>
              <span className="market-region">SOUTHEAST FREIGHT MARKET</span>
              <strong>Atlanta</strong>
              <small>Regional distribution · Long-haul corridors</small>
            </div>
            <span className="market-status locked">LOCKED</span>
          </div>

          <div className="market-card market-card-locked unavailable" aria-disabled="true">
            <div>
              <span className="market-region">TEXAS FREIGHT MARKET</span>
              <strong>Dallas</strong>
              <small>High-volume distribution · Long-distance lanes</small>
            </div>
            <span className="market-status locked">LOCKED</span>
          </div>
        </div>

        <button
          type="button"
          className="confirm-button market-confirm-action"
          onClick={onConfirm}
          disabled={!selectedMarket}
        >
          <span>{newYorkSelected ? 'START IN NEW YORK' : 'SELECT A MARKET'}</span>
          <span aria-hidden="true">›</span>
        </button>
      </section>
    </div>
  )
}

export default MarketSelectionScreen
