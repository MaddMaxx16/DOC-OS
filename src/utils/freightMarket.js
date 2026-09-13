import mapLocations from '../data/mapLocations.js'

export const MIN_AVAILABLE_MARKET_LOADS = 10
export const HOURLY_MARKET_ADDITIONS = 2
export const INITIAL_MARKET_END_HOUR = 20

const FACILITY_IDS = mapLocations
  .filter((location) => ['pickup', 'delivery', 'facility'].includes(location.type))
  .map((location) => location.id)
const REGIONAL_FACILITY_IDS = ['keystone-retail-pittsburgh', 'penn-valley-allentown', 'liberty-home-philadelphia']
const LOCAL_FACILITY_IDS = FACILITY_IDS.filter((id) => !REGIONAL_FACILITY_IDS.includes(id))

function hashNumber(value) {
  let hash = 2166136261
  const text = String(value)
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function pick(list, seed) { return list[hashNumber(seed) % list.length] }
function snapHalfHour(minute) { return Math.round(minute / 30) * 30 }

function haversineMiles(a, b) {
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusMiles = 3958.8
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h))
}

function makeGeneratedLoad({ gameDayIndex, pickupAbsolute, key, postedGameMinute }) {
  const longHaul = hashNumber(`haul-${key}`) % 7 === 0
  const pickupPool = longHaul ? LOCAL_FACILITY_IDS : FACILITY_IDS
  const deliveryPool = longHaul ? REGIONAL_FACILITY_IDS : FACILITY_IDS
  const pickupLocationId = pick(pickupPool, `pickup-${key}`)
  let deliveryLocationId = pick(deliveryPool, `delivery-${key}`)
  if (deliveryLocationId === pickupLocationId) {
    const pickupIndex = FACILITY_IDS.indexOf(pickupLocationId)
    deliveryLocationId = FACILITY_IDS[(pickupIndex + 1 + (hashNumber(`offset-${key}`) % (FACILITY_IDS.length - 1))) % FACILITY_IDS.length]
  }

  const pickup = mapLocations.find((location) => location.id === pickupLocationId)
  const delivery = mapLocations.find((location) => location.id === deliveryLocationId)
  const straightMiles = haversineMiles(pickup, delivery)
  const listedMiles = Math.max(8.5, Math.round(straightMiles * 1.28 * 10) / 10)
  const pickupWindowStartAbsolute = snapHalfHour(pickupAbsolute)
  const pickupWindowEndAbsolute = pickupWindowStartAbsolute + 60
  const driveMinutes = Math.max(35, Math.round((listedMiles / 34) * 60))
  let deliveryWindowStartAbsolute = snapHalfHour(pickupWindowEndAbsolute + driveMinutes + 30)
  if (longHaul && deliveryWindowStartAbsolute < pickupWindowStartAbsolute + 8 * 60) {
    deliveryWindowStartAbsolute = snapHalfHour(pickupWindowStartAbsolute + 10 * 60)
  }
  const deliveryWindowEndAbsolute = deliveryWindowStartAbsolute + 90
  const ratePerMile = 2.15 + (hashNumber(`rpm-${key}`) % 171) / 100
  const rate = Math.max(475, Math.round((listedMiles * ratePerMile + 390) / 25) * 25)
  const serial = (hashNumber(`number-${key}`) % 90000) + 10000
  const pickupDayIndex = Math.floor(pickupWindowStartAbsolute / 1440)
  const deliveryDayIndex = Math.floor(deliveryWindowStartAbsolute / 1440)

  return {
    id: `MKT-${key}`,
    loadNumber: `LD-${serial}`,
    marketGenerated: true,
    marketRefreshKey: `${gameDayIndex}-${Math.floor(postedGameMinute / 60)}`,
    postedGameMinute,
    marketPostMinutes: postedGameMinute % 1440,
    pickupDayIndex,
    deliveryDayIndex,
    pickupLocationId,
    deliveryLocationId,
    pickupWindowStartMinutes: pickupWindowStartAbsolute % 1440,
    pickupWindowEndMinutes: pickupWindowEndAbsolute % 1440,
    deliveryWindowStartMinutes: deliveryWindowStartAbsolute % 1440,
    deliveryWindowEndMinutes: deliveryWindowEndAbsolute % 1440,
    rate,
    listedMiles,
    haulType: longHaul ? 'overnight-regional' : 'regional',
    plannedMiles: null,
    plannedDriveTimeMinutes: null,
    selectedRouteId: null,
    candidateDriverId: null,
    assignedDriverId: null,
    status: 'available',
  }
}

function isActionableAvailable(load, now) {
  if (load.status !== 'available') return false
  if (Number.isFinite(load.postedGameMinute) && load.postedGameMinute > now) return false
  if (!Number.isFinite(load.pickupWindowEndMinutes)) return true
  const pickupDayIndex = Number.isFinite(load.pickupDayIndex) ? load.pickupDayIndex : Math.floor(now / 1440)
  return pickupDayIndex * 1440 + load.pickupWindowEndMinutes >= now
}

function hasHourCoverage(loads, gameDayIndex, hour, now) {
  return loads.some((load) => {
    if (!isActionableAvailable(load, now)) return false
    if ((load.pickupDayIndex ?? gameDayIndex) !== gameDayIndex) return false
    return Math.floor((load.pickupWindowStartMinutes ?? -60) / 60) === hour
  })
}

export function refreshFreightMarket(loads, gameTime) {
  const gameDayIndex = Number(gameTime?.gameDayIndex || 0)
  const totalMinutesOfDay = Number(gameTime?.totalMinutesOfDay || 0)
  const hourBucket = Math.floor(totalMinutesOfDay / 60)
  const refreshMinute = gameDayIndex * 1440 + hourBucket * 60
  const now = gameDayIndex * 1440 + totalMinutesOfDay
  const existingIds = new Set(loads.map((load) => load.id))
  const additions = []

  // AV2.9.7: FreightLink is a planning board. From the start of operations the
  // player can see at least one actionable opportunity in every clock hour through
  // 8 PM. Each hourly refresh extends that visible planning horizon one hour later.
  const horizonHour = INITIAL_MARKET_END_HOUR + Math.max(0, hourBucket - 7)
  const firstHour = Math.max(8, hourBucket)
  for (let absoluteHour = gameDayIndex * 24 + firstHour; absoluteHour <= gameDayIndex * 24 + horizonHour; absoluteHour += 1) {
    const targetDayIndex = Math.floor(absoluteHour / 24)
    const targetHour = absoluteHour % 24
    if (targetDayIndex !== gameDayIndex) break
    if (hasHourCoverage([...loads, ...additions], gameDayIndex, targetHour, now)) continue
    const minuteChoice = hashNumber(`half-${gameDayIndex}-${targetHour}`) % 2 ? 30 : 0
    const pickupAbsolute = gameDayIndex * 1440 + targetHour * 60 + minuteChoice
    const key = `${gameDayIndex}-coverage-${String(targetHour).padStart(2, '0')}-${String(minuteChoice).padStart(2, '0')}`
    const candidate = makeGeneratedLoad({ gameDayIndex, pickupAbsolute, key, postedGameMinute: refreshMinute })
    if (!existingIds.has(candidate.id)) { additions.push(candidate); existingIds.add(candidate.id) }
  }

  // Fresh freight still posts every hour. These additions use clean :00/:30
  // appointments and target later portions of the visible board instead of hiding
  // the rest of the day until the player waits for refreshes.
  const alreadyPostedThisHour = loads.filter((load) => load.marketRefreshKey === `${gameDayIndex}-${hourBucket}`).length
  const hourlyNeeded = Math.max(0, HOURLY_MARKET_ADDITIONS - alreadyPostedThisHour)
  for (let slot = 0; slot < hourlyNeeded; slot += 1) {
    const targetHour = Math.min(23, Math.max(hourBucket + 2 + slot, INITIAL_MARKET_END_HOUR + Math.max(0, hourBucket - 7) - slot))
    const minuteChoice = slot % 2 === 0 ? 0 : 30
    const pickupAbsolute = gameDayIndex * 1440 + targetHour * 60 + minuteChoice
    const key = `${gameDayIndex}-refresh-${String(hourBucket).padStart(2, '0')}-${slot}`
    const candidate = makeGeneratedLoad({ gameDayIndex, pickupAbsolute, key, postedGameMinute: refreshMinute })
    if (!existingIds.has(candidate.id)) { additions.push(candidate); existingIds.add(candidate.id) }
  }

  const actionableCount = [...loads, ...additions].filter((load) => isActionableAvailable(load, now)).length
  let floorSlot = 0
  while (actionableCount + floorSlot < MIN_AVAILABLE_MARKET_LOADS && floorSlot < 20) {
    const pickupAbsolute = snapHalfHour(now + 90 + floorSlot * 30)
    const key = `${gameDayIndex}-floor-${hourBucket}-${floorSlot}`
    const candidate = makeGeneratedLoad({ gameDayIndex, pickupAbsolute, key, postedGameMinute: refreshMinute })
    if (!existingIds.has(candidate.id)) { additions.push(candidate); existingIds.add(candidate.id); floorSlot += 1 } else floorSlot += 1
  }

  return additions.length ? [...loads, ...additions] : loads
}
