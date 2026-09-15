import { formatTime } from '../utils/gameTime.js'
import { isDriverOnLunch } from '../utils/lunchDecisionEvents.js'

function formatMessageTime(value) {
  if (!Number.isFinite(value)) return ''
  return formatTime(((value % 1440) + 1440) % 1440)
}

function driverStateLabel(driver, load, gameTime) {
  const status = load?.tripStatus || load?.status || ''
  if (isDriverOnLunch(driver, gameTime)) return 'ON LUNCH'
  if (['en-route-pickup'].includes(status)) return 'EN ROUTE · PICKUP'
  if (['waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'].includes(status)) return 'AT PICKUP'
  if (status === 'loaded') return 'LOADED'
  if (['en-route-delivery'].includes(status)) return 'EN ROUTE · DELIVERY'
  if (['waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery'].includes(status)) return 'AT DELIVERY'
  if (['awaiting-pod'].includes(status)) return 'AWAITING POD'
  if (['assigned', 'queued', 'route-ready'].includes(status)) return 'PLANNED'
  if (driver?.status === 'unavailable') return 'ON DUTY'
  return 'AVAILABLE'
}

function MessagesScreen({ messages = [], drivers = [], loads = [], carriers = [], gameTime, onBack, onOpenThread }) {
  const threadData = Array.from(new Set(messages.map((message) => message.driverId).filter(Boolean))).map((driverId) => {
    const driver = drivers.find((item) => item.id === driverId)
    const thread = messages.filter((message) => message.driverId === driverId).sort((a, b) => (a.receivedGameMinute || 0) - (b.receivedGameMinute || 0))
    const latest = thread[thread.length - 1]
    const unread = thread.filter((message) => message.direction !== 'outbound' && !message.read).length
    const activeLoad = loads.find((load) => load.assignedDriverId === driverId && !['available', 'expired', 'completed', 'delivered'].includes(load.status) && !['expired', 'completed', 'delivered'].includes(load.tripStatus)) || null
    const carrier = carriers.find((item) => item.id === driver?.carrierId)
    return { driverId, driver, thread, latest, unread, activeLoad, carrier }
  }).sort((a, b) => (b.latest?.receivedGameMinute || 0) - (a.latest?.receivedGameMinute || 0))
  const totalUnread = threadData.reduce((sum, item) => sum + item.unread, 0)

  return (
    <div className="phone-page driver-messages-screen driver-messages-v4">
      <header className="driver-messages-header driver-messages-header-v4">
        <button type="button" onClick={onBack} aria-label="Back to phone home">‹</button>
        <div>
          <span>DRIVER COMMUNICATIONS</span>
          <div className="driver-messages-titleline"><h2>Messages</h2>{totalUnread > 0 && <b>{totalUnread} unread</b>}</div>
        </div>
      </header>

      {threadData.length === 0 ? (
        <div className="driver-messages-empty">
          <strong>No driver conversations yet.</strong>
          <span>Active drivers and operational messages will appear here.</span>
        </div>
      ) : (
        <div className="driver-thread-list driver-thread-list-v4">
          {threadData.map(({ driverId, driver, latest, unread, activeLoad, carrier }) => {
            const driverName = driver?.fullName || latest?.sender || 'Driver'
            const stateLabel = driverStateLabel(driver, activeLoad, gameTime)
            return (
              <button type="button" className={`driver-thread-row driver-thread-row-v4 ${unread ? 'unread' : ''}`} key={driverId} onClick={() => onOpenThread?.(driverId)}>
                <span className="driver-thread-avatar-wrap">
                  <span className="driver-thread-avatar">{driverName.charAt(0).toUpperCase()}</span>
                  <span className={`driver-presence-dot ${driver?.status === 'available' && !isDriverOnLunch(driver, gameTime) ? 'available' : 'active'}`} />
                </span>
                <span className="driver-thread-copy">
                  <span className="driver-thread-topline">
                    <strong>{driverName}</strong>
                    <time>{formatMessageTime(latest?.receivedGameMinute)}</time>
                  </span>
                  <span className="driver-thread-context"><span>{carrier?.name || 'Carrier'}</span><b>{stateLabel}</b></span>
                  <span className="driver-thread-preview">{latest?.direction === 'outbound' ? 'You: ' : ''}{latest?.body || 'Open conversation'}</span>
                </span>
                {unread > 0 && <span className="driver-thread-unread">{unread}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MessagesScreen
