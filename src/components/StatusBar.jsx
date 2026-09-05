import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function StatusBar({ selectedMarket, gameTime, cash = 0, operationDay = null }) {
  void selectedMarket
  const day = Number.isFinite(operationDay) ? operationDay : gameTime.gameDayIndex + 1
  const time = formatTime(gameTime.totalMinutesOfDay)

  return (
    <div className="status-bar">
      <span>{formatCompactDate(gameTime.gameDayIndex)} • {time}</span>
      <span className="status-bar-center" aria-hidden="true">DOC OS</span>
      <span>DAY {day} · CASH ${cash.toFixed(0)}</span>
    </div>
  )
}

export default StatusBar
