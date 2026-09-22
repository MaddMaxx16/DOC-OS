import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'
import { getLoadFolderLifecycle } from '../utils/documentFolderLifecycle.js'

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

function buildDocumentIndex(loads, workflows) {
  const documents = new Map()

  loads.forEach((load) => {
    const routeName = getFreightRouteName(load)

    if (load.rateConfirmation?.id) {
      documents.set(load.rateConfirmation.id, {
        id: load.rateConfirmation.id,
        type: 'rate-confirmation',
        sourceLoadId: load.id,
        loadNumber: load.loadNumber || load.id,
        routeName,
        title: load.rateConfirmation.reference || `RC-${load.id}`,
        version: load.rateConfirmation.version || 1,
        status: load.rateConfirmation.status || 'RECEIVED',
      })
    }

    if (load.pod) {
      const podId = `pod:${load.id}:v${load.pod.version || 1}`
      documents.set(podId, {
        id: podId,
        type: 'pod',
        sourceLoadId: load.id,
        loadNumber: load.loadNumber || load.id,
        routeName,
        title: 'Proof of Delivery',
        version: load.pod.version || 1,
        status: load.pod.approved
          ? 'APPROVED'
          : load.pod.correctionStatus === 'CORRECTED'
            ? 'CORRECTED · REVIEW'
            : 'NEEDS REVIEW',
      })

      const damaged = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
      const missing = Number(load.pod?.freightCondition?.missingAtPickup || 0)

      if (damaged > 0 || missing > 0) {
        const exceptionId = `exception:${load.id}:v${load.pod.version || 1}`
        documents.set(exceptionId, {
          id: exceptionId,
          type: 'exception-report',
          sourceLoadId: load.id,
          loadNumber: load.loadNumber || load.id,
          routeName,
          title: 'Freight Exception',
          version: load.pod.version || 1,
          status: 'EXCEPTION RECORD',
        })
      }
    }

    const workflow = workflows[load.id] || {}
    if (workflow.invoiceNumber) {
      const invoiceId = `invoice:${load.id}:${workflow.invoiceNumber}`
      documents.set(invoiceId, {
        id: invoiceId,
        type: 'invoice',
        sourceLoadId: load.id,
        loadNumber: load.loadNumber || load.id,
        routeName,
        title: workflow.invoiceNumber,
        version: 1,
        status:
          workflow.financialStatus === 'PAID'
            ? 'PAID'
            : workflow.financialStatus === 'AWAITING_PAYMENT'
              ? 'SENT'
              : workflow.submissionStatus === 'SUBMITTED'
                ? 'SENT'
                : 'DRAFT',
      })
    }
  })

  return documents
}

// B.5.4C.7.3.1 — Physical Manila Folder Workspace
// B.5.4C.7.3.1.1 — Swipe Paper Navigation
// B.5.4C.7.3.2 — Folder Lifecycle + File Drawer
// B.5.4C.7.4 — Assemble Packet + Send Closeout
function ManilaLoadFolderWorkspace({
  folderLoadId,
  loads = [],
  carriers = [],
  workflows = {},
  dispatcherProfile = null,
  onBack,
  onUnfileDocument,
  onAssemblePacket,
  onSendCloseout,
}) {
  const folderLoad = loads.find((load) => load.id === folderLoadId) || null

  const documentIndex = useMemo(
    () => buildDocumentIndex(loads, workflows),
    [loads, workflows]
  )

  const filedIds = folderLoad?.documentFiling?.filedDocumentIds || []
  const filedDocuments = filedIds
    .map((id) => documentIndex.get(id))
    .filter(Boolean)

  const papers = [
    {
      id: `offer:${folderLoadId}`,
      type: 'load-offer',
      sourceLoadId: folderLoadId,
      loadNumber: folderLoad?.loadNumber || folderLoadId,
      routeName: folderLoad ? getFreightRouteName(folderLoad) : 'Load',
      title: 'FreightLink Offer',
      status: 'INTERNAL RECORD',
      autoFiled: true,
    },
    ...filedDocuments,
  ]

  const [frontPaperId, setFrontPaperId] = useState(
    papers[papers.length - 1]?.id || `offer:${folderLoadId}`
  )

  const swipeRef = useRef(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [assemblyMessage, setAssemblyMessage] = useState('')

  const frontPaperIndex = Math.max(
    0,
    papers.findIndex((paper) => paper.id === frontPaperId)
  )

  const cyclePaper = (direction) => {
    if (papers.length <= 1) return

    const currentIndex = Math.max(
      0,
      papers.findIndex((paper) => paper.id === frontPaperId)
    )

    const nextIndex =
      direction > 0
        ? (currentIndex + 1) % papers.length
        : (currentIndex - 1 + papers.length) % papers.length

    setFrontPaperId(papers[nextIndex].id)
  }

  const beginPaperSwipe = (event) => {
    if (papers.length <= 1) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }

    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const movePaperSwipe = (event) => {
    const swipe = swipeRef.current
    if (!swipe || swipe.pointerId !== event.pointerId) return

    const dx = event.clientX - swipe.startX
    const dy = event.clientY - swipe.startY

    if (Math.abs(dx) > Math.abs(dy)) {
      setSwipeOffset(Math.max(-56, Math.min(56, dx)))
    }
  }

  const endPaperSwipe = (event) => {
    const swipe = swipeRef.current
    if (!swipe || swipe.pointerId !== event.pointerId) return

    const dx = event.clientX - swipe.startX
    const dy = event.clientY - swipe.startY

    swipeRef.current = null
    setSwipeOffset(0)

    if (Math.abs(dx) < 46) return
    if (Math.abs(dx) <= Math.abs(dy) * 1.15) return

    cyclePaper(dx < 0 ? 1 : -1)
  }

  useEffect(() => {
    if (!papers.some((paper) => paper.id === frontPaperId)) {
      setFrontPaperId(papers[papers.length - 1]?.id || `offer:${folderLoadId}`)
    }
  }, [papers, frontPaperId, folderLoadId])

  useEffect(() => {
    const prior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prior
    }
  }, [])

  if (typeof document === 'undefined') return null

  if (!folderLoad) {
    return createPortal(
      <div className="manila-folder-overlay">
        <section className="manila-folder-screen">
          <header className="manila-folder-toolbar">
            <button type="button" onClick={onBack}>‹</button>
            <div>
              <span>DOCUMENTS · LOAD FILE</span>
              <strong>Folder unavailable</strong>
            </div>
          </header>
        </section>
      </div>,
      document.body,
    )
  }

  const folderWorkflow = workflows[folderLoad.id] || {}
  const folderCarrier =
    carriers.find((carrier) => carrier.id === folderLoad.carrierId) ||
    carriers[0] ||
    null

  const folderLifecycle = getLoadFolderLifecycle(
    folderLoad,
    workflows,
    loads
  )

  const fileState = folderLifecycle.label
  const packetAssembled = Boolean(folderLoad.documentFiling?.packetAssembled)
  const closeoutStatus = String(
    folderLoad.documentFiling?.closeoutStatus || ''
  ).toUpperCase()

  const deliveredEnoughToAssemble =
    folderLoad.tripStatus === 'completed' ||
    folderLoad.tripStatus === 'delivered' ||
    Boolean(folderLoad.pod)

  const assemblePacket = () => {
    const result = onAssemblePacket?.(folderLoad.id)

    if (result?.ok === false) {
      setAssemblyMessage(result.message || 'Packet audit failed.')
      return
    }

    setAssemblyMessage('Packet assembled and locked for closeout.')
  }

  const renderPaper = (paper) => {
    const sourceLoad =
      loads.find((load) => load.id === paper.sourceLoadId) ||
      folderLoad

    const sourceWorkflow = workflows[sourceLoad.id] || {}
    const sourceCarrier =
      carriers.find((carrier) => carrier.id === sourceLoad.carrierId) ||
      folderCarrier

    const pickup = mapLocations.find(
      (location) => location.id === sourceLoad.pickupLocationId
    )

    const delivery = mapLocations.find(
      (location) => location.id === sourceLoad.deliveryLocationId
    )

    const rc = sourceLoad.rateConfirmation
    const pod = sourceLoad.pod
    const gross = Number(rc?.rate ?? sourceLoad.rate ?? 0)
    const feePercent = Number(sourceCarrier?.dispatchAgreement?.percentage ?? 8)
    const amount =
      Number.isFinite(gross) && Number.isFinite(feePercent)
        ? gross * (feePercent / 100)
        : 0

    if (paper.type === 'load-offer') {
      return (
        <article className="manila-paper manila-offer-paper">
          <header>
            <span>FREIGHTLINK · LOAD OFFER</span>
            <h2>{sourceLoad.loadNumber || sourceLoad.id}</h2>
            <p>{getFreightRouteName(sourceLoad)}</p>
          </header>

          <section className="manila-route">
            <div><span>PICKUP</span><strong>{pickup?.name || 'Pickup'}</strong></div>
            <b>→</b>
            <div><span>DELIVERY</span><strong>{delivery?.name || 'Delivery'}</strong></div>
          </section>

          <section className="manila-grid">
            <div><span>RATE</span><strong>{money(sourceLoad.rate)}</strong></div>
            <div><span>MILES</span><strong>{miles(sourceLoad.listedMiles)}</strong></div>
            <div><span>LOAD</span><strong>{sourceLoad.loadNumber || sourceLoad.id}</strong></div>
            <div><span>FILE STATUS</span><strong>AUTO-FILED</strong></div>
          </section>
        </article>
      )
    }

    if (paper.type === 'rate-confirmation') {
      return (
        <article className={`manila-paper manila-ratecon-paper ${paper.sourceLoadId !== folderLoad.id ? 'misfiled' : ''}`}>
          <header>
            <span>{sourceCarrier?.name || 'CARRIER'} · RATE CONFIRMATION</span>
            <h2>{paper.title}</h2>
            <p>{paper.routeName} · Version {paper.version}</p>
          </header>

          <section className="manila-route">
            <div><span>PICKUP</span><strong>{pickup?.name || 'Pickup'}</strong></div>
            <b>→</b>
            <div><span>DELIVERY</span><strong>{delivery?.name || 'Delivery'}</strong></div>
          </section>

          <section className="manila-grid">
            <div><span>AGREED RATE</span><strong>{money(rc?.rate)}</strong></div>
            <div><span>MILES</span><strong>{miles(rc?.listedMiles)}</strong></div>
            <div><span>LOAD REF</span><strong>{paper.loadNumber}</strong></div>
            <div><span>STATUS</span><strong>{paper.status}</strong></div>
          </section>

          {rc?.status === 'CONFIRMED' && (
            <div className="manila-stamp confirmed">CONFIRMED</div>
          )}
        </article>
      )
    }

    if (paper.type === 'pod') {
      return (
        <article className={`manila-paper manila-pod-paper ${paper.sourceLoadId !== folderLoad.id ? 'misfiled' : ''}`}>
          <header>
            <span>PROOF OF DELIVERY</span>
            <h2>{paper.loadNumber}</h2>
            <p>{paper.routeName} · Version {paper.version}</p>
          </header>

          <section className="manila-grid">
            <div><span>RECEIVER</span><strong>{delivery?.name || 'Receiver'}</strong></div>
            <div><span>PIECES</span><strong>{pod?.piecesReceived ?? '—'} / {pod?.piecesExpected ?? '—'}</strong></div>
            <div><span>DAMAGE</span><strong>{pod?.damage || 'None'}</strong></div>
            <div><span>LOAD REF</span><strong>{paper.loadNumber}</strong></div>
          </section>

          <section className="manila-signature">
            <span>RECEIVER SIGNATURE</span>
            <strong>{pod?.signedBy || 'Not provided'}</strong>
            <small>{gameStamp(pod?.receivedGameMinute)}</small>
          </section>

          {pod?.approved && (
            <div className="manila-stamp approved">APPROVED</div>
          )}
        </article>
      )
    }

    if (paper.type === 'exception-report') {
      const damaged = Number(pod?.freightCondition?.damagedAtPickup || 0)
      const missing = Number(pod?.freightCondition?.missingAtPickup || 0)

      return (
        <article className={`manila-paper manila-exception-paper ${paper.sourceLoadId !== folderLoad.id ? 'misfiled' : ''}`}>
          <header>
            <span>FREIGHT EXCEPTION RECORD</span>
            <h2>{paper.loadNumber}</h2>
            <p>{paper.routeName}</p>
          </header>

          <section className="manila-exception-counts">
            <div><span>DAMAGED</span><strong>{damaged}</strong></div>
            <div><span>MISSING</span><strong>{missing}</strong></div>
          </section>

          <section className="manila-note">
            <span>LOAD REFERENCE</span>
            <strong>{paper.loadNumber}</strong>
          </section>
        </article>
      )
    }

    return (
      <article className={`manila-paper manila-invoice-paper ${paper.sourceLoadId !== folderLoad.id ? 'misfiled' : ''}`}>
        <header className="manila-invoice-header">
          <div>
            <span>DISPATCH SERVICES INVOICE</span>
            <h2>{sourceWorkflow.invoiceNumber || paper.title}</h2>
            <p>
              {dispatcherProfile?.businessName ||
                dispatcherProfile?.displayName ||
                'DOC OS Dispatch'}
            </p>
          </div>

          <div>
            <span>STATUS</span>
            <strong>{paper.status}</strong>
          </div>
        </header>

        <section className="manila-grid">
          <div><span>LOAD REF</span><strong>{paper.loadNumber}</strong></div>
          <div><span>CARRIER</span><strong>{sourceCarrier?.name || 'Carrier'}</strong></div>
          <div><span>CARRIER GROSS</span><strong>{money(gross)}</strong></div>
          <div><span>DISPATCH FEE</span><strong>{feePercent}%</strong></div>
        </section>

        <section className="manila-invoice-total">
          <span>AMOUNT DUE</span>
          <strong>{money(amount)}</strong>
        </section>

        {paper.status === 'PAID' && (
          <div className="manila-stamp paid">PAID</div>
        )}
      </article>
    )
  }

  return createPortal(
    <div
      className="manila-folder-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${getFreightRouteName(folderLoad)} manila load folder`}
    >
      <section className="manila-folder-screen">
        <header className="manila-folder-toolbar">
          <button type="button" onClick={onBack} aria-label="Return to file cabinet">‹</button>

          <div>
            <span>DOCUMENTS · MANILA LOAD FILE</span>
            <strong>{getFreightRouteName(folderLoad)}</strong>
          </div>

          <small>{fileState}</small>
        </header>

        <main
          className="manila-folder-desk"
          onPointerDown={beginPaperSwipe}
          onPointerMove={movePaperSwipe}
          onPointerUp={endPaperSwipe}
          onPointerCancel={endPaperSwipe}
        >
          <div className="manila-folder-object" aria-hidden="true">
            <span>LOAD FILE</span>
            <strong>{folderLoad.loadNumber || folderLoad.id}</strong>
            <small>{papers.length} paper{papers.length === 1 ? '' : 's'} filed</small>
          </div>

          {papers.map((paper, index) => {
            const active = frontPaperId === paper.id

            return (
              <section
                key={paper.id}
                className={`manila-paper-layer ${active ? 'front' : 'rear'}`}
                style={{
                  '--manila-order': index,
                  ...(active
                    ? {
                        '--manila-swipe-x': `${swipeOffset}px`,
                        '--manila-swipe-rotate': `${swipeOffset * 0.018}deg`,
                      }
                    : {}),
                }}
              >
                {renderPaper(paper)}
              </section>
            )
          })}

          {papers.length > 1 && (
            <div className="manila-swipe-cue" aria-hidden="true">
              <span>‹</span>
              <strong>{frontPaperIndex + 1} / {papers.length}</strong>
              <small>SWIPE PAPERWORK</small>
              <span>›</span>
            </div>
          )}
        </main>

        <footer className="manila-folder-footer manila-closeout-footer">
          <div className="manila-folder-status-copy">
            <span>{fileState}</span>
            <strong>
              {packetAssembled
                ? 'Packet contents locked · ready to send carrier closeout'
                : folderLifecycle.readyToAssemble
                  ? 'All required paperwork filed · run final packet audit'
                  : folderLifecycle.wrongFiledCount > 0
                    ? `${folderLifecycle.wrongFiledCount} mixed reference${folderLifecycle.wrongFiledCount === 1 ? '' : 's'} in this file`
                    : folderLifecycle.missing.length > 0
                      ? `Waiting on ${folderLifecycle.missing.slice(0, 2).join(' · ')}`
                      : frontPaperId === `offer:${folderLoadId}`
                        ? 'FreightLink Offer · internal record'
                        : 'Filed paperwork · swipe left or right to inspect'}
            </strong>

            {assemblyMessage && (
              <small className={assemblyMessage.startsWith('Packet assembled') ? 'success' : 'error'}>
                {assemblyMessage}
              </small>
            )}
          </div>

          <div className="manila-closeout-actions">
            {!packetAssembled &&
              closeoutStatus !== 'CLOSED' &&
              deliveredEnoughToAssemble && (
                <button
                  type="button"
                  className="manila-assemble-action"
                  onClick={assemblePacket}
                >
                  ASSEMBLE LOAD PACKET
                </button>
              )}

            {packetAssembled &&
              !['SENT', 'CLOSED'].includes(closeoutStatus) && (
                <button
                  type="button"
                  className="manila-send-closeout-action"
                  onClick={() => onSendCloseout?.(folderLoad.id)}
                >
                  SEND CLOSEOUT
                </button>
              )}

            {!packetAssembled &&
              frontPaperId !== `offer:${folderLoadId}` && (
                <button
                  type="button"
                  className="manila-return-paper-action"
                  onClick={() => onUnfileDocument?.(frontPaperId)}
                >
                  RETURN PAPER TO TRAY
                </button>
              )}
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  )
}

export default ManilaLoadFolderWorkspace
