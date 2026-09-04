import { useMemo, useState } from 'react'

const marketLabels = {
  'new-york': 'NEW YORK',
}

function OperationsBar({ selectedMarket, notificationCount = 0, notifications = [], onOpenChange, onNotificationAction }) {
  const [open, setOpen] = useState(false)
  const marketName = marketLabels[selectedMarket] ?? selectedMarket?.toUpperCase() ?? 'MARKET OFFLINE'

  const notificationLabel = useMemo(() => {
    if (notificationCount <= 0) return 'NO ALERTS'
    if (notificationCount === 1) return '1 ALERT'
    return `${notificationCount} ALERTS`
  }, [notificationCount])

  const setDrawerOpen = (nextOpen) => {
    setOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  const activateNotification = (notification) => {
    if (!notification.action) return
    setDrawerOpen(false)
    onNotificationAction?.(notification.action, notification)
  }

  return (
    <div className={`operations-hud ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="operations-bar"
        onClick={() => setDrawerOpen(!open)}
        aria-expanded={open}
        aria-controls="operations-drawer"
      >
        <div className="operations-bar-main">
          <span className="operations-bar-kicker">OPERATIONS</span>
          <strong>{marketName}</strong>
        </div>

        <div className="operations-bar-meta">
          <span className={`operations-bar-status ${notificationCount > 0 ? 'attention' : ''}`}>
            <span className="operations-bar-status-dot" aria-hidden="true" />
            <span>{notificationLabel}</span>
          </span>
          {notificationCount > 0 && (
            <span className="operations-bar-badge" aria-label={`${notificationCount} active notifications`}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
          <span className="operations-bar-chevron" aria-hidden="true">{open ? '⌃' : '⌄'}</span>
        </div>
      </button>

      {open && (
        <section id="operations-drawer" className="operations-drawer" aria-label="Quick notifications">
          <div className="operations-drawer-header">
            <span>QUICK NOTIFICATIONS</span>
            <strong>{marketName}</strong>
          </div>

          {notifications.length > 0 ? (
            <div className="operations-drawer-list">
              {notifications.map((notification) => {
                const Tag = notification.action ? 'button' : 'div'
                return (
                  <Tag
                    type={notification.action ? 'button' : undefined}
                    key={notification.id}
                    className={`operations-drawer-item ${notification.tone || 'neutral'} ${notification.action ? 'actionable' : ''}`}
                    onClick={notification.action ? () => activateNotification(notification) : undefined}
                  >
                    <span className="operations-drawer-dot" aria-hidden="true" />
                    <div className="operations-drawer-copy">
                      <strong>{notification.title}</strong>
                      {notification.detail ? <small>{notification.detail}</small> : null}
                    </div>
                    {notification.value ? <span className="operations-drawer-value">{notification.value}</span> : null}
                  </Tag>
                )
              })}
            </div>
          ) : (
            <div className="operations-drawer-empty">
              <strong>All quiet.</strong>
              <span>No new operational alerts right now.</span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default OperationsBar
