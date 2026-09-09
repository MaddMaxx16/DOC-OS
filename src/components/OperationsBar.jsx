import { useMemo, useState } from 'react'
import { formatTime } from '../utils/gameTime.js'

const marketLabels = {
  'new-york': 'NEW YORK',
}

function OperationsBar({ selectedMarket, notificationCount = 0, notifications = [], scheduleEntries = [], nextScheduleItem = null, onOpenChange, onNotificationAction, showEndDay = false, endDayDisabled = false, onEndDay }) {
  const [open, setOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState('alerts')
  const marketName = marketLabels[selectedMarket] ?? selectedMarket?.toUpperCase() ?? 'MARKET OFFLINE'

  const notificationLabel = useMemo(() => {
    if (notificationCount <= 0) return 'NO ALERTS'
    if (notificationCount === 1) return '1 ALERT'
    return `${notificationCount} ALERTS`
  }, [notificationCount])

  const setDrawerOpen = (nextOpen, mode = drawerMode) => {
    setDrawerMode(mode)
    setOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  const activateNotification = (notification) => {
    if (!notification.action) return
    setDrawerOpen(false)
    onNotificationAction?.(notification.action, notification)
  }

  const activateEndDay = () => {
    if (endDayDisabled) return
    setDrawerOpen(false)
    onEndDay?.()
  }

  const toggleAlerts = () => {
    if (open && drawerMode === 'alerts') setDrawerOpen(false)
    else setDrawerOpen(true, 'alerts')
  }

  const toggleSchedule = () => {
    if (open && drawerMode === 'schedule') setDrawerOpen(false)
    else setDrawerOpen(true, 'schedule')
  }

  return (
    <div className={`operations-hud ${open ? 'open' : ''}`}>
      <div className="operations-bar-row">
        <button
          type="button"
          className="operations-bar"
          onClick={toggleAlerts}
          aria-expanded={open && drawerMode === 'alerts'}
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
            <span className="operations-bar-chevron" aria-hidden="true">{open && drawerMode === 'alerts' ? '⌃' : '⌄'}</span>
          </div>
        </button>

        <button
          type="button"
          className={`operations-schedule-button ${open && drawerMode === 'schedule' ? 'active' : ''}`}
          onClick={toggleSchedule}
          aria-label="Open today's load schedule"
          aria-expanded={open && drawerMode === 'schedule'}
        >
          <span className="operations-hamburger" aria-hidden="true"><i /><i /><i /></span>
          <span className="operations-next-load">
            <small>NEXT</small>
            <strong>{nextScheduleItem ? `${nextScheduleItem.driverName?.split(' ')[0] || 'DRIVER'} · ${nextScheduleItem.loadRef}` : 'CLEAR'}</strong>
          </span>
        </button>

      </div>

      {open && drawerMode === 'alerts' && (
        <section id="operations-drawer" className="operations-drawer" aria-label="Quick notifications">
          <div className="operations-drawer-header">
            <span>QUICK NOTIFICATIONS</span>
            <strong>{marketName}</strong>
          </div>

          {notifications.length > 0 ? (
            <div className="operations-drawer-list">
              {notifications.map((notification) => {
                const Tag = notification.action ? 'button' : 'div'
                const source = notification.action === 'messages'
                  ? 'ACTION REQUIRED'
                  : ['pickup', 'delivery'].includes(notification.action)
                    ? 'FACILITY OPS'
                    : notification.id?.startsWith('appt-')
                      ? (notification.tone === 'danger' ? 'RISK' : 'INFORMATION')
                      : notification.action === 'documents'
                        ? 'DOCUMENTS'
                        : 'DOC OS'
                return (
                  <Tag
                    type={notification.action ? 'button' : undefined}
                    key={notification.id}
                    className={`operations-drawer-item ${notification.tone || 'neutral'} ${notification.action ? 'actionable' : ''}`}
                    onClick={notification.action ? () => activateNotification(notification) : undefined}
                  >
                    <span className="operations-drawer-dot" aria-hidden="true" />
                    <div className="operations-drawer-copy">
                      <span className="operations-drawer-source">{source}</span>
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

          {showEndDay && (
            <div className="operations-drawer-end-day-wrap">
              <button
                type="button"
                className="operations-end-day operations-drawer-end-day"
                onClick={activateEndDay}
                disabled={endDayDisabled}
                aria-label="End operation day"
              >
                END OPERATIONS DAY
              </button>
            </div>
          )}

          <div className="operations-map-data">
            <span>MAP DATA</span>
            <div>
              <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>
              <span aria-hidden="true">·</span>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
            </div>
          </div>
        </section>
      )}

      {open && drawerMode === 'schedule' && (
        <section id="operations-drawer" className="operations-drawer operations-schedule-drawer" aria-label="Today's load schedule">
          <div className="operations-drawer-header">
            <span>TODAY'S LOAD SCHEDULE</span>
            <strong>{marketName}</strong>
          </div>
          {scheduleEntries.length ? (
            <div className="operations-schedule-list">
              {scheduleEntries.map((entry) => (
                <div className={`operations-schedule-item ${entry.risk?.tone || 'good'}`} key={entry.id}>
                  <div className="operations-schedule-time">
                    <strong>{formatTime(entry.start)}</strong>
                    <small>– {formatTime(entry.end)}</small>
                  </div>
                  <div className="operations-schedule-copy">
                    <span>{entry.driverName} · {entry.kind}</span>
                    <strong>{entry.loadRef}</strong>
                    <small>{entry.status}</small>
                  </div>
                  <span className={`operations-schedule-risk ${entry.risk?.tone || 'good'}`}>{entry.risk?.label || 'GOOD'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="operations-drawer-empty">
              <strong>No committed freight.</strong>
              <span>Accepted loads will build the day schedule here.</span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default OperationsBar
