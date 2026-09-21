import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// B.5.4C.3A — Physical Paper Foundation
function DocumentZoomOverlay({
  title = 'Document',
  eyebrow = 'DOC OS DOCUMENT',
  onClose,
  children,
  footer = null,
  variant = 'default',
}) {
  const [closing, setClosing] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
  }, [])

  const requestClose = () => {
    if (variant !== 'paper') {
      onClose?.()
      return
    }

    if (closing) return

    setClosing(true)

    closeTimerRef.current = window.setTimeout(() => {
      onClose?.()
    }, 175)
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className={`document-zoom-overlay${variant === 'paper' ? ' paperwork-sheet' : ''}${closing ? ' closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} expanded document`}
    >
      <div className="document-zoom-shell">
        <header className="document-zoom-toolbar"><div><span>{eyebrow}</span><strong>{title}</strong></div><button type="button" onClick={requestClose} aria-label="Close expanded document">×</button></header>
        <div className="document-zoom-scroll">{children}</div>
        {footer && <div className="document-zoom-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export default DocumentZoomOverlay
