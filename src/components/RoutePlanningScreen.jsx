import mapLocations from '../data/mapLocations.js'

function RoutePlanningScreen({ loads, loadId, drivers, onBack, onContinue }) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
  const driver = drivers.find((item) => item.id === load.assignedDriverId)

  return (
    <div className="route-planning-screen">
      <h1>Route Planning</h1>
      <strong>{load.id}</strong>
      <div className="route-plan-route"><span>{pickup.name}</span><span aria-hidden="true">→</span><span>{delivery.name}</span></div>
      <span>Driver: {driver?.name}</span>
      <strong className="route-options-title">Route Options</strong>
      <p>Route calculation coming next.</p>
      <div className="route-actions">
        <button type="button" className="back-button" onClick={onBack}>Back</button>
        <button type="button" className="action-button" onClick={onContinue}>Continue</button>
      </div>
    </div>
  )
}

export default RoutePlanningScreen
