import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapLocations from '../data/mapLocations.js'
import { DELIVERY_UNLOAD_DURATION_MINUTES } from '../data/pickupConfig.js'
import { getMarcusPanelModel } from '../utils/driverOperationalState.js'
import { formatAppointment } from '../utils/gameTime.js'
import { logDocOsState } from '../utils/debugLogger.js'
import { getDriverQueue } from '../utils/driverQueue.js'

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

function GameMap({ driverFocusRequest = 0, driverFocusId = 'marcus', facilityFocusRequest = 0, facilityFocusRole = null, drivers, loads = [], carriers = [], activeRouteGeometry, routeFocusMode = null, routeReviewLoad = null, tripStatus, onDriverAction, assignedLoad, runtimePositions, runtimeProgress, runtimeRoute, gameTime, suppressAttention, isDriverFitEvaluation = false, evaluationLoad, tutorialEnabled = false, tutorialDriverAction = null, freightBrowseMode = false, freightBrowseLoads = [], freightBrowseSelectedLoadId = null, onFreightBrowseSelect }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRecords = useRef([])
  const animationFrame = useRef(null)
  const visualProgress = useRef(null)
  const cameraInitialized = useRef(false)
  const activeTravelKey = useRef(null)
  const travelCameraKey = useRef(null)
  const pickupMarkerRef = useRef(null)
  const deliveryMarkerRef = useRef(null)
  const driverMarkerRefs = useRef(new Map())
  const freightBrowseMarkerRefs = useRef(new Map())
  const freightBrowseDeliveryMarkerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [markerRefreshToken, setMarkerRefreshToken] = useState(0)
  const [facilityPopupOpen, setFacilityPopupOpen] = useState(false)

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
    // MapLibre DOM markers do not depend on style readiness. On iOS resume,
    // the canvas/style can be mid-rehydrate while the marker pane is already usable.
    // Returning here used to leave the route line restored but P/D/driver markers absent.
    if (!map || !mapReady) return
    const createLocationMarker = (location, ref, role) => {
      const existing = ref.current
      if (existing) {
        const existingElement = existing.getElement?.()
        if (existingElement && !existingElement.isConnected) {
          removeLocationMarker(ref)
        } else {
        const current = existing.getLngLat()
        const sameLocation = Math.abs(current.lng - location.longitude) < 0.000001 && Math.abs(current.lat - location.latitude) < 0.000001
        const record = markerRecords.current.find(({ marker }) => marker === existing)
        const sameRole = record?.markerElement?.dataset?.role === role
        if (sameLocation && sameRole) return
        removeLocationMarker(ref)
        }
      }
      const element = document.createElement('div')
      element.className = `game-marker ${role}`
      element.dataset.role = role
      element.textContent = role === 'pickup' ? 'P' : 'D'
      const popup = new Popup({ offset: 20 }).setDOMContent(document.createElement('div'))
      const position = { longitude: location.longitude, latitude: location.latitude }
      const marker = new Marker({ element }).setLngLat([position.longitude, position.latitude]).setPopup(popup).addTo(map)
      let facilityAutoCloseTimer = null
      popup.on('open', () => {
        element.classList.add('popup-open')
        setFacilityPopupOpen(true)
        if (facilityAutoCloseTimer) clearTimeout(facilityAutoCloseTimer)
        facilityAutoCloseTimer = setTimeout(() => {
          const popupNode = popup.getElement?.()
          const hasAction = Boolean(popupNode?.querySelector?.('.docos-driver-popup-action'))
          if (popup.isOpen() && !hasAction) popup.remove()
        }, 2200)
      })
      popup.on('close', () => {
        if (facilityAutoCloseTimer) {
          clearTimeout(facilityAutoCloseTimer)
          facilityAutoCloseTimer = null
        }
        element.classList.remove('popup-open')
        setFacilityPopupOpen(false)
      })
      ref.current = marker
      markerRecords.current.push({ location: { ...location, type: role }, marker, markerElement: element, popup })
    }
    // During assignment evaluation, the evaluation load is the map's source of truth.
    // Otherwise an older active load can leak its facility markers into the new route review.
    const activeLoad = isDriverFitEvaluation ? evaluationLoad : (routeFocusMode === 'planning' && routeReviewLoad ? routeReviewLoad : assignedLoad)
    const trip = activeLoad?.tripStatus
    const active = !freightBrowseMode && Boolean(activeLoad?.assignedDriverId) && !['queued', 'delivered', 'completed'].includes(trip)
    const showPickup = isDriverFitEvaluation || (active && !['loaded', 'en-route-delivery', 'at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'].includes(trip))
    const showDelivery = isDriverFitEvaluation || (active && !['delivered', 'completed'].includes(trip))
    const pickup = mapLocations.find((location) => location.id === activeLoad?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === activeLoad?.deliveryLocationId)
    const activeDriverIds = new Set(drivers.map((driver) => driver.id))
    driverMarkerRefs.current.forEach((marker, id) => { if (!activeDriverIds.has(id)) { marker.remove(); driverMarkerRefs.current.delete(id); markerRecords.current = markerRecords.current.filter((record) => record.marker !== marker) } })
    drivers.forEach((driver) => {
      const existingDriverMarker = driverMarkerRefs.current.get(driver.id)
      if (existingDriverMarker) {
        const existingElement = existingDriverMarker.getElement?.()
        if (existingElement?.isConnected) return
        existingDriverMarker.remove()
        driverMarkerRefs.current.delete(driver.id)
        markerRecords.current = markerRecords.current.filter((record) => record.marker !== existingDriverMarker)
      }
      const home = mapLocations.find((location) => location.id === driver.homeBaseLocationId)
      const position = runtimePositions[driver.id] || home
      if (!position) return
      const element = document.createElement('div'); element.className = 'game-marker driver'; element.textContent = driver.name?.charAt(0)?.toUpperCase() || 'D'
      const popup = new Popup({ offset: 20 }).setDOMContent(document.createElement('div'))
      const marker = new Marker({ element }).setLngLat([position.longitude, position.latitude]).setPopup(popup).addTo(map)
      let driverAutoCloseTimer = null
      popup.on('open', () => {
        element.classList.add('popup-open')
        if (driverAutoCloseTimer) clearTimeout(driverAutoCloseTimer)
        driverAutoCloseTimer = setTimeout(() => {
          if (popup.isOpen()) popup.remove()
        }, 2200)
      })
      popup.on('close', () => {
        if (driverAutoCloseTimer) {
          clearTimeout(driverAutoCloseTimer)
          driverAutoCloseTimer = null
        }
        element.classList.remove('popup-open')
      })
      driverMarkerRefs.current.set(driver.id, marker); markerRecords.current.push({ location: { id: driver.id, name: driver.name, type: 'driver' }, marker, markerElement: element, popup })
    })
    if (showPickup && pickup) createLocationMarker(pickup, pickupMarkerRef, 'pickup')
    else removeLocationMarker(pickupMarkerRef)
    if (showDelivery && delivery) createLocationMarker(delivery, deliveryMarkerRef, 'delivery')
    else removeLocationMarker(deliveryMarkerRef)
    const deliveryRecord = markerRecords.current.find(({ marker }) => marker === deliveryMarkerRef.current)
    if (deliveryRecord) deliveryRecord.markerElement.style.pointerEvents = ['checked-in-delivery', 'unloading-delivery', 'awaiting-pod'].includes(trip) ? 'none' : ''
    logDocOsState({ isDriverFitEvaluation, hasActiveAcceptedLoad: active, showPickupMarker: showPickup, showDeliveryMarker: showDelivery, pickupMarkerExists: Boolean(pickupMarkerRef.current), deliveryMarkerExists: Boolean(deliveryMarkerRef.current) })
  }, [mapReady, markerRefreshToken, drivers, runtimePositions, assignedLoad?.id, assignedLoad?.assignedDriverId, assignedLoad?.tripStatus, assignedLoad?.pickupLocationId, assignedLoad?.deliveryLocationId, routeFocusMode, routeReviewLoad?.id, routeReviewLoad?.pickupLocationId, routeReviewLoad?.deliveryLocationId, isDriverFitEvaluation, evaluationLoad?.id])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    freightBrowseMarkerRefs.current.forEach((marker) => marker.remove())
    freightBrowseMarkerRefs.current.clear()
    freightBrowseDeliveryMarkerRef.current?.remove()
    freightBrowseDeliveryMarkerRef.current = null

    if (!freightBrowseMode) return

    freightBrowseLoads.forEach((load) => {
      const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
      if (!pickup) return
      const element = document.createElement('button')
      element.type = 'button'
      element.className = `freight-main-map-pin ${freightBrowseSelectedLoadId === load.id ? 'selected' : ''}`
      element.setAttribute('aria-label', `${load.loadNumber || load.id} pickup at ${pickup.name}`)
      const pin = document.createElement('span')
      // FreightLink browse mode uses the exact same facility marker language as
      // the operational map. Browse mode changes meaning/context, not icon design.
      pin.className = 'game-marker pickup'
      pin.textContent = 'P'
      const label = document.createElement('small')
      label.textContent = load.loadNumber || load.id
      element.append(pin, label)
      element.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        onFreightBrowseSelect?.(load.id)
      }
      const marker = new Marker({ element }).setLngLat([pickup.longitude, pickup.latitude]).addTo(map)
      freightBrowseMarkerRefs.current.set(load.id, marker)
    })

    const selected = freightBrowseLoads.find((load) => load.id === freightBrowseSelectedLoadId)
    const delivery = mapLocations.find((location) => location.id === selected?.deliveryLocationId)
    if (delivery) {
      const element = document.createElement('div')
      // Reuse the operational delivery marker instead of maintaining a second
      // FreightLink-only pin design.
      element.className = 'game-marker delivery freight-main-map-delivery-pin'
      element.textContent = 'D'
      freightBrowseDeliveryMarkerRef.current = new Marker({ element }).setLngLat([delivery.longitude, delivery.latitude]).addTo(map)
    }

    if (!freightBrowseSelectedLoadId && freightBrowseLoads.length) {
      const points = freightBrowseLoads
        .map((load) => mapLocations.find((location) => location.id === load.pickupLocationId))
        .filter(Boolean)
      if (points.length) {
        const lngs = points.map((point) => point.longitude)
        const lats = points.map((point) => point.latitude)
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 70, maxZoom: 11, duration: 420 })
      }
    }
  }, [mapReady, freightBrowseMode, freightBrowseLoads, freightBrowseSelectedLoadId, onFreightBrowseSelect])

  useEffect(() => {
    let retryTimer = null
    let settleTimer = null

    const rebuildOperationalMarkers = () => {
      const map = mapRef.current
      if (!map) return

      // iOS/WebView can keep the MapLibre canvas/route layer while detaching or
      // invalidating DOM-backed markers. Treat marker DOM as disposable and
      // recreate it from game state whenever the game becomes visible again.
      pickupMarkerRef.current?.remove()
      deliveryMarkerRef.current?.remove()
      pickupMarkerRef.current = null
      deliveryMarkerRef.current = null
      driverMarkerRefs.current.forEach((marker) => marker.remove())
      driverMarkerRefs.current.clear()
      markerRecords.current = markerRecords.current.filter(({ location }) => location?.type === 'freight-browse')

      map.resize()
      setMarkerRefreshToken((value) => value + 1)
    }

    const refreshMarkers = () => {
      if (document.visibilityState === 'hidden') return
      rebuildOperationalMarkers()

      // Capacitor/WKWebView resume can finish layout/style hydration one or two
      // frames after visibilitychange/pageshow. Retry after layout settles so a
      // single race cannot strand the route without its markers.
      window.clearTimeout(retryTimer)
      window.clearTimeout(settleTimer)
      retryTimer = window.setTimeout(rebuildOperationalMarkers, 90)
      settleTimer = window.setTimeout(rebuildOperationalMarkers, 360)
    }

    document.addEventListener('visibilitychange', refreshMarkers)
    window.addEventListener('pageshow', refreshMarkers)
    window.addEventListener('focus', refreshMarkers)
    return () => {
      window.clearTimeout(retryTimer)
      window.clearTimeout(settleTimer)
      document.removeEventListener('visibilitychange', refreshMarkers)
      window.removeEventListener('pageshow', refreshMarkers)
      window.removeEventListener('focus', refreshMarkers)
    }
  }, [])

  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [-73.9857, 40.7484],
      zoom: 10,
      attributionControl: false,
    })
    mapRef.current = map
    // Map attribution is surfaced in the Operations drawer so it remains accessible
    // without competing with the primary map HUD.
    map.resize()

    const markers = []
    map.on('load', () => {
      if (!cameraInitialized.current) {
      const initialRoute = activeRouteGeometry?.length ? { routeShape: activeRouteGeometry } : null
      if (initialRoute) {
        map.addSource('active-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: initialRoute.routeShape } } })
        map.addLayer({ id: 'active-route-line', type: 'line', source: 'active-route', paint: { 'line-color': '#756D80', 'line-width': 4 }, layout: { 'line-join': 'round', 'line-cap': 'round' } })
      }
      setMapReady(true)
        cameraInitialized.current = true
      }
    })

    return () => {
      markers.forEach((marker) => marker.remove())
      driverMarkerRefs.current.forEach((marker) => marker.remove())
      driverMarkerRefs.current.clear()
      freightBrowseMarkerRefs.current.forEach((marker) => marker.remove())
      freightBrowseMarkerRefs.current.clear()
      freightBrowseDeliveryMarkerRef.current?.remove()
      freightBrowseDeliveryMarkerRef.current = null
      pickupMarkerRef.current?.remove()
      deliveryMarkerRef.current?.remove()
      pickupMarkerRef.current = null
      deliveryMarkerRef.current = null
      markerRecords.current = []
      map.remove()
    }
  }, [])

  useEffect(() => {
    if (!routeFocusMode) return
    driverMarkerRefs.current.forEach((marker) => {
      const popup = marker.getPopup?.()
      if (popup?.isOpen()) popup.remove()
    })
  }, [routeFocusMode])

  useEffect(() => {
    if (!driverFocusRequest || !mapReady) return
    const map = mapRef.current
    const marker = driverMarkerRefs.current.get(driverFocusId)
    if (!map || !marker) return
    const lngLat = marker.getLngLat()
    map.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(map.getZoom(), 11.2), duration: 420 })
    const pickupInteractionStates = new Set(['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'])
    if (pickupInteractionStates.has(assignedLoad?.tripStatus)) return
    window.setTimeout(() => {
      if (!marker.getPopup()?.isOpen()) marker.togglePopup()
    }, 440)
  }, [driverFocusRequest, driverFocusId, mapReady, assignedLoad?.tripStatus])


  useEffect(() => {
    if (!['en-route-pickup', 'en-route-delivery'].includes(tripStatus)) {
      travelCameraKey.current = null
      return
    }
    const map = mapRef.current
    if (!map || !mapReady || !runtimeRoute?.length || runtimeRoute.length < 2 || !assignedLoad) return
    const departureMinute = tripStatus === 'en-route-pickup'
      ? assignedLoad.departureGameMinute
      : assignedLoad.deliveryDepartureGameMinute
    const key = `${assignedLoad.id}:${tripStatus}:${departureMinute ?? 'departed'}`
    if (travelCameraKey.current === key) return

    const lngs = runtimeRoute.map((point) => point[0]).filter(Number.isFinite)
    const lats = runtimeRoute.map((point) => point[1]).filter(Number.isFinite)
    if (!lngs.length || !lats.length) return

    travelCameraKey.current = key
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      {
        padding: { top: 125, right: 42, bottom: 155, left: 42 },
        maxZoom: 10.85,
        duration: 650,
      },
    )
  }, [tripStatus, assignedLoad?.id, assignedLoad?.departureGameMinute, assignedLoad?.deliveryDepartureGameMinute, runtimeRoute, mapReady])

  useEffect(() => {
    if (!['en-route-pickup', 'en-route-delivery'].includes(tripStatus)) return undefined
    const timeout = window.setTimeout(() => {
      const marker = driverMarkerRefs.current.get('marcus')
      const popup = marker?.getPopup?.()
      if (popup?.isOpen()) popup.remove()
    }, 1800)
    return () => window.clearTimeout(timeout)
  }, [tripStatus, assignedLoad?.id])

  useEffect(() => {
    if (!facilityFocusRequest || !mapReady || !facilityFocusRole) return
    const map = mapRef.current
    if (!map) return

    // Camera ownership rule:
    // Facilities only own the camera once Marcus is physically at that facility.
    // Before arrival (assigned, planned, en route, loaded/route-ready), the driver
    // remains the operational focus. This prevents stale/early facility navigation
    // from pulling the camera away from Marcus.
    const pickupOwnedStates = new Set(['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'])
    const deliveryOwnedStates = new Set(['at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod'])
    const facilityOwnsCamera = facilityFocusRole === 'pickup'
      ? pickupOwnedStates.has(assignedLoad?.tripStatus)
      : deliveryOwnedStates.has(assignedLoad?.tripStatus)

    if (!facilityOwnsCamera) {
      const driverMarker = driverMarkerRefs.current.get(driverFocusId || 'marcus') || driverMarkerRefs.current.get('marcus')
      if (!driverMarker) return
      const lngLat = driverMarker.getLngLat()
      map.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(map.getZoom(), 10.9), duration: 420 })
      return
    }

    const marker = facilityFocusRole === 'pickup' ? pickupMarkerRef.current : deliveryMarkerRef.current
    if (!marker) return
    const lngLat = marker.getLngLat()
    map.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(map.getZoom(), 11.2), duration: 420 })
    window.setTimeout(() => {
      if (!marker.getPopup()?.isOpen()) marker.togglePopup()
    }, 440)
  }, [facilityFocusRequest, facilityFocusRole, mapReady, assignedLoad?.tripStatus, driverFocusId])

  useEffect(() => {
    // If the load transitions back into a driver-owned state, close any facility
    // popup that may have been left open from a prior tap/navigation request.
    const facilityOwnedStates = new Set([
      'at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup',
      'at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod',
    ])
    if (facilityOwnedStates.has(assignedLoad?.tripStatus)) return
    ;[pickupMarkerRef.current, deliveryMarkerRef.current].forEach((marker) => {
      const popup = marker?.getPopup?.()
      if (popup?.isOpen()) popup.remove()
    })
  }, [assignedLoad?.tripStatus, assignedLoad?.id])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const route = activeRouteGeometry?.length ? { routeShape: activeRouteGeometry } : null
    const source = map.getSource('active-route')
    if (!source) {
      if (!route) return
      map.addSource('active-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.routeShape } } })
      map.addLayer({ id: 'active-route-line', type: 'line', source: 'active-route', paint: { 'line-color': '#756D80', 'line-width': 4 }, layout: { 'line-join': 'round', 'line-cap': 'round' } })
    } else if (route) source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.routeShape } })
    else if (!['en-route-pickup', 'en-route-delivery'].includes(tripStatus)) source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } })

    if (map.getLayer('active-route-line')) {
      map.setPaintProperty('active-route-line', 'line-color', isDriverFitEvaluation ? '#756D80' : '#756D80')
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
        ? { top: 68, right: 22, bottom: 285, left: 22 }
        : { top: 68, right: 22, bottom: 245, left: 22 },
      maxZoom: 11.35,
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
      if (['at-pickup', 'checking-in-pickup'].includes(popupLoad.tripStatus)) {
        const status = document.createElement('span')
        status.textContent = 'Marcus is checking in and getting the pickup paperwork.'
        content.append(status)
      } else if (popupLoad.tripStatus === 'waiting-at-pickup') {
        const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
        const waitedMinutes = Number.isFinite(popupLoad.pickupCheckInGameMinute)
          ? Math.max(0, now - popupLoad.pickupCheckInGameMinute)
          : 0
        const remaining = Number.isFinite(popupLoad.pickupDockReadyGameMinute)
          ? Math.max(0, popupLoad.pickupDockReadyGameMinute - now)
          : null
        const wait = document.createElement('span')
        wait.textContent = remaining === null
          ? `Waiting for dock · ${waitedMinutes} min`
          : `Waiting for dock · estimated ${remaining} min`
        content.append(wait)
      } else if (popupLoad.tripStatus === 'checked-in-pickup') {
        const ready = document.createElement('span')
        ready.textContent = 'Dock ready · staged freight available'
        const beginLoading = document.createElement('button')
        beginLoading.type = 'button'
        beginLoading.className = 'docos-driver-popup-action'
        beginLoading.textContent = 'BEGIN LOADING'
        beginLoading.onclick = () => {
          pickupRecord.popup.remove()
          onDriverAction?.('BEGIN_LOADING', popupLoad.id, popupLoad.assignedDriverId || 'marcus')
        }
        content.append(ready, beginLoading)
      }
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
      if (popupLoad.tripStatus === 'at-delivery') {
        const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
        const waitedMinutes = Number.isFinite(popupLoad.deliveryArrivalGameMinute)
          ? Math.max(0, now - popupLoad.deliveryArrivalGameMinute)
          : 0
        const wait = document.createElement('span')
        wait.textContent = `Waiting: ${waitedMinutes} min`
        const checkIn = document.createElement('button')
        checkIn.type = 'button'
        checkIn.className = 'docos-driver-popup-action'
        checkIn.textContent = 'CHECK IN'
        checkIn.onclick = () => {
          deliveryRecord.popup.remove()
          onDriverAction?.('CHECK_IN', popupLoad.id, popupLoad.assignedDriverId || 'marcus')
        }
        content.append(wait, checkIn)
      }
      deliveryRecord.popup.setDOMContent(content)
    }
    const marcus = getDriver()
    const record = markerRecords.current.find(({ location }) => location.id === 'marcus')
    if (!marcus || !record) return

    const pickupInteractionStates = new Set(['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'])
    const deliveryInteractionStates = new Set(['at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod'])
    const driverAtPickup = pickupInteractionStates.has(assignedLoad?.tripStatus)
    const driverAtDelivery = deliveryInteractionStates.has(assignedLoad?.tripStatus)
    const suppressDriverPopup = driverAtPickup || driverAtDelivery
    if (suppressDriverPopup && record.popup.isOpen()) record.popup.remove()
    record.markerElement.style.pointerEvents = suppressDriverPopup ? 'none' : ''
    record.markerElement.classList.toggle('unavailable', marcus.status === 'unavailable')
    record.markerElement.classList.toggle('tutorial-target', tutorialEnabled && tutorialDriverAction && !record.popup.isOpen() && !suppressDriverPopup)
    record.markerElement.classList.toggle('attention', false)
    if (suppressDriverPopup) return
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
        const pillTone = model.operationalState === 'TRIP_PLANNED' ? 'ready' : ['BRIEFING_REQUIRED', 'WAITING_DELIVERY'].includes(model.operationalState) ? 'attention' : 'neutral'
        popupContent.append(buildHeader(model.driverName || marcus.fullName || record.location.name, model.roleLabel || 'Driver', model.statusLabel?.toUpperCase(), pillTone))

        const queuedLoads = getDriverQueue(loads, 'marcus')
        if (queuedLoads.length) {
          const nextPlanned = buildMetaRow('NEXT ASSIGNMENT', `${queuedLoads[0].id}${queuedLoads.length > 1 ? `  +${queuedLoads.length - 1}` : ''}`)
          if (nextPlanned) popupContent.append(nextPlanned)
        }

        if (['ASSIGNED', 'BRIEFING_REQUIRED', 'TRIP_PLANNED'].includes(model.operationalState)) {
          // Quick map action: identity + status + primary action only.
        } else if (model.operationalState === 'EN_ROUTE_PICKUP' || model.operationalState === 'EN_ROUTE_DELIVERY') {
          popupContent.classList.add('enroute-label')
          const label = document.createElement('div')
          label.className = 'docos-driver-enroute-label'
          const status = document.createElement('strong')
          status.textContent = model.statusLabel?.toUpperCase() || 'EN ROUTE'
          const detail = document.createElement('span')
          detail.textContent = `${loads.find((item) => item.id === model.loadId)?.loadNumber || model.loadId} · ETA ${model.eta || '—'}`
          label.append(status, detail)
          popupContent.replaceChildren(label)
        } else {
          const loadRow = buildMetaRow('CURRENT LOAD', loads.find((item) => item.id === model.loadId)?.loadNumber || model.loadId)
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
  }, [drivers, loads, carriers, assignedLoad, routeReviewLoad, routeFocusMode, evaluationLoad, isDriverFitEvaluation, onDriverAction, suppressAttention, gameTime, runtimeProgress, runtimePositions, tutorialEnabled, tutorialDriverAction])

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
    if (!record) return
    let pill = record.markerElement.querySelector('.driver-status-pill')
    if (!pill) { pill = document.createElement('span'); pill.className = 'driver-status-pill'; record.markerElement.append(pill) }
    // A completed load is removed from Marcus immediately after POD approval.
    // Clear any DOM text left by the previous active load instead of returning
    // early and leaving a stale "POD READY" pill on an available driver.
    if (!assignedLoad) {
      pill.textContent = ''
      return
    }
    const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
    if (facilityPopupOpen) pill.textContent = ''
    else if (assignedLoad.tripStatus === 'checking-in-pickup') {
      pill.textContent = 'CHECKING IN'
    }
    else if (assignedLoad.tripStatus === 'waiting-at-pickup') {
      const remainingMinutes = Number.isFinite(assignedLoad.pickupDockReadyGameMinute)
        ? Math.max(0, assignedLoad.pickupDockReadyGameMinute - now)
        : null
      pill.textContent = Number.isFinite(remainingMinutes)
        ? `WAITING FOR DOCK • ${remainingMinutes} MIN ETA`
        : 'WAITING FOR DOCK'
    }
    else if (assignedLoad.tripStatus === 'checked-in-pickup' && !suppressAttention) pill.textContent = 'DOCK READY'
    else if (assignedLoad.tripStatus === 'loading-at-pickup') {
      const loadingMinutes = Number.isFinite(assignedLoad.loadingStartGameMinute)
        ? Math.max(0, now - assignedLoad.loadingStartGameMinute)
        : 0
      pill.textContent = `LOADING • ${loadingMinutes} MIN`
    }
    else if (assignedLoad.tripStatus === 'assigned' && assignedLoad.planningStatus === 'route-ready' && !suppressAttention) pill.textContent = Number.isFinite(assignedLoad.pickupDriverBriefedGameMinute) ? 'READY FOR DISPATCH' : 'DRIVER UPDATE REQUIRED'
    else if (assignedLoad.tripStatus === 'at-delivery' && !suppressAttention) pill.textContent = 'WAITING AT DELIVERY'
    else if (assignedLoad.tripStatus === 'unloading-delivery' && !suppressAttention) pill.textContent = `UNLOADING • ${Math.max(0, DELIVERY_UNLOAD_DURATION_MINUTES - (now - assignedLoad.deliveryUnloadStartGameMinute))} MIN`
    else if (assignedLoad.tripStatus === 'awaiting-pod' && !suppressAttention) pill.textContent = 'POD READY'
    else if (assignedLoad.tripStatus === 'loaded' && !suppressAttention) pill.textContent = assignedLoad.deliveryPlanningStatus === 'route-ready' ? 'READY FOR DISPATCH' : 'LOADED'
    else if (assignedLoad.tripStatus === 'loaded') pill.textContent = ''
    else pill.textContent = ''
  }, [assignedLoad, gameTime, suppressAttention, facilityPopupOpen])

  return <div ref={mapContainer} className="game-map" />
}

export default GameMap
