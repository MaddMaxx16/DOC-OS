import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapLocations from '../data/mapLocations.js'
import { DELIVERY_UNLOAD_DURATION_MINUTES } from '../data/pickupConfig.js'
import { formatAppointment } from '../utils/gameTime.js'
import { logDocOsState } from '../utils/debugLogger.js'
import { getDriverPanelModel } from '../utils/driverOperationalState.js'

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

function GameMap({ driverFocusRequest = 0, driverFocusId = null, facilityFocusRequest = 0, facilityFocusRole = null, drivers, loads = [], carriers = [], activeRouteGeometry, routeFocusMode = null, routeReviewLoad = null, tripStatus, onDriverAction, assignedLoad, runtimePositions, runtimeProgressByDriver = {}, gameTime, suppressAttention, isDriverFitEvaluation = false, evaluationLoad, freightBrowseMode = false, freightBrowseLoads = [], freightBrowseSelectedLoadId = null, onFreightBrowseSelect }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRecords = useRef([])
  const animationFrame = useRef(null)
  const idleAnimationFrame = useRef(null)
  const visualProgress = useRef(null)
  const cameraInitialized = useRef(false)
  const activeTravelKey = useRef(null)
  const travelCameraKey = useRef(null)
  const pickupMarkerRef = useRef(null)
  const deliveryMarkerRef = useRef(null)
  const driverMarkerRefs = useRef(new Map())
  const driverLabelRevealTimers = useRef(new Map())
  const yardMarkerRefs = useRef(new Map())
  const freightBrowseMarkerRefs = useRef(new Map())
  const freightBrowseDeliveryMarkerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [markerRefreshToken, setMarkerRefreshToken] = useState(0)
  const [facilityPopupOpen, setFacilityPopupOpen] = useState(false)
  const runtimeRoute = assignedLoad?.tripStatus === 'en-route-delivery' ? assignedLoad.plannedLoadedRouteGeometry : assignedLoad?.tripStatus === 'en-route-pickup' ? assignedLoad.plannedDeadheadRouteGeometry : null

  const getDriver = (driverId) => drivers.find((driver) => driver.id === driverId)
  const removeLocationMarker = (ref) => {
    const marker = ref.current
    if (!marker) return
    markerRecords.current = markerRecords.current.filter((record) => record.marker !== marker)
    marker.remove()
    ref.current = null
  }

  useEffect(() => {
    // AV: marker movement is keyed by driver. Runtime positions are authoritative;
    // this tween only smooths visual updates between simulation ticks.
    if (!mapReady) return undefined
    const frames = []
    drivers.forEach((driver) => {
      const marker = driverMarkerRefs.current.get(driver.id)
      const position = runtimePositions?.[driver.id]
      if (!marker || !position) return
      const from = marker.getLngLat()
      const begin = performance.now()
      const duration = 900
      const animate = (now) => {
        const t = Math.min(1, (now - begin) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        marker.setLngLat([
          from.lng + (position.longitude - from.lng) * eased,
          from.lat + (position.latitude - from.lat) * eased,
        ])
        if (t < 1) frames.push(requestAnimationFrame(animate))
      }
      frames.push(requestAnimationFrame(animate))
    })
    return () => frames.forEach((id) => cancelAnimationFrame(id))
  }, [runtimePositions, drivers, mapReady])

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
    const showPickup = isDriverFitEvaluation || (active && !['loaded', 'en-route-delivery', 'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod', 'delivered', 'completed'].includes(trip))
    const showDelivery = isDriverFitEvaluation || (active && !['delivered', 'completed'].includes(trip))
    const pickup = mapLocations.find((location) => location.id === activeLoad?.pickupLocationId)
    const delivery = mapLocations.find((location) => location.id === activeLoad?.deliveryLocationId)
    const activeYardIds = new Set()
    carriers.filter((carrier) => carrier.status === 'active' && carrier.homeBaseLocationId).forEach((carrier) => {
      const yard = mapLocations.find((location) => location.id === carrier.homeBaseLocationId)
      if (!yard) return
      activeYardIds.add(yard.id)
      if (yardMarkerRefs.current.has(yard.id)) return
      const element = document.createElement('div')
      element.className = 'game-marker carrier-yard'
      element.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.2 12 4l8.5 6.2v9.3h-3.2v-6.1H6.7v6.1H3.5v-9.3Z"/><path d="M8.2 15.1h7.6v1.8H8.2zM8.2 18h7.6v1.5H8.2z"/></svg>'
      element.setAttribute('aria-label', `${carrier.name || 'Carrier'} home base · ${yard.name}`)
      element.title = `${carrier.name || 'Carrier'} · ${yard.name}`
      const marker = new Marker({ element }).setLngLat([yard.longitude, yard.latitude]).addTo(map)
      yardMarkerRefs.current.set(yard.id, marker)
    })
    yardMarkerRefs.current.forEach((marker, id) => {
      if (!activeYardIds.has(id)) { marker.remove(); yardMarkerRefs.current.delete(id) }
    })

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
      element.setAttribute('aria-label', `${driver.fullName || driver.name || 'Driver'} map position`)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        element.classList.add('status-revealed')
        const existingTimer = driverLabelRevealTimers.current.get(driver.id)
        if (existingTimer) window.clearTimeout(existingTimer)
        const timer = window.setTimeout(() => {
          element.classList.remove('status-revealed')
          driverLabelRevealTimers.current.delete(driver.id)
          setMarkerRefreshToken((value) => value + 1)
        }, 3200)
        driverLabelRevealTimers.current.set(driver.id, timer)
        setMarkerRefreshToken((value) => value + 1)
      })
      const marker = new Marker({ element }).setLngLat([position.longitude, position.latitude]).addTo(map)
      driverMarkerRefs.current.set(driver.id, marker); markerRecords.current.push({ location: { id: driver.id, name: driver.name, type: 'driver' }, marker, markerElement: element, popup: null })
    })
    if (showPickup && pickup) createLocationMarker(pickup, pickupMarkerRef, 'pickup')
    else removeLocationMarker(pickupMarkerRef)
    if (showDelivery && delivery) createLocationMarker(delivery, deliveryMarkerRef, 'delivery')
    else removeLocationMarker(deliveryMarkerRef)
    const deliveryRecord = markerRecords.current.find(({ marker }) => marker === deliveryMarkerRef.current)
    if (deliveryRecord) deliveryRecord.markerElement.style.pointerEvents = ''
    logDocOsState({ isDriverFitEvaluation, hasActiveAcceptedLoad: active, showPickupMarker: showPickup, showDeliveryMarker: showDelivery, pickupMarkerExists: Boolean(pickupMarkerRef.current), deliveryMarkerExists: Boolean(deliveryMarkerRef.current) })
  }, [mapReady, markerRefreshToken, drivers, runtimePositions, assignedLoad?.id, assignedLoad?.assignedDriverId, assignedLoad?.tripStatus, assignedLoad?.pickupLocationId, assignedLoad?.deliveryLocationId, routeFocusMode, routeReviewLoad?.id, routeReviewLoad?.pickupLocationId, routeReviewLoad?.deliveryLocationId, isDriverFitEvaluation, evaluationLoad?.id, carriers])

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

    // AV2.3.3: delivery planning already showed the full route. On departure,
    // preserve spatial continuity at the pickup instead of snapping the camera
    // across the entire pickup→delivery corridor again.
    if (tripStatus === 'en-route-delivery') {
      const driverMarker = driverMarkerRefs.current.get(assignedLoad.assignedDriverId)
      const driverLngLat = driverMarker?.getLngLat?.()
      if (driverLngLat) {
        map.easeTo({ center: [driverLngLat.lng, driverLngLat.lat], zoom: Math.max(map.getZoom(), 10.9), duration: 320 })
        return
      }
    }

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
    if (!facilityFocusRequest || !mapReady || !facilityFocusRole) return
    const map = mapRef.current
    if (!map) return

    // Camera ownership rule:
    // Facilities only own the camera once Marcus is physically at that facility.
    // Before arrival (assigned, planned, en route, loaded/route-ready), the driver
    // remains the operational focus. This prevents stale/early facility navigation
    // from pulling the camera away from Marcus.
    const pickupOwnedStates = new Set(['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'])
    const deliveryOwnedStates = new Set(['at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod'])
    const facilityOwnsCamera = facilityFocusRole === 'pickup'
      ? pickupOwnedStates.has(assignedLoad?.tripStatus)
      : deliveryOwnedStates.has(assignedLoad?.tripStatus)

    if (!facilityOwnsCamera) {
      const driverMarker = driverMarkerRefs.current.get(driverFocusId) || driverMarkerRefs.current.values().next().value
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
      'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod',
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
        status.textContent = `${drivers.find((driver) => driver.id === popupLoad.assignedDriverId)?.name || 'Driver'} is checking in and getting the pickup paperwork.`
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
          onDriverAction?.('BEGIN_LOADING', popupLoad.id, popupLoad.assignedDriverId || null)
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
      if (['at-delivery', 'checking-in-delivery'].includes(popupLoad.tripStatus)) {
        const status = document.createElement('span')
        status.textContent = `${drivers.find((driver) => driver.id === popupLoad.assignedDriverId)?.name || 'Driver'} is checking in with the receiver and handling the delivery paperwork.`
        content.append(status)
      } else if (popupLoad.tripStatus === 'waiting-at-delivery') {
        const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
        const waitedMinutes = Number.isFinite(popupLoad.deliveryCheckInGameMinute)
          ? Math.max(0, now - popupLoad.deliveryCheckInGameMinute)
          : 0
        const remaining = Number.isFinite(popupLoad.deliveryDockReadyGameMinute)
          ? Math.max(0, popupLoad.deliveryDockReadyGameMinute - now)
          : null
        const wait = document.createElement('span')
        wait.textContent = remaining === null
          ? `Waiting for dock · ${waitedMinutes} min`
          : `Waiting for dock · estimated ${remaining} min`
        content.append(wait)
      } else if (popupLoad.tripStatus === 'checked-in-delivery') {
        const ready = document.createElement('span')
        ready.textContent = 'Dock ready · receiver is ready to unload'
        const beginUnloading = document.createElement('button')
        beginUnloading.type = 'button'
        beginUnloading.className = 'docos-driver-popup-action'
        beginUnloading.textContent = 'BEGIN UNLOADING'
        beginUnloading.onclick = () => {
          deliveryRecord.popup.remove()
          onDriverAction?.('BEGIN_UNLOADING', popupLoad.id, popupLoad.assignedDriverId || null)
        }
        content.append(ready, beginUnloading)
      } else if (popupLoad.tripStatus === 'unloading-delivery') {
        const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
        const remaining = Number.isFinite(popupLoad.deliveryUnloadStartGameMinute)
          ? Math.max(0, DELIVERY_UNLOAD_DURATION_MINUTES - (now - popupLoad.deliveryUnloadStartGameMinute))
          : DELIVERY_UNLOAD_DURATION_MINUTES
        const status = document.createElement('span')
        status.textContent = `Unloading in progress · ${remaining} min remaining`
        content.append(status)
      }
      deliveryRecord.popup.setDOMContent(content)
    }
    // AV: every driver marker derives its own status from its own active load.
    drivers.forEach((driver) => {
      const marker = driverMarkerRefs.current.get(driver.id)
      const element = marker?.getElement?.()
      if (!marker || !element) return
      const driverLoad = loads.find((load) => load.assignedDriverId === driver.id && load.tripStatus !== 'queued' && !['delivered', 'completed'].includes(load.tripStatus)) || null
      element.style.pointerEvents = ''
      element.classList.toggle('unavailable', driver.status === 'unavailable')
      element.classList.toggle('attention', false)
      let pill = element.querySelector('.driver-status-pill')
      if (!pill) { pill = document.createElement('span'); pill.className = 'driver-status-pill'; element.append(pill) }
      element.classList.remove('waiting-progress')
      element.style.removeProperty('--wait-progress')
      if (!driverLoad) { pill.textContent = driver.idleRouteStatus === 'traveling' ? 'RETURNING TO YARD' : ''; return }
      const pickup = mapLocations.find((location) => location.id === driverLoad.pickupLocationId)
      const delivery = mapLocations.find((location) => location.id === driverLoad.deliveryLocationId)
      const panel = getDriverPanelModel({ driver, assignedLoad: driverLoad, gameTime, runtimeProgress: runtimeProgressByDriver?.[driver.id] ?? 0, pickup, delivery })
      const now = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
      const setWaitRing = (startMinute, endMinute) => {
        const total = Number.isFinite(startMinute) && Number.isFinite(endMinute) ? Math.max(1, endMinute - startMinute) : null
        const elapsed = total ? Math.max(0, Math.min(total, now - startMinute)) : 0
        const progress = total ? Math.round((elapsed / total) * 360) : 0
        element.classList.add('waiting-progress')
        element.style.setProperty('--wait-progress', `${progress}deg`)
      }
      if (driverLoad.tripStatus === 'waiting-at-pickup') setWaitRing(driverLoad.pickupCheckInGameMinute, driverLoad.pickupDockReadyGameMinute)
      if (driverLoad.tripStatus === 'waiting-at-delivery') setWaitRing(driverLoad.deliveryCheckInGameMinute, driverLoad.deliveryDockReadyGameMinute)
      const transientEnRoute = ['EN_ROUTE_PICKUP', 'EN_ROUTE_DELIVERY'].includes(panel?.operationalState)
      const revealedLabel = transientEnRoute && !element.classList.contains('status-revealed') ? '' : (panel?.mapLabel || '')
      pill.textContent = suppressAttention && panel?.attentionRequired ? '' : revealedLabel
      if (!pill.textContent && driverLoad.tripStatus === 'loaded' && !suppressAttention) pill.textContent = driverLoad.deliveryPlanningStatus === 'route-ready' ? 'ROUTE READY · SEND ROUTE' : 'LOADED'
      if (!pill.textContent && driverLoad.tripStatus === 'awaiting-pod' && !suppressAttention) pill.textContent = 'POD READY'
    })

    const pickupNeedsAttention = assignedLoad?.tripStatus === 'checked-in-pickup' && !suppressAttention
    const deliveryNeedsAttention = assignedLoad?.tripStatus === 'checked-in-delivery' && !suppressAttention
    pickupRecord?.markerElement?.classList.toggle('attention', pickupNeedsAttention)
    deliveryRecord?.markerElement?.classList.toggle('attention', deliveryNeedsAttention)
  }, [drivers, loads, carriers, assignedLoad, routeReviewLoad, routeFocusMode, evaluationLoad, isDriverFitEvaluation, onDriverAction, suppressAttention, gameTime, runtimeProgressByDriver, runtimePositions, facilityPopupOpen])

  return <div ref={mapContainer} className="game-map" />
}

export default GameMap
