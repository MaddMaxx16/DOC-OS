const ROUTE_URL = 'https://api.heigit.org/openrouteservice/v2/directions/driving-hgv/geojson'
const REQUEST_TIMEOUT_MS = 8000
const HARD_ROUTE_TIMEOUT_MS = 10000
const FALLBACK_SPEED_MPH = 45
const ROAD_DISTANCE_MULTIPLIER = 1.18
const inFlightRoutes = new Map()
const routeCache = new Map()

function toRadians(value) {
  return value * (Math.PI / 180)
}

export function getLocationDistanceMiles(origin, destination) {
  const earthRadiusMiles = 3958.7613
  const lat1 = toRadians(origin.latitude)
  const lat2 = toRadians(destination.latitude)
  const deltaLat = toRadians(destination.latitude - origin.latitude)
  const deltaLon = toRadians(destination.longitude - origin.longitude)
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function pointAsLocation(point) {
  if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null
  return { longitude: point[0], latitude: point[1] }
}

export function getRouteEndpointDistanceMiles(routeShape, endpoint) {
  if (!Array.isArray(routeShape) || !routeShape.length || !endpoint) return Number.POSITIVE_INFINITY
  const first = pointAsLocation(routeShape[0])
  if (!first || !Number.isFinite(endpoint.longitude) || !Number.isFinite(endpoint.latitude)) return Number.POSITIVE_INFINITY
  return getLocationDistanceMiles(first, endpoint)
}

// AV2.3.3: Routing providers/fallbacks must never decide movement direction.
// Compare the COMPLETE endpoint error for both possible orientations and keep
// the geometry whose first point belongs to origin and last point to destination.
export function normalizeRouteGeometry(routeShape, origin, destination) {
  if (!Array.isArray(routeShape) || routeShape.length < 2 || !origin || !destination) return routeShape
  const first = pointAsLocation(routeShape[0])
  const last = pointAsLocation(routeShape[routeShape.length - 1])
  if (!first || !last) return routeShape

  const normalError = getLocationDistanceMiles(first, origin) + getLocationDistanceMiles(last, destination)
  const reversedError = getLocationDistanceMiles(first, destination) + getLocationDistanceMiles(last, origin)
  if (reversedError + 0.001 < normalError) return [...routeShape].reverse()
  return routeShape
}

function normalizeRoute(route, origin, destination) {
  if (!route || !Array.isArray(route.routeShape)) return route
  const routeShape = normalizeRouteGeometry(route.routeShape, origin, destination)
  return routeShape === route.routeShape ? route : { ...route, routeShape }
}

function createFallbackRoute(origin, destination, reason = 'routing-unavailable') {
  const straightLineMiles = getLocationDistanceMiles(origin, destination)
  const distanceMiles = Math.max(0.1, straightLineMiles * ROAD_DISTANCE_MULTIPLIER)
  const durationMinutes = Math.max(1, Math.round((distanceMiles / FALLBACK_SPEED_MPH) * 60))
  return {
    distanceMiles,
    durationSeconds: durationMinutes * 60,
    durationMinutes,
    routeShape: [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
    ],
    source: 'fallback',
    fallbackReason: reason,
  }
}

function hardTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(`Route calculation exceeded ${ms}ms`)
      error.name = 'RouteHardTimeoutError'
      reject(error)
    }, ms)
  })
}

export async function calculateRoute(origin, destination) {
  if (!origin || !destination) throw new Error('Route origin and destination are required')

  const key = `ors-driving-hgv:${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`
  if (routeCache.has(key)) return routeCache.get(key)
  if (inFlightRoutes.has(key)) {
    console.debug('DOC OS ROUTE DEDUPED', key)
    return inFlightRoutes.get(key)
  }

  const routePromise = (async () => {
    if (!import.meta.env.VITE_ORS_API_KEY) {
      const fallback = normalizeRoute(createFallbackRoute(origin, destination, 'missing-api-key'), origin, destination)
      routeCache.set(key, fallback)
      console.warn('DOC OS ROUTE FALLBACK', { key, reason: fallback.fallbackReason })
      return fallback
    }

    try {
      const route = normalizeRoute(await Promise.race([
        requestRoute(origin, destination, key),
        hardTimeout(HARD_ROUTE_TIMEOUT_MS),
      ]), origin, destination)
      routeCache.set(key, route)
      return route
    } catch (error) {
      const fallback = normalizeRoute(createFallbackRoute(origin, destination, error?.name || 'routing-error'), origin, destination)
      routeCache.set(key, fallback)
      console.warn('DOC OS ROUTE FALLBACK', {
        key,
        reason: fallback.fallbackReason,
        message: error?.message,
      })
      return fallback
    }
  })()

  inFlightRoutes.set(key, routePromise)
  try {
    return await routePromise
  } finally {
    if (inFlightRoutes.get(key) === routePromise) inFlightRoutes.delete(key)
  }
}

async function requestRoute(origin, destination, key) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    console.debug('DOC OS ORS ROUTE HTTP ATTEMPT', { key, attempt, origin, destination, profile: 'driving-hgv' })
    try {
      const response = await fetch(ROUTE_URL, {
        method: 'POST',
        headers: {
          Authorization: import.meta.env.VITE_ORS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/geo+json',
        },
        body: JSON.stringify({
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
          ],
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error('DOC OS ORS ROUTE FAILURE', {
          status: response.status,
          statusText: response.statusText,
          responseBody: body,
        })
        if (![429, 502, 503, 504].includes(response.status) || attempt === 3) {
          throw new Error(`ORS route failed (${response.status} ${response.statusText})`)
        }
      } else {
        const data = await response.json()
        const feature = data.features?.[0]
        const summary = feature?.properties?.summary
        const coordinates = feature?.geometry?.coordinates
        if (!summary || !coordinates?.length) throw new Error('ORS response missing route data')

        const route = {
          distanceMiles: summary.distance / 1609.344,
          durationSeconds: summary.duration,
          durationMinutes: Math.round(summary.duration / 60),
          routeShape: coordinates,
          source: 'ors',
        }
        console.debug('DOC OS ORS ROUTE SUCCESS', {
          distanceMiles: route.distanceMiles,
          durationMinutes: route.durationMinutes,
          coordinateCount: coordinates.length,
        })
        return route
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('DOC OS ORS ROUTE TIMEOUT', { key, attempt, origin, destination })
      }
      if (attempt === 3) throw error
    } finally {
      clearTimeout(timeout)
    }

    await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 1500 : 3000))
  }

  throw new Error('ORS route unavailable')
}
