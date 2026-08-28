function MarketSelectionScreen({ selectedMarket, onSelectMarket, onConfirm }) {
  return (
    <div className="entry-screen market-selection-screen">
      <h1>Select Your Market</h1>

      <div className="market-list">
        <button
          type="button"
          className={`market-card ${selectedMarket === 'new-york' ? 'selected' : ''}`}
          onClick={onSelectMarket}
        >
          <span>New York</span>
          <small>Available</small>
        </button>
        <div className="market-card unavailable">
          <span>Atlanta</span>
          <small>Coming Soon</small>
        </div>
        <div className="market-card unavailable">
          <span>Dallas</span>
          <small>Coming Soon</small>
        </div>
      </div>

      <button
        type="button"
        className="confirm-button"
        onClick={onConfirm}
        disabled={!selectedMarket}
      >
        Confirm
      </button>
    </div>
  )
}

export default MarketSelectionScreen
