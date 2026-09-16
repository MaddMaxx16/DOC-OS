import { useMemo, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { getFreightCommodity } from '../utils/freightIdentity.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getFreightHaulClass, getPlanQuality } from '../utils/planningIntelligence.js'
import { MARKET_HORIZON_DAYS } from '../utils/freightMarket.js'
import FreightLinkMarketMap from './FreightLinkMarketMap.jsx'

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

function LoadBoardScreen({ loads, drivers = [], runtimePositions = {}, gameTime, operationDay = 1, embedded = false, onBack, onSelectLoad, onOpenScheduler }) {
  const [sortMode, setSortMode] = useState('pickup')
  const [mapOpen, setMapOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [pickupDateFilter, setPickupDateFilter] = useState('all')
  const now = (gameTime?.gameDayIndex ?? 0) * 1440 + (gameTime?.totalMinutesOfDay ?? 360)

  const unlockedLoads = loads.filter((load) => {
    const marketPostMinute = Number.isFinite(load.marketPostMinutes) ? ((load.pickupDayIndex ?? gameTime?.gameDayIndex ?? 0) * 1440 + load.marketPostMinutes) : null
    const timeUnlocked = Number.isFinite(load.postedGameMinute) ? now >= load.postedGameMinute : !Number.isFinite(marketPostMinute) || now >= marketPostMinute
    return timeUnlocked
  })

  const counts = unlockedLoads.reduce((acc, load) => { acc[bucketFor(load)] += 1; return acc }, { available: 0, active: 0, history: 0 })
  const recentNewCount = unlockedLoads.filter((load) => load.status === 'available' && Number.isFinite(load.postedGameMinute) && now - load.postedGameMinute >= 0 && now - load.postedGameMinute <= 30).length
  const [filterMode, setFilterMode] = useState(() => counts.available ? 'available' : counts.active ? 'active' : 'history')

  const decisionMode = true
  const planningDriver = drivers.find((driver) => driver.carrierId) || null
  const loadViews = useMemo(() => unlockedLoads.map((load) => {
    const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
    const pickupAbsoluteMinute = (load.pickupDayIndex ?? gameTime?.gameDayIndex ?? 0) * 1440 + (load.pickupWindowStartMinutes || 0)
    const rpm = Number.isFinite(load.listedMiles) && load.listedMiles > 0 ? load.rate / load.listedMiles : null
    let planningHint = null
    if (planningDriver && load.status === 'available') {
      const simulatedLoads = loads.map((item) => item.id === load.id ? {
        ...item,
        candidateDriverId: planningDriver.id,
        scheduleApprovalQueued: true,
      } : item)
      const quality = getPlanQuality(simulatedLoads, planningDriver.id)
      planningHint = quality?.label === 'CONFLICT'
        ? { label: 'CONFLICT', tone: 'conflict' }
        : quality?.label === 'TIGHT'
          ? { label: 'TIGHT', tone: 'tight' }
          : { label: 'FIT', tone: 'fit' }
    }
    return { load, pickup, delivery, rpm, pickupAbsoluteMinute, haulClass: getFreightHaulClass(load), planningHint }
  }).filter((item) => item.pickup && item.delivery), [unlockedLoads, gameTime?.gameDayIndex, planningDriver?.id, loads])

  const marketDayIndex = gameTime?.gameDayIndex ?? 0
  const marketDays = useMemo(() => Array.from({ length: MARKET_HORIZON_DAYS }, (_, offset) => marketDayIndex + offset), [marketDayIndex])
  const filteredViews = useMemo(() => loadViews.filter(({ load }) => {
    if (bucketFor(load) !== filterMode) return false
    if (filterMode !== 'available' || pickupDateFilter === 'all') return true
    return (load.pickupDayIndex ?? marketDayIndex) === pickupDateFilter
  }), [loadViews, filterMode, pickupDateFilter, marketDayIndex])
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
      <header className="freightlink-page-heading freightlink-home-compact aw13">
        <div className="freightlink-title-row">
          <div className="freightlink-title-copy">
            <h2>FreightLink</h2>
            {recentNewCount > 0 && <span className="freightlink-new-loads">{recentNewCount} NEW</span>}
          </div>
          <button type="button" className="freightlink-scheduler-shortcut aw13" onClick={onOpenScheduler}>
            <span>SCHEDULE</span>
            <strong>TODAY’S PLAN</strong>
          </button>
        </div>
      </header>

      <div className="freightlink-filter-row aw15" aria-label="Load status filter and sort controls">
        {['available', 'active', 'history'].map((mode) => <button key={mode} type="button" className={filterMode === mode ? 'active' : ''} onClick={() => changeFilter(mode)}>{mode.toUpperCase()} <span>{counts[mode]}</span></button>)}
        {filterMode === 'available' && (
          <div className="freightlink-sort-tab">
            <button type="button" className={sortMenuOpen ? 'active' : ''} aria-haspopup="menu" aria-expanded={sortMenuOpen} onClick={() => setSortMenuOpen((open) => !open)}>SORT <span>▾</span></button>
            {sortMenuOpen && (
              <div className="freightlink-sort-menu aw15" role="menu">
                {[['pickup', 'PICKUP TIME'], ['rate', 'RATE'], ['miles', 'LOAD MILES']].map(([value, label]) => (
                  <button key={value} type="button" role="menuitemradio" aria-checked={sortMode === value} className={sortMode === value ? 'active' : ''} onClick={() => { setSortMode(value); setSortMenuOpen(false) }}>{sortMode === value ? '✓ ' : ''}{label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {filterMode === 'available' && (
        <div className="freightlink-date-strip" aria-label="Pickup date filter">
          <button type="button" className={pickupDateFilter === 'all' ? 'active' : ''} onClick={() => setPickupDateFilter('all')}>ALL</button>
          {marketDays.map((dayIndex, offset) => (
            <button key={dayIndex} type="button" className={pickupDateFilter === dayIndex ? 'active' : ''} onClick={() => setPickupDateFilter(dayIndex)}>
              <span>{offset === 0 ? 'TODAY' : formatCompactDate(dayIndex)}</span>
            </button>
          ))}
        </div>
      )}

      {filterMode === 'available' && (
        <div className="freightlink-view-row" aria-label="Freight view">
          <button type="button" className={!mapOpen ? 'active' : ''} onClick={() => setMapOpen(false)}>LIST</button>
          <button type="button" className={mapOpen ? 'active' : ''} onClick={() => setMapOpen(true)}>MAP</button>
        </div>
      )}

      <section className="freightlink-loads" aria-label={`${filterMode} loads`}>
        {filterMode !== 'available' && <div className="freightlink-loads-toolbar aw13"><div className="freightlink-section-label">{filterMode.toUpperCase()}</div></div>}
        {sortedLoadViews.length ? (
          <div className={`load-list ${decisionMode ? 'decision-load-list' : ''}`}>
            {sortedLoadViews.map(({ load, pickup, delivery, rpm, haulClass, planningHint }) => decisionMode && filterMode === 'available' ? (
              <button type="button" className="freight-decision-row phase2 av27" key={load.id} onClick={() => onSelectLoad(load.id)}>
                <div className="freight-decision-time"><span>PICKUP · {formatCompactDate(load.pickupDayIndex)}</span><strong>{formatTime(load.pickupWindowStartMinutes)}</strong><em className={`freight-haul-tag ${haulClass.tone}`}>{haulClass.label}</em></div>
                <div className="freight-decision-body">
                  <div className="freight-decision-top"><div className="freight-decision-id"><strong>{pickup.name} → {delivery.name}</strong><small>{getFreightCommodity(load)}</small></div><div className="freight-decision-rate"><strong>${load.rate}</strong><span>{rpm ? `$${rpm.toFixed(2)}/MI` : 'RATE'}</span></div></div>
                  <div className="freight-decision-meta"><span>LOAD {formatListedMiles(load.listedMiles)}</span><span>DELIVERY {formatCompactDate(load.deliveryDayIndex)} · {formatTime(load.deliveryWindowStartMinutes)}</span>{planningHint && <em className={`freight-plan-hint ${planningHint.tone}`}>{planningHint.label}</em>}</div>
                </div>
              </button>
            ) : (
              <button type="button" className="freight-listing-row" key={load.id} onClick={() => onSelectLoad(load.id)}>
                <div className="freight-listing-time"><span>PICKUP · {formatCompactDate(load.pickupDayIndex)}</span><strong>{formatTime(load.pickupWindowStartMinutes)}</strong><em className={`freight-haul-tag ${haulClass.tone}`}>{haulClass.label}</em></div>
                <div className="freight-listing-main"><div className="freight-listing-top"><strong>{pickup.name} → {delivery.name}</strong><span className={`freight-load-status ${load.status === 'expired' ? 'expired' : ''}`}>{formatLoadStatus(load.status)}</span></div><div className="freight-listing-lane"><span>{getFreightCommodity(load)}</span></div><small>DELIVERY {formatCompactDate(load.deliveryDayIndex)} · {formatTime(load.deliveryWindowStartMinutes)} · LOAD {formatListedMiles(load.listedMiles)}</small></div>
                <div className="freight-listing-rate"><strong>${load.rate}</strong><span>{rpm ? `$${rpm.toFixed(2)}/MI` : 'RATE'}</span></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="freightlink-empty"><strong>No {filterMode} loads.</strong><span>{filterMode === 'active' ? 'Accepted freight will appear here.' : filterMode === 'history' ? 'Completed freight will appear here.' : 'New freight will appear here when it posts.'}</span></div>
        )}
      </section>

      {mapOpen && filterMode === 'available' && (
        <div className="freightlink-map-workspace" role="dialog" aria-modal="true" aria-label="FreightLink market map workspace">
          <header className="freightlink-map-workspace-header">
            <button type="button" className="freightlink-map-workspace-back" onClick={() => setMapOpen(false)} aria-label="Back to FreightLink">‹</button>
            <div>
              <span>FREIGHTLINK</span>
              <strong>MARKET MAP</strong>
            </div>
            <button type="button" className="freightlink-map-workspace-close" onClick={() => setMapOpen(false)} aria-label="Close market map">×</button>
          </header>
          <div className="freightlink-map-workspace-body">
            <FreightLinkMarketMap
              loadViews={sortedLoadViews}
              allLoads={unlockedLoads}
              drivers={drivers}
              runtimePositions={runtimePositions}
              gameTime={gameTime}
              onViewLoad={(loadId) => { setMapOpen(false); onSelectLoad(loadId) }}
            />
          </div>
        </div>
      )}

      {!embedded && <button type="button" className="back-button" onClick={onBack}>Back</button>}
    </div>
  )
}
export default LoadBoardScreen
