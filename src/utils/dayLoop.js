import { getAgreementRules, getCarrierDayRelationshipChange, getCarrierRelationshipLabel } from './carrierAgreement.js'
export const STANDARD_OPERATION_START_MINUTES = 7 * 60
export const TARGET_OPERATION_CLOSE_MINUTES = 18 * 60
export const XP_PER_LEVEL = 500

export const DEFAULT_DAY_LOOP_STATE = {
  operationDay: 1,
  phase: 'operating',
  currentStartGameDayIndex: 0,
  report: null,
  history: [],
  lastClosedGameDayIndex: null,
  lastBriefedGameDayIndex: null,
  overnightAdvanceTargetGameDayIndex: null,
  overnightAdvanceTargetMinutes: null,
}

export const DEFAULT_PLAYER_PROGRESSION = {
  xp: 0,
  reputation: 0,
}

const ACTIVE_TRIP_STATUSES = new Set([
  'accepted',
  'queued',
  'assigned',
  'en-route-pickup',
  'at-pickup',
  'checking-in-pickup',
  'waiting-at-pickup',
  'checked-in-pickup',
  'loading-at-pickup',
  'loaded',
  'en-route-delivery',
  'at-delivery',
  'checking-in-delivery',
  'waiting-at-delivery',
  'checked-in-delivery',
  'unloading-delivery',
  'awaiting-pod',
  'delivered',
])

const MOVING_TRIP_STATUSES = new Set(['en-route-pickup', 'en-route-delivery'])
const DOCUMENT_TRIP_STATUSES = new Set(['awaiting-pod', 'delivered'])
const BLOCKING_FINANCIAL_STATUSES = new Set(['READY_TO_INVOICE', 'DRAFT'])

export function getEndDayStatus(loads = [], receivables = []) {
  const activeLoads = loads.filter((load) => ACTIVE_TRIP_STATUSES.has(load.tripStatus)).length
  const driversInMotion = loads.filter((load) => MOVING_TRIP_STATUSES.has(load.tripStatus)).length
  const pendingDocuments = loads.filter((load) => DOCUMENT_TRIP_STATUSES.has(load.tripStatus) || (load.tripStatus === 'completed' && !load.pod?.approved)).length
  const pendingInvoices = receivables.filter((item) => BLOCKING_FINANCIAL_STATUSES.has(item.financialStatus)).length

  // B.4.2.2: closeout is a business-day report, not world-reset authority.
  // Open freight, moving drivers, paperwork, and receivables are carryover work;
  // they must survive the date boundary instead of blocking the report.
  const blockers = []
  const carryover = []
  if (activeLoads > 0) carryover.push(`${activeLoads} active load${activeLoads === 1 ? '' : 's'} carrying forward`)
  if (driversInMotion > 0) carryover.push(`${driversInMotion} driver${driversInMotion === 1 ? '' : 's'} currently in motion`)
  if (pendingDocuments > 0) carryover.push(`${pendingDocuments} document action${pendingDocuments === 1 ? '' : 's'} carrying forward`)
  if (pendingInvoices > 0) carryover.push(`${pendingInvoices} invoice${pendingInvoices === 1 ? '' : 's'} carrying forward`)

  return {
    activeLoads,
    driversInMotion,
    pendingDocuments,
    pendingInvoices,
    blockers,
    carryover,
    canEnd: true,
  }
}

function normalizeAbsoluteMinute(absoluteMinute) {
  return {
    gameDayIndex: Math.floor(absoluteMinute / 1440),
    totalMinutesOfDay: ((absoluteMinute % 1440) + 1440) % 1440,
  }
}


function appointmentLateMinutes(load, leg) {
  const isPickup = leg === 'pickup'
  const arrival = isPickup ? load.pickupArrivalGameMinute : load.deliveryArrivalGameMinute
  const dayIndex = isPickup ? load.pickupDayIndex : load.deliveryDayIndex
  const end = isPickup ? load.pickupWindowEndMinutes : load.deliveryWindowEndMinutes
  if (![arrival, dayIndex, end].every(Number.isFinite)) return null
  return Math.max(0, arrival - (dayIndex * 1440 + end))
}

function completedLoadsForOperation(loads, operationDay) {
  return loads.filter((load) => {
    if (load.tripStatus !== 'completed') return false
    if (load.completedOperationDay === operationDay) return true
    // Migration path for the already-tested pre-Day-Loop vertical-slice save.
    return operationDay === 1 && !Number.isFinite(load.completedOperationDay)
  })
}

export function createDayReport({
  operationDay,
  currentStartGameDayIndex,
  gameTime,
  loads = [],
  receivables = [],
  carriers = [],
}) {
  const closeAbsoluteMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const standardCloseAbsoluteMinute = currentStartGameDayIndex * 1440 + TARGET_OPERATION_CLOSE_MINUTES
  const rawLateCloseMinutes = Math.max(0, closeAbsoluteMinute - standardCloseAbsoluteMinute)
  const lateCloseAdjustmentMinutes = rawLateCloseMinutes
  // B.4.4.3.2 — DOC OS has a fixed dispatcher operating-day start at 07:00.
  // End Operations never resets the world; it only schedules a controlled
  // overnight advance to the next 07:00 boundary. If closeout occurs after
  // midnight but before 07:00, the upcoming 07:00 on the same calendar day is
  // the target rather than skipping an extra day.
  const nextBaseDayIndex = gameTime.totalMinutesOfDay < STANDARD_OPERATION_START_MINUTES
    ? gameTime.gameDayIndex
    : gameTime.gameDayIndex + 1
  const nextStartAbsoluteMinute = nextBaseDayIndex * 1440 + STANDARD_OPERATION_START_MINUTES
  const nextStart = normalizeAbsoluteMinute(nextStartAbsoluteMinute)

  const completedLoads = completedLoadsForOperation(loads, operationDay)
  const completedIds = new Set(completedLoads.map((load) => load.id))
  const dayReceivables = receivables.filter((item) => completedIds.has(item.loadId))
  const carrierRevenue = completedLoads.reduce((sum, load) => sum + Number(load.rate || 0), 0)
  const dispatchRevenue = dayReceivables.reduce((sum, item) => sum + Number(item.dispatchRevenue || 0), 0)
  const cashCollected = dayReceivables.filter((item) => item.financialStatus === 'PAID').reduce((sum, item) => sum + Number(item.dispatchRevenue || 0), 0)
  const pendingReceivables = receivables.filter((item) => item.financialStatus !== 'PAID').reduce((sum, item) => sum + Number(item.dispatchRevenue || 0), 0)

  const onTimePickups = completedLoads.filter((load) => {
    const late = appointmentLateMinutes(load, 'pickup')
    return Number.isFinite(late) && late === 0
  }).length
  const onTimeDeliveries = completedLoads.filter((load) => {
    const late = appointmentLateMinutes(load, 'delivery')
    return Number.isFinite(late) && late === 0
  }).length
  const exceptionLoads = completedLoads.filter((load) => Number(load.pod?.freightCondition?.damagedAtPickup || 0) > 0 || Number(load.pod?.freightCondition?.missingAtPickup || 0) > 0).length

  const serviceScores = completedLoads.map((load) => {
    const pickupLate = appointmentLateMinutes(load, 'pickup')
    const deliveryLate = appointmentLateMinutes(load, 'delivery')
    let score = 100
    if (Number.isFinite(pickupLate) && pickupLate > 0) score -= 25
    if (Number.isFinite(deliveryLate) && deliveryLate > 0) score -= 35
    if (!load.pod?.approved) score -= 20
    return Math.max(0, score)
  })
  const serviceScore = serviceScores.length ? Math.round(serviceScores.reduce((sum, value) => sum + value, 0) / serviceScores.length) : 0
  const efficiencyScore = completedLoads.length === 0
    ? 0
    : Math.max(60, 100 - Math.ceil(lateCloseAdjustmentMinutes / 15) * 2)
  const xpGain = 0 // Per-load XP is awarded at load closeout; day close must not double-award it.
  const reputationChange = completedLoads.reduce((sum, load) => {
    const lateCount = [appointmentLateMinutes(load, 'pickup'), appointmentLateMinutes(load, 'delivery')].filter((value) => Number.isFinite(value) && value > 0).length
    if (lateCount === 0) return sum + 3
    if (lateCount === 1) return sum - 1
    return sum - 3
  }, 0)

  const carrierBreakdown = carriers.filter((carrier) => carrier.status === 'active').map((carrier) => {
    const carrierLoads = completedLoads.filter((load) => load.carrierId === carrier.id)
    const carrierLoadIds = new Set(carrierLoads.map((load) => load.id))
    const carrierReceivables = dayReceivables.filter((item) => carrierLoadIds.has(item.loadId))
    const rules = getAgreementRules(carrier)
    const relationshipChange = getCarrierDayRelationshipChange({ carrier, completedLoads: carrierLoads })
    const onTimePickupCount = carrierLoads.filter((load) => appointmentLateMinutes(load, 'pickup') === 0).length
    const onTimeDeliveryCount = carrierLoads.filter((load) => appointmentLateMinutes(load, 'delivery') === 0).length
    const carrierExceptionLoads = carrierLoads.filter((load) => Number(load.pod?.freightCondition?.damagedAtPickup || 0) > 0 || Number(load.pod?.freightCondition?.missingAtPickup || 0) > 0).length
    return {
      carrierId: carrier.id,
      carrierName: carrier.name,
      loadsCompleted: carrierLoads.length,
      carrierGross: carrierLoads.reduce((sum, load) => sum + Number(load.rate || 0), 0),
      dispatchFeePercent: rules.percentage,
      dispatchRevenue: carrierReceivables.reduce((sum, item) => sum + Number(item.dispatchRevenue || 0), 0),
      bookingAuthority: rules.loadApprovalRequired ? 'APPROVAL REQUIRED' : 'DISPATCHER AUTHORIZED',
      preferredRegion: rules.preferredRegion,
      onTimePickups: onTimePickupCount,
      onTimeDeliveries: onTimeDeliveryCount,
      exceptionLoads: carrierExceptionLoads,
      relationshipBefore: Number(carrier.relationshipScore ?? 50),
      relationshipChange,
      relationshipAfter: Math.max(0, Math.min(100, Number(carrier.relationshipScore ?? 50) + relationshipChange)),
      relationshipLabel: getCarrierRelationshipLabel(Math.max(0, Math.min(100, Number(carrier.relationshipScore ?? 50) + relationshipChange))),
    }
  })

  return {
    operationDay,
    closeGameDayIndex: gameTime.gameDayIndex,
    closeMinutes: gameTime.totalMinutesOfDay,
    loadsCompleted: completedLoads.length,
    carrierRevenue,
    dispatchRevenue,
    cashCollected,
    pendingReceivables,
    serviceScore,
    efficiencyScore,
    onTimePickups,
    onTimeDeliveries,
    exceptionLoads,
    reputationChange,
    carrierBreakdown,
    xpGain,
    standardStartMinutes: STANDARD_OPERATION_START_MINUTES,
    lateCloseAdjustmentMinutes,
    nextStartGameDayIndex: nextStart.gameDayIndex,
    nextStartMinutes: nextStart.totalMinutesOfDay,
  }
}

export function getProgressionView(progression = DEFAULT_PLAYER_PROGRESSION) {
  const xp = Math.max(0, Number(progression.xp || 0))
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  return { xp, level, xpIntoLevel, xpPerLevel: XP_PER_LEVEL, reputation: Number(progression.reputation || 0) }
}
