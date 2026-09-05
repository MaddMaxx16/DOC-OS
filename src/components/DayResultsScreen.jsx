import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getProgressionView } from '../utils/dayLoop.js'

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function score(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : '—'
}

function DayResultsScreen({ report, progression, onContinue }) {
  if (!report) return null
  const progress = getProgressionView(progression)
  const nextOperationDay = report.operationDay + 1
  const dispatchFeePercent = report.carrierRevenue > 0 ? Math.round((report.dispatchRevenue / report.carrierRevenue) * 1000) / 10 : 0
  const trainingComplete = report.operationDay === 1

  return (
    <section className="day-loop-screen day-results-screen" aria-label={`Day ${report.operationDay} results`}>
      <div className="day-loop-topline">
        <span>DOC OS · DAILY CLOSEOUT</span>
        <span>NEW YORK</span>
      </div>

      <header className="day-loop-header">
        <span className="day-loop-kicker">DAY {String(report.operationDay).padStart(2, '0')} RESULTS</span>
        <h1>{trainingComplete ? 'Training operation complete.' : 'Operation closed.'}</h1>
        <p>{formatCompactDate(report.closeGameDayIndex)} · {formatTime(report.closeMinutes)}</p>
      </header>

      <div className="day-loop-scroll">
        {trainingComplete && (
          <section className="day-training-complete">
            <span className="day-training-complete-dot" aria-hidden="true" />
            <div>
              <strong>GUIDED TRAINING COMPLETE</strong>
              <span>Day 2 begins independent operation. The board, timing and carrier decisions are yours.</span>
            </div>
          </section>
        )}

        <section className="day-report-section">
          <h2>DAILY SUMMARY</h2>
          <div className="day-report-rows">
            <div><span>Loads Completed</span><strong>{report.loadsCompleted}</strong></div>
            <div><span>Carrier Revenue</span><strong>{money(report.carrierRevenue)}</strong></div>
            <div><span>Dispatch Fee</span><strong>{dispatchFeePercent}%</strong></div>
            <div><span>Dispatch Revenue</span><strong>{money(report.dispatchRevenue)}</strong></div>
            <div><span>Cash Collected</span><strong>{money(report.cashCollected)}</strong></div>
            <div><span>Pending Receivables</span><strong>{money(report.pendingReceivables)}</strong></div>
          </div>
        </section>

        <section className="day-report-section">
          <h2>PERFORMANCE</h2>
          <div className="day-report-rows">
            <div><span>Service</span><strong className="positive">{score(report.serviceScore)}</strong></div>
            <div><span>Efficiency</span><strong>{score(report.efficiencyScore)}</strong></div>
            <div><span>Reputation · completed service</span><strong className="positive">+{report.reputationChange}</strong></div>
          </div>
          {report.tutorialPenaltyExempt && <p className="day-report-note">Training-day close timing is protected. Late-start consequences begin after this operation.</p>}
        </section>

        <section className="day-report-section">
          <h2>OPERATOR PROGRESSION</h2>
          <div className="day-report-rows">
            <div><span>Dispatcher XP · loads + service</span><strong className="positive">+{report.xpGain}</strong></div>
            <div><span>Level</span><strong>{progress.level}</strong></div>
            <div><span>Progress</span><strong>{progress.xpIntoLevel} / {progress.xpPerLevel} XP</strong></div>
          </div>
          <div className="day-xp-track" aria-label={`${progress.xpIntoLevel} of ${progress.xpPerLevel} XP to next level`}>
            <span style={{ width: `${Math.min(100, (progress.xpIntoLevel / progress.xpPerLevel) * 100)}%` }} />
          </div>
        </section>

        <section className="day-report-section next-day-outlook">
          <h2>NEXT DAY OUTLOOK</h2>
          <div className="day-report-rows">
            <div><span>Standard Start</span><strong>{formatTime(report.standardStartMinutes)}</strong></div>
            <div><span>Late Close Adjustment</span><strong className={report.lateCloseAdjustmentMinutes > 0 ? 'attention' : ''}>{report.lateCloseAdjustmentMinutes > 0 ? `+${report.lateCloseAdjustmentMinutes} min` : 'None'}</strong></div>
            <div><span>Next Day Start</span><strong>{formatTime(report.nextStartMinutes)}</strong></div>
          </div>
        </section>
      </div>

      <div className="day-loop-actions">
        <button type="button" className="day-loop-primary" onClick={onContinue}>CONTINUE TO DAY {String(nextOperationDay).padStart(2, '0')}</button>
      </div>
    </section>
  )
}

export default DayResultsScreen
