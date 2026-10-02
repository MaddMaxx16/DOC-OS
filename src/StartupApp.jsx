import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'
import './AppShell.css'
import StartScreen from './components/StartScreen.jsx'
import StartOfficeBackdrop from './components/StartOfficeBackdrop.jsx'
import CareerSetupScreen from './components/CareerSetupScreen.jsx'
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

// P2.4 startup boundary:
// Title + onboarding own only the state they actually need. The simulator runtime
// remains outside this module so routing, freight, HOS, movement, ledger, maps,
// and dev tooling are not loaded while the player is still onboarding.
function StartupApp() {
  const [stage, setStage] = useState('start')
  const [saveSlots, setSaveSlots] = useState(() => getSaveSlots())
  const [activeSaveSlotId, setActiveSaveSlotId] = useState(() => getActiveSaveSlot())
  const [dispatcherProfile, setDispatcherProfile] = useState(null)
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

    // The current onboarding experience stops before Operations. Persist only
    // its lightweight boundary state; the Operations runtime will own gameplay
    // state once First Day is connected.
    saveGame({ stage: 'careerSetup', dispatcherProfile: null }, slotId)
    refreshSaveSlots()
    setStage('careerSetup')
  }

  const resumeSave = (slotId) => {
    const saved = loadGame(slotId)
    if (!saved) return

    setActiveSaveSlot(slotId)
    setActiveSaveSlotId(slotId)
    setDispatcherProfile(saved.dispatcherProfile || null)

    // Current saves created by the rebuilt experience resume at onboarding.
    // Legacy Operations saves are intentionally not part of this startup path;
    // Maxx confirmed there are no legacy saves to preserve.
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

        {stage === 'careerSetup' && (
          <CareerSetupScreen
            profile={dispatcherProfile}
            onBack={() => setStage('start')}
          />
        )}
      </section>
    </main>
  )
}

export default StartupApp
