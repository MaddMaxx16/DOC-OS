import { useState } from 'react'
import { getLedgerSummary, getReceivables } from '../utils/ledger.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function money(value) { return `$${value.toFixed(2)}` }
function LedgerDeskScreen({ loads, carriers, ledgerWorkflowByLoadId, onBack, onOpenReceivable, tutorialTarget = null }) {
  const receivables = getReceivables(loads, carriers, ledgerWorkflowByLoadId)
  const summary = getLedgerSummary(receivables.map((item) => ({ ...item, dispatchRevenue: item.dispatchRevenue })))
  const [activeTab, setActiveTab] = useState(() => receivables.some((item) => ['READY_TO_INVOICE', 'DRAFT'].includes(item.financialStatus)) ? 'receivables' : receivables.some((item) => item.financialStatus === 'AWAITING_PAYMENT') ? 'sent' : 'paid')
  const tabs = [['receivables', 'RECEIVABLES', ['READY_TO_INVOICE', 'DRAFT']], ['sent', 'SENT FOR PAYMENT', ['AWAITING_PAYMENT']], ['paid', 'PAYMENT RECEIVED', ['PAID']]]
  const tutorialLoadId = tutorialTarget?.startsWith('ledger-card:') ? tutorialTarget.split(':')[1] : null
  const tutorialReceivable = receivables.find((item) => item.loadId === tutorialLoadId)
  const guidedTab = tutorialReceivable?.financialStatus === 'PAID' ? 'paid' : tutorialReceivable?.financialStatus === 'AWAITING_PAYMENT' ? 'sent' : tutorialReceivable ? 'receivables' : null
  const displayTab = guidedTab || activeTab
  const visible = receivables.filter((item) => tabs.find((tab) => tab[0] === displayTab)[2].includes(item.financialStatus))
  return <div className="phone-page ledger-screen"><header><button type="button" onClick={onBack}>‹</button><strong>LEDGERDESK</strong></header><p>Dispatch Financials</p><div className="ledger-summary">{[['REVENUE EARNED', summary.revenueEarned], ['AWAITING PAYMENT', summary.outstanding], ['COLLECTED', summary.collected]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</div><div className="ledger-tabs">{tabs.map(([id, label, statuses]) => <button type="button" key={id} className={`ledger-tab ${displayTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label} {receivables.filter((item) => statuses.includes(item.financialStatus)).length}</button>)}</div><h3>{tabs.find((tab) => tab[0] === displayTab)[1]}</h3>{visible.length ? <div className="ledger-list">{visible.map((item) => <button type="button" className={`ledger-card ${tutorialTarget === `ledger-card:${item.loadId}` ? 'tutorial-target' : ''}`} key={item.loadId} onClick={() => onOpenReceivable(item)}><div className="document-card-header"><strong>{item.loadId}</strong><span className="document-card-status">{item.financialStatus.replaceAll('_', ' ')}</span></div><span>{item.carrierName}</span>{item.invoiceNumber && <span>Invoice: {item.invoiceNumber}</span>}<span>Dispatch Fee {money(item.dispatchRevenue)}</span>{item.financialStatus === 'AWAITING_PAYMENT' && <span>Expected Payment {Number.isFinite(item.paymentAvailableGameMinute) ? `${formatCompactDate(Math.floor(item.paymentAvailableGameMinute / 1440))} • ${formatTime(item.paymentAvailableGameMinute % 1440)}` : '—'}</span>}{item.financialStatus === 'PAID' && <span>Payment Received {Number.isFinite(item.paymentReceivedGameMinute) ? `${formatCompactDate(Math.floor(item.paymentReceivedGameMinute / 1440))} • ${formatTime(item.paymentReceivedGameMinute % 1440)}` : '—'}</span>}</button>)}</div> : <div className="ledger-empty">No items in this section.</div>}</div>
}
export default LedgerDeskScreen
