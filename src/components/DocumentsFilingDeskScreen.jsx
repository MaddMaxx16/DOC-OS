import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getFreightRouteName } from '../utils/freightIdentity.js'
import { getLoadFolderLifecycle, sortLoadFolders } from '../utils/documentFolderLifecycle.js'

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

function buildFilingQueue(loads, workflows) {
  const papers = []

  loads.forEach((load) => {
    const routeName = getFreightRouteName(load)

    if (load.rateConfirmation?.id) {
      papers.push({
        id: load.rateConfirmation.id,
        type: 'rate-confirmation',
        sourceLoadId: load.id,
        loadNumber: load.loadNumber || load.id,
        routeName,
        title: load.rateConfirmation.reference || `RC-${load.id}`,
        status: load.rateConfirmation.status || 'RECEIVED',
        version: load.rateConfirmation.version || 1,
        lane: 'incoming',
      })
    }

    if (load.pod) {
      papers.push({
        id: `pod:${load.id}:v${load.pod.version || 1}`,
        type: 'pod',
        sourceLoadId: load.id,
        loadNumber: load.loadNumber || load.id,
        routeName,
        title: `Proof of Delivery`,
        status: load.pod.approved
          ? 'APPROVED'
          : load.pod.correctionStatus === 'CORRECTED'
            ? 'CORRECTED · REVIEW'
            : 'NEEDS REVIEW',
        version: load.pod.version || 1,
        lane: 'incoming',
      })

      const damaged = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
      const missing = Number(load.pod?.freightCondition?.missingAtPickup || 0)

      if (damaged > 0 || missing > 0) {
        papers.push({
          id: `exception:${load.id}:v${load.pod.version || 1}`,
          type: 'exception-report',
          sourceLoadId: load.id,
          loadNumber: load.loadNumber || load.id,
          routeName,
          title: 'Freight Exception Record',
          status: 'EXCEPTION RECORD',
          version: load.pod.version || 1,
          lane: 'incoming',
        })
      }
    }

    const workflow = workflows[load.id] || {}

    if (workflow.invoiceNumber) {
      papers.push({
        id: `invoice:${load.id}:${workflow.invoiceNumber}`,
        type: 'invoice',
        sourceLoadId: load.id,
        loadNumber: load.loadNumber || load.id,
        routeName,
        title: workflow.invoiceNumber,
        status:
          workflow.financialStatus === 'PAID'
            ? 'PAID'
            : workflow.financialStatus === 'AWAITING_PAYMENT'
              ? 'SENT'
              : workflow.submissionStatus === 'SUBMITTED'
                ? 'SENT'
                : 'DRAFT',
        version: 1,
        lane: 'outgoing',
      })
    }
  })

  return papers
}

function FilingPaper({ paper, load, workflow, carrier }) {
  if (!paper || !load) return null

  const rc = load.rateConfirmation
  const pod = load.pod
  const damaged = Number(pod?.freightCondition?.damagedAtPickup || 0)
  const missing = Number(pod?.freightCondition?.missingAtPickup || 0)

  const feePercent = Number(carrier?.dispatchAgreement?.percentage ?? 8)
  const grossRate = Number(rc?.rate ?? load.rate ?? 0)
  const invoiceAmount =
    Number.isFinite(grossRate) && Number.isFinite(feePercent)
      ? grossRate * (feePercent / 100)
      : 0

  if (paper.type === 'rate-confirmation') {
    return (
      <article className="filingdesk-paper filingdesk-ratecon-paper">
        <header>
          <span>{carrier?.name || 'CARRIER'} · RATE CONFIRMATION</span>
          <h2>{paper.title}</h2>
          <p>{paper.routeName}</p>
        </header>

        <section className="filingdesk-paper-grid">
          <div><span>LOAD</span><strong>{paper.loadNumber}</strong></div>
          <div><span>VERSION</span><strong>{paper.version}</strong></div>
          <div><span>AGREED RATE</span><strong>{money(rc?.rate)}</strong></div>
          <div><span>LISTED MILES</span><strong>{miles(rc?.listedMiles)}</strong></div>
        </section>

        <section className="filingdesk-paper-note">
          <span>DOCUMENT STATUS</span>
          <strong>{paper.status}</strong>
        </section>

        {rc?.status === 'CONFIRMED' && (
          <div className="filingdesk-paper-stamp">CONFIRMED</div>
        )}
      </article>
    )
  }

  if (paper.type === 'pod') {
    return (
      <article className="filingdesk-paper filingdesk-pod-paper">
        <header>
          <span>PROOF OF DELIVERY</span>
          <h2>{paper.loadNumber}</h2>
          <p>{paper.routeName}</p>
        </header>

        <section className="filingdesk-paper-grid">
          <div><span>PIECES</span><strong>{pod?.piecesReceived ?? '—'} / {pod?.piecesExpected ?? '—'}</strong></div>
          <div><span>DAMAGE</span><strong>{pod?.damage || 'None'}</strong></div>
          <div className="wide"><span>RECEIVER SIGNATURE</span><strong className="signature">{pod?.signedBy || 'Not provided'}</strong></div>
        </section>

        <section className="filingdesk-paper-note">
          <span>DOCUMENT STATUS</span>
          <strong>{paper.status}</strong>
        </section>

        {pod?.approved && (
          <div className="filingdesk-paper-stamp approved">APPROVED</div>
        )}
      </article>
    )
  }

  if (paper.type === 'exception-report') {
    return (
      <article className="filingdesk-paper filingdesk-exception-paper">
        <header>
          <span>FREIGHT EXCEPTION RECORD</span>
          <h2>{paper.loadNumber}</h2>
          <p>{paper.routeName}</p>
        </header>

        <section className="filingdesk-exception-counts">
          <div><span>DAMAGED</span><strong>{damaged}</strong></div>
          <div><span>MISSING</span><strong>{missing}</strong></div>
        </section>

        <section className="filingdesk-paper-note">
          <span>SHIPMENT CONDITION FILE</span>
          <strong>Retain with supporting load paperwork.</strong>
        </section>
      </article>
    )
  }

  return (
    <article className="filingdesk-paper filingdesk-invoice-paper">
      <header>
        <span>DISPATCH SERVICES INVOICE</span>
        <h2>{workflow?.invoiceNumber || paper.title}</h2>
        <p>{paper.routeName}</p>
      </header>

      <section className="filingdesk-paper-grid">
        <div><span>LOAD</span><strong>{paper.loadNumber}</strong></div>
        <div><span>STATUS</span><strong>{paper.status}</strong></div>
        <div><span>CARRIER GROSS</span><strong>{money(grossRate)}</strong></div>
        <div><span>DISPATCH FEE</span><strong>{feePercent}%</strong></div>
      </section>

      <section className="filingdesk-invoice-total">
        <span>AMOUNT DUE</span>
        <strong>{money(invoiceAmount)}</strong>
      </section>

      {paper.status === 'PAID' && (
        <div className="filingdesk-paper-stamp paid">PAID</div>
      )}
    </article>
  )
}

// B.5.4C.7.3.0 — Filing Desk Foundation
// B.5.4C.7.3.2 — Folder Lifecycle + File Drawer
function DocumentsFilingDeskScreen({
  loads = [],
  carriers = [],
  ledgerWorkflowByLoadId = {},
  onBack,
  onFileDocument,
}) {
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [cursor, setCursor] = useState(0)
  const [filing, setFiling] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const allPapers = useMemo(
    () => buildFilingQueue(loads, ledgerWorkflowByLoadId),
    [loads, ledgerWorkflowByLoadId]
  )

  const filedIds = useMemo(() => {
    const result = new Set()

    loads.forEach((load) => {
      ;(load.documentFiling?.filedDocumentIds || []).forEach((id) => result.add(id))
    })

    return result
  }, [loads])

  const queue = allPapers.filter((paper) => !filedIds.has(paper.id))

  const folders = useMemo(
    () => sortLoadFolders(loads, ledgerWorkflowByLoadId),
    [loads, ledgerWorkflowByLoadId]
  )

  const safeCursor = queue.length ? Math.min(cursor, queue.length - 1) : 0
  const currentPaper = queue[safeCursor] || null
  const currentLoad = currentPaper
    ? loads.find((load) => load.id === currentPaper.sourceLoadId)
    : null
  const currentWorkflow = currentPaper
    ? ledgerWorkflowByLoadId[currentPaper.sourceLoadId] || {}
    : {}
  const currentCarrier =
    carriers.find((carrier) => carrier.id === currentLoad?.carrierId) ||
    carriers[0] ||
    null

  const selectedFolder = selectedFolderId
    ? loads.find((load) => load.id === selectedFolderId) || null
    : null

  const selectedFolderLifecycle = selectedFolder
    ? getLoadFolderLifecycle(
        selectedFolder,
        ledgerWorkflowByLoadId,
        loads
      )
    : null

  useEffect(() => {
    if (cursor >= queue.length && queue.length > 0) {
      setCursor(0)
    }
  }, [cursor, queue.length])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const skipPaper = () => {
    if (queue.length <= 1) return
    setSelectedFolderId(null)
    setCursor((value) => (value + 1) % queue.length)
  }

  const filePaper = () => {
    if (!currentPaper || !selectedFolderId || filing) return

    setFiling(true)

    window.setTimeout(() => {
      onFileDocument?.(selectedFolderId, currentPaper.id)
      setSelectedFolderId(null)
      setFiling(false)
    }, 210)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="filingdesk-overlay">
      <section className="filingdesk-screen">
        <header className="filingdesk-toolbar">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to file cabinet"
          >
            ‹
          </button>

          <div>
            <span>DOCUMENTS · FILING DESK</span>
            <strong>
              {currentPaper ? currentPaper.routeName : 'Incoming cleared'}
            </strong>
          </div>

          <small>
            {queue.length
              ? `${safeCursor + 1} OF ${queue.length}`
              : 'DESK CLEAR'}
          </small>
        </header>

        {currentPaper ? (
          <>
            <main className="filingdesk-workarea">
              <div className="filingdesk-desk-label">
                <span>
                  {currentPaper.lane === 'outgoing'
                    ? 'OUTGOING FILE COPY'
                    : 'INCOMING PAPERWORK'}
                </span>
                <strong>Read the paper. Choose the load file.</strong>
              </div>

              <div className={`filingdesk-paper-stage ${filing ? 'filing' : ''}`}>
                <FilingPaper
                  paper={currentPaper}
                  load={currentLoad}
                  workflow={currentWorkflow}
                  carrier={currentCarrier}
                />
              </div>

              <section className="filingdesk-folders">
                <header>
                  <div>
                    <span>FILE DRAWER</span>
                    <strong>Choose the load file yourself</strong>
                  </div>

                  <small>{folders.length} LOAD FILE{folders.length === 1 ? '' : 'S'}</small>
                </header>

                {selectedFolder ? (
                  <button
                    type="button"
                    className="filingdesk-selected-folder"
                    onClick={() => setDrawerOpen(true)}
                  >
                    <span className="filingdesk-selected-folder-tab">
                      {selectedFolder.loadNumber || selectedFolder.id}
                    </span>

                    <span className="filingdesk-selected-folder-copy">
                      <strong>{getFreightRouteName(selectedFolder)}</strong>
                      <small>{selectedFolderLifecycle?.label}</small>
                    </span>

                    <b>CHANGE FILE</b>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="filingdesk-open-drawer"
                    onClick={() => setDrawerOpen(true)}
                  >
                    <span>OPEN FILE DRAWER</span>
                    <strong>Browse all active and open load folders</strong>
                  </button>
                )}
              </section>
            </main>

            <footer className="filingdesk-actions">
              <button
                type="button"
                className="filingdesk-skip"
                disabled={queue.length <= 1 || filing}
                onClick={skipPaper}
              >
                NEXT PAPER
              </button>

              <button
                type="button"
                className="filingdesk-file-action"
                disabled={!selectedFolderId || filing}
                onClick={filePaper}
              >
                {filing
                  ? 'FILING…'
                  : selectedFolderId
                    ? 'FILE TO SELECTED LOAD'
                    : 'SELECT A LOAD FOLDER'}
              </button>
            </footer>
          </>
        ) : (
          <main className="filingdesk-clear-state">
            <div className="filingdesk-clear-folder" aria-hidden="true">
              <span>INCOMING</span>
              <strong>FILED</strong>
            </div>

            <span>FILING DESK</span>
            <h2>Incoming cleared.</h2>
            <p>
              Every available Rate Confirmation, POD, exception record, and
              invoice copy has been placed into a load file.
            </p>

            <button type="button" onClick={onBack}>
              RETURN TO FILE CABINET
            </button>
          </main>
        )}

        {drawerOpen && (
          <div className="filingdesk-drawer-overlay" role="dialog" aria-modal="true" aria-label="Load file drawer">
            <section className="filingdesk-drawer">
              <header>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close file drawer"
                >
                  ‹
                </button>

                <div>
                  <span>DOCUMENTS · FILE DRAWER</span>
                  <strong>Load Files</strong>
                </div>

                <small>{folders.length} FILE{folders.length === 1 ? '' : 'S'}</small>
              </header>

              <div className="filingdesk-drawer-list">
                {folders.map((load) => {
                  const lifecycle = getLoadFolderLifecycle(
                    load,
                    ledgerWorkflowByLoadId,
                    loads
                  )
                  const filedCount =
                    (load.documentFiling?.filedDocumentIds || []).length + 1
                  const selected = selectedFolderId === load.id

                  return (
                    <button
                      type="button"
                      key={load.id}
                      className={`filingdesk-drawer-file ${selected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedFolderId(load.id)
                        setDrawerOpen(false)
                      }}
                    >
                      <span className="filingdesk-drawer-tab">
                        {load.loadNumber || load.id}
                      </span>

                      <span className="filingdesk-drawer-copy">
                        <strong>{getFreightRouteName(load)}</strong>
                        <small>
                          {filedCount} paper{filedCount === 1 ? '' : 's'} filed
                        </small>
                      </span>

                      <span className={`filingdesk-drawer-state state-${lifecycle.id}`}>
                        {lifecycle.label}
                      </span>
                    </button>
                  )
                })}

                {folders.length === 0 && (
                  <div className="filingdesk-drawer-empty">
                    <strong>No load files yet.</strong>
                    <span>A folder appears as soon as freight becomes part of your operation.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}

export default DocumentsFilingDeskScreen
