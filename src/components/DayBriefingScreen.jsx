import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function DayBriefingScreen({ operationDay, report, cash, activeCarriers, availableDrivers, openReceivables, onBegin }) {
  if (!report) return null

  return (
    <section className="day-loop-screen day-briefing-screen" aria-label={`Day ${operationDay} briefing`}>
      <div className="day-loop-topline">
        <span>DOC OS · STARTUP BRIEF</span>
        <span>NEW YORK</span>
      </div>

      <header className="day-loop-header">
        <span className="day-loop-kicker">DAY {String(operationDay).padStart(2, '0')}</span>
        <h1>Operation briefing.</h1>
        <p>{formatCompactDate(report.nextStartGameDayIndex)} · START {formatTime(report.nextStartMinutes)}</p>
      </header>

      <div className="day-loop-scroll">
        <section className="day-report-section">
          <h2>OPERATION STATUS</h2>
          <div className="day-report-rows">
            <div><span>Available Cash</span><strong>{money(cash)}</strong></div>
            <div><span>Active Carriers</span><strong>{activeCarriers}</strong></div>
            <div><span>Available Drivers</span><strong>{availableDrivers}</strong></div>
            <div><span>Open Receivables</span><strong>{money(openReceivables)}</strong></div>
          </div>
        </section>

        <section className="day-report-section day-start-status">
          <h2>START STATUS</h2>
          <div className="day-report-rows">
            <div><span>Standard Start</span><strong>{formatTime(report.standardStartMinutes)}</strong></div>
            <div><span>Late Close Adjustment</span><strong className={report.lateCloseAdjustmentMinutes > 0 ? 'attention' : ''}>{report.lateCloseAdjustmentMinutes > 0 ? `+${report.lateCloseAdjustmentMinutes} min` : 'None'}</strong></div>
            <div><span>Actual Start</span><strong>{formatTime(report.nextStartMinutes)}</strong></div>
          </div>
        </section>

        <section className="day-report-section overnight-section">
          <h2>OVERNIGHT</h2>
          <div className="overnight-status">
            <span className="overnight-status-dot" aria-hidden="true" />
            <div>
              <strong>NO OVERNIGHT CHANGES</strong>
              <span>No new operational events were recorded.</span>
            </div>
          </div>
        </section>
      </div>

      <div className="day-loop-actions">
        <button type="button" className="day-loop-primary" onClick={onBegin}>BEGIN OPERATIONS</button>
      </div>
    </section>
  )
}

export default DayBriefingScreen
