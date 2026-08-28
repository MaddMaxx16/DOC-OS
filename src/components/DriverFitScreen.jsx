import { useEffect, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'

function DriverFitScreen({ load, drivers, gameTime, candidateDriverId, onConfirm, onBack }) {
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const available = drivers.filter((driver) => driver.status === 'available')
  const [fits, setFits] = useState({})
  const [selectedDriverId, setSelectedDriverId] = useState(candidateDriverId)

  useEffect(() => {
    let active = true
    available.forEach(async (driver) => {
      try {
        const current = mapLocations.find((location) => location.id === driver.id)
        const route = await calculateRoute(current, pickup)
        const arrival = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay + route.durationMinutes
        const arrivalDay = Math.floor(arrival / 1440)
        const arrivalMinutes = arrival % 1440
        const status = arrivalDay < load.pickupDayIndex || (arrivalDay === load.pickupDayIndex && arrivalMinutes < load.pickupWindowStartMinutes) ? 'EARLY' : arrivalDay > load.pickupDayIndex || (arrivalDay === load.pickupDayIndex && arrivalMinutes > load.pickupWindowEndMinutes) ? 'LATE' : 'ON TIME'
        if (active) setFits((currentFits) => ({ ...currentFits, [driver.id]: { miles: route.distanceMiles, minutes: route.durationMinutes, arrivalDay, arrivalMinutes, status } }))
      } catch (error) {
        console.error(error)
        if (active) setFits((currentFits) => ({ ...currentFits, [driver.id]: null }))
      }
    })
    return () => { active = false }
  }, [available, gameTime, load, pickup])

  return (
    <div className="driver-fit-screen">
      <div className="driver-fit-content">
        <h1>Check Driver Fit</h1>
        {available.map((driver) => {
          const fit = fits[driver.id]
          return <button type="button" className={`driver-fit-card ${selectedDriverId === driver.id ? 'selected' : ''}`} key={driver.id} onClick={() => setSelectedDriverId(driver.id)}><strong>{driver.name}</strong><span>{selectedDriverId === driver.id ? 'SELECTED' : 'Available'}</span>{fit ? <div className="eta-details"><span>Deadhead Distance: {fit.miles.toFixed(1)} miles</span><span>Deadhead Drive Time: {fit.minutes} minutes</span><span>Estimated Pickup Arrival: {formatCompactDate(fit.arrivalDay)} • {formatTime(fit.arrivalMinutes)}</span><span>Pickup Window: {formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</span><span>Fit Status: {fit.status}</span></div> : <span>Calculating...</span>}</button>
        })}
      </div>
      <div className="driver-fit-actions"><button type="button" className="back-button" onClick={onBack}>Back</button><button type="button" className="action-button" onClick={() => onConfirm(selectedDriverId)} disabled={!selectedDriverId}>Confirm</button></div>
    </div>
  )
}

export default DriverFitScreen
