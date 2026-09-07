import seedDrivers from '../data/drivers.js'
import seedLoads from '../data/loads.js'
import mapLocations from '../data/mapLocations.js'
import { calculateRoute } from '../services/routingService.js'
import { reconcileActiveCarrierDrivers } from '../utils/driverRoster.js'

const nowOf = (t) => (t?.gameDayIndex ?? 0) * 1440 + (t?.totalMinutesOfDay ?? 420)
const pointAlong = (route, p) => { const i = Math.min(route.length - 2, Math.floor(p * (route.length - 1))); const t = p * (route.length - 1) - i; const a = route[i]; const b = route[i + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }

const DEFAULT_PALLET_TYPES = ['heavy', 'heavy', 'standard', 'standard', 'standard', 'standard', 'fragile', 'fragile']

function normalizeDevShipment(load) {
  const existing = load.shipment || {}
  const existingManifest = Array.isArray(existing.palletManifest) ? existing.palletManifest : []
  const expectedValue = Number(existing.expectedPallets)
  const expectedPallets = Number.isFinite(expectedValue) ? expectedValue : Math.max(existingManifest.length, 8)
  const palletManifest = existingManifest.length
    ? existingManifest.map((pallet, index) => ({
        id: pallet?.id || `P${index + 1}`,
        type: pallet?.type || DEFAULT_PALLET_TYPES[index] || 'standard',
        slot: Number.isInteger(pallet?.slot) ? pallet.slot : index,
        loaded: pallet?.loaded !== false,
        damaged: Boolean(pallet?.damaged),
      }))
    : Array.from({ length: expectedPallets }, (_, index) => ({
        id: `P${index + 1}`,
        type: DEFAULT_PALLET_TYPES[index] || 'standard',
        slot: index,
        loaded: true,
        damaged: false,
      }))
  const loadedValue = Number(existing.loadedPallets)
  const loadedPallets = Number.isFinite(loadedValue) ? loadedValue : palletManifest.filter((pallet) => pallet.loaded !== false).length
  const missingValue = Number(existing.missingPallets)
  const missingPallets = Number.isFinite(missingValue) ? missingValue : Math.max(0, expectedPallets - loadedPallets)
  const damagedValue = Number(existing.damagedPallets)
  const damagedPallets = Number.isFinite(damagedValue) ? damagedValue : palletManifest.filter((pallet) => pallet.loaded !== false && pallet.damaged).length
  const misplacedValue = Number(existing.misplacedPallets)
  const misplacedPallets = Number.isFinite(misplacedValue) ? misplacedValue : 0
  return { expectedPallets, loadedPallets, missingPallets, damagedPallets, misplacedPallets, palletManifest }
}

function createPodFromShipment(shipment, now, approved = false) {
  const damage = shipment.damagedPallets > 0
    ? `${shipment.damagedPallets} pallet${shipment.damagedPallets === 1 ? '' : 's'} noted`
    : 'None'
  return {
    status: 'complete',
    receivedGameMinute: now,
    viewedGameMinute: approved ? now : null,
    signedBy: 'Jordan Rivera',
    piecesExpected: shipment.expectedPallets,
    piecesReceived: shipment.loadedPallets,
    damage,
    freightCondition: {
      source: 'pickup-shipment',
      expectedPallets: shipment.expectedPallets,
      loadedAtPickup: shipment.loadedPallets,
      missingAtPickup: shipment.missingPallets,
      damagedAtPickup: shipment.damagedPallets,
    },
    verification: approved
      ? { signature: true, pieceCount: true, damage: true, deliveryInfo: true }
      : { signature: false, pieceCount: false, damage: false, deliveryInfo: false },
    verified: approved,
    verifiedGameMinute: approved ? now : null,
    ...(approved ? { approved: true, approvedGameMinute: now } : {}),
  }
}
export async function createDevPreset(name, { gameTime, currentLoads = seedLoads, currentDrivers = seedDrivers, currentRuntimePositions = {}, currentCarriers = [], selectedLoadId = 'DOC001' } = {}) {
  const load = { ...(currentLoads.find((x) => x.id === selectedLoadId) || seedLoads.find((x) => x.id === selectedLoadId)) }; if (!load.id) throw new Error(`Unknown DEV load: ${selectedLoadId}`)
  const roster = reconcileActiveCarrierDrivers(currentDrivers, currentCarriers); const driver = roster.find((x) => x.id === 'marcus'); if (name !== 'available' && !driver) throw new Error('Activate Metroline before using driver load presets.'); const pickup = mapLocations.find((x) => x.id === load.pickupLocationId); const delivery = mapLocations.find((x) => x.id === load.deliveryLocationId); const now = nowOf(gameTime); const base = { selectedMarket: 'new-york', gameTime: gameTime || { gameDayIndex: 0, totalMinutesOfDay: 420 }, loads: [load], drivers: roster, carriers: currentCarriers, runtimePositions: { ...currentRuntimePositions }, runtimeProgress: null, stage: 'game' }; const withDriver = (position) => ({ ...base, drivers: roster.map((x) => x.id === 'marcus' ? { ...x, status: 'unavailable', assignedLoadId: load.id } : x), runtimePositions: position ? { ...currentRuntimePositions, marcus: position } : { ...currentRuntimePositions } })
  if (name === 'available') { load.status = 'available'; load.tripStatus = null; load.assignedDriverId = null; load.candidateDriverId = null; return { ...base, drivers: roster.map((x) => x.id === 'marcus' && x.assignedLoadId === load.id ? { ...x, status: 'available', assignedLoadId: null } : x) } }
  if (name === 'accepted') { load.status = 'accepted'; load.tripStatus = 'assigned'; load.assignedDriverId = 'marcus'; load.carrierId = driver.carrierId ?? null; return withDriver() }
  if (name === 'waiting-at-pickup' || name === 'loaded') { load.status = 'accepted'; load.tripStatus = name === 'loaded' ? 'loaded' : 'waiting-at-pickup'; load.assignedDriverId = 'marcus'; if (name === 'loaded') load.shipment = normalizeDevShipment(load); return withDriver({ longitude: pickup.longitude, latitude: pickup.latitude }) }
  if (name === 'at-delivery') { load.status = 'accepted'; load.tripStatus = 'at-delivery'; load.assignedDriverId = 'marcus'; load.shipment = normalizeDevShipment(load); return withDriver({ longitude: delivery.longitude, latitude: delivery.latitude }) }
  if (name === 'pod-ready') { load.status = 'accepted'; load.tripStatus = 'awaiting-pod'; load.assignedDriverId = 'marcus'; load.shipment = normalizeDevShipment(load); load.pod = createPodFromShipment(load.shipment, now, false); return withDriver({ longitude: delivery.longitude, latitude: delivery.latitude }) }
  if (name === 'load-complete') { load.status = 'completed'; load.tripStatus = 'completed'; load.assignedDriverId = null; load.completedDriverId = 'marcus'; load.shipment = normalizeDevShipment(load); load.pod = createPodFromShipment(load.shipment, now, true); return { ...base, drivers: roster.map((x) => x.id === 'marcus' ? { ...x, status: 'available', assignedLoadId: null } : x), runtimePositions: { ...currentRuntimePositions, marcus: { longitude: delivery.longitude, latitude: delivery.latitude } } } }
  if (name === 'en-route-pickup' || name === 'en-route-delivery') { const origin = name === 'en-route-pickup' ? (currentRuntimePositions.marcus || driver) : pickup; const destination = name === 'en-route-pickup' ? pickup : delivery; const route = await calculateRoute(origin, destination); load.status = 'accepted'; load.assignedDriverId = 'marcus'; load.tripStatus = name; if (name === 'en-route-pickup') { load.planningStatus = 'route-ready'; load.plannedDeadheadRouteGeometry = route.routeShape; load.plannedDeadheadMiles = route.distanceMiles; load.plannedDeadheadDriveTimeMinutes = route.durationMinutes; load.selectedDeadheadRouteId = 'recommended'; load.departureGameMinute = now } else { load.deliveryPlanningStatus = 'route-ready'; load.plannedLoadedRouteGeometry = route.routeShape; load.plannedLoadedMiles = route.distanceMiles; load.plannedLoadedDriveTimeMinutes = route.durationMinutes; load.selectedLoadedRouteId = 'recommended'; load.deliveryDepartureGameMinute = now } const p = pointAlong(route.routeShape, 0.01); return { ...withDriver({ longitude: p[0], latitude: p[1] }), runtimeProgress: 0.01 } }
  throw new Error(`Unknown DEV load preset: ${name}`)
}
