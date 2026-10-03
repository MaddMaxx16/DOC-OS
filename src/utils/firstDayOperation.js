import seedLoads from '../data/loads.js'
import { initializeMetrolineEmployeeOperation } from './employeeCareerInitializer.js'
import { createInitialLedgerBanking } from './ledgerBanking.js'
import { DEFAULT_DAY_LOOP_STATE, DEFAULT_PLAYER_PROGRESSION } from './dayLoop.js'

export function prepareFirstDayOperation(saved) {
  // An established operation is resumed, never initialized a second time.
  if (saved?.stage === 'game') return saved
  if (saved?.career?.model !== 'employee' || saved?.career?.origin !== 'metroline_employee'
    || saved?.careerSetupStep !== 'employeeWelcome' || !saved?.dispatcherProfile?.created
    || !saved.dispatcherProfile.displayName?.trim()) {
    throw new Error('Finish your Metroline employee ID before starting your first day.')
  }
  const gameTime = { gameDayIndex: 0, totalMinutesOfDay: 360 }
  const operation = initializeMetrolineEmployeeOperation({ gameTime })
  return {
    ...operation,
    stage: 'game',
    selectedMarket: 'new-york',
    dispatcherProfile: saved.dispatcherProfile,
    gameTime,
    loads: structuredClone(seedLoads),
    runtimeProgressByDriver: {},
    seenLedgerReceivableIds: [],
    seenLedgerPaymentReceivedIds: [],
    ledgerWorkflowByLoadId: {},
    ledgerBanking: createInitialLedgerBanking(),
    carrierCareerById: {},
    emailMessages: [],
    driverMessages: [],
    dayLoop: structuredClone(DEFAULT_DAY_LOOP_STATE),
    playerProgression: { ...DEFAULT_PLAYER_PROGRESSION },
    firstDay: { step: 'welcome', messageIndex: 0, flowVersion: 5 },
  }
}
