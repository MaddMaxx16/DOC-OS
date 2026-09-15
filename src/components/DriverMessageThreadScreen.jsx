import { useEffect, useMemo, useRef, useState } from 'react'
import { formatTime } from '../utils/gameTime.js'
import { getDriverItineraryState } from '../utils/driverItinerary.js'
import { getFreightBusinessName, getFreightRouteName } from '../utils/freightIdentity.js'
import { getDriverReplyOptions } from '../utils/driverCommunications.js'
import { isDriverOnLunch } from '../utils/lunchDecisionEvents.js'

function formatMessageTime(value) {
  if (!Number.isFinite(value)) return ''
  return formatTime(((value % 1440) + 1440) % 1440)
}

function DriverMessageThreadScreen({ driver, carrier = null, messages = [], activeLoads = [], gameTime, onBack, onRead, onSendLoadUpdate, onSendQuickReply }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [updateOpen, setUpdateOpen] = useState(false)
  const historyRef = useRef(null)
  const sorted = useMemo(() => [...messages].sort((a, b) => (a.receivedGameMinute || 0) - (b.receivedGameMinute || 0)), [messages])
  const driverLoads = useMemo(() => activeLoads.filter((load) => load.assignedDriverId === driver?.id || load.completedDriverId === driver?.id), [activeLoads, driver?.id])
  const itineraryState = useMemo(() => getDriverItineraryState(activeLoads, driver?.id), [activeLoads, driver?.id])
  const currentLoad = itineraryState.operationalLoad
  const onboardLoads = itineraryState.onboardLoads
  const currentStop = itineraryState.currentStop
  const nextStop = itineraryState.nextStop
  const currentStatus = currentLoad?.tripStatus || currentLoad?.status || ''
  const lunchDisplayActive = isDriverOnLunch(driver, gameTime)
  const driverStatusLabel = lunchDisplayActive ? 'ON LUNCH'
    : ['en-route-pickup'].includes(currentStatus) ? 'EN ROUTE · PICKUP'
    : ['waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'].includes(currentStatus) ? 'AT PICKUP'
      : currentStatus === 'loaded' ? 'LOADED'
        : ['en-route-delivery'].includes(currentStatus) ? 'EN ROUTE · DELIVERY'
          : ['waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery'].includes(currentStatus) ? 'AT DELIVERY'
            : currentStatus === 'awaiting-pod' ? 'AWAITING POD'
              : ['assigned', 'queued', 'route-ready'].includes(currentStatus) ? 'PLANNED'
                : driver?.status === 'unavailable' ? 'ON DUTY' : 'AVAILABLE'
  const nextStopLabel = nextStop ? `${String(nextStop.type || '').toUpperCase()} · ${getFreightBusinessName(nextStop.load, nextStop.type)}` : null
  const operationalUpdateSent = (communication, loadId = null) => messages.some((message) =>
    message.direction === 'outbound'
      && message.communicationType === communication
      && (loadId ? message.loadId === loadId : true)
  )

  const updateOptions = useMemo(() => {
    const status = currentLoad?.tripStatus || ''
    const options = []
    if (status === 'checked-in-pickup' && !operationalUpdateSent('dock-update', currentLoad?.id)) options.push({ label: 'SEND DOOR UPDATE', body: `They have a door for you at ${getFreightBusinessName(currentLoad, 'pickup')}. Go ahead and get set for loading.`, communication: 'dock-update', score: 1 })
    if (status === 'checked-in-delivery' && !operationalUpdateSent('dock-update', currentLoad?.id)) options.push({ label: 'SEND DOOR UPDATE', body: `The receiver at ${getFreightBusinessName(currentLoad, 'delivery')} has a door for you. Go ahead and get set to unload.`, communication: 'dock-update', score: 1 })
    if (status === 'loaded' && Number.isFinite(currentLoad?.plannedDeliveryDepartureGameMinute) && !operationalUpdateSent('appointment-plan', currentLoad?.id)) options.push({ label: 'HOLD FOR APPOINTMENT', body: 'Hold there for now. I’m protecting the delivery appointment and I’ll keep you moving when it’s time.', communication: 'appointment-plan', score: 1 })
    if (['en-route-pickup', 'en-route-delivery'].includes(status) && !operationalUpdateSent('request-eta', currentLoad?.id)) options.push({ label: 'REQUEST ETA', body: 'Send me an updated ETA when you get a chance.', communication: 'request-eta', score: 1 })
    return options
  }, [currentLoad?.tripStatus, currentLoad?.plannedDeliveryDepartureGameMinute, currentLoad?.id, messages])

  const latestInbound = useMemo(() => [...sorted].reverse().find((message) => message.direction !== 'outbound') || null, [sorted])
  const hasRepliedToLatestInbound = useMemo(() => latestInbound
    ? sorted.some((message) => message.direction === 'outbound' && Number(message.receivedGameMinute || 0) > Number(latestInbound.receivedGameMinute || 0))
    : false, [sorted, latestInbound?.id])
  const replyOptions = useMemo(() => hasRepliedToLatestInbound ? [] : getDriverReplyOptions(latestInbound, currentLoad), [latestInbound, currentLoad, hasRepliedToLatestInbound])

  useEffect(() => { sorted.forEach((message) => { if (message.direction !== 'outbound' && !message.read) onRead?.(message) }) }, [sorted, onRead])
  useEffect(() => { const frame = window.requestAnimationFrame(() => { if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight }); return () => window.cancelAnimationFrame(frame) }, [sorted.length, replyOpen])

  const sendReply = (option) => {
    onSendQuickReply?.(option.body, { communication: option.communication, score: option.score, loadId: latestInbound?.loadId || currentLoad?.id || null })
    setReplyOpen(false)
  }

  const sendUpdate = (option) => {
    onSendQuickReply?.(option.body, { communication: option.communication, score: option.score, loadId: option.loadId || currentLoad?.id || null, operationalAction: 'driver-update' })
    setUpdateOpen(false)
  }

  return (
    <div className="phone-page driver-thread-screen">
      <header className="driver-thread-header driver-thread-header-v4">
        <button type="button" onClick={onBack} aria-label="Back to messages">‹</button>
        <div className="driver-thread-header-avatar">{driver?.fullName?.charAt(0) || 'D'}</div>
        <div className="driver-thread-header-copy">
          <strong>{driver?.fullName || driver?.name || 'Driver'}</strong>
          <span>{carrier?.name || 'Carrier'} · {driverStatusLabel}</span>
        </div>
      </header>

      {currentLoad && <section className="driver-thread-route-context">
        <div>
          <span>CURRENT ROUTE</span>
          <strong>{getFreightRouteName(currentLoad)}</strong>
        </div>
        {nextStopLabel && <small>{nextStopLabel}</small>}
      </section>}

      <div className="driver-thread-history" ref={historyRef}>
        <div className="driver-thread-day-separator"><span>TODAY</span></div>
        {sorted.map((message) => (
          <div className={`driver-chat-row ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`} key={message.id}>
            <div className="driver-chat-bubble">
              <div className="driver-chat-meta"><span>{message.direction === 'outbound' ? 'YOU' : (message.sender || driver?.fullName || 'DRIVER')}</span><time>{formatMessageTime(message.receivedGameMinute)}</time></div>
              <p>{message.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="driver-thread-composer driver-thread-composer-v3">
        <div className="driver-thread-reply-control driver-thread-dual-controls">
          {updateOpen && updateOptions.length > 0 && (
            <div className="driver-thread-reply-dropdown" role="menu" aria-label="Operational updates">
              <div className="driver-thread-reply-dropdown-heading"><span>DISPATCH ACTIONS</span><small>CONTEXTUAL</small></div>
              {updateOptions.map((option) => (
                <button type="button" role="menuitem" key={option.body} onClick={() => sendUpdate(option)}><strong>{option.label || 'SEND UPDATE'}</strong><small>{option.body}</small></button>
              ))}
            </div>
          )}
          {replyOpen && (
            <div className="driver-thread-reply-dropdown" role="menu" aria-label="Quick replies">
              <div className="driver-thread-reply-dropdown-heading"><span>RESPONSE NEEDED</span><small>CHOOSE ONE</small></div>
              {replyOptions.map((option) => (
                <button type="button" role="menuitem" key={option.body} onClick={() => sendReply(option)}><strong>{option.label || 'RESPOND'}</strong><small>{option.body}</small></button>
              ))}
            </div>
          )}
          {updateOptions.length > 0 && <button type="button" className={`driver-thread-reply-toggle ${updateOpen ? 'open' : ''}`} onClick={() => { setUpdateOpen((value) => !value); setReplyOpen(false) }} aria-expanded={updateOpen}>
            <span>DISPATCH ACTIONS</span><strong aria-hidden="true">{updateOpen ? '⌃' : '⌄'}</strong>
          </button>}
          {replyOptions.length > 0 ? <button type="button" className={`driver-thread-reply-toggle ${replyOpen ? 'open' : ''}`} onClick={() => { setReplyOpen((value) => !value); setUpdateOpen(false) }} aria-expanded={replyOpen}>
            <span>RESPOND</span><strong aria-hidden="true">{replyOpen ? '⌃' : '⌄'}</strong>
          </button> : updateOptions.length === 0 ? <div className="driver-thread-no-response"><strong>NO RESPONSE NEEDED</strong><span>Marcus will text when something needs your attention.</span></div> : null}
        </div>
      </div>
    </div>
  )
}

export default DriverMessageThreadScreen
