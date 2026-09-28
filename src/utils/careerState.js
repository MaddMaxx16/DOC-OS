export const CAREER_STATE_VERSION = 1

export const CAREER_MODELS = Object.freeze({
  INDEPENDENT: 'independent',
  EMPLOYEE: 'employee',
})

export const CAREER_ORIGINS = Object.freeze({
  LEGACY_INDEPENDENT: 'legacy_independent',
  METROLINE_EMPLOYEE: 'metroline_employee',
})

export function createLegacyIndependentCareer() {
  return {
    version: CAREER_STATE_VERSION,
    model: CAREER_MODELS.INDEPENDENT,
    origin: CAREER_ORIGINS.LEGACY_INDEPENDENT,
  }
}

export function createMetrolineEmployeeCareer() {
  return {
    version: CAREER_STATE_VERSION,
    model: CAREER_MODELS.EMPLOYEE,
    origin: CAREER_ORIGINS.METROLINE_EMPLOYEE,
  }
}

export function normalizeCareerState(value) {
  if (
    value?.model === CAREER_MODELS.EMPLOYEE &&
    value?.origin === CAREER_ORIGINS.METROLINE_EMPLOYEE
  ) {
    return createMetrolineEmployeeCareer()
  }

  if (
    value?.model === CAREER_MODELS.INDEPENDENT &&
    value?.origin === CAREER_ORIGINS.LEGACY_INDEPENDENT
  ) {
    return createLegacyIndependentCareer()
  }

  // Missing, incomplete, and unknown metadata must never reinterpret an
  // established operation as the future employee career.
  return createLegacyIndependentCareer()
}
