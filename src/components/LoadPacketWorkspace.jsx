import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function money(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `$${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function miles(value) {
  const number = Number(value)
  return Number.isFinite(number) ? `${number.toFixed(1)} mi` : '—'
}

function gameStamp(minutes) {
  if (!Number.isFinite(Number(minutes))) return 'Not recorded'
  const rounded = Math.max(0, Math.floor(Number(minutes)))
  return `${formatCompactDate(Math.floor(rounded / 1440))} · ${formatTime(rounded % 1440)}`
}

function PaperTab({ label, active, onClick, index }) {
  return (
    <button
      type="button"
      className={`packet-paper-tab ${active ? 'active' : ''}`}
      style={{ '--packet-tab-index': index }}
      onClick={onClick}
      aria-label={`Bring ${label} forward`}
    >
      {label}
    </button>
  )
}

// B.5.4C.7.1 — Physical Load Packet Workspace
function LoadPacketWorkspace({
  attachment,
  loads = [],
  carriers = [],
  workflows = {},
  dispatcherProfile = null,
  onClose,
}) {
  const load = attachment?.loadId
    ? loads.find((item) => item.id === attachment.loadId)
    : null

  const workflow = load ? workflows[load.id] || {} : {}
  const rc = load?.rateConfirmation || null
  const pod = load?.pod || null

  const pickup = load
    ? mapLocations.find((item) => item.id === load.pickupLocationId)
    : null

  const delivery = load
    ? mapLocations.find((item) => item.id === load.deliveryLocationId)
    : null

  const carrier =
    carriers.find((item) => item.id === load?.carrierId) ||
    carriers[0] ||
    null

  const damaged = Number(pod?.freightCondition?.damagedAtPickup || 0)
  const missing = Number(pod?.freightCondition?.missingAtPickup || 0)
  const hasException = damaged > 0 || missing > 0

  const grossRate = Number(rc?.rate ?? load?.rate ?? 0)
  const feePercent = Number(carrier?.dispatchAgreement?.percentage ?? 8)
  const amountDue =
    Number.isFinite(grossRate) && Number.isFinite(feePercent)
      ? grossRate * (feePercent / 100)
      : 0

  const financialStatus = workflow?.financialStatus || 'DRAFT'
  const isPaid = financialStatus === 'PAID'
  const isSent =
    financialStatus === 'AWAITING_PAYMENT' ||
    workflow?.submissionStatus === 'SUBMITTED'

  const businessName =
    dispatcherProfile?.businessName ||
    dispatcherProfile?.displayName ||
    'DOC OS Dispatch'

  const packetDocuments = useMemo(() => {
    const docs = [{ id: 'offer', label: 'OFFER' }]
    if (rc) docs.push({ id: 'ratecon', label: 'RC' })
    if (hasException) docs.push({ id: 'exception', label: 'EXC' })
    if (pod) docs.push({ id: 'pod', label: 'POD' })
    if (workflow?.invoiceNumber) docs.push({ id: 'invoice', label: 'INV' })
    return docs
  }, [rc, hasException, pod, workflow?.invoiceNumber])

  const defaultFront =
    workflow?.invoiceNumber
      ? 'invoice'
      : pod
        ? 'pod'
        : rc
          ? 'ratecon'
          : 'offer'

  const [frontDocument, setFrontDocument] = useState(defaultFront)

  useEffect(() => {
    if (!packetDocuments.some((item) => item.id === frontDocument)) {
      setFrontDocument(packetDocuments[packetDocuments.length - 1]?.id || 'offer')
    }
  }, [packetDocuments, frontDocument])

  useEffect(() => {
    const prior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prior
    }
  }, [])

  if (typeof document === 'undefined') return null

  if (!load) {
    return createPortal(
      <div className="load-packet-overlay">
        <section className="load-packet-screen">
          <header className="load-packet-toolbar">
            <button type="button" onClick={onClose}>‹</button>
            <div>
              <span>DOC OS · LOAD FILE</span>
              <strong>Packet unavailable</strong>
            </div>
          </header>
        </section>
      </div>,
      document.body,
    )
  }

  const renderPaper = (documentId) => {
    if (documentId === 'offer') {
      return (
        <article className="packet-paper packet-offer-paper">
          <header className="packet-paper-header">
            <span>FREIGHTLINK · LOAD OFFER</span>
            <h2>{load.loadNumber || load.id}</h2>
            <p>Original posted freight record</p>
          </header>

          <section className="packet-route-block">
            <div><span>PICKUP</span><strong>{pickup?.name || 'Pickup'}</strong></div>
            <b>→</b>
            <div><span>DELIVERY</span><strong>{delivery?.name || 'Delivery'}</strong></div>
          </section>

          <section className="packet-data-grid">
            <div><span>OFFER RATE</span><strong>{money(load.rate)}</strong></div>
            <div><span>LISTED MILES</span><strong>{miles(load.listedMiles)}</strong></div>
            <div><span>EQUIPMENT</span><strong>{load.equipment || load.equipmentType || "53' Dry Van"}</strong></div>
            <div><span>STATUS</span><strong>{load.status || load.tripStatus || 'BOOKED'}</strong></div>
          </section>

          <section className="packet-note">
            <span>ORIGINAL RECORD</span>
            <p>This is the FreightLink offer used to evaluate and book the load.</p>
          </section>
        </article>
      )
    }

    if (documentId === 'ratecon') {
      return (
        <article className="packet-paper packet-ratecon-paper">
          <header className="packet-paper-header">
            <span>{carrier?.name || 'CARRIER'} · RATE CONFIRMATION</span>
            <h2>{rc?.reference || `RC-${load.id}`}</h2>
            <p>{getFreightRouteName(load)} · Version {rc?.version || 1}</p>
          </header>

          <section className="packet-route-block">
            <div><span>PICKUP</span><strong>{pickup?.name || 'Pickup'}</strong></div>
            <b>→</b>
            <div><span>DELIVERY</span><strong>{delivery?.name || 'Delivery'}</strong></div>
          </section>

          <section className="packet-data-grid">
            <div><span>AGREED RATE</span><strong>{money(rc?.rate)}</strong></div>
            <div><span>LISTED MILES</span><strong>{miles(rc?.listedMiles)}</strong></div>
            <div><span>VERSION</span><strong>{rc?.version || 1}</strong></div>
            <div><span>STATUS</span><strong>{rc?.status || 'RECEIVED'}</strong></div>
          </section>

          <section className="packet-note">
            <span>DOCUMENT CONTROL</span>
            <p>Carrier-issued Rate Confirmation retained with the booked load record.</p>
          </section>

          {rc?.status === 'CONFIRMED' && (
            <div className="packet-stamp confirmed">CONFIRMED</div>
          )}
        </article>
      )
    }

    if (documentId === 'exception') {
      return (
        <article className="packet-paper packet-exception-paper">
          <header className="packet-paper-header">
            <span>FREIGHT EXCEPTION RECORD</span>
            <h2>{load.loadNumber || load.id}</h2>
            <p>Shipment condition documentation</p>
          </header>

          <section className="packet-exception-counts">
            <div><span>DAMAGED</span><strong>{damaged}</strong></div>
            <div><span>MISSING</span><strong>{missing}</strong></div>
          </section>

          <section className="packet-note">
            <span>EXCEPTION FILE</span>
            <p>
              This sheet remains in the permanent packet because damaged or missing
              freight was recorded during the shipment lifecycle.
            </p>
          </section>
        </article>
      )
    }

    if (documentId === 'pod') {
      return (
        <article className="packet-paper packet-pod-paper">
          <header className="packet-paper-header">
            <span>PROOF OF DELIVERY</span>
            <h2>{load.loadNumber || load.id}</h2>
            <p>{delivery?.name || 'Receiver'} · Version {pod?.version || 1}</p>
          </header>

          <section className="packet-data-grid">
            <div><span>RECEIVER</span><strong>{delivery?.name || 'Receiver'}</strong></div>
            <div><span>DELIVERED</span><strong>{gameStamp(pod?.receivedGameMinute)}</strong></div>
            <div><span>PIECES</span><strong>{pod?.piecesReceived ?? '—'} / {pod?.piecesExpected ?? '—'}</strong></div>
            <div><span>DAMAGE</span><strong>{pod?.damage || 'None'}</strong></div>
          </section>

          <section className="packet-signature">
            <span>RECEIVER SIGNATURE</span>
            <strong>{pod?.signedBy || 'Not provided'}</strong>
            <small>Electronically captured at delivery</small>
          </section>

          <section className="packet-note">
            <span>APPROVAL</span>
            <p>{pod?.approved ? `Approved ${gameStamp(pod.approvedGameMinute)}` : 'Approval not recorded'}</p>
          </section>

          {pod?.correctionStatus === 'CORRECTED' && (
            <div className="packet-stamp corrected">CORRECTED</div>
          )}

          {pod?.approved && (
            <div className="packet-stamp approved">APPROVED</div>
          )}
        </article>
      )
    }

    return (
      <article className="packet-paper packet-invoice-paper">
        <header className="packet-invoice-header">
          <div>
            <span>DISPATCH SERVICES INVOICE</span>
            <h2>{workflow?.invoiceNumber || 'INVOICE'}</h2>
            <p>{businessName}</p>
          </div>
          <div>
            <span>STATUS</span>
            <strong>{isPaid ? 'PAID' : isSent ? 'SENT' : financialStatus}</strong>
          </div>
        </header>

        <section className="packet-parties">
          <div><span>FROM</span><strong>{businessName}</strong></div>
          <div><span>BILL TO</span><strong>{carrier?.name || 'Carrier'}</strong></div>
        </section>

        <section className="packet-invoice-line">
          <header><span>DESCRIPTION</span><span>BASE</span><span>RATE</span><span>AMOUNT</span></header>
          <div>
            <strong>Dispatch services</strong>
            <span>{money(grossRate)}</span>
            <span>{feePercent}%</span>
            <b>{money(amountDue)}</b>
          </div>
        </section>

        <section className="packet-invoice-total">
          <span>AMOUNT DUE</span>
          <strong>{money(amountDue)}</strong>
        </section>

        <section className="packet-data-grid compact">
          <div><span>CREATED</span><strong>{gameStamp(workflow?.invoiceCreatedGameMinute)}</strong></div>
          <div><span>SENT</span><strong>{gameStamp(workflow?.invoiceSentGameMinute)}</strong></div>
        </section>

        <section className="packet-note">
          <span>SUPPORTING FILE</span>
          <p>Approved POD and governing Rate Confirmation are retained with this invoice.</p>
        </section>

        {isSent && !isPaid && <div className="packet-stamp sent">SENT</div>}
        {isPaid && <div className="packet-stamp paid">PAID</div>}
      </article>
    )
  }

  return createPortal(
    <div className="load-packet-overlay" role="dialog" aria-modal="true" aria-label={`${getFreightRouteName(load)} load packet`}>
      <section className="load-packet-screen">
        <header className="load-packet-toolbar">
          <button type="button" onClick={onClose} aria-label="Close load packet">‹</button>

          <div>
            <span>DOC OS · PERMANENT LOAD FILE</span>
            <strong>{getFreightRouteName(load)}</strong>
          </div>

          <small>{isPaid ? 'CLOSED · PAID' : isSent ? 'OPEN · PAYMENT PENDING' : 'OPEN PACKET'}</small>
        </header>

        <main className="load-packet-desk">
          <div className="load-packet-folder" aria-hidden="true">
            <span>LOAD PACKET</span>
            <strong>{load.loadNumber || load.id}</strong>
            <small>
              {packetDocuments.length} document{packetDocuments.length === 1 ? '' : 's'}
              {' · '}
              {isPaid ? 'financially closed' : 'active business record'}
            </small>
          </div>

          {packetDocuments.map((documentItem, index) => {
            const active = frontDocument === documentItem.id

            return (
              <section
                key={documentItem.id}
                className={`packet-paper-layer packet-${documentItem.id}-layer ${active ? 'front' : 'rear'}`}
                style={{
                  '--packet-order': index,
                  '--packet-count': packetDocuments.length,
                }}
              >
                {renderPaper(documentItem.id)}

                <PaperTab
                  label={documentItem.label}
                  active={active}
                  index={index}
                  onClick={() => setFrontDocument(documentItem.id)}
                />
              </section>
            )
          })}
        </main>

        <footer className="load-packet-footer">
          <div>
            <span>PACKET INDEX</span>
            <strong>{packetDocuments.map((item) => item.label).join(' · ')}</strong>
          </div>

          <small>Tap an exposed tab to bring that document forward.</small>
        </footer>
      </section>
    </div>,
    document.body,
  )
}

export default LoadPacketWorkspace
