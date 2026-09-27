import test from 'node:test'
import assert from 'node:assert/strict'
import { getActiveRouteLineStyle, STAGING_ROUTE_COLOR } from '../src/utils/mapRouteVisual.js'
import { startActiveRouteVisualSync, syncActiveRouteVisual } from '../src/utils/mapRouteSynchronizer.js'

function fakeMap({ loaded = true } = {}) {
  const sources = new Map()
  const layers = new Map()
  const listeners = new Map()
  const paint = []
  return {
    loaded,
    sources,
    layers,
    listeners,
    paint,
    isStyleLoaded() { return this.loaded },
    getSource(id) { return sources.get(id) },
    addSource(id, definition) {
      const source = { data: definition.data, setData(data) { this.data = data } }
      sources.set(id, source)
    },
    getLayer(id) { return layers.get(id) },
    addLayer(layer) { layers.set(layer.id, layer) },
    setPaintProperty(id, property, value) { paint.push({ id, property, value }) },
    on(event, callback) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(callback) },
    off(event, callback) { listeners.get(event)?.delete(callback) },
    emit(event) { listeners.get(event)?.forEach((callback) => callback()) },
  }
}

function scheduler() {
  const frames = new Map()
  const timers = new Map()
  let nextId = 1
  return {
    frames,
    timers,
    requestFrame(callback) { const id = nextId++; frames.set(id, callback); return id },
    cancelFrame(id) { frames.delete(id) },
    setTimer(callback) { const id = nextId++; timers.set(id, callback); return id },
    clearTimer(id) { timers.delete(id) },
    runFrames() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback()) },
    runTimers() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((callback) => callback()) },
  }
}

const freightGeometry = [[-74, 40.7], [-73.95, 40.75]]
const stagingGeometry = [[-73.95, 40.75], [-73.8, 40.8]]
const newerFreightGeometry = [[-73.9, 40.7], [-73.7, 40.9]]
const freightStyle = getActiveRouteLineStyle({ activeRouteColor: '#5AA7D9', tripStatus: 'en-route-delivery' })
const stagingStyle = getActiveRouteLineStyle({ activeRouteColor: '#5AA7D9', isStagingRoute: true })

test('normal freight geometry updates the shared active-route source', () => {
  const map = fakeMap()
  assert.equal(syncActiveRouteVisual(map, { coordinates: freightGeometry, style: freightStyle }), true)
  assert.deepEqual(map.sources.get('active-route').data.geometry.coordinates, freightGeometry)
  assert.equal(map.layers.get('active-route-line').paint['line-color'], '#5AA7D9')
})

test('temporarily unavailable style retries staging geometry and amber treatment', () => {
  const map = fakeMap({ loaded: false })
  const scheduled = scheduler()
  const snapshot = { current: { coordinates: stagingGeometry, style: stagingStyle } }
  const cleanup = startActiveRouteVisualSync({ map, getSnapshot: () => snapshot.current, ...scheduled })

  assert.equal(map.sources.has('active-route'), false)
  map.loaded = true
  map.emit('styledata')

  assert.deepEqual(map.sources.get('active-route').data.geometry.coordinates, stagingGeometry)
  assert.equal(map.layers.get('active-route-line').paint['line-color'], STAGING_ROUTE_COLOR)
  assert.ok(map.paint.some((entry) => entry.property === 'line-color' && entry.value === STAGING_ROUTE_COLOR))
  cleanup()
})

test('latest authoritative route replaces queued staging before retry', () => {
  const map = fakeMap({ loaded: false })
  const scheduled = scheduler()
  const snapshot = { current: { coordinates: stagingGeometry, style: stagingStyle } }
  const cleanup = startActiveRouteVisualSync({ map, getSnapshot: () => snapshot.current, ...scheduled })

  snapshot.current = { coordinates: newerFreightGeometry, style: freightStyle }
  map.loaded = true
  scheduled.runFrames()

  assert.deepEqual(map.sources.get('active-route').data.geometry.coordinates, newerFreightGeometry)
  assert.equal(map.layers.get('active-route-line').paint['line-color'], '#5AA7D9')
  cleanup()
})

test('freight release clears the source and staging retry installs exact idle geometry', () => {
  const map = fakeMap()
  syncActiveRouteVisual(map, { coordinates: freightGeometry, style: freightStyle })
  syncActiveRouteVisual(map, { coordinates: [], style: freightStyle })
  assert.deepEqual(map.sources.get('active-route').data.geometry.coordinates, [])

  map.loaded = false
  const scheduled = scheduler()
  const cleanup = startActiveRouteVisualSync({ map, getSnapshot: () => ({ coordinates: stagingGeometry, style: stagingStyle }), ...scheduled })
  map.loaded = true
  scheduled.runTimers()
  assert.deepEqual(map.sources.get('active-route').data.geometry.coordinates, stagingGeometry)
  cleanup()
})

test('repeated map events are idempotent and cleanup disables stale retries', () => {
  const map = fakeMap()
  const scheduled = scheduler()
  let addSourceCalls = 0
  let addLayerCalls = 0
  const originalAddSource = map.addSource.bind(map)
  const originalAddLayer = map.addLayer.bind(map)
  map.addSource = (...args) => { addSourceCalls += 1; originalAddSource(...args) }
  map.addLayer = (...args) => { addLayerCalls += 1; originalAddLayer(...args) }
  const cleanup = startActiveRouteVisualSync({ map, getSnapshot: () => ({ coordinates: stagingGeometry, style: stagingStyle }), ...scheduled })

  map.emit('styledata')
  map.emit('idle')
  assert.equal(addSourceCalls, 1)
  assert.equal(addLayerCalls, 1)

  cleanup()
  map.sources.get('active-route').data = null
  map.emit('styledata')
  scheduled.runFrames()
  scheduled.runTimers()
  assert.equal(map.sources.get('active-route').data, null)
  assert.equal(map.listeners.get('styledata').size, 0)
  assert.equal(map.listeners.get('idle').size, 0)
})
