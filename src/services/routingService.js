const ROUTE_URL = 'https://api.heigit.org/openrouteservice/v2/directions/driving-hgv/geojson'
const TIMEOUT_MS = 8000
const inFlightRoutes = new Map()
const routeCache = new Map()

export async function calculateRoute(origin, destination) {
  const key = `ors-driving-hgv:${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`
  if (!import.meta.env.VITE_ORS_API_KEY) throw new Error('Missing VITE_ORS_API_KEY. Add it to .env.local and restart Vite.')
  if (routeCache.has(key)) return routeCache.get(key)
  if (inFlightRoutes.has(key)) { console.debug('DOC OS ORS ROUTE DEDUPED', key); return inFlightRoutes.get(key) }
  const request = requestRoute(origin, destination, key)
  inFlightRoutes.set(key, request)
  return request.finally(() => inFlightRoutes.delete(key))
}

async function requestRoute(origin, destination, key) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    console.debug('DOC OS ORS ROUTE HTTP ATTEMPT', { key, attempt, origin, destination, profile: 'driving-hgv' })
    try {
      const response = await fetch(ROUTE_URL, { method: 'POST', headers: { Authorization: import.meta.env.VITE_ORS_API_KEY, 'Content-Type': 'application/json', Accept: 'application/geo+json' }, body: JSON.stringify({ coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] }), signal: controller.signal })
      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error('DOC OS ORS ROUTE FAILURE', { status: response.status, statusText: response.statusText, responseBody: body })
        if (![429, 502, 503, 504].includes(response.status) || attempt === 3) throw new Error(`ORS route failed (${response.status} ${response.statusText})`)
      } else {
        const data = await response.json(); const feature = data.features?.[0]; const summary = feature?.properties?.summary; const coordinates = feature?.geometry?.coordinates
        if (!summary || !coordinates?.length) throw new Error('ORS response missing route data')
        const route = { distanceMiles: summary.distance / 1609.344, durationSeconds: summary.duration, durationMinutes: Math.round(summary.duration / 60), routeShape: coordinates }
        routeCache.set(key, route)
        console.debug('DOC OS ORS ROUTE SUCCESS', { distanceMiles: route.distanceMiles, durationMinutes: route.durationMinutes, coordinateCount: coordinates.length })
        return route
      }
    } catch (error) {
      if (error.name === 'AbortError') console.error('DOC OS ORS ROUTE TIMEOUT', { key, attempt, origin, destination })
      if (attempt === 3) throw error
    } finally { clearTimeout(timeout) }
    await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 1500 : 3000))
  }
  throw new Error('ORS route unavailable')
}
