import { useEffect, useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'

function DriverFitScreen({ load, drivers, runtimePositions = {}, gameTime, candidateDriverId, onEvaluate, onBack, tutorialEnabled = false, tutorialTarget = null }) {
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const available = useMemo(() => drivers.filter((driver) => driver.status === 'available'), [drivers])
  const [fits, setFits] = useState({})
  const [selectedDriverId, setSelectedDriverId] = useState(candidateDriverId)

  useEffect(() => {
    let active = true
    available.forEach(async (driver) => {
      try {
        const current = runtimePositions[driver.id] || mapLocations.find((location) => location.id === driver.homeBaseLocationId)
        const route = await calculateRoute(current, pickup)
        if (active) setFits((currentFits) => ({ ...currentFits, [driver.id]: { miles: route.distanceMiles, minutes: route.durationMinutes, routeShape: route.routeShape } }))
      } catch (error) {
        console.error(error)
        if (active) setFits((currentFits) => ({ ...currentFits, [driver.id]: null }))
      }
    })
    return () => { active = false }
  }, [available, load?.id, pickup?.id])

  return (
    <div className="phone-page driver-fit-screen">
      <div className="driver-fit-content">
        <h1>Check Driver Fit</h1>{tutorialEnabled && <div className="tutorial-note"><strong>DISPATCH NOTE</strong><span>Driver Fit checks deadhead distance, arrival time, and appointment fit so you know whether Marcus can run the load.</span></div>}
        {available.map((driver) => {
          const fit = fits[driver.id]
          const evaluated = fit && (() => { const arrival = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay + fit.minutes; const arrivalDay = Math.floor(arrival / 1440); const arrivalMinutes = arrival % 1440; const status = arrivalDay < load.pickupDayIndex || (arrivalDay === load.pickupDayIndex && arrivalMinutes < load.pickupWindowStartMinutes) ? 'EARLY' : arrivalDay > load.pickupDayIndex || (arrivalDay === load.pickupDayIndex && arrivalMinutes > load.pickupWindowEndMinutes) ? 'LATE' : 'ON TIME'; return { ...fit, arrivalDay, arrivalMinutes, status } })()
          return <button type="button" className={`driver-fit-card ${selectedDriverId === driver.id ? 'selected' : ''}`} key={driver.id} onClick={() => setSelectedDriverId(driver.id)}><strong>{driver.name}</strong><span>{selectedDriverId === driver.id ? 'SELECTED' : 'Available'}</span>{evaluated ? <div className="eta-details"><span>Deadhead Distance: {evaluated.miles.toFixed(1)} miles</span><span>Deadhead Drive Time: {evaluated.minutes} minutes</span><span>Estimated Pickup Arrival: {formatCompactDate(evaluated.arrivalDay)} • {formatTime(evaluated.arrivalMinutes)}</span><span>Pickup Window: {formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</span><span>Fit Status: {evaluated.status}</span></div> : fits[driver.id] === null ? <span>Route unavailable</span> : <span>Calculating...</span>}</button>
        })}
      </div>
      <div className="driver-fit-actions"><button type="button" className="back-button" onClick={onBack}>Back</button><button type="button" className="action-button" onClick={() => { const fit = fits[selectedDriverId]; const arrival = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay + fit.minutes; const arrivalDay = Math.floor(arrival / 1440); const arrivalMinutes = arrival % 1440; const status = arrivalDay < load.pickupDayIndex || (arrivalDay === load.pickupDayIndex && arrivalMinutes < load.pickupWindowStartMinutes) ? 'EARLY' : arrivalDay > load.pickupDayIndex || (arrivalDay === load.pickupDayIndex && arrivalMinutes > load.pickupWindowEndMinutes) ? 'LATE' : 'ON TIME'; onEvaluate(selectedDriverId, { ...fit, arrivalDay, arrivalMinutes, status }) }} disabled={!selectedDriverId || !fits[selectedDriverId]}>Evaluate on Map</button></div>
    </div>
  )
}

export default DriverFitScreen
