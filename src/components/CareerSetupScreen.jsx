import { useState } from 'react'

function CareerSetupScreen({ profile, onContinue, onBack }) {
  const [dispatcherName, setDispatcherName] = useState(
    profile?.dispatcherName || ''
  )

  const [businessName, setBusinessName] = useState(
    profile?.businessName || profile?.displayName || ''
  )

  const [inputActive, setInputActive] = useState(false)

  const cleanDispatcher = dispatcherName.trim()
  const cleanBusiness = businessName.trim()

  const ready =
    cleanDispatcher.length >= 2 &&
    cleanBusiness.length >= 2

  const continueSetup = () => {
    if (!ready) return

    onContinue?.({
      ...(profile || {}),
      dispatcherName: cleanDispatcher,
      businessName: cleanBusiness,

      // Compatibility with the existing CarrierSource profile system.
      displayName: cleanBusiness,

      businessType: 'Independent Dispatch',
      homeMarket: profile?.homeMarket || '',
      targetFeePercent: profile?.targetFeePercent ?? 8,
      preferredEquipment: profile?.preferredEquipment || "53' Dry Van",
      preferredRegion: profile?.preferredRegion || 'Northeast',

      created: true,
      setupComplete: true,
    })
  }

  return (
    <div className={`entry-screen career-setup-screen ${inputActive ? 'input-active' : ''}`}>
      <div className="career-setup-topbar">
        <button
          type="button"
          className="career-setup-back"
          onClick={onBack}
        >
          ‹ BACK
        </button>

        <span>NEW OPERATION · 01 / 02</span>
      </div>

      <section className="career-setup-panel">
        <header className="career-setup-header">
          <span className="career-setup-kicker">
            DISPATCH BUSINESS
          </span>

          <h1>Create Your Dispatch</h1>

          <p>
            Build the identity that will represent your operation
            to carriers and throughout DOC OS.
          </p>
        </header>

        <div
          className="career-setup-form"
          onFocusCapture={() => setInputActive(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setInputActive(false)
            }
          }}
        >
          <label>
            <span>YOUR NAME</span>
            <input
              value={dispatcherName}
              onChange={(event) => setDispatcherName(event.target.value)}
              placeholder="Dispatcher name"
              autoComplete="name"
            />
          </label>

          <label>
            <span>BUSINESS NAME</span>
            <input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="e.g. Pinnacle Dispatch Solutions"
              autoComplete="organization"
            />
          </label>

          <div className="career-business-type">
            <span>BUSINESS TYPE</span>
            <strong>Independent Dispatch</strong>
          </div>
        </div>

        <div className="career-identity-preview">
          <span>OPERATION IDENTITY</span>

          <strong>
            {cleanBusiness || 'Your Dispatch Company'}
          </strong>

          <small>
            {cleanDispatcher
              ? `Operated by ${cleanDispatcher}`
              : 'Your name will appear here'}
          </small>
        </div>

        <button
          type="button"
          className="career-continue-button"
          disabled={!ready}
          onClick={continueSetup}
        >
          CONTINUE TO MARKET
        </button>
      </section>
    </div>
  )
}

export default CareerSetupScreen
