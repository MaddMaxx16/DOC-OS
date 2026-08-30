import { useEffect, useRef, useState } from 'react'
import { LngLatBounds, Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapLocations from '../data/mapLocations.js'
import { DELIVERY_UNLOAD_DURATION_MINUTES, PICKUP_LOADING_MINUTES, PICKUP_WAIT_MINUTES } from '../data/pickupConfig.js'
import { getMarcusPanelModel } from '../utils/driverOperationalState.js'
import { formatAppointment } from '../utils/gameTime.js'
import { logDocOsState } from '../utils/debugLogger.js'

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

function GameMap({ drivers, activeRouteGeometry, tripStatus, onDriverAction, assignedLoad, runtimePositions, runtimeProgress, runtimeRoute, gameTime, suppressAttention, isDriverFitEvaluation = false, evaluationLoad }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRecords = useRef([])
  const animationFrame = useRef(null)
  const visualProgress = useRef(null)
  const cameraInitialized = useRef(false)
  const pickupMarkerRef = useRef(null)
  const deliveryMarkerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  const getDriver = () => drivers.find((driver) => driver.id === 'marcus')

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !map.isStyleLoaded()) return
    const createLocationMarker = (location, ref) => {
      if (ref.current) return
      const element = document.createElement('div')
      element.className = `game-marker ${location.type}`
      element.textContent = location.type === 'pickup' ? 'P' : 'D'
      const popup = new Popup({ offset: 20 }).setDOMContent(document.createElement('div'))
      const position = { longitude: location.longitude, latitude: location.latitude }
      const marker = new Marker({ element }).setLngLat([position.longitude, position.latitude]).setPopup(popup).addTo(map)
      popup.on('open', () => element.classList.add('popup-open'))
      popup.on('close', () => element.classList.remove('popup-open'))
      ref.current = marker
      markerRecords.current.push({ location, marker, markerElement: element, popup })
    }
    const trip = assignedLoad?.tripStatus
    const activeLoad = assignedLoad || evaluationLoad
    const active = Boolean(activeLoad?.assignedDriverId) && !['delivered', 'completed'].includes(trip)
    const showPickup = isDriverFitEvaluation || (active && !['loaded', 'en-route-delivery', 'at-delivery', 'checked-in-delivery', 'unloading-delivery', 'delivered', 'completed'].includes(trip))
    const showDelivery = active && !['delivered', 'completed'].includes(trip)
    const pickup = mapLocations.find((location) => location.id === activeLoad?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === activeLoad?.deliveryLocationId)
    if (showPickup && pickup) createLocationMarker(pickup, pickupMarkerRef)
    if (showDelivery && delivery) createLocationMarker(delivery, deliveryMarkerRef)
    if (!showPickup && pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null }
    if (!showDelivery && deliveryMarkerRef.current) { deliveryMarkerRef.current.remove(); deliveryMarkerRef.current = null }
    logDocOsState({ isDriverFitEvaluation, hasActiveAcceptedLoad: active, showPickupMarker: showPickup, showDeliveryMarker: showDelivery, pickupMarkerExists: Boolean(pickupMarkerRef.current), deliveryMarkerExists: Boolean(deliveryMarkerRef.current) })
  }, [mapReady, assignedLoad?.id, assignedLoad?.assignedDriverId, assignedLoad?.tripStatus, isDriverFitEvaluation, evaluationLoad?.id])

  useEffect(() => {
    const map = new Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-73.9857, 40.7484],
      zoom: 10,
      attributionControl: { compact: true, position: 'bottom-left' },
    })
    mapRef.current = map
    map.resize()

    const markers = []
    map.on('load', () => {
      const bounds = new LngLatBounds()

      mapLocations.forEach((location) => {
        bounds.extend([location.longitude, location.latitude])
        if (location.type !== 'driver') return
        const markerElement = document.createElement('div')
        markerElement.className = `game-marker ${location.type}`
        markerElement.textContent = location.type === 'pickup'
          ? 'P'
          : location.type === 'delivery'
            ? 'D'
            : 'T'

        const popupContent = document.createElement('div')
        const popup = new Popup({ offset: 20 }).setDOMContent(popupContent)
        const position = runtimePositions?.[location.id] || { longitude: location.longitude, latitude: location.latitude }
        const marker = new Marker({ element: markerElement })
          .setLngLat([position.longitude, position.latitude])
          .setPopup(popup)
          .addTo(map)
        popup.on('open', () => markerElement.classList.add('popup-open'))
        popup.on('close', () => markerElement.classList.remove('popup-open'))

        markers.push(marker)
        markerRecords.current.push({ location, marker, markerElement, popup })
      })

      if (!cameraInitialized.current) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 12 })
      const initialRoute = activeRouteGeometry?.length ? { routeShape: activeRouteGeometry } : null
      if (initialRoute) {
        map.addSource('active-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: initialRoute.routeShape } } })
        map.addLayer({ id: 'active-route-line', type: 'line', source: 'active-route', paint: { 'line-color': '#e0a458', 'line-width': 4 }, layout: { 'line-join': 'round', 'line-cap': 'round' } })
      }
      setMapReady(true)
        cameraInitialized.current = true
      }
    })

    return () => {
      markers.forEach((marker) => marker.remove())
      pickupMarkerRef.current?.remove()
      deliveryMarkerRef.current?.remove()
      pickupMarkerRef.current = null
      deliveryMarkerRef.current = null
      markerRecords.current = []
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const route = activeRouteGeometry?.length ? { routeShape: activeRouteGeometry } : null
    const source = map.getSource('active-route')
    if (!source) {
      if (!route) return
      map.addSource('active-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.routeShape } } })
      map.addLayer({ id: 'active-route-line', type: 'line', source: 'active-route', paint: { 'line-color': '#e0a458', 'line-width': 4 }, layout: { 'line-join': 'round', 'line-cap': 'round' } })
    } else if (route) source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.routeShape } })
    else if (!['en-route-pickup', 'en-route-delivery'].includes(tripStatus)) source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } })
    console.debug('ROUTE SOURCE UPDATE', { tripStatus, geometryType: route ? 'active' : 'null', coordinateCount: route?.routeShape?.length || 0 })
  }, [activeRouteGeometry, tripStatus])

  useEffect(() => {
    const pickupRecord = markerRecords.current.find(({ location }) => location.type === 'pickup')
    const popupLoad = assignedLoad || evaluationLoad
    if (pickupRecord && popupLoad) {
      const content = document.createElement('div')
      const heading = document.createElement('strong'); heading.textContent = 'PICKUP'
      const name = document.createElement('span'); name.textContent = mapLocations.find((location) => location.id === popupLoad.pickupLocationId)?.name || 'Pickup location'
      const load = document.createElement('span'); load.textContent = `Load: ${popupLoad.id}`
      const window = document.createElement('span'); window.textContent = `Pickup Window: ${formatAppointment(popupLoad.pickupDayIndex, popupLoad.pickupWindowStartMinutes, popupLoad.pickupWindowEndMinutes)}`
      content.append(heading, name, load, window)
      pickupRecord.popup.setDOMContent(content)
    }
    const deliveryRecord = markerRecords.current.find(({ location }) => location.type === 'delivery')
    if (deliveryRecord && popupLoad) {
      const content = document.createElement('div')
      const heading = document.createElement('strong'); heading.textContent = 'DELIVERY'
      const name = document.createElement('span'); name.textContent = mapLocations.find((location) => location.id === popupLoad.deliveryLocationId)?.name || 'Delivery location'
      const load = document.createElement('span'); load.textContent = `Load: ${popupLoad.id}`
      const window = document.createElement('span'); window.textContent = `Delivery Window: ${formatAppointment(popupLoad.deliveryDayIndex, popupLoad.deliveryWindowStartMinutes, popupLoad.deliveryWindowEndMinutes)}`
      content.append(heading, name, load, window)
      deliveryRecord.popup.setDOMContent(content)
    }
    const marcus = getDriver()
    const record = markerRecords.current.find(({ location }) => location.id === 'marcus')
    if (!marcus || !record) return

    record.markerElement.classList.toggle('unavailable', marcus.status === 'unavailable')
    record.markerElement.classList.toggle('attention', !suppressAttention && assignedLoad?.tripStatus === 'loaded')
    const popupContent = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = record.location.name
    const type = document.createElement('span')
    type.textContent = 'Driver'
    popupContent.append(name, type)
    if (marcus.status === 'unavailable') {
      const pickup = mapLocations.find((location) => location.id === assignedLoad?.pickupLocationId)
      const delivery = mapLocations.find((location) => location.id === assignedLoad?.deliveryLocationId)
      const model = getMarcusPanelModel({ assignedLoad, gameTime, runtimeProgress, pickup, delivery })
      if (model) {
      const status = document.createElement('span')
      status.textContent = `Status: ${model.statusLabel}`
      popupContent.append(status)
      const load = document.createElement('span'); load.textContent = `Load: ${model.loadId}`; popupContent.append(load)
      if (model.nextStopLabel) { const next = document.createElement('span'); next.textContent = `Next Stop: ${model.nextStopLabel}`; popupContent.append(next) }
      if (model.locationLabel) { const location = document.createElement('span'); location.textContent = `Location: ${model.locationLabel}`; popupContent.append(location) }
      if (model.eta) { const eta = document.createElement('span'); eta.textContent = `ETA: ${model.eta}`; popupContent.append(eta) }
      if (model.remainingMinutes !== null) { const remaining = document.createElement('span'); remaining.textContent = `Remaining: ${model.remainingMinutes} min`; popupContent.append(remaining) }
      if (model.operationalState === 'EN_ROUTE_PICKUP' || model.operationalState === 'EN_ROUTE_DELIVERY') { const progress = document.createElement('span'); progress.textContent = `Progress: ${Math.round(model.progress * 100)}%`; popupContent.append(progress) }
        const action = document.createElement('button')
        action.textContent = model.actionLabel
        action.type = 'button'
        action.className = 'action-button map-popup-action'
        action.disabled = model.actionDisabled
        action.onclick = () => { if (!action.disabled) { record.popup.remove(); onDriverAction?.(model.actionType, model.loadId, 'marcus') } }
        popupContent.append(action)
      } else {
        const status = document.createElement('span'); status.textContent = 'Status: Unavailable'; popupContent.append(status)
      }
    } else {
      const status = document.createElement('span'); status.textContent = 'Status: Available'; popupContent.append(status)
      const location = document.createElement('span'); location.textContent = `Location: ${record.location.name === 'Marcus' && runtimePositions?.marcus ? 'Current position' : record.location.name}`; popupContent.append(location)
    }
    record.popup.setDOMContent(popupContent)
  }, [drivers, assignedLoad, evaluationLoad, isDriverFitEvaluation, onDriverAction, suppressAttention, gameTime, runtimeProgress])

  useEffect(() => {
    const record = markerRecords.current.find(({ location }) => location.id === 'marcus')
    if (!record || runtimeProgress === null || !runtimeRoute?.length) return undefined
    visualProgress.current = runtimeProgress === 0 ? 0 : visualProgress.current
    if (runtimeProgress >= 1 && runtimePositions?.marcus) {
      record.marker.setLngLat([runtimePositions.marcus.longitude, runtimePositions.marcus.latitude])
      visualProgress.current = 1
      return undefined
    }
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

  useEffect(() => {
    const record = markerRecords.current.find(({ location }) => location.id === 'marcus')
    if (!record || !assignedLoad) return
    let pill = record.markerElement.querySelector('.driver-status-pill')
    if (!pill) { pill = document.createElement('span'); pill.className = 'driver-status-pill'; record.markerElement.append(pill) }
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (assignedLoad.tripStatus === 'waiting-at-pickup') pill.textContent = `WAITING • ${Math.max(0, PICKUP_WAIT_MINUTES - (now - assignedLoad.pickupArrivalGameMinute))} MIN`
    else if (assignedLoad.tripStatus === 'loading-at-pickup') pill.textContent = `LOADING • ${Math.max(0, PICKUP_LOADING_MINUTES - (now - assignedLoad.loadingStartGameMinute))} MIN`
    else if (assignedLoad.tripStatus === 'unloading-delivery' && !suppressAttention) pill.textContent = `UNLOADING • ${Math.max(0, DELIVERY_UNLOAD_DURATION_MINUTES - (now - assignedLoad.deliveryUnloadStartGameMinute))} MIN`
    else if (assignedLoad.tripStatus === 'loaded' && !suppressAttention) pill.textContent = assignedLoad.deliveryPlanningStatus === 'route-ready' ? 'READY FOR DISPATCH' : 'LOADED'
    else if (assignedLoad.tripStatus === 'loaded') pill.textContent = ''
    else pill.textContent = ''
  }, [assignedLoad, gameTime, suppressAttention])

  return <div ref={mapContainer} className="game-map" />
}

export default GameMap
