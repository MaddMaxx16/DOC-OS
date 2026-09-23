function CarrierActivationScreen({
  carrier = null,
  driver = null,
  operationDay = 1,
  onOpenAgenda,
  onReturnToEmail,
}) {
  const carrierName = carrier?.name || 'Carrier'
  const driverName = driver?.fullName || driver?.name || 'Assigned Driver'
  const firstName = driver?.name || String(driverName).split(' ')[0] || 'Driver'
  const equipmentLabel = driver?.equipment?.label || carrier?.equipment?.[0] || 'Carrier equipment'
  const firstCarrier = Number(operationDay || 1) === 1 && carrier?.id === 'metroline'

  return (
    <div className="phone-page carrier-activation-screen">
      <div className="carrier-activation-scroll">
        <section className="carrier-activation-hero">
          <div className="carrier-activation-check" aria-hidden="true">✓</div>
          <span>{firstCarrier ? 'FIRST CARRIER ACTIVATED' : 'CARRIER ACTIVATED'}</span>
          <h2>{carrierName}</h2>
          <p>The agreement is signed and the carrier is active. Metroline confirmed the driver's next three workdays. The previous dispatcher left the handoff in place before leaving the account.</p>
        </section>

        <section className="carrier-activation-progress">
          <div className="done"><b>✓</b><strong>Agreement signed</strong><small>Operating terms accepted</small></div>
          <i />
          <div className="done"><b>✓</b><strong>Carrier active</strong><small>{carrierName} joined your roster</small></div>
          <i />
          <div className="current"><b>3</b><strong>Review carrier schedule</strong><small>3 confirmed workdays</small></div>
        </section>

        <section className="carrier-activation-driver">
          <header>
            <div><span>YOUR FIRST DRIVER</span><strong>{driverName}</strong></div>
            <small>ROSTER ACTIVE</small>
          </header>
          <div className="carrier-activation-driver-body">
            <div className="carrier-activation-avatar" aria-hidden="true">{String(driverName).trim().charAt(0).toUpperCase() || 'D'}</div>
            <div>
              <span>{carrierName}</span>
              <strong>{equipmentLabel}</strong>
              <p>{firstName} already has three confirmed workdays from Metroline. You do not set his shift times — your job is to find freight that respects them.</p>
            </div>
          </div>
        </section>

        <section className="carrier-activation-objective">
          <span>NEXT OBJECTIVE</span>
          <strong>Review {firstName}'s inherited schedule.</strong>
          <p>Scheduler shows Metroline's confirmed driver availability. Use those shifts as hard operating constraints when selecting freight, planning lunch, and deciding where the driver should finish the day.</p>
          <div><b>SCHEDULER</b><i>→</i><b>SET WORKDAY</b><i>→</i><b>FREIGHTLINK</b></div>
        </section>
      </div>

      <div className="carrier-activation-actions">
        <button type="button" className="secondary" onClick={onReturnToEmail}>BACK TO EMAIL</button>
        <button type="button" className="primary" onClick={onOpenAgenda}>OPEN SCHEDULER <span>›</span></button>
      </div>
    </div>
  )
}

export default CarrierActivationScreen
