import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function formatGameTimestamp(minutes) {
  if (!Number.isFinite(Number(minutes))) return 'Not issued'
  const rounded = Math.max(0, Math.floor(Number(minutes)))
  return `${formatCompactDate(Math.floor(rounded / 1440))} · ${formatTime(rounded % 1440)}`
}

function money(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '$0.00'
  return `$${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// B.5.4C.6.1 — Invoice & Billing Workspace
function InvoiceWorkspace({
  load,
  carrier,
  dispatcherProfile,
  workflow = {},
  receivable = null,
  onBack,
  onCreateInvoice,
  onSendInvoice,
}) {
  const [frontDocument, setFrontDocument] = useState('invoice')

  const pod = load?.pod || null
  const pickup = load
    ? mapLocations.find((location) => location.id === load.pickupLocationId)
    : null
  const delivery = load
    ? mapLocations.find((location) => location.id === load.deliveryLocationId)
    : null

  const grossRate = Number(
    receivable?.carrierGross ??
    receivable?.grossRate ??
    load?.rateConfirmation?.rate ??
    load?.rate ??
    0
  )

  const feePercent = Number(
    receivable?.dispatchPercentage ??
    receivable?.feePercentage ??
    carrier?.dispatchAgreement?.percentage ??
    8
  )

  const calculatedFee =
    Number.isFinite(grossRate) && Number.isFinite(feePercent)
      ? grossRate * (feePercent / 100)
      : 0

  const amountDue = Number(
    receivable?.amountDue ??
    receivable?.dispatchFee ??
    receivable?.amount ??
    calculatedFee
  )

  const status = workflow?.financialStatus || receivable?.financialStatus || 'READY'
  const invoiceNumber = workflow?.invoiceNumber || receivable?.invoiceNumber || null
  const createdMinute =
    workflow?.invoiceCreatedGameMinute ??
    receivable?.invoiceCreatedGameMinute
  const sentMinute =
    workflow?.invoiceSentGameMinute ??
    receivable?.invoiceSentGameMinute
  const paidMinute =
    workflow?.paymentReceivedGameMinute ??
    receivable?.paymentReceivedGameMinute

  const isDraft = status === 'DRAFT'
  const isSent = status === 'AWAITING_PAYMENT'
  const isPaid = status === 'PAID'
  const needsDocs = status === 'DOCUMENTATION_REQUIRED'
  const invoiceExists = Boolean(invoiceNumber)

  const businessName =
    dispatcherProfile?.businessName ||
    dispatcherProfile?.displayName ||
    'DOC OS Dispatch'

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (typeof document === 'undefined') return null

  if (!load) {
    return createPortal(
      <div className="invoice-workspace-overlay">
        <section className="invoice-workspace-screen">
          <header className="invoice-workspace-toolbar">
            <button type="button" onClick={onBack}>‹</button>
            <div>
              <span>LEDGERDESK · BILLING FILE</span>
              <strong>Invoice unavailable</strong>
            </div>
          </header>
        </section>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div
      className="invoice-workspace-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${getFreightRouteName(load)} invoice workspace`}
    >
      <section className="invoice-workspace-screen">
        <header className="invoice-workspace-toolbar">
          <button type="button" onClick={onBack} aria-label="Close invoice workspace">‹</button>
          <div>
            <span>LEDGERDESK · BILLING FILE</span>
            <strong>{getFreightRouteName(load)}</strong>
          </div>
          <small>
            {isPaid ? 'PAID' : isSent ? 'AWAITING PAYMENT' : isDraft ? 'DRAFT INVOICE' : 'BILLING REVIEW'}
          </small>
        </header>

        <main className="invoice-desk">
          <div className="invoice-folder" aria-hidden="true">
            <span>LOAD BILLING FILE</span>
            <strong>{load.loadNumber || load.id}</strong>
            <small>Invoice + supporting POD</small>
          </div>

          <section className={`invoice-paper-layer invoice-pod-layer ${frontDocument === 'pod' ? 'front' : 'rear'}`}>
            <article className="invoice-paper invoice-supporting-pod">
              <header>
                <span>SUPPORTING DOCUMENT</span>
                <h2>Proof of Delivery</h2>
                <p>{load.loadNumber || load.id}</p>
              </header>

              <div className="invoice-pod-route">
                <div><span>DELIVERY</span><strong>{delivery?.name || 'Receiver'}</strong></div>
                <div><span>RECEIVED</span><strong>{formatGameTimestamp(pod?.receivedGameMinute)}</strong></div>
              </div>

              <div className="invoice-pod-grid">
                <div><span>PIECES</span><strong>{pod ? `${pod.piecesReceived ?? '—'} / ${pod.piecesExpected ?? '—'}` : 'Unavailable'}</strong></div>
                <div><span>DAMAGE</span><strong>{pod?.damage || 'None'}</strong></div>
              </div>

              <div className="invoice-pod-signature">
                <span>RECEIVER SIGNATURE</span>
                <strong>{pod?.signedBy || 'Not provided'}</strong>
              </div>

              <div className="invoice-pod-status">
                <span>{pod?.approved ? 'APPROVED POD' : 'POD STATUS'}</span>
                <strong>{pod?.approved ? formatGameTimestamp(pod.approvedGameMinute) : 'Approval required before billing'}</strong>
              </div>

              {pod?.correctionStatus === 'CORRECTED' && <div className="invoice-doc-stamp corrected">CORRECTED COPY</div>}
              {pod?.approved && <div className="invoice-doc-stamp approved">APPROVED</div>}
            </article>

            {frontDocument !== 'pod' && (
              <button type="button" className="invoice-paper-hitbox" onClick={() => setFrontDocument('pod')} aria-label="Bring approved POD forward" />
            )}
          </section>

          <section className={`invoice-paper-layer invoice-main-layer ${frontDocument === 'invoice' ? 'front' : 'rear'}`}>
            <article className="invoice-paper invoice-main-paper">
              <header className="invoice-masthead">
                <div>
                  <span>DISPATCH SERVICES INVOICE</span>
                  <h2>{invoiceNumber || 'DRAFT INVOICE'}</h2>
                  <p>{businessName}</p>
                </div>
                <div className="invoice-status-block">
                  <span>STATUS</span>
                  <strong>{isPaid ? 'PAID' : isSent ? 'SENT' : isDraft ? 'DRAFT' : 'NOT CREATED'}</strong>
                </div>
              </header>

              <section className="invoice-parties">
                <div><span>FROM</span><strong>{businessName}</strong><small>Independent Dispatch</small></div>
                <div><span>BILL TO</span><strong>{carrier?.name || 'Carrier'}</strong><small>Carrier account</small></div>
              </section>

              <section className="invoice-reference">
                <div><span>LOAD</span><strong>{load.loadNumber || load.id}</strong></div>
                <div><span>ROUTE</span><strong>{pickup?.name || 'Pickup'} → {delivery?.name || 'Delivery'}</strong></div>
              </section>

              <section className="invoice-line-items">
                <header><span>DESCRIPTION</span><span>BASE</span><span>RATE</span><span>AMOUNT</span></header>
                <div>
                  <strong>Dispatch services</strong>
                  <span>{money(grossRate)}</span>
                  <span>{Number.isFinite(feePercent) ? `${feePercent}%` : '—'}</span>
                  <b>{money(amountDue)}</b>
                </div>
              </section>

              <section className="invoice-total">
                <div><span>CARRIER GROSS</span><strong>{money(grossRate)}</strong></div>
                <div><span>DISPATCH FEE</span><strong>{Number.isFinite(feePercent) ? `${feePercent}%` : '—'}</strong></div>
                <div className="due"><span>AMOUNT DUE</span><strong>{money(amountDue)}</strong></div>
              </section>

              <section className="invoice-document-meta">
                <div><span>CREATED</span><strong>{formatGameTimestamp(createdMinute)}</strong></div>
                <div><span>SENT</span><strong>{formatGameTimestamp(sentMinute)}</strong></div>
              </section>

              <section className="invoice-support-note">
                <span>SUPPORTING DOCUMENTATION</span>
                <p>Approved Proof of Delivery is filed with this invoice and travels with the billing submission.</p>
              </section>

              {isSent && <div className="invoice-doc-stamp sent">SENT</div>}
              {isPaid && <div className="invoice-doc-stamp paid">PAID</div>}

              <footer className="invoice-paper-footer">
                <span>{invoiceExists ? `${invoiceNumber} · ${load.loadNumber || load.id}` : `Billing file · ${load.loadNumber || load.id}`}</span>
                <small>{isPaid ? `Payment received ${formatGameTimestamp(paidMinute)}` : 'DOC OS · LedgerDesk'}</small>
              </footer>
            </article>

            {frontDocument !== 'invoice' && (
              <button type="button" className="invoice-paper-hitbox" onClick={() => setFrontDocument('invoice')} aria-label="Bring invoice forward" />
            )}
          </section>
        </main>

        <footer className="invoice-workspace-actions">
          <div className="invoice-action-copy">
            {isPaid ? (
              <><span>BILLING COMPLETE</span><strong>{money(amountDue)} received and filed.</strong></>
            ) : isSent ? (
              <><span>INVOICE SUBMITTED</span><strong>Waiting for carrier payment.</strong></>
            ) : needsDocs ? (
              <><span>DOCUMENTATION REQUIRED</span><strong>Review the invoice and approved POD before resubmitting.</strong></>
            ) : isDraft ? (
              <><span>INVOICE READY</span><strong>Review the invoice against the approved POD before sending.</strong></>
            ) : (
              <><span>BILLING READY</span><strong>Create the invoice from this completed load.</strong></>
            )}
          </div>

          {!invoiceExists ? (
            <button type="button" className="invoice-primary-action" disabled={!pod?.approved} onClick={onCreateInvoice}>
              CREATE INVOICE
            </button>
          ) : !isSent && !isPaid ? (
            <button type="button" className="invoice-primary-action" disabled={!pod?.approved} onClick={onSendInvoice}>
              SEND INVOICE
            </button>
          ) : null}
        </footer>
      </section>
    </div>,
    document.body,
  )
}

export default InvoiceWorkspace
