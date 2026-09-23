// B.5.4D.4.1.2 — Carrier-Controlled Driver Scheduler
import { useMemo, useState } from 'react'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import mapLocations from '../data/mapLocations.js'

const WEEKDAYS = ['TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'MON']

function weekday(dayIndex) {
  const n = ((Number(dayIndex || 0) % 7) + 7) % 7
  return WEEKDAYS[n]
}

function getWorkday(driver, dayIndex) {
  return driver?.workdayByDay?.[String(dayIndex)] || driver?.workdayByDay?.[dayIndex] || null
}

function getCarrierVisibleWorkday(driver, dayIndex, currentDay) {
  const workday = getWorkday(driver, dayIndex)
  if (!workday) return null

  // D.4.1.2 compatibility for saves created by the editable-scheduler prototype:
  // only the first 3 inherited days remain visible unless the carrier explicitly
  // confirmed a later day.
  if (
    dayIndex > currentDay + 2 &&
    !workday.carrierConfirmed &&
    workday.scheduleSource !== 'carrier' &&
    workday.scheduleSource !== 'carrier-handoff'
  ) {
    return null
  }

  return workday
}

function compactTime(minutes) {
  const n = Number(minutes)
  if (!Number.isFinite(n)) return '—'
  return formatTime(((n % 1440) + 1440) % 1440)
    .replace(':00 ', ' ')
    .replace(' AM', 'a')
    .replace(' PM', 'p')
}

function isCarrierConfirmed(workday) {
  return Boolean(
    workday?.carrierConfirmed ||
    workday?.scheduleSource === 'carrier' ||
    workday?.scheduleSource === 'carrier-handoff' ||
    workday?.scheduleSource === 'previous-dispatcher'
  )
}

function loadsForDay(loads, driverId, dayIndex) {
  return loads
    .filter((load) => {
      if (load.assignedDriverId !== driverId && load.candidateDriverId !== driverId) return false
      return Number(load.pickupDayIndex) === dayIndex || Number(load.deliveryDayIndex) === dayIndex
    })
    .sort((a, b) => Number(a.pickupWindowStartMinutes || 0) - Number(b.pickupWindowStartMinutes || 0))
}

function scheduleLabel(workday) {
  if (!workday) return 'AWAITING CARRIER'
  if (workday.isDayOff) return 'OFF'
  const start = Number(workday.startMinutes)
  const end = Number(workday.endMinutes)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'AWAITING CARRIER'
  return `${compactTime(start)}–${compactTime(end)}${end <= start ? ' +1' : ''}`
}


// B.5.4D.4.1.4 — Dispatcher Lunch Window
function lunchWindowLabel(workday) {
  const start = Number(workday?.lunchWindowStartMinutes)
  const end = Number(workday?.lunchWindowEndMinutes)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return `${compactTime(start)}–${compactTime(end)}`
}

function lunchInput(minutes) {
  const n = Number(minutes)
  if (!Number.isFinite(n)) return ''
  const v = ((n % 1440) + 1440) % 1440
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

function lunchMinutes(value) {
  if (!value?.includes(':')) return null
  const [h, m] = value.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function LunchWindowSheet({ driver, workday, onClose, onSave }) {
  const shiftStart = Number(workday?.startMinutes)
  const suggestedStart = Number.isFinite(Number(workday?.lunchWindowStartMinutes))
    ? Number(workday.lunchWindowStartMinutes)
    : Number.isFinite(shiftStart)
      ? (shiftStart + 240) % 1440
      : 720

  const suggestedEnd = Number.isFinite(Number(workday?.lunchWindowEndMinutes))
    ? Number(workday.lunchWindowEndMinutes)
    : (suggestedStart + 60) % 1440

  const [start, setStart] = useState(lunchInput(suggestedStart))
  const [end, setEnd] = useState(lunchInput(suggestedEnd))

  const save = () => {
    const startMinutes = lunchMinutes(start)
    const endMinutes = lunchMinutes(end)
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return
    onSave?.({
      lunchWindowStartMinutes: startMinutes,
      lunchWindowEndMinutes: endMinutes,
      lunchWindowSetBy: 'dispatcher',
    })
  }

  const useWindow = (offsetHours) => {
    if (!Number.isFinite(shiftStart)) return
    const nextStart = (shiftStart + offsetHours * 60) % 1440
    setStart(lunchInput(nextStart))
    setEnd(lunchInput((nextStart + 60) % 1440))
  }

  return (
    <div className="scheduler-lunch-backdrop" role="dialog" aria-modal="true">
      <section className="scheduler-lunch-sheet">
        <header>
          <div>
            <span>DISPATCHER PLAN · LUNCH WINDOW</span>
            <strong>{driver?.fullName || driver?.name || 'Driver'}</strong>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="scheduler-lunch-body">
          <p>
            The carrier owns the shift. You choose a realistic lunch window that
            freight planning should protect.
          </p>

          <div className="scheduler-lunch-shift">
            <span>CARRIER SHIFT</span>
            <strong>
              {Number.isFinite(Number(workday?.startMinutes))
                ? `${compactTime(workday.startMinutes)}–${compactTime(workday.endMinutes)}`
                : 'Not confirmed'}
            </strong>
          </div>

          <div className="scheduler-lunch-quick">
            <span>QUICK WINDOW</span>
            <div>
              <button type="button" onClick={() => useWindow(4)}>+4 HR</button>
              <button type="button" onClick={() => useWindow(5)}>+5 HR</button>
              <button type="button" onClick={() => useWindow(6)}>+6 HR</button>
            </div>
          </div>

          <div className="scheduler-lunch-time-grid">
            <label>
              <span>EARLIEST</span>
              <input type="time" step="900" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label>
              <span>LATEST</span>
              <input type="time" step="900" value={end} onChange={(event) => setEnd(event.target.value)} />
            </label>
          </div>

          <small>
            This is a planning window, not an automatic break. The dispatcher still
            has to route the driver into a workable lunch during operations.
          </small>
        </div>

        <footer>
          <button type="button" className="secondary" onClick={onClose}>CANCEL</button>
          <button type="button" className="primary" onClick={save}>SAVE LUNCH WINDOW</button>
        </footer>
      </section>
    </div>
  )
}


// B.5.4D.4.1.5 — Driver Operational View
function prettyLocation(value) {
  if (!value) return 'Not available'
  return String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function hosLabel(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value)) return '—'
  const hours = Math.floor(value / 60)
  const mins = Math.max(0, value % 60)
  return `${hours}:${String(mins).padStart(2, '0')}`
}

function getDriverCommittedLoads(loads, driverId) {
  return loads
    .filter((load) => load.assignedDriverId === driverId)
    .filter((load) => !['completed', 'paid', 'cancelled', 'expired'].includes(String(load.status || '').toLowerCase()))
    .sort((a, b) => {
      const aTime = Number(a.pickupDayIndex || 0) * 1440 + Number(a.pickupWindowStartMinutes || 0)
      const bTime = Number(b.pickupDayIndex || 0) * 1440 + Number(b.pickupWindowStartMinutes || 0)
      return aTime - bTime
    })
}

function getDriverPlannedLoads(loads, driverId) {
  return loads
    .filter((load) => load.candidateDriverId === driverId && load.assignedDriverId !== driverId)
    .filter((load) => !['completed', 'paid', 'cancelled', 'expired'].includes(String(load.status || '').toLowerCase()))
    .sort((a, b) => {
      const aTime = Number(a.pickupDayIndex || 0) * 1440 + Number(a.pickupWindowStartMinutes || 0)
      const bTime = Number(b.pickupDayIndex || 0) * 1440 + Number(b.pickupWindowStartMinutes || 0)
      return aTime - bTime
    })
}

function getDriverOperationalStatus(driver, workday, activeLoad, gameTime) {
  if (!driver) return 'UNAVAILABLE'

  const lunchState = String(driver.lunchEvent || driver.lunchRouteStatus || '').toLowerCase()
  if (lunchState.includes('lunch') || lunchState === 'arrived') return 'ON LUNCH'

  const tripStatus = String(activeLoad?.tripStatus || '').toLowerCase()
  if (tripStatus.includes('en-route')) return 'DRIVING'
  if (tripStatus.includes('waiting')) return 'WAITING'
  if (tripStatus.includes('loading')) return 'LOADING'
  if (tripStatus.includes('unloading')) return 'UNLOADING'
  if (tripStatus.includes('checked-in') || tripStatus.includes('checking-in')) return 'AT FACILITY'

  if (workday?.isDayOff) return 'DAY OFF'

  const start = Number(workday?.startMinutes)
  const end = Number(workday?.endMinutes)
  const now = Number(gameTime?.totalMinutesOfDay || 0)

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'AWAITING CARRIER'

  const overnight = end <= start
  if (now < start) return 'OFF DUTY'
  if (!overnight && now >= end) return 'SHIFT COMPLETE'

  return activeLoad ? 'ON DUTY' : 'AVAILABLE'
}

function nextConfirmedWorkday(driver, currentDay) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const dayIndex = currentDay + offset
    const workday = getCarrierVisibleWorkday(driver, dayIndex, currentDay)
    if (!workday || workday.isDayOff) continue
    if (!Number.isFinite(Number(workday.startMinutes)) || !Number.isFinite(Number(workday.endMinutes))) continue
    return { dayIndex, workday }
  }
  return null
}


// B.5.4D.4.1.6 — End-of-Day Positioning
function distanceMiles(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY
  const lat1 = Number(a.latitude)
  const lon1 = Number(a.longitude)
  const lat2 = Number(b.latitude)
  const lon2 = Number(b.longitude)
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.POSITIVE_INFINITY

  const toRad = (value) => value * Math.PI / 180
  const earthMiles = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLon / 2)
  const h = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2
  return 2 * earthMiles * Math.asin(Math.min(1, Math.sqrt(h)))
}

function isStagingLocation(location) {
  const haystack = [
    location?.id,
    location?.name,
    location?.type,
    location?.category,
    location?.kind,
  ].filter(Boolean).join(' ').toLowerCase()

  return /truck stop|truck-stop|travel plaza|service area|rest area|staging|truck plaza/.test(haystack)
}

function getShiftEndReferencePosition({ driver, committedLoads, runtimePositions }) {
  const finalLoad = committedLoads[committedLoads.length - 1]
  const finalDelivery = finalLoad
    ? mapLocations.find((location) => location.id === finalLoad.deliveryLocationId)
    : null
  if (finalDelivery) return finalDelivery

  const runtime = runtimePositions?.[driver.id]
  if (runtime) return runtime

  return mapLocations.find((location) => location.id === driver.lastKnownLocationId)
    || mapLocations.find((location) => location.id === driver.homeBaseLocationId)
    || null
}

function getTomorrowFirstLoad(loads, driverId, currentDay) {
  return loads
    .filter((load) => (
      (load.assignedDriverId === driverId || load.candidateDriverId === driverId) &&
      Number(load.pickupDayIndex) === currentDay + 1 &&
      !['completed', 'paid', 'cancelled', 'expired'].includes(String(load.status || '').toLowerCase())
    ))
    .sort((a, b) => Number(a.pickupWindowStartMinutes || 0) - Number(b.pickupWindowStartMinutes || 0))[0] || null
}

function buildShiftEndOptions({ driver, carrier, loads, currentDay, committedLoads, runtimePositions }) {
  const options = []
  const seen = new Set()
  const reference = getShiftEndReferencePosition({ driver, committedLoads, runtimePositions })

  const add = (option) => {
    if (!option?.locationId || seen.has(option.locationId)) return
    seen.add(option.locationId)
    options.push(option)
  }

  const yardId = driver.homeBaseLocationId || carrier?.homeBaseLocationId
  const yard = mapLocations.find((location) => location.id === yardId)
  if (yard) {
    add({
      type: 'yard',
      locationId: yard.id,
      label: yard.name || 'Carrier Yard',
      eyebrow: 'RETURN TO YARD',
      note: 'Safe home-base finish. Reliable reset, but tomorrow may begin with more deadhead.',
    })
  }

  const tomorrowLoad = getTomorrowFirstLoad(loads, driver.id, currentDay)
  const tomorrowPickup = tomorrowLoad
    ? mapLocations.find((location) => location.id === tomorrowLoad.pickupLocationId)
    : null
  if (tomorrowPickup) {
    add({
      type: 'next-pickup',
      locationId: tomorrowPickup.id,
      label: tomorrowPickup.name || 'Tomorrow Pickup Area',
      eyebrow: 'POSITION FOR TOMORROW',
      note: `Stage near ${tomorrowLoad.loadNumber || tomorrowLoad.id}'s first pickup to reduce tomorrow's deadhead.`,
    })
  }

  const stagingCandidates = mapLocations
    .filter(isStagingLocation)
    .map((location) => ({ location, miles: distanceMiles(reference, location) }))
    .sort((a, b) => a.miles - b.miles)

  stagingCandidates.slice(0, 2).forEach(({ location, miles }, index) => {
    add({
      type: 'truck-stop',
      locationId: location.id,
      label: location.name || 'Truck Stop',
      eyebrow: index === 0 ? 'NEAREST STAGING' : 'ALTERNATE STAGING',
      note: Number.isFinite(miles)
        ? `Truck-friendly staging about ${Math.max(1, Math.round(miles))} mi from the projected finish area.`
        : 'Truck-friendly staging option for the end of the shift.',
    })
  })

  const finalLoad = committedLoads[committedLoads.length - 1]
  const finalDelivery = finalLoad
    ? mapLocations.find((location) => location.id === finalLoad.deliveryLocationId)
    : null
  if (finalDelivery) {
    add({
      type: 'delivery-area',
      locationId: finalDelivery.id,
      label: finalDelivery.name || 'Final Delivery Area',
      eyebrow: 'STAY IN FINAL AREA',
      note: 'End where the final load finishes. Low extra movement tonight, but tomorrow positioning may be weaker.',
    })
  }

  return options
}

function ShiftEndPlannerSheet({ driver, carrier, loads, currentDay, committedLoads, runtimePositions, onClose, onSave }) {
  const options = buildShiftEndOptions({
    driver,
    carrier,
    loads,
    currentDay,
    committedLoads,
    runtimePositions,
  })

  const currentId =
    driver.shiftEndLocationId ||
    driver.idleTargetLocationId ||
    null

  const [selectedId, setSelectedId] = useState(currentId || options[0]?.locationId || null)
  const selected = options.find((option) => option.locationId === selectedId) || null

  return (
    <div className="shift-end-planner-backdrop" role="dialog" aria-modal="true">
      <section className="shift-end-planner-sheet">
        <header>
          <div>
            <span>DOC OS · SHIFT END</span>
            <strong>Plan End-of-Day Position</strong>
            <small>{driver.fullName || driver.name || 'Driver'}</small>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="shift-end-planner-body">
          <p>
            The carrier owns the shift time. You decide where the truck should finish
            so the driver can end safely and tomorrow starts from a smart position.
          </p>

          {options.length ? (
            <div className="shift-end-option-list">
              {options.map((option) => (
                <button
                  type="button"
                  key={option.locationId}
                  className={selectedId === option.locationId ? 'selected' : ''}
                  onClick={() => setSelectedId(option.locationId)}
                >
                  <span>
                    <small>{option.eyebrow}</small>
                    <strong>{option.label}</strong>
                    <em>{option.note}</em>
                  </span>
                  <b>{selectedId === option.locationId ? '✓' : '○'}</b>
                </button>
              ))}
            </div>
          ) : (
            <div className="shift-end-empty">
              <strong>No staging choices available yet.</strong>
              <span>Once DOC OS has a yard, truck stop, final delivery, or tomorrow pickup, options will appear here.</span>
            </div>
          )}

          <section className="shift-end-rule">
            <span>HOW IT WORKS</span>
            <strong>This is a plan, not an immediate dispatch.</strong>
            <p>
              DOC OS will use this target when the driver's workday is ending and
              active freight is complete. Existing Shift End staging behavior remains in control of movement.
            </p>
          </section>
        </div>

        <footer>
          <button type="button" className="secondary" onClick={onClose}>CANCEL</button>
          <button
            type="button"
            className="primary"
            disabled={!selected}
            onClick={() => selected && onSave?.(selected)}
          >
            SAVE END-OF-DAY PLAN
          </button>
        </footer>
      </section>
    </div>
  )
}

// B.5.4D.4.2.4 — Candidate freight is planned, not current
// B.5.4D.4.2.6 — First-Class Planning Access
// B.5.4D.4.2.7A — Standard Phone + Visible Plan Entry
function DriverSchedulerScreen({
  drivers = [],
  carriers = [],
  loads = [],
  runtimePositions = {},
  gameTime,
  initialDriverId = null,
  onBack,
  onOpenLunchDecision,
  onSetLunchWindow,
  onSetShiftEndPlan,
  onFindFreight,
  onOpenTodayPlan,
  onDriverContextChange,
}) {
  const currentDay = Number(gameTime?.gameDayIndex || 0)
  const [view, setView] = useState('today')
  const [weekStart, setWeekStart] = useState(currentDay)
  const [selectedDriverId, setSelectedDriverId] = useState(initialDriverId)
  const [lunchDriverId, setLunchDriverId] = useState(null)
  const [shiftEndDriverId, setShiftEndDriverId] = useState(null)

  const activeCarrierIds = useMemo(
    () => new Set(carriers.filter((carrier) => carrier.status === 'active').map((carrier) => carrier.id)),
    [carriers],
  )

  const roster = useMemo(() => {
    const active = drivers.filter((driver) => activeCarrierIds.has(driver.carrierId))
    return active.length ? active : drivers.filter((driver) => driver.carrierId)
  }, [drivers, activeCarrierIds])

  const selectedDriver =
    drivers.find((driver) => driver.id === selectedDriverId) ||
    roster[0] ||
    null

  const selectedCarrier =
    carriers.find((carrier) => carrier.id === selectedDriver?.carrierId) ||
    null

  // D.4.2.7A — count planned/assigned freight for today.
  const todayPlanDriverIds = new Set(roster.map((driver) => driver.id))
  const todayPlanCount = loads.filter((load) => {
    if (Number(load.pickupDayIndex) !== currentDay) return false
    if (['completed', 'paid', 'cancelled', 'expired'].includes(String(load.status || '').toLowerCase())) return false
    return (
      todayPlanDriverIds.has(load.assignedDriverId) ||
      todayPlanDriverIds.has(load.candidateDriverId)
    )
  }).length

  const days = Array.from({ length: 7 }, (_, index) => weekStart + index)

  const chooseDriver = (driverId) => {
    setSelectedDriverId(driverId)
    onDriverContextChange?.(driverId)
    setView('driver')
  }

  return (
    <div className="driver-scheduler-screen carrier-owned-scheduler">
      <header className="driver-scheduler-header">
        <button type="button" className="driver-scheduler-back" onClick={onBack}>‹</button>
        <div>
          <span>DOC OS · DRIVER OPERATIONS</span>
          <strong>Driver Scheduler</strong>
        </div>
        <span className="driver-scheduler-count">{roster.length} DRIVER{roster.length === 1 ? '' : 'S'}</span>
      </header>

      <nav className="driver-scheduler-tabs scheduler-three-tabs">
        <button type="button" className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>TODAY</button>
        <button type="button" className={view === 'schedule' ? 'active' : ''} onClick={() => setView('schedule')}>SCHEDULE</button>
        <button type="button" className={view === 'driver' ? 'active' : ''} onClick={() => setView('driver')}>DRIVER</button>
      </nav>

      <button
        type="button"
        className="driver-scheduler-plan-banner"
        onClick={() => onOpenTodayPlan?.(selectedDriverId || roster[0]?.id || null)}
      >
        <span>
          <small>FREIGHT PLANNING</small>
          <strong>TODAY'S PLAN</strong>
        </span>
        <span className="driver-scheduler-plan-banner-meta">
          <b>{todayPlanCount} LOAD{todayPlanCount === 1 ? '' : 'S'}</b>
          <em>OPEN ›</em>
        </span>
      </button>

      {view === 'today' && (
        <div className="driver-scheduler-today-view">
          <div className="driver-scheduler-today-heading">
            <span>{weekday(currentDay)} · {formatCompactDate(currentDay)}</span>
            <strong>Today's Drivers</strong>
            <p>The carrier sets the shift. Your job is to make the freight, lunch, and end-of-day plan fit inside it.</p>
          </div>

          <div className="driver-scheduler-today-list">
            {roster.map((driver) => {
              const carrier = carriers.find((item) => item.id === driver.carrierId)
              const workday = getCarrierVisibleWorkday(driver, currentDay, currentDay)
              const dayLoads = loadsForDay(loads, driver.id, currentDay)
              const valid =
                workday &&
                !workday.isDayOff &&
                Number.isFinite(Number(workday.startMinutes)) &&
                Number.isFinite(Number(workday.endMinutes))

              const now = Number(gameTime.totalMinutesOfDay || 0)
              const start = Number(workday?.startMinutes)
              const end = Number(workday?.endMinutes)
              const overnight = valid && end <= start
              const active = valid && now >= start && (overnight || now < end)

              const state = workday?.isDayOff
                ? 'DAY OFF'
                : !valid
                  ? 'AWAITING CARRIER'
                  : active
                    ? 'ON DUTY'
                    : now < start
                      ? 'SCHEDULED'
                      : 'SHIFT COMPLETE'

              return (
                <article className="driver-scheduler-today-card" key={driver.id}>
                  <button type="button" className="driver-scheduler-today-main" onClick={() => chooseDriver(driver.id)}>
                    <span className="driver-scheduler-avatar">{String(driver.fullName || driver.name || 'D').charAt(0)}</span>

                    <span className="copy">
                      <small>{carrier?.name || 'Carrier'}</small>
                      <strong>{driver.fullName || driver.name || 'Driver'}</strong>
                      <span className={`status ${active ? 'active' : ''}`}>{state}</span>
                      {isCarrierConfirmed(workday) && <em className="carrier-confirmed-chip">CARRIER CONFIRMED</em>}
                    </span>

                    <span className="shift">
                      {valid ? (
                        <>
                          <strong>{compactTime(start)}</strong>
                          <small>to {compactTime(end)}{overnight ? ' +1' : ''}</small>
                        </>
                      ) : <strong>—</strong>}
                    </span>
                  </button>

                  <div className="driver-scheduler-today-meta carrier-owned-actions">
                    <span><b>{dayLoads.length}</b> LOAD{dayLoads.length === 1 ? '' : 'S'}</span>
                    <span><b>{lunchWindowLabel(workday) || (workday?.lunchEvent ? 'ACTIVE' : 'NOT SET')}</b> LUNCH</span>

                    <button
                      type="button"
                      disabled={!valid}
                      onClick={() => setLunchDriverId(driver.id)}
                    >
                      {lunchWindowLabel(workday) ? 'EDIT LUNCH' : 'SET LUNCH WINDOW'}
                    </button>

                    <button
                      type="button"
                      disabled={!valid}
                      onClick={() => {
                        onDriverContextChange?.(driver.id)
                        onFindFreight?.(driver.id)
                      }}
                    >
                      FIND FREIGHT
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {view === 'schedule' && (
        <div className="driver-scheduler-schedule-view">
          <section className="carrier-schedule-note">
            <span>CARRIER-CONTROLLED SCHEDULE</span>
            <strong>You do not set driver shift times.</strong>
            <p>Carrier-confirmed availability is shown here. Use it as an operating constraint when booking freight.</p>
          </section>

          <div className="driver-scheduler-week-nav">
            <button type="button" onClick={() => setWeekStart((value) => value - 7)}>‹</button>
            <div>
              <span>WEEK VIEW</span>
              <strong>{formatCompactDate(weekStart)} – {formatCompactDate(weekStart + 6)}</strong>
            </div>
            <button type="button" onClick={() => setWeekStart((value) => value + 7)}>›</button>
          </div>

          <div className="driver-scheduler-grid-scroll carrier-schedule-grid-scroll">
            <div className="driver-scheduler-grid carrier-schedule-grid">
              <div className="driver-scheduler-grid-corner scheduler-sticky-driver">DRIVER</div>

              {days.map((dayIndex) => (
                <div
                  key={`head-${dayIndex}`}
                  className={`driver-scheduler-day-head ${dayIndex === currentDay ? 'today' : ''}`}
                >
                  <span>{weekday(dayIndex)}</span>
                  <strong>{formatCompactDate(dayIndex)}</strong>
                </div>
              ))}

              {roster.map((driver) => {
                const carrier = carriers.find((item) => item.id === driver.carrierId)

                return [
                  <button
                    type="button"
                    className="driver-scheduler-driver-cell scheduler-sticky-driver"
                    key={`${driver.id}-driver`}
                    onClick={() => chooseDriver(driver.id)}
                  >
                    <span className="driver-scheduler-avatar">{String(driver.fullName || driver.name || 'D').charAt(0)}</span>
                    <span>
                      <strong>{driver.fullName || driver.name || 'Driver'}</strong>
                      <small>{carrier?.name || 'Carrier'}</small>
                      <em>VIEW DRIVER ›</em>
                    </span>
                  </button>,

                  ...days.map((dayIndex) => {
                    const workday = getCarrierVisibleWorkday(driver, dayIndex, currentDay)
                    const dayLoads = loadsForDay(loads, driver.id, dayIndex)
                    const valid =
                      workday &&
                      !workday.isDayOff &&
                      Number.isFinite(Number(workday.startMinutes)) &&
                      Number.isFinite(Number(workday.endMinutes))

                    return (
                      <div
                        key={`${driver.id}-${dayIndex}`}
                        className={`driver-scheduler-shift-cell read-only ${workday?.isDayOff ? 'off' : valid ? 'scheduled' : 'empty'} ${dayIndex === currentDay ? 'today' : ''}`}
                      >
                        <strong>{scheduleLabel(workday)}</strong>
                        {isCarrierConfirmed(workday) && <em>CARRIER</em>}
                        {dayLoads.length > 0 && <small>{dayLoads.length} LOAD{dayLoads.length === 1 ? '' : 'S'}</small>}
                      </div>
                    )
                  }),
                ]
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'driver' && (
        <div className="carrier-driver-view driver-ops-view">
          {!selectedDriver ? (
            <div className="driver-scheduler-empty">
              <strong>No driver selected</strong>
              <p>Choose a driver from Today or Schedule.</p>
            </div>
          ) : (() => {
            const todayWorkday = getCarrierVisibleWorkday(selectedDriver, currentDay, currentDay)
            const committedLoads = getDriverCommittedLoads(loads, selectedDriver.id)
            const plannedLoads = getDriverPlannedLoads(loads, selectedDriver.id)
            const activeLoad = committedLoads[0] || null
            const plannedLoad = plannedLoads[0] || null
            const displayedLoad = activeLoad || plannedLoad
            const displayedLoadMode = activeLoad ? 'CURRENT FREIGHT' : plannedLoad ? 'NEXT PLANNED FREIGHT' : 'CURRENT FREIGHT'
            const displayedLoadStatus = activeLoad
              ? prettyLocation(activeLoad.tripStatus || activeLoad.status || 'Assigned')
              : plannedLoad
                ? (String(plannedLoad.carrierApprovalStatus || '').toUpperCase() === 'APPROVED'
                    ? 'Carrier Approved · Awaiting Booking'
                    : plannedLoad.scheduleApprovalQueued
                      ? 'Awaiting Carrier Approval'
                      : 'Planned · Not Booked')
                : null
            const driverStatus = getDriverOperationalStatus(selectedDriver, todayWorkday, activeLoad, gameTime)
            const nextWorkday = nextConfirmedWorkday(selectedDriver, currentDay)
            const runtime = runtimePositions?.[selectedDriver.id]
            const locationLabel =
              selectedDriver.lastKnownLocationName ||
              selectedDriver.currentLocationName ||
              (selectedDriver.lastKnownLocationId ? prettyLocation(selectedDriver.lastKnownLocationId) : null) ||
              (selectedDriver.homeBaseLocationId ? prettyLocation(selectedDriver.homeBaseLocationId) : null) ||
              (runtime ? 'Live map position' : 'Not available')
            const lunchLabel =
              lunchWindowLabel(todayWorkday) ||
              (selectedDriver.lunchEvent ? 'In progress' : 'Not planned')
            const endPlan =
              selectedDriver.shiftEndLocationName ||
              selectedDriver.endOfDayLocationName ||
              (selectedDriver.shiftEndLocationId ? prettyLocation(selectedDriver.shiftEndLocationId) : null) ||
              (selectedDriver.idleTargetLocationId ? prettyLocation(selectedDriver.idleTargetLocationId) : null) ||
              'Not planned'
            const driveRemaining = selectedDriver.hours?.drivingRemainingMinutes
            const dutyRemaining = selectedDriver.hours?.dutyRemainingMinutes

            return (
              <>
                <section className="driver-ops-identity">
                  <span className="driver-scheduler-avatar">
                    {String(selectedDriver.fullName || selectedDriver.name || 'D').charAt(0)}
                  </span>
                  <div>
                    <span>{selectedCarrier?.name || 'Carrier'}</span>
                    <strong>{selectedDriver.fullName || selectedDriver.name || 'Driver'}</strong>
                    <small>{selectedDriver.equipment?.label || selectedCarrier?.equipment?.[0] || 'Carrier equipment'}</small>
                  </div>
                  <em>{driverStatus}</em>
                </section>

                <section className="driver-ops-now">
                  <header>
                    <span>RIGHT NOW</span>
                    <strong>Operational Status</strong>
                  </header>

                  <div className="driver-ops-facts">
                    <div>
                      <span>TODAY'S SHIFT</span>
                      <strong>{scheduleLabel(todayWorkday)}</strong>
                    </div>
                    <div>
                      <span>CURRENT LOCATION</span>
                      <strong>{locationLabel}</strong>
                    </div>
                    <div>
                      <span>LUNCH WINDOW</span>
                      <strong>{lunchLabel}</strong>
                    </div>
                    <div>
                      <span>END-OF-DAY PLAN</span>
                      <strong>{endPlan}</strong>
                    </div>
                  </div>
                </section>

                <section className="driver-ops-hos">
                  <header>
                    <span>HOURS OF SERVICE</span>
                    <strong>Remaining</strong>
                  </header>
                  <div>
                    <span>
                      <small>DRIVE</small>
                      <strong>{hosLabel(driveRemaining)}</strong>
                    </span>
                    <span>
                      <small>DUTY</small>
                      <strong>{hosLabel(dutyRemaining)}</strong>
                    </span>
                  </div>
                </section>

                <section className={`driver-ops-load ${plannedLoad && !activeLoad ? 'planned' : ''}`}>
                  <header>
                    <span>{displayedLoadMode}</span>
                    <strong>{displayedLoad ? (displayedLoad.loadNumber || displayedLoad.id) : 'No assigned freight'}</strong>
                  </header>

                  {displayedLoad ? (
                    <div className="driver-ops-load-detail">
                      <span>
                        <small>PICKUP</small>
                        <strong>{prettyLocation(displayedLoad.pickupLocationId)}</strong>
                      </span>
                      <span>
                        <small>DELIVERY</small>
                        <strong>{prettyLocation(displayedLoad.deliveryLocationId)}</strong>
                      </span>
                      <span>
                        <small>APPOINTMENT</small>
                        <strong>{formatTime(displayedLoad.pickupWindowStartMinutes || 0)}</strong>
                      </span>
                      <span>
                        <small>STATUS</small>
                        <strong>{displayedLoadStatus}</strong>
                      </span>
                    </div>
                  ) : (
                    <p>No freight is assigned to this driver right now.</p>
                  )}
                </section>

                <section className="driver-ops-next">
                  <span>NEXT CONFIRMED WORKDAY</span>
                  <strong>
                    {nextWorkday
                      ? `${weekday(nextWorkday.dayIndex)} · ${scheduleLabel(nextWorkday.workday)}`
                      : 'Awaiting carrier schedule'}
                  </strong>
                  <small>
                    {nextWorkday ? formatCompactDate(nextWorkday.dayIndex) : 'Carrier availability has not been posted yet.'}
                  </small>
                </section>

                <div className="carrier-driver-actions driver-ops-actions driver-ops-actions-three">
                  <button
                    type="button"
                    onClick={() => setLunchDriverId(selectedDriver.id)}
                    disabled={!todayWorkday || todayWorkday.isDayOff}
                  >
                    {lunchWindowLabel(todayWorkday) ? 'EDIT LUNCH' : 'SET LUNCH'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShiftEndDriverId(selectedDriver.id)}
                    disabled={!todayWorkday || todayWorkday.isDayOff}
                  >
                    {endPlan === 'Not planned' ? 'PLAN SHIFT END' : 'EDIT SHIFT END'}
                  </button>

                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      onDriverContextChange?.(selectedDriver.id)
                      onFindFreight?.(selectedDriver.id)
                    }}
                    disabled={!todayWorkday || todayWorkday.isDayOff}
                  >
                    FIND FREIGHT
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      )}
      {lunchDriverId && (() => {
        const lunchDriver = drivers.find((driver) => driver.id === lunchDriverId)
        const lunchWorkday = lunchDriver ? getWorkday(lunchDriver, currentDay) : null
        if (!lunchDriver || !lunchWorkday) return null

        return (
          <LunchWindowSheet
            driver={lunchDriver}
            workday={lunchWorkday}
            onClose={() => setLunchDriverId(null)}
            onSave={(window) => {
              onSetLunchWindow?.(lunchDriver.id, currentDay, window)
              setLunchDriverId(null)
            }}
          />
        )
      })()}
      {shiftEndDriverId && (() => {
        const shiftDriver = drivers.find((driver) => driver.id === shiftEndDriverId)
        if (!shiftDriver) return null
        const shiftCarrier = carriers.find((carrier) => carrier.id === shiftDriver.carrierId) || null
        const committedLoads = getDriverCommittedLoads(loads, shiftDriver.id)

        return (
          <ShiftEndPlannerSheet
            driver={shiftDriver}
            carrier={shiftCarrier}
            loads={loads}
            currentDay={currentDay}
            committedLoads={committedLoads}
            runtimePositions={runtimePositions}
            onClose={() => setShiftEndDriverId(null)}
            onSave={(plan) => {
              onSetShiftEndPlan?.(shiftDriver.id, currentDay, plan)
              setShiftEndDriverId(null)
            }}
          />
        )
      })()}

    </div>
  )
}

export default DriverSchedulerScreen
