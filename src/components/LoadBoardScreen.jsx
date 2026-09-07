import { useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function formatListedMiles(value) {
  if (value === null) return 'CALCULATING'
  if (value === 'unavailable') return 'UNAVAILABLE'
  return `${value.toFixed(1)} MI`
}

function formatLoadStatus(status) {
  if (!status) return 'AVAILABLE'
  return status.replace(/-/g, ' ').toUpperCase()
}

function bucketFor(load) {
  if (['completed', 'delivered', 'expired'].includes(load.status) || ['delivered', 'completed', 'expired'].includes(load.tripStatus)) return 'history'
  if (load.status === 'available') return 'available'
  return 'active'
}

function LoadBoardScreen({ loads, drivers = [], runtimePositions = {}, gameTime, operationDay = 1, embedded = false, onBack, onSelectLoad, onOpenMarketMap, tutorialEnabled = false, tutorialLoadId = 'DOC001' }) {
  const [sortMode, setSortMode] = useState('pickup')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const now = (gameTime?.gameDayIndex ?? 0) * 1440 + (gameTime?.totalMinutesOfDay ?? 420)

  const unlockedLoads = loads.filter((load) => {
    const marketPostMinute = Number.isFinite(load.marketPostMinutes) ? ((load.pickupDayIndex ?? gameTime?.gameDayIndex ?? 0) * 1440 + load.marketPostMinutes) : null
    const timeUnlocked = Number.isFinite(load.postedGameMinute) ? now >= load.postedGameMinute : !Number.isFinite(marketPostMinute) || now >= marketPostMinute
    return timeUnlocked
  })

  const counts = unlockedLoads.reduce((acc, load) => { acc[bucketFor(load)] += 1; return acc }, { available: 0, active: 0, history: 0 })
  const [filterMode, setFilterMode] = useState(() => counts.available ? 'available' : counts.active ? 'active' : 'history')

  const decisionMode = !tutorialEnabled
  const loadViews = useMemo(() => unlockedLoads.map((load) => {
    const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
    const pickupAbsoluteMinute = (load.pickupDayIndex ?? gameTime?.gameDayIndex ?? 0) * 1440 + (load.pickupWindowStartMinutes || 0)
    const rpm = Number.isFinite(load.listedMiles) && load.listedMiles > 0 ? load.rate / load.listedMiles : null
    return { load, pickup, delivery, rpm, pickupAbsoluteMinute }
  }).filter((item) => item.pickup && item.delivery), [unlockedLoads, gameTime?.gameDayIndex])

  const filteredViews = useMemo(() => loadViews.filter(({ load }) => bucketFor(load) === filterMode), [loadViews, filterMode])
  const sortedLoadViews = useMemo(() => {
    const copy = [...filteredViews]
    if (filterMode !== 'available') return copy.sort((a, b) => a.pickupAbsoluteMinute - b.pickupAbsoluteMinute)
    if (sortMode === 'rate') return copy.sort((a, b) => b.load.rate - a.load.rate)
    if (sortMode === 'miles') return copy.sort((a, b) => (a.load.listedMiles ?? 9999) - (b.load.listedMiles ?? 9999))
    return copy.sort((a, b) => a.pickupAbsoluteMinute - b.pickupAbsoluteMinute)
  }, [filteredViews, sortMode, filterMode])

  const changeFilter = (next) => {
    setFilterMode(next)
  }

  return (
    <div className={`phone-page load-board-screen freightlink-v2 ${embedded ? 'embedded' : ''}`}>
      <header className="freightlink-page-heading freightlink-home-compact">
        <span className="freightlink-kicker">FREIGHT MARKET</span>
        <div className="freightlink-title-row"><h2>FreightLink</h2></div>
        <p>Source freight and manage the loads your carrier is working.</p>
      </header>

      <div className="freightlink-filter-row" aria-label="Load status filter">
        {['available', 'active', 'history'].map((mode) => <button key={mode} type="button" className={filterMode === mode ? 'active' : ''} onClick={() => changeFilter(mode)}>{mode.toUpperCase()} <span>{counts[mode]}</span></button>)}
      </div>

      {filterMode === 'available' && (
        <div className="freightlink-view-row" aria-label="Freight view">
          <button type="button" className="active">LIST</button>
          <button type="button" onClick={() => onOpenMarketMap?.()}>MAP</button>
        </div>
      )}

      <section className="freightlink-loads" aria-label={`${filterMode} loads`}>
        <div className="freightlink-loads-toolbar">
          <div className="freightlink-section-label">{filterMode.toUpperCase()} LOADS</div>
          {filterMode === 'available' && decisionMode && (
            <div className="freightlink-sort-dropdown">
              <button type="button" className="freightlink-sort-trigger" aria-haspopup="menu" aria-expanded={sortMenuOpen} onClick={() => setSortMenuOpen((open) => !open)}>
                {({ rate: 'RATE', pickup: 'PICKUP', miles: 'LOAD MILES' })[sortMode]} <span>▾</span>
              </button>
              {sortMenuOpen && (
                <div className="freightlink-sort-menu" role="menu">
                  {[['pickup', 'PICKUP TIME'], ['rate', 'RATE'], ['miles', 'LOAD MILES']].map(([value, label]) => (
                    <button key={value} type="button" role="menuitemradio" aria-checked={sortMode === value} className={sortMode === value ? 'active' : ''} onClick={() => { setSortMode(value); setSortMenuOpen(false) }}>{sortMode === value ? '✓ ' : ''}{label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {sortedLoadViews.length ? (
          <div className={`load-list ${decisionMode ? 'decision-load-list' : ''}`}>
            {sortedLoadViews.map(({ load, pickup, delivery, rpm }) => decisionMode && filterMode === 'available' ? (
              <button type="button" className="freight-decision-row phase2" key={load.id} onClick={() => onSelectLoad(load.id)}>
                <div className="freight-decision-time"><span>PICKUP · {formatCompactDate(load.pickupDayIndex)}</span><strong>{formatTime(load.pickupWindowStartMinutes)}</strong></div>
                <div className="freight-decision-body"><div className="freight-decision-top"><div className="freight-decision-id"><strong>{load.loadNumber || load.id}</strong></div><div className="freight-decision-rate"><strong>${load.rate}</strong><span>{rpm ? `$${rpm.toFixed(2)}/MI` : 'RATE'}</span></div></div><div className="freight-decision-lane phase2"><strong>{pickup.name}</strong><span>→</span><strong>{delivery.name}</strong></div><div className="freight-decision-meta"><span>LOAD {formatListedMiles(load.listedMiles)}</span><span>DELIVERY {formatCompactDate(load.deliveryDayIndex)} · {formatTime(load.deliveryWindowStartMinutes)}</span></div></div>
              </button>
            ) : (
              <button type="button" className={`freight-listing-row ${tutorialEnabled && load.id === tutorialLoadId && load.status === 'available' ? 'tutorial-target' : ''}`} key={load.id} onClick={() => onSelectLoad(load.id)}>
                <div className="freight-listing-time"><span>PICKUP · {formatCompactDate(load.pickupDayIndex)}</span><strong>{formatTime(load.pickupWindowStartMinutes)}</strong></div>
                <div className="freight-listing-main"><div className="freight-listing-top"><strong>{load.loadNumber || load.id}</strong><span className="freight-load-status">{formatLoadStatus(load.status)}</span></div><div className="freight-listing-lane"><span>{pickup.name}</span><b>→</b><span>{delivery.name}</span></div><small>DELIVERY {formatCompactDate(load.deliveryDayIndex)} · {formatTime(load.deliveryWindowStartMinutes)} · LOAD {formatListedMiles(load.listedMiles)}</small></div>
                <div className="freight-listing-rate"><strong>${load.rate}</strong><span>{rpm ? `$${rpm.toFixed(2)}/MI` : 'RATE'}</span></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="freightlink-empty"><strong>No {filterMode} loads.</strong><span>{filterMode === 'active' ? 'Accepted freight will appear here.' : filterMode === 'history' ? 'Completed freight will appear here.' : 'New freight will appear here when it posts.'}</span></div>
        )}
      </section>
      {!embedded && <button type="button" className="back-button" onClick={onBack}>Back</button>}
    </div>
  )
}
export default LoadBoardScreen
