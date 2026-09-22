function DayOneEntryScreen({
  dispatcherProfile = null,
  marketName = 'New York Metro',
  onBack,
  onBegin,
}) {
  const operationName =
    dispatcherProfile?.businessName ||
    dispatcherProfile?.companyName ||
    dispatcherProfile?.displayName ||
    'Your Dispatch Operation'

  return (
    <section className="day-one-entry-screen" aria-label="Day 1 operation start">
      <div className="day-one-entry-shade" />

      <header className="day-one-entry-topbar">
        <button type="button" onClick={onBack} aria-label="Back to market selection">‹</button>
        <div>
          <span>DOC OS · NEW OPERATION</span>
          <strong>{marketName}</strong>
        </div>
        <small>DAY 1</small>
      </header>

      <main className="day-one-entry-content">
        <section className="day-one-entry-hero">
          <span className="day-one-entry-kicker">YOUR OPERATION BEGINS HERE</span>
          <h1>{operationName}</h1>
          <p>
            You have a market and a business identity. Now you need the first
            relationship that gives the operation something to manage.
          </p>
        </section>

        <section className="day-one-entry-status" aria-label="Starting operation status">
          <div><span>ACTIVE CARRIERS</span><strong>0</strong></div>
          <div><span>ACTIVE DRIVERS</span><strong>0</strong></div>
          <div><span>ACTIVE LOADS</span><strong>0</strong></div>
        </section>

        <section className="day-one-entry-objective">
          <div className="day-one-entry-objective-index">01</div>
          <div className="day-one-entry-objective-copy">
            <span>FIRST OBJECTIVE</span>
            <h2>Establish your first carrier relationship.</h2>
            <p>
              Jordan Blake sent you a note about getting started. Read it first,
              then use CarrierSource to find a carrier that fits your operation.
            </p>
          </div>
        </section>

        <section className="day-one-entry-sequence" aria-label="Day 1 starting sequence">
          <div className="active"><span>1</span><strong>EMAIL</strong><small>Hear from Jordan</small></div>
          <i />
          <div><span>2</span><strong>CARRIERSOURCE</strong><small>Find a carrier</small></div>
          <i />
          <div><span>3</span><strong>OPERATIONS</strong><small>Build from there</small></div>
        </section>
      </main>

      <footer className="day-one-entry-footer">
        <div><span>STARTING MARKET</span><strong>{marketName}</strong></div>
        <button type="button" onClick={onBegin}>BEGIN DAY 1 <span>›</span></button>
      </footer>
    </section>
  )
}

export default DayOneEntryScreen
