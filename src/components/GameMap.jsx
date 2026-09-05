import { useEffect, useRef, useState } from 'react'
import { AttributionControl, Map as MapLibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapLocations from '../data/mapLocations.js'
import { DELIVERY_UNLOAD_DURATION_MINUTES, PICKUP_LOADING_MINUTES } from '../data/pickupConfig.js'
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

function GameMap({ drivers, carriers = [], activeRouteGeometry, routeFocusMode = null, tripStatus, onDriverAction, assignedLoad, runtimePositions, runtimeProgress, runtimeRoute, gameTime, suppressAttention, isDriverFitEvaluation = false, evaluationLoad, tutorialEnabled = false, tutorialDriverAction = null }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRecords = useRef([])
  const animationFrame = useRef(null)
  const visualProgress = useRef(null)
  const cameraInitialized = useRef(false)
  const activeTravelKey = useRef(null)
  const pickupMarkerRef = useRef(null)
  const deliveryMarkerRef = useRef(null)
  const driverMarkerRefs = useRef(new Map())
  const [mapReady, setMapReady] = useState(false)

  const getDriver = () => drivers.find((driver) => driver.id === 'marcus')
  const removeLocationMarker = (ref) => {
    const marker = ref.current
    if (!marker) return
    markerRecords.current = markerRecords.current.filter((record) => record.marker !== marker)
    marker.remove()
    ref.current = null
  }

  useEffect(() => {
    const traveling = ['en-route-pickup', 'en-route-delivery'].includes(tripStatus)
    const key = traveling && assignedLoad ? `${tripStatus}:${assignedLoad.id}:${tripStatus === 'en-route-pickup' ? assignedLoad.departureGameMinute : assignedLoad.deliveryDepartureGameMinute}` : null
    if (!key) { activeTravelKey.current = null; visualProgress.current = null; return }
    if (activeTravelKey.current === key) return
    const record = markerRecords.current.find(({ location }) => location.id === 'marcus')
    if (!record) return
    const position = runtimePositions?.marcus
    if (position) record.marker.setLngLat([position.longitude, position.latitude])
    visualProgress.current = runtimeProgress
    activeTravelKey.current = key
  }, [tripStatus, assignedLoad?.id, assignedLoad?.departureGameMinute, assignedLoad?.deliveryDepartureGameMinute, mapReady])

  useEffect(() => {
    if (['en-route-pickup', 'en-route-delivery'].includes(tripStatus)) return
    const record = markerRecords.current.find(({ location }) => location.id === 'marcus')
    const position = runtimePositions?.marcus
    if (record && position) record.marker.setLngLat([position.longitude, position.latitude])
  }, [runtimePositions, tripStatus])

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
    const showPickup = isDriverFitEvaluation || (active && !['loaded', 'en-route-delivery', 'at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'].includes(trip))
    const showDelivery = active && !['delivered', 'completed'].includes(trip)
    const pickup = mapLocations.find((location) => location.id === activeLoad?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === activeLoad?.deliveryLocationId)
    const activeDriverIds = new Set(drivers.map((driver) => driver.id))
    driverMarkerRefs.current.forEach((marker, id) => { if (!activeDriverIds.has(id)) { marker.remove(); driverMarkerRefs.current.delete(id); markerRecords.current = markerRecords.current.filter((record) => record.marker !== marker) } })
    drivers.forEach((driver) => {
      if (driverMarkerRefs.current.has(driver.id)) return
      const home = mapLocations.find((location) => location.id === driver.homeBaseLocationId)
      const position = runtimePositions[driver.id] || home
      if (!position) return
      const element = document.createElement('div'); element.className = 'game-marker driver'; element.textContent = driver.name?.charAt(0)?.toUpperCase() || 'D'
      const popup = new Popup({ offset: 20 }).setDOMContent(document.createElement('div'))
      const marker = new Marker({ element }).setLngLat([position.longitude, position.latitude]).setPopup(popup).addTo(map)
      popup.on('open', () => element.classList.add('popup-open')); popup.on('close', () => element.classList.remove('popup-open'))
      driverMarkerRefs.current.set(driver.id, marker); markerRecords.current.push({ location: { id: driver.id, name: driver.name, type: 'driver' }, marker, markerElement: element, popup })
    })
    if (showPickup && pickup) createLocationMarker(pickup, pickupMarkerRef)
    if (showDelivery && delivery) createLocationMarker(delivery, deliveryMarkerRef)
    if (!showPickup) removeLocationMarker(pickupMarkerRef)
    if (!showDelivery) removeLocationMarker(deliveryMarkerRef)
    const deliveryRecord = markerRecords.current.find(({ marker }) => marker === deliveryMarkerRef.current)
    if (deliveryRecord) deliveryRecord.markerElement.style.pointerEvents = ['at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod'].includes(trip) ? 'none' : ''
    logDocOsState({ isDriverFitEvaluation, hasActiveAcceptedLoad: active, showPickupMarker: showPickup, showDeliveryMarker: showDelivery, pickupMarkerExists: Boolean(pickupMarkerRef.current), deliveryMarkerExists: Boolean(deliveryMarkerRef.current) })
  }, [mapReady, drivers, runtimePositions, assignedLoad?.id, assignedLoad?.assignedDriverId, assignedLoad?.tripStatus, isDriverFitEvaluation, evaluationLoad?.id])

  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [-73.9857, 40.7484],
      zoom: 10,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

    // DOC OS attribution treatment. MapLibre's compact attribution control ships
    // with its own white circular info artwork. iOS/WebKit can keep rendering
    // that native artwork even when ordinary stylesheet overrides are present,
    // so normalize the generated control directly after MapLibre mounts it.
    requestAnimationFrame(() => {
      const attribution = map.getContainer().querySelector('.maplibregl-ctrl-attrib')
      const attributionButton = attribution?.querySelector('.maplibregl-ctrl-attrib-button')

      attribution?.classList.remove('maplibregl-compact-show')
      attribution?.classList.add('docos-map-attribution')

      if (attributionButton) {
        attributionButton.classList.add('docos-map-attribution-button')
        attributionButton.style.setProperty('background', 'rgba(15, 17, 21, 0.94)', 'important')
        attributionButton.style.setProperty('background-image', 'none', 'important')
        attributionButton.style.setProperty('border', '1px solid #2A303B', 'important')
        attributionButton.style.setProperty('border-radius', '999px', 'important')
        attributionButton.style.setProperty('box-shadow', '0 5px 18px rgba(0, 0, 0, 0.34)', 'important')
        attributionButton.style.setProperty('appearance', 'none', 'important')
        attributionButton.style.setProperty('-webkit-appearance', 'none', 'important')
        attributionButton.style.setProperty('outline', 'none', 'important')
        attributionButton.replaceChildren()

        const infoGlyph = document.createElement('span')
        infoGlyph.className = 'docos-map-attribution-glyph'
        infoGlyph.textContent = 'i'
        infoGlyph.setAttribute('aria-hidden', 'true')
        attributionButton.appendChild(infoGlyph)
      }
    })
    map.resize()

    const markers = []
    map.on('load', () => {
      if (!cameraInitialized.current) {
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
      driverMarkerRefs.current.forEach((marker) => marker.remove())
      driverMarkerRefs.current.clear()
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

    if (map.getLayer('active-route-line')) {
      map.setPaintProperty('active-route-line', 'line-color', isDriverFitEvaluation ? '#4c8dff' : '#e0a458')
      map.setPaintProperty('active-route-line', 'line-width', isDriverFitEvaluation ? 5 : 4)
    }

    console.debug('ROUTE SOURCE UPDATE', { tripStatus, geometryType: route ? 'active' : 'null', coordinateCount: route?.routeShape?.length || 0 })
  }, [activeRouteGeometry, tripStatus, isDriverFitEvaluation])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !routeFocusMode || !activeRouteGeometry?.length) return

    const lngs = activeRouteGeometry.map((point) => point[0])
    const lats = activeRouteGeometry.map((point) => point[1])
    const bounds = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ]

    map.fitBounds(bounds, {
      padding: routeFocusMode === 'evaluation'
        ? { top: 74, right: 26, bottom: 330, left: 26 }
        : { top: 74, right: 26, bottom: 300, left: 26 },
      maxZoom: 12.8,
      duration: 420,
    })
  }, [activeRouteGeometry, routeFocusMode, mapReady])

  useEffect(() => {
    const pickupRecord = markerRecords.current.find(({ marker }) => marker === pickupMarkerRef.current)
    const popupLoad = assignedLoad || evaluationLoad
    if (pickupRecord && popupLoad) {
      const content = document.createElement('div')
      content.className = 'docos-facility-popup pickup-facility-popup'
      const heading = document.createElement('strong'); heading.textContent = 'PICKUP'
      const name = document.createElement('span'); name.textContent = mapLocations.find((location) => location.id === popupLoad.pickupLocationId)?.name || 'Pickup location'
      const load = document.createElement('span'); load.textContent = `Load: ${popupLoad.id}`
      const window = document.createElement('span'); window.textContent = `Pickup Window: ${formatAppointment(popupLoad.pickupDayIndex, popupLoad.pickupWindowStartMinutes, popupLoad.pickupWindowEndMinutes)}`
      content.append(heading, name, load, window)
      pickupRecord.popup.setDOMContent(content)
    }
    const deliveryRecord = markerRecords.current.find(({ marker }) => marker === deliveryMarkerRef.current)
    if (deliveryRecord && popupLoad) {
      const content = document.createElement('div')
      content.className = 'docos-facility-popup delivery-facility-popup'
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
    record.markerElement.classList.toggle('tutorial-target', tutorialEnabled && tutorialDriverAction && !record.popup.isOpen())
    record.markerElement.classList.toggle('attention', !suppressAttention && ['loaded', 'at-delivery', 'waiting-at-pickup', 'waiting-at-delivery', 'awaiting-pod'].includes(assignedLoad?.tripStatus))
    const popupContent = document.createElement('div')
    popupContent.className = 'docos-driver-popup'

    const buildMetaRow = (labelText, valueText) => {
      if (!valueText) return null
      const row = document.createElement('div')
      row.className = 'docos-driver-popup-row'

      const label = document.createElement('span')
      label.className = 'docos-driver-popup-label'
      label.textContent = labelText

      const value = document.createElement('strong')
      value.className = 'docos-driver-popup-value'
      value.textContent = valueText

      row.append(label, value)
      return row
    }

    const buildMetricGrid = (entries) => {
      const values = entries.filter((entry) => entry?.value)
      if (!values.length) return null
      const grid = document.createElement('div')
      grid.className = 'docos-driver-popup-metrics'
      values.forEach(({ label, value }) => {
        const cell = document.createElement('div')
        const cellLabel = document.createElement('span')
        cellLabel.textContent = label
        const cellValue = document.createElement('strong')
        cellValue.textContent = value
        cell.append(cellLabel, cellValue)
        grid.append(cell)
      })
      return grid
    }

    const buildActionButton = (label, actionType, disabled = false) => {
      if (!label || !actionType) return null
      const action = document.createElement('button')
      action.type = 'button'
      action.textContent = label
      action.className = `docos-driver-popup-action ${tutorialEnabled && tutorialDriverAction === actionType ? 'tutorial-target' : ''}`
      action.disabled = disabled
      action.onclick = () => {
        if (action.disabled) return
        record.popup.remove()
        onDriverAction?.(actionType, assignedLoad?.id, 'marcus')
      }
      return action
    }

    const buildHeader = (titleText, subtitleText, pillText, pillTone = 'neutral') => {
      const header = document.createElement('div')
      header.className = 'docos-driver-popup-header'

      const identity = document.createElement('div')
      identity.className = 'docos-driver-popup-identity'

      const title = document.createElement('strong')
      title.className = 'docos-driver-popup-title'
      title.textContent = titleText

      const subtitle = document.createElement('span')
      subtitle.className = 'docos-driver-popup-subtitle'
      subtitle.textContent = subtitleText

      identity.append(title, subtitle)
      header.append(identity)

      if (pillText) {
        const pill = document.createElement('span')
        pill.className = `docos-driver-popup-pill ${pillTone}`
        pill.textContent = pillText
        header.append(pill)
      }

      return header
    }

    if (marcus.status === 'unavailable') {
      const pickup = mapLocations.find((location) => location.id === assignedLoad?.pickupLocationId)
      const delivery = mapLocations.find((location) => location.id === assignedLoad?.deliveryLocationId)
      const model = getMarcusPanelModel({ assignedLoad, gameTime, runtimeProgress, pickup, delivery })

      if (model) {
        const pillTone = model.operationalState === 'TRIP_PLANNED' ? 'ready' : model.operationalState === 'WAITING_DELIVERY' ? 'attention' : 'neutral'
        popupContent.append(buildHeader(model.driverName || marcus.fullName || record.location.name, model.roleLabel || 'Driver', model.statusLabel?.toUpperCase(), pillTone))

        if (['ASSIGNED', 'TRIP_PLANNED'].includes(model.operationalState)) {
          // Quick map action: identity + status + primary action only.
        } else if (model.operationalState === 'EN_ROUTE_PICKUP' || model.operationalState === 'EN_ROUTE_DELIVERY') {
          const metrics = buildMetricGrid([
            { label: 'NEXT STOP', value: model.nextStopLabel },
            { label: 'ETA', value: model.eta },
            { label: 'PROGRESS', value: `${Math.round((model.progress || 0) * 100)}%` },
          ])
          if (metrics) popupContent.append(metrics)
          if (Number.isFinite(marcus.hours?.drivingRemainingMinutes)) {
            const hosMinutes = marcus.hours.drivingRemainingMinutes
            const hosHours = Math.floor(hosMinutes / 60)
            const hosRemainder = hosMinutes % 60
            const hosLabel = hosRemainder ? `${hosHours}h ${hosRemainder}m drive remaining` : `${hosHours}h drive remaining`
            const hosRow = buildMetaRow('HOS', hosLabel)
            if (hosRow) popupContent.append(hosRow)
          }
        } else {
          const loadRow = buildMetaRow('CURRENT LOAD', model.loadId)
          const stopRow = buildMetaRow('NEXT STOP', model.nextStopLabel)
          const locationRow = buildMetaRow('CURRENT LOCATION', model.locationLabel)
          const remainingLabel = ['WAITING_PICKUP', 'WAITING_DELIVERY'].includes(model.operationalState) ? 'WAIT TIME' : 'REMAINING'
          const remainingRow = model.remainingMinutes !== null ? buildMetaRow(remainingLabel, `${model.remainingMinutes} min`) : null

          if (loadRow) popupContent.append(loadRow)
          if (stopRow) popupContent.append(stopRow)
          if (locationRow) popupContent.append(locationRow)
          if (remainingRow) popupContent.append(remainingRow)
        }

        const action = buildActionButton(model.actionLabel, model.actionType, model.actionDisabled)
        if (action) popupContent.append(action)
      } else {
        popupContent.append(buildHeader(marcus.fullName || record.location.name, 'Driver', 'UNAVAILABLE', 'attention'))
      }
    } else {
      const carrier = carriers.find((item) => item.id === marcus.carrierId)
      const home = mapLocations.find((item) => item.id === marcus.homeBaseLocationId)
      const position = runtimePositions?.marcus
      const atHome = home && position && home.longitude === position.longitude && home.latitude === position.latitude
      const savedLastLocation = mapLocations.find((item) => item.id === marcus.lastKnownLocationId)
      const exactCurrentLocation = position ? mapLocations.find((item) => item.longitude === position.longitude && item.latitude === position.latitude) : null
      const availableLocationLabel = atHome ? home?.name : savedLastLocation?.name || exactCurrentLocation?.name || 'Current position'

      popupContent.append(buildHeader(marcus.fullName || record.location.name, 'Driver', 'AVAILABLE', 'ready'))
      if (carrier) popupContent.append(buildMetaRow('CARRIER', carrier.name))
      const locationRow = buildMetaRow('LOCATION', availableLocationLabel)
      if (locationRow) popupContent.append(locationRow)
      if (marcus.equipment?.label) popupContent.append(buildMetaRow('EQUIPMENT', marcus.equipment.label))
      if (marcus.hours?.status) popupContent.append(buildMetaRow('HOURS', marcus.hours.status === 'full' ? 'Full' : marcus.hours.status))
    }

    record.popup.setDOMContent(popupContent)
  }, [drivers, carriers, assignedLoad, evaluationLoad, isDriverFitEvaluation, onDriverAction, suppressAttention, gameTime, runtimeProgress, runtimePositions, tutorialEnabled, tutorialDriverAction])

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
    if (assignedLoad.tripStatus === 'waiting-at-pickup') pill.textContent = 'WAITING AT PICKUP'
    else if (assignedLoad.tripStatus === 'loading-at-pickup') pill.textContent = `LOADING • ${Math.max(0, PICKUP_LOADING_MINUTES - (now - assignedLoad.loadingStartGameMinute))} MIN`
    else if (assignedLoad.tripStatus === 'at-delivery' && !suppressAttention) pill.textContent = 'WAITING AT DELIVERY'
    else if (assignedLoad.tripStatus === 'unloading-delivery' && !suppressAttention) pill.textContent = `UNLOADING • ${Math.max(0, DELIVERY_UNLOAD_DURATION_MINUTES - (now - assignedLoad.deliveryUnloadStartGameMinute))} MIN`
    else if (assignedLoad.tripStatus === 'awaiting-pod' && !suppressAttention) pill.textContent = 'POD READY'
    else if (assignedLoad.tripStatus === 'loaded' && !suppressAttention) pill.textContent = assignedLoad.deliveryPlanningStatus === 'route-ready' ? 'READY FOR DISPATCH' : 'LOADED'
    else if (assignedLoad.tripStatus === 'loaded') pill.textContent = ''
    else pill.textContent = ''
  }, [assignedLoad, gameTime, suppressAttention])

  return <div ref={mapContainer} className="game-map" />
}

export default GameMap
