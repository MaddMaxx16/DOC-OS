const ROUTE_URL = 'https://valhalla1.openstreetmap.de/route'

export function decodePolyline6(encoded) {
  const coordinates = []
  let index = 0
  let latitude = 0
  let longitude = 0

  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let byte
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
    latitude += (result & 1) ? ~(result >> 1) : result >> 1
    result = 0; shift = 0
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
    longitude += (result & 1) ? ~(result >> 1) : result >> 1
    coordinates.push([longitude / 1e6, latitude / 1e6])
  }
  return coordinates
}

export async function calculateRoute(pickup, delivery) {
  const response = await fetch(ROUTE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: [
        { lat: pickup.latitude, lon: pickup.longitude },
        { lat: delivery.latitude, lon: delivery.longitude },
      ],
      costing: 'truck',
      units: 'miles',
    }),
  })
  if (!response.ok) throw new Error(`Valhalla request failed: ${response.status}`)
  const data = await response.json()
  const summary = data.trip?.summary
  const shape = data.trip?.legs?.[0]?.shape
  if (!summary || !shape) throw new Error('Valhalla response missing route data')
  return {
    distanceMiles: summary.length,
    durationSeconds: summary.time,
    durationMinutes: Math.round(summary.time / 60),
    routeShape: decodePolyline6(shape),
  }
}
