import { useEffect, useMemo, useRef, useState } from 'react'
import mapLocations from '../data/mapLocations.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function formatMessageTime(value) {
  if (!Number.isFinite(value)) return ''
  return formatTime(((value % 1440) + 1440) % 1440)
}

function loadRouteLabel(load) {
  const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)?.name || 'Pickup'
  const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'Delivery'
  return `${load.loadNumber || load.id} · ${pickup} → ${delivery}`
}

function DriverMessageThreadScreen({ driver, messages = [], activeLoads = [], onBack, onRead, onSendLoadUpdate, onSendQuickReply, onDispatchLoad, onPlanDeliveryRoute }) {
  const [selectedLoadId, setSelectedLoadId] = useState('')
  const [loadPickerOpen, setLoadPickerOpen] = useState(false)
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
  }, [sorted.length])

  const selectedLoad = activeLoads.find((load) => load.id === selectedLoadId)
  const latestInbound = [...sorted].reverse().find((message) => message.direction !== 'outbound')
  const quickReplies = latestInbound ? ['Copy that.', 'Stand by — I’m on it.', 'Good work. I’ll send the next move.'] : []
  const dispatchableLoad = activeLoads.find((load) =>
    (load.tripStatus === 'assigned' && load.planningStatus === 'route-ready' && load.plannedDeadheadRouteGeometry)
    || (load.tripStatus === 'loaded' && load.deliveryPlanningStatus === 'route-ready' && load.plannedLoadedRouteGeometry)
  )
  const plannableDeliveryLoad = activeLoads.find((load) => load.tripStatus === 'loaded' && load.deliveryPlanningStatus !== 'route-ready')
  const dispatchPhase = dispatchableLoad?.tripStatus === 'loaded' ? 'delivery' : 'pickup'
  const dispatchDestination = dispatchableLoad
    ? mapLocations.find((location) => location.id === (dispatchPhase === 'delivery' ? dispatchableLoad.deliveryLocationId : dispatchableLoad.pickupLocationId))?.name
    : null

  return (
    <div className="phone-page driver-thread-screen">
      <header className="driver-thread-header">
        <button type="button" onClick={onBack} aria-label="Back to messages">‹</button>
        <div className="driver-thread-header-avatar">{driver?.fullName?.charAt(0) || 'M'}</div>
        <div>
          <strong>{driver?.fullName || 'Marcus Reed'}</strong>
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

      <div className="driver-thread-composer">
        {plannableDeliveryLoad && (
          <div className="driver-dispatch-message-action driver-plan-message-action">
            <span>DELIVERY PLAN REQUIRED</span>
            <strong>{plannableDeliveryLoad.loadNumber || plannableDeliveryLoad.id}</strong>
            <small>Marcus is loaded and waiting for the delivery route.</small>
            <button type="button" onClick={() => onPlanDeliveryRoute?.(plannableDeliveryLoad.id)}>
              PLAN DELIVERY ROUTE
            </button>
          </div>
        )}
        {dispatchableLoad && (
          <div className="driver-dispatch-message-action">
            <span>READY TO DISPATCH</span>
            <strong>{dispatchableLoad.loadNumber || dispatchableLoad.id}</strong>
            <small>{dispatchPhase === 'delivery' ? 'Loaded route' : 'Pickup route'} ready · {dispatchDestination || 'next stop'}</small>
            <button type="button" onClick={() => onDispatchLoad?.(dispatchableLoad.id, dispatchPhase)}>
              SEND "ROUTE SENT" & DISPATCH
            </button>
          </div>
        )}
        {quickReplies.length > 0 && (
          <div className="driver-quick-replies" aria-label="Quick replies">
            <span>QUICK REPLY</span>
            <div>{quickReplies.map((reply) => <button type="button" key={reply} onClick={() => onSendQuickReply?.(reply)}>{reply}</button>)}</div>
          </div>
        )}
        {loadPickerOpen && (
          <div className="driver-load-picker" role="dialog" aria-label="Choose active load">
            <div className="driver-load-picker-heading">
              <span>CHOOSE ACTIVE LOAD</span>
              <button type="button" onClick={() => setLoadPickerOpen(false)} aria-label="Close load picker">×</button>
            </div>
            <div className="driver-load-picker-list">
              {activeLoads.length === 0 ? (
                <div className="driver-load-picker-empty">No active loads available.</div>
              ) : activeLoads.map((load) => {
                const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)?.name || 'Pickup'
                const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)?.name || 'Delivery'
                return (
                  <button
                    type="button"
                    className={selectedLoadId === load.id ? 'selected' : ''}
                    key={load.id}
                    onClick={() => { setSelectedLoadId(load.id); setLoadPickerOpen(false) }}
                  >
                    <strong>{load.loadNumber || load.id}</strong>
                    <span>{pickup} → {delivery}</span>
                    {Number.isFinite(load.pickupDayIndex) && <small>{formatCompactDate(load.pickupDayIndex)} · {formatTime(load.pickupWindowStartMinutes)}</small>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="driver-thread-composer-label">
          <span>LOAD UPDATE</span>
          {selectedLoad && Number.isFinite(selectedLoad.pickupDayIndex) && (
            <small>{formatCompactDate(selectedLoad.pickupDayIndex)} · {formatTime(selectedLoad.pickupWindowStartMinutes)}</small>
          )}
        </div>
        <div className="driver-thread-compose-row">
          <button type="button" className="driver-load-select-button" onClick={() => setLoadPickerOpen((open) => !open)} aria-expanded={loadPickerOpen}>
            <span>{selectedLoad ? (selectedLoad.loadNumber || selectedLoad.id) : '+ SEND LOAD'}</span>
            <small>{selectedLoad ? loadRouteLabel(selectedLoad).replace(`${selectedLoad.loadNumber || selectedLoad.id} · `, '') : 'Choose from active loads'}</small>
          </button>
          <button
            type="button"
            className="driver-load-send-button"
            disabled={!selectedLoadId}
            onClick={() => {
              if (!selectedLoadId) return
              onSendLoadUpdate?.(selectedLoadId)
              setSelectedLoadId('')
              setLoadPickerOpen(false)
            }}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  )
}

export default DriverMessageThreadScreen
