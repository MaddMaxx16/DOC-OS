import { useEffect, useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getProjectedDriverOrigin } from '../utils/driverQueue.js'

function evaluateTiming(load, projectedStartMinute, fit) {
  const arrival = projectedStartMinute + fit.minutes
  const arrivalDay = Math.floor(arrival / 1440)
  const arrivalMinutes = arrival % 1440
  const start = load.pickupDayIndex * 1440 + load.pickupWindowStartMinutes
  const end = load.pickupDayIndex * 1440 + load.pickupWindowEndMinutes
  const buffer = start - arrival

  let label = 'GOOD NEXT LOAD'
  let tone = 'good'
  if (arrival > end) { label = 'POOR FIT'; tone = 'poor' }
  else if (arrival > start || buffer < 20) { label = 'TIGHT'; tone = 'tight' }

  return { ...fit, arrivalDay, arrivalMinutes, label, tone, buffer }
}

function DriverFitScreen({
  load,
  loads = [],
  drivers,
  runtimePositions = {},
  gameTime,
  candidateDriverId,
  onEvaluate,
}) {
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const candidates = useMemo(() => drivers.filter((driver) => driver.carrierId), [drivers])
  const [fits, setFits] = useState({})
  const [selectedDriverId, setSelectedDriverId] = useState(null)

  useEffect(() => {
    let active = true
    setFits({})

    candidates.forEach(async (driver) => {
      const projection = getProjectedDriverOrigin({ driver, loads, runtimePositions, gameTime })
      if (!projection.location || !pickup) {
        if (active) setFits((current) => ({ ...current, [driver.id]: null }))
        return
      }

      try {
        const route = await calculateRoute(projection.location, pickup)
        if (!active) return
        setFits((current) => ({
          ...current,
          [driver.id]: {
            miles: route.distanceMiles,
            minutes: route.durationMinutes,
            routeShape: route.routeShape,
            projectedStartMinute: projection.availableAbsoluteMinute,
            queueLength: projection.queueLength,
            afterLoadId: projection.afterLoadId,
          },
        }))
      } catch (error) {
        console.error(error)
        if (active) setFits((current) => ({ ...current, [driver.id]: null }))
      }
    })

    return () => { active = false }
  }, [candidates, loads, runtimePositions, gameTime, load?.id, pickup?.id])

  const selectedFit = selectedDriverId && fits[selectedDriverId]
    ? evaluateTiming(load, fits[selectedDriverId].projectedStartMinute, fits[selectedDriverId])
    : null

  return (
    <div className="phone-page driver-fit-screen driver-select-v3">
      <header className="docos-page-hero">
        <span className="docos-page-kicker">FREIGHTLINK · {load.loadNumber || load.id}</span>
        <div className="docos-page-title-row">
          <div>
            <h2>Driver Select</h2>
            <p>{formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</p>
          </div>
          <span className="docos-count-chip">{candidates.length} {candidates.length === 1 ? 'DRIVER' : 'DRIVERS'}</span>
        </div>
      </header>

      <div className="docos-page-body">
        <section className="docos-section">
          <div className="docos-section-heading">
            <span>AVAILABLE ROSTER</span>
            <small>SELECT ONE</small>
          </div>

          <div className="driver-select-compact-list">
            {candidates.map((driver) => {
              const rawFit = fits[driver.id]
              const fit = rawFit ? evaluateTiming(load, rawFit.projectedStartMinute, rawFit) : null
              const selected = selectedDriverId === driver.id
              const name = driver.fullName || driver.name
              return (
                <button
                  type="button"
                  key={driver.id}
                  className={`driver-select-compact-card ${selected ? 'selected' : ''}`}
                  onClick={() => setSelectedDriverId(driver.id)}
                >
                  <div className="driver-select-card-main">
                    <span className="driver-avatar-v2" aria-hidden="true">{name?.charAt(0)?.toUpperCase() || 'D'}</span>
                    <div className="driver-select-card-copy">
                      <strong>{name}</strong>
                      <small>{driver.equipment?.label || 'Equipment not listed'}</small>
                    </div>
                    <span className={`driver-select-fit-pill ${fit?.tone || 'loading'}`}>
                      {fit ? fit.label : rawFit === null ? 'ROUTE UNAVAILABLE' : 'CALCULATING'}
                    </span>
                  </div>

                  {selected && fit && (
                    <div className="driver-select-card-details">
                      <div><span>Next opening</span><strong>{fit.afterLoadId ? `After ${fit.afterLoadId}` : 'Now'}</strong></div>
                      <div><span>Deadhead</span><strong>{fit.miles.toFixed(1)} mi · {fit.minutes} min</strong></div>
                      <div><span>Projected arrival</span><strong>{formatCompactDate(fit.arrivalDay)} · {formatTime(fit.arrivalMinutes)}</strong></div>
                      <div><span>Pickup</span><strong>{formatTime(load.pickupWindowStartMinutes)}</strong></div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {selectedDriverId && selectedFit && (
          <section className="docos-section">
            <div className="docos-section-heading"><span>ASSIGNMENT IMPACT</span></div>
            <div className="docos-panel assignment-impact-v2">
              <div><span>Deadhead</span><strong>{selectedFit.miles.toFixed(1)} mi</strong></div>
              <div><span>Drive time</span><strong>{selectedFit.minutes} min</strong></div>
              <div><span>Arrival</span><strong>{formatTime(selectedFit.arrivalMinutes)}</strong></div>
              <div><span>Queue</span><strong>{selectedFit.queueLength ? `${selectedFit.queueLength} ahead` : 'Next up'}</strong></div>
            </div>
          </section>
        )}

        <div className="docos-sticky-actions">
          <button
            type="button"
            className="docos-primary-action"
            disabled={!selectedDriverId || !selectedFit}
            onClick={() => selectedDriverId && selectedFit && onEvaluate(selectedDriverId, selectedFit)}
          >
            ASSIGN LOAD
          </button>
        </div>
      </div>
    </div>
  )
}

export default DriverFitScreen
