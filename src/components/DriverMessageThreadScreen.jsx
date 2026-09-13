import { useEffect, useMemo, useRef, useState } from 'react'
import { formatTime } from '../utils/gameTime.js'
import { getDriverItineraryState } from '../utils/driverItinerary.js'
import { getFreightBusinessName } from '../utils/freightIdentity.js'

function formatMessageTime(value) {
  if (!Number.isFinite(value)) return ''
  return formatTime(((value % 1440) + 1440) % 1440)
}

function DriverMessageThreadScreen({ driver, messages = [], activeLoads = [], onBack, onRead, onSendLoadUpdate, onSendQuickReply }) {
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
  const operationalUpdateSent = (communication, loadId = null) => messages.some((message) =>
    message.direction === 'outbound'
      && message.communicationType === communication
      && (loadId ? message.loadId === loadId : true)
  )

  const updateOptions = useMemo(() => {
    const status = currentLoad?.tripStatus || ''
    const options = []
    if (status === 'checked-in-pickup' && !operationalUpdateSent('dock-update', currentLoad?.id)) options.push({ body: `They have a door for you at ${getFreightBusinessName(currentLoad, 'pickup')}. Go ahead and get set for loading.`, communication: 'dock-update', score: 1 })
    if (status === 'checked-in-delivery' && !operationalUpdateSent('dock-update', currentLoad?.id)) options.push({ body: `The receiver at ${getFreightBusinessName(currentLoad, 'delivery')} has a door for you. Go ahead and get set to unload.`, communication: 'dock-update', score: 1 })
    if (status === 'loaded' && Number.isFinite(currentLoad?.plannedDeliveryDepartureGameMinute) && !operationalUpdateSent('appointment-plan', currentLoad?.id)) options.push({ body: 'Hold there for now. I’m protecting the delivery appointment and I’ll keep you moving when it’s time.', communication: 'appointment-plan', score: 1 })
    if (['waiting-at-pickup', 'waiting-at-delivery'].includes(status) && !operationalUpdateSent('delay-management', currentLoad?.id)) options.push({ body: 'I’m tracking the facility wait. Stay put and keep me posted if anything changes.', communication: 'delay-management', score: 1 })
    const briefedNext = driverLoads.find((load) => load.tripStatus === 'queued' && Number.isFinite(load.pickupDriverBriefedGameMinute))
    if (briefedNext && !operationalUpdateSent('next-stop-confirmation', briefedNext.id)) options.push({ body: `${getFreightBusinessName(briefedNext, 'pickup')} is your next pickup. I’ll let you know if that changes.`, communication: 'next-stop-confirmation', score: 1, loadId: briefedNext.id })
    if (nextStop && nextStop.loadId !== currentLoad?.id && !operationalUpdateSent('change-of-plan', nextStop.loadId)) options.push({ body: `Change of plan — head to ${getFreightBusinessName(nextStop.load, nextStop.type)} next.`, communication: 'change-of-plan', score: 1, loadId: nextStop.loadId })
    return options
  }, [currentLoad?.tripStatus, currentLoad?.plannedDeliveryDepartureGameMinute, currentLoad?.id, currentLoad?.loadNumber, driverLoads, onboardLoads, nextStop, messages])

  const latestInbound = useMemo(() => [...sorted].reverse().find((message) => message.direction !== 'outbound') || null, [sorted])

  const replyOptions = useMemo(() => {
    const status = currentLoad?.tripStatus || ''
    const body = String(latestInbound?.body || '').toLowerCase()
    if (latestInbound?.messageIntent === 'facility-delay' || body.includes('waiting') || body.includes('still no door')) return [
      { body: 'Copy. Keep me posted.', communication: 'acknowledge', score: 0 },
      { body: 'I’ll stay on it. Let me know when they give you a door.', communication: 'manage-delay', score: 1 },
      { body: 'If the wait starts affecting the next stop, send me an updated ETA.', communication: 'manage-delay', score: 1 },
    ]
    if (latestInbound?.messageIntent === 'pickup-exception' || status === 'pickup-issue') return [
      { body: 'Send me the details and hold there for now.', communication: 'issue-response', score: 1 },
      { body: 'Have them correct it before you roll. Keep me posted.', communication: 'issue-response', score: 1 },
      { body: 'Got it. I’m working on it now.', communication: 'acknowledge', score: 1 },
    ]
    if (['waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'].includes(status)) return [
      { body: 'Thanks for the update. Keep me posted.', communication: 'acknowledge', score: 0 },
      { body: 'Got it. Let me know when you’re rolling.', communication: 'coordinate', score: 1 },
      { body: 'If the wait changes, send me an updated ETA.', communication: 'manage-delay', score: 1 },
    ]
    if (['waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery'].includes(status)) return [
      { body: 'Thanks. Let me know when they release you.', communication: 'coordinate', score: 1 },
      { body: 'Keep me posted if the receiver gives you any issues.', communication: 'issue-watch', score: 1 },
      { body: 'Got it. I’ll keep an eye on the next pickup.', communication: 'proactive', score: 1 },
    ]
    if (['en-route-pickup', 'en-route-delivery'].includes(status)) return [
      { body: 'Thanks for the update. Drive safe.', communication: 'acknowledge', score: 0 },
      { body: 'Keep me posted if your ETA changes.', communication: 'manage-delay', score: 1 },
      { body: 'Got it. I’m watching the schedule.', communication: 'proactive', score: 1 },
    ]
    return [
      { body: 'Thanks for the update. Keep me posted.', communication: 'acknowledge', score: 0 },
      { body: 'Got it. Let me know if anything changes.', communication: 'coordinate', score: 1 },
      { body: 'Send me an updated ETA when you have it.', communication: 'manage-delay', score: 1 },
    ]
  }, [currentLoad?.tripStatus, latestInbound?.id, latestInbound?.body, latestInbound?.messageIntent])

  useEffect(() => { sorted.forEach((message) => { if (message.direction !== 'outbound' && !message.read) onRead?.(message) }) }, [sorted, onRead])
  useEffect(() => { const frame = window.requestAnimationFrame(() => { if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight }); return () => window.cancelAnimationFrame(frame) }, [sorted.length, replyOpen])

  const sendReply = (option) => {
    onSendQuickReply?.(option.body, { communication: option.communication, score: option.score, loadId: currentLoad?.id || null })
    setReplyOpen(false)
  }

  const sendUpdate = (option) => {
    onSendQuickReply?.(option.body, { communication: option.communication, score: option.score, loadId: option.loadId || currentLoad?.id || null, operationalAction: 'driver-update' })
    setUpdateOpen(false)
  }

  return (
    <div className="phone-page driver-thread-screen">
      <header className="driver-thread-header">
        <button type="button" onClick={onBack} aria-label="Back to messages">‹</button>
        <div className="driver-thread-header-avatar">{driver?.fullName?.charAt(0) || 'D'}</div>
        <div><strong>{driver?.fullName || driver?.name || 'Driver'}</strong><span>Driver</span></div>
      </header>

      <div className="driver-thread-history" ref={historyRef}>
        {sorted.map((message) => (
          <div className={`driver-chat-row ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`} key={message.id}>
            <div className="driver-chat-bubble"><p>{message.body}</p><time>{formatMessageTime(message.receivedGameMinute)}</time></div>
          </div>
        ))}
      </div>

      <div className="driver-thread-composer driver-thread-composer-v3">
        <div className="driver-thread-reply-control driver-thread-dual-controls">
          {updateOpen && updateOptions.length > 0 && (
            <div className="driver-thread-reply-dropdown" role="menu" aria-label="Operational updates">
              <div className="driver-thread-reply-dropdown-heading"><span>UPDATE DRIVER</span><small>OPERATIONS</small></div>
              {updateOptions.map((option) => (
                <button type="button" role="menuitem" key={option.body} onClick={() => sendUpdate(option)}>{option.body}</button>
              ))}
            </div>
          )}
          {replyOpen && (
            <div className="driver-thread-reply-dropdown" role="menu" aria-label="Quick replies">
              <div className="driver-thread-reply-dropdown-heading"><span>QUICK REPLIES</span><small>DOC OS</small></div>
              {replyOptions.map((option) => (
                <button type="button" role="menuitem" key={option.body} onClick={() => sendReply(option)}>{option.body}</button>
              ))}
            </div>
          )}
          {updateOptions.length > 0 && <button type="button" className={`driver-thread-reply-toggle ${updateOpen ? 'open' : ''}`} onClick={() => { setUpdateOpen((value) => !value); setReplyOpen(false) }} aria-expanded={updateOpen}>
            <span>UPDATE</span><strong aria-hidden="true">{updateOpen ? '⌃' : '⌄'}</strong>
          </button>}
          <button type="button" className={`driver-thread-reply-toggle ${replyOpen ? 'open' : ''}`} onClick={() => { setReplyOpen((value) => !value); setUpdateOpen(false) }} aria-expanded={replyOpen}>
            <span>REPLY</span><strong aria-hidden="true">{replyOpen ? '⌃' : '⌄'}</strong>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DriverMessageThreadScreen
