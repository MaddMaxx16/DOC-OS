function fmt(minutes) {
  const n = Number(minutes)
  if (!Number.isFinite(n)) return '—'
  const v = ((n % 1440) + 1440) % 1440
  const h24 = Math.floor(v / 60)
  const m = v % 60
  return `${h24 % 12 || 12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`
}

function AgendaFirstWorkdayGuide({ driver = null, gameTime, onOpenFreightLink }) {
  if (!driver || !gameTime) return null

  const day = Number(gameTime.gameDayIndex || 0)
  const now = Number(gameTime.totalMinutesOfDay || 0)
  const workday = driver.workdayByDay?.[String(day)] || driver.workdayByDay?.[day] || null
  const start = Number(workday?.startMinutes)
  const end = Number(workday?.endMinutes)
  const hasStart = Number.isFinite(start)
  const hasEnd = Number.isFinite(end)
  const ready = hasStart && hasEnd
  const started = hasStart && now >= start
  const lunch = workday?.lunchEvent || workday?.lunch || null
  const firstName = driver.name || String(driver.fullName || 'Driver').split(' ')[0]

  return (
    <section className={`agenda-first-guide ${ready ? 'ready' : ''}`}>
      <span>{ready ? (started ? 'WORKDAY ACTIVE' : 'WORKDAY PLANNED') : 'FIRST WORKDAY'}</span>
      <strong>{ready ? `${firstName} · ${fmt(start)}–${fmt(end)}` : `Build ${firstName}'s workday before booking freight.`}</strong>
      <p>
        {ready
          ? started
            ? `The scheduled start is locked because ${firstName}'s workday has begun. End time, lunch, and routes can still be adjusted.`
            : `FreightLink can now evaluate freight against this workday, HOS, appointments, and planned routes.`
          : `Use SET TIME below to choose a start and end. Lunch is optional. ${firstName} stays off duty until the scheduled start.`}
      </p>

      <div className="agenda-first-steps">
        <div className={hasStart ? 'done' : 'current'}><b>{hasStart ? '✓' : '1'}</b><span>START</span><strong>{hasStart ? fmt(start) : 'SET TIME'}</strong></div>
        <i />
        <div className={hasEnd ? 'done' : hasStart ? 'current' : ''}><b>{hasEnd ? '✓' : '2'}</b><span>END</span><strong>{hasEnd ? fmt(end) : 'SET TIME'}</strong></div>
        <i />
        <div className={lunch ? 'done' : ready ? 'current' : ''}><b>{lunch ? '✓' : '3'}</b><span>LUNCH</span><strong>{lunch ? 'PLANNED' : 'OPTIONAL'}</strong></div>
      </div>

      {ready && <button type="button" onClick={onOpenFreightLink}>FIND FREIGHT FOR {String(firstName).toUpperCase()} ›</button>}
    </section>
  )
}

export default AgendaFirstWorkdayGuide
