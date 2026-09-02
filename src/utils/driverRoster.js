import seedDrivers from '../data/drivers.js'

export function reconcileActiveCarrierDrivers(drivers = [], carriers = []) {
  const result = [...drivers]
  carriers.filter((carrier) => carrier.status === 'active').flatMap((carrier) => carrier.driverIds || []).forEach((id) => {
    if (!result.some((driver) => driver.id === id)) {
      const seed = seedDrivers.find((driver) => driver.id === id)
      if (seed) result.push({ ...seed })
    }
  })
  return result
}
