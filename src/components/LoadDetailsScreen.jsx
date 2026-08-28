import mapLocations from '../data/mapLocations.js'

function LoadDetailsScreen({ loads, drivers, loadId, onAccept, onAssignDriver, onPlanRoute, onDispatch, onBack }) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = load && mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = load && mapLocations.find((location) => location.id === load.deliveryLocationId)

  if (!load || !pickup || !delivery) {
    return (
      <div className="load-details-screen">
        <button type="button" className="back-button" onClick={onBack}>Back</button>
      </div>
    )
  }

  return (
    <div className="load-details-screen">
      <h1>{load.id}</h1>
      <div className="load-detail-route">
        <strong>Pickup:</strong>
        <span>{pickup.name}</span>
        <strong>Delivery:</strong>
        <span>{delivery.name}</span>
      </div>
      <div className="load-meta">
        <span>Rate: ${load.rate}</span>
        <span>Miles: {load.miles}</span>
        <span>Status: {load.status[0].toUpperCase() + load.status.slice(1)}</span>
        {load.assignedDriverId && <span>Driver: {drivers.find((driver) => driver.id === load.assignedDriverId)?.name ?? 'Unknown'}</span>}
      </div>
      {load.status === 'available' ? (
        <button type="button" className="action-button" onClick={onAccept}>
          ACCEPT LOAD
        </button>
      ) : load.status === 'accepted' ? (
        <button type="button" className="action-button" onClick={onAssignDriver}>
          ASSIGN DRIVER
        </button>
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
