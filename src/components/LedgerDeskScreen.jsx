import { getLedgerSummary, getReceivables } from '../utils/ledger.js'

function money(value) { return `$${value.toFixed(2)}` }
function LedgerDeskScreen({ loads, carriers, onBack }) {
  const receivables = getReceivables(loads, carriers)
  const summary = getLedgerSummary(receivables)
  return <div className="phone-page ledger-screen"><header><button type="button" onClick={onBack}>‹</button><strong>LEDGERDESK</strong></header><p>Dispatch Financials</p><div className="ledger-summary">{[['REVENUE EARNED', summary.revenueEarned], ['AWAITING PAYMENT', summary.outstanding], ['COLLECTED', summary.collected]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</div><h3>ACCOUNTS RECEIVABLE</h3>{receivables.length ? <div className="ledger-list">{receivables.map((item) => <article className="ledger-card" key={item.loadId}><div className="document-card-header"><strong>{item.loadId}</strong><span className="document-card-status">AWAITING PAYMENT</span></div><span>{item.carrierName}</span><span>Carrier Gross {money(item.carrierGross)}</span><span>Dispatch Agreement {item.agreementPercentage}%</span><strong className="ledger-fee">Dispatch Fee {money(item.dispatchRevenue)}</strong></article>)}</div> : <div className="ledger-empty">No receivables yet.<br/><small>Completed loads will appear here after approved delivery paperwork is processed.</small></div>}</div>
}
export default LedgerDeskScreen
