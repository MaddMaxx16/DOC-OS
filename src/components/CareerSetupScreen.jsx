import { useEffect, useRef, useState } from 'react'
import './CareerSetupScreen.css'

// P2.4.4.3A — Create Player / Your Name
// Employee-career identity setup. Keep this screen intentionally narrow:
// one player-facing field, keyboard-safe on iOS, no legacy business setup.
function CareerSetupScreen({ profile = null, onBack, onContinue }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  const screenRef = useRef(null)
  const nameRef = useRef(null)
  const submitLockRef = useRef(false)

  const playerName = displayName.trim()
  const ready = playerName.length >= 2

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

  const revealName = () => {
    window.setTimeout(() => {
      nameRef.current?.scrollIntoView?.({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      })
    }, 140)
  }

  const continueToLook = () => {
    if (!ready || submitLockRef.current) return
    submitLockRef.current = true

    const active = document.activeElement
    if (active && typeof active.blur === 'function') active.blur()

    const nextProfile = {
      ...(profile || {}),
      displayName: playerName,
      employerId: profile?.employerId || 'metroline',
      employerName: profile?.employerName || 'Metroline Transport',
      roleTitle: profile?.roleTitle || 'Junior Dispatcher',
      created: false,
    }

    window.requestAnimationFrame(() => onContinue?.(nextProfile))
  }

  const submit = (event) => {
    event?.preventDefault?.()
    continueToLook()
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
          <span>EMPLOYEE ONBOARDING</span>
        </div>

        <div className="career-step-d434c" aria-label="Step 1 of 3">
          <span>01 / 03</span>
          <div aria-hidden="true"><i /><i /><i /></div>
        </div>
      </header>

      <main className="career-main-d434c">
        <div className="career-workspace-d434c">
          <section className="career-company-d434c" aria-label="Metroline Transport new employee registration">
            <div className="career-company-mark-d434c" aria-hidden="true">
              <span>M</span>
            </div>
            <div>
              <span>METROLINE TRANSPORT</span>
              <strong>New Employee Registration</strong>
            </div>
            <small>NEW HIRE</small>
          </section>

          <section className="career-intro-d434c">
            <span>CREATE PLAYER · YOUR NAME</span>
            <h1>What should we call you?</h1>
            <p>This is the name your team will use throughout DOC OS.</p>
          </section>

          <form className="career-profile-panel-d434c" onSubmit={submit}>
            <label className={`career-field-d434c ${ready ? 'complete' : ''}`}>
              <div className="career-field-label-d434c">
                <span>YOUR NAME</span>
                <small>{ready ? 'READY' : 'REQUIRED'}</small>
              </div>
              <input
                ref={nameRef}
                value={displayName}
                onChange={(event) => {
                  submitLockRef.current = false
                  setDisplayName(event.target.value)
                }}
                onFocus={revealName}
                placeholder="Maxx"
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="go"
                aria-label="Your name"
              />
              <p>You can change this later from your player profile.</p>
            </label>

            <section className="career-employee-preview-d434c" aria-label="Employee profile preview">
              <div className="career-id-avatar-d434c" aria-hidden="true">
                <span />
                <i />
              </div>

              <div className="career-id-copy-d434c">
                <span>EMPLOYEE PROFILE</span>
                <strong>{playerName || 'New Dispatcher'}</strong>
                <small>Metroline Transport</small>
              </div>

              <div className="career-id-status-d434c">
                <span>POSITION</span>
                <strong>Junior Dispatcher</strong>
              </div>
            </section>
          </form>

          <div className="career-action-d434c">
            <div className="career-next-d434c">
              <span>NEXT</span>
              <strong>Your Look</strong>
            </div>
            <button type="button" disabled={!ready} onClick={continueToLook}>
              <span>CONTINUE</span>
              <b aria-hidden="true">→</b>
            </button>
          </div>

          <p className="career-footnote-d434c">
            Metroline employee profile · DOC OS personnel record
          </p>
        </div>
      </main>
    </div>
  )
}

export default CareerSetupScreen
