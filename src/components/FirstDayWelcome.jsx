import { useEffect, useRef } from 'react'
import PlayerAvatar, { DEFAULT_APPEARANCE } from './PlayerAvatar.jsx'
import './FirstDayWelcome.css'

const JORDAN_APPEARANCE = { ...DEFAULT_APPEARANCE, skinTone: 'tan', hair: 'sidepart', hairColor: 'espresso', outfit: 'shirt', clothingColor: 'navy' }

function FirstDayWelcome({ playerName, messageIndex = 0, onContinue, lessonMessage, actionLabel }) {
  const buttonRef = useRef(null)
  useEffect(() => { buttonRef.current?.focus() }, [messageIndex])
  const messages = [
    `Welcome to Metroline, ${playerName || 'dispatcher'}. I’m Jordan Blake, your trainer. We’ll take your first shift one step at a time.`,
    'This map is your workspace. Console holds your dispatch tools, Phone is for conversations, and Drivers shows your roster.',
    'Marcus Reed is your assigned driver. He’s at the Metroline Yard. Let’s check his schedule before we find his first load.',
  ]
  return (
    <div className="first-day-welcome-backdrop">
      <section className="first-day-welcome" role="dialog" aria-modal="true" aria-labelledby="first-day-jordan-title" aria-describedby="first-day-jordan-message">
        <header>
          <div className="first-day-jordan-portrait" aria-label="Jordan Blake"><PlayerAvatar appearance={JORDAN_APPEARANCE} /></div>
          <div><small>METROLINE · YOUR TRAINER</small><h2 id="first-day-jordan-title">Jordan Blake</h2><span>{lessonMessage ? 'Plan the whole workday' : 'Welcome to your first day'}</span></div>
        </header>
        <p id="first-day-jordan-message" aria-live="polite">{lessonMessage || messages[messageIndex]}</p>
        <footer><span>{lessonMessage ? 'SHIFT-END PLAN' : `${messageIndex + 1} / ${messages.length}`} · TIME PAUSED</span><button ref={buttonRef} type="button" onClick={onContinue}>{actionLabel || (messageIndex === 2 ? 'VIEW MARCUS’S SCHEDULE' : 'CONTINUE')} <span aria-hidden="true">→</span></button></footer>
      </section>
    </div>
  )
}

export default FirstDayWelcome
