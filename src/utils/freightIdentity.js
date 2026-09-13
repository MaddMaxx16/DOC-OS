import mapLocations from '../data/mapLocations.js'

const COMMODITIES = [
  'Retail Replenishment',
  'Grocery Replenishment',
  'Wireless Devices & Accessories',
  'Pharmacy & Wellness Stock',
  'Home Improvement Inventory',
  'Auto Parts Replenishment',
  'Beverage Distribution',
  'Consumer Electronics',
  'Pet & Home Inventory',
  'General Merchandise',
]

function hash(value = '') {
  let h = 2166136261
  for (const char of String(value)) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function getFreightCommodity(load) {
  if (!load) return 'General Freight'
  if (load.commodityLabel) return load.commodityLabel
  return COMMODITIES[hash(load.id || load.loadNumber || '') % COMMODITIES.length]
}

export function getFreightFacility(load, role = 'pickup') {
  const id = role === 'delivery' ? load?.deliveryLocationId : load?.pickupLocationId
  return mapLocations.find((location) => location.id === id) || null
}

export function getFreightBusinessName(load, role = 'pickup') {
  return getFreightFacility(load, role)?.name || (role === 'delivery' ? 'Receiver' : 'Shipper')
}

export function getFreightRouteName(load) {
  return `${getFreightBusinessName(load, 'pickup')} → ${getFreightBusinessName(load, 'delivery')}`
}

export const getFreightLaneLabel = getFreightRouteName


export function getFreightReference(load) {
  return load?.loadNumber || load?.id || 'LOAD'
}

export function getFreightShortBusinessName(load, role = 'pickup') {
  const name = getFreightBusinessName(load, role)
  return name
    .replace(/\b(Distribution|Warehouse|Regional|Fulfillment|Supply|Center|Centre|DC|Terminal|Hub)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ')
    .toUpperCase()
}
