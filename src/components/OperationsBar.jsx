import { useMemo, useState } from 'react'

const marketLabels = { 'new-york': 'NEW YORK' }

function OperationsBar({ selectedMarket, notificationCount = 0, notifications = [], onOpenChange, onNotificationAction, showEndDay = false, endDayDisabled = false, onEndDay, onOpenMarkets }) {
  const [open, setOpen] = useState(false)
  const marketName = marketLabels[selectedMarket] ?? selectedMarket?.toUpperCase() ?? 'MARKET OFFLINE'
  const notificationLabel = useMemo(() => notificationCount <= 0 ? 'NO ALERTS' : notificationCount === 1 ? '1 ALERT' : `${notificationCount} ALERTS`, [notificationCount])
  const setDrawerOpen = (value) => { setOpen(value); onOpenChange?.(value) }
  const activate = (notification) => { setDrawerOpen(false); onNotificationAction?.(notification?.action, notification) }
  return (
    <div className={`operations-hud ${open ? 'open' : ''}`}>
      <div className="operations-bar-row">
        <button type="button" className="operations-bar" onClick={() => setDrawerOpen(!open)} aria-expanded={open} aria-controls="operations-drawer">
          <div className="operations-bar-main"><span className="operations-bar-kicker">OPERATIONS</span><strong>{marketName}</strong></div>
          <div className="operations-bar-meta"><span className={`operations-bar-status ${notificationCount > 0 ? 'attention' : ''}`}><span className="operations-bar-status-dot" aria-hidden="true" /><span>{notificationLabel}</span></span><span className="operations-bar-chevron" aria-hidden="true">{open ? '⌃' : '⌄'}</span></div>
        </button>
      </div>
      {open && <section id="operations-drawer" className="operations-drawer" aria-label="Operational alerts">
        <div className="operations-drawer-header"><span>OPERATIONAL ALERTS</span><strong>{marketName}</strong></div>
        {notifications.length ? <div className="operations-drawer-list">{notifications.map((notification) => {
          const Tag = notification.action ? 'button' : 'div'
          return <Tag type={notification.action ? 'button' : undefined} key={notification.id} className={`operations-drawer-item ${notification.tone || 'neutral'} ${notification.alertClass || ''} ${notification.action ? 'actionable' : ''}`} onClick={notification.action ? () => activate(notification) : undefined}><span className="operations-drawer-dot" aria-hidden="true"/><div className="operations-drawer-copy"><span className="operations-drawer-source">DOC OS</span><strong>{notification.title}</strong>{notification.detail ? <small>{notification.detail}</small> : null}</div>{notification.value ? <span className="operations-drawer-value">{notification.value}</span> : null}</Tag>
        })}</div> : <div className="operations-drawer-empty"><strong>All quiet.</strong><span>No new operational alerts right now.</span></div>}
        <div className="operations-drawer-actions">{showEndDay && <button type="button" className="operations-end-day operations-drawer-end-day" onClick={() => { setDrawerOpen(false); onEndDay?.() }} disabled={endDayDisabled}>END OPERATIONS DAY</button>}<button type="button" className="operations-market-action" onClick={() => { setDrawerOpen(false); onOpenMarkets?.() }}><span>MARKET</span></button></div>
      </section>}
    </div>
  )
}
export default OperationsBar
