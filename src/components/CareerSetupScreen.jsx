import { useEffect, useRef, useState } from 'react'

// B.5.4D.4.3.4A — Create Your Dispatch Mobile Rebuild
// B.5.4D.4.3.4B — Startup Layout Refinement
function CareerSetupScreen({ profile = null, onBack, onContinue }) {
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    businessName: profile?.businessName || '',
  })
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  const screenRef = useRef(null)
  const nameRef = useRef(null)
  const businessRef = useRef(null)
  const submitLockRef = useRef(false)

  const dispatcherName = form.displayName.trim()
  const businessName = form.businessName.trim()
  const ready = dispatcherName.length >= 2 && businessName.length >= 2

  const update = (key, value) => {
    submitLockRef.current = false
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    const viewport = window.visualViewport
    const target = screenRef.current

    const syncViewport = () => {
      if (!target) return

      const visualHeight = viewport?.height || window.innerHeight
      const visualTop = viewport?.offsetTop || 0
      const layoutHeight = window.innerHeight || visualHeight
      const keyboardHeight = Math.max(0, layoutHeight - visualHeight - visualTop)

      target.style.setProperty('--career-vv-height', `${visualHeight}px`)
      target.style.setProperty('--career-vv-top', `${visualTop}px`)
      target.style.setProperty('--career-keyboard-height', `${keyboardHeight}px`)

      setKeyboardOpen(keyboardHeight > 100 || visualHeight < layoutHeight * 0.82)
    }

    syncViewport()
    viewport?.addEventListener('resize', syncViewport)
    viewport?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)

    return () => {
      viewport?.removeEventListener('resize', syncViewport)
      viewport?.removeEventListener('scroll', syncViewport)
      window.removeEventListener('resize', syncViewport)
    }
  }, [])

  const revealField = (field) => {
    window.setTimeout(() => {
      field?.scrollIntoView?.({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      })
    }, 140)
  }

  const continueToMarket = () => {
    if (!ready || submitLockRef.current) return
    submitLockRef.current = true

    const active = document.activeElement
    if (active && typeof active.blur === 'function') active.blur()

    const nextProfile = {
      ...(profile || {}),
      displayName: dispatcherName,
      businessName,
      businessType: profile?.businessType || 'Independent Dispatch',
      created: true,
    }

    window.requestAnimationFrame(() => onContinue?.(nextProfile))
  }

  const submit = (event) => {
    event?.preventDefault?.()
    continueToMarket()
  }

  const handleNameKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    businessRef.current?.focus()
    revealField(businessRef.current)
  }

  const handleBusinessKeyDown = (event) => {
    if (event.key !== 'Enter' || !ready) return
    event.preventDefault()
    continueToMarket()
  }

  return (
    <div
      ref={screenRef}
      className={`career-setup-screen career-setup-d434a ${keyboardOpen ? 'keyboard-open' : ''}`}
    >
      <header className="career-setup-nav-d434a">
        <button type="button" onClick={onBack} aria-label="Back to title">
          ‹ <span>BACK</span>
        </button>

        <div>
          <span>NEW OPERATION</span>
          <strong>IDENTITY</strong>
        </div>

        <small>STEP 1 OF 2</small>
      </header>

      <main className="career-setup-scroll-d434a">
        <section className="career-setup-intro-d434a">
          <span>OPERATION SETUP</span>
          <h1>Create Your Dispatch</h1>
          <p>
            Set the identity that carriers, drivers, agreements and billing will use
            throughout this operation.
          </p>
        </section>

        <form
          id="career-operation-form-d434a"
          className="career-setup-form-d434a"
          onSubmit={submit}
        >
          <label className={`career-input-card-d434a ${dispatcherName ? 'complete' : ''}`}>
            <div className="career-input-label-d434a">
              <span><b>01</b> YOUR NAME</span>
              <small>{dispatcherName ? 'READY' : 'REQUIRED'}</small>
            </div>

            <input
              ref={nameRef}
              value={form.displayName}
              onChange={(event) => update('displayName', event.target.value)}
              onFocus={(event) => revealField(event.currentTarget)}
              onKeyDown={handleNameKeyDown}
              placeholder="Maxx"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
            />

            <p>The name carriers and drivers will see.</p>
          </label>

          <label className={`career-input-card-d434a ${businessName ? 'complete' : ''}`}>
            <div className="career-input-label-d434a">
              <span><b>02</b> BUSINESS NAME</span>
              <small>{businessName ? 'READY' : 'REQUIRED'}</small>
            </div>

            <input
              ref={businessRef}
              value={form.businessName}
              onChange={(event) => update('businessName', event.target.value)}
              onFocus={(event) => revealField(event.currentTarget)}
              onKeyDown={handleBusinessKeyDown}
              placeholder="Northstar Dispatch"
              autoComplete="organization"
              autoCapitalize="words"
              enterKeyHint={ready ? 'go' : 'done'}
            />

            <p>Your dispatch business across DOC OS.</p>
          </label>

          <section className="career-business-type-d434a" aria-label="Business type">
            <div>
              <span>BUSINESS TYPE</span>
              <strong>Independent Dispatch</strong>
            </div>
            <small>Carrier coordination · freight planning · driver support</small>
          </section>

        </form>
      </main>

      <footer className="career-setup-footer-d434a">
        <div className="career-footer-identity-d434b">
          <span>{ready ? 'READY TO CONTINUE' : 'SETUP PROGRESS'}</span>
          <strong>
            {ready
              ? businessName
              : `${[dispatcherName, businessName].filter(Boolean).length} OF 2 COMPLETE`}
          </strong>
          <small>
            {ready
              ? `Operated by ${dispatcherName}`
              : 'Complete your operation identity'}
          </small>
        </div>

        <button
          type="button"
          className="career-continue-d434a"
          disabled={!ready}
          onPointerDown={(event) => {
            if (!ready) return
            event.preventDefault()
            continueToMarket()
          }}
          onClick={(event) => {
            if (!ready || submitLockRef.current) {
              event.preventDefault()
              return
            }
            continueToMarket()
          }}
        >
          <span>CONTINUE TO MARKET</span>
          <b aria-hidden="true">→</b>
        </button>
      </footer>
    </div>
  )
}

export default CareerSetupScreen
