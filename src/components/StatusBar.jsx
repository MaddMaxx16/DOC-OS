import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function StatusBar({ career, selectedMarket, gameTime, operationDay = null }) {
  const day = Number.isFinite(operationDay) ? operationDay : gameTime.gameDayIndex + 1
  const time = formatTime(gameTime.totalMinutesOfDay)
  const market = selectedMarket === 'new-york' ? 'New York' : selectedMarket || 'Operations'

  return (
    <div className="status-bar operations-status-header">
      <div className="operations-identity"><strong>{career?.model === 'employee' && career?.origin === 'metroline_employee' ? 'METROLINE' : 'DOC OS'}</strong><small>{market} Operations</small></div>
      <div className="operations-clock"><small>{formatCompactDate(gameTime.gameDayIndex)} · DAY {day}</small><strong>{time}</strong></div>
    </div>
  )
}

export default StatusBar
