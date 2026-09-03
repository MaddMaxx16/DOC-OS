export function getCurrentTutorialObjective({ tutorialEnabled, stage, applications = {}, emails = [], loads = [], ledger = {} }) {
  if (!tutorialEnabled) return null
  const app = applications.metroline
  const doc001 = loads.find((load) => load.id === 'DOC001')
  const doc002 = loads.find((load) => load.id === 'DOC002')
  if (stage === 'game' && !emails.some((message) => message.id === 'mentor-welcome')) return 'open-welcome-email'
  if (!app) return 'open-metroline-email'
  if (app.status === 'PENDING') return 'fast-forward-carrier-response'
  if (app.status === 'OFFER_RECEIVED' && !app.accepted) return 'open-metroline-email'
  if (app.status === 'ACCEPTED' && !loads.some((load) => load.assignedDriverId === 'marcus')) return 'open-first-carrier-email'
  if (doc001?.status === 'available' && !doc001.driverFitVerified) return doc001.candidateDriverId ? 'accept-doc001' : 'check-driver-fit'
  if (doc001?.status === 'accepted' && !doc001.selectedRouteId) return 'select-route'
  if (doc001?.pod?.approved !== true && doc001?.tripStatus === 'awaiting-pod') return 'review-pod'
  if (ledger.DOC001?.financialStatus === 'READY_TO_INVOICE') return 'open-receivable'
  if (ledger.DOC001?.financialStatus === 'DRAFT') return 'send-invoice'
  if (doc002?.status === 'completed') return 'tutorial-complete'
  return null
}
