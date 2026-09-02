import mapLocations from '../data/mapLocations.js'
import { formatAppointment } from '../utils/gameTime.js'

function LoadDetailsScreen({ loads, drivers, loadId, onAccept, onCheckDriverFit, onPlanRoute, onDispatch, onBack, tutorialEnabled = false }) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = load && mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = load && mapLocations.find((location) => location.id === load.deliveryLocationId)

  if (!load || !pickup || !delivery) {
    return (
      <div className="phone-page load-details-screen">
        <button type="button" className="back-button" onClick={onBack}>Back</button>
      </div>
    )
  }

  return (
    <div className="phone-page load-details-screen">
      <h1>{load.id}</h1>
      {tutorialEnabled && <div className="tutorial-note"><strong>DISPATCH NOTE</strong><span>Before taking a load, check the route, appointment times, equipment, and rate. Next, check whether Marcus can handle it.</span></div>}<div className="load-detail-route">
        <strong>Pickup:</strong>
        <span>{pickup.name}</span>
        <span>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</span>
        <strong>Delivery:</strong>
        <span>{delivery.name}</span>
        <span>{formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)}</span>
      </div>
      <div className="load-meta">
        <span>Rate: ${load.rate}</span>
        <span>Listed Miles: {load.listedMiles === null ? 'Calculating...' : load.listedMiles === 'unavailable' ? 'Unavailable' : load.listedMiles.toFixed(1)}</span>
        {load.plannedMiles !== null && <span>Planned Miles: {load.plannedMiles.toFixed(1)}</span>}
        {load.plannedDriveTimeMinutes !== null && <span>Planned Drive Time: {load.plannedDriveTimeMinutes} minutes</span>}
        <span>Status: {load.status[0].toUpperCase() + load.status.slice(1)}</span>
        {load.assignedDriverId && <span>Driver: {drivers.find((driver) => driver.id === load.assignedDriverId)?.name ?? 'Unknown'}</span>}
        {load.candidateDriverId && <span>Candidate Driver: {drivers.find((driver) => driver.id === load.candidateDriverId)?.name ?? 'Unknown'}</span>}
        {load.driverFitVerified && <span>Verified Driver Fit: {drivers.find((driver) => driver.id === load.candidateDriverId)?.name ?? 'Marcus'}</span>}
      </div>
      {load.status === 'available' ? (
        <><button type="button" className={`action-button ${tutorialEnabled && !load.driverFitVerified ? 'tutorial-target' : ''}`} onClick={onCheckDriverFit} disabled={load.driverFitVerified}>{load.driverFitVerified ? 'DRIVER FIT VERIFIED' : 'CHECK DRIVER FIT'}</button><button type="button" className={`action-button ${tutorialEnabled && load.driverFitVerified && load.candidateDriverId ? 'tutorial-target' : ''}`} onClick={onAccept} disabled={!load.candidateDriverId}>
        ACCEPT LOAD
        </button></>
      ) : load.status === 'assigned' && load.assignedDriverId ? (
        <button type="button" className="action-button" onClick={onPlanRoute}>
          PLAN ROUTE
        </button>
      ) : load.status === 'route-ready' ? (
        <button type="button" className="action-button" onClick={onDispatch}>
          DISPATCH DRIVER
        </button>
      ) : null}
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>
    </div>
  )
}

export default LoadDetailsScreen
