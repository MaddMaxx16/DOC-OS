import loads from '../data/loads.js'
import mapLocations from '../data/mapLocations.js'

function LoadBoardScreen({ onBack, onSelectLoad }) {
  return (
    <div className="load-board-screen">
      <h1>Load Board</h1>
      <div className="load-list">
        {loads.map((load) => {
          const pickup = mapLocations.find(
            (location) => location.id === load.pickupLocationId,
          )
          const delivery = mapLocations.find(
            (location) => location.id === load.deliveryLocationId,
          )

          return (
            <button type="button" className="load-card" key={load.id} onClick={() => onSelectLoad(load.id)}>
              <strong>{load.id}</strong>
              <div className="load-route">
                <span>{pickup.name}</span>
                <span aria-hidden="true">→</span>
                <span>{delivery.name}</span>
              </div>
              <div className="load-meta">
                <span>Rate: ${load.rate}</span>
                <span>Miles: {load.miles}</span>
                <span>Status: {load.status[0].toUpperCase() + load.status.slice(1)}</span>
              </div>
            </button>
          )
        })}
      </div>
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>
    </div>
  )
}

export default LoadBoardScreen
