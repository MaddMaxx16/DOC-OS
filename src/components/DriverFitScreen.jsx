import { useEffect, useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { formatAppointment, formatCompactDate, formatTime } from '../utils/gameTime.js'

function getFitStatus(load, gameTime, fit) {
  const arrival = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay + fit.minutes
  const arrivalDay = Math.floor(arrival / 1440)
  const arrivalMinutes = arrival % 1440

  const status =
    arrivalDay < load.pickupDayIndex
    || (arrivalDay === load.pickupDayIndex && arrivalMinutes < load.pickupWindowStartMinutes)
      ? 'EARLY'
      : arrivalDay > load.pickupDayIndex
        || (arrivalDay === load.pickupDayIndex && arrivalMinutes > load.pickupWindowEndMinutes)
        ? 'LATE'
        : 'ON TIME'

  return { ...fit, arrivalDay, arrivalMinutes, status }
}

function DriverFitScreen({
  load,
  drivers,
  runtimePositions = {},
  gameTime,
  candidateDriverId,
  onEvaluate,
  tutorialEnabled = false,
  showTutorialNote = false,
}) {
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
  const available = useMemo(() => drivers.filter((driver) => driver.status === 'available'), [drivers])
  const [fits, setFits] = useState({})
  const [selectedDriverId, setSelectedDriverId] = useState(candidateDriverId)

  useEffect(() => {
    let active = true

    available.forEach(async (driver) => {
      try {
        const current =
          runtimePositions[driver.id]
          || mapLocations.find((location) => location.id === driver.homeBaseLocationId)

        const route = await calculateRoute(current, pickup)

        if (active) {
          setFits((currentFits) => ({
            ...currentFits,
            [driver.id]: {
              miles: route.distanceMiles,
              minutes: route.durationMinutes,
              routeShape: route.routeShape,
            },
          }))
        }
      } catch (error) {
        console.error(error)
        if (active) setFits((currentFits) => ({ ...currentFits, [driver.id]: null }))
      }
    })

    return () => {
      active = false
    }
  }, [available, load?.id, pickup?.id])

  const selectedFit = selectedDriverId && fits[selectedDriverId]
    ? getFitStatus(load, gameTime, fits[selectedDriverId])
    : null

  const evaluateSelected = () => {
    if (!selectedDriverId || !selectedFit) return
    onEvaluate(selectedDriverId, selectedFit)
  }

  return (
    <div className="phone-page driver-fit-screen driver-fit-v2">
      <header className="driver-fit-v2-hero">
        <span className="driver-fit-v2-kicker">DRIVER FIT</span>
        <div className="driver-fit-v2-title-row">
          <h2>{load.id}</h2>
          <span>{available.length} {available.length === 1 ? 'DRIVER' : 'DRIVERS'}</span>
        </div>
        <p>Compare available drivers against the pickup appointment.</p>
      </header>

      <div className="driver-fit-v2-content">
        {showTutorialNote && (
          <div className="driver-fit-v2-note">
            <span>DISPATCH NOTE</span>
            <p>Driver Fit checks deadhead, arrival time and appointment fit before you commit a driver.</p>
          </div>
        )}

        <section className="driver-fit-v2-candidates" aria-label="Available drivers">
          <div className="driver-fit-v2-section-label">AVAILABLE DRIVERS</div>

          {available.map((driver) => {
            const fit = fits[driver.id]
            const evaluated = fit ? getFitStatus(load, gameTime, fit) : null
            const selected = selectedDriverId === driver.id
            const displayName = driver.fullName || driver.name
            const equipment = driver.equipment?.label || 'Equipment not listed'
            const statusTone = evaluated?.status === 'LATE'
              ? 'late'
              : evaluated?.status === 'ON TIME'
                ? 'on-time'
                : 'early'

            return (
              <button
                type="button"
                className={[
                  'driver-fit-v2-card',
                  selected ? 'selected' : '',
                  tutorialEnabled && !selectedDriverId && driver.id === 'marcus' ? 'tutorial-target' : '',
                ].filter(Boolean).join(' ')}
                key={driver.id}
                onClick={() => setSelectedDriverId(driver.id)}
              >
                <div className="driver-fit-v2-card-header">
                  <div className="driver-fit-v2-driver">
                    <span className="driver-fit-v2-avatar" aria-hidden="true">
                      {(displayName || 'D').charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>{displayName}</strong>
                      <small>{equipment}</small>
                    </div>
                  </div>

                  <span className="driver-fit-v2-availability">
                    {selected ? 'SELECTED' : 'AVAILABLE'}
                  </span>
                </div>

                {evaluated ? (
                  <>
                    <div className="driver-fit-v2-metrics">
                      <div>
                        <span>DEADHEAD</span>
                        <strong>{evaluated.miles.toFixed(1)} mi</strong>
                      </div>
                      <div>
                        <span>DRIVE TIME</span>
                        <strong>{evaluated.minutes} min</strong>
                      </div>
                    </div>

                    <div className="driver-fit-v2-schedule">
                      <div>
                        <span>EST. PICKUP ARRIVAL</span>
                        <strong>
                          {formatCompactDate(evaluated.arrivalDay)} · {formatTime(evaluated.arrivalMinutes)}
                        </strong>
                      </div>
                      <div>
                        <span>PICKUP WINDOW</span>
                        <strong>
                          {formatAppointment(
                            load.pickupDayIndex,
                            load.pickupWindowStartMinutes,
                            load.pickupWindowEndMinutes,
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="driver-fit-v2-result">
                      <span>FIT STATUS</span>
                      <strong className={`driver-fit-v2-status ${statusTone}`}>{evaluated.status}</strong>
                    </div>
                  </>
                ) : fit === null ? (
                  <div className="driver-fit-v2-route-state unavailable">
                    <span>ROUTE UNAVAILABLE</span>
                    <small>Deadhead routing could not be calculated.</small>
                  </div>
                ) : (
                  <div className="driver-fit-v2-route-state">
                    <span>CALCULATING ROUTE</span>
                    <small>Checking deadhead and pickup timing…</small>
                  </div>
                )}
              </button>
            )
          })}
        </section>

        <div className="driver-fit-v2-actions">
          <button
            type="button"
            className={`driver-fit-v2-evaluate ${tutorialEnabled && selectedDriverId === 'marcus' ? 'tutorial-target' : ''}`}
            onClick={evaluateSelected}
            disabled={!selectedDriverId || !selectedFit}
          >
            <span>{selectedDriverId ? 'EVALUATE ON MAP' : 'SELECT A DRIVER'}</span>
            {selectedDriverId && <span aria-hidden="true">›</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DriverFitScreen
