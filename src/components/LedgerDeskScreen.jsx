import { useState } from 'react'
import { getLedgerSummary, getReceivables } from '../utils/ledger.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

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

function LedgerDeskScreen({ loads, carriers, ledgerWorkflowByLoadId, onBack, onOpenReceivable, tutorialTarget = null }) {
  const receivables = getReceivables(loads, carriers, ledgerWorkflowByLoadId)
  const summary = getLedgerSummary(receivables.map((item) => ({ ...item, dispatchRevenue: item.dispatchRevenue })))
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

  const tutorialLoadId = tutorialTarget?.startsWith('ledger-card:') ? tutorialTarget.split(':')[1] : null
  const tutorialReceivable = receivables.find((item) => item.loadId === tutorialLoadId)
  const guidedTab = tutorialReceivable?.financialStatus === 'PAID'
    ? 'paid'
    : tutorialReceivable?.financialStatus === 'AWAITING_PAYMENT'
      ? 'sent'
      : tutorialReceivable
        ? 'receivables'
        : null
  const displayTab = guidedTab || activeTab
  const selectedTab = tabs.find((tab) => tab[0] === displayTab) || tabs[0]
  const visible = receivables.filter((item) => selectedTab[2].includes(item.financialStatus))

  return (
    <div className="phone-page ledger-screen ledger-v2">
      <header className="ledger-toolbar">
        <button type="button" className="ledger-back" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div>
          <span className="ledger-toolbar-kicker">Financial Center</span>
          <strong>LedgerDesk</strong>
        </div>
      </header>

      <section className="ledger-heading">
        <span className="ledger-kicker">Dispatch financials</span>
        <h2>Revenue &amp; Payments</h2>
        <p>Track earned dispatch fees from invoice creation through collection.</p>
      </section>

      <section className="ledger-summary-v2" aria-label="Financial summary">
        <div className="ledger-summary-card">
          <span>Revenue earned</span>
          <strong>{money(summary.revenueEarned)}</strong>
        </div>
        <div className="ledger-summary-card">
          <span>Outstanding</span>
          <strong>{money(summary.outstanding)}</strong>
        </div>
        <div className="ledger-summary-card collected">
          <span>Collected</span>
          <strong>{money(summary.collected)}</strong>
        </div>
      </section>

      <div className="ledger-tabs-v2" role="tablist" aria-label="Receivable status">
        {tabs.map(([id, label, statuses]) => {
          const count = receivables.filter((item) => statuses.includes(item.financialStatus)).length
          return (
            <button
              type="button"
              role="tab"
              aria-selected={displayTab === id}
              key={id}
              className={`ledger-tab-v2 ${displayTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          )
        })}
      </div>

      <section className="ledger-list-v2" aria-label={selectedTab[1]}>
        <span className="ledger-section-label">{tabSectionLabel(displayTab)}</span>
        {visible.length ? visible.map((item) => {
          const isTutorialTarget = tutorialTarget === `ledger-card:${item.loadId}`
          const statusClass = String(item.financialStatus || '').toLowerCase().replaceAll('_', '-')
          return (
            <button
              type="button"
              className={`ledger-receivable-card status-${statusClass} ${isTutorialTarget ? 'tutorial-target' : ''}`}
              key={item.loadId}
              onClick={() => onOpenReceivable(item)}
            >
              <div className="ledger-card-topline">
                <div>
                  <span className="ledger-card-eyebrow">Dispatch fee</span>
                  <strong className="ledger-card-id">{item.loadId}</strong>
                </div>
                <span className="ledger-card-status">{statusLabel(item.financialStatus)}</span>
              </div>

              <div className="ledger-card-carrier">
                <span>Carrier</span>
                <strong>{item.carrierName}</strong>
              </div>

              <div className="ledger-card-financials">
                <div>
                  <span>Carrier gross</span>
                  <strong>{money(item.carrierGross)}</strong>
                </div>
                <div>
                  <span>Dispatch fee</span>
                  <strong>{money(item.dispatchRevenue)}</strong>
                </div>
              </div>

              {item.invoiceNumber && (
                <div className="ledger-card-detail-row">
                  <span>Invoice</span>
                  <strong>{item.invoiceNumber}</strong>
                </div>
              )}
              {item.financialStatus === 'AWAITING_PAYMENT' && (
                <div className="ledger-card-detail-row">
                  <span>Expected payment</span>
                  <strong>{stamp(item.paymentAvailableGameMinute)}</strong>
                </div>
              )}
              {item.financialStatus === 'PAID' && (
                <div className="ledger-card-detail-row paid">
                  <span>Payment received</span>
                  <strong>{stamp(item.paymentReceivedGameMinute)}</strong>
                </div>
              )}

              <div className="ledger-card-footer">
                <span>{item.financialStatus === 'READY_TO_INVOICE' ? 'Create and send an invoice' : item.financialStatus === 'DRAFT' ? 'Invoice ready to send' : item.financialStatus === 'AWAITING_PAYMENT' ? 'Carrier payment pending' : 'Payment collected'}</span>
                <span className="ledger-card-open" aria-hidden="true">›</span>
              </div>
            </button>
          )
        }) : (
          <div className="ledger-empty-v2">
            <strong>No items here</strong>
            <span>{displayTab === 'receivables' ? 'Approved PODs will create new receivables.' : displayTab === 'sent' ? 'Sent invoices will wait here until payment arrives.' : 'Collected payments will stay here for reference.'}</span>
          </div>
        )}
      </section>
    </div>
  )
}

export default LedgerDeskScreen
