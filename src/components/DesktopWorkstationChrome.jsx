import mapLocations from '../data/mapLocations.js'
import { formatTime } from '../utils/gameTime.js'
import { getDriverHosSummary } from '../utils/driverHOS.js'
import { buildDriverItinerary, getNextActionableDriverStop } from '../utils/driverItinerary.js'
import { getDriverTrailerState } from '../utils/driverManifest.js'

const APPS = [
  { id: 'freightlink', label: 'FreightLink' },
  { id: 'email', label: 'Email', badgeKey: 'email' },
  { id: 'documents', label: 'Documents', badgeKey: 'documents' },
  { id: 'messages', label: 'Messages', badgeKey: 'messages' },
  { id: 'banking', label: 'Banking', badgeKey: 'banking' },
  { id: 'carrierSource', label: 'CarrierSource', locked: true },
  { id: 'shop', label: 'Shop' },
]

function readableStatus(driver) {
  if (!driver) return 'OFF DUTY'
  if (driver.lunchRouteStatus === 'arrived') return 'ON LUNCH'
  if (driver.lunchRouteStatus === 'traveling') return 'EN ROUTE · LUNCH'
  if (driver.idleRouteStatus === 'traveling') return 'REPOSITIONING'
  if (driver.hours?.status === 'off-duty') return 'OFF DUTY'
  return String(driver.status || 'AVAILABLE').replaceAll('-', ' ').toUpperCase()
}

function stopLabel(stop) {
  if (!stop) return 'No next stop'
  const location = mapLocations.find((item) => item.id === stop.locationId)
  return location?.name || (stop.type === 'pickup' ? 'Pickup' : 'Delivery')
}

function DriversIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="7.5" r="3.2" />
      <path d="M5.5 20v-1.4c0-3.5 2.9-6.4 6.5-6.4s6.5 2.9 6.5 6.4V20" />
    </svg>
  )
}

function OperationsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6.5h14M5 12h14M5 17.5h14" />
      <circle cx="8" cy="6.5" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="10.5" cy="17.5" r="1.5" />
    </svg>
  )
}

function DesktopWorkstationChrome({
  drivers = [],
  loads = [],
  selectedDriverId,
  driverDrawerOpen = false,
  operationsDrawerOpen = false,
  onToggleDriverDrawer,
  onCloseDriverDrawer,
  onToggleOperationsDrawer,
  onCloseOperationsDrawer,
  onSelectDriver,
  gameTime,
  workspaceState = 'collapsed',
  activeApp = null,
  onOpenApp,
  badges = {},
  isGameClockPaused = false,
}) {
  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId) || drivers[0] || null
  const itinerary = selectedDriver ? buildDriverItinerary(loads, selectedDriver.id).filter((stop) => stop.state !== 'completed') : []
  const nextStop = selectedDriver ? getNextActionableDriverStop(loads, selectedDriver.id) : null
  const hos = selectedDriver ? getDriverHosSummary(selectedDriver) : null
  const trailer = selectedDriver ? getDriverTrailerState(loads, selectedDriver.id, selectedDriver) : null
  const selectedName = selectedDriver?.fullName || selectedDriver?.name || 'No driver selected'

  return (
    <div className="desktop-workstation-chrome" aria-label="DOC OS desktop workstation">
      {workspaceState !== 'focused' && (
        <>
          <button
            type="button"
            className={`desktop-drawer-handle desktop-drawer-handle-left${driverDrawerOpen ? ' open' : ''}`}
            onClick={onToggleDriverDrawer}
            aria-expanded={driverDrawerOpen}
            aria-controls="desktop-driver-drawer"
            aria-label={driverDrawerOpen ? 'Close drivers' : 'Open drivers'}
          >
            <DriversIcon />
            <span>DRIVERS</span>
            <b>{drivers.length}</b>
          </button>

          <aside
            id="desktop-driver-drawer"
            className={`desktop-driver-drawer${driverDrawerOpen ? ' open' : ''}`}
            aria-hidden={!driverDrawerOpen}
          >
            <header>
              <div><span>FLEET</span><strong>Drivers</strong><small>{drivers.length} assigned</small></div>
              <button type="button" onClick={onCloseDriverDrawer} aria-label="Close drivers">×</button>
            </header>
            <div className="desktop-driver-list">
              {drivers.map((driver) => {
                const driverNextStop = getNextActionableDriverStop(loads, driver.id)
                const active = driver.id === selectedDriver?.id
                return (
                  <button type="button" className={active ? 'active' : ''} key={driver.id} onClick={() => onSelectDriver?.(driver.id)}>
                    <i>{(driver.name || 'D').charAt(0).toUpperCase()}</i>
                    <span><strong>{driver.fullName || driver.name}</strong><small>{readableStatus(driver)}</small><em>{stopLabel(driverNextStop)}</em></span>
                  </button>
                )
              })}
              {!drivers.length && <p>No drivers assigned.</p>}
            </div>
          </aside>

          <button
            type="button"
            className={`desktop-drawer-handle desktop-drawer-handle-right${operationsDrawerOpen ? ' open' : ''}`}
            onClick={onToggleOperationsDrawer}
            aria-expanded={operationsDrawerOpen}
            aria-controls="desktop-operations-drawer"
            aria-label={operationsDrawerOpen ? 'Close operations' : 'Open operations'}
          >
            <OperationsIcon />
            <span>OPS</span>
            <b>{selectedDriver ? (selectedDriver.name || selectedDriver.fullName || 'D').charAt(0).toUpperCase() : '—'}</b>
          </button>

          <aside
            id="desktop-operations-drawer"
            className={`desktop-operation-drawer${operationsDrawerOpen ? ' open' : ''}`}
            aria-hidden={!operationsDrawerOpen}
          >
            <header>
              <div><span>ACTIVE DRIVER</span><strong>{selectedName}</strong><small>{readableStatus(selectedDriver)}</small></div>
              <button type="button" onClick={onCloseOperationsDrawer} aria-label="Close operations">×</button>
            </header>
            <section className="desktop-operation-metrics">
              <div><span>DRIVING</span><strong>{hos?.driving || '—'}</strong></div>
              <div><span>DUTY</span><strong>{hos?.duty || '—'}</strong></div>
            </section>
            <section className="desktop-operation-trailer">
              <div><span>TRAILER</span><strong>{trailer?.palletsUsed || 0} / {trailer?.capacity?.palletCapacity || 26} pallets</strong></div>
              <div className="desktop-trailer-track"><i style={{ width: `${Math.min(100, Math.max(0, ((trailer?.palletsUsed || 0) / (trailer?.capacity?.palletCapacity || 26)) * 100))}%` }} /></div>
              <small>{trailer?.contents?.length || 0} load{trailer?.contents?.length === 1 ? '' : 's'} onboard</small>
            </section>
            <section className="desktop-manifest-panel">
              <header><span>UP NEXT</span><small>{itinerary.length} remaining stops</small></header>
              <div>
                {itinerary.slice(0, 7).map((stop, index) => (
                  <button type="button" key={stop.id} className={nextStop?.id === stop.id ? 'next' : ''}>
                    <b>{stop.type === 'pickup' ? 'P' : 'D'}{index + 1}</b>
                    <span><strong>{stopLabel(stop)}</strong><small>{stop.loadRef} · {formatTime(stop.windowStartMinutes)}</small></span>
                    {nextStop?.id === stop.id && <em>NEXT</em>}
                  </button>
                ))}
                {!itinerary.length && <p>No freight scheduled.</p>}
              </div>
            </section>
          </aside>
        </>
      )}

      {workspaceState === 'focused' && (
        <aside className="desktop-focused-summary" aria-label="Paused operation summary">
          <strong>{selectedDriver?.name || 'DRIVER'}</strong>
          <span>PAUSED</span>
          <small>Next · {stopLabel(nextStop)}</small>
          <small>HOS · {hos?.driving || '—'}</small>
          <small>Trailer · {trailer?.palletsUsed || 0}/{trailer?.capacity?.palletCapacity || 26}</small>
        </aside>
      )}

      <nav className="desktop-app-dock" aria-label="Workstation apps">
        <span className="desktop-dock-brand">DOC <b>OS</b></span>
        {APPS.map((app) => (
          <button
            type="button"
            key={app.id}
            className={activeApp === app.id ? 'active' : ''}
            disabled={app.locked}
            onClick={() => !app.locked && onOpenApp?.(app.id)}
            title={app.locked ? 'Unlocks later in Career Play' : app.label}
          >
            <span>{app.label}</span>
            {app.locked && <small>LOCKED</small>}
            {!app.locked && Number(badges[app.badgeKey] || 0) > 0 && <i>{Math.min(99, Number(badges[app.badgeKey]))}</i>}
          </button>
        ))}
        <span className={`desktop-dock-clock ${isGameClockPaused ? 'paused' : ''}`}>{isGameClockPaused ? 'PAUSED' : formatTime(gameTime?.totalMinutesOfDay || 0)}</span>
      </nav>

      {workspaceState === 'working' && activeApp === 'shop' && (
        <section className="desktop-shop-placeholder">
          <header><div><span>SHOP</span><strong>Career & Workspace</strong></div><small>COMING IN A LATER BUILD</small></header>
          <div className="desktop-shop-preview-grid">
            <div><span>WORKSPACE</span><strong>Desk upgrades</strong><small>Make your cubicle feel like yours.</small></div>
            <div><span>CHARACTER</span><strong>Style & clothing</strong><small>Bring your created dispatcher into career progression.</small></div>
            <div><span>CAREER</span><strong>Earn it in-game</strong><small>No real-money purchases.</small></div>
          </div>
        </section>
      )}
    </div>
  )
}

export default DesktopWorkstationChrome
