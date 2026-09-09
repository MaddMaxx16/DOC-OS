import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { formatCompactDate, formatTime } from '../utils/gameTime.js'

setWorkerUrl(workerUrl)

const routeSourceId = 'freightlink-preview-route'
const routeLayerId = 'freightlink-preview-route-line'

function FreightLinkMarketMap({ loadViews, onViewLoad }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRefs = useRef([])
  const [mapReady, setMapReady] = useState(false)
  const [selectedLoadId, setSelectedLoadId] = useState(null)
  const [routeState, setRouteState] = useState('idle')

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
      markerRefs.current = []
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
      element.setAttribute('aria-label', `${load.loadNumber || load.id}, ${pickup.name}`)
      element.innerHTML = `<span>P</span><small>${load.loadNumber || load.id}</small>`
      element.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        setSelectedLoadId(load.id)
      })
      const marker = new Marker({ element }).setLngLat([pickup.longitude, pickup.latitude]).addTo(map)
      markerRefs.current.push(marker)
    })
  }, [mapReady, loadViews, selectedLoadId])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !selectedView) {
      if (map?.getLayer(routeLayerId)) map.removeLayer(routeLayerId)
      if (map?.getSource(routeSourceId)) map.removeSource(routeSourceId)
      return
    }

    let cancelled = false
    const { pickup, delivery } = selectedView
    const drawRoute = (coordinates) => {
      if (cancelled || !mapRef.current) return
      if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId)
      if (map.getSource(routeSourceId)) map.removeSource(routeSourceId)
      map.addSource(routeSourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } } })
      map.addLayer({ id: routeLayerId, type: 'line', source: routeSourceId, paint: { 'line-color': '#756D80', 'line-width': 4, 'line-opacity': 0.95 }, layout: { 'line-join': 'round', 'line-cap': 'round' } })
    }

    setRouteState('loading')
    calculateRoute(pickup, delivery)
      .then((route) => {
        if (cancelled) return
        if (route.source === 'fallback') {
          if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId)
          if (map.getSource(routeSourceId)) map.removeSource(routeSourceId)
          setRouteState('estimate')
          return
        }
        drawRoute(route.routeShape)
        setRouteState(route.source === 'cache' ? 'cached' : 'ready')
      })
      .catch(() => {
        if (cancelled) return
        if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId)
        if (map.getSource(routeSourceId)) map.removeSource(routeSourceId)
        setRouteState('estimate')
      })

    return () => { cancelled = true }
  }, [mapReady, selectedView?.load.id])

  // MapLibre exposes LngLatBounds through the map constructor bundle, but avoid a second import.
  useEffect(() => {
    if (!mapReady || !selectedView) return
    const map = mapRef.current
    const { pickup, delivery } = selectedView
    const minLng = Math.min(pickup.longitude, delivery.longitude)
    const maxLng = Math.max(pickup.longitude, delivery.longitude)
    const minLat = Math.min(pickup.latitude, delivery.latitude)
    const maxLat = Math.max(pickup.latitude, delivery.latitude)
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 54, maxZoom: 12, duration: 350 })
  }, [mapReady, selectedView?.load.id])

  return (
    <div className="freightlink-market-map-shell">
      <div ref={containerRef} className="freightlink-market-map" aria-label="Available loads map" />
      {!selectedView && <div className="freightlink-map-hint">Tap a pickup pin to preview its full lane.</div>}
      {selectedView && (
        <div className="freightlink-map-preview">
          <div className="freightlink-map-preview-top">
            <div><span>{selectedView.load.loadNumber || selectedView.load.id}</span><strong>${selectedView.load.rate}</strong></div>
            <small>{routeState === 'loading' ? 'ROUTING…' : routeState === 'estimate' ? 'ROUTE DATA LIMITED' : routeState === 'cached' ? 'CACHED ROAD' : `${selectedView.load.listedMiles?.toFixed?.(1) || '—'} MI`}</small>
          </div>
          <div className="freightlink-map-preview-lane"><span>{selectedView.pickup.name}</span><b>→</b><span>{selectedView.delivery.name}</span></div>
          <div className="freightlink-map-preview-meta"><span>PICKUP {formatCompactDate(selectedView.load.pickupDayIndex)} · {formatTime(selectedView.load.pickupWindowStartMinutes)}</span><span>DELIVERY {formatCompactDate(selectedView.load.deliveryDayIndex)} · {formatTime(selectedView.load.deliveryWindowStartMinutes)}</span></div>
          <button type="button" onClick={() => onViewLoad(selectedView.load.id)}>VIEW LOAD</button>
        </div>
      )}
    </div>
  )
}

export default FreightLinkMarketMap
