import { useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getProjectedDriverOrigin } from '../utils/driverQueue.js'

function formatListedMiles(value) {
  if (value === null) return 'CALCULATING'
  if (value === 'unavailable') return 'UNAVAILABLE'
  return `${value.toFixed(1)} MI`
}

function formatLoadStatus(status) {
  if (!status) return 'AVAILABLE'
  return status.replace(/-/g, ' ').toUpperCase()
}

function straightLineMiles(a, b) {
  if (!a || !b) return null
  const toRad = (deg) => deg * Math.PI / 180
  const earthMiles = 3958.8
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthMiles * Math.asin(Math.sqrt(h))
}

function preliminaryFit({ origin, pickup, availableAbsoluteMinute, pickupAbsoluteMinute }) {
  const airMiles = straightLineMiles(origin, pickup)
  if (!Number.isFinite(airMiles)) return { label: 'REVIEW', tone: 'neutral', distance: null, buffer: null }
  // Decision-board estimate only. Driver Select still performs the real routed evaluation.
  const estimatedRoadMiles = Math.max(1, airMiles * 1.28)
  const estimatedDriveMinutes = Math.ceil((estimatedRoadMiles / 32) * 60 + 10)
  const estimatedArrival = availableAbsoluteMinute + estimatedDriveMinutes
  const buffer = pickupAbsoluteMinute - estimatedArrival
  if (buffer >= 45) return { label: 'GOOD NEXT LOAD', tone: 'good', distance: estimatedRoadMiles, buffer }
  if (buffer >= 10) return { label: 'TIGHT', tone: 'tight', distance: estimatedRoadMiles, buffer }
  return { label: 'POOR FIT', tone: 'poor', distance: estimatedRoadMiles, buffer }
}

function LoadBoardScreen({ loads, drivers = [], runtimePositions = {}, gameTime, operationDay = 1, embedded = false, onBack, onSelectLoad, tutorialEnabled = false, tutorialLoadId = 'DOC001' }) {
  const [sortMode, setSortMode] = useState('best-fit')
  const now = (gameTime?.gameDayIndex ?? 0) * 1440 + (gameTime?.totalMinutesOfDay ?? 420)
  const visibleLoads = loads.filter((load) => {
    const timeUnlocked = load.postedGameMinute === undefined || now >= load.postedGameMinute
    const progressionUnlocked = !load.unlockAfterLoadId || loads.some((candidate) => candidate.id === load.unlockAfterLoadId && candidate.status === 'completed')
    const operationUnlocked = !load.scheduledOperationDay || load.scheduledOperationDay === operationDay
    return timeUnlocked && progressionUnlocked && operationUnlocked && !['completed', 'delivered'].includes(load.status)
  })

  const decisionMode = operationDay >= 2 && !tutorialEnabled
  const activeDriver = drivers[0]
  const projectedOrigin = activeDriver ? getProjectedDriverOrigin({ driver: activeDriver, loads, runtimePositions, gameTime }) : null

  const loadViews = useMemo(() => visibleLoads.map((load) => {
    const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
    const pickupAbsoluteMinute = (load.pickupDayIndex ?? gameTime?.gameDayIndex ?? 0) * 1440 + (load.pickupWindowStartMinutes || 0)
    const fit = preliminaryFit({
      origin: projectedOrigin?.location,
      pickup,
      availableAbsoluteMinute: projectedOrigin?.availableAbsoluteMinute ?? now,
      pickupAbsoluteMinute,
    })
    const rpm = Number.isFinite(load.listedMiles) && load.listedMiles > 0 ? load.rate / load.listedMiles : null
    return { load, pickup, delivery, fit, rpm, pickupAbsoluteMinute }
  }).filter((item) => item.pickup && item.delivery), [visibleLoads, projectedOrigin?.location, projectedOrigin?.availableAbsoluteMinute, gameTime?.gameDayIndex, now])

  const sortedLoadViews = useMemo(() => {
    const copy = [...loadViews]
    if (sortMode === 'rate') return copy.sort((a, b) => b.load.rate - a.load.rate)
    if (sortMode === 'pickup') return copy.sort((a, b) => a.pickupAbsoluteMinute - b.pickupAbsoluteMinute)
    if (sortMode === 'distance') return copy.sort((a, b) => (a.fit.distance ?? 999) - (b.fit.distance ?? 999))
    const rank = { good: 0, tight: 1, poor: 2, neutral: 3 }
    return copy.sort((a, b) => (rank[a.fit.tone] - rank[b.fit.tone]) || (b.rpm ?? 0) - (a.rpm ?? 0))
  }, [loadViews, sortMode])

  return (
    <div className={`phone-page load-board-screen freightlink-v2 ${embedded ? 'embedded' : ''}`}>
      <header className="freightlink-page-heading">
        <span className="freightlink-kicker">FREIGHT MARKET</span>
        <div className="freightlink-title-row">
          <h2>FreightLink</h2>
          <span className="freightlink-live-count">{visibleLoads.filter((load) => load.status === 'available').length} AVAILABLE</span>
        </div>
        <p>{decisionMode ? `Compare today's freight and build ${activeDriver?.name || 'your driver'}'s day.` : 'Review available freight for your active carrier.'}</p>
      </header>

      {decisionMode && (
        <div className="freightlink-sortbar" aria-label="Sort freight">
          {[['best-fit', 'BEST FIT'], ['rate', 'RATE'], ['pickup', 'PICKUP'], ['distance', 'DISTANCE']].map(([value, label]) => (
            <button key={value} type="button" className={sortMode === value ? 'active' : ''} onClick={() => setSortMode(value)}>{label}</button>
          ))}
        </div>
      )}

      <section className="freightlink-loads" aria-label="Available loads">
        <div className="freightlink-section-label">{decisionMode ? 'TODAY’S LOADS' : 'AVAILABLE LOADS'}</div>

        {sortedLoadViews.length ? (
          <div className={`load-list ${decisionMode ? 'decision-load-list' : ''}`}>
            {sortedLoadViews.map(({ load, pickup, delivery, fit, rpm }) => decisionMode ? (
              <button type="button" className={`freight-decision-row phase2 ${load.status !== 'available' ? 'is-claimed' : ''}`} key={load.id} onClick={() => onSelectLoad(load.id)}>
                <div className="freight-decision-time">
                  <span>PICKUP</span>
                  <strong>{formatTime(load.pickupWindowStartMinutes)}</strong>
                </div>
                <div className="freight-decision-body">
                  <div className="freight-decision-top">
                    <div className="freight-decision-id"><strong>{load.id}</strong><span className={`freight-fit-chip ${fit.tone}`}>{load.status !== 'available' ? formatLoadStatus(load.status) : fit.label}</span></div>
                    <div className="freight-decision-rate"><strong>${load.rate}</strong><span>{rpm ? `$${rpm.toFixed(2)}/MI` : 'RATE'}</span></div>
                  </div>
                  <div className="freight-decision-lane phase2">
                    <strong>{pickup.name}</strong>
                    <span aria-hidden="true">→</span>
                    <strong>{delivery.name}</strong>
                  </div>
                  <div className="freight-decision-meta">
                    <span>{formatListedMiles(load.listedMiles)}</span>
                    <span>{Number.isFinite(fit.distance) ? `~${fit.distance.toFixed(0)} MI TO PICKUP` : 'REVIEW ORIGIN'}</span>
                  </div>
                </div>
              </button>
             ) : (
              <button type="button" className={`freight-listing-row ${tutorialEnabled && load.id === tutorialLoadId && load.status === 'available' ? 'tutorial-target' : ''}`} key={load.id} onClick={() => onSelectLoad(load.id)}>
                <div className="freight-listing-time"><span>PICKUP</span><strong>{formatTime(load.pickupWindowStartMinutes)}</strong></div>
                <div className="freight-listing-main">
                  <div className="freight-listing-top"><strong>{load.id}</strong><span className="freight-load-status">{formatLoadStatus(load.status)}</span></div>
                  <div className="freight-listing-lane"><span>{pickup.name}</span><b aria-hidden="true">→</b><span>{delivery.name}</span></div>
                  <small>DELIVERY {formatTime(load.deliveryWindowStartMinutes)} · {formatListedMiles(load.listedMiles)}</small>
                </div>
                <div className="freight-listing-rate"><strong>${load.rate}</strong><span>{rpm ? `$${rpm.toFixed(2)}/MI` : 'RATE'}</span></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="freightlink-empty"><strong>No loads available.</strong><span>New freight will appear here when it posts.</span></div>
        )}
      </section>

      {!embedded && <button type="button" className="back-button" onClick={onBack}>Back</button>}
    </div>
  )
}
export default LoadBoardScreen
