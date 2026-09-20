// Shared DOC OS route sampler.
// Every movement authority must use the same distance-weighted parameterization
// so authoritative runtime state and visual marker state resolve to the same point.
const metricsCache = new WeakMap()

function getMetrics(route) {
  if (!Array.isArray(route) || route.length < 2) return null
  const cached = metricsCache.get(route)
  if (cached) return cached

  const cumulative = [0]
  let total = 0
  for (let index = 1; index < route.length; index += 1) {
    const a = route[index - 1]
    const b = route[index]
    if (!Array.isArray(a) || !Array.isArray(b)) {
      cumulative.push(total)
      continue
    }
    const avgLatRadians = ((a[1] + b[1]) / 2) * Math.PI / 180
    const dLng = (b[0] - a[0]) * Math.cos(avgLatRadians)
    const dLat = b[1] - a[1]
    total += Math.hypot(dLng, dLat)
    cumulative.push(total)
  }

  const metrics = { cumulative, total }
  metricsCache.set(route, metrics)
  return metrics
}

export function sampleRoutePosition(route, progress) {
  const metrics = getMetrics(route)
  if (!metrics) return null
  if (metrics.total <= 0) return Array.isArray(route[0]) ? [...route[0]] : null

  const clamped = Math.max(0, Math.min(1, Number(progress) || 0))
  const target = metrics.total * clamped
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
  if (!Array.isArray(a) || !Array.isArray(b)) return null
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount]
}

export function sampleRoutePoint(route, progress) {
  const point = sampleRoutePosition(route, progress)
  return point ? { longitude: point[0], latitude: point[1] } : null
}
