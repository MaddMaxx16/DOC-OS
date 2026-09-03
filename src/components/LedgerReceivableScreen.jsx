import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function stamp(value) {
  return Number.isFinite(value)
    ? `${formatCompactDate(Math.floor(value / 1440))} · ${formatTime(value % 1440)}`
    : '—'
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

function statusLabel(status) {
  if (status === 'READY_TO_INVOICE') return 'READY TO INVOICE'
  if (status === 'DRAFT') return 'DRAFT INVOICE'
  if (status === 'AWAITING_PAYMENT') return 'AWAITING PAYMENT'
  if (status === 'PAID') return 'PAID'
  return String(status || '').replaceAll('_', ' ')
}

function LedgerReceivableScreen({ receivable, currentGameMinute = 0, onBack, onAction, tutorialTarget = null }) {
  if (!receivable) {
    return (
      <div className="phone-page ledger-screen ledger-v2 ledger-receivable-v2">
        <header className="ledger-toolbar">
          <button type="button" className="ledger-back" onClick={onBack} aria-label="Back to LedgerDesk">‹</button>
          <div><span className="ledger-toolbar-kicker">Billing</span><strong>Receivable unavailable</strong></div>
        </header>
      </div>
    )
  }

  const status = receivable.financialStatus
  const ready = status === 'AWAITING_PAYMENT' && Number.isFinite(receivable.paymentAvailableGameMinute) && currentGameMinute >= receivable.paymentAvailableGameMinute
  const statusClass = String(status || '').toLowerCase().replaceAll('_', '-')

  return (
    <div className="phone-page ledger-screen ledger-v2 ledger-receivable-v2">
      <header className="ledger-toolbar">
        <button type="button" className="ledger-back" onClick={onBack} aria-label="Back to LedgerDesk">‹</button>
        <div>
          <span className="ledger-toolbar-kicker">Billing</span>
          <strong>Receivable</strong>
        </div>
      </header>

      <section className="receivable-hero">
        <div>
          <span className="ledger-kicker">Load</span>
          <h2>{receivable.loadId}</h2>
          <p>{receivable.carrierName}</p>
        </div>
        <span className={`receivable-status-pill status-${statusClass}`}>{statusLabel(status)}</span>
      </section>

      <section className="receivable-summary-card" aria-label="Receivable calculation">
        <div className="receivable-summary-row">
          <span>Carrier gross</span>
          <strong>{money(receivable.carrierGross)}</strong>
        </div>
        <div className="receivable-summary-row">
          <span>Dispatch agreement</span>
          <strong>{receivable.agreementPercentage}%</strong>
        </div>
        <div className="receivable-summary-row total">
          <span>Dispatch fee</span>
          <strong>{money(receivable.dispatchRevenue)}</strong>
        </div>
      </section>

      <section className="invoice-workflow" aria-label="Invoice workflow">
        <div className="invoice-section-heading">
          <div>
            <span className="ledger-kicker">Invoice</span>
            <h3>{status === 'READY_TO_INVOICE' ? 'Create the invoice' : status === 'DRAFT' ? 'Review & send' : status === 'AWAITING_PAYMENT' ? 'Payment in progress' : 'Payment complete'}</h3>
          </div>
          {receivable.invoiceNumber && <span className="invoice-number-pill">{receivable.invoiceNumber}</span>}
        </div>

        {status === 'READY_TO_INVOICE' && (
          <div className="invoice-status-card action-needed">
            <span>Next action</span>
            <strong>Create an invoice for {money(receivable.dispatchRevenue)}</strong>
            <small>The approved POD cleared this load for billing.</small>
          </div>
        )}

        {status === 'DRAFT' && (
          <div className="invoice-detail-card">
            <div><span>Status</span><strong>Draft</strong></div>
            <div><span>Created</span><strong>{stamp(receivable.invoiceCreatedGameMinute)}</strong></div>
            <div><span>Amount due</span><strong>{money(receivable.dispatchRevenue)}</strong></div>
          </div>
        )}

        {status === 'AWAITING_PAYMENT' && (
          <>
            <div className="invoice-detail-card">
              <div><span>Sent</span><strong>{stamp(receivable.invoiceSentGameMinute)}</strong></div>
              <div><span>Expected payment</span><strong>{stamp(receivable.paymentAvailableGameMinute)}</strong></div>
              <div><span>Amount due</span><strong>{money(receivable.dispatchRevenue)}</strong></div>
            </div>
            <div className={`payment-status-card ${ready ? 'ready' : ''}`}>
              <div>
                <span>{ready ? 'Payment ready' : 'Awaiting carrier payment'}</span>
                <strong>{ready ? money(receivable.dispatchRevenue) : 'Invoice sent successfully'}</strong>
              </div>
              <span className="payment-status-indicator" aria-hidden="true">{ready ? '✓' : '···'}</span>
            </div>
          </>
        )}

        {status === 'PAID' && (
          <>
            <div className="invoice-detail-card paid">
              <div><span>Invoice</span><strong>{receivable.invoiceNumber || '—'}</strong></div>
              <div><span>Payment received</span><strong>{stamp(receivable.paymentReceivedGameMinute)}</strong></div>
              <div><span>Amount collected</span><strong>{money(receivable.dispatchRevenue)}</strong></div>
            </div>
            <div className="payment-status-card paid">
              <div>
                <span>Payment complete</span>
                <strong>{money(receivable.dispatchRevenue)} collected</strong>
              </div>
              <span className="payment-status-indicator" aria-hidden="true">✓</span>
            </div>
          </>
        )}

        {status === 'READY_TO_INVOICE' && (
          <button
            className={`ledger-primary-action ${tutorialTarget === 'create-invoice' ? 'tutorial-target' : ''}`}
            type="button"
            onClick={() => onAction('create')}
          >
            CREATE INVOICE
          </button>
        )}

        {status === 'DRAFT' && (
          <button
            className={`ledger-primary-action ${tutorialTarget === 'send-invoice' ? 'tutorial-target' : ''}`}
            type="button"
            onClick={() => onAction('send')}
          >
            SEND INVOICE
          </button>
        )}

        {status === 'AWAITING_PAYMENT' && (
          <p className="ledger-wait-note">Payment posts automatically when the carrier's terms are reached. Return to the map to continue time.</p>
        )}
      </section>
    </div>
  )
}

export default LedgerReceivableScreen
