import { useEffect, useRef, useState } from 'react'
import StartOfficeBackdrop from './StartOfficeBackdrop.jsx'

function DesktopCareerWorkspace({ profile, saveState, onEnterComputer, onBackToTitle }) {
  const [entering, setEntering] = useState(false)
  const timerRef = useRef(null)
  const playerName = profile?.displayName || saveState?.dispatcherProfile?.displayName || 'Dispatcher'
  const operationDay = Number(saveState?.dayLoop?.operationDay || 1)

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  const enterComputer = () => {
    if (entering) return
    setEntering(true)
    timerRef.current = window.setTimeout(() => onEnterComputer?.(), 900)
  }

  return (
    <section className={`docos-career-workspace ${entering ? 'entering' : ''}`} aria-label="Metroline career workspace">
      <StartOfficeBackdrop />
      <div className="docos-workspace-vignette" aria-hidden="true" />

      <header className="docos-workspace-header">
        <button type="button" onClick={onBackToTitle}>← TITLE</button>
        <div><span>METROLINE LOGISTICS</span><strong>{playerName}</strong><small>Junior Dispatcher · Day {operationDay}</small></div>
      </header>

      <button
        type="button"
        className="docos-workstation-hotspot"
        onClick={enterComputer}
        disabled={entering}
        aria-label="Enter DOC OS workstation"
      >
        <span>{entering ? 'OPENING DOC OS…' : 'WORKSTATION'}</span>
        <strong>{entering ? 'Connecting to operations' : 'Click to enter DOC OS'}</strong>
      </button>

      <div className="docos-workspace-career-note">
        <span>YOUR WORKSPACE</span>
        <strong>Metroline Cubicle</strong>
        <small>This space will grow with your career.</small>
      </div>
    </section>
  )
}

export default DesktopCareerWorkspace
