import { useEffect, useMemo, useState } from 'react'

const CHALLENGE_SECONDS = 45
const SLOT_COUNT = 8
const STAGING_COUNT = 2
const BASE_UNLOAD_MINUTES = 8

const typeLabel = (type) => type === 'heavy' ? 'HEAVY' : type === 'fragile' ? 'FRAGILE' : 'STANDARD'
const typeIcon = (type) => type === 'heavy' ? '■' : type === 'fragile' ? '◇' : '▦'

function normalizeManifest(load) {
  const expected = Math.max(1, Number(load?.shipment?.expectedPallets) || SLOT_COUNT)
  const manifest = Array.isArray(load?.shipment?.palletManifest) ? load.shipment.palletManifest : []
  return Array.from({ length: expected }, (_, index) => {
    const source = manifest.find((p) => p?.id === `P${index + 1}`) || manifest[index] || null
    return {
      id: source?.id || `P${index + 1}`,
      type: source?.type || 'standard',
      slot: Number.isInteger(source?.slot) ? source.slot : index,
      loaded: source ? source.loaded !== false : index < (Number(load?.shipment?.loadedPallets) || expected),
      damaged: Boolean(source?.damaged),
    }
  })
}

function seedNumber(seed = '') {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
  return hash >>> 0
}

function accessibleTrailerIds(slots) {
  const ids = []
  for (const col of [0, 1]) {
    for (let row = 3; row >= 0; row -= 1) {
      const id = slots[row * 2 + col]
      if (id) { ids.push(id); break }
    }
  }
  return ids
}

function chooseRequest(slots, staging, delivered, seed, step) {
  const staged = staging.filter(Boolean)
  if (staged.length >= STAGING_COUNT) return staged[(seed + step) % staged.length]
  const candidates = []
  for (const col of [0, 1]) {
    const occupied = []
    for (let row = 3; row >= 0; row -= 1) {
      const id = slots[row * 2 + col]
      if (id) occupied.push(id)
    }
    // Keep requests solvable with the two staging positions: target can be up to two blockers deep.
    candidates.push(...occupied.slice(0, 3))
  }
  candidates.push(...staged)
  const unique = [...new Set(candidates)].filter((id) => id && !delivered.includes(id))
  return unique.length ? unique[(seed + step * 3) % unique.length] : null
}

function projectNextRequests(slots, staging, delivered, seed, step, currentRequest, count = 2) {
  let virtualSlots = [...slots]
  let virtualStaging = [...staging]
  let virtualDelivered = [...delivered]
  let virtualStep = step
  let request = currentRequest
  const preview = []

  const clearCurrentOptimally = () => {
    if (!request) return false
    const trailerIndex = virtualSlots.indexOf(request)
    const stagingIndex = virtualStaging.indexOf(request)

    if (trailerIndex >= 0) {
      const col = trailerIndex % 2
      const row = Math.floor(trailerIndex / 2)
      const blockers = []
      for (let r = 3; r > row; r -= 1) {
        const id = virtualSlots[r * 2 + col]
        if (id) blockers.push({ id, index: r * 2 + col })
      }
      for (const blocker of blockers) {
        const openStage = virtualStaging.findIndex((id) => !id)
        if (openStage < 0) return false
        virtualSlots[blocker.index] = null
        virtualStaging[openStage] = blocker.id
      }
      virtualSlots[trailerIndex] = null
    } else if (stagingIndex >= 0) {
      virtualStaging[stagingIndex] = null
    } else {
      return false
    }

    virtualDelivered.push(request)
    virtualStep += 1
    return true
  }

  for (let i = 0; i < count; i += 1) {
    if (!clearCurrentOptimally()) break
    request = chooseRequest(virtualSlots, virtualStaging, virtualDelivered, seed, virtualStep)
    if (!request) break
    preview.push(request)
  }

  return preview
}

export default function UnloadSequencingChallenge({ load, onComplete, onCancel }) {
  const manifest = useMemo(() => normalizeManifest(load), [load])
  const palletById = useMemo(() => Object.fromEntries(manifest.map((p) => [p.id, p])), [manifest])
  const initialSlots = useMemo(() => {
    const next = Array(SLOT_COUNT).fill(null)
    manifest.filter((p) => p.loaded && p.slot >= 0 && p.slot < SLOT_COUNT).forEach((p) => { next[p.slot] = p.id })
    // Fallback for old saves without slot data.
    manifest.filter((p) => p.loaded && !next.includes(p.id)).forEach((p) => {
      const open = next.findIndex((value) => !value)
      if (open >= 0) next[open] = p.id
    })
    return next
  }, [manifest])
  const seed = useMemo(() => seedNumber(String(load?.id || load?.loadNumber || 'DOCOS')), [load?.id, load?.loadNumber])
  const [slots, setSlots] = useState(initialSlots)
  const [staging, setStaging] = useState(Array(STAGING_COUNT).fill(null))
  const [delivered, setDelivered] = useState([])
  const [seconds, setSeconds] = useState(CHALLENGE_SECONDS)
  const [moves, setMoves] = useState(0)
  const [wrongMoves, setWrongMoves] = useState(0)
  const [selected, setSelected] = useState(null)
  const [briefing, setBriefing] = useState(() => {
    try { return { active: true, full: sessionStorage.getItem('docos-unload-briefing-seen') !== '1', fading: false } }
    catch { return { active: true, full: true, fading: false } }
  })
  const [firstMoveMade, setFirstMoveMade] = useState(false)
  const [finished, setFinished] = useState(false)
  const [requestStep, setRequestStep] = useState(0)

  const loadedCount = manifest.filter((p) => p.loaded).length
  const missingCount = manifest.length - loadedCount
  const requestId = useMemo(() => chooseRequest(slots, staging, delivered, seed, requestStep), [slots, staging, delivered, seed, requestStep])
  const accessible = useMemo(() => accessibleTrailerIds(slots), [slots])
  const upcomingRequests = useMemo(() => projectNextRequests(slots, staging, delivered, seed, requestStep, requestId, 2), [slots, staging, delivered, seed, requestStep, requestId])

  useEffect(() => {
    if (!briefing.active || briefing.full) return undefined
    const fadeTimer = window.setTimeout(() => setBriefing((current) => ({ ...current, fading: true })), 650)
    const closeTimer = window.setTimeout(() => setBriefing({ active: false, full: false, fading: false }), 970)
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(closeTimer) }
  }, [briefing.active, briefing.full])

  const dismissBriefing = () => {
    try { sessionStorage.setItem('docos-unload-briefing-seen', '1') } catch {}
    setBriefing((current) => ({ ...current, fading: true }))
    window.setTimeout(() => setBriefing({ active: false, full: false, fading: false }), 320)
  }

  useEffect(() => {
    if (briefing.active || finished) return undefined
    const timer = window.setInterval(() => setSeconds((current) => {
      if (current <= 1) { setFinished(true); return 0 }
      return current - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [briefing.active, finished])

  useEffect(() => {
    if (!finished && delivered.length >= loadedCount) setFinished(true)
  }, [delivered.length, loadedCount, finished])

  const sourceFor = (id) => {
    const trailerIndex = slots.indexOf(id)
    if (trailerIndex >= 0) return { kind: 'trailer', index: trailerIndex }
    const stagingIndex = staging.indexOf(id)
    if (stagingIndex >= 0) return { kind: 'staging', index: stagingIndex }
    return null
  }

  const selectPallet = (id) => {
    if (briefing.active || finished) return
    const source = sourceFor(id)
    if (!source) return
    if (source.kind === 'trailer' && !accessible.includes(id)) return
    setSelected((current) => current === id ? null : id)
  }

  const moveSelectedToStaging = (targetIndex) => {
    if (!selected || staging[targetIndex] || finished || briefing.active) return
    const source = sourceFor(selected)
    if (!source) return
    if (source.kind === 'trailer' && !accessible.includes(selected)) return
    setSlots((current) => source.kind === 'trailer' ? current.map((id, index) => index === source.index ? null : id) : current)
    setStaging((current) => {
      const next = [...current]
      if (source.kind === 'staging') next[source.index] = null
      next[targetIndex] = selected
      return next
    })
    setMoves((value) => value + 1)
    setFirstMoveMade(true)
    setSelected(null)
  }

  const sendSelectedToReceiver = () => {
    if (!selected || finished || briefing.active) return
    const source = sourceFor(selected)
    if (!source) return
    if (source.kind === 'trailer' && !accessible.includes(selected)) return
    if (selected !== requestId) {
      setWrongMoves((value) => value + 1)
      return
    }
    setSlots((current) => source.kind === 'trailer' ? current.map((id, index) => index === source.index ? null : id) : current)
    setStaging((current) => source.kind === 'staging' ? current.map((id, index) => index === source.index ? null : id) : current)
    setDelivered((current) => [...current, selected])
    setMoves((value) => value + 1)
    setFirstMoveMade(true)
    setRequestStep((value) => value + 1)
    setSelected(null)
  }

  const remaining = loadedCount - delivered.length
  const completed = delivered.length >= loadedCount
  const efficiencyTarget = loadedCount + Math.max(0, Math.ceil(loadedCount * 0.45))
  const extraMoves = Math.max(0, moves - efficiencyTarget) + wrongMoves
  const delayMinutes = extraMoves * 2 + (completed ? 0 : remaining * 4)
  const perfect = finished && completed && wrongMoves === 0 && moves <= efficiencyTarget

  return (
    <div className="unload-sequence-backdrop" role="dialog" aria-modal="true" aria-label="Unload sequencing challenge">
      <section className="unload-sequence-panel">
        {briefing.active && <div className={`unload-sequence-briefing ${briefing.fading ? 'fading' : ''} ${briefing.full ? 'full' : 'sting'}`}>
          {briefing.full ? <>
            <span>FACILITY OPS · DELIVERY</span>
            <strong>UNLOAD IN ORDER</strong>
            <p>The receiver wants specific pallets first.</p>
            <div className="unload-briefing-rules"><b>1</b><em>Only rear-accessible pallets can move.</em><b>2</b><em>Use the 2 staging spaces to clear blockers.</em><b>3</b><em>Check UP NEXT so you can stage with a plan.</em><b>4</b><em>Send the requested pallet to the receiver.</em></div>
            <div className="unload-briefing-flow"><span>TRAILER</span><i>→</i><span>STAGING</span><i>→</i><span>RECEIVER</span></div>
            <button type="button" onClick={dismissBriefing}>GOT IT · START UNLOADING</button>
            <small>The dock timer starts after this briefing.</small>
          </> : <><span>FACILITY OPS · DELIVERY</span><strong>UNLOAD SEQUENCE</strong></>}
        </div>}
        <header className="unload-sequence-header">
          <div><span>UNLOAD SEQUENCING</span><strong>{load?.loadNumber || load?.id}</strong></div>
          <div className={`unload-sequence-timer ${seconds <= 8 ? 'urgent' : ''}`}><small>DOCK TIMER</small><b>{seconds}s</b></div>
        </header>

        {!finished ? <>
          <div className="unload-request-stack">
            <div className="unload-request-card"><span>RECEIVER REQUEST</span><strong>{requestId ? `${requestId} · ${typeLabel(palletById[requestId]?.type)}` : 'CLEAR'}</strong><small>{requestId && staging.includes(requestId) ? 'STAGED · SEND TO RECEIVER' : requestId && accessible.includes(requestId) ? 'ACCESSIBLE NOW' : 'BLOCKED · CLEAR A PATH'}</small></div>
            <div className="unload-up-next" aria-label="Upcoming receiver requests">
              <span>UP NEXT</span>
              <div>{upcomingRequests.length ? upcomingRequests.map((id, index) => <b key={id}>{index + 1}. {id}<small>{typeLabel(palletById[id]?.type)}</small></b>) : <b className="empty">NO MORE REQUESTS</b>}</div>
            </div>
          </div>
          <div className="unload-sequence-stats"><span>DELIVERED <b>{delivered.length}/{loadedCount}</b></span><span>MOVES <b>{moves}</b></span><span>STAGING <b>{staging.filter(Boolean).length}/2</b></span></div>
          <div className={`unload-sequence-stage ${!firstMoveMade ? 'first-move-guide' : ''}`}>
            <div className="unload-trailer-wrap">
              <span className="unload-label">TRAILER · TAP AN ACCESSIBLE PALLET</span>{!firstMoveMade && <div className="unload-guide-callout movable">HIGHLIGHTED PALLETS CAN MOVE</div>}
              <div className="unload-trailer">
                <div className="unload-trailer-nose">FRONT</div>
                <div className="unload-trailer-bay">
                  {slots.map((id, index) => {
                    const pallet = id ? palletById[id] : null
                    const canMove = id && accessible.includes(id)
                    return <button key={index} type="button" disabled={!canMove} onClick={() => id && selectPallet(id)} className={`${id ? 'occupied' : 'empty'} ${selected === id ? 'selected' : ''} ${id === requestId ? 'requested' : ''} ${canMove ? 'accessible' : 'blocked'}`.trim()}>
                      {pallet ? <><i>{typeIcon(pallet.type)}</i><b>{id}</b><small>{typeLabel(pallet.type)}</small></> : <small>OPEN</small>}
                    </button>
                  })}
                </div>
                <div className="unload-door-label">DOORS</div>
              </div>
            </div>
            <div className="unload-side-ops">
              <span className="unload-label">STAGING · 2 SPACES</span>{!firstMoveMade && <div className="unload-guide-callout staging">USE THESE TO CLEAR BLOCKERS</div>}
              <div className="unload-staging-grid">
                {staging.map((id, index) => <button key={index} type="button" onClick={() => id ? selectPallet(id) : moveSelectedToStaging(index)} className={`${id ? 'occupied' : 'open'} ${selected === id ? 'selected' : ''} ${id === requestId ? 'requested' : ''}`.trim()}>{id ? <><b>{id}</b><small>{typeLabel(palletById[id]?.type)}</small></> : <><b>STAGE</b><small>{selected ? 'MOVE HERE' : 'OPEN'}</small></>}</button>)}
              </div>
              <button type="button" className={`unload-receiver-dock ${selected === requestId ? 'ready' : ''}`} onClick={sendSelectedToReceiver} disabled={!selected}><span>RECEIVER DOCK</span><strong>{selected === requestId ? `SEND ${selected}` : requestId ? `WAITING FOR ${requestId}` : 'COMPLETE'}</strong><small>{selected && selected !== requestId ? 'Wrong freight — receiver will not take it' : 'Requested freight only'}</small></button>
            </div>
          </div>
          <p className="unload-sequence-hint">Only the rear-most pallet in each trailer lane can move. Use UP NEXT to decide which blockers are smartest to stage.</p>
        </> : <>
          <div className={`unload-sequence-result ${perfect ? 'perfect' : completed ? 'complete' : 'exception'}`}>
            <span>{completed ? 'TRAILER CLEARED' : 'DOCK TIME EXPIRED'}</span>
            <strong>{completed ? (perfect ? 'CLEAN, EFFICIENT UNLOAD' : 'FREIGHT DELIVERED') : `${remaining} PALLET${remaining === 1 ? '' : 'S'} STILL ON DOCK`}</strong>
            <p>{completed ? `${delivered.length} pallets delivered in ${moves} moves with ${seconds}s remaining.` : `${delivered.length}/${loadedCount} pallets cleared before time expired.`}{delayMinutes ? ` Handling adds ${delayMinutes} game minutes.` : ''}</p>
          </div>
          <div className="unload-result-grid"><div><span>EXPECTED</span><strong>{manifest.length}</strong></div><div><span>ARRIVED</span><strong>{loadedCount}</strong></div><div><span>MISSING</span><strong>{missingCount}</strong></div><div><span>MOVES</span><strong>{moves}</strong></div><div><span>REJECTED MOVES</span><strong>{wrongMoves}</strong></div><div><span>DELAY</span><strong>+{delayMinutes}m</strong></div></div>
        </>}

        <footer className="unload-sequence-actions">{!finished ? <button type="button" className="secondary" onClick={onCancel}>BACK TO MAP</button> : <button type="button" className="primary" onClick={() => onComplete?.({ expectedPallets: manifest.length, actualReceivedPallets: loadedCount, missingPallets: missingCount, damagedPallets: manifest.filter((p) => p.loaded && p.damaged).length, deliveredPallets: delivered.length, moves, wrongMoves, secondsRemaining: seconds, unloadingDelayMinutes: delayMinutes, perfect, sequenceCompleted: completed, deliverySequence: delivered })}>CONFIRM UNLOAD</button>}</footer>
      </section>
    </div>
  )
}
