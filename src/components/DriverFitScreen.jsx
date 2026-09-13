import { useEffect, useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getProjectedDriverOrigin } from '../utils/driverQueue.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

function evaluateTiming(load, projectedStartMinute, fit) {
  const arrival = projectedStartMinute + fit.minutes
  const arrivalDay = Math.floor(arrival / 1440)
  const arrivalMinutes = arrival % 1440
  const start = load.pickupDayIndex * 1440 + load.pickupWindowStartMinutes
  const end = load.pickupDayIndex * 1440 + load.pickupWindowEndMinutes
  // AV2: pickup is a WINDOW, not a single appointment time. Driver Fit risk is
  // judged against the closing edge of that window. Arriving after the window
  // opens can still be a perfectly good fit.
  const buffer = end - arrival

  let label = 'GOOD'
  let tone = 'good'
  if (arrival > end) { label = 'AT RISK'; tone = 'poor' }
  else if (buffer <= 30) { label = 'TIGHT'; tone = 'tight' }

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
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
  const candidates = useMemo(() => drivers.filter((driver) => driver.carrierId), [drivers])
  const [fits, setFits] = useState({})
  const [selectedDriverId, setSelectedDriverId] = useState(candidateDriverId || null)
  const [loadedLeg, setLoadedLeg] = useState(null)

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
            routeSource: route.source,
            projectedStartMinute: projection.availableAbsoluteMinute,
            queueLength: projection.queueLength,
            afterLoadId: projection.afterLoadId,
            projectedOriginName: projection.location?.name || null,
          },
        }))
      } catch (error) {
        console.error(error)
        if (active) setFits((current) => ({ ...current, [driver.id]: null }))
      }
    })

    return () => { active = false }
  }, [candidates, loads, runtimePositions, gameTime, load?.id, pickup?.id])


  useEffect(() => {
    let active = true
    setLoadedLeg(null)
    if (!pickup || !delivery) return () => { active = false }
    calculateRoute(pickup, delivery)
      .then((route) => { if (active) setLoadedLeg(route) })
      .catch((error) => { console.error(error); if (active) setLoadedLeg('unavailable') })
    return () => { active = false }
  }, [pickup?.id, delivery?.id])

  const selectedFit = selectedDriverId && fits[selectedDriverId]
    ? evaluateTiming(load, fits[selectedDriverId].projectedStartMinute, fits[selectedDriverId])
    : null

  return (
    <div className="phone-page driver-fit-screen driver-select-v3">
      <header className="docos-page-hero">
        <span className="docos-page-kicker">FREIGHTLINK · SELECT DRIVER</span>
        <div className="docos-page-title-row">
          <div>
            <h2>{pickup?.name || 'Pickup'}</h2>
            <p>{getFreightRouteName(load)} · {formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)}</p>
          </div>
          <span className="docos-count-chip">BUILD TRIP</span>
        </div>
      </header>

      <div className="docos-page-body">
        <section className="docos-section">
          <div className="docos-section-heading">
            <span>DRIVER</span>
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
                      <div><span>Projected position</span><strong>{fit.projectedOriginName || (fit.afterLoadId ? 'After current work' : 'Current location')}</strong></div>
                      <div><span>Deadhead</span><strong>{fit.miles.toFixed(1)} mi · {fit.minutes} min</strong></div>
                      <div><span>Projected arrival</span><strong>{formatCompactDate(fit.arrivalDay)} · {formatTime(fit.arrivalMinutes)}</strong></div>
                      <div><span>Pickup window</span><strong>{formatTime(load.pickupWindowStartMinutes)}–{formatTime(load.pickupWindowEndMinutes)}</strong></div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {selectedDriverId && selectedFit && (
          <section className="docos-section">
            <div className="docos-section-heading"><span>TRIP PREVIEW</span></div>
            <div className="docos-panel assignment-impact-v2">
              <div><span>Deadhead</span><strong>{selectedFit.miles.toFixed(1)} mi</strong></div>
              <div><span>Drive time</span><strong>{selectedFit.minutes} min</strong></div>
              <div><span>Arrival</span><strong>{formatTime(selectedFit.arrivalMinutes)}</strong></div>
              <div><span>Queue</span><strong>{selectedFit.queueLength ? `${selectedFit.queueLength} ahead` : 'Next up'}</strong></div>
              <div><span>Loaded leg</span><strong>{loadedLeg && loadedLeg !== 'unavailable' ? `${loadedLeg.distanceMiles.toFixed(1)} mi · ${loadedLeg.durationMinutes} min` : loadedLeg === 'unavailable' ? 'Route unavailable' : 'Calculating…'}</strong></div>
            </div>
          </section>
        )}

        <div className="docos-sticky-actions">
          <button
            type="button"
            className="docos-primary-action"
            disabled={!selectedDriverId || !selectedFit || !loadedLeg || loadedLeg === 'unavailable'}
            onClick={() => selectedDriverId && selectedFit && loadedLeg && loadedLeg !== 'unavailable' && onEvaluate(selectedDriverId, { ...selectedFit, loadedLeg })}
          >
            BUILD TRIP PLAN
          </button>
        </div>
      </div>
    </div>
  )
}

export default DriverFitScreen
