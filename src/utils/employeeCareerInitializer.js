import seedCarriers from '../data/carriers.js'
import { createMetrolineEmployeeCareer } from './careerState.js'
import { establishCarrierOperationalContext } from './carrierOperationalContext.js'

export const METROLINE_EMPLOYER_ID = 'metroline'

export function initializeMetrolineEmployeeOperation({
  carriers = seedCarriers.map((carrier) => ({ ...carrier })),
  drivers = [],
  runtimePositions = {},
  gameTime = { gameDayIndex: 0, totalMinutesOfDay: 360 },
} = {}) {
  const operational = establishCarrierOperationalContext({
    carriers,
    drivers,
    runtimePositions,
    carrierId: METROLINE_EMPLOYER_ID,
    gameTime,
  })

  return {
    career: createMetrolineEmployeeCareer(),
    carriers: operational.carriers,
    drivers: operational.drivers,
    runtimePositions: operational.runtimePositions,
    carrierApplicationsById: {},
    businessDocuments: [],
  }
}
