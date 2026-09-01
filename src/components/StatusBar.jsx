const marketLabels = {
  'new-york': 'NEW YORK',
}

function StatusBar({ selectedMarket, gameTime, cash = 0 }) {
  const marketName = marketLabels[selectedMarket] ?? selectedMarket?.toUpperCase() ?? ''
  const day = gameTime.gameDayIndex + 1
  const time = formatTime(gameTime.totalMinutesOfDay)

  return (
    <div className="status-bar">
      <span>{formatCompactDate(gameTime.gameDayIndex)} • {time}</span>
      <span>{marketName}</span>
      <span>DAY {day} · CASH ${cash.toFixed(0)}</span>
    </div>
  )
}

export default StatusBar
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
