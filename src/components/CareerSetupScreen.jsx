import { useEffect, useRef, useState } from 'react'
import PlayerAvatar, {
  APPEARANCE_CATEGORIES,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
} from './PlayerAvatar'
import './CareerSetupScreen.css'
import './CareerLookCreator.css'
import EmployeeIdWelcome from './EmployeeIdWelcome.jsx'

const HAIR_OPTIONS_PER_PAGE = 8
const HAIR_COLOR_OPTIONS_PER_PAGE = 6
const BROW_OPTIONS_PER_PAGE = 8
const EYE_OPTIONS_PER_PAGE = 8
const MOUTH_OPTIONS_PER_PAGE = 8
const FACIAL_HAIR_OPTIONS_PER_PAGE = 8
const GLASSES_OPTIONS_PER_PAGE = 8
const ACCESSORY_OPTIONS_PER_PAGE = 8
const HEADWEAR_OPTIONS_PER_PAGE = 8
const OUTFIT_OPTIONS_PER_PAGE = 8
const CLOTHING_COLOR_OPTIONS_PER_PAGE = 6
const ACCESSORY_SIDE_OPTIONS = [
  { value: 'left', label: 'LEFT' },
  { value: 'both', label: 'BOTH' },
  { value: 'right', label: 'RIGHT' },
]

// P2.4.4.3A/B — Create Player
// Step 01 owns player-facing identity. Step 02 owns appearance.
// Metroline is fixed to the New York market; market selection is not part of onboarding.
function CareerSetupScreen({ profile = null, initialPhase = 'name', onSaveProfile, onStartFirstDay, onBack }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)
  const [phase, setPhase] = useState(() => (
    initialPhase === 'employeeWelcome' && profile?.displayName?.trim().length >= 2
      ? 'employeeWelcome'
      : 'name'
  ))
  const [appearance, setAppearance] = useState(() => ({
    ...DEFAULT_APPEARANCE,
    ...(profile?.appearance || {}),
  }))
  const [appearanceCategory, setAppearanceCategory] = useState('skinTone')
  const [hairPage, setHairPage] = useState(0)
  const [hairColorPage, setHairColorPage] = useState(0)
  const [browPage, setBrowPage] = useState(0)
  const [eyePage, setEyePage] = useState(0)
  const [mouthPage, setMouthPage] = useState(0)
  const [facialHairPage, setFacialHairPage] = useState(0)
  const [glassesPage, setGlassesPage] = useState(0)
  const [accessoryPage, setAccessoryPage] = useState(0)
  const [headwearPage, setHeadwearPage] = useState(0)
  const [outfitPage, setOutfitPage] = useState(0)
  const [clothingColorPage, setClothingColorPage] = useState(0)

  const screenRef = useRef(null)
  const nameRef = useRef(null)
  const submitLockRef = useRef(false)
  const optionSwipeRef = useRef(null)

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

  const optionPageForValue = (key, value, perPage) => {
    const index = APPEARANCE_OPTIONS[key].findIndex((option) => option.value === value)
    return Math.max(0, Math.floor(Math.max(0, index) / perPage))
  }

  const hairPageForValue = (value) => (
    optionPageForValue('hair', value, HAIR_OPTIONS_PER_PAGE)
  )

  const hairColorPageForValue = (value) => (
    optionPageForValue('hairColor', value, HAIR_COLOR_OPTIONS_PER_PAGE)
  )

  const browPageForValue = (value) => (
    optionPageForValue('brows', value, BROW_OPTIONS_PER_PAGE)
  )

  const eyePageForValue = (value) => (
    optionPageForValue('eyes', value, EYE_OPTIONS_PER_PAGE)
  )

  const mouthPageForValue = (value) => (
    optionPageForValue('mouth', value, MOUTH_OPTIONS_PER_PAGE)
  )

  const facialHairPageForValue = (value) => (
    optionPageForValue('facialHair', value, FACIAL_HAIR_OPTIONS_PER_PAGE)
  )

  const glassesPageForValue = (value) => (
    optionPageForValue('glasses', value, GLASSES_OPTIONS_PER_PAGE)
  )

  const accessoryPageForValue = (value) => (
    optionPageForValue('accessories', value, ACCESSORY_OPTIONS_PER_PAGE)
  )

  const headwearPageForValue = (value) => (
    optionPageForValue('headwear', value, HEADWEAR_OPTIONS_PER_PAGE)
  )

  const outfitPageForValue = (value) => (
    optionPageForValue('outfit', value, OUTFIT_OPTIONS_PER_PAGE)
  )

  const clothingColorPageForValue = (value) => (
    optionPageForValue('clothingColor', value, CLOTHING_COLOR_OPTIONS_PER_PAGE)
  )

  const setAppearanceValue = (key, value) => {
    setAppearance((current) => ({ ...current, [key]: value }))
    if (key === 'hair') setHairPage(hairPageForValue(value))
    if (key === 'hairColor') setHairColorPage(hairColorPageForValue(value))
    if (key === 'brows') setBrowPage(browPageForValue(value))
    if (key === 'eyes') setEyePage(eyePageForValue(value))
    if (key === 'mouth') setMouthPage(mouthPageForValue(value))
    if (key === 'facialHair') setFacialHairPage(facialHairPageForValue(value))
    if (key === 'glasses') setGlassesPage(glassesPageForValue(value))
    if (key === 'accessories') setAccessoryPage(accessoryPageForValue(value))
    if (key === 'headwear') setHeadwearPage(headwearPageForValue(value))
    if (key === 'outfit') setOutfitPage(outfitPageForValue(value))
    if (key === 'clothingColor') setClothingColorPage(clothingColorPageForValue(value))
  }

  const selectAppearanceCategory = (key) => {
    setAppearanceCategory(key)
    if (key === 'hair') setHairPage(hairPageForValue(appearance.hair))
    if (key === 'hairColor') setHairColorPage(hairColorPageForValue(appearance.hairColor))
    if (key === 'brows') setBrowPage(browPageForValue(appearance.brows))
    if (key === 'eyes') setEyePage(eyePageForValue(appearance.eyes))
    if (key === 'mouth') setMouthPage(mouthPageForValue(appearance.mouth))
    if (key === 'facialHair') {
      setFacialHairPage(facialHairPageForValue(appearance.facialHair))
    }
    if (key === 'glasses') setGlassesPage(glassesPageForValue(appearance.glasses))
    if (key === 'accessories') setAccessoryPage(accessoryPageForValue(appearance.accessories))
    if (key === 'headwear') setHeadwearPage(headwearPageForValue(appearance.headwear))
    if (key === 'outfit') setOutfitPage(outfitPageForValue(appearance.outfit))
    if (key === 'clothingColor') {
      setClothingColorPage(clothingColorPageForValue(appearance.clothingColor))
    }
  }

  const randomizeAppearance = () => {
    const next = { ...appearance }

    APPEARANCE_CATEGORIES.forEach(({ key }) => {
      const options = APPEARANCE_OPTIONS[key]
      // P2.4.4.3B.15.7 — Randomize is a stress-test path. Never let a
      // missing/empty option group turn one tap into a creator-wide crash.
      if (!Array.isArray(options) || options.length === 0) return
      const choice = options[Math.floor(Math.random() * options.length)]
      if (choice?.value !== undefined) next[key] = choice.value
    })

    // P2.4.4.3B.16.4 — Frame color is a compact Glasses sub-control rather
    // than another top-level category, but Randomize should still exercise it.
    const frameColors = APPEARANCE_OPTIONS.glassesColor
    if (Array.isArray(frameColors) && frameColors.length > 0) {
      next.glassesColor = frameColors[Math.floor(Math.random() * frameColors.length)].value
    }

    next.accessorySide = next.accessories === 'none'
      ? 'both'
      : ACCESSORY_SIDE_OPTIONS[Math.floor(Math.random() * ACCESSORY_SIDE_OPTIONS.length)].value

    setAppearance(next)
    if (appearanceCategory === 'hair') setHairPage(hairPageForValue(next.hair))
    if (appearanceCategory === 'hairColor') {
      setHairColorPage(hairColorPageForValue(next.hairColor))
    }
    if (appearanceCategory === 'brows') setBrowPage(browPageForValue(next.brows))
    if (appearanceCategory === 'eyes') setEyePage(eyePageForValue(next.eyes))
    if (appearanceCategory === 'mouth') setMouthPage(mouthPageForValue(next.mouth))
    if (appearanceCategory === 'facialHair') {
      setFacialHairPage(facialHairPageForValue(next.facialHair))
    }
    if (appearanceCategory === 'glasses') setGlassesPage(glassesPageForValue(next.glasses))
    if (appearanceCategory === 'accessories') setAccessoryPage(accessoryPageForValue(next.accessories))
    if (appearanceCategory === 'headwear') setHeadwearPage(headwearPageForValue(next.headwear))
    if (appearanceCategory === 'outfit') setOutfitPage(outfitPageForValue(next.outfit))
    if (appearanceCategory === 'clothingColor') {
      setClothingColorPage(clothingColorPageForValue(next.clothingColor))
    }
  }

  const resetAppearance = () => {
    setAppearance({ ...DEFAULT_APPEARANCE })
    setAppearanceCategory('skinTone')
    setHairPage(hairPageForValue(DEFAULT_APPEARANCE.hair))
    setHairColorPage(hairColorPageForValue(DEFAULT_APPEARANCE.hairColor))
    setBrowPage(browPageForValue(DEFAULT_APPEARANCE.brows))
    setEyePage(eyePageForValue(DEFAULT_APPEARANCE.eyes))
    setMouthPage(mouthPageForValue(DEFAULT_APPEARANCE.mouth))
    setFacialHairPage(facialHairPageForValue(DEFAULT_APPEARANCE.facialHair))
    setGlassesPage(glassesPageForValue(DEFAULT_APPEARANCE.glasses))
    setAccessoryPage(accessoryPageForValue(DEFAULT_APPEARANCE.accessories))
    setHeadwearPage(headwearPageForValue(DEFAULT_APPEARANCE.headwear))
    setOutfitPage(outfitPageForValue(DEFAULT_APPEARANCE.outfit))
    setClothingColorPage(clothingColorPageForValue(DEFAULT_APPEARANCE.clothingColor))
  }

  const startOptionSwipe = (event) => {
    if (
      appearanceCategory !== 'hair' &&
      appearanceCategory !== 'hairColor' &&
      appearanceCategory !== 'brows' &&
      appearanceCategory !== 'eyes' &&
      appearanceCategory !== 'mouth' &&
      appearanceCategory !== 'facialHair' &&
      appearanceCategory !== 'glasses' &&
      appearanceCategory !== 'accessories' &&
      appearanceCategory !== 'headwear' &&
      appearanceCategory !== 'outfit' &&
      appearanceCategory !== 'clothingColor'
    ) return
    const touch = event.touches?.[0]
    if (!touch) return
    optionSwipeRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const finishOptionSwipe = (event) => {
    const pagedCategory =
      appearanceCategory === 'hair' ||
      appearanceCategory === 'hairColor' ||
      appearanceCategory === 'brows' ||
      appearanceCategory === 'eyes' ||
      appearanceCategory === 'mouth' ||
      appearanceCategory === 'facialHair' ||
      appearanceCategory === 'glasses' ||
      appearanceCategory === 'accessories' ||
      appearanceCategory === 'headwear' ||
      appearanceCategory === 'outfit' ||
      appearanceCategory === 'clothingColor'
    if (!pagedCategory || !optionSwipeRef.current) return
    const touch = event.changedTouches?.[0]
    const start = optionSwipeRef.current
    optionSwipeRef.current = null
    if (!touch) return

    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.2) return

    const perPage =
      appearanceCategory === 'hair'
        ? HAIR_OPTIONS_PER_PAGE
        : appearanceCategory === 'hairColor'
          ? HAIR_COLOR_OPTIONS_PER_PAGE
          : appearanceCategory === 'brows'
            ? BROW_OPTIONS_PER_PAGE
            : appearanceCategory === 'eyes'
              ? EYE_OPTIONS_PER_PAGE
              : appearanceCategory === 'mouth'
                ? MOUTH_OPTIONS_PER_PAGE
                : appearanceCategory === 'facialHair'
                  ? FACIAL_HAIR_OPTIONS_PER_PAGE
                  : appearanceCategory === 'glasses'
                    ? GLASSES_OPTIONS_PER_PAGE
                    : appearanceCategory === 'accessories'
                      ? ACCESSORY_OPTIONS_PER_PAGE
                      : appearanceCategory === 'headwear'
                        ? HEADWEAR_OPTIONS_PER_PAGE
                        : appearanceCategory === 'outfit'
                          ? OUTFIT_OPTIONS_PER_PAGE
                        : CLOTHING_COLOR_OPTIONS_PER_PAGE
    const pageCount = Math.ceil(APPEARANCE_OPTIONS[appearanceCategory].length / perPage)
    const setPage =
      appearanceCategory === 'hair'
        ? setHairPage
        : appearanceCategory === 'hairColor'
          ? setHairColorPage
          : appearanceCategory === 'brows'
            ? setBrowPage
            : appearanceCategory === 'eyes'
              ? setEyePage
              : appearanceCategory === 'mouth'
                ? setMouthPage
                : appearanceCategory === 'facialHair'
                  ? setFacialHairPage
                  : appearanceCategory === 'glasses'
                    ? setGlassesPage
                    : appearanceCategory === 'accessories'
                      ? setAccessoryPage
                      : appearanceCategory === 'headwear'
                        ? setHeadwearPage
                        : appearanceCategory === 'outfit'
                          ? setOutfitPage
                        : setClothingColorPage
    setPage((current) => (
      dx < 0
        ? Math.min(pageCount - 1, current + 1)
        : Math.max(0, current - 1)
    ))
  }

  const finishEmployeeProfile = () => {
    if (!ready) return
    const saved = onSaveProfile?.({
      ...(profile || {}),
      displayName: playerName,
      appearance: { ...appearance },
      homeMarket: 'New York Metro',
      created: true,
    })
    if (saved === false) return
    setPhase('employeeWelcome')
  }

  if (phase === 'employeeWelcome') {
    return (
      <EmployeeIdWelcome
        screenRef={screenRef}
        playerName={playerName}
        appearance={appearance}
        onEditProfile={() => setPhase('look')}
        onStartFirstDay={onStartFirstDay}
      />
    )
  }

  if (phase === 'look') {
    const activeOptions = APPEARANCE_OPTIONS[appearanceCategory]
    const activeCategoryLabel = APPEARANCE_CATEGORIES.find(
      ({ key }) => key === appearanceCategory,
    )?.label
    const optionPaging =
      appearanceCategory === 'hair' ||
      appearanceCategory === 'hairColor' ||
      appearanceCategory === 'brows' ||
      appearanceCategory === 'eyes' ||
      appearanceCategory === 'mouth' ||
      appearanceCategory === 'facialHair' ||
      appearanceCategory === 'glasses' ||
      appearanceCategory === 'accessories' ||
      appearanceCategory === 'headwear' ||
      appearanceCategory === 'outfit' ||
      appearanceCategory === 'clothingColor'
    const optionsPerPage =
      appearanceCategory === 'hair'
        ? HAIR_OPTIONS_PER_PAGE
        : appearanceCategory === 'hairColor'
          ? HAIR_COLOR_OPTIONS_PER_PAGE
          : appearanceCategory === 'brows'
            ? BROW_OPTIONS_PER_PAGE
            : appearanceCategory === 'eyes'
              ? EYE_OPTIONS_PER_PAGE
              : appearanceCategory === 'mouth'
                ? MOUTH_OPTIONS_PER_PAGE
                : appearanceCategory === 'facialHair'
                  ? FACIAL_HAIR_OPTIONS_PER_PAGE
                  : appearanceCategory === 'glasses'
                    ? GLASSES_OPTIONS_PER_PAGE
                    : appearanceCategory === 'accessories'
                      ? ACCESSORY_OPTIONS_PER_PAGE
                      : appearanceCategory === 'headwear'
                        ? HEADWEAR_OPTIONS_PER_PAGE
                        : appearanceCategory === 'outfit'
                          ? OUTFIT_OPTIONS_PER_PAGE
                        : CLOTHING_COLOR_OPTIONS_PER_PAGE
    const optionPage =
      appearanceCategory === 'hair'
        ? hairPage
        : appearanceCategory === 'hairColor'
          ? hairColorPage
          : appearanceCategory === 'brows'
            ? browPage
            : appearanceCategory === 'eyes'
              ? eyePage
              : appearanceCategory === 'mouth'
                ? mouthPage
                : appearanceCategory === 'facialHair'
                  ? facialHairPage
                  : appearanceCategory === 'glasses'
                    ? glassesPage
                    : appearanceCategory === 'accessories'
                      ? accessoryPage
                      : appearanceCategory === 'headwear'
                        ? headwearPage
                        : appearanceCategory === 'outfit'
                          ? outfitPage
                        : clothingColorPage
    const optionPageCount = optionPaging
      ? Math.ceil(activeOptions.length / optionsPerPage)
      : 1
    const safeOptionPage = Math.min(optionPage, Math.max(0, optionPageCount - 1))
    const setOptionPage =
      appearanceCategory === 'hair'
        ? setHairPage
        : appearanceCategory === 'hairColor'
          ? setHairColorPage
          : appearanceCategory === 'brows'
            ? setBrowPage
            : appearanceCategory === 'eyes'
              ? setEyePage
              : appearanceCategory === 'mouth'
                ? setMouthPage
                : appearanceCategory === 'facialHair'
                  ? setFacialHairPage
                  : appearanceCategory === 'glasses'
                    ? setGlassesPage
                    : appearanceCategory === 'accessories'
                      ? setAccessoryPage
                      : appearanceCategory === 'headwear'
                        ? setHeadwearPage
                        : appearanceCategory === 'outfit'
                          ? setOutfitPage
                        : setClothingColorPage
    const visibleOptions = optionPaging
      ? activeOptions.slice(
        safeOptionPage * optionsPerPage,
        (safeOptionPage + 1) * optionsPerPage,
      )
      : activeOptions

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
                  <PlayerAvatar appearance={appearance} />
                </div>
                <div className="career-photo-status-d434c">
                  <span>EMPLOYEE PHOTO</span>
                  <strong>LIVE PREVIEW</strong>
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

            <nav className="career-look-tabs-d434c" aria-label="Appearance categories">
              {APPEARANCE_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={appearanceCategory === category.key ? 'active' : ''}
                  onClick={() => selectAppearanceCategory(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </nav>

            <section
              className={`career-look-options-d434c ${optionPaging ? 'hair-paged' : ''}`}
              onTouchStart={startOptionSwipe}
              onTouchEnd={finishOptionSwipe}
            >
              <div className="career-look-options-head-d434c">
                <div>
                  <span>CUSTOMIZE</span>
                  <strong>{activeCategoryLabel}</strong>
                </div>
                <small>{activeOptions.length} OPTIONS</small>
              </div>

              <div className="career-look-option-grid-d434c">
                {visibleOptions.map((option) => {
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

              {appearanceCategory === 'glasses' && appearance.glasses !== 'none' && (
                <div className="career-glasses-color-d434c">
                  <span>FRAME COLOR</span>
                  <div role="group" aria-label="Choose glasses frame color">
                    {APPEARANCE_OPTIONS.glassesColor.map((frame) => {
                      const selected = appearance.glassesColor === frame.value

                      return (
                        <button
                          key={frame.value}
                          type="button"
                          className={selected ? 'selected' : ''}
                          onClick={() => setAppearanceValue('glassesColor', frame.value)}
                          aria-pressed={selected}
                          aria-label={frame.label}
                          title={frame.label}
                        >
                          <i
                            aria-hidden="true"
                            style={{ '--frame-color': frame.color }}
                          />
                          <span>{frame.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {appearanceCategory === 'accessories' && appearance.accessories !== 'none' && (
                <div className="career-accessory-side-d434c">
                  <span>WEAR ON</span>
                  <div role="group" aria-label="Choose which ear wears this accessory">
                    {ACCESSORY_SIDE_OPTIONS.map((side) => {
                      const selected = appearance.accessorySide === side.value

                      return (
                        <button
                          key={side.value}
                          type="button"
                          className={selected ? 'selected' : ''}
                          onClick={() => setAppearanceValue('accessorySide', side.value)}
                          aria-pressed={selected}
                        >
                          {side.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {optionPaging && (
                <div className="career-look-pager-d434c" aria-label={`${activeCategoryLabel} pages`}>
                  <button
                    type="button"
                    onClick={() => setOptionPage((current) => Math.max(0, current - 1))}
                    disabled={safeOptionPage === 0}
                    aria-label={`Previous ${activeCategoryLabel.toLowerCase()} page`}
                  >
                    <b aria-hidden="true">‹</b>
                    <span>PREVIOUS</span>
                  </button>

                  <div aria-live="polite">
                    <span>{safeOptionPage + 1}</span>
                    <i aria-hidden="true">/</i>
                    <span>{optionPageCount}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOptionPage((current) => Math.min(optionPageCount - 1, current + 1))}
                    disabled={safeOptionPage === optionPageCount - 1}
                    aria-label={`Next ${activeCategoryLabel.toLowerCase()} page`}
                  >
                    <span>NEXT</span>
                    <b aria-hidden="true">›</b>
                  </button>
                </div>
              )}
            </section>

            <div className="career-look-action-d434c">
              <div>
                <span>NEXT</span>
                <strong>Employee ID</strong>
              </div>
              <button type="button" onClick={finishEmployeeProfile}>
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
