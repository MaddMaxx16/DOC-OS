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

export const CARRIER_XP_PER_LEVEL = 300

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

export function getCarrierLevelFromXp(carrierXp = 0) {
  const xp = Math.max(0, Number(carrierXp || 0))
  return Math.floor(xp / CARRIER_XP_PER_LEVEL) + 1
}

export function getCarrierRelationshipState({ score = 50, strikeCount = 0, active = true } = {}) {
  if (!active) return CARRIER_RELATIONSHIP_STATES.AVAILABLE
  const normalizedScore = Number(score || 0)
  const strikes = Number(strikeCount || 0)
  if (strikes >= 2 || normalizedScore < 25) return CARRIER_RELATIONSHIP_STATES.PROBATION
  if (strikes >= 1 || normalizedScore < 40) return CARRIER_RELATIONSHIP_STATES.AT_RISK
  return CARRIER_RELATIONSHIP_STATES.ACTIVE
}

export function getCarrierRelationshipStateLabel(state) {
  if (state === CARRIER_RELATIONSHIP_STATES.AT_RISK) return 'AT RISK'
  if (state === CARRIER_RELATIONSHIP_STATES.PROBATION) return 'PROBATION'
  if (state === CARRIER_RELATIONSHIP_STATES.TERMINATED) return 'TERMINATED'
  if (state === CARRIER_RELATIONSHIP_STATES.AVAILABLE) return 'AVAILABLE'
  if (state === CARRIER_RELATIONSHIP_STATES.LOCKED) return 'LOCKED'
  return 'ACTIVE'
}

function performanceGrade({ loadsCompleted, serviceWindowsMet, serviceWindowsTotal, exceptionLoads }) {
  if (!loadsCompleted) return '—'
  const ratio = serviceWindowsTotal > 0 ? serviceWindowsMet / serviceWindowsTotal : 0
  if (ratio === 1 && exceptionLoads === 0) return 'A'
  if (ratio >= 0.75 && exceptionLoads === 0) return 'B'
  if (ratio >= 0.5 && exceptionLoads <= 1) return 'C'
  if (ratio > 0 && exceptionLoads <= 1) return 'D'
  return 'F'
}

function carrierXpGainForReview({ loadsCompleted, serviceWindowsMet, exceptionLoads, relationshipChange }) {
  if (!loadsCompleted) return 0
  const loadXp = loadsCompleted * 40
  const serviceXp = serviceWindowsMet * 15
  const cleanServiceBonus = exceptionLoads === 0 ? 20 : 0
  const relationshipBonus = Math.max(0, Number(relationshipChange || 0)) * 5
  return loadXp + serviceXp + cleanServiceBonus + relationshipBonus
}

function strikeReasonForReview({ grade, serviceWindowsMet, serviceWindowsTotal, exceptionLoads }) {
  if (grade !== 'F') return null
  if (exceptionLoads > 0 && serviceWindowsMet === 0) return 'Critical service and freight exceptions'
  if (serviceWindowsTotal > 0 && serviceWindowsMet === 0) return 'Pickup and delivery service windows missed'
  if (exceptionLoads > 0) return 'Repeated freight exceptions'
  return 'Critical service failure'
}

export function applyCarrierPerformanceReview({ career = {}, carrier, breakdown, operationDay, reviewedGameMinute }) {
  const history = Array.isArray(career.performanceHistory) ? career.performanceHistory : []
  const reviewId = `day-${operationDay}`
  const existingReview = history.find((item) => item.id === reviewId || item.operationDay === operationDay)
  if (existingReview) {
    return {
      patch: {
        ...career,
        performanceHistory: history,
      },
      review: existingReview,
      isNewReview: false,
    }
  }

  const loadsCompleted = Number(breakdown?.loadsCompleted || 0)
  const onTimePickups = Number(breakdown?.onTimePickups || 0)
  const onTimeDeliveries = Number(breakdown?.onTimeDeliveries || 0)
  const serviceWindowsMet = onTimePickups + onTimeDeliveries
  const serviceWindowsTotal = loadsCompleted * 2
  const exceptionLoads = Number(breakdown?.exceptionLoads || 0)
  const relationshipBefore = Number.isFinite(Number(breakdown?.relationshipBefore)) ? Number(breakdown.relationshipBefore) : Number(career.relationshipScore ?? carrier?.relationshipScore ?? 50)
  const relationshipChange = Number(breakdown?.relationshipChange || 0)
  const relationshipAfter = Number.isFinite(Number(breakdown?.relationshipAfter)) ? Number(breakdown.relationshipAfter) : Math.max(0, Math.min(100, relationshipBefore + relationshipChange))
  const grade = performanceGrade({ loadsCompleted, serviceWindowsMet, serviceWindowsTotal, exceptionLoads })
  const carrierXpBefore = Math.max(0, Number(career.carrierXp || 0))
  const levelBefore = Math.max(1, Number(career.carrierLevel || getCarrierLevelFromXp(carrierXpBefore)))
  const carrierXpGain = carrierXpGainForReview({ loadsCompleted, serviceWindowsMet, exceptionLoads, relationshipChange })
  const carrierXpAfter = carrierXpBefore + carrierXpGain
  const levelAfter = getCarrierLevelFromXp(carrierXpAfter)
  const strikeReason = strikeReasonForReview({ grade, serviceWindowsMet, serviceWindowsTotal, exceptionLoads })
  const strikeIssued = Boolean(strikeReason)
  const strikeCountBefore = Math.max(0, Number(career.strikeCount || 0))
  const strikeForgiven = !strikeIssued && grade === 'A' && strikeCountBefore > 0
  const strikeCountAfter = Math.max(0, strikeCountBefore + (strikeIssued ? 1 : 0) - (strikeForgiven ? 1 : 0))
  const relationshipStateBefore = career.relationshipState || CARRIER_RELATIONSHIP_STATES.ACTIVE
  const relationshipStateAfter = getCarrierRelationshipState({ score: relationshipAfter, strikeCount: strikeCountAfter, active: carrier?.status === 'active' })
  const standingAfter = getCarrierRelationshipLabel(relationshipAfter)

  const review = {
    id: reviewId,
    operationDay,
    reviewedGameMinute,
    grade,
    loadsCompleted,
    onTimePickups,
    onTimeDeliveries,
    serviceWindowsMet,
    serviceWindowsTotal,
    exceptionLoads,
    relationshipBefore,
    relationshipChange,
    relationshipAfter,
    standingAfter,
    carrierXpGain,
    carrierXpAfter,
    levelBefore,
    levelAfter,
    levelUp: levelAfter > levelBefore,
    strikeIssued,
    strikeReason,
    strikeForgiven,
    strikeCountBefore,
    strikeCountAfter,
    relationshipStateBefore,
    relationshipStateAfter,
  }

  return {
    patch: {
      relationshipScore: relationshipAfter,
      standing: standingAfter,
      relationshipState: relationshipStateAfter,
      carrierLevel: levelAfter,
      carrierXp: carrierXpAfter,
      strikeCount: strikeCountAfter,
      performanceHistory: [review, ...history].slice(0, 12),
    },
    review,
    isNewReview: true,
  }
}

export function buildCarrierCareerById(carriers = [], applicationsById = {}, savedCareerById = {}) {
  return carriers.reduce((result, carrier) => {
    const saved = savedCareerById?.[carrier.id] || {}
    const application = applicationsById?.[carrier.id]
    const relationshipScore = Number.isFinite(Number(saved.relationshipScore)) ? Number(saved.relationshipScore) : Number(carrier.relationshipScore ?? 50)
    const carrierXp = Number.isFinite(Number(saved.carrierXp)) ? Number(saved.carrierXp) : 0
    const strikeCount = Number.isFinite(Number(saved.strikeCount)) ? Number(saved.strikeCount) : 0
    const active = carrier?.status === 'active' || application?.status === 'ACCEPTED'
    const inferredState = inferRelationshipState(carrier, application)
    const savedRelationshipState = saved.relationshipState
    const relationshipState = active
      ? (savedRelationshipState === CARRIER_RELATIONSHIP_STATES.TERMINATED ? CARRIER_RELATIONSHIP_STATES.TERMINATED : getCarrierRelationshipState({ score: relationshipScore, strikeCount, active }))
      : (savedRelationshipState || inferredState)
    result[carrier.id] = {
      relationshipState,
      applicationState: saved.applicationState || inferApplicationState(application),
      carrierLevel: Number.isFinite(Number(saved.carrierLevel)) && Number(saved.carrierLevel) > 0 ? Number(saved.carrierLevel) : getCarrierLevelFromXp(carrierXp),
      carrierXp,
      relationshipScore,
      standing: saved.standing || getCarrierRelationshipLabel(relationshipScore),
      agreementAccepted: saved.agreementAccepted ?? active,
      agreementAcceptedGameMinute: saved.agreementAcceptedGameMinute ?? application?.acceptedGameMinute ?? null,
      strikeCount,
      performanceHistory: Array.isArray(saved.performanceHistory) ? saved.performanceHistory : [],
    }
    return result
  }, {})
}

export function mergeCarrierCareerEntry(current = {}, carrier, patch = {}) {
  const relationshipScore = Number.isFinite(Number(patch.relationshipScore)) ? Number(patch.relationshipScore) : Number(current.relationshipScore ?? carrier?.relationshipScore ?? 50)
  const carrierXp = Number.isFinite(Number(patch.carrierXp)) ? Number(patch.carrierXp) : Number(current.carrierXp || 0)
  const strikeCount = Number.isFinite(Number(patch.strikeCount)) ? Number(patch.strikeCount) : Number(current.strikeCount || 0)
  return {
    relationshipState: current.relationshipState || CARRIER_RELATIONSHIP_STATES.AVAILABLE,
    applicationState: current.applicationState || CARRIER_APPLICATION_STATES.NONE,
    carrierLevel: Number(current.carrierLevel || getCarrierLevelFromXp(carrierXp)),
    carrierXp,
    relationshipScore,
    standing: current.standing || getCarrierRelationshipLabel(relationshipScore),
    agreementAccepted: Boolean(current.agreementAccepted),
    agreementAcceptedGameMinute: current.agreementAcceptedGameMinute ?? null,
    strikeCount,
    performanceHistory: Array.isArray(current.performanceHistory) ? current.performanceHistory : [],
    ...patch,
    relationshipScore,
    carrierXp,
    strikeCount,
    standing: patch.standing || getCarrierRelationshipLabel(relationshipScore),
  }
}
