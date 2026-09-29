import { useEffect, useRef, useState } from 'react'
import PlayerAvatar, {
  APPEARANCE_CATEGORIES,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
} from './PlayerAvatar'
import './CareerSetupScreen.css'
import './CareerSetupScreen.p2443a.css'
import './CareerLookCreator.css'

// P2.4.4.3A/B — Create Player
// Step 01 owns player-facing identity. Step 02 owns appearance.
// Metroline is fixed to the New York market; market selection is not part of onboarding.
function CareerSetupScreen({ profile = null, onBack }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)
  const [phase, setPhase] = useState('name')
  const [appearance, setAppearance] = useState(() => ({
    ...DEFAULT_APPEARANCE,
    ...(profile?.appearance || {}),
  }))
  const [appearanceCategory, setAppearanceCategory] = useState('skinTone')
  const [avatarDebug, setAvatarDebug] = useState({ stage: 'waiting' })

  const screenRef = useRef(null)
  const nameRef = useRef(null)
  const submitLockRef = useRef(false)

  const playerName = displayName.trim()
  const ready = playerName.length >= 2
  const keyboardMode = keyboardOpen || nameFocused

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
    setNameFocused(true)

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
    setNameFocused(false)

    window.requestAnimationFrame(() => {
      setPhase('look')
      submitLockRef.current = false
    })
  }

  const submit = (event) => {
    event?.preventDefault?.()
    continueToLook()
  }

  const setAppearanceValue = (key, value) => {
    setAppearance((current) => ({ ...current, [key]: value }))
  }

  const randomizeAppearance = () => {
    const next = { ...appearance }

    APPEARANCE_CATEGORIES.forEach(({ key }) => {
      const options = APPEARANCE_OPTIONS[key]
      next[key] = options[Math.floor(Math.random() * options.length)].value
    })

    setAppearance(next)
  }

  const resetAppearance = () => {
    setAppearance({ ...DEFAULT_APPEARANCE })
    setAppearanceCategory('skinTone')
  }

  if (phase === 'firstDayPending') {
    return (
      <div ref={screenRef} className="career-setup-d434c career-look-handoff-d434c">
        <header className="career-systembar-d434c">
          <button
            className="career-back-d434c"
            type="button"
            onClick={() => setPhase('look')}
            aria-label="Back to your look"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="career-system-id-d434c">
            <div className="career-mini-mark-d434c" aria-label="DOC OS">
              <b>DOC</b><i>OS</i>
            </div>
            <span>EMPLOYEE ONBOARDING</span>
          </div>

          <div className="career-step-d434c" aria-label="Onboarding complete">
            <span>02 / 02</span>
            <div aria-hidden="true"><i /><i className="active" /></div>
          </div>
        </header>

        <main className="career-look-handoff-main-d434c">
          <span>ONBOARDING COMPLETE</span>
          <h1>First Day</h1>
          <p>{playerName}, your Metroline employee profile is ready. Your first shift comes next.</p>
          <small>NEXT EXPERIENCE · NOT BUILT YET</small>
        </main>
      </div>
    )
  }

  if (phase === 'look') {
    const activeOptions = APPEARANCE_OPTIONS[appearanceCategory]
    const activeCategoryLabel = APPEARANCE_CATEGORIES.find(
      ({ key }) => key === appearanceCategory,
    )?.label

    return (
      <div ref={screenRef} className="career-setup-d434c career-look-creator-d434c">
        <header className="career-systembar-d434c">
          <button
            className="career-back-d434c"
            type="button"
            onClick={() => setPhase('name')}
            aria-label="Back to your name"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="career-system-id-d434c">
            <div className="career-mini-mark-d434c" aria-label="DOC OS">
              <b>DOC</b><i>OS</i>
            </div>
            <span>EMPLOYEE ONBOARDING</span>
          </div>

          <div className="career-step-d434c" aria-label="Step 2 of 2">
            <span>02 / 02</span>
            <div aria-hidden="true"><i /><i className="active" /></div>
          </div>
        </header>

        <main className="career-look-main-d434c">
          <div className="career-look-workspace-d434c">
            <section className="career-look-intro-d434c">
              <span>CREATE PLAYER · YOUR LOOK</span>
              <h1>Let’s get your employee photo ready.</h1>
              <p>Create the employee photo that will appear on your Metroline profile.</p>
            </section>

            <section className="career-photo-card-d434c" aria-label={`${playerName} employee photo`}>
              <div className="career-photo-stage-d434c">
                <div className="career-photo-frame-d434c">
                  <PlayerAvatar appearance={appearance} onDebug={setAvatarDebug} />
                </div>
                <div className="career-photo-status-d434c">
                  <span>EMPLOYEE PHOTO</span>
                </div>
              </div>

              <div className="career-photo-copy-d434c">
                <span>METROLINE TRANSPORT</span>
                <strong>{playerName}</strong>
                <small>Junior Dispatcher · New Hire</small>
                <div>
                  <button type="button" onClick={randomizeAppearance}>RANDOMIZE</button>
                  <button type="button" onClick={resetAppearance}>RESET</button>
                </div>
              </div>
            </section>

            <section className="career-avatar-debug-d434c" aria-label="Skin tone renderer diagnostics">
              <div className="career-avatar-debug-head-d434c">
                <span>DEBUG · SKIN PIPELINE</span>
                <strong>{avatarDebug?.stage || 'waiting'}</strong>
              </div>
              <div className="career-avatar-debug-grid-d434c">
                <span>UI SELECTED</span><b>{appearance.skinTone}</b>
                <span>AVATAR RECEIVED</span><b>{avatarDebug?.skinTone || '—'}</b>
                <span>MASK PIXELS</span><b>{avatarDebug?.maskedPixels ?? '—'}</b>
                <span>SKIN-GRADED</span><b>{avatarDebug?.gradedPixels ?? '—'}</b>
                <span>DETAIL PROTECTED</span><b>{avatarDebug?.protectedPixels ?? '—'}</b>
                <span>CHANGED PIXELS</span><b>{avatarDebug?.changedPixels ?? '—'}</b>
                <span>AVG DELTA</span><b>{avatarDebug?.averageDelta ?? '—'}</b>
                <span>CANVAS</span><b>{avatarDebug?.canvas || '—'}</b>
                {avatarDebug?.error && (
                  <>
                    <span>ERROR</span><b className="error">{avatarDebug.error}</b>
                  </>
                )}
              </div>
            </section>

            <nav className="career-look-tabs-d434c" aria-label="Appearance categories">
              {APPEARANCE_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={appearanceCategory === category.key ? 'active' : ''}
                  onClick={() => setAppearanceCategory(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </nav>

            <section className="career-look-options-d434c">
              <div className="career-look-options-head-d434c">
                <div>
                  <span>CUSTOMIZE</span>
                  <strong>{activeCategoryLabel}</strong>
                </div>
                <small>{activeOptions.length} OPTIONS</small>
              </div>

              <div className="career-look-option-grid-d434c">
                {activeOptions.map((option) => {
                  const selected = appearance[appearanceCategory] === option.value
                  const colorOption = Boolean(option.color)

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`${selected ? 'selected' : ''} ${colorOption ? 'color-option' : ''}`}
                      onClick={() => setAppearanceValue(appearanceCategory, option.value)}
                      aria-pressed={selected}
                    >
                      {colorOption && (
                        <i
                          aria-hidden="true"
                          style={{ '--option-color': option.color }}
                        />
                      )}
                      <span>{option.label}</span>
                      {selected && <b aria-hidden="true">✓</b>}
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="career-look-action-d434c">
              <div>
                <span>NEXT</span>
                <strong>First Day</strong>
              </div>
              <button type="button" onClick={() => setPhase('firstDayPending')}>
                <span>CONTINUE</span>
                <b aria-hidden="true">→</b>
              </button>
            </div>

            <p className="career-look-footnote-d434c">
              Metroline employee profile · DOC OS personnel record
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      ref={screenRef}
      className={`career-setup-d434c ${keyboardMode ? 'keyboard-open' : ''}`}
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

        <div className="career-step-d434c" aria-label="Step 1 of 2">
          <span>01 / 02</span>
          <div aria-hidden="true"><i /><i /></div>
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
            <p>Let’s get your employee profile started.</p>
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
                onBlur={() => setNameFocused(false)}
                placeholder="Enter your name"
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
