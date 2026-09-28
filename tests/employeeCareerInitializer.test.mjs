import test from 'node:test'
import assert from 'node:assert/strict'

import seedCarriers from '../src/data/carriers.js'
import seedLoads from '../src/data/loads.js'
import mapLocations from '../src/data/mapLocations.js'
import { CAREER_MODELS, CAREER_ORIGINS } from '../src/utils/careerState.js'
import { establishCarrierOperationalContext, hasActiveCarrierRoster } from '../src/utils/carrierOperationalContext.js'
import { initializeMetrolineEmployeeOperation } from '../src/utils/employeeCareerInitializer.js'
import { getDriverScheduleConstraint } from '../src/utils/driverScheduleConstraint.js'
import { normalizeDriverHours } from '../src/utils/driverHOS.js'

const START = { gameDayIndex: 0, totalMinutesOfDay: 360 }

test('employee initializer establishes the Metroline operational contract', () => {
  const state = initializeMetrolineEmployeeOperation({ gameTime: START })
  const metroline = state.carriers.find((carrier) => carrier.id === 'metroline')
  const marcus = state.drivers.find((driver) => driver.id === 'marcus')
  const yard = mapLocations.find((location) => location.id === 'metroline-yard')

  assert.equal(state.career.model, CAREER_MODELS.EMPLOYEE)
  assert.equal(state.career.origin, CAREER_ORIGINS.METROLINE_EMPLOYEE)
  assert.equal(metroline.status, 'active')
  assert.equal(marcus.carrierId, 'metroline')
  assert.deepEqual(state.runtimePositions.marcus, { longitude: yard.longitude, latitude: yard.latitude })
  assert.deepEqual(marcus.hours, normalizeDriverHours(marcus.hours))
  assert.equal(marcus.carrierScheduleControl, true)
  assert.equal(Object.keys(marcus.workdayByDay).length, 3)
  Object.values(marcus.workdayByDay).forEach((workday) => {
    assert.equal(workday.carrierConfirmed, true)
    assert.equal(workday.scheduleSource, 'carrier')
    assert.equal(workday.confirmedCarrierId, 'metroline')
  })
})

test('employee initializer has no CarrierSource application or signed agreement dependency', () => {
  const state = initializeMetrolineEmployeeOperation({ gameTime: START })
  assert.deepEqual(state.carrierApplicationsById, {})
  assert.deepEqual(state.businessDocuments, [])
  assert.equal(state.carriers.find((carrier) => carrier.id === 'metroline').status, 'active')
  assert.equal(state.drivers.some((driver) => driver.id === 'marcus'), true)
})

test('employee state satisfies production roster and schedule prerequisites', () => {
  const state = initializeMetrolineEmployeeOperation({ gameTime: START })
  const marcus = state.drivers.find((driver) => driver.id === 'marcus')
  const doc001 = seedLoads.find((load) => load.id === 'DOC001')

  assert.equal(hasActiveCarrierRoster(state.carriers, state.drivers), true)
  assert.equal(getDriverScheduleConstraint(doc001, marcus).ok, true)
})

test('shared legacy activation contract still establishes the same roster and workdays', () => {
  const operational = establishCarrierOperationalContext({
    carriers: seedCarriers.map((carrier) => ({ ...carrier })),
    drivers: [],
    runtimePositions: {},
    carrierId: 'metroline',
    gameTime: START,
  })
  const marcus = operational.drivers.find((driver) => driver.id === 'marcus')

  assert.equal(operational.activatedCarrier.status, 'active')
  assert.equal(marcus.carrierScheduleControl, true)
  assert.equal(Object.keys(marcus.workdayByDay).length, 3)
})

test('repeated operational reconciliation preserves established HOS, workdays, and position', () => {
  const first = initializeMetrolineEmployeeOperation({ gameTime: START })
  const establishedMarcus = {
    ...first.drivers[0],
    hours: { ...first.drivers[0].hours, drivingRemainingMinutes: 515, status: 'on-duty' },
    workdayByDay: { ...first.drivers[0].workdayByDay, 7: { startMinutes: 840, endMinutes: 180, crossesMidnight: true } },
  }
  const establishedPosition = { longitude: -73.99, latitude: 40.71 }

  const second = initializeMetrolineEmployeeOperation({
    carriers: first.carriers,
    drivers: [establishedMarcus],
    runtimePositions: { marcus: establishedPosition },
    gameTime: { gameDayIndex: 4, totalMinutesOfDay: 900 },
  })

  assert.equal(second.drivers.length, 1)
  assert.equal(second.drivers[0], establishedMarcus)
  assert.equal(second.drivers[0].hours.drivingRemainingMinutes, 515)
  assert.deepEqual(second.drivers[0].workdayByDay[7], establishedMarcus.workdayByDay[7])
  assert.equal(second.runtimePositions.marcus, establishedPosition)
})
