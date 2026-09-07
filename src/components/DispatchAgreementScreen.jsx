import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function DispatchAgreementScreen({ carrier, gameTime, onAccept, onBack }) {
  const fee = carrier?.dispatchAgreement?.percentage ?? 8
  const now = (gameTime?.gameDayIndex ?? 0) * 1440 + (gameTime?.totalMinutesOfDay ?? 0)
  const signedDate = `${formatCompactDate(Math.floor(now / 1440))} · ${formatTime(now % 1440)}`

  const shiftGoals = [
    'Book at least 2 loads.',
    'Target $2.00+ per loaded mile.',
    'Dry Van / General Freight.',
    'Preferred region: Northeast.',
  ]

  const operatingExpectations = [
    'Keep deadhead under 75 miles when possible.',
    'Protect pickup and delivery appointments.',
    'Keep the driver informed before dispatch.',
    'Consider where each load positions the truck next.',
    `Dispatch fee: ${fee}% of carrier gross.`,
  ]

  return (
    <div className="phone-page dispatch-agreement-screen">
      <header className="agreement-toolbar"><button type="button" onClick={onBack} aria-label="Back to email">‹</button><div><span>ATTACHMENT</span><strong>Dispatch Operating Agreement</strong></div></header>
      <div className="agreement-scroll">
        <article className="agreement-document compact-agreement">
          <div className="agreement-document-heading"><span>DISPATCH OPERATING AGREEMENT</span><h2>{carrier?.name || 'Metroline Transport'}</h2><p>Independent dispatch services · New York market</p></div>

          <div className="agreement-columns">
            <section className="agreement-bullet-section">
              <h3>Shift goals</h3>
              <ul>{shiftGoals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
            </section>

            <section className="agreement-bullet-section">
              <h3>Operating expectations</h3>
              <ul>{operatingExpectations.map((expectation) => <li key={expectation}>{expectation}</li>)}</ul>
            </section>
          </div>

          <section className="agreement-priority-strip">
            <h3>Carrier priorities</h3>
            <p>On-time service · Rate quality · Reasonable deadhead · Driver communication · Smart truck positioning</p>
          </section>

          <section className="agreement-acknowledgment">
            <p>These are Metroline’s operating goals, not absolute rules. Use reasonable judgment when balancing carrier goals, driver preferences, appointment requirements, and available freight.</p>
            <p>By selecting <strong>Sign &amp; Submit</strong>, you agree to provide dispatch services for Metroline Transport according to the expectations above.</p>
          </section>

          <section className="agreement-signature-form electronic-signature">
            <div className="electronic-signature-copy"><span>ELECTRONIC SIGNATURE</span><p>No typed signature is required. Selecting Sign &amp; Submit records your acceptance as the authorized dispatcher.</p></div>
            <div className="agreement-signature-meta">
              <div><span>SIGNER</span><strong>Authorized Dispatcher</strong></div>
              <div><span>DATE</span><strong>{signedDate}</strong></div>
            </div>
          </section>
        </article>
      </div>
      <div className="agreement-action-bar"><button type="button" className="docos-primary-action" onClick={() => onAccept?.()}>SIGN &amp; SUBMIT</button></div>
    </div>
  )
}
export default DispatchAgreementScreen
