import { getCarrierRelationshipLabel } from './carrierAgreement.js'

export const CARRIER_RELATIONSHIP_STATES = Object.freeze({
  LOCKED: 'LOCKED',
  AVAILABLE: 'AVAILABLE',
  ACTIVE: 'ACTIVE',
  AT_RISK: 'AT_RISK',
  PROBATION: 'PROBATION',
  TERMINATED: 'TERMINATED',
})

export const CARRIER_APPLICATION_STATES = Object.freeze({
  NONE: 'NONE',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
})

function inferRelationshipState(carrier, application) {
  if (carrier?.status === 'active' || application?.status === 'ACCEPTED') return CARRIER_RELATIONSHIP_STATES.ACTIVE
  return CARRIER_RELATIONSHIP_STATES.AVAILABLE
}

function inferApplicationState(application) {
  if (!application?.status) return CARRIER_APPLICATION_STATES.NONE
  if (application.status === 'OFFER_RECEIVED') return CARRIER_APPLICATION_STATES.APPROVED
  if (Object.values(CARRIER_APPLICATION_STATES).includes(application.status)) return application.status
  return CARRIER_APPLICATION_STATES.NONE
}

export function buildCarrierCareerById(carriers = [], applicationsById = {}, savedCareerById = {}) {
  return carriers.reduce((result, carrier) => {
    const saved = savedCareerById?.[carrier.id] || {}
    const application = applicationsById?.[carrier.id]
    const relationshipScore = Number.isFinite(Number(saved.relationshipScore)) ? Number(saved.relationshipScore) : Number(carrier.relationshipScore ?? 50)
    result[carrier.id] = {
      relationshipState: saved.relationshipState || inferRelationshipState(carrier, application),
      applicationState: saved.applicationState || inferApplicationState(application),
      carrierLevel: Number.isFinite(Number(saved.carrierLevel)) ? Number(saved.carrierLevel) : 0,
      carrierXp: Number.isFinite(Number(saved.carrierXp)) ? Number(saved.carrierXp) : 0,
      relationshipScore,
      standing: saved.standing || getCarrierRelationshipLabel(relationshipScore),
      agreementAccepted: saved.agreementAccepted ?? (carrier.status === 'active' || application?.status === 'ACCEPTED'),
      agreementAcceptedGameMinute: saved.agreementAcceptedGameMinute ?? application?.acceptedGameMinute ?? null,
      strikeCount: Number.isFinite(Number(saved.strikeCount)) ? Number(saved.strikeCount) : 0,
      performanceHistory: Array.isArray(saved.performanceHistory) ? saved.performanceHistory : [],
    }
    return result
  }, {})
}

export function mergeCarrierCareerEntry(current = {}, carrier, patch = {}) {
  const relationshipScore = Number.isFinite(Number(patch.relationshipScore)) ? Number(patch.relationshipScore) : Number(current.relationshipScore ?? carrier?.relationshipScore ?? 50)
  return {
    relationshipState: current.relationshipState || CARRIER_RELATIONSHIP_STATES.AVAILABLE,
    applicationState: current.applicationState || CARRIER_APPLICATION_STATES.NONE,
    carrierLevel: Number(current.carrierLevel || 0),
    carrierXp: Number(current.carrierXp || 0),
    relationshipScore,
    standing: current.standing || getCarrierRelationshipLabel(relationshipScore),
    agreementAccepted: Boolean(current.agreementAccepted),
    agreementAcceptedGameMinute: current.agreementAcceptedGameMinute ?? null,
    strikeCount: Number(current.strikeCount || 0),
    performanceHistory: Array.isArray(current.performanceHistory) ? current.performanceHistory : [],
    ...patch,
    relationshipScore,
    standing: patch.standing || getCarrierRelationshipLabel(relationshipScore),
  }
}
