import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'
import './AppShell.css'
import CareerSetupScreen from './components/CareerSetupScreen.jsx'
import DesktopTitleScreen from './components/DesktopTitleScreen.jsx'
import DesktopCareerWorkspace from './components/DesktopCareerWorkspace.jsx'
import './components/DesktopExperience.css'
import './components/DesktopWorkstation.css'
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
  const [stage, setStage] = useState('title')
  const [entryPhase, setEntryPhase] = useState(null)
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

  useEffect(() => {
    if (entryPhase !== 'revealing') return undefined
    const timer = window.setTimeout(() => setEntryPhase(null), 320)
    return () => window.clearTimeout(timer)
  }, [entryPhase])

  const revealWorkstation = useCallback(() => {
    setEntryPhase((current) => current === 'opening' ? 'revealing' : current)
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

    if (saved.stage === 'careerSetup') {
      setStage('careerSetup')
      return
    }
    setStage('workspace')
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

  const finishCareerSetupToWorkspace = () => {
    if (!activeSaveSlotId) return false
    const current = loadGame(activeSaveSlotId) || {}
    const saved = saveGame({
      ...current,
      stage: 'workspace',
      firstDayPendingInitialization: true,
      dispatcherProfile: current.dispatcherProfile || dispatcherProfile,
      career: current.career || createMetrolineEmployeeCareer(),
    }, activeSaveSlotId)
    if (!saved) return false
    refreshSaveSlots()
    setStage('workspace')
    return true
  }

  const enterWorkspaceComputer = () => {
    const saved = loadGame(activeSaveSlotId)
    if (!saved) return
    openOperations(Boolean(saved.firstDayPendingInitialization))
  }

  const openOperations = async (initializeFirstDay) => {
    setSaveFailureMessage('')
    setEntryPhase('opening')
    setStage('openingOperations')
    try {
      // Dynamic imports begin only after the player's explicit start/resume action.
      const [initializer] = await Promise.all([
        initializeFirstDay ? import('./utils/firstDayOperation.js') : Promise.resolve(null),
        import('./App.jsx'),
        import('./components/MainGameScreen.jsx'),
        new Promise((resolve) => window.setTimeout(resolve, 1000)),
      ])
      if (initializeFirstDay) {
        const saved = loadGame(getActiveSaveSlot())
        const operation = {
          ...initializer.prepareFirstDayOperation(saved),
          firstDayPendingInitialization: false,
        }
        if (!saveGame(operation, getActiveSaveSlot())) {
          setEntryPhase(null)
          setStage('careerSetup')
          return
        }
      }
      setStage('operations')
    } catch (error) {
      setEntryPhase(null)
      setSaveFailureMessage(error?.message || 'Your workstation could not open. Please try again.')
      setStage(initializeFirstDay ? 'careerSetup' : 'workspace')
    }
  }

  const returnToStartup = useCallback(() => {
    setSaveSlots(getSaveSlots())
    const saved = loadGame(activeSaveSlotId)
    setDispatcherProfile(saved?.dispatcherProfile || null)
    setStage('workspace')
  }, [activeSaveSlotId])

  return (
    <>
    {stage === 'operations' ? (
      Capacitor.getPlatform() === 'web' ? (
        <div className="desktop-operations-root">
          <Suspense fallback={null}>
            <OperationsApp onReturnToStartup={returnToStartup} onWorkstationReady={revealWorkstation} />
          </Suspense>
        </div>
      ) : (
        <Suspense fallback={null}>
          <OperationsApp onReturnToStartup={returnToStartup} onWorkstationReady={revealWorkstation} />
        </Suspense>
      )
    ) : (
    <main className="app desktop-startup-app">
      {saveFailureMessage && (
        <div className="save-failure-banner" role="alert">
          <span>{saveFailureMessage}</span>
          <button type="button" onClick={() => setSaveFailureMessage('')} aria-label="Dismiss save warning">×</button>
        </div>
      )}

      {stage === 'title' && (
        <DesktopTitleScreen
          saveSlots={saveSlots}
          activeSaveSlotId={activeSaveSlotId}
          onContinue={resumeSave}
          onLoadCareer={resumeSave}
          onDeleteCareer={deleteSaveSlot}
          onNewCareer={() => startNewOperation()}
        />
      )}

      {stage === 'careerSetup' && (
        <section className="phone-shell legacy-career-frame">
          <CareerSetupScreen
            profile={dispatcherProfile}
            initialPhase={careerSetupPhase}
            onSaveProfile={saveEmployeeProfile}
            onStartFirstDay={finishCareerSetupToWorkspace}
            onBack={() => setStage('title')}
          />
        </section>
      )}

      {stage === 'workspace' && (
        <DesktopCareerWorkspace
          profile={dispatcherProfile}
          saveState={loadGame(activeSaveSlotId)}
          onEnterComputer={enterWorkspaceComputer}
          onBackToTitle={() => { setSaveSlots(getSaveSlots()); setStage('title') }}
        />
      )}
    </main>
    )}
    {entryPhase && (
      <div className={`workstation-entry-cover ${entryPhase}`}>
        <section className="phone-shell"><OpeningWorkstation /></section>
      </div>
    )}
    </>
  )
}

export default StartupApp
