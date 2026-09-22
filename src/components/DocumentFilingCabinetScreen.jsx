import { useMemo, useRef, useState } from 'react'
import { getFreightRouteName } from '../utils/freightIdentity.js'
import { getLoadFolderLifecycle, sortLoadFolders } from '../utils/documentFolderLifecycle.js'

function documentStatus(document) {
  return String(document.status || 'READY').replaceAll('_', ' ')
}

function shortType(type) {
  if (type === 'rate-confirmation') return 'RC'
  if (type === 'pod') return 'POD'
  if (type === 'exception-report') return 'EXC'
  if (type === 'invoice') return 'INV'
  return 'DOC'
}

function buildFileableDocuments(loads, workflows) {
  const documents = []

  loads.forEach((load) => {
    const routeName = getFreightRouteName(load)

    if (load.rateConfirmation?.id) {
      documents.push({
        id: load.rateConfirmation.id,
        type: 'rate-confirmation',
        sourceLoadId: load.id,
        title: load.rateConfirmation.reference || `Rate Confirmation · ${load.loadNumber || load.id}`,
        routeName,
        status:
          load.rateConfirmation.status === 'CONFIRMED'
            ? 'CONFIRMED'
            : load.rateConfirmation.status === 'CORRECTION_REQUESTED'
              ? 'CORRECTION REQUESTED'
              : load.rateConfirmation.reviewStatus === 'IN_REVIEW'
                ? 'IN REVIEW'
                : 'NEEDS REVIEW',
        lane: 'incoming',
        version: load.rateConfirmation.version || 1,
      })
    }

    if (load.pod) {
      documents.push({
        id: `pod:${load.id}:v${load.pod.version || 1}`,
        type: 'pod',
        sourceLoadId: load.id,
        title: `Proof of Delivery · ${load.loadNumber || load.id}`,
        routeName,
        status:
          load.pod.approved
            ? 'APPROVED'
            : load.pod.correctionStatus === 'PENDING'
              ? 'CORRECTION PENDING'
              : load.pod.correctionStatus === 'CORRECTED'
                ? 'CORRECTED · REVIEW'
                : 'NEEDS REVIEW',
        lane: 'incoming',
        version: load.pod.version || 1,
      })

      const damaged = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
      const missing = Number(load.pod?.freightCondition?.missingAtPickup || 0)

      if (damaged > 0 || missing > 0) {
        documents.push({
          id: `exception:${load.id}:v${load.pod.version || 1}`,
          type: 'exception-report',
          sourceLoadId: load.id,
          title: `Freight Exception · ${load.loadNumber || load.id}`,
          routeName,
          status: 'EXCEPTION RECORD',
          lane: 'incoming',
          version: load.pod.version || 1,
        })
      }
    }

    const workflow = workflows[load.id] || {}

    if (workflow.invoiceNumber) {
      documents.push({
        id: `invoice:${load.id}:${workflow.invoiceNumber}`,
        type: 'invoice',
        sourceLoadId: load.id,
        title: workflow.invoiceNumber,
        routeName,
        status:
          workflow.financialStatus === 'PAID'
            ? 'PAID'
            : workflow.financialStatus === 'AWAITING_PAYMENT'
              ? 'SENT'
              : workflow.submissionStatus === 'SUBMITTED'
                ? 'SENT'
                : 'DRAFT',
        lane: 'outgoing',
        version: 1,
      })
    }
  })

  return documents
}

// B.5.4C.7.3.2 — Folder Lifecycle + File Drawer
function DocumentFilingCabinetScreen({
  loads = [],
  businessDocuments = [],
  ledgerWorkflowByLoadId = {},
  onBack,
  onStartFiling,
  onOpenFolder,
  onOpenLoad,
  onOpenRateConfirmation,
  onOpenPod,
  onOpenInvoice,
  onOpenException,
  onOpenBusinessDocument,
  onFileDocument,
  onUnfileDocument,
}) {
  // B.5.4C.7.2 — Documents Filing Cabinet
  const [selectedDocumentId, setSelectedDocumentId] = useState(null)
  const [draggingDocumentId, setDraggingDocumentId] = useState(null)
  const [dragPoint, setDragPoint] = useState(null)
  const [hoverFolderId, setHoverFolderId] = useState(null)
  const dragRef = useRef(null)

  const fileableDocuments = useMemo(
    () => buildFileableDocuments(loads, ledgerWorkflowByLoadId),
    [loads, ledgerWorkflowByLoadId]
  )

  const filedDocumentIds = useMemo(() => {
    const ids = new Set()

    loads.forEach((load) => {
      const filed = load.documentFiling?.filedDocumentIds || []
      filed.forEach((id) => ids.add(id))
    })

    return ids
  }, [loads])

  const incomingDocuments = fileableDocuments.filter(
    (document) =>
      document.lane === 'incoming' &&
      !filedDocumentIds.has(document.id)
  )

  const outgoingDocuments = fileableDocuments.filter(
    (document) =>
      document.lane === 'outgoing' &&
      !filedDocumentIds.has(document.id)
  )

  const loadFolders = useMemo(
    () => sortLoadFolders(loads, ledgerWorkflowByLoadId),
    [loads, ledgerWorkflowByLoadId]
  )

  const openDocument = (document) => {
    if (!document) return

    if (document.type === 'rate-confirmation') {
      onOpenRateConfirmation?.(document.sourceLoadId)
      return
    }

    if (document.type === 'pod') {
      onOpenPod?.(document.sourceLoadId)
      return
    }

    if (document.type === 'invoice') {
      onOpenInvoice?.(document.sourceLoadId)
      return
    }

    if (document.type === 'exception-report') {
      onOpenException?.(document.sourceLoadId)
    }
  }

  const fileSelectedInto = (loadId) => {
    if (!selectedDocumentId) return
    onFileDocument?.(loadId, selectedDocumentId)
    setSelectedDocumentId(null)
  }

  const folderAtPoint = (x, y) => {
    const element = document.elementFromPoint(x, y)
    const folder = element?.closest?.('[data-load-folder-id]')
    return folder?.dataset?.loadFolderId || null
  }

  const beginDrag = (event, documentItem) => {
    event.stopPropagation()

    if (event.pointerType === 'mouse' && event.button !== 0) return

    dragRef.current = {
      pointerId: event.pointerId,
      documentId: documentItem.id,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    }

    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event) => {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return

    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    const distance = Math.hypot(dx, dy)

    if (!current.active && distance < 7) return

    current.active = true
    setDraggingDocumentId(current.documentId)
    setDragPoint({ x: event.clientX, y: event.clientY })

    const folderId = folderAtPoint(event.clientX, event.clientY)
    setHoverFolderId(folderId)
  }

  const endDrag = (event) => {
    const current = dragRef.current
    if (!current || current.pointerId !== event.pointerId) return

    const targetFolderId = current.active
      ? folderAtPoint(event.clientX, event.clientY)
      : null

    if (current.active && targetFolderId) {
      onFileDocument?.(targetFolderId, current.documentId)
      setSelectedDocumentId(null)
    } else if (!current.active) {
      setSelectedDocumentId((value) =>
        value === current.documentId ? null : current.documentId
      )
    }

    dragRef.current = null
    setDraggingDocumentId(null)
    setDragPoint(null)
    setHoverFolderId(null)
  }

  const renderLooseDocument = (documentItem) => {
    const selected = selectedDocumentId === documentItem.id
    const dragging = draggingDocumentId === documentItem.id

    return (
      <article
        className={`filing-loose-document ${selected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
        key={documentItem.id}
      >
        <button
          type="button"
          className="filing-document-open"
          onClick={() => openDocument(documentItem)}
        >
          <span className={`filing-doc-type ${documentItem.type}`}>
            {shortType(documentItem.type)}
          </span>

          <span className="filing-document-copy">
            <strong>{documentItem.title}</strong>
            <small>{documentItem.routeName}</small>
            <b>{documentStatus(documentItem)}</b>
          </span>
        </button>

        <button
          type="button"
          className="filing-drag-handle"
          aria-label={`File ${documentItem.title}`}
          title="Drag into a load folder"
          onPointerDown={(event) => beginDrag(event, documentItem)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span>FILE</span>
          <i aria-hidden="true">⋮⋮</i>
        </button>
      </article>
    )
  }

  return (
    <div className="phone-page documents-screen filing-cabinet-screen">
      <header className="documents-toolbar filing-toolbar">
        <button
          type="button"
          className="documents-back"
          onClick={onBack}
          aria-label="Back to phone home"
        >
          ‹
        </button>

        <div>
          <span className="documents-toolbar-kicker">DOCUMENT CONTROL</span>
          <strong>File Cabinet</strong>
        </div>

        <div className="filing-incoming-count">
          <span>UNFILED</span>
          <strong>{incomingDocuments.length + outgoingDocuments.length}</strong>
        </div>
      </header>

      <div className="filing-scroll">
        <section className="filing-intro">
          <span>OPERATIONS FILING</span>
          <h2>Incoming Paperwork</h2>
          <p>
            Review loose paperwork here, then move to the Filing Desk to place
            each physical document into the correct manila load file.
          </p>

          {(incomingDocuments.length + outgoingDocuments.length) > 0 && (
            <button
              type="button"
              className="filing-start-desk"
              onClick={onStartFiling}
            >
              <strong>FILE INCOMING</strong>
              <span>{incomingDocuments.length + outgoingDocuments.length}</span>
            </button>
          )}
        </section>

        <section className="filing-tray" aria-label="Incoming documents">
          <header>
            <div>
              <span>INCOMING TRAY</span>
              <strong>{incomingDocuments.length}</strong>
            </div>
            <small>Carrier & delivery paperwork</small>
          </header>

          <div className="filing-loose-list">
            {incomingDocuments.length
              ? incomingDocuments.map(renderLooseDocument)
              : (
                <div className="filing-empty-tray">
                  <strong>Incoming tray clear</strong>
                  <span>No loose carrier or delivery paperwork is waiting to be filed.</span>
                </div>
              )}
          </div>
        </section>

        {outgoingDocuments.length > 0 && (
          <section className="filing-tray outgoing" aria-label="Outgoing file copies">
            <header>
              <div>
                <span>OUTGOING FILE COPIES</span>
                <strong>{outgoingDocuments.length}</strong>
              </div>
              <small>Invoices created by your operation</small>
            </header>

            <div className="filing-loose-list">
              {outgoingDocuments.map(renderLooseDocument)}
            </div>
          </section>
        )}

        <section className="filing-cabinet" aria-label="Load file cabinet">
          <header className="filing-cabinet-heading">
            <div>
              <span>FILE CABINET</span>
              <h2>Load Files</h2>
            </div>

            {selectedDocumentId && (
              <small>Tap a folder to file selected paper</small>
            )}
          </header>

          <div className="filing-folder-grid">
            {loadFolders.map((load) => {
              const filedIds = load.documentFiling?.filedDocumentIds || []
              const lifecycle = getLoadFolderLifecycle(
                load,
                ledgerWorkflowByLoadId,
                loads
              )
              const sourceDocs = fileableDocuments.filter(
                (document) => document.sourceLoadId === load.id
              )
              const expectedLooseCount = sourceDocs.length
              const nativeFiled = filedIds.filter((id) =>
                sourceDocs.some((document) => document.id === id)
              ).length
              const wrongFiled = filedIds.length - nativeFiled
              const highlighted = hoverFolderId === load.id
              const canFile = Boolean(selectedDocumentId)

              return (
                <article
                  key={load.id}
                  className={`filing-load-folder ${highlighted ? 'drop-target' : ''} ${canFile ? 'file-ready' : ''}`}
                  data-load-folder-id={load.id}
                >
                  <button
                    type="button"
                    className="filing-folder-face"
                    onClick={() => {
                      if (selectedDocumentId) {
                        fileSelectedInto(load.id)
                        return
                      }
                      onOpenFolder?.(load.id)
                    }}
                  >
                    <span className="filing-folder-tab">
                      {load.loadNumber || load.id}
                    </span>

                    <span className="filing-folder-copy">
                      <strong>{getFreightRouteName(load)}</strong>
                      <small>{lifecycle.label}</small>
                    </span>

                    <span className="filing-folder-count">
                      <b>{filedIds.length + 1}</b>
                      <small>paper{filedIds.length + 1 === 1 ? '' : 's'}</small>
                    </span>

                    {wrongFiled > 0 && (
                      <span className="filing-folder-neutral-note">
                        Mixed references
                      </span>
                    )}

                    <span className={`filing-folder-lifecycle state-${lifecycle.id}`}>
                      {lifecycle.label}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="filing-folder-open-load"
                    onClick={() => onOpenLoad?.(load.id)}
                  >
                    LOAD
                  </button>
                </article>
              )
            })}

            {loadFolders.length === 0 && (
              <div className="filing-empty-cabinet">
                <strong>No load files yet</strong>
                <span>Booked freight will create a manila load folder.</span>
              </div>
            )}
          </div>
        </section>

        {businessDocuments.length > 0 && (
          <section className="filing-carrier-files">
            <header>
              <span>CARRIER FILES</span>
              <strong>Business Documents</strong>
            </header>

            {businessDocuments.map((documentItem) => (
              <button
                type="button"
                key={documentItem.id}
                onClick={() => onOpenBusinessDocument?.(documentItem.id)}
              >
                <span>DOC</span>
                <div>
                  <strong>{documentItem.title || `${documentItem.carrierName || 'Carrier'} Agreement`}</strong>
                  <small>{documentItem.status || 'ACTIVE'}</small>
                </div>
                <b>›</b>
              </button>
            ))}
          </section>
        )}
      </div>

      {draggingDocumentId && dragPoint && (
        <div
          className="filing-drag-ghost"
          style={{
            transform: `translate3d(${dragPoint.x + 10}px, ${dragPoint.y + 10}px, 0)`,
          }}
          aria-hidden="true"
        >
          <span>
            {shortType(
              fileableDocuments.find((item) => item.id === draggingDocumentId)?.type
            )}
          </span>
          <strong>
            {fileableDocuments.find((item) => item.id === draggingDocumentId)?.title}
          </strong>
        </div>
      )}
    </div>
  )
}

export default DocumentFilingCabinetScreen
