export const STANDARD_OPERATION_START_MINUTES = 8 * 60
export const TARGET_OPERATION_CLOSE_MINUTES = 18 * 60
export const XP_PER_LEVEL = 500

export const DEFAULT_DAY_LOOP_STATE = {
  operationDay: 1,
  phase: 'operating',
  currentStartGameDayIndex: 0,
  report: null,
  history: [],
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

  const blockers = []
  if (activeLoads > 0) blockers.push(`${activeLoads} active load${activeLoads === 1 ? '' : 's'} still in progress`)
  if (driversInMotion > 0) blockers.push(`${driversInMotion} driver${driversInMotion === 1 ? '' : 's'} still in motion`)
  if (pendingDocuments > 0) blockers.push(`${pendingDocuments} document action${pendingDocuments === 1 ? '' : 's'} still required`)
  if (pendingInvoices > 0) blockers.push(`${pendingInvoices} invoice${pendingInvoices === 1 ? '' : 's'} still needs to be sent`)

  return {
    activeLoads,
    driversInMotion,
    pendingDocuments,
    pendingInvoices,
    blockers,
    canEnd: blockers.length === 0,
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
}) {
  const closeAbsoluteMinute = gameTime.gameDayIndex * 1440 + gameTime.totalMinutesOfDay
  const standardCloseAbsoluteMinute = currentStartGameDayIndex * 1440 + TARGET_OPERATION_CLOSE_MINUTES
  const rawLateCloseMinutes = Math.max(0, closeAbsoluteMinute - standardCloseAbsoluteMinute)
  const lateCloseAdjustmentMinutes = operationDay === 1 ? 0 : rawLateCloseMinutes
  const nextBaseDayIndex = gameTime.gameDayIndex + 1
  const nextStartAbsoluteMinute = nextBaseDayIndex * 1440 + STANDARD_OPERATION_START_MINUTES + lateCloseAdjustmentMinutes
  const nextStart = normalizeAbsoluteMinute(nextStartAbsoluteMinute)

  const completedLoads = completedLoadsForOperation(loads, operationDay)
  const completedIds = new Set(completedLoads.map((load) => load.id))
  const dayReceivables = receivables.filter((item) => completedIds.has(item.loadId))
  const carrierRevenue = completedLoads.reduce((sum, load) => sum + Number(load.rate || 0), 0)
  const dispatchRevenue = dayReceivables.reduce((sum, item) => sum + Number(item.dispatchRevenue || 0), 0)
  const cashCollected = dayReceivables.filter((item) => item.financialStatus === 'PAID').reduce((sum, item) => sum + Number(item.dispatchRevenue || 0), 0)
  const pendingReceivables = receivables.filter((item) => item.financialStatus !== 'PAID').reduce((sum, item) => sum + Number(item.dispatchRevenue || 0), 0)

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
    : operationDay === 1
      ? 100
      : Math.max(60, 100 - Math.ceil(lateCloseAdjustmentMinutes / 15) * 2)
  const xpGain = 0 // Per-load XP is awarded at load closeout; day close must not double-award it.
  const reputationChange = completedLoads.reduce((sum, load) => {
    const lateCount = [appointmentLateMinutes(load, 'pickup'), appointmentLateMinutes(load, 'delivery')].filter((value) => Number.isFinite(value) && value > 0).length
    if (lateCount === 0) return sum + 3
    if (lateCount === 1) return sum - 1
    return sum - 3
  }, 0)

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
    reputationChange,
    xpGain,
    standardStartMinutes: STANDARD_OPERATION_START_MINUTES,
    lateCloseAdjustmentMinutes,
    nextStartGameDayIndex: nextStart.gameDayIndex,
    nextStartMinutes: nextStart.totalMinutesOfDay,
    tutorialPenaltyExempt: operationDay === 1,
  }
}

export function getProgressionView(progression = DEFAULT_PLAYER_PROGRESSION) {
  const xp = Math.max(0, Number(progression.xp || 0))
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  return { xp, level, xpIntoLevel, xpPerLevel: XP_PER_LEVEL, reputation: Number(progression.reputation || 0) }
}
