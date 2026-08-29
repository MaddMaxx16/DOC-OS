import { useEffect, useRef } from 'react'
import { LngLatBounds, Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapLocations from '../data/mapLocations.js'

setWorkerUrl(workerUrl)

function routePosition(route, progress) {
  if (!route?.length) return null
  const distances = route.slice(1).map((point, i) => Math.hypot(point[0] - route[i][0], point[1] - route[i][1]))
  const total = distances.reduce((sum, value) => sum + value, 0)
  let remaining = total * Math.max(0, Math.min(1, progress))
  let index = 0
  while (index < distances.length - 1 && remaining > distances[index]) { remaining -= distances[index]; index += 1 }
  const amount = distances[index] ? remaining / distances[index] : 0
  const a = route[index]; const b = route[index + 1]
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount]
}

function addRoute(map, route, id, color) {
  map.addSource(id, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.routeShape } },
  })
  map.addLayer({ id: `${id}-line`, type: 'line', source: id, paint: { 'line-color': color, 'line-width': 4 }, layout: { 'line-join': 'round', 'line-cap': 'round' } })
}

function GameMap({ drivers, plannedRoute, deadheadRoute, onPlanTrip, assignedLoad, runtimePositions, runtimeProgress, runtimeRoute }) {
  const mapContainer = useRef(null)
  const markerRecords = useRef([])
  const animationFrame = useRef(null)
  const visualProgress = useRef(null)

  const getDriver = () => drivers.find((driver) => driver.id === 'marcus')

  useEffect(() => {
    const map = new Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-73.9857, 40.7484],
      zoom: 10,
      attributionControl: { compact: true, position: 'bottom-left' },
    })
    map.resize()

    const markers = []
    map.on('load', () => {
      const bounds = new LngLatBounds()

      mapLocations.forEach((location) => {
        bounds.extend([location.longitude, location.latitude])
        const markerElement = document.createElement('div')
        markerElement.className = `game-marker ${location.type}`
        markerElement.textContent = location.type === 'pickup'
          ? 'P'
          : location.type === 'delivery'
            ? 'D'
            : 'T'

        const popupContent = document.createElement('div')
        const name = document.createElement('strong')
        name.textContent = location.name
        const type = document.createElement('span')
        type.textContent = location.type[0].toUpperCase() + location.type.slice(1)
        popupContent.append(name, type)
        if (location.id === 'marcus' && getDriver()?.status === 'unavailable' && assignedLoad?.assignedDriverId === 'marcus') {
          const canSendToPickup = assignedLoad.planningStatus === 'route-ready' && Boolean(assignedLoad.plannedDeadheadRouteGeometry) && Number.isFinite(assignedLoad.plannedDeadheadDriveTimeMinutes) && !['en-route-pickup', 'at-pickup'].includes(assignedLoad.tripStatus)
          const status = document.createElement('span')
          status.textContent = assignedLoad.tripStatus === 'en-route-pickup' ? 'Status: En Route to Pickup' : assignedLoad.tripStatus === 'at-pickup' ? 'Status: At Pickup' : 'Status: Assigned • DOC001'
          popupContent.append(status)
          const action = document.createElement('button')
          action.textContent = assignedLoad.tripStatus === 'en-route-pickup' ? 'EN ROUTE' : assignedLoad.tripStatus === 'at-pickup' ? 'AT PICKUP' : assignedLoad.planningStatus === 'route-ready' ? 'SEND TO PICKUP' : 'PLAN TRIP'
          action.type = 'button'
          action.className = 'action-button map-popup-action'
          action.disabled = ['en-route-pickup', 'at-pickup'].includes(assignedLoad.tripStatus) || (assignedLoad.planningStatus === 'route-ready' && !canSendToPickup)
          action.onclick = () => { if (!action.disabled && (canSendToPickup || assignedLoad.planningStatus !== 'route-ready')) { popup.remove(); onPlanTrip?.(assignedLoad.id, 'marcus') } }
          popupContent.append(action)
        }
        if (location.id === 'marcus' && getDriver()?.status === 'unavailable' && !assignedLoad?.assignedDriverId) {
          const status = document.createElement('span')
          status.textContent = 'Status: Unavailable'
          popupContent.append(status)
        }

        const popup = new Popup({ offset: 20 }).setDOMContent(popupContent)
        const position = runtimePositions?.[location.id] || { longitude: location.longitude, latitude: location.latitude }
        const marker = new Marker({ element: markerElement })
          .setLngLat([position.longitude, position.latitude])
          .setPopup(popup)
          .addTo(map)

        markers.push(marker)
        markerRecords.current.push({ location, marker, markerElement, popup })
      })

      map.fitBounds(bounds, { padding: 50, maxZoom: 12 })
      if (plannedRoute) addRoute(map, plannedRoute, 'planned-route', '#4f8cff')
      if (deadheadRoute) addRoute(map, { routeShape: deadheadRoute }, 'deadhead-route', '#e0a458')
    })

    return () => {
      markers.forEach((marker) => marker.remove())
      markerRecords.current = []
      map.remove()
    }
  }, [plannedRoute, deadheadRoute])

  useEffect(() => {
    const marcus = getDriver()
    const record = markerRecords.current.find(({ location }) => location.id === 'marcus')
    if (!marcus || !record) return

    record.markerElement.classList.toggle('unavailable', marcus.status === 'unavailable')
    const popupContent = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = record.location.name
    const type = document.createElement('span')
    type.textContent = 'Driver'
    popupContent.append(name, type)
    if (marcus.status === 'unavailable') {
      const status = document.createElement('span')
      status.textContent = assignedLoad?.assignedDriverId === 'marcus'
        ? (assignedLoad.tripStatus === 'en-route-pickup' ? 'Status: En Route to Pickup' : assignedLoad.tripStatus === 'at-pickup' ? 'Status: At Pickup' : 'Status: Assigned • DOC001')
        : 'Status: Unavailable'
      popupContent.append(status)
      if (assignedLoad?.assignedDriverId === 'marcus') {
        const canSendToPickup = assignedLoad.planningStatus === 'route-ready' && Boolean(assignedLoad.plannedDeadheadRouteGeometry) && Number.isFinite(assignedLoad.plannedDeadheadDriveTimeMinutes) && !['en-route-pickup', 'at-pickup'].includes(assignedLoad.tripStatus)
        const action = document.createElement('button')
        action.textContent = assignedLoad.tripStatus === 'en-route-pickup' ? 'EN ROUTE' : assignedLoad.tripStatus === 'at-pickup' ? 'AT PICKUP' : assignedLoad.planningStatus === 'route-ready' ? 'SEND TO PICKUP' : 'PLAN TRIP'
        action.type = 'button'
        action.className = 'action-button map-popup-action'
        action.disabled = ['en-route-pickup', 'at-pickup'].includes(assignedLoad.tripStatus) || (assignedLoad.planningStatus === 'route-ready' && !canSendToPickup)
        action.onclick = () => { if (!action.disabled && (canSendToPickup || assignedLoad.planningStatus !== 'route-ready')) { record.popup.remove(); onPlanTrip?.(assignedLoad.id, 'marcus') } }
        popupContent.append(action)
      }
    }
    record.popup.setDOMContent(popupContent)
  }, [drivers, assignedLoad, onPlanTrip])

  useEffect(() => {
    const record = markerRecords.current.find(({ location }) => location.id === 'marcus')
    if (!record || runtimeProgress === null || !runtimeRoute?.length) return undefined
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
    const start = visualProgress.current ?? runtimeProgress
    const begin = performance.now()
    const duration = 2800
    const animate = (now) => {
      const t = Math.min(1, (now - begin) / duration)
      const progress = start + (runtimeProgress - start) * t
      const position = routePosition(runtimeRoute, progress)
      if (position) record.marker.setLngLat(position)
      visualProgress.current = progress
      if (t < 1) animationFrame.current = requestAnimationFrame(animate)
    }
    animationFrame.current = requestAnimationFrame(animate)
    return () => { if (animationFrame.current) cancelAnimationFrame(animationFrame.current) }
  }, [runtimeProgress, runtimeRoute])

  return <div ref={mapContainer} className="game-map" />
}

export default GameMap
