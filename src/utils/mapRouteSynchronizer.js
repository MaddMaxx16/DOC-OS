const EMPTY_ROUTE_DATA = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }

function routeData(coordinates) {
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }
}

export function syncActiveRouteVisual(map, snapshot) {
  if (!map?.isStyleLoaded?.()) return false
  const coordinates = Array.isArray(snapshot?.coordinates) ? snapshot.coordinates : []
  const style = snapshot?.style
  let source = map.getSource('active-route')

  if (!source) {
    if (coordinates.length < 2) return true
    map.addSource('active-route', { type: 'geojson', data: routeData(coordinates) })
    source = map.getSource('active-route')
  } else {
    source.setData(coordinates.length >= 2 ? routeData(coordinates) : EMPTY_ROUTE_DATA)
  }

  if (coordinates.length >= 2 && !map.getLayer('active-route-line')) {
    map.addLayer({
      id: 'active-route-line',
      type: 'line',
      source: 'active-route',
      paint: {
        'line-color': style.color,
        'line-width': style.width,
        'line-opacity': style.opacity,
        'line-dasharray': style.dasharray,
      },
      layout: { 'line-join': 'round', 'line-cap': 'round' },
    })
  }

  if (style && map.getLayer('active-route-line')) {
    map.setPaintProperty('active-route-line', 'line-color', style.color)
    map.setPaintProperty('active-route-line', 'line-width', style.width)
    map.setPaintProperty('active-route-line', 'line-opacity', style.opacity)
    map.setPaintProperty('active-route-line', 'line-dasharray', style.dasharray)
  }
  return true
}

export function startActiveRouteVisualSync({ map, getSnapshot, requestFrame, cancelFrame, setTimer, clearTimer, retryDelay = 120 }) {
  let stopped = false
  const attempt = () => {
    if (stopped) return false
    return syncActiveRouteVisual(map, getSnapshot())
  }
  const frameId = requestFrame(attempt)
  const timerId = setTimer(attempt, retryDelay)
  map.on('idle', attempt)
  map.on('styledata', attempt)
  attempt()

  return () => {
    stopped = true
    cancelFrame(frameId)
    clearTimer(timerId)
    map.off('idle', attempt)
    map.off('styledata', attempt)
  }
}

