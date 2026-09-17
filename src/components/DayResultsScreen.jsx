import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getProgressionView } from '../utils/dayLoop.js'
import { getCarrierRelationshipStateLabel } from '../utils/carrierCareer.js'

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function score(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : '—'
}

function DayResultsScreen({ report, progression, onContinue }) {
  if (!report) return null
  const progress = getProgressionView(progression)
  const dispatchFeePercent = report.carrierRevenue > 0 ? Math.round((report.dispatchRevenue / report.carrierRevenue) * 1000) / 10 : 0

  return (
    <section className="day-loop-screen day-results-screen" aria-label={`Day ${report.operationDay} results`}>
      <div className="day-loop-topline">
        <span>DOC OS · DAILY CLOSEOUT</span>
        <span>NEW YORK</span>
      </div>

      <header className="day-loop-header">
        <span className="day-loop-kicker">DAY {String(report.operationDay).padStart(2, '0')} RESULTS</span>
        <h1>Business-day report.</h1>
        <p>{formatCompactDate(report.closeGameDayIndex)} · {formatTime(report.closeMinutes)}</p>
      </header>

      <div className="day-loop-scroll">

        <section className="day-report-section">
          <h2>OPERATION SUMMARY</h2>
          <div className="day-report-rows">
            <div><span>Loads Completed</span><strong>{report.loadsCompleted}</strong></div>
            <div><span>Carrier Gross</span><strong>{money(report.carrierRevenue)}</strong></div>
            <div><span>Dispatch Fee</span><strong>{dispatchFeePercent}%</strong></div>
            <div><span>Dispatch Revenue</span><strong>{money(report.dispatchRevenue)}</strong></div>
            <div><span>Cash Collected</span><strong>{money(report.cashCollected)}</strong></div>
            {Number.isFinite(report.operatingAccountBalance) && <div><span>Operating Account</span><strong>{money(report.operatingAccountBalance)}</strong></div>}
            <div><span>Open Receivables</span><strong>{money(report.pendingReceivables)}</strong></div>
          </div>
        </section>

        {Array.isArray(report.carrierBreakdown) && report.carrierBreakdown.map((carrier) => (
          <section className="day-report-section carrier-closeout-section" key={carrier.carrierId}>
            <h2>{carrier.carrierName.toUpperCase()}</h2>
            <div className="day-report-rows">
              <div><span>Agreement</span><strong>{carrier.dispatchFeePercent}% · {carrier.bookingAuthority}</strong></div>
              <div><span>Carrier Gross</span><strong>{money(carrier.carrierGross)}</strong></div>
              <div><span>Dispatch Revenue</span><strong>{money(carrier.dispatchRevenue)}</strong></div>
              <div><span>Loads Completed</span><strong>{carrier.loadsCompleted}</strong></div>
              <div><span>Service Windows</span><strong>{carrier.onTimePickups + carrier.onTimeDeliveries} / {carrier.loadsCompleted * 2}</strong></div>
              <div><span>Carrier Relationship</span><strong className={carrier.relationshipChange >= 0 ? 'positive' : 'attention'}>{carrier.relationshipLabel} · {carrier.relationshipChange >= 0 ? '+' : ''}{carrier.relationshipChange}</strong></div>
              {carrier.careerReview && <div><span>Performance Grade</span><strong className={['A','B'].includes(carrier.careerReview.grade) ? 'positive' : ['D','F'].includes(carrier.careerReview.grade) ? 'attention' : ''}>{carrier.careerReview.grade}</strong></div>}
              {carrier.careerReview && <div><span>Carrier XP</span><strong className="positive">+{carrier.careerReview.carrierXpGain} XP</strong></div>}
              {carrier.careerReview && <div><span>Account Level</span><strong>{carrier.careerReview.levelAfter}{carrier.careerReview.levelUp ? ' · LEVEL UP' : ''}</strong></div>}
              {carrier.careerReview && <div><span>Account Status</span><strong className={['AT_RISK','PROBATION'].includes(carrier.careerReview.relationshipStateAfter) ? 'attention' : 'positive'}>{getCarrierRelationshipStateLabel(carrier.careerReview.relationshipStateAfter)}</strong></div>}
              {carrier.careerReview?.strikeIssued && <div><span>Service Warning</span><strong className="attention">STRIKE {carrier.careerReview.strikeCountAfter}</strong></div>}
              {carrier.careerReview?.strikeForgiven && <div><span>Service Recovery</span><strong className="positive">STRIKE REMOVED</strong></div>}
            </div>
          </section>
        ))}

        <section className="day-report-section">
          <h2>SERVICE & PERFORMANCE</h2>
          <div className="day-report-rows">
            <div><span>Pickup Windows Met</span><strong>{report.onTimePickups ?? 0} / {report.loadsCompleted}</strong></div>
            <div><span>Delivery Windows Met</span><strong>{report.onTimeDeliveries ?? 0} / {report.loadsCompleted}</strong></div>
            <div><span>Freight Exceptions</span><strong className={report.exceptionLoads > 0 ? 'attention' : ''}>{report.exceptionLoads ?? 0}</strong></div>
            <div><span>Service Score</span><strong className="positive">{score(report.serviceScore)}</strong></div>
            <div><span>Efficiency</span><strong>{score(report.efficiencyScore)}</strong></div>
            <div><span>Reputation</span><strong className={report.reputationChange >= 0 ? 'positive' : 'attention'}>{report.reputationChange >= 0 ? '+' : ''}{report.reputationChange}</strong></div>
          </div>
        </section>

        <section className="day-report-section">
          <h2>DISPATCHER PROGRESS</h2>
          <div className="day-report-rows">
            <div><span>Total XP</span><strong>{progress.xp}</strong></div>
            <div><span>Level</span><strong>{progress.level}</strong></div>
            <div><span>Progress</span><strong>{progress.xpIntoLevel} / {progress.xpPerLevel} XP</strong></div>
          </div>
          <div className="day-xp-track" aria-label={`${progress.xpIntoLevel} of ${progress.xpPerLevel} XP to next level`}>
            <span style={{ width: `${Math.min(100, (progress.xpIntoLevel / progress.xpPerLevel) * 100)}%` }} />
          </div>
        </section>

        <section className="day-report-section next-day-outlook">
          <h2>CONTINUITY</h2>
          <div className="day-report-rows">
            <div><span>Next Operations</span><strong>7:00 AM</strong></div>
            <div><span>Open Freight</span><strong>CARRIES FORWARD</strong></div>
            <div><span>Overnight World State</span><strong>CONTINUES LIVE</strong></div>
          </div>
        </section>
      </div>

      <div className="day-loop-actions">
        <button type="button" className="day-loop-primary" onClick={onContinue}>CONTINUE TO NEXT OPERATIONS</button>
      </div>
    </section>
  )
}

export default DayResultsScreen
