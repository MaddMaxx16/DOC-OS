import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../utils/gameTime.js'

export default function LunchDecisionOverlay({ driver, choices = [], gameTime, onChoose, onClose }) {
  const [selectedChoiceId, setSelectedChoiceId] = useState(null)
  const cardRefs = useRef(new Map())
  if (!driver || !choices.length) return null
  const driverName = driver.fullName || driver.name || 'Driver'
  const selectedChoice = choices.find((choice) => choice.id === selectedChoiceId) || null

  useEffect(() => {
    const onMapTap = (event) => {
      const locationId = event?.detail?.locationId
      const match = choices.find((choice) => choice?.lunchStop?.id === locationId)
      if (!match) return
      setSelectedChoiceId((current) => current === match.id && event?.detail?.active === false ? null : match.id)
      requestAnimationFrame(() => cardRefs.current.get(match.id)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }))
    }
    window.addEventListener('docos:lunch-location-tap', onMapTap)
    return () => window.removeEventListener('docos:lunch-location-tap', onMapTap)
  }, [choices])

  const selectChoice = (choice) => {
    const nextId = selectedChoiceId === choice.id ? null : choice.id
    setSelectedChoiceId(nextId)
    window.dispatchEvent(new CustomEvent('docos:lunch-card-tap', {
      detail: { locationId: choice?.lunchStop?.id, active: Boolean(nextId) },
    }))
  }

  const close = () => {
    window.dispatchEvent(new CustomEvent('docos:lunch-selection-clear'))
    onClose?.()
  }

  const confirm = () => {
    if (!selectedChoice) return
    window.dispatchEvent(new CustomEvent('docos:lunch-selection-clear'))
    onChoose?.(selectedChoice)
  }

  return (
    <div className="lunch-decision-backdrop unified-planning-backdrop" role="dialog" aria-modal="false" aria-label={`${driverName} lunch stop planning`}>
      <section className="lunch-decision-sheet unified-planning-sheet">
        <header className="lunch-decision-header unified-planning-header">
          <div>
            <span>DOC OS · LUNCH</span>
            <strong>Plan Lunch Stop</strong>
            <small>{driverName} · {formatTime(gameTime?.totalMinutesOfDay || 0)}</small>
          </div>
          <button type="button" onClick={close} aria-label="Close lunch planner">×</button>
        </header>

        <div className="lunch-decision-grid unified-planning-options">
          {choices.map((choice) => {
            const stop = choice.lunchStop
            const selected = selectedChoiceId === choice.id
            return (
              <button
                type="button"
                ref={(node) => node ? cardRefs.current.set(choice.id, node) : cardRefs.current.delete(choice.id)}
                className={`lunch-option-card category-${choice.category}${selected ? ' selected' : ''}`}
                key={choice.id}
                onClick={() => selectChoice(choice)}
              >
                <span>
                  <small>{choice.eyebrow}</small>
                  <strong>{choice.title}</strong>
                  <em>{Number.isFinite(stop?.forwardRouteMiles) ? `${stop.forwardRouteMiles.toFixed(1)} mi ahead` : 'Near current route'}{Number.isFinite(stop?.offRouteMiles) ? ` · ${stop.offRouteMiles.toFixed(1)} mi off route` : ''}</em>
                </span>
                <b>{selected ? '✓' : '○'}</b>
              </button>
            )
          })}
        </div>

        <footer className="unified-planning-footer">
          <button type="button" className="secondary" onClick={close}>LATER</button>
          <button type="button" className="primary" disabled={!selectedChoice} aria-disabled={!selectedChoice} onClick={confirm}>CONFIRM LUNCH STOP</button>
        </footer>
      </section>
    </div>
  )
}
