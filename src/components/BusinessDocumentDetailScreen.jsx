import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function BusinessDocumentDetailScreen({ document, onBack }) {
  if (!document) return null
  const signedDate = Number.isFinite(document.signedGameMinute) ? `${formatCompactDate(Math.floor(document.signedGameMinute / 1440))} · ${formatTime(document.signedGameMinute % 1440)}` : 'Signed'
  const goals = document.goals || []
  const shiftGoals = goals.slice(0, 4)
  const operatingExpectations = goals.slice(4)
  const priorities = document.priorities || []

  return (
    <div className="phone-page business-document-detail-screen">
      <header className="agreement-toolbar"><button type="button" onClick={onBack} aria-label="Back to documents">‹</button><div><span>SIGNED DOCUMENT</span><strong>Dispatch Operating Agreement</strong></div></header>
      <div className="agreement-scroll">
        <article className="agreement-document compact-agreement read-only-agreement">
          <div className="agreement-document-heading"><span>DISPATCH OPERATING AGREEMENT</span><h2>{document.carrierName}</h2><p>Independent dispatch services · New York market</p></div>

          <div className="agreement-columns">
            <section className="agreement-bullet-section"><h3>Shift goals</h3><ul>{shiftGoals.map((goal) => <li key={goal}>{goal}</li>)}</ul></section>
            <section className="agreement-bullet-section"><h3>Operating expectations</h3><ul>{operatingExpectations.map((expectation) => <li key={expectation}>{expectation}</li>)}</ul></section>
          </div>

          {priorities.length > 0 && <section className="agreement-priority-strip"><h3>Carrier priorities</h3><p>{priorities.join(' · ')}</p></section>}
          <section className="agreement-acknowledgment"><p>{document.acknowledgment}</p></section>
          <section className="agreement-signed-block"><span>ELECTRONICALLY SIGNED BY</span><strong>{document.signedBy || 'Authorized Dispatcher'}</strong><small>{signedDate}</small></section>
        </article>
      </div>
    </div>
  )
}

export default BusinessDocumentDetailScreen
