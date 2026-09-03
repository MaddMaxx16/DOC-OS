function StartScreen({ onStart }) {
  return (
    <div className="entry-screen start-screen start-screen-v2">
      <section className="start-terminal-card">
        <div className="start-network-status">
          <span className="start-network-dot" aria-hidden="true" />
          <span>DISPATCH NETWORK ONLINE</span>
        </div>

        <div className="start-brand-lockup">
          <span className="start-kicker">DISPATCH OPERATIONS CENTER</span>
          <h1>DOC OS</h1>
          <p>Build your carrier book. Move freight. Run the operation.</p>
        </div>

        <div className="start-system-grid" aria-label="System status">
          <div>
            <span>NETWORK</span>
            <strong>CONNECTED</strong>
          </div>
          <div>
            <span>MARKET DATA</span>
            <strong>LIVE</strong>
          </div>
          <div>
            <span>DISPATCH CORE</span>
            <strong>READY</strong>
          </div>
        </div>

        <button type="button" className="entry-button start-primary-action" onClick={onStart}>
          <span>ENTER DISPATCH TERMINAL</span>
          <span aria-hidden="true">›</span>
        </button>

        <div className="start-terminal-footer">
          <span>INDEPENDENT DISPATCH</span>
          <span>DAY ONE</span>
        </div>
      </section>
    </div>
  )
}

export default StartScreen
