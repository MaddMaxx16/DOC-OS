function SettingsScreen({ onReturnToTitle }) {
  return (
    <section className="phone-settings-screen">
      <header className="phone-settings-header">
        

        <div>
          <span>DOC OS</span>
          <strong>SETTINGS</strong>
        </div>
      </header>

      <div className="phone-settings-content">
        <section className="phone-settings-section">
          <span className="phone-settings-section-label">
            OPERATION
          </span>

          <button
            type="button"
            className="phone-settings-row phone-settings-return"
            onClick={onReturnToTitle}
          >
            <span>
              <strong>RETURN TO TITLE</strong>
              <small>Your current operation remains saved.</small>
            </span>

            <span className="phone-settings-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </section>

        <section className="phone-settings-section future">
          <span className="phone-settings-section-label">
            GAME
          </span>

          <div className="phone-settings-placeholder">
            <strong>More settings coming later</strong>
            <small>
              Audio, accessibility, gameplay, and operation management
              will live here.
            </small>
          </div>
        </section>
      </div>
    </section>
  )
}

export default SettingsScreen
