import { useEffect, useRef, useState } from 'react'
import './CareerSetupScreen.css'

// P2.4.4.3 — Create Your Dispatch workstation setup
// Keeps the existing profile/save authority while replacing the legacy onboarding-card UI.
function CareerSetupScreen({ profile = null, onBack, onContinue }) {
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    businessName: profile?.businessName || '',
  })
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  const screenRef = useRef(null)
  const businessRef = useRef(null)
  const submitLockRef = useRef(false)

  const dispatcherName = form.displayName.trim()
  const businessName = form.businessName.trim()
  const completedFields = [dispatcherName, businessName].filter((value) => value.length >= 2).length
  const ready = completedFields === 2

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
      className={`career-setup-d434c ${keyboardOpen ? 'keyboard-open' : ''}`}
    >
      <header className="career-systembar-d434c">
        <button className="career-back-d434c" type="button" onClick={onBack} aria-label="Back to title">
          <span aria-hidden="true">‹</span>
        </button>

        <div className="career-system-id-d434c">
          <div className="career-mini-mark-d434c" aria-label="DOC OS">
            <b>DOC</b><i>OS</i>
          </div>
          <span>NEW OPERATION</span>
        </div>

        <div className="career-step-d434c" aria-label="Step 1 of 2">
          <span>01 / 02</span>
          <div aria-hidden="true"><i /><i /></div>
        </div>
      </header>

      <main className="career-main-d434c">
        <div className="career-workspace-d434c">
          <section className="career-intro-d434c">
            <span>WORKSTATION SETUP</span>
            <h1>Create your dispatch</h1>
            <p>Set the operator and business identity DOC OS will use across this operation.</p>
          </section>

          <form className="career-profile-panel-d434c" onSubmit={submit}>
            <div className="career-panel-head-d434c">
              <div>
                <span>OPERATION IDENTITY</span>
                <small>Required to continue</small>
              </div>
              <strong>{completedFields}/2</strong>
            </div>

            <label className={`career-field-d434c ${dispatcherName.length >= 2 ? 'complete' : ''}`}>
              <div className="career-field-label-d434c">
                <span><b>01</b> Dispatcher name</span>
                <small>{dispatcherName.length >= 2 ? 'READY' : 'REQUIRED'}</small>
              </div>
              <input
                value={form.displayName}
                onChange={(event) => update('displayName', event.target.value)}
                onFocus={(event) => revealField(event.currentTarget)}
                onKeyDown={handleNameKeyDown}
                placeholder="Maxx"
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
              />
              <p>Shown to carriers and drivers.</p>
            </label>

            <div className="career-field-rule-d434c" />

            <label className={`career-field-d434c ${businessName.length >= 2 ? 'complete' : ''}`}>
              <div className="career-field-label-d434c">
                <span><b>02</b> Business name</span>
                <small>{businessName.length >= 2 ? 'READY' : 'REQUIRED'}</small>
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
              <p>Used on agreements, billing and DOC OS records.</p>
            </label>

            <div className="career-business-row-d434c">
              <div>
                <span>BUSINESS MODEL</span>
                <strong>Independent Dispatch</strong>
              </div>
              <small>PRESET</small>
            </div>
          </form>

          <div className="career-action-d434c">
            <div className="career-next-d434c">
              <span>NEXT</span>
              <strong>Starting market</strong>
            </div>
            <button
              type="button"
              disabled={!ready}
              onClick={continueToMarket}
            >
              <span>CONTINUE</span>
              <b aria-hidden="true">→</b>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CareerSetupScreen
