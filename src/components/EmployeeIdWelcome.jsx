import PlayerAvatar from './PlayerAvatar.jsx'
import './EmployeeIdWelcome.css'

// ENTRY.1 is presentation + saved identity only. The real Operations handoff
// will supply onStartFirstDay after the workspace and initializer are ready.
function EmployeeIdWelcome({ screenRef, playerName, appearance, onEditProfile, onStartFirstDay }) {
  const firstDayAvailable = typeof onStartFirstDay === 'function'

  return (
    <div ref={screenRef} className="career-setup-d434c employee-welcome">
      <header className="career-systembar-d434c employee-welcome-header">
        <button
          className="career-back-d434c"
          type="button"
          onClick={onEditProfile}
          aria-label="Back to your look"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className="career-system-id-d434c">
          <div className="career-mini-mark-d434c" aria-label="DOC OS">
            <b>DOC</b><i>OS</i>
          </div>
          <span>EMPLOYEE WELCOME</span>
        </div>
        <span className="employee-welcome-ready" aria-label="Profile ready">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5 10 3.2 3.2L15 6.5" />
          </svg>
        </span>
      </header>

      <main className="employee-welcome-main">
        <div className="employee-welcome-content">
          <div className="employee-welcome-intro">
            <span>YOU’RE PART OF THE TEAM</span>
            <h1>Welcome to<br />Metroline.</h1>
          </div>

          <article className="employee-id" aria-label={`${playerName} Metroline employee ID`}>
            <div className="employee-id-clip" aria-hidden="true" />
            <header className="employee-id-brand">
              <span className="employee-id-mark" aria-hidden="true">M</span>
              <div><strong>METROLINE</strong><span>TRANSPORT</span></div>
              <span className="employee-id-type">EMPLOYEE<br />IDENTIFICATION</span>
            </header>

            <div className="employee-id-body">
              <div className="employee-id-photo">
                <PlayerAvatar appearance={appearance} />
              </div>
              <h2>{playerName}</h2>
              <p>Junior Dispatcher</p>
              <span className="employee-id-location">New York Operations</span>
            </div>

            <footer className="employee-id-footer">
              <span>OPERATIONS TEAM</span>
              <span className="employee-id-access"><i aria-hidden="true" />EMPLOYEE</span>
            </footer>
          </article>

          <p className="employee-welcome-message">
            Your workstation is ready.<br />Jordan will help you get started.
          </p>

          <div className="employee-welcome-actions">
            <button
              type="button"
              className="employee-welcome-start"
              onClick={onStartFirstDay}
              disabled={!firstDayAvailable}
              aria-describedby={firstDayAvailable ? undefined : 'employee-first-day-status'}
            >
              <span>START FIRST DAY</span><span aria-hidden="true">→</span>
            </button>
            {!firstDayAvailable && (
              <p id="employee-first-day-status">Your first shift is coming next.</p>
            )}
            <button type="button" className="employee-welcome-edit" onClick={onEditProfile}>
              Edit your look
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default EmployeeIdWelcome
