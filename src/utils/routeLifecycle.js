// CS2.0A.9 — one presentation contract for route lifecycle across Scheduler + Driver Hub.
const ACTIVE_LABELS = {
  'en-route-pickup': 'EN ROUTE TO PICKUP',
  'at-pickup': 'AT PICKUP',
  'checking-in-pickup': 'CHECKING IN PICKUP',
  'waiting-at-pickup': 'WAITING AT PICKUP',
  'checked-in-pickup': 'DOCK READY',
  'loading-at-pickup': 'LOADING',
  loaded: 'LOADED',
  'onboard-hold': 'ONBOARD · DELIVERY PENDING',
  'en-route-delivery': 'EN ROUTE TO DELIVERY',
  'at-delivery': 'AT DELIVERY',
  'checking-in-delivery': 'CHECKING IN DELIVERY',
  'waiting-at-delivery': 'WAITING AT DELIVERY',
  'checked-in-delivery': 'DOCK READY',
  'unloading-delivery': 'UNLOADING',
  'awaiting-pod': 'DELIVERED · POD PENDING',
  delivered: 'DELIVERED',
  completed: 'COMPLETED',
}

export function getRouteLifecycleLabel(load) {
  if (!load) return 'DRAFT'
  const tripStatus = String(load.tripStatus || '')
  if (ACTIVE_LABELS[tripStatus]) return ACTIVE_LABELS[tripStatus]
  if (load.status !== 'available') {
    return Number.isFinite(load.scheduleCommunicatedGameMinute) ? 'COMMUNICATED' : 'BOOKED'
  }
  if (load.carrierApprovalStatus === 'APPROVED') return 'APPROVED'
  if (load.carrierApprovalStatus === 'PENDING') return 'PENDING APPROVAL'
  if (load.carrierApprovalStatus === 'NEEDS_INFO') return 'NEEDS INFO'
  if (load.scheduleApprovalQueued) return 'PLANNED'
  return 'DRAFT'
}

export function getRouteLifecycleTone(load) {
  const label = getRouteLifecycleLabel(load)
  if (label === 'PENDING APPROVAL') return 'pending'
  if (label === 'APPROVED') return 'approved'
  if (['BOOKED','COMMUNICATED'].includes(label) || label.startsWith('EN ROUTE') || label.includes('PICKUP') || label.includes('DELIVERY') || label === 'LOADING' || label === 'UNLOADING' || label === 'DOCK READY') return 'booked'
  return 'proposed'
}
