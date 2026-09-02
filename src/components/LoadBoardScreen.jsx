import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function LoadBoardScreen({ loads, gameTime, embedded = false, onBack, onSelectLoad }) {
  const now = (gameTime?.gameDayIndex ?? 0) * 1440 + (gameTime?.totalMinutesOfDay ?? 420)
  const visibleLoads = loads.filter((load) => (load.postedGameMinute === undefined || now >= load.postedGameMinute) && !['completed', 'delivered'].includes(load.status))
  return (
    <div className={`phone-page load-board-screen ${embedded ? 'embedded' : ''}`}>
      {!embedded && <h1>Load Board</h1>}
      <div className="load-list">
        {visibleLoads.map((load) => {
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
              <div className="load-appointments">
                <span>Pickup: {formatCompactDate(load.pickupDayIndex)} • {formatTime(load.pickupWindowStartMinutes)}</span>
                <span>Delivery: {formatCompactDate(load.deliveryDayIndex)} • {formatTime(load.deliveryWindowStartMinutes)}</span>
              </div>
              <div className="load-meta">
                <span>Rate: ${load.rate}</span>
                <span>Listed Miles: {load.listedMiles === null ? 'Calculating...' : load.listedMiles === 'unavailable' ? 'Unavailable' : load.listedMiles.toFixed(1)}</span>
                <span>Status: {load.status[0].toUpperCase() + load.status.slice(1)}</span>
              </div>
            </button>
          )
        })}
      </div>
      {!embedded && <button type="button" className="back-button" onClick={onBack}>Back</button>}
    </div>
  )
}

export default LoadBoardScreen
