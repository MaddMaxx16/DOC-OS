const marketLabels = {
  'new-york': 'NEW YORK',
}

function StatusBar({ selectedMarket, gameTime }) {
  const marketName = marketLabels[selectedMarket] ?? selectedMarket?.toUpperCase() ?? ''
  const day = gameTime.gameDayIndex + 1
  const calendarDate = new Date(Date.UTC(2026, 8, 7 + gameTime.gameDayIndex))
  const month = calendarDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
  const date = calendarDate.getUTCDate()
  const minutes = gameTime.totalMinutesOfDay
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  const time = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`

  return (
    <div className="status-bar">
      <span>{month} {date} • {time}</span>
      <span>{marketName}</span>
      <span>DAY {day}</span>
    </div>
  )
}

export default StatusBar
