import { useEffect, useMemo, useRef, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function formatMessageTime(value) {
  if (!Number.isFinite(value)) return ''
  return formatTime(((value % 1440) + 1440) % 1440)
}


function distanceMiles(a, b) {
  if (!a || !b || !Number.isFinite(a.latitude) || !Number.isFinite(a.longitude) || !Number.isFinite(b.latitude) || !Number.isFinite(b.longitude)) return null
  const toRad = (value) => value * Math.PI / 180
  const earthMiles = 3958.8
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return earthMiles * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function loadRouteLabel(load) {
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)?.name || 'Pickup'
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'Delivery'
  return `${load.loadNumber || load.id} · ${pickup} → ${delivery}`
}

function DriverMessageThreadScreen({ driver, driverPosition = null, messages = [], activeLoads = [], initialLoadId = '', initialLoadPickerOpen = false, onBack, onRead, onSendLoadUpdate, onSendQuickReply, onPlanDeliveryRoute }) {
  const [replyOpen, setReplyOpen] = useState(Boolean(initialLoadPickerOpen))
  const [selectedLoadId, setSelectedLoadId] = useState(initialLoadId || '')
  const [loadPickerOpen, setLoadPickerOpen] = useState(Boolean(initialLoadPickerOpen))
  const historyRef = useRef(null)
  const sorted = useMemo(() => [...messages].sort((a, b) => (a.receivedGameMinute || 0) - (b.receivedGameMinute || 0)), [messages])

  useEffect(() => {
    sorted.forEach((message) => {
      if (message.direction !== 'outbound' && !message.read) onRead?.(message)
    })
  }, [sorted, onRead])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const node = historyRef.current
      if (node) node.scrollTop = node.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [sorted.length, replyOpen, loadPickerOpen])

  const selectedLoad = activeLoads.find((load) => load.id === selectedLoadId)
  const currentLoad = activeLoads.find((load) => load.tripStatus !== 'queued' && !['delivered', 'completed'].includes(load.tripStatus)) || null
  const plannableDeliveryLoad = activeLoads.find((load) => load.tripStatus === 'loaded' && load.deliveryPlanningStatus !== 'route-ready')
  const briefableLoad = activeLoads.find((load) => load.tripStatus === 'assigned' && !Number.isFinite(load.pickupDriverBriefedGameMinute))
  const otherLoadOptions = activeLoads.filter((load) => load.id !== briefableLoad?.id && !['delivered', 'completed'].includes(load.tripStatus))
  const pickupRouteSendableLoad = activeLoads.find((load) =>
    load.tripStatus === 'assigned'
    && load.planningStatus === 'route-ready'
    && load.plannedDeadheadRouteGeometry
    && Number.isFinite(load.pickupDriverBriefedGameMinute)
  )
  const deliveryRouteSendableLoad = activeLoads.find((load) =>
    load.tripStatus === 'loaded'
    && load.deliveryPlanningStatus === 'route-ready'
    && load.plannedLoadedRouteGeometry
  )
  const routeSendableLoad = pickupRouteSendableLoad || deliveryRouteSendableLoad
  const routeSendPhase = deliveryRouteSendableLoad ? 'delivery' : 'pickup'


  const waitingLoad = activeLoads.find((load) => ['waiting-at-pickup', 'waiting-at-delivery'].includes(load.tripStatus)) || null
  const waitingAtDelivery = waitingLoad?.tripStatus === 'waiting-at-delivery'

  const routeSendDestination = routeSendableLoad
    ? mapLocations.find((location) => location.id === (routeSendPhase === 'delivery' ? routeSendableLoad.deliveryLocationId : routeSendableLoad.pickupLocationId))?.name
    : null

  const routeSendLocation = routeSendableLoad
    ? mapLocations.find((location) => location.id === (routeSendPhase === 'delivery' ? routeSendableLoad.deliveryLocationId : routeSendableLoad.pickupLocationId))
    : null
  const routeOriginMiles = routeSendPhase === 'pickup' ? distanceMiles(driverPosition, routeSendLocation) : null
  const atPickup = Number.isFinite(routeOriginMiles) && routeOriginMiles <= 0.15
  const nearPickup = Number.isFinite(routeOriginMiles) && routeOriginMiles > 0.15 && routeOriginMiles <= 0.75
  const routeActionLabel = atPickup ? 'Already at pickup' : nearPickup ? 'Pickup is right up the block' : 'Send route'
  const routeActionDetail = atPickup
    ? 'Confirm the pickup and move into check-in'
    : nearPickup
      ? `${routeOriginMiles.toFixed(1)} mi away · send the short hop`
      : `Send the ${routeSendPhase} route · driver departs immediately`

  const sendNaturalReply = (body, meta = null) => {
    onSendQuickReply?.(body, meta)
    setReplyOpen(false)
    setLoadPickerOpen(false)
  }

  const sendRouteMessage = () => {
    if (!routeSendableLoad) return
    const ref = routeSendableLoad.loadNumber || routeSendableLoad.id
    const destination = routeSendDestination || (routeSendPhase === 'delivery' ? 'the receiver' : 'pickup')
    const minutes = routeSendPhase === 'delivery'
      ? routeSendableLoad.plannedLoadedDriveTimeMinutes
      : routeSendableLoad.plannedDeadheadDriveTimeMinutes
    const etaText = Number.isFinite(minutes) ? ` You’re looking at about ${Math.round(minutes)} minutes.` : ''
    const body = routeSendPhase === 'pickup' && atPickup
      ? `You’re already at the pickup for ${ref}. Go ahead and check in.`
      : routeSendPhase === 'pickup' && nearPickup
        ? `Hey, you’re right up the block from ${ref}. Head over to ${destination} and update me when you’re checked in.`
        : `Route is sent for ${ref}. Head to ${destination}.${etaText} Update me when you’re at the dock.`
    sendNaturalReply(body, { operationalAction: 'route-sent', phase: routeSendPhase, loadId: routeSendableLoad.id })
  }

  return (
    <div className="phone-page driver-thread-screen">
      <header className="driver-thread-header">
        <button type="button" onClick={onBack} aria-label="Back to messages">‹</button>
        <div className="driver-thread-header-avatar">{driver?.fullName?.charAt(0) || 'D'}</div>
        <div>
          <strong>{driver?.fullName || driver?.name || 'Driver'}</strong>
          <span>Driver</span>
        </div>
      </header>

      <div className="driver-thread-history" ref={historyRef}>
        {sorted.map((message) => (
          <div className={`driver-chat-row ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`} key={message.id}>
            <div className="driver-chat-bubble">
              <p>{message.body}</p>
              <time>{formatMessageTime(message.receivedGameMinute)}</time>
            </div>
          </div>
        ))}
      </div>

      <div className="driver-thread-composer driver-thread-composer-v2">
        {plannableDeliveryLoad && (
          <button type="button" className="driver-thread-context-action" onClick={() => onPlanDeliveryRoute?.(plannableDeliveryLoad.id)}>
            <span>LOAD NEEDS A DELIVERY PLAN</span>
            <strong>Plan {plannableDeliveryLoad.loadNumber || plannableDeliveryLoad.id} →</strong>
          </button>
        )}

        {replyOpen && (
          <div className="driver-reply-menu" role="menu" aria-label="Reply options">
            <div className="driver-reply-menu-heading">
              <span>REPLY</span>
              <button type="button" onClick={() => { setReplyOpen(false); setLoadPickerOpen(false) }} aria-label="Close reply menu">×</button>
            </div>

            {briefableLoad && (
              <button type="button" role="menuitem" onClick={() => { onSendLoadUpdate?.(briefableLoad.id); setReplyOpen(false); setLoadPickerOpen(false) }}>
                <strong>Send load details</strong>
                <small>Send {briefableLoad.loadNumber || briefableLoad.id} pickup and delivery details</small>
              </button>
            )}

            {routeSendableLoad && (
              <button type="button" role="menuitem" onClick={sendRouteMessage}>
                <strong>{routeActionLabel}</strong>
                <small>{routeActionDetail}</small>
              </button>
            )}

            {otherLoadOptions.length > 0 && (
              <button type="button" role="menuitem" onClick={() => setLoadPickerOpen((open) => !open)}>
                <strong>Send another load</strong>
                <small>Choose from this driver’s other active or queued freight</small>
              </button>
            )}

            {waitingLoad && (
              <>
                <div className="driver-reply-context-label">DRIVER WAITING · CHOOSE YOUR RESPONSE</div>
                <button type="button" role="menuitem" onClick={() => sendNaturalReply('Copy. Give them a few minutes and update me if nothing changes.', { communication: 'supportive', score: 1, loadId: waitingLoad.id })}>
                  <strong>Set a follow-up</strong>
                  <small>Give the driver a clear next step without overreacting</small>
                </button>
                <button type="button" role="menuitem" onClick={() => sendNaturalReply(`Go back inside and ask ${waitingAtDelivery ? 'receiving' : 'shipping'} for an update. Let me know what they tell you.`, { communication: 'proactive', score: 2, loadId: waitingLoad.id })}>
                  <strong>Ask for an update</strong>
                  <small>Proactive communication · stronger driver support</small>
                </button>
                <button type="button" role="menuitem" onClick={() => sendNaturalReply('Copy that.', { communication: 'minimal', score: 0, loadId: waitingLoad.id })}>
                  <strong>Acknowledge only</strong>
                  <small>Ends the exchange without a follow-up plan</small>
                </button>
              </>
            )}

            {!waitingLoad && (
              <>
                <button type="button" role="menuitem" onClick={() => sendNaturalReply('Copy that. Keep me posted.', { communication: 'supportive', score: 1 }) }>
                  <strong>Acknowledge</strong>
                  <small>“Copy that. Keep me posted.”</small>
                </button>
                <button type="button" role="menuitem" onClick={() => sendNaturalReply('Stand by. I’m working on it now.', { communication: 'proactive', score: 1 }) }>
                  <strong>Stand by</strong>
                  <small>“Stand by. I’m working on it now.”</small>
                </button>
              </>
            )}

            {loadPickerOpen && (
              <div className="driver-load-picker driver-load-picker-inline" role="dialog" aria-label="Choose active load">
                <div className="driver-load-picker-list">
                  {otherLoadOptions.length === 0 ? (
                    <div className="driver-load-picker-empty">No other loads available.</div>
                  ) : otherLoadOptions.map((load) => (
                    <button
                      type="button"
                      className={selectedLoadId === load.id ? 'selected' : ''}
                      key={load.id}
                      onClick={() => setSelectedLoadId(load.id)}
                    >
                      <strong>{load.loadNumber || load.id}</strong>
                      <span>{loadRouteLabel(load).replace(`${load.loadNumber || load.id} · `, '')}</span>
                      {Number.isFinite(load.pickupDayIndex) && <small>{formatCompactDate(load.pickupDayIndex)} · {formatTime(load.pickupWindowStartMinutes)}</small>}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="driver-load-send-button"
                  disabled={!selectedLoadId}
                  onClick={() => {
                    if (!selectedLoadId) return
                    onSendLoadUpdate?.(selectedLoadId)
                    setSelectedLoadId('')
                    setLoadPickerOpen(false)
                    setReplyOpen(false)
                  }}
                >
                  SEND LOAD
                </button>
              </div>
            )}
          </div>
        )}

        <button type="button" className={`driver-reply-button${replyOpen ? ' open' : ''}`} onClick={() => setReplyOpen((open) => !open)}>
          <span>Reply</span>
          <small>{currentLoad ? currentLoad.loadNumber || currentLoad.id : 'Message driver'}</small>
        </button>
      </div>
    </div>
  )
}

export default DriverMessageThreadScreen
