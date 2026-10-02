import PlayerAvatar, { DEFAULT_APPEARANCE } from './PlayerAvatar.jsx'
import './FirstDayLesson.css'

const appearance = { ...DEFAULT_APPEARANCE, skinTone: 'tan', hair: 'sidepart', hairColor: 'espresso', outfit: 'shirt', clothingColor: 'navy' }

function FirstDayLesson({ title, children, actionLabel, onAction, disabled = false, timePaused = true }) {
  return (
    <section className="first-day-lesson" aria-label={`Jordan: ${title}`}>
      <header>
        <div className="first-day-lesson-portrait" aria-hidden="true"><PlayerAvatar appearance={appearance} /></div>
        <div><small>JORDAN BLAKE · {timePaused ? 'TIME PAUSED' : 'FIRST LOAD'}</small><h2>{title}</h2></div>
      </header>
      <p>{children}</p>
      {actionLabel && <button type="button" disabled={disabled} onClick={onAction}>{actionLabel} <span aria-hidden="true">→</span></button>}
    </section>
  )
}

export default FirstDayLesson
