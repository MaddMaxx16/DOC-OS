import { useState } from 'react'
import { getLedgerSummary, getReceivables } from '../utils/ledger.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getLedgerAccountSummary, normalizeLedgerBanking } from '../utils/ledgerBanking.js'

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

function stamp(value) {
  return Number.isFinite(value)
    ? `${formatCompactDate(Math.floor(value / 1440))} · ${formatTime(value % 1440)}`
    : '—'
}

function statusLabel(status) {
  if (status === 'READY_TO_INVOICE') return 'READY TO INVOICE'
  if (status === 'DRAFT') return 'DRAFT INVOICE'
  if (status === 'AWAITING_PAYMENT') return 'AWAITING PAYMENT'
  if (status === 'PAID') return 'PAID'
  return String(status || '').replaceAll('_', ' ')
}

function tabSectionLabel(tab) {
  if (tab === 'sent') return 'Awaiting payment'
  if (tab === 'paid') return 'Payment history'
  return 'Ready for action'
}

function LedgerDeskScreen({ loads, carriers, ledgerWorkflowByLoadId, ledgerBanking, onBack, onOpenReceivable }) {
  const receivables = getReceivables(loads, carriers, ledgerWorkflowByLoadId)
  const summary = getLedgerSummary(receivables.map((item) => ({ ...item, dispatchRevenue: item.dispatchRevenue })))
  const account = getLedgerAccountSummary(ledgerBanking)
  const banking = normalizeLedgerBanking(ledgerBanking)
  const [section, setSection] = useState('account')
  const [activeTab, setActiveTab] = useState(() => (
    receivables.some((item) => ['READY_TO_INVOICE', 'DRAFT'].includes(item.financialStatus))
      ? 'receivables'
      : receivables.some((item) => item.financialStatus === 'AWAITING_PAYMENT')
        ? 'sent'
        : 'paid'
  ))

  const tabs = [
    ['receivables', 'Receivables', ['READY_TO_INVOICE', 'DRAFT']],
    ['sent', 'Sent', ['AWAITING_PAYMENT']],
    ['paid', 'Paid', ['PAID']],
  ]

  const selectedTab = tabs.find((tab) => tab[0] === activeTab) || tabs[0]
  const visible = receivables.filter((item) => selectedTab[2].includes(item.financialStatus))
  const transactions = [...banking.transactions].sort((a, b) => Number(b.postedGameMinute || 0) - Number(a.postedGameMinute || 0))
  const depositCount = banking.transactions.filter((transaction) => transaction.type === 'invoice-payment' && transaction.direction === 'credit').length
  const receivableByLoadId = new Map(receivables.map((item) => [item.loadId, item]))

  return (
    <div className="phone-page ledger-screen ledger-v2 ledger-bank-ui">
      <header className="ledger-toolbar">
        <button type="button" className="ledger-back" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div>
          <span className="ledger-toolbar-kicker">Financial Center</span>
          <strong>LedgerDesk</strong>
        </div>
      </header>

      <div className="ledger-primary-tabs" role="tablist" aria-label="LedgerDesk sections">
        <button type="button" role="tab" aria-selected={section === 'account'} className={section === 'account' ? 'active' : ''} onClick={() => setSection('account')}>Account</button>
        <button type="button" role="tab" aria-selected={section === 'receivables'} className={section === 'receivables' ? 'active' : ''} onClick={() => setSection('receivables')}>Receivables</button>
      </div>

      {section === 'account' ? (
        <>
          <section className="ledger-bank-hero" aria-label="DOC OS Operating Account">
            <span className="ledger-kicker">DOC OS Operating Account</span>
            <small>Available balance</small>
            <strong>{money(account.availableBalance)}</strong>
            <div className="ledger-account-meta">
              <span>Business checking</span>
              <span>•••• 2500</span>
            </div>
          </section>

          <section className="ledger-account-glance" aria-label="Account overview">
            <div><span>Opening capital</span><strong>{money(account.openingBalance)}</strong></div>
            <div><span>Deposits posted</span><strong>{depositCount}</strong></div>
          </section>

          <section className="ledger-activity">
            <div className="ledger-activity-heading">
              <div><span className="ledger-kicker">Account activity</span><h2>Transactions</h2></div>
              <small>{transactions.length ? `${transactions.length} posted` : 'No activity yet'}</small>
            </div>
            <div className="ledger-transaction-list">
              {transactions.map((transaction) => {
                const linkedReceivable = transaction.loadId ? receivableByLoadId.get(transaction.loadId) : null
                const TransactionRow = linkedReceivable ? 'button' : 'div'
                return (
                  <TransactionRow
                    type={linkedReceivable ? 'button' : undefined}
                    className={`ledger-transaction ${linkedReceivable ? 'linked' : ''}`}
                    key={transaction.id}
                    onClick={linkedReceivable ? () => onOpenReceivable(linkedReceivable) : undefined}
                    aria-label={linkedReceivable ? `Open ${transaction.invoiceNumber || transaction.reference || 'invoice'} payment record` : undefined}
                  >
                    <div className={`ledger-transaction-icon ${transaction.direction}`}>{transaction.direction === 'debit' ? '−' : '+'}</div>
                    <div className="ledger-transaction-copy">
                      <strong>{transaction.description || 'Account transaction'}</strong>
                      <span>{transaction.reference || 'LedgerDesk'}{Number.isFinite(transaction.postedGameMinute) ? ` · ${stamp(transaction.postedGameMinute)}` : ''}{linkedReceivable ? ' · VIEW INVOICE' : ''}</span>
                    </div>
                    <strong className={`ledger-transaction-amount ${transaction.direction}`}>{transaction.direction === 'debit' ? '−' : '+'}{money(transaction.amount)}</strong>
                  </TransactionRow>
                )
              })}
              <div className="ledger-transaction opening">
                <div className="ledger-transaction-icon credit">+</div>
                <div className="ledger-transaction-copy"><strong>Opening capital</strong><span>DOC OS Operating Account</span></div>
                <strong className="ledger-transaction-amount credit">+{money(account.openingBalance)}</strong>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="ledger-heading ledger-receivables-heading">
            <span className="ledger-kicker">Accounts receivable</span>
            <h2>Revenue &amp; Payments</h2>
            <p>Track earned dispatch fees from invoice creation through collection.</p>
          </section>

          <section className="ledger-summary-v2" aria-label="Financial summary">
            <div className="ledger-summary-card"><span>Revenue earned</span><strong>{money(summary.revenueEarned)}</strong></div>
            <div className="ledger-summary-card"><span>Outstanding</span><strong>{money(summary.outstanding)}</strong></div>
            <div className="ledger-summary-card collected"><span>Collected</span><strong>{money(summary.collected)}</strong></div>
          </section>

          <div className="ledger-tabs-v2" role="tablist" aria-label="Receivable status">
            {tabs.map(([id, label, statuses]) => {
              const count = receivables.filter((item) => statuses.includes(item.financialStatus)).length
              return <button type="button" role="tab" aria-selected={activeTab === id} key={id} className={`ledger-tab-v2 ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}><span>{label}</span><strong>{count}</strong></button>
            })}
          </div>

          <section className="ledger-list-v2" aria-label={selectedTab[1]}>
            <span className="ledger-section-label">{tabSectionLabel(activeTab)}</span>
            {visible.length ? visible.map((item) => {
              const statusClass = String(item.financialStatus || '').toLowerCase().replaceAll('_', '-')
              return (
                <button type="button" className={`ledger-receivable-card status-${statusClass}`} key={item.loadId} onClick={() => onOpenReceivable(item)}>
                  <div className="ledger-card-topline"><div><span className="ledger-card-eyebrow">Dispatch fee</span><strong className="ledger-card-id">{item.routeName || item.loadNumber || 'Route'}</strong></div><span className="ledger-card-status">{statusLabel(item.financialStatus)}</span></div>
                  <div className="ledger-card-carrier"><span>Carrier</span><strong>{item.carrierName}</strong></div>
                  <div className="ledger-card-financials"><div><span>Carrier gross</span><strong>{money(item.carrierGross)}</strong></div><div><span>Dispatch fee</span><strong>{money(item.dispatchRevenue)}</strong></div></div>
                  {item.invoiceNumber && <div className="ledger-card-detail-row"><span>Invoice</span><strong>{item.invoiceNumber}</strong></div>}
                  {item.financialStatus === 'AWAITING_PAYMENT' && <div className="ledger-card-detail-row"><span>Expected payment</span><strong>{stamp(item.paymentAvailableGameMinute)}</strong></div>}
                  {item.financialStatus === 'PAID' && <div className="ledger-card-detail-row paid"><span>Payment received</span><strong>{stamp(item.paymentReceivedGameMinute)}</strong></div>}
                  <div className="ledger-card-footer"><span>{item.financialStatus === 'READY_TO_INVOICE' ? 'Create and send an invoice' : item.financialStatus === 'DRAFT' ? 'Invoice ready to send' : item.financialStatus === 'AWAITING_PAYMENT' ? 'Carrier payment pending' : 'Payment collected'}</span><span className="ledger-card-open" aria-hidden="true">›</span></div>
                </button>
              )
            }) : <div className="ledger-empty-v2"><strong>No items here</strong><span>{activeTab === 'receivables' ? 'Approved PODs will create new receivables.' : activeTab === 'sent' ? 'Sent invoices will wait here until payment arrives.' : 'Collected payments will stay here for reference.'}</span></div>}
          </section>
        </>
      )}
    </div>
  )
}

export default LedgerDeskScreen
