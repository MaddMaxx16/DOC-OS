import { createPortal } from 'react-dom'

function DocumentZoomOverlay({ title = 'Document', eyebrow = 'DOC OS DOCUMENT', onClose, children, footer = null }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="document-zoom-overlay" role="dialog" aria-modal="true" aria-label={`${title} expanded document`}>
      <div className="document-zoom-shell">
        <header className="document-zoom-toolbar"><div><span>{eyebrow}</span><strong>{title}</strong></div><button type="button" onClick={onClose} aria-label="Close expanded document">×</button></header>
        <div className="document-zoom-scroll">{children}</div>
        {footer && <div className="document-zoom-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export default DocumentZoomOverlay
