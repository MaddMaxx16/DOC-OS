import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'
import './AppShell.css'
import StartScreen from './components/StartScreen.jsx'
import StartOfficeBackdrop from './components/StartOfficeBackdrop.jsx'
import CareerSetupScreen from './components/CareerSetupScreen.jsx'
import { createMetrolineEmployeeCareer } from './utils/careerState.js'
import {
  SAVE_SLOT_IDS,
  clearActiveSaveSlot,
  clearSave,
  getActiveSaveSlot,
  getSaveSlots,
  loadGame,
  saveGame,
  setActiveSaveSlot,
} from './utils/saveGame.js'

const OperationsApp = lazy(() => import('./App.jsx'))

function OpeningWorkstation() {
  return <div className="workstation-opening" role="status"><span>METROLINE</span><strong>Opening your workstation…</strong><small>Getting your first shift ready.</small></div>
}

// P2.4 startup boundary:
// Title + onboarding own only the state they actually need. The simulator runtime
// remains outside this module so routing, freight, HOS, movement, ledger, maps,
// and dev tooling are not loaded while the player is still onboarding.
function StartupApp() {
  const [stage, setStage] = useState('start')
  const [saveSlots, setSaveSlots] = useState(() => getSaveSlots())
  const [activeSaveSlotId, setActiveSaveSlotId] = useState(() => getActiveSaveSlot())
  const [dispatcherProfile, setDispatcherProfile] = useState(null)
  const [careerSetupPhase, setCareerSetupPhase] = useState('name')
  const [saveFailureMessage, setSaveFailureMessage] = useState('')

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return

    Promise.allSettled([
      Keyboard.setStyle({ style: KeyboardStyle.Dark }),
      Keyboard.setResizeMode({ mode: KeyboardResize.None }),
      Keyboard.setAccessoryBarVisible({ isVisible: false }),
    ])
  }, [])

  useEffect(() => {
    const handleSaveFailure = (event) => {
      setSaveFailureMessage(event?.detail?.message || 'Save storage is unavailable.')
    }

    window.addEventListener('doc-os-save-failed', handleSaveFailure)
    return () => window.removeEventListener('doc-os-save-failed', handleSaveFailure)
  }, [])

  const refreshSaveSlots = () => {
    const next = getSaveSlots()
    setSaveSlots(next)
    return next
  }

  const startNewOperation = (preferredSlotId = null) => {
    const used = new Set(saveSlots.map((slot) => slot.id))
    const preferredAvailable =
      preferredSlotId &&
      SAVE_SLOT_IDS.includes(preferredSlotId) &&
      !used.has(preferredSlotId)

    const slotId = preferredAvailable
      ? preferredSlotId
      : SAVE_SLOT_IDS.find((id) => !used.has(id))

    if (!slotId) return

    clearSave(slotId)
    setActiveSaveSlot(slotId)
    setActiveSaveSlotId(slotId)
    setDispatcherProfile(null)
    setCareerSetupPhase('name')

    // Persist only identity before the deliberate Operations handoff.
    saveGame({
      stage: 'careerSetup',
      dispatcherProfile: null,
      career: createMetrolineEmployeeCareer(),
    }, slotId)
    refreshSaveSlots()
    setStage('careerSetup')
  }

  const resumeSave = (slotId) => {
    const saved = loadGame(slotId)
    if (!saved) return

    setActiveSaveSlot(slotId)
    setActiveSaveSlotId(slotId)
    setDispatcherProfile(saved.dispatcherProfile || null)
    setCareerSetupPhase(saved.careerSetupStep === 'employeeWelcome' ? 'employeeWelcome' : 'name')

    if (saved.stage === 'game') {
      openOperations(false)
      return
    }
    setStage('careerSetup')
  }

  const deleteSaveSlot = (slotId) => {
    clearSave(slotId)
    const next = refreshSaveSlots()

    if (activeSaveSlotId === slotId) {
      const nextSlotId = next[0]?.id || null
      if (nextSlotId) setActiveSaveSlot(nextSlotId)
      else clearActiveSaveSlot()
      setActiveSaveSlotId(nextSlotId)
    }
  }

  const saveEmployeeProfile = (nextProfile) => {
    if (!activeSaveSlotId) return false
    const saved = saveGame({
      ...(loadGame(activeSaveSlotId) || {}),
      stage: 'careerSetup',
      dispatcherProfile: nextProfile,
      career: createMetrolineEmployeeCareer(),
      careerSetupStep: 'employeeWelcome',
    }, activeSaveSlotId)
    if (!saved) return false
    setDispatcherProfile(nextProfile)
    setCareerSetupPhase('employeeWelcome')
    refreshSaveSlots()
    return true
  }

  const openOperations = async (initializeFirstDay) => {
    setSaveFailureMessage('')
    setStage('openingOperations')
    try {
      // Dynamic imports begin only after the player's explicit start/resume action.
      const [initializer] = await Promise.all([
        initializeFirstDay ? import('./utils/firstDayOperation.js') : Promise.resolve(null),
        import('./App.jsx'),
        new Promise((resolve) => window.setTimeout(resolve, 300)),
      ])
      if (initializeFirstDay) {
        const saved = loadGame(getActiveSaveSlot())
        const operation = initializer.prepareFirstDayOperation(saved)
        if (!saveGame(operation, getActiveSaveSlot())) {
          setStage('careerSetup')
          return
        }
      }
      setStage('operations')
    } catch (error) {
      setSaveFailureMessage(error?.message || 'Your workstation could not open. Please try again.')
      setStage(initializeFirstDay ? 'careerSetup' : 'start')
    }
  }

  const returnToStartup = useCallback(() => { setSaveSlots(getSaveSlots()); setStage('start') }, [])

  if (stage === 'operations') {
    return <Suspense fallback={<main className="app"><section className="phone-shell"><OpeningWorkstation /></section></main>}>
      <OperationsApp onReturnToStartup={returnToStartup} />
    </Suspense>
  }

  return (
    <main className="app">
      <section className="phone-shell">
        {saveFailureMessage && (
          <div className="save-failure-banner" role="alert">
            <span>{saveFailureMessage}</span>
            <button type="button" onClick={() => setSaveFailureMessage('')} aria-label="Dismiss save warning">×</button>
          </div>
        )}

        {stage === 'start' && <StartOfficeBackdrop />}

        {stage === 'start' && (
          <StartScreen
            saveSlots={saveSlots}
            saveSlotIds={SAVE_SLOT_IDS}
            activeSaveSlotId={activeSaveSlotId}
            onResumeSave={resumeSave}
            onDeleteSave={deleteSaveSlot}
            onStartNew={startNewOperation}
          />
        )}

        {stage === 'openingOperations' && <OpeningWorkstation />}

        {stage === 'careerSetup' && (
          <CareerSetupScreen
            profile={dispatcherProfile}
            initialPhase={careerSetupPhase}
            onSaveProfile={saveEmployeeProfile}
            onStartFirstDay={() => openOperations(true)}
            onBack={() => setStage('start')}
          />
        )}
      </section>
    </main>
  )
}

export default StartupApp
