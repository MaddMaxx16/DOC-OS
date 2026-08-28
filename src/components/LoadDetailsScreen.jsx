import mapLocations from '../data/mapLocations.js'

function LoadDetailsScreen({ loads, loadId, onAccept, onBack }) {
  const load = loads.find((item) => item.id === loadId)
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)

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
      </div>
      {load.status === 'available' ? (
        <button type="button" className="action-button" onClick={onAccept}>
          ACCEPT LOAD
        </button>
      ) : (
        <button type="button" className="action-button">
          ASSIGN DRIVER
        </button>
      )}
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>
    </div>
  )
}

export default LoadDetailsScreen
