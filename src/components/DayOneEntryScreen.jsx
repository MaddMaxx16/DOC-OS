// B.5.4D.4.3.4 — Startup Experience Polish
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
    <section className="day-one-entry-screen day-one-entry-d434" aria-label="Day 1 operation start">
      <div className="day-one-entry-shade" />

      <header className="day-one-entry-topbar">
        <button type="button" onClick={onBack} aria-label="Back to market selection">‹</button>
        <div>
          <span>DOC OS · NEW OPERATION</span>
          <strong>{marketName}</strong>
        </div>
        <small>DAY 1</small>
      </header>

      <main className="day-one-entry-content day-one-entry-content-d434">
        <section className="day-one-entry-hero day-one-entry-hero-d434">
          <span className="day-one-entry-kicker">YOUR OPERATION STARTS HERE</span>
          <h1>{operationName}</h1>
          <p>
            The desk is open. Your first job is not moving freight yet — it is building the
            carrier relationship that gives you freight to manage.
          </p>
        </section>

        <section className="day-one-entry-status day-one-entry-status-compact-d434" aria-label="Starting operation status">
          <div><span>CARRIERS</span><strong>0</strong></div>
          <div><span>DRIVERS</span><strong>0</strong></div>
          <div><span>LOADS</span><strong>0</strong></div>
        </section>

        <section className="day-one-entry-objective day-one-entry-objective-d434">
          <div className="day-one-entry-objective-index">01</div>
          <div className="day-one-entry-objective-copy">
            <span>FIRST OBJECTIVE</span>
            <h2>Establish your first carrier relationship.</h2>
            <p>
              Jordan Blake sent you a note about getting started. Read it first, then use
              CarrierSource to review the carrier opportunity waiting in your market.
            </p>
          </div>
        </section>

        <section className="day-one-entry-sequence day-one-entry-sequence-d434" aria-label="Day 1 starting sequence">
          <div className="active">
            <span>1</span>
            <strong>READ EMAIL</strong>
            <small>Jordan’s note</small>
          </div>
          <i />
          <div>
            <span>2</span>
            <strong>FIND CARRIER</strong>
            <small>CarrierSource</small>
          </div>
          <i />
          <div>
            <span>3</span>
            <strong>BUILD DAY</strong>
            <small>FreightLink</small>
          </div>
        </section>
      </main>

      <footer className="day-one-entry-footer day-one-entry-footer-d434">
        <div>
          <span>NEXT</span>
          <strong>Open Jordan’s first message.</strong>
        </div>
        <button type="button" onClick={onBegin}>
          BEGIN DAY 1 <span aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  )
}

export default DayOneEntryScreen
