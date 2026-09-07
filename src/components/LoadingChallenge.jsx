import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const CHALLENGE_SECONDS = 28
const PALLET_COUNT = 8
const TYPE_COUNTS = { heavy: 2, standard: 4, fragile: 2 }

const zoneForSlot = (index) => {
  if (index <= 1) return 'heavy'
  if (index >= 6) return 'fragile'
  return 'standard'
}

const typeLabel = (type) => type === 'heavy' ? 'HEAVY' : type === 'fragile' ? 'FRAGILE' : 'STANDARD'
const typeIcon = (type) => type === 'heavy' ? '■' : type === 'fragile' ? '◇' : '▦'

function seededTypes(seed = '') {
  const base = ['heavy', 'heavy', 'standard', 'standard', 'standard', 'standard', 'fragile', 'fragile']
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) hash = ((hash * 31) + seed.charCodeAt(index)) >>> 0
  // Deterministic Fisher-Yates so each load feels different without changing on rerender.
  for (let index = base.length - 1; index > 0; index -= 1) {
    hash = ((hash * 1664525) + 1013904223) >>> 0
    const swapIndex = hash % (index + 1)
    ;[base[index], base[swapIndex]] = [base[swapIndex], base[index]]
  }
  return base
}

export default function LoadingChallenge({ load, onComplete, onCancel }) {
  const pallets = useMemo(() => {
    const types = seededTypes(String(load?.id || load?.loadNumber || 'DOCOS'))
    return Array.from({ length: PALLET_COUNT }, (_, index) => ({
      id: `P${index + 1}`,
      label: `PALLET ${String(index + 1).padStart(2, '0')}`,
      type: types[index],
    }))
  }, [load?.id, load?.loadNumber])

  const palletById = useMemo(() => Object.fromEntries(pallets.map((pallet) => [pallet.id, pallet])), [pallets])
  const [seconds, setSeconds] = useState(CHALLENGE_SECONDS)
  const [briefing, setBriefing] = useState(() => {
    try { return { active: true, full: sessionStorage.getItem('docos-loading-briefing-seen') !== '1', fading: false } }
    catch { return { active: true, full: true, fading: false } }
  })
  const [slotAssignments, setSlotAssignments] = useState(() => Array(PALLET_COUNT).fill(null))
  const [finished, setFinished] = useState(false)
  const [dragging, setDragging] = useState(null)
  const dragRef = useRef(null)

  const loadedIds = useMemo(() => slotAssignments.filter(Boolean), [slotAssignments])
  const placementErrors = useMemo(() => slotAssignments.reduce((count, palletId, index) => {
    if (!palletId) return count
    return count + (palletById[palletId]?.type === zoneForSlot(index) ? 0 : 1)
  }, 0), [slotAssignments, palletById])
  const allCorrect = loadedIds.length === PALLET_COUNT && placementErrors === 0

  useEffect(() => {
    if (!briefing.active) return undefined
    const holdMs = briefing.full ? 2000 : 650
    const fadeTimer = window.setTimeout(() => {
      setBriefing((current) => ({ ...current, fading: true }))
    }, holdMs)
    const closeTimer = window.setTimeout(() => {
      try { sessionStorage.setItem('docos-loading-briefing-seen', '1') } catch {}
      setBriefing((current) => ({ ...current, active: false, fading: false }))
    }, holdMs + 320)
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(closeTimer) }
  }, [briefing.active, briefing.full])

  useEffect(() => {
    if (finished || briefing.active) return undefined
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          setFinished(true)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [finished, briefing.active])

  // Filling the trailer incorrectly does not end the puzzle. The player gets the
  // remaining dock time to rearrange freight and recover the load.
  useEffect(() => {
    if (allCorrect && !finished && !briefing.active) setFinished(true)
  }, [allCorrect, finished, briefing.active])

  useEffect(() => {
    if (!dragging) return undefined

    const updateGhost = (x, y) => {
      setDragging((current) => current ? { ...current, x, y } : current)
    }

    const dropAt = (x, y) => {
      const active = dragRef.current
      if (!active) return
      const target = document.elementFromPoint(x, y)
      const slot = target?.closest?.('[data-loading-slot]')
      const slotIndex = Number(slot?.dataset?.loadingSlot)

      if (slot && Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < PALLET_COUNT) {
        setSlotAssignments((current) => {
          const sourceSlot = Number.isInteger(active.sourceSlot) ? active.sourceSlot : null
          const targetOccupant = current[slotIndex]
          if (targetOccupant && slotIndex !== sourceSlot) return current
          const next = [...current]
          if (sourceSlot !== null) next[sourceSlot] = null
          next[slotIndex] = active.palletId
          return next
        })
      }

      dragRef.current = null
      setDragging(null)
    }

    const handleTouchMove = (event) => {
      const active = dragRef.current
      if (!active || active.input !== 'touch') return
      const touch = Array.from(event.touches).find((item) => item.identifier === active.identifier)
      if (!touch) return
      event.preventDefault()
      updateGhost(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = (event) => {
      const active = dragRef.current
      if (!active || active.input !== 'touch') return
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === active.identifier)
      if (!touch) return
      dropAt(touch.clientX, touch.clientY)
    }

    const handleTouchCancel = () => {
      if (dragRef.current?.input !== 'touch') return
      dragRef.current = null
      setDragging(null)
    }

    const handleMouseMove = (event) => {
      if (dragRef.current?.input !== 'mouse') return
      event.preventDefault()
      updateGhost(event.clientX, event.clientY)
    }

    const handleMouseUp = (event) => {
      if (dragRef.current?.input !== 'mouse') return
      dropAt(event.clientX, event.clientY)
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true })
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging?.palletId])

  useEffect(() => {
    if (!finished) return
    dragRef.current = null
    setDragging(null)
  }, [finished])

  const beginTouchDrag = (event, palletId, sourceSlot = null) => {
    if (finished || briefing.active) return
    if (sourceSlot === null && loadedIds.includes(palletId)) return
    const touch = event.changedTouches?.[0]
    if (!touch) return
    event.preventDefault()
    dragRef.current = { palletId, sourceSlot, input: 'touch', identifier: touch.identifier }
    setDragging({ palletId, sourceSlot, x: touch.clientX, y: touch.clientY })
  }

  const beginMouseDrag = (event, palletId, sourceSlot = null) => {
    if (finished || briefing.active || event.button !== 0) return
    if (sourceSlot === null && loadedIds.includes(palletId)) return
    event.preventDefault()
    dragRef.current = { palletId, sourceSlot, input: 'mouse' }
    setDragging({ palletId, sourceSlot, x: event.clientX, y: event.clientY })
  }

  const keyboardLoad = (event, palletId) => {
    if (finished || briefing.active || loadedIds.includes(palletId)) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    setSlotAssignments((current) => {
      const palletType = palletById[palletId]?.type
      let openIndex = current.findIndex((value, index) => !value && zoneForSlot(index) === palletType)
      if (openIndex < 0) openIndex = current.findIndex((value) => !value)
      if (openIndex < 0) return current
      const next = [...current]
      next[openIndex] = palletId
      return next
    })
  }

  const missed = PALLET_COUNT - loadedIds.length
  const damaged = placementErrors
  const perfect = finished && missed === 0 && damaged === 0
  const delayMinutes = (missed * 5) + (damaged * 3)
  const draggingPallet = dragging ? palletById[dragging.palletId] : null

  return (
    <div className="loading-challenge-backdrop" role="dialog" aria-modal="true" aria-label="Pickup loading challenge">
      <section className="loading-challenge-panel">
        {briefing.active && (
          <div className={`loading-challenge-briefing ${briefing.fading ? 'fade-out' : ''}`} aria-live="polite">
            <div className="loading-briefing-kicker">FACILITY OPS</div>
            <strong>{briefing.full ? 'LOAD FAST. LOAD SMART.' : 'LOADING CHALLENGE'}</strong>
            {briefing.full && (
              <div className="loading-briefing-rules">
                <span><i className="heavy">■</i> HEAVY <b>→ FRONT</b></span>
                <span><i className="standard">▦</i> STANDARD <b>→ CENTER</b></span>
                <span><i className="fragile">◇</i> FRAGILE <b>→ REAR</b></span>
              </div>
            )}
          </div>
        )}
        <header className="loading-challenge-header">
          <div><span>FACILITY OPS · PICKUP</span><strong>{load?.loadNumber || load?.id}</strong></div>
          <div className={`loading-challenge-timer ${seconds <= 7 ? 'urgent' : ''}`}><small>DOCK TIMER</small><b>{seconds}s</b></div>
        </header>

        {!finished && (
          <>
            <p className="loading-challenge-instruction">Load fast, but load smart. Match each pallet to the correct trailer zone before the dock timer expires.</p>
            <div className="loading-rule-strip" aria-label="Loading rules">
              <span><i className="heavy">■</i> HEAVY → FRONT</span>
              <span><i className="standard">▦</i> STANDARD → CENTER</span>
              <span><i className="fragile">◇</i> FRAGILE → REAR</span>
            </div>
          </>
        )}

        <div className="loading-challenge-stage">
          <div className="loading-challenge-freight">
            <span className="loading-challenge-label">STAGED FREIGHT</span>
            <div className="loading-pallet-grid">
              {pallets.map((pallet) => {
                const loaded = loadedIds.includes(pallet.id)
                const active = dragging?.palletId === pallet.id
                return (
                  <button
                    key={pallet.id}
                    type="button"
                    disabled={loaded || finished}
                    className={`${pallet.type} ${loaded ? 'loaded' : ''} ${active ? 'dragging' : ''}`.trim()}
                    onTouchStart={(event) => beginTouchDrag(event, pallet.id)}
                    onMouseDown={(event) => beginMouseDrag(event, pallet.id)}
                    onKeyDown={(event) => keyboardLoad(event, pallet.id)}
                    aria-label={`${pallet.label}, ${typeLabel(pallet.type)}${loaded ? ', loaded' : ', drag into trailer'}`}
                  >
                    <i aria-hidden="true">{typeIcon(pallet.type)}</i><span>{pallet.label}</span><small>{typeLabel(pallet.type)}</small>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="loading-trailer-wrap">
            <span className="loading-challenge-label">TRAILER · {loadedIds.length}/{PALLET_COUNT}{placementErrors ? ` · ${placementErrors} MISPLACED` : ''}</span>
            <div className={`loading-trailer ${dragging ? 'drag-active' : ''}`}>
              <div className="loading-trailer-nose">TRACTOR</div>
              <div className="loading-trailer-bay">
                {slotAssignments.map((palletId, index) => {
                  const pallet = palletId ? palletById[palletId] : null
                  const zone = zoneForSlot(index)
                  const misplaced = Boolean(pallet && pallet.type !== zone)
                  return (
                    <div
                      key={index}
                      data-loading-slot={index}
                      className={`${zone} ${palletId ? 'occupied' : ''} ${misplaced ? 'misplaced' : ''} ${dragging && !palletId ? 'drop-ready' : ''}`.trim()}
                      onTouchStart={palletId && !finished ? (event) => beginTouchDrag(event, palletId, index) : undefined}
                      onMouseDown={palletId && !finished ? (event) => beginMouseDrag(event, palletId, index) : undefined}
                      aria-label={palletId ? `Trailer slot ${index + 1}, ${palletId}, ${typeLabel(pallet?.type)}, ${misplaced ? 'misplaced' : 'correctly placed'}` : `Trailer slot ${index + 1}, ${typeLabel(zone)} zone, open`}
                    >
                      {pallet ? <><span>{typeIcon(pallet.type)}</span><small>{pallet.id}</small></> : <><em>{index <= 1 ? 'FRONT' : index >= 6 ? 'REAR' : 'CENTER'}</em><small>{index + 1}</small></>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {draggingPallet && createPortal(
          <div
            className={`loading-drag-ghost ${draggingPallet.type}`}
            style={{ left: `${dragging.x}px`, top: `${dragging.y}px` }}
            aria-hidden="true"
          >
            <i>{typeIcon(draggingPallet.type)}</i><span>{draggingPallet.label}</span><small>{typeLabel(draggingPallet.type)}</small>
          </div>,
          document.body,
        )}

        {finished && (
          <div className={`loading-challenge-result ${perfect ? 'perfect' : 'exception'}`}>
            <span>{perfect ? 'LOAD SECURED' : 'LOADING EXCEPTION'}</span>
            <strong>{perfect ? 'FREIGHT LOADED & BALANCED' : `${missed ? `${missed} SHORT` : 'ALL ABOARD'} · ${damaged ? `${damaged} DAMAGED` : 'NO DAMAGE'}`}</strong>
            <p>{perfect
              ? `Perfect load. All freight is in the correct zone with ${seconds} seconds remaining.`
              : `${missed ? `${missed} pallet${missed === 1 ? '' : 's'} did not make the trailer. ` : ''}${damaged ? `${damaged} pallet${damaged === 1 ? '' : 's'} were left in unsafe positions and will be recorded as damaged. ` : ''}${delayMinutes ? `Facility handling adds ${delayMinutes} game minutes.` : ''}`}
            </p>
          </div>
        )}

        <footer className="loading-challenge-actions">
          {!finished && <button type="button" className="secondary" onClick={onCancel}>BACK TO MAP</button>}
          {finished && <button type="button" className="primary" onClick={() => onComplete?.({
            expectedPallets: PALLET_COUNT,
            loadedPallets: loadedIds.length,
            missingPallets: missed,
            damagedPallets: damaged,
            misplacedPallets: damaged,
            loadingDelayMinutes: delayMinutes,
            secondsRemaining: seconds,
            perfect,
            palletManifest: pallets.map((pallet) => ({
              id: pallet.id,
              type: pallet.type,
              slot: slotAssignments.findIndex((value) => value === pallet.id),
              loaded: loadedIds.includes(pallet.id),
              damaged: slotAssignments.some((value, index) => value === pallet.id && zoneForSlot(index) !== pallet.type),
            })),
          })}>CONFIRM LOAD</button>}
        </footer>
      </section>
    </div>
  )
}
