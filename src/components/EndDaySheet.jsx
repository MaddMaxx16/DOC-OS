function metricValue(value) {
  return Number(value || 0)
}

function EndDaySheet({ operationDay, status, onCancel, onConfirm }) {
  const rows = [
    ['ACTIVE LOADS', metricValue(status.activeLoads)],
    ['DRIVERS IN MOTION', metricValue(status.driversInMotion)],
    ['PENDING DOCUMENTS', metricValue(status.pendingDocuments)],
    ['PENDING INVOICES', metricValue(status.pendingInvoices)],
  ]

  return (
    <div className="end-day-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel?.() }}>
      <section className="end-day-sheet" role="dialog" aria-modal="true" aria-labelledby="end-day-title">
        <div className="end-day-sheet-handle" aria-hidden="true" />
        <header className="end-day-sheet-header">
          <div>
            <span>DAY {String(operationDay).padStart(2, '0')} · CLOSEOUT</span>
            <h2 id="end-day-title">Close operation?</h2>
          </div>
          <button type="button" className="end-day-sheet-close" onClick={onCancel} aria-label="Cancel end day">×</button>
        </header>

        <p className="end-day-sheet-copy">Review today’s business activity. Open work will carry forward without resetting the world.</p>

        <div className="end-day-status-grid">
          {rows.map(([label, value]) => (
            <div className="end-day-status-row" key={label}>
              <span>{label}</span>
              <strong className={value > 0 ? 'attention' : 'clear'}>{value}</strong>
            </div>
          ))}
        </div>

        {status.carryover?.length > 0 ? (
          <div className="end-day-blockers" role="status">
            <strong>Carryover into the next date</strong>
            {status.carryover.map((item) => <span key={item}>• {item}</span>)}
          </div>
        ) : (
          <div className="end-day-ready" role="status">
            <span className="end-day-ready-dot" aria-hidden="true" />
            <span>No open operational work is carrying forward.</span>
          </div>
        )}

        <div className="end-day-sheet-actions">
          <button type="button" className="end-day-cancel" onClick={onCancel}>CANCEL</button>
          <button type="button" className="end-day-confirm" onClick={onConfirm} disabled={!status.canEnd}>VIEW CLOSEOUT</button>
        </div>
      </section>
    </div>
  )
}

export default EndDaySheet
