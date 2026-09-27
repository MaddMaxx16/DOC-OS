import test from 'node:test'
import assert from 'node:assert/strict'
import { getFreightLinkDriverFit } from '../src/utils/freightLinkDriverFit.js'

test('FreightLink driver fit is GOOD with useful margin', () => {
  const fit = getFreightLinkDriverFit({ driveOk: true, dutyOk: true, driveAvailableMinutes: 300, driveRequiredMinutes: 180, dutyAvailableMinutes: 360, dutyRequiredMinutes: 220 })
  assert.equal(fit.label, 'GOOD')
})

test('FreightLink driver fit is TIGHT when legal but margin is small', () => {
  const fit = getFreightLinkDriverFit({ driveOk: true, dutyOk: true, driveAvailableMinutes: 220, driveRequiredMinutes: 180, dutyAvailableMinutes: 300, dutyRequiredMinutes: 220 })
  assert.equal(fit.label, 'TIGHT')
})

test('FreightLink driver fit is POOR when legal driver time cannot support the plan', () => {
  const fit = getFreightLinkDriverFit({ driveOk: false, dutyOk: true, driveAvailableMinutes: 150, driveRequiredMinutes: 180, dutyAvailableMinutes: 300, dutyRequiredMinutes: 220 })
  assert.equal(fit.label, 'POOR')
})
