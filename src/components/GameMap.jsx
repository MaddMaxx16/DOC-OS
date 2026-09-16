import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapLocations from '../data/mapLocations.js'
import { getFreightRouteName } from '../utils/freightIdentity.js'
import { DELIVERY_UNLOAD_DURATION_MINUTES } from '../data/pickupConfig.js'
import { formatAppointment } from '../utils/gameTime.js'
import { logDocOsState } from '../utils/debugLogger.js'
import { getDriverPanelModel } from '../utils/driverOperationalState.js'
import { getAuthoritativeDriverTravelLoad, getDriverItineraryState } from '../utils/driverItinerary.js'

setWorkerUrl(workerUrl)

const routeMetricsCache = new WeakMap()
const DRIVER_COLOR_FAMILIES = [
  ['#8BB8F7', '#6EA2E8', '#4F86D4', '#3C6DB8'],
  ['#F0BE69', '#DEA650', '#C98E35', '#A87025'],
  ['#65C3B2', '#4EAC9C', '#3B9385', '#2D776D'],
  ['#C99AE7', '#B27BD5', '#975EC0', '#7948A0'],
  ['#E38EA5', '#CD718C', '#B55375', '#93405E'],
]

function stableHash(value = '') {
  let hash = 0
  for (const char of String(value)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash)
}

function getDriverColorFamily(driverId) {
  return DRIVER_COLOR_FAMILIES[stableHash(driverId) % DRIVER_COLOR_FAMILIES.length]
}

// CS2.0A.1 — facility position authority. While a driver is physically checked
// into a facility, the facility coordinate owns the visual marker. Runtime route
// interpolation regains authority only after the driver departs.
const PICKUP_FACILITY_STATES = new Set([
  'at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup',
  'loading-at-pickup', 'pickup-issue',
])
const DELIVERY_FACILITY_STATES = new Set([
  'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery',
  'unloading-delivery', 'awaiting-pod',
])
const DELIVERY_COMPLETE_STATES = new Set(['awaiting-pod', 'delivered', 'completed'])

function getDriverFacilityPosition(loads = [], driverId) {
  if (!driverId) return null
  const facilityLoad = loads.find((load) => {
    if (load?.assignedDriverId !== driverId) return false
    return PICKUP_FACILITY_STATES.has(load.tripStatus) || DELIVERY_FACILITY_STATES.has(load.tripStatus)
  })
  if (!facilityLoad) return null
  const locationId = PICKUP_FACILITY_STATES.has(facilityLoad.tripStatus)
    ? facilityLoad.pickupLocationId
    : facilityLoad.deliveryLocationId
  const location = mapLocations.find((item) => item.id === locationId)
  return location ? { longitude: location.longitude, latitude: location.latitude } : null
}


function coordinateDistanceMiles(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY
  const aLng = Array.isArray(a) ? Number(a[0]) : Number(a.longitude)
  const aLat = Array.isArray(a) ? Number(a[1]) : Number(a.latitude)
  const bLng = Array.isArray(b) ? Number(b[0]) : Number(b.longitude)
  const bLat = Array.isArray(b) ? Number(b[1]) : Number(b.latitude)
  if (![aLng, aLat, bLng, bLat].every(Number.isFinite)) return Number.POSITIVE_INFINITY
  const toRad = (value) => value * Math.PI / 180
  const earthMiles = 3958.8
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earthMiles * Math.asin(Math.min(1, Math.sqrt(h)))
}

function routeMatchesEndpoints(route, origin, destination, toleranceMiles = 1.5) {
  if (!Array.isArray(route) || route.length < 2 || !origin || !destination) return false
  return coordinateDistanceMiles(route[0], origin) <= toleranceMiles
    && coordinateDistanceMiles(route[route.length - 1], destination) <= toleranceMiles
}

function routeLabelBearing(route, progress = 0.5) {
  const before = routePosition(route, Math.max(0, progress - 0.025))
  const after = routePosition(route, Math.min(1, progress + 0.025))
  if (!before || !after) return 0
  const avgLat = ((before[1] + after[1]) / 2) * Math.PI / 180
  const dx = (after[0] - before[0]) * Math.cos(avgLat)
  const dy = after[1] - before[1]
  let angle = Math.atan2(dy, dx) * 180 / Math.PI
  // Screen y runs downward, so invert geographic bearing for CSS rotation.
  angle = -angle
  while (angle > 180) angle -= 360
  while (angle < -180) angle += 360
  if (angle > 90) angle -= 180
  if (angle < -90) angle += 180
  return angle
}

function getRouteMetrics(route) {
  if (!Array.isArray(route) || route.length < 2) return null
  const cached = routeMetricsCache.get(route)
  if (cached) return cached

  const cumulative = [0]
  let total = 0
  for (let index = 1; index < route.length; index += 1) {
    const a = route[index - 1]
    const b = route[index]
    total += Math.hypot(b[0] - a[0], b[1] - a[1])
    cumulative.push(total)
  }
  const metrics = { cumulative, total }
  routeMetricsCache.set(route, metrics)
  return metrics
}

function routePosition(route, progress) {
  const metrics = getRouteMetrics(route)
  if (!metrics) return null
  if (metrics.total <= 0) return route[0] || null

  const target = metrics.total * Math.max(0, Math.min(1, progress))
  let low = 1
  let high = metrics.cumulative.length - 1
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (metrics.cumulative[mid] < target) low = mid + 1
    else high = mid
  }
  const endIndex = Math.max(1, low)
  const startIndex = endIndex - 1
  const segmentStart = metrics.cumulative[startIndex]
  const segmentLength = metrics.cumulative[endIndex] - segmentStart
  const amount = segmentLength > 0 ? (target - segmentStart) / segmentLength : 0
  const a = route[startIndex]
  const b = route[endIndex]
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount]
}

function GameMap({ boardViewRequest = 0, driverFocusRequest = 0, driverFocusId = null, facilityFocusRequest = 0, facilityFocusRole = null, drivers, loads = [], carriers = [], activeRouteGeometry, routeFocusMode = null, routeReviewLoad = null, tripStatus, onDriverAction, assignedLoad, runtimePositions, runtimeProgressByDriver = {}, simulationSpeed = 1, isGameClockPaused = false, gameTime, suppressAttention, isDriverFitEvaluation = false, evaluationLoad, freightBrowseMode = false, freightBrowseLoads = [], freightBrowseSelectedLoadId = null, onFreightBrowseSelect }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markerRecords = useRef([])
  const animationFrame = useRef(null)
  const idleAnimationFrame = useRef(null)
  const motionStateRef = useRef(null)
  const cameraInitialized = useRef(false)
  const activeTravelKey = useRef(null)
  const travelCameraKey = useRef(null)
  const boardCameraKey = useRef(null)
  const handledBoardViewRequest = useRef(0)
  const handledDriverFocusRequest = useRef(0)
  const handledFacilityFocusRequest = useRef(0)
  const handledRouteFocusKey = useRef(null)
  const handledFreightBrowseFitKey = useRef(null)
  const pickupMarkerRef = useRef(null)
  const deliveryMarkerRef = useRef(null)
  const driverMarkerRefs = useRef(new Map())
  const driverLabelRevealTimers = useRef(new Map())
  const routeInfoPopupRef = useRef({ loadId: null, popup: null })
  const yardMarkerRefs = useRef(new Map())
  const truckStopMarkerRefs = useRef(new Map())
  const freightBrowseMarkerRefs = useRef(new Map())
  const freightBrowseDeliveryMarkerRef = useRef(null)
  const itineraryStopMarkerRefs = useRef(new Map())
  const itineraryRouteLabelRefs = useRef(new Map())
  const [mapReady, setMapReady] = useState(false)
  const [markerRefreshToken, setMarkerRefreshToken] = useState(0)
  const [facilityPopupOpen, setFacilityPopupOpen] = useState(false)
  // AW1 — operational focus. A tapped driver becomes the visual authority on the map.
  const [focusedDriverId, setFocusedDriverId] = useState(null)
  const travelingLoad = drivers.map((driver) => getAuthoritativeDriverTravelLoad(loads, driver.id)).find(Boolean) || null
  const mapOperationalLoad = travelingLoad || assignedLoad || null
  const runtimeRoute = mapOperationalLoad?.tripStatus === 'en-route-delivery' ? mapOperationalLoad.plannedLoadedRouteGeometry : mapOperationalLoad?.tripStatus === 'en-route-pickup' ? mapOperationalLoad.plannedDeadheadRouteGeometry : null
  // B.4.2.4 closure polish: overnight repositioning remains visible as a quiet
  // operational route. Freight travel still owns the strong active-route layer.
  const stagingRouteDriver = !travelingLoad
    ? drivers.find((driver) => driver.idleRouteStatus === 'traveling' && Array.isArray(driver.idleRouteGeometry) && driver.idleRouteGeometry.length >= 2)
    : null
  const stagingRouteGeometry = stagingRouteDriver?.idleRouteGeometry || null
  const isStagingRoute = Boolean(stagingRouteGeometry)
  // CS2.0A.3 — Single Route Authority.
  // During live travel, the route that physically moves the driver is also the
  // only geometry allowed to render as the strong active route. Previously the
  // upstream activeRouteGeometry prop could win even when it belonged to a
  // different assigned/focused load, creating the appearance of two GPS systems.
  const hasAuthoritativeTravelRoute = Boolean(
    travelingLoad
    && ['en-route-pickup', 'en-route-delivery'].includes(travelingLoad.tripStatus)
    && Array.isArray(runtimeRoute)
    && runtimeRoute.length >= 2
  )
  // CS2.0A.10 — active-route is strictly a LIVE travel layer during operations.
  // Once the driver reaches a facility or completes a leg, that geometry must
  // disappear with the stop marker instead of lingering as historical map data.
  // Preview/review modes may still render their explicit route geometry.
  const isExplicitRoutePreview = Boolean(isDriverFitEvaluation || routeFocusMode || routeReviewLoad)
  const resolvedActiveRouteGeometry = hasAuthoritativeTravelRoute
    ? runtimeRoute
    : (isExplicitRoutePreview && activeRouteGeometry?.length
      ? activeRouteGeometry
      : (isStagingRoute ? stagingRouteGeometry : null))

  const getDriver = (driverId) => drivers.find((driver) => driver.id === driverId)
  const removeLocationMarker = (ref) => {
    const marker = ref.current
    if (!marker) return
    markerRecords.current = markerRecords.current.filter((record) => record.marker !== marker)
    marker.remove()
    ref.current = null
  }

  // AV2.5.6: keep the latest simulation inputs in a ref so the animation loop
  // does not restart on game-clock ticks, speed changes, or route progress updates.
  motionStateRef.current = {
    drivers,
    loads,
    runtimePositions,
    runtimeProgressByDriver,
    simulationSpeed,
    isGameClockPaused,
    gameTime,
  }

  // AW1.7.1 — restore the MapLibre mount lifecycle accidentally removed in AW1.7.
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return undefined

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [-73.9857, 40.7484],
      zoom: 10,
      attributionControl: false,
    })
    mapRef.current = map

    map.on('movestart', (event) => {
      console.debug('[CAMERA] MOVE_START', { source: event.originalEvent ? 'USER_GESTURE' : 'PROGRAMMATIC' })
    })

    map.resize()

    map.on('load', () => {
      if (!cameraInitialized.current) {
        const initialRoute = resolvedActiveRouteGeometry?.length ? { routeShape: resolvedActiveRouteGeometry } : null
        if (initialRoute) {
          map.addSource('active-route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: initialRoute.routeShape } },
          })
          map.addLayer({
            id: 'active-route-line',
            type: 'line',
            source: 'active-route',
            paint: {
              'line-color': mapOperationalLoad?.assignedDriverId ? getDriverColorFamily(mapOperationalLoad.assignedDriverId)[0] : '#E4D7EC',
              'line-width': 5.2,
              'line-opacity': 0.96,
              'line-dasharray': mapOperationalLoad?.tripStatus === 'en-route-pickup' ? [2.2, 1.6] : [1, 0.001],
            },
            layout: { 'line-join': 'round', 'line-cap': 'round' },
          })
        }
        cameraInitialized.current = true
      }
      setMapReady(true)
    })

    return () => {
      driverMarkerRefs.current.forEach((marker) => marker.remove())
      driverMarkerRefs.current.clear()
      freightBrowseMarkerRefs.current.forEach((marker) => marker.remove())
      freightBrowseMarkerRefs.current.clear()
      freightBrowseDeliveryMarkerRef.current?.remove()
      freightBrowseDeliveryMarkerRef.current = null
      itineraryStopMarkerRefs.current.forEach((marker) => marker.remove())
      itineraryStopMarkerRefs.current.clear()
      itineraryRouteLabelRefs.current.forEach((marker) => marker.remove())
      itineraryRouteLabelRefs.current.clear()
      pickupMarkerRef.current?.remove()
      deliveryMarkerRef.current?.remove()
      pickupMarkerRef.current = null
      deliveryMarkerRef.current = null
      markerRecords.current = []
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    // AV2.5.6: continuous driver render clock.
    // The simulation remains authoritative for state transitions and arrival.
    // The map marker advances every animation frame using fractional game time
    // between the integer-minute simulation ticks.
    if (!mapReady) return undefined

    let frameId = null
    let lastFrame = performance.now()
    let renderGameMinute = null
    let lastAuthoritativeMinute = null

    const absoluteMinuteFrom = (time) => (time?.gameDayIndex ?? 0) * 1440 + (time?.totalMinutesOfDay ?? 0)

    const render = (now) => {
      const dt = Math.max(0, Math.min(100, now - lastFrame))
      lastFrame = now

      const state = motionStateRef.current || {}
      const currentDrivers = state.drivers || []
      const currentLoads = state.loads || []
      const currentRuntimePositions = state.runtimePositions || {}
      const currentRuntimeProgress = state.runtimeProgressByDriver || {}
      const speed = Math.max(0, Number(state.simulationSpeed) || 0)
      const paused = Boolean(state.isGameClockPaused)
      const authoritativeMinute = absoluteMinuteFrom(state.gameTime)

      if (!Number.isFinite(renderGameMinute)) renderGameMinute = authoritativeMinute

      // Large discontinuities are explicit simulation jumps (resume/dev/day change),
      // not ordinary clock ticks. Snap the visual clock only for those cases.
      if (lastAuthoritativeMinute !== null && Math.abs(authoritativeMinute - lastAuthoritativeMinute) > 2) {
        renderGameMinute = authoritativeMinute
      }
      lastAuthoritativeMinute = authoritativeMinute

      if (!paused && speed > 0) {
        // App.jsx advances one game minute every 3000ms / simulationSpeed.
        renderGameMinute += (dt * speed) / 3000

        // Reconcile gently with the authoritative integer clock without creating
        // a visible once-per-tick marker jump. Between ticks the render clock is
        // expected to lead the integer minute by up to roughly one minute.
        const error = authoritativeMinute - renderGameMinute
        if (error > 0.2) renderGameMinute += Math.min(error, (dt / 1000) * 0.35)
        if (error < -1.25) renderGameMinute += Math.max(error + 1, -(dt / 1000) * 0.35)
      } else if (renderGameMinute < authoritativeMinute) {
        // Pausing immediately freezes visual motion, but never leaves the marker
        // behind a simulation transition that already occurred.
        renderGameMinute = authoritativeMinute
      }

      // CS2.0A.1 — facility states are stronger than stale runtime coordinates.
      // This snap is allowed even while paused so the loading/unloading overlays
      // cannot leave Marcus visually parked off the facility after arrival.
      const facilityLockedDriverIds = new Set()
      currentDrivers.forEach((driver) => {
        const marker = driverMarkerRefs.current.get(driver.id)
        if (!marker) return
        const facilityPosition = getDriverFacilityPosition(currentLoads, driver.id)
        if (!facilityPosition) return
        marker.setLngLat([facilityPosition.longitude, facilityPosition.latitude])
        facilityLockedDriverIds.add(driver.id)
      })

      // AW1.6.4 — a paused operations map is visually frozen. Facility authority
      // above may reconcile a completed arrival, but active travel never advances.
      if (paused) {
        frameId = requestAnimationFrame(render)
        return
      }

      currentDrivers.forEach((driver) => {
        const marker = driverMarkerRefs.current.get(driver.id)
        if (!marker || facilityLockedDriverIds.has(driver.id)) return

        const travelingLoad = getAuthoritativeDriverTravelLoad(currentLoads, driver.id)
        if (!travelingLoad) {
          // B.4.2.3.12: overnight staging uses the same fractional render clock as
          // freight travel. Simulation state still owns arrival; this only removes
          // the visible once-per-game-minute jump between persisted positions.
          if (driver.idleRouteStatus === 'traveling'
            && Array.isArray(driver.idleRouteGeometry)
            && driver.idleRouteGeometry.length >= 2
            && Number.isFinite(driver.idleRouteStartGameMinute)
            && Number.isFinite(driver.idleRouteDurationMinutes)
            && driver.idleRouteDurationMinutes > 0) {
            const progress = Math.max(0, Math.min(1, (renderGameMinute - driver.idleRouteStartGameMinute) / driver.idleRouteDurationMinutes))
            const point = routePosition(driver.idleRouteGeometry, progress)
            if (point) marker.setLngLat(point)
            return
          }
          const position = currentRuntimePositions?.[driver.id]
          if (position) marker.setLngLat([position.longitude, position.latitude])
          return
        }

        const delivery = travelingLoad.tripStatus === 'en-route-delivery'
        const route = delivery ? travelingLoad.plannedLoadedRouteGeometry : travelingLoad.plannedDeadheadRouteGeometry
        const departure = delivery ? travelingLoad.deliveryDepartureGameMinute : travelingLoad.departureGameMinute
        const duration = delivery ? travelingLoad.plannedLoadedDriveTimeMinutes : travelingLoad.plannedDeadheadDriveTimeMinutes
        if (!Array.isArray(route) || route.length < 2 || !Number.isFinite(departure) || !Number.isFinite(duration) || duration <= 0) return

        const fractionalProgress = Math.max(0, Math.min(1, (renderGameMinute - departure) / duration))
        const authoritativeRuntimeProgress = currentRuntimeProgress?.[driver.id]

        // Never visually trail behind persisted simulation progress, but otherwise
        // let the fractional render clock provide the continuous road motion.
        const boundedRuntimeProgress = Number.isFinite(authoritativeRuntimeProgress)
          ? Math.max(0, Math.min(1, authoritativeRuntimeProgress))
          : null
        const progress = boundedRuntimeProgress !== null && boundedRuntimeProgress - fractionalProgress > 0.08
          ? boundedRuntimeProgress
          : fractionalProgress

        const point = routePosition(route, progress)
        if (point) marker.setLngLat(point)
      })

      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)
    return () => { if (frameId) cancelAnimationFrame(frameId) }
  }, [mapReady])

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
      // AW1.6.4 — normal operations use the permanent itinerary stop marker as
      // the only visible P/D marker. This hidden marker remains only as the
      // popup/facility-focus anchor for the currently actionable stop.
      if (!isDriverFitEvaluation && routeFocusMode !== 'planning') {
        element.classList.add('facility-action-anchor')
      }
      const popup = new Popup({ offset: 20 }).setDOMContent(document.createElement('div'))
      const position = { longitude: location.longitude, latitude: location.latitude }
      element.style.zIndex = '40'
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
    const activeLoad = isDriverFitEvaluation ? evaluationLoad : (routeFocusMode === 'planning' && routeReviewLoad ? routeReviewLoad : mapOperationalLoad)
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

    // B.4.2.3.12: strategic truck stops are persistent world locations. Keep the
    // marker compact so it helps staging decisions without competing with drivers.
    const stagingLocations = mapLocations.filter((location) => location.type === 'staging')
    const activeTruckStopIds = new Set(stagingLocations.map((location) => location.id))
    stagingLocations.forEach((location) => {
      if (truckStopMarkerRefs.current.has(location.id)) return
      const element = document.createElement('div')
      element.className = 'game-marker truck-stop'
      element.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h9.5v11H5zM14.5 8h2.8l2.2 3v4h-5zM7.2 6.5h5.1v2H7.2z"/><circle cx="8" cy="17.2" r="2"/><circle cx="17.2" cy="17.2" r="2"/></svg>'
      element.setAttribute('aria-label', location.name)
      element.title = location.name
      const marker = new Marker({ element }).setLngLat([location.longitude, location.latitude]).addTo(map)
      truckStopMarkerRefs.current.set(location.id, marker)
    })
    truckStopMarkerRefs.current.forEach((marker, id) => {
      if (!activeTruckStopIds.has(id)) { marker.remove(); truckStopMarkerRefs.current.delete(id) }
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
      const position = getDriverFacilityPosition(loads, driver.id) || runtimePositions[driver.id] || home
      if (!position) return
      const element = document.createElement('div'); element.className = 'game-marker driver'; element.textContent = driver.name?.charAt(0)?.toUpperCase() || 'D'; element.style.setProperty('--driver-color', getDriverColorFamily(driver.id)[1])
      element.setAttribute('aria-label', `${driver.fullName || driver.name || 'Driver'} map position`)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        setFocusedDriverId((current) => current === driver.id ? null : driver.id)
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
      element.style.zIndex = '55'
      const marker = new Marker({ element }).setLngLat([position.longitude, position.latitude]).addTo(map)
      driverMarkerRefs.current.set(driver.id, marker); markerRecords.current.push({ location: { id: driver.id, name: driver.name, type: 'driver' }, marker, markerElement: element, popup: null })
    })
    if (showPickup && pickup) createLocationMarker(pickup, pickupMarkerRef, 'pickup')
    else removeLocationMarker(pickupMarkerRef)
    if (showDelivery && delivery) createLocationMarker(delivery, deliveryMarkerRef, 'delivery')
    else removeLocationMarker(deliveryMarkerRef)

    // CS2.0A.8 — live operations map only. Completed stops disappear from the
    // map as soon as their facility work is finished; history belongs in
    // FreightLink → History, not on the live map.
    const pickupDoneStates = new Set([
      'loaded', 'onboard-hold', 'en-route-delivery', 'at-delivery', 'checking-in-delivery',
      'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod',
      'delivered', 'completed',
    ])
    const deliveryTravelCompleteStates = new Set([
      'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery',
      'unloading-delivery', 'awaiting-pod', 'delivered', 'completed',
    ])
    // CS2.0A.14 — facility attention belongs to the live P/D marker, not Marcus.
    // The cue appears only while the driver physically owns that facility stop.
    const pickupAttentionStates = new Set([
      'at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup',
      'loading-at-pickup', 'pickup-issue',
    ])
    const deliveryAttentionStates = new Set([
      'at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery',
      'unloading-delivery', 'awaiting-pod',
    ])
    const finishedStates = new Set(['delivered', 'completed'])
    const desiredItineraryMarkers = new Map()
    const addStopMarker = (load, location, role, driverId) => {
      if (!location) return
      desiredItineraryMarkers.set(`${load.id}:${role}`, {
        load, location, role, label: role === 'pickup' ? 'P' : 'D',
        loadLabel: getFreightRouteName(load), driverId,
      })
    }
    loads.forEach((load) => {
      const driverId = load?.assignedDriverId
      if (!driverId || finishedStates.has(load.tripStatus)) return
      const pickupLocation = mapLocations.find((item) => item.id === load.pickupLocationId)
      const deliveryLocation = mapLocations.find((item) => item.id === load.deliveryLocationId)
      if (!pickupDoneStates.has(load.tripStatus)) addStopMarker(load, pickupLocation, 'pickup', driverId)
      if (!DELIVERY_COMPLETE_STATES.has(load.tripStatus)) addStopMarker(load, deliveryLocation, 'delivery', driverId)
    })

    itineraryStopMarkerRefs.current.forEach((marker, key) => {
      if (!desiredItineraryMarkers.has(key)) {
        marker.remove()
        itineraryStopMarkerRefs.current.delete(key)
      }
    })

    // Stop Coordinate Integrity: P/D markers remain on their true facility
    // coordinates. Shared facilities stack geographically instead of fanning out.
    const stopOffsets = new Map()
    desiredItineraryMarkers.forEach((_, key) => stopOffsets.set(key, [0, 0]))

    desiredItineraryMarkers.forEach(({ load, location, role, label, loadLabel, driverId }, key) => {
      const isPrimaryPickup = role === 'pickup' && load.id === activeLoad?.id && showPickup
      const isPrimaryDelivery = role === 'delivery' && load.id === activeLoad?.id && showDelivery
      const isPrimaryStop = isPrimaryPickup || isPrimaryDelivery
      const needsFacilityAttention = !suppressAttention && (
        (role === 'pickup' && pickupAttentionStates.has(load.tripStatus)) ||
        (role === 'delivery' && deliveryAttentionStates.has(load.tripStatus))
      )
      const existing = itineraryStopMarkerRefs.current.get(key)
      const markerOpacity = focusedDriverId && focusedDriverId !== driverId ? '0.22' : (isPrimaryStop ? '1' : '0.76')
      const stopOffset = stopOffsets.get(key) || [0, 0]
      const stopZIndex = isPrimaryStop ? '70' : '64'
      if (existing) {
        const existingElement = existing.getElement?.()
        if (!existingElement?.isConnected) {
          existing.remove()
          itineraryStopMarkerRefs.current.delete(key)
        } else {
          existingElement.style.opacity = isPrimaryStop && facilityPopupOpen ? '0.28' : markerOpacity
          existingElement.style.zIndex = stopZIndex
          existingElement.classList.toggle('current-itinerary-stop', isPrimaryStop)
          existingElement.classList.remove('completed-itinerary-stop')
          existingElement.classList.toggle('attention', needsFacilityAttention)
          // CS2.0A.14.1 — use a real DOM badge instead of relying only on ::after.
          // MapLibre/iOS can fail to repaint marker pseudo-elements when classes
          // change in place, which made the facility ! appear inconsistently.
          let attentionBadge = existingElement.querySelector('.facility-attention-badge')
          if (!attentionBadge) {
            attentionBadge = document.createElement('span')
            attentionBadge.className = 'facility-attention-badge'
            attentionBadge.textContent = '!'
            attentionBadge.setAttribute('aria-hidden', 'true')
            existingElement.append(attentionBadge)
          }
          attentionBadge.hidden = !needsFacilityAttention
          existingElement.classList.toggle('popup-obscured-stop', isPrimaryStop && facilityPopupOpen)
          existing.setLngLat?.([location.longitude, location.latitude])
          existing.setOffset?.(stopOffset)
          return
        }
      }
      const element = document.createElement('div')
      element.className = `game-marker ${role} itinerary-stop-marker${isPrimaryStop ? ' current-itinerary-stop' : ''}`
      const family = getDriverColorFamily(driverId)
      const driverLoads = loads.filter((item) => item.assignedDriverId === driverId && !finishedStates.has(item.tripStatus))
      const shadeIndex = Math.max(0, driverLoads.findIndex((item) => item.id === load.id)) % family.length
      element.style.setProperty('--driver-color', family[shadeIndex])
      element.style.opacity = isPrimaryStop && facilityPopupOpen ? '0.28' : markerOpacity
      element.textContent = label
      element.dataset.stopKey = key
      element.dataset.loadId = String(load.id)
      element.dataset.stopRole = role
      element.title = `${loadLabel} · ${role === 'pickup' ? 'Pickup' : 'Delivery'} · ${location.name}`
      element.setAttribute('aria-label', element.title)
      element.style.zIndex = stopZIndex
      element.classList.toggle('attention', needsFacilityAttention)
      const attentionBadge = document.createElement('span')
      attentionBadge.className = 'facility-attention-badge'
      attentionBadge.textContent = '!'
      attentionBadge.setAttribute('aria-hidden', 'true')
      attentionBadge.hidden = !needsFacilityAttention
      element.append(attentionBadge)
      element.classList.toggle('popup-obscured-stop', isPrimaryStop && facilityPopupOpen)
      element.addEventListener('click', (event) => {
        if (!isPrimaryStop) return
        event.stopPropagation()
        const actionMarker = role === 'pickup' ? pickupMarkerRef.current : deliveryMarkerRef.current
        if (actionMarker?.getPopup?.() && !actionMarker.getPopup().isOpen()) actionMarker.togglePopup()
      })
      const marker = new Marker({ element, offset: stopOffset }).setLngLat([location.longitude, location.latitude]).addTo(map)
      itineraryStopMarkerRefs.current.set(key, marker)
    })

    const deliveryRecord = markerRecords.current.find(({ marker }) => marker === deliveryMarkerRef.current)
    if (deliveryRecord) deliveryRecord.markerElement.style.pointerEvents = ''
    logDocOsState({ isDriverFitEvaluation, hasActiveAcceptedLoad: active, showPickupMarker: showPickup, showDeliveryMarker: showDelivery, pickupMarkerExists: Boolean(pickupMarkerRef.current), deliveryMarkerExists: Boolean(deliveryMarkerRef.current) })

    // AW1.7.2 — one stable freight route per load. The authoritative itinerary
    // controls priority/order, while each load's pickup→delivery geometry controls
    // the road shape. This avoids both stale deadhead webs and straight-line
    // connectors across the city. The live active-route layer remains authoritative
    // for Marcus's current movement leg.
    const loadOrder = []
    const loadPriority = new Map()
    drivers.forEach((driver) => {
      const itineraryState = getDriverItineraryState(loads, driver.id)
      const itinerary = itineraryState.itinerary.filter((stop) => stop.state !== 'completed')
      const currentStop = itineraryState.nextStop || itineraryState.currentStop || null
      const currentIndex = currentStop ? itinerary.findIndex((stop) => stop.id === currentStop.id) : -1

      // CS2.0A.5 — route emphasis follows operational stop authority, not raw
      // appointment order. A pickup window opening on another load must never
      // steal CURRENT/NEXT emphasis from the stop Marcus is actually working.
      const orderedDistinctLoadIds = []
      const pushLoad = (loadId) => {
        if (loadId && !orderedDistinctLoadIds.includes(loadId)) orderedDistinctLoadIds.push(loadId)
      }

      if (currentStop) pushLoad(currentStop.loadId)

      // After the current actionable stop, preserve itinerary order for what
      // comes next. Stops before the authoritative current stop are intentionally
      // ignored for highlight purposes even if their clock window is earlier.
      const futureStops = currentIndex >= 0 ? itinerary.slice(currentIndex + 1) : itinerary
      futureStops.forEach((stop) => pushLoad(stop.loadId))

      // Defensive fallback: keep any remaining visible loads ordered, but never
      // ahead of CURRENT/NEXT authority.
      itinerary.forEach((stop) => pushLoad(stop.loadId))

      orderedDistinctLoadIds.forEach((loadId, routeIndex) => {
        if (!loadOrder.includes(loadId)) loadOrder.push(loadId)
        const previous = loadPriority.get(loadId)
        if (!previous || routeIndex < previous.stopIndex) {
          loadPriority.set(loadId, { stopIndex: routeIndex, driverId: driver.id })
        }
      })
    })

    // CS2.0A.10.2 — future pickup geometry is only trustworthy when it begins
    // at the stop that actually precedes that pickup in the remaining itinerary.
    // Cached planning geometry can be perfectly valid for planning yet stale for the
    // live map after an inserted pickup/delivery changes Marcus's physical origin.
    const pickupOriginByLoadId = new Map()
    drivers.forEach((driver) => {
      const remaining = getDriverItineraryState(loads, driver.id).itinerary.filter((stop) => stop.state !== 'completed')
      remaining.forEach((stop, index) => {
        if (stop.type !== 'pickup') return
        const previousStop = index > 0 ? remaining[index - 1] : null
        const previousLocation = previousStop ? mapLocations.find((location) => location.id === previousStop.locationId) : null
        const runtimeOrigin = runtimePositions?.[driver.id]
        const driverOrigin = Number.isFinite(driver?.longitude) && Number.isFinite(driver?.latitude)
          ? { longitude: driver.longitude, latitude: driver.latitude }
          : null
        pickupOriginByLoadId.set(stop.loadId, previousLocation || runtimeOrigin || driverOrigin || null)
      })
    })

    const features = []
    loads.forEach((load) => {
      const routeDriverId = load?.assignedDriverId
      if (!routeDriverId || finishedStates.has(load.tripStatus) || deliveryTravelCompleteStates.has(load.tripStatus)) return
      const pickupLocation = mapLocations.find((location) => location.id === load.pickupLocationId)
      const deliveryLocation = mapLocations.find((location) => location.id === load.deliveryLocationId)
      if (!pickupLocation || !deliveryLocation) return

      const driverFamily = getDriverColorFamily(routeDriverId)
      const sameDriverLoadIds = loadOrder.filter((id) => {
        const item = loads.find((candidate) => candidate.id === id)
        return (item?.assignedDriverId || item?.completedDriverId) === routeDriverId
      })
      const loadIndex = Math.max(0, sameDriverLoadIds.indexOf(load.id))
      const color = driverFamily[loadIndex % driverFamily.length]
      const priorityInfo = loadPriority.get(load.id) || { stopIndex: 99, driverId: routeDriverId }
      const focusPenalty = focusedDriverId && focusedDriverId !== routeDriverId ? 1 : 0
      const priority = Math.min(3, priorityInfo.stopIndex)
      const isCurrentDeliveryTravel = load.tripStatus === 'en-route-delivery'
      // CS2.0A.8 — no historical route geometry on the live map. The live
      // active-route layer owns current travel; remaining planned geometry is
      // only for current/future operations.
      const routeVisualState = isCurrentDeliveryTravel ? 'current-underlay' : 'future'
      const opacity = routeVisualState === 'current-underlay'
        ? 0.30
        : (focusPenalty ? 0.20 : priority === 0 ? 0.68 : priority === 1 ? 0.54 : 0.42)
      const width = routeVisualState === 'current-underlay'
        ? 3.1
        : (priority === 0 ? 3.4 : priority === 1 ? 3.0 : 2.7)
      const routeColor = color
      const pickupWindow = formatAppointment(load.pickupDayIndex, load.pickupWindowStartMinutes, load.pickupWindowEndMinutes)
      const deliveryWindow = formatAppointment(load.deliveryDayIndex, load.deliveryWindowStartMinutes, load.deliveryWindowEndMinutes)
      const routeStatus = String(load.tripStatus || load.status || 'planned').replaceAll('-', ' ').toUpperCase()
      const loadedGeometry = Array.isArray(load.plannedLoadedRouteGeometry) && load.plannedLoadedRouteGeometry.length >= 2
        ? load.plannedLoadedRouteGeometry
        : null
      const routedGeometry = loadedGeometry && routeMatchesEndpoints(loadedGeometry, pickupLocation, deliveryLocation, 2.0)
        ? loadedGeometry
        : null

      // CS2.0A.9 route grammar remains permanent:
      // dashed = empty/deadhead movement to pickup; solid = loaded movement to delivery.
      // CS2.0A.10.2 adds live-map origin integrity: a cached future deadhead is hidden
      // when it starts from an obsolete projected origin. When that stop becomes
      // authoritative MainGameScreen recalculates it from Marcus's real position.
      const rawPickupGeometry = Array.isArray(load.plannedDeadheadRouteGeometry) && load.plannedDeadheadRouteGeometry.length >= 2
        ? load.plannedDeadheadRouteGeometry
        : null
      const expectedPickupOrigin = pickupOriginByLoadId.get(load.id)
      // CS2.0A.12.4 — the origin-integrity filter is for FUTURE deadheads only.
      // Once Marcus is physically en route, plannedDeadheadRouteGeometry is the
      // movement authority itself, so hiding it because the projected predecessor
      // changed can make the truck move with no visible road underneath him.
      const currentPickupTravel = load.tripStatus === 'en-route-pickup'
      const currentPickupEndsAtFacility = rawPickupGeometry
        && coordinateDistanceMiles(rawPickupGeometry[rawPickupGeometry.length - 1], pickupLocation) <= 2.0
      const pickupGeometry = rawPickupGeometry && (
        (currentPickupTravel && currentPickupEndsAtFacility)
        || (!currentPickupTravel && routeMatchesEndpoints(rawPickupGeometry, expectedPickupOrigin, pickupLocation, 2.0))
      ) ? rawPickupGeometry : null
      if (!pickupDoneStates.has(load.tripStatus) && pickupGeometry) {
        const pickupVisualState = currentPickupTravel ? 'current-underlay' : 'future'
        const pickupOpacity = pickupVisualState === 'current-underlay'
          ? 0.56
          : (focusPenalty ? 0.20 : priority === 0 ? 0.68 : priority === 1 ? 0.54 : 0.42)
        const pickupWidth = pickupVisualState === 'current-underlay'
          ? 3.8
          : (priority === 0 ? 3.4 : priority === 1 ? 3.0 : 2.7)
        features.push({
          type: 'Feature',
          properties: {
            key: `itinerary:${routeDriverId}:${load.id}:pickup`,
            legType: 'pickup',
            loadId: load.id, loadLabel: getFreightRouteName(load),
            color: routeColor, opacity: pickupOpacity, width: pickupWidth, priority, driverId: routeDriverId, routeVisualState: pickupVisualState,
            pickupName: pickupLocation.name || 'Pickup', deliveryName: deliveryLocation.name || 'Delivery',
            pickupWindow, deliveryWindow, routeStatus, completed: 0,
          },
          geometry: { type: 'LineString', coordinates: pickupGeometry },
        })
      }

      // Never invent a straight/fallback line on the live operations map. If the
      // cached loaded route no longer actually connects this pickup and delivery,
      // markers remain visible and the road line waits for authoritative geometry.
      if (routedGeometry) features.push({
        type: 'Feature',
        properties: {
          key: `itinerary:${routeDriverId}:${load.id}`,
          legType: 'delivery',
          loadId: load.id,
          loadLabel: getFreightRouteName(load),
          color: routeColor, opacity, width, priority, driverId: routeDriverId, routeVisualState,
          pickupName: pickupLocation.name || 'Pickup',
          deliveryName: deliveryLocation.name || 'Delivery',
          pickupWindow, deliveryWindow, routeStatus, completed: 0,
        },
        geometry: { type: 'LineString', coordinates: routedGeometry },
      })
    })

    const data = { type: 'FeatureCollection', features }
    const source = map.getSource('itinerary-routes')
    if (!source) {
      map.addSource('itinerary-routes', { type: 'geojson', data })
      const before = map.getLayer('active-route-line') ? 'active-route-line' : undefined
      // AW1.7.3 — add a subtle casing under every scheduled route, then the
      // driver-color line above it. The casing keeps routes visible over roads,
      // water, labels, and other dark-map geometry without making the map noisy.
      map.addLayer({
        id: 'itinerary-routes-delivery-casing', type: 'line', source: 'itinerary-routes', filter: ['==', ['get', 'legType'], 'delivery'],
        paint: {
          'line-color': '#08111C',
          'line-width': ['+', ['get', 'width'], 2.6],
          'line-opacity': ['min', 0.88, ['+', ['get', 'opacity'], 0.12]],
        },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      }, before)
      map.addLayer({
        id: 'itinerary-routes-delivery', type: 'line', source: 'itinerary-routes', filter: ['==', ['get', 'legType'], 'delivery'],
        paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'] },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      }, before)
      map.addLayer({
        id: 'itinerary-routes-pickup-casing', type: 'line', source: 'itinerary-routes', filter: ['==', ['get', 'legType'], 'pickup'],
        paint: { 'line-color': '#08111C', 'line-width': ['+', ['get', 'width'], 2.2], 'line-opacity': ['min', 0.78, ['+', ['get', 'opacity'], 0.10]], 'line-dasharray': [2.2, 1.6] },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      }, before)
      map.addLayer({
        id: 'itinerary-routes-pickup', type: 'line', source: 'itinerary-routes', filter: ['==', ['get', 'legType'], 'pickup'],
        paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': ['get', 'opacity'], 'line-dasharray': [2.2, 1.6] },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      }, before)
      // AW1.6.9 — route info anchors. Route lines are intentionally non-interactive.
      // Each scheduled load gets one obvious midpoint dot with an iPhone-friendly hit target.
    } else source.setData(data)

    const anchorByLoad = new Map()
    features.forEach((feature) => {
      const loadId = feature?.properties?.loadId
      if (!loadId || Number(feature?.properties?.completed) === 1) return
      const existing = anchorByLoad.get(loadId)
      // Prefer the loaded/delivery leg because that is the actual freight route.
      if (!existing || feature.properties.legType === 'delivery') anchorByLoad.set(loadId, feature)
    })
    const anchorFeatures = Array.from(anchorByLoad.values()).map((feature) => {
      const point = routePosition(feature.geometry.coordinates, 0.5)
      if (!point) return null
      return {
        type: 'Feature',
        properties: { ...feature.properties, anchorKey: `route-anchor:${feature.properties.loadId}` },
        geometry: { type: 'Point', coordinates: point },
      }
    }).filter(Boolean)
    const anchorData = { type: 'FeatureCollection', features: anchorFeatures }
    const anchorSource = map.getSource('itinerary-route-anchors')
    if (!anchorSource) map.addSource('itinerary-route-anchors', { type: 'geojson', data: anchorData })
    else anchorSource.setData(anchorData)

    if (!map.getLayer('itinerary-route-anchor-dot')) {
      map.addLayer({
        id: 'itinerary-route-anchor-dot', type: 'circle', source: 'itinerary-route-anchors',
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.98,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#F8FAFC',
          'circle-stroke-opacity': 0.96,
        },
      })
    }
    if (!map.getLayer('itinerary-route-anchor-hit')) {
      map.addLayer({
        id: 'itinerary-route-anchor-hit', type: 'circle', source: 'itinerary-route-anchors',
        paint: { 'circle-radius': 17, 'circle-color': '#ffffff', 'circle-opacity': 0.001 },
      })
    }

    let anchorResetTimer = null
    const closeRouteInfoPopup = () => {
      const current = routeInfoPopupRef.current
      if (current?.popup) current.popup.remove()
      routeInfoPopupRef.current = { loadId: null, popup: null }
    }
    const onRouteAnchorTap = (event) => {
      const feature = event.features?.[0]
      if (!feature?.properties?.loadId) return
      if (event.originalEvent) event.originalEvent.__docosRouteAnchorTap = true
      event.originalEvent?.stopPropagation?.()
      const props = feature.properties || {}
      const coordinates = feature.geometry?.coordinates
      if (!Array.isArray(coordinates)) return

      // AW1.6.10 — the route dot is a toggle. Tapping the same dot again closes its peek.
      if (routeInfoPopupRef.current?.loadId === props.loadId && routeInfoPopupRef.current?.popup) {
        closeRouteInfoPopup()
        return
      }
      closeRouteInfoPopup()

      // Visible tap feedback without moving the map or changing route state.
      map.setPaintProperty('itinerary-route-anchor-dot', 'circle-radius', [
        'case', ['==', ['get', 'loadId'], props.loadId], 7, 5,
      ])
      if (anchorResetTimer) clearTimeout(anchorResetTimer)
      anchorResetTimer = setTimeout(() => {
        if (map.getLayer('itinerary-route-anchor-dot')) map.setPaintProperty('itinerary-route-anchor-dot', 'circle-radius', 5)
      }, 520)

      const safe = (value) => String(value ?? '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#039;')
      const compactWindow = (value) => String(value ?? '')
        .replace(/^[A-Za-z]{3}\s+\d{1,2}\s*[·•]\s*/i, '')
        .trim()
      const popup = new Popup({ closeButton: true, closeOnClick: false, offset: 14, className: 'route-name-popup route-detail-popup route-peek-popup route-label-popup', maxWidth: '210px' })
        .setLngLat(coordinates)
        .setHTML(`
          <div class="route-label-peek">
            <div class="route-label-title">${safe(props.loadLabel)}</div>
            <div class="route-label-status">${safe(props.routeStatus)}</div>
            <div class="route-label-stop"><span>PICKUP</span><strong>${safe(compactWindow(props.pickupWindow))}</strong></div>
            <div class="route-label-stop"><span>DELIVERY</span><strong>${safe(compactWindow(props.deliveryWindow))}</strong></div>
          </div>`)
        .addTo(map)
      popup.on('close', () => {
        if (routeInfoPopupRef.current?.popup === popup) routeInfoPopupRef.current = { loadId: null, popup: null }
      })
      routeInfoPopupRef.current = { loadId: props.loadId, popup }
    }
    const onMapTapCloseRouteInfo = (event) => {
      // AW1.6.10.1 — MapLibre can dispatch both the layer click and the generic map
      // click for the same physical tap. Never treat a tap that intersects a route
      // anchor as an empty-map dismissal.
      if (event.originalEvent?.__docosRouteAnchorTap) return
      const point = event.point
      if (point && map.getLayer('itinerary-route-anchor-hit')) {
        const hits = map.queryRenderedFeatures(point, { layers: ['itinerary-route-anchor-hit'] })
        if (hits?.length) return
      }
      closeRouteInfoPopup()
    }
    map.off('click', 'itinerary-route-anchor-hit', onRouteAnchorTap)
    map.on('click', 'itinerary-route-anchor-hit', onRouteAnchorTap)
    map.on('click', onMapTapCloseRouteInfo)
    return () => {
      if (anchorResetTimer) clearTimeout(anchorResetTimer)
      map.off('click', 'itinerary-route-anchor-hit', onRouteAnchorTap)
      map.off('click', onMapTapCloseRouteInfo)
      // AW1.6.10.1 — do not destroy an open route peek just because React rebuilt
      // the itinerary source after a driver-focus or status refresh. The popup owns
      // its own close lifecycle (same-dot toggle, another dot, X, or empty map tap).
    }
  }, [mapReady, markerRefreshToken, drivers, loads, runtimePositions, mapOperationalLoad?.id, mapOperationalLoad?.assignedDriverId, mapOperationalLoad?.tripStatus, mapOperationalLoad?.pickupLocationId, mapOperationalLoad?.deliveryLocationId, routeFocusMode, routeReviewLoad?.id, routeReviewLoad?.pickupLocationId, routeReviewLoad?.deliveryLocationId, isDriverFitEvaluation, evaluationLoad?.id, carriers, focusedDriverId, freightBrowseMode, suppressAttention])

  // AW1.7.2 — restore FreightLink browse markers removed during the authority cleanup.
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
      element.setAttribute('aria-label', `${getFreightRouteName(load)} pickup at ${pickup.name}`)
      const pin = document.createElement('span')
      pin.className = 'game-marker pickup'
      pin.textContent = 'P'
      const label = document.createElement('small')
      label.textContent = getFreightRouteName(load)
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
      element.className = 'game-marker delivery freight-main-map-delivery-pin'
      element.textContent = 'D'
      freightBrowseDeliveryMarkerRef.current = new Marker({ element }).setLngLat([delivery.longitude, delivery.latitude]).addTo(map)
    }

    const freightBrowseFitKey = freightBrowseMode && !freightBrowseSelectedLoadId ? 'browse-board' : null
    if (!freightBrowseMode) handledFreightBrowseFitKey.current = null
    if (freightBrowseFitKey && handledFreightBrowseFitKey.current !== freightBrowseFitKey && freightBrowseLoads.length) {
      handledFreightBrowseFitKey.current = freightBrowseFitKey
      const points = freightBrowseLoads
        .map((load) => mapLocations.find((location) => location.id === load.pickupLocationId))
        .filter(Boolean)
      if (points.length) {
        const lngs = points.map((point) => point.longitude)
        const lats = points.map((point) => point.latitude)
        console.debug('[CAMERA] FREIGHTLINK_BOARD')
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 70, maxZoom: 11, duration: 420 })
      }
    }
  }, [mapReady, freightBrowseMode, freightBrowseLoads, freightBrowseSelectedLoadId, onFreightBrowseSelect])

  // AW1.7.2 — rebuild DOM-backed markers after WKWebView resume/focus while
  // preserving the exact camera.
  useEffect(() => {
    let retryTimer = null
    let settleTimer = null

    const rebuildOperationalMarkers = () => {
      const map = mapRef.current
      if (!map) return

      pickupMarkerRef.current?.remove()
      deliveryMarkerRef.current?.remove()
      pickupMarkerRef.current = null
      deliveryMarkerRef.current = null
      driverMarkerRefs.current.forEach((marker) => marker.remove())
      driverMarkerRefs.current.clear()
      itineraryStopMarkerRefs.current.forEach((marker) => marker.remove())
      itineraryStopMarkerRefs.current.clear()
      markerRecords.current = markerRecords.current.filter(({ location }) => location?.type === 'freight-browse')

      const center = map.getCenter()
      const camera = {
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      }
      map.resize()
      map.jumpTo(camera)
      console.debug('[CAMERA] RESIZE_PRESERVE', camera)
      setMarkerRefreshToken((value) => value + 1)
    }

    const refreshMarkers = () => {
      if (document.visibilityState === 'hidden') return
      rebuildOperationalMarkers()
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
    const map = mapRef.current
    if (!map || !mapReady) return
    const clearDriverFocus = () => setFocusedDriverId(null)
    map.on('click', clearDriverFocus)
    return () => map.off('click', clearDriverFocus)
  }, [mapReady])

  useEffect(() => {
    if (!routeFocusMode) return
    driverMarkerRefs.current.forEach((marker) => {
      const popup = marker.getPopup?.()
      if (popup?.isOpen()) popup.remove()
    })
  }, [routeFocusMode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || routeFocusMode || freightBrowseMode) return

    const operationalLoads = loads.filter((load) => load.assignedDriverId && !['queued', 'onboard-hold'].includes(load.tripStatus) && !['delivered', 'completed'].includes(load.tripStatus))
    const operationalDriverIds = new Set([
      ...drivers.filter((driver) => driver.status !== 'unavailable').map((driver) => driver.id),
      ...operationalLoads.map((load) => load.assignedDriverId),
      ...drivers.filter((driver) => driver.idleRouteStatus === 'traveling').map((driver) => driver.id),
    ])
    const points = []
    operationalDriverIds.forEach((driverId) => {
      const driver = drivers.find((item) => item.id === driverId)
      const runtime = runtimePositions?.[driverId]
      const home = mapLocations.find((location) => location.id === driver?.homeBaseLocationId)
      const location = runtime || (Number.isFinite(driver?.longitude) && Number.isFinite(driver?.latitude) ? driver : home)
      if (Number.isFinite(location?.longitude) && Number.isFinite(location?.latitude)) points.push([location.longitude, location.latitude])
    })
    operationalLoads.forEach((load) => {
      const pickup = mapLocations.find((location) => location.id === load.pickupLocationId)
      const delivery = mapLocations.find((location) => location.id === load.deliveryLocationId)
      if (Number.isFinite(pickup?.longitude) && Number.isFinite(pickup?.latitude)) points.push([pickup.longitude, pickup.latitude])
      if (Number.isFinite(delivery?.longitude) && Number.isFinite(delivery?.latitude)) points.push([delivery.longitude, delivery.latitude])
    })
    if (!points.length) return

    const fitBoard = (duration = 520) => {
      const lngs = points.map((point) => point[0])
      const lats = points.map((point) => point[1])
      if (points.length === 1) {
        map.easeTo({ center: points[0], zoom: Math.min(map.getZoom(), 10.25), duration })
        return
      }
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 120, right: 54, bottom: 150, left: 54 }, maxZoom: 10.45, duration },
      )
    }

    // Explicit BOARD control always wins. The automatic board fit only activates
    // once more than one driver is operational, so single-driver play keeps the
    // familiar close camera while AV2.5 is ready for Driver #2.
    if (boardViewRequest && handledBoardViewRequest.current !== boardViewRequest) {
      handledBoardViewRequest.current = boardViewRequest
      console.debug('[CAMERA] BOARD', { request: boardViewRequest })
      fitBoard(520)
      return
    }

    // AW1.6.4 — ordinary schedule/status refreshes never own the camera. The
    // player can request BOARD explicitly; multi-driver state changes no longer
    // trigger an automatic refit.
    return
  }, [boardViewRequest, mapReady, routeFocusMode, freightBrowseMode, drivers, loads, runtimePositions])

  useEffect(() => {
    if (!driverFocusRequest || !mapReady) return
    if (handledDriverFocusRequest.current === driverFocusRequest) return
    const map = mapRef.current
    const marker = driverMarkerRefs.current.get(driverFocusId)
    if (!map || !marker) return

    handledDriverFocusRequest.current = driverFocusRequest
    const lngLat = marker.getLngLat()
    console.debug('[CAMERA] DRIVER_FOCUS', { request: driverFocusRequest, driverFocusId })
    map.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(map.getZoom(), 11.2), duration: 420 })
  }, [driverFocusRequest, driverFocusId, mapReady])


  useEffect(() => {
    // AW1.6.4 — departing for pickup/delivery no longer moves or refits the map.
    // Route/state changes update line and marker styling only. Camera motion is
    // reserved for explicit BOARD, driver-focus, facility-focus, and route-review
    // actions initiated by the player.
    if (!['en-route-pickup', 'en-route-delivery'].includes(mapOperationalLoad?.tripStatus)) {
      travelCameraKey.current = null
    }
  }, [mapOperationalLoad?.tripStatus])

  useEffect(() => {
    if (!facilityFocusRequest || !mapReady || !facilityFocusRole) return
    if (handledFacilityFocusRequest.current === facilityFocusRequest) return
    const map = mapRef.current
    if (!map) return

    // AW1.6.5 — a facility camera request is consumed exactly once. Later trip
    // status changes may change marker styling/popups, but they cannot replay an
    // old camera command.
    const pickupOwnedStates = new Set(['at-pickup', 'checking-in-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-at-pickup'])
    const deliveryOwnedStates = new Set(['at-delivery', 'checking-in-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery', 'awaiting-pod'])
    const facilityOwnsCamera = facilityFocusRole === 'pickup'
      ? pickupOwnedStates.has(assignedLoad?.tripStatus)
      : deliveryOwnedStates.has(assignedLoad?.tripStatus)

    if (!facilityOwnsCamera) {
      const driverMarker = driverMarkerRefs.current.get(driverFocusId) || driverMarkerRefs.current.values().next().value
      if (!driverMarker) return
      handledFacilityFocusRequest.current = facilityFocusRequest
      console.debug('[CAMERA] FACILITY_FOCUS', { request: facilityFocusRequest, role: facilityFocusRole, facilityOwnsCamera })
      const lngLat = driverMarker.getLngLat()
      map.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(map.getZoom(), 10.9), duration: 420 })
      return
    }

    const marker = facilityFocusRole === 'pickup' ? pickupMarkerRef.current : deliveryMarkerRef.current
    if (!marker) return
    handledFacilityFocusRequest.current = facilityFocusRequest
    console.debug('[CAMERA] FACILITY_FOCUS', { request: facilityFocusRequest, role: facilityFocusRole, facilityOwnsCamera })
    const lngLat = marker.getLngLat()
    map.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(map.getZoom(), 11.2), duration: 420 })
    window.setTimeout(() => {
      if (!marker.getPopup()?.isOpen()) marker.togglePopup()
    }, 440)
  }, [facilityFocusRequest, facilityFocusRole, mapReady, driverFocusId])

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
    const route = resolvedActiveRouteGeometry?.length ? { routeShape: resolvedActiveRouteGeometry } : null
    let source = map.getSource('active-route')
    if (!source) {
      if (!route) return
      map.addSource('active-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.routeShape } } })
      source = map.getSource('active-route')
    } else if (route) source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.routeShape } })
    else source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } })

    // CS2.0A.12.4 — custom MapLibre layers can disappear independently of their
    // source during a WKWebView/style refresh. Recreate the live route layer when
    // needed instead of leaving Marcus moving with an invisible route.
    if (route && !map.getLayer('active-route-line')) {
      map.addLayer({ id: 'active-route-line', type: 'line', source: 'active-route', paint: { 'line-color': mapOperationalLoad?.assignedDriverId ? getDriverColorFamily(mapOperationalLoad.assignedDriverId)[0] : '#E4D7EC', 'line-width': 5.2, 'line-opacity': 0.96, 'line-dasharray': mapOperationalLoad?.tripStatus === 'en-route-pickup' ? [2.2, 1.6] : [1, 0.001] }, layout: { 'line-join': 'round', 'line-cap': 'round' } })
    }

    if (map.getLayer('active-route-line')) {
      map.setPaintProperty('active-route-line', 'line-color', isStagingRoute ? '#9B8BA6' : (isDriverFitEvaluation ? '#D0B8DF' : (mapOperationalLoad?.assignedDriverId ? getDriverColorFamily(mapOperationalLoad.assignedDriverId)[0] : '#E4D7EC')))
      map.setPaintProperty('active-route-line', 'line-width', isStagingRoute ? 3.2 : (isDriverFitEvaluation ? 5.5 : 5.2))
      map.setPaintProperty('active-route-line', 'line-opacity', isStagingRoute ? 0.58 : 0.96)
      map.setPaintProperty('active-route-line', 'line-dasharray', isStagingRoute ? [1.4, 1.1] : (mapOperationalLoad?.tripStatus === 'en-route-pickup' ? [2.2, 1.6] : [1, 0.001]))
    }

    console.debug('ROUTE SOURCE UPDATE', { tripStatus: mapOperationalLoad?.tripStatus, geometryType: route ? 'active' : 'null', coordinateCount: route?.routeShape?.length || 0 })
  }, [mapReady, resolvedActiveRouteGeometry, mapOperationalLoad?.tripStatus, mapOperationalLoad?.assignedDriverId, isDriverFitEvaluation, isStagingRoute, routeFocusMode, routeReviewLoad])

  useEffect(() => {
    const map = mapRef.current
    if (!routeFocusMode) {
      handledRouteFocusKey.current = null
      return
    }
    if (!map || !mapReady || !activeRouteGeometry?.length) return

    // AW1.6.5 — fit a route once when its review/planning session opens. Geometry
    // objects can be rebuilt many times during status updates; those refreshes do
    // not get to refit the camera. Closing route focus resets the lock so reopening
    // the same route still behaves normally.
    const routeFocusKey = `${routeFocusMode}:${routeReviewLoad?.id || freightBrowseSelectedLoadId || 'route'}`
    if (handledRouteFocusKey.current === routeFocusKey) return
    handledRouteFocusKey.current = routeFocusKey

    const lngs = activeRouteGeometry.map((point) => point[0])
    const lats = activeRouteGeometry.map((point) => point[1])
    const bounds = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ]

    const planningBottomPadding = Math.round(Math.min(430, Math.max(330, window.innerHeight * 0.46)))
    console.debug('[CAMERA] ROUTE_REVIEW', { routeFocusKey })
    map.fitBounds(bounds, {
      padding: routeFocusMode === 'evaluation'
        ? { top: 68, right: 22, bottom: 285, left: 22 }
        : { top: 76, right: 30, bottom: planningBottomPadding, left: 30 },
      maxZoom: routeFocusMode === 'planning' ? 10.7 : 11.35,
      duration: 460,
    })
  }, [activeRouteGeometry, routeFocusMode, routeReviewLoad?.id, freightBrowseSelectedLoadId, mapReady])

  useEffect(() => {
    const pickupRecord = markerRecords.current.find(({ marker }) => marker === pickupMarkerRef.current)
    const popupLoad = assignedLoad || evaluationLoad
    if (pickupRecord && popupLoad) {
      const content = document.createElement('div')
      content.className = 'docos-facility-popup pickup-facility-popup'
      const heading = document.createElement('strong'); heading.textContent = 'PICKUP'
      const name = document.createElement('span'); name.textContent = mapLocations.find((location) => location.id === popupLoad.pickupLocationId)?.name || 'Pickup location'
      const load = document.createElement('span'); load.textContent = getFreightRouteName(popupLoad)
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
      const load = document.createElement('span'); load.textContent = getFreightRouteName(popupLoad)
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
      const driverLoad = getDriverItineraryState(loads, driver.id).operationalLoad
      element.style.pointerEvents = ''
      // CS2.0B.4.2.4.4: once normal freight is physically underway, the map
      // marker returns to its standard driver color. `unavailable` remains a
      // roster/assignment concept; it must not visually make an on-duty driver
      // look off-duty while working the load.
      const activeFreightVisual = Boolean(driverLoad && ['en-route-pickup', 'waiting-pickup', 'waiting-at-pickup', 'checked-in-pickup', 'loading-pickup', 'loaded', 'en-route-delivery', 'waiting-delivery', 'waiting-at-delivery', 'checked-in-delivery', 'unloading-delivery'].includes(driverLoad.tripStatus || driverLoad.status))
      // CS2.0B.4.2.4.5: assignment/queue bookkeeping may leave driver.status as
      // `unavailable` while Marcus is legitimately inside his scheduled workday.
      // Map availability styling follows duty time + active freight, not queue state.
      const todayWorkday = driver.workdayByDay?.[String(gameTime.gameDayIndex)] || driver.workdayByDay?.[gameTime.gameDayIndex]
      const previousWorkday = driver.workdayByDay?.[String(gameTime.gameDayIndex - 1)] || driver.workdayByDay?.[gameTime.gameDayIndex - 1]
      const minuteOfDay = Number(gameTime.totalMinutesOfDay) || 0
      const todayStart = Number(todayWorkday?.startMinutes)
      const todayEnd = Number(todayWorkday?.endMinutes)
      const previousStart = Number(previousWorkday?.startMinutes)
      const previousEnd = Number(previousWorkday?.endMinutes)
      const inTodayWorkday = Number.isFinite(todayStart) && Number.isFinite(todayEnd)
        ? (todayEnd > todayStart ? minuteOfDay >= todayStart && minuteOfDay < todayEnd : minuteOfDay >= todayStart)
        : false
      const inPreviousCarryover = Number.isFinite(previousStart) && Number.isFinite(previousEnd) && previousEnd <= previousStart
        ? minuteOfDay < previousEnd
        : false
      const inScheduledWorkday = inTodayWorkday || inPreviousCarryover
      element.classList.toggle('unavailable', driver.status === 'unavailable' && !activeFreightVisual && !inScheduledWorkday)
      element.classList.toggle('attention', false)
      let pill = element.querySelector('.driver-status-pill')
      if (!pill) { pill = document.createElement('span'); pill.className = 'driver-status-pill'; element.append(pill) }
      element.classList.remove('waiting-progress')
      element.style.removeProperty('--wait-progress')
      element.classList.remove('overnight-status')
      // B.4.2.4.3: Shift End staging presentation owns the driver marker even
      // when tomorrow's freight is already assigned. Keep the map quiet: badge
      // only (💤 while repositioning, 🌙 once staged), with no text status label.
      const shiftEndBadge = driver.idleRouteStatus === 'traveling' ? '💤' : (driver.idleRouteStatus === 'arrived' && driver.overnightMode ? '🌙' : '')
      if (shiftEndBadge) {
        pill.textContent = shiftEndBadge
        element.classList.add('overnight-status')
        return
      }
      if (!driverLoad) {
        pill.textContent = ''
        return
      }
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
      if (!pill.textContent && driverLoad.tripStatus === 'loaded' && !suppressAttention) pill.textContent = driverLoad.waitingReason === 'appointment-protected' ? 'LOADED · HOLDING' : 'LOADED'
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
