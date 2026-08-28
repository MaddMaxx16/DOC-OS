const marketLabels = {
  'new-york': 'NEW YORK',
}

function StatusBar({ selectedMarket, gameTime }) {
  const marketName = marketLabels[selectedMarket] ?? selectedMarket?.toUpperCase() ?? ''
  const day = gameTime.gameDayIndex + 1
  const time = formatTime(gameTime.totalMinutesOfDay)

  return (
    <div className="status-bar">
      <span>{formatCompactDate(gameTime.gameDayIndex)} • {time}</span>
      <span>{marketName}</span>
      <span>DAY {day}</span>
    </div>
  )
}

export default StatusBar
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
