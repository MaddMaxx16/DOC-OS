import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { calculateRoute } from '../services/routingService.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'
import { getProjectedDriverOrigin } from '../utils/driverQueue.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'

setWorkerUrl(workerUrl)

const routeSourceId = 'freightlink-preview-route'
const routeLayerId = 'freightlink-preview-route-line'
const deadheadSourceId = 'freightlink-deadhead-route'
const deadheadLayerId = 'freightlink-deadhead-route-line'

function evaluateFit(load, projection, route) {
  const arrival = projection.availableAbsoluteMinute + route.durationMinutes
  const windowEnd = load.pickupDayIndex * 1440 + load.pickupWindowEndMinutes
  const buffer = windowEnd - arrival
  if (arrival > windowEnd) return { label: 'NOT FEASIBLE', tone: 'poor', arrival, buffer }
  if (buffer <= 30) return { label: 'TIGHT', tone: 'tight', arrival, buffer }
  return { label: projection.queueLength > 0 ? 'GOOD FOLLOW-ON' : 'GOOD', tone: 'good', arrival, buffer }
}

function FreightLinkMarketMap({ loadViews, allLoads = [], drivers = [], runtimePositions = {}, gameTime, onViewLoad }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRefs = useRef([])
  const driverMarkerRefs = useRef([])
  const [mapReady, setMapReady] = useState(false)
  const [selectedLoadId, setSelectedLoadId] = useState(null)
  const [routeState, setRouteState] = useState('idle')
  const [driverFit, setDriverFit] = useState(null)

  const selectedView = useMemo(() => loadViews.find((item) => item.load.id === selectedLoadId) || null, [loadViews, selectedLoadId])

  useEffect(() => {
    if (!containerRef.current) return undefined
    const map = new MapLibreMap({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [-73.99, 40.73],
      zoom: 9.5,
      attributionControl: false,
    })
    mapRef.current = map
    map.on('load', () => setMapReady(true))
    return () => {
      markerRefs.current.forEach((marker) => marker.remove())
      driverMarkerRefs.current.forEach((marker) => marker.remove())
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    markerRefs.current.forEach((marker) => marker.remove())
    markerRefs.current = []

    loadViews.forEach(({ load, pickup }) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.className = `freightlink-market-pin ${selectedLoadId === load.id ? 'selected' : ''}`
      element.setAttribute('aria-label', `${pickup.name}, ${getFreightRouteName(load)}`)
      element.innerHTML = `<span>P</span><small>${pickup.name}</small>`
      element.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        setSelectedLoadId(load.id)
      })
      markerRefs.current.push(new Marker({ element }).setLngLat([pickup.longitude, pickup.latitude]).addTo(map))
    })
  }, [mapReady, loadViews, selectedLoadId])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    driverMarkerRefs.current.forEach((marker) => marker.remove())
    driverMarkerRefs.current = []
    drivers.filter((driver) => driver.carrierId).forEach((driver) => {
      const projection = getProjectedDriverOrigin({ driver, loads: allLoads, runtimePositions, gameTime })
      const point = projection?.location
      if (!point || !Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) return
      const element = document.createElement('div')
      element.className = 'freightlink-driver-map-pin'
      const first = (driver.fullName || driver.name || 'D').charAt(0).toUpperCase()
      element.innerHTML = `<span>${first}</span><small>${projection.queueLength ? 'PROJECTED' : 'DRIVER'}</small>`
      driverMarkerRefs.current.push(new Marker({ element }).setLngLat([point.longitude, point.latitude]).addTo(map))
    })
  }, [mapReady, drivers, allLoads, runtimePositions, gameTime])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !selectedView) {
      setDriverFit(null)
      ;[routeLayerId, deadheadLayerId].forEach((id) => { if (map?.getLayer(id)) map.removeLayer(id) })
      ;[routeSourceId, deadheadSourceId].forEach((id) => { if (map?.getSource(id)) map.removeSource(id) })
      return
    }

    let cancelled = false
    const { pickup, delivery, load } = selectedView
    const clearLine = (layerId, sourceId) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
    const drawLine = (layerId, sourceId, coordinates, color, width, opacity, dasharray = null) => {
      clearLine(layerId, sourceId)
      map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } } })
      map.addLayer({ id: layerId, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity, ...(dasharray ? { 'line-dasharray': dasharray } : {}) }, layout: { 'line-join': 'round', 'line-cap': 'round' } })
    }

    setRouteState('loading')
    setDriverFit(null)
    const projections = drivers.filter((driver) => driver.carrierId).map((driver) => ({ driver, projection: getProjectedDriverOrigin({ driver, loads: allLoads, runtimePositions, gameTime }) })).filter((item) => item.projection?.location)

    Promise.allSettled([
      calculateRoute(pickup, delivery),
      ...projections.map((item) => calculateRoute(item.projection.location, pickup)),
    ]).then((results) => {
      if (cancelled) return
      const loadedResult = results[0]
      if (loadedResult.status === 'fulfilled' && loadedResult.value.source !== 'fallback') {
        drawLine(routeLayerId, routeSourceId, loadedResult.value.routeShape, '#756D80', 4, 0.95)
        setRouteState(loadedResult.value.source === 'cache' ? 'cached' : 'ready')
      } else {
        clearLine(routeLayerId, routeSourceId)
        setRouteState('estimate')
      }

      const candidates = projections.map((item, index) => {
        const result = results[index + 1]
        if (result?.status !== 'fulfilled') return null
        const route = result.value
        const fit = evaluateFit(load, item.projection, route)
        return { ...item, route, ...fit }
      }).filter(Boolean).sort((a, b) => {
        const toneRank = { good: 0, tight: 1, poor: 2 }
        return (toneRank[a.tone] - toneRank[b.tone]) || (a.route.distanceMiles - b.route.distanceMiles)
      })

      const best = candidates[0] || null
      setDriverFit(best)
      if (best?.route?.source !== 'fallback' && Array.isArray(best?.route?.routeShape)) drawLine(deadheadLayerId, deadheadSourceId, best.route.routeShape, '#8EA3B7', 3, 0.7, [2, 2])
      else clearLine(deadheadLayerId, deadheadSourceId)

      const points = [[pickup.longitude, pickup.latitude], [delivery.longitude, delivery.latitude]]
      if (best?.projection?.location) points.push([best.projection.location.longitude, best.projection.location.latitude])
      const lngs = points.map((point) => point[0])
      const lats = points.map((point) => point[1])
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: { top: 44, right: 34, bottom: 230, left: 34 }, maxZoom: 12, duration: 350 })
    })

    return () => { cancelled = true }
  // Camera ownership: selecting a load may frame it once. Live driver movement,
  // market refreshes and game-clock ticks update markers without fighting the player's pan/zoom.
  }, [mapReady, selectedView?.load.id])

  return (
    <div className="freightlink-market-map-shell av27-map">
      <div ref={containerRef} className="freightlink-market-map" aria-label="FreightLink market planning map" />
      {!selectedView && <div className="freightlink-map-hint"><strong>MARKET MAP</strong><span>Tap a pickup facility to preview the lane and the best driver position.</span></div>}
      {selectedView && (
        <div className="freightlink-map-preview av27-preview">
          <div className="freightlink-map-preview-top">
            <div><span>{selectedView.pickup.name} → {selectedView.delivery.name}</span><strong>${selectedView.load.rate}</strong></div>
            <small>{getFreightRouteName(selectedView.load)}</small>
          </div>
          <div className="freightlink-map-preview-meta"><span>PICKUP {formatCompactDate(selectedView.load.pickupDayIndex)} · {formatTime(selectedView.load.pickupWindowStartMinutes)}</span><span>LOAD {selectedView.load.listedMiles?.toFixed?.(1) || '—'} MI</span></div>
          {driverFit && (
            <div className={`freightlink-chain-fit ${driverFit.tone}`}>
              <div><span>BEST POSITION</span><strong>{driverFit.driver.fullName || driverFit.driver.name}</strong><small>{driverFit.projection.queueLength ? `After ${driverFit.projection.queueLength} committed load${driverFit.projection.queueLength === 1 ? '' : 's'}` : 'Available from current position'}</small></div>
              <div><span>DEADHEAD</span><strong>{driverFit.route.distanceMiles.toFixed(1)} mi</strong><small>{Math.round(driverFit.route.durationMinutes)} min</small></div>
              <div><span>FIT</span><strong>{driverFit.label}</strong><small>ETA {formatTime(((driverFit.arrival % 1440) + 1440) % 1440)}</small></div>
            </div>
          )}
          <div className="freightlink-map-route-state">{routeState === 'loading' ? 'ROUTING LANE…' : routeState === 'estimate' ? 'ROUTE DATA LIMITED · TIMING ESTIMATE ONLY' : routeState === 'cached' ? 'CACHED ROAD ROUTE' : 'ROAD ROUTE READY'}</div>
          <button type="button" onClick={() => onViewLoad(selectedView.load.id)}>VIEW LOAD</button>
        </div>
      )}
    </div>
  )
}

export default FreightLinkMarketMap
