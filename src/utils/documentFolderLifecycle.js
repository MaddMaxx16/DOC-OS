const ACTIVE_TRIP_STATUSES = new Set([
  'assigned',
  'en-route-pickup',
  'waiting-at-pickup',
  'loading-at-pickup',
  'loaded',
  'en-route-delivery',
  'waiting-at-delivery',
  'awaiting-pod',
  'completed',
  'delivered',
])

const BOOKED_LOAD_STATUSES = new Set([
  'BOOKED',
  'ACCEPTED',
  'ASSIGNED',
  'ACTIVE',
  'IN_TRANSIT',
  'IN TRANSIT',
  'COMPLETED',
  'DELIVERED',
])

const APPROVED_CARRIER_STATUSES = new Set([
  'APPROVED',
  'ACCEPTED',
])

export function getLoadDocumentIds(load, workflow = {}) {
  const ids = []

  if (load?.rateConfirmation?.id) {
    ids.push({
      id: load.rateConfirmation.id,
      type: 'rate-confirmation',
      label: 'Rate Confirmation',
    })
  }

  if (load?.pod) {
    ids.push({
      id: `pod:${load.id}:v${load.pod.version || 1}`,
      type: 'pod',
      label: 'POD',
    })

    const damaged = Number(load.pod?.freightCondition?.damagedAtPickup || 0)
    const missing = Number(load.pod?.freightCondition?.missingAtPickup || 0)

    if (damaged > 0 || missing > 0) {
      ids.push({
        id: `exception:${load.id}:v${load.pod.version || 1}`,
        type: 'exception-report',
        label: 'Exception Record',
      })
    }
  }

  if (workflow?.invoiceNumber) {
    ids.push({
      id: `invoice:${load.id}:${workflow.invoiceNumber}`,
      type: 'invoice',
      label: 'Invoice',
    })
  }

  return ids
}

export function isLoadFolderEligible(load, workflow = {}) {
  if (!load) return false

  const filedCount = load.documentFiling?.filedDocumentIds?.length || 0
  const status = String(load.status || '').toUpperCase()
  const carrierStatus = String(load.carrierApprovalStatus || '').toUpperCase()

  return Boolean(
    load.documentFiling ||
    filedCount ||
    load.rateConfirmation ||
    load.pod ||
    workflow?.invoiceNumber ||
    load.assignedDriverId ||
    load.completedDriverId ||
    load.candidateDriverId ||
    load.booked === true ||
    ACTIVE_TRIP_STATUSES.has(load.tripStatus) ||
    BOOKED_LOAD_STATUSES.has(status) ||
    APPROVED_CARRIER_STATUSES.has(carrierStatus)
  )
}

function buildDocumentSourceMap(loads = [], workflows = {}) {
  const sourceByDocumentId = new Map()

  loads.forEach((load) => {
    getLoadDocumentIds(load, workflows[load.id] || {}).forEach((document) => {
      sourceByDocumentId.set(document.id, load.id)
    })
  })

  return sourceByDocumentId
}

export function getLoadFolderLifecycle(load, workflows = {}, loads = []) {
  if (!load) {
    return {
      id: 'unavailable',
      label: 'UNAVAILABLE',
      rank: 99,
      readyToAssemble: false,
      missing: [],
      wrongFiledCount: 0,
    }
  }

  const workflow = workflows[load.id] || {}
  const filedIds = load.documentFiling?.filedDocumentIds || []
  const closeoutStatus = String(
    load.documentFiling?.closeoutStatus || ''
  ).toUpperCase()

  const knownDocuments = getLoadDocumentIds(load, workflow)
  const requiredDocuments = knownDocuments.filter((document) =>
    ['rate-confirmation', 'pod', 'exception-report', 'invoice'].includes(document.type)
  )

  const missing = requiredDocuments
    .filter((document) => !filedIds.includes(document.id))
    .map((document) => document.label)

  if (!load.rateConfirmation) missing.unshift('Rate Confirmation')
  if (!load.pod) missing.push('POD')
  if (!workflow.invoiceNumber) missing.push('Invoice')

  const sourceByDocumentId = buildDocumentSourceMap(loads, workflows)
  const wrongFiledCount = filedIds.filter((id) => {
    const sourceLoadId = sourceByDocumentId.get(id)
    return sourceLoadId && sourceLoadId !== load.id
  }).length

  const tripDelivered =
    load.tripStatus === 'completed' ||
    load.tripStatus === 'delivered' ||
    load.tripStatus === 'awaiting-pod' ||
    Boolean(load.pod)

  const rcReady =
    Boolean(load.rateConfirmation) &&
    ['CONFIRMED', 'APPROVED'].includes(
      String(load.rateConfirmation.status || '').toUpperCase()
    )

  const podReady = Boolean(load.pod?.approved)

  const invoiceSent =
    Boolean(workflow.invoiceNumber) &&
    (
      ['AWAITING_PAYMENT', 'PAID'].includes(
        String(workflow.financialStatus || '').toUpperCase()
      ) ||
      String(workflow.submissionStatus || '').toUpperCase() === 'SUBMITTED'
    )

  const requiredFiled =
    requiredDocuments.length >= 3 &&
    requiredDocuments.every((document) => filedIds.includes(document.id))

  const readyToAssemble =
    tripDelivered &&
    rcReady &&
    podReady &&
    invoiceSent &&
    requiredFiled &&
    wrongFiledCount === 0

  const paid =
    String(workflow.financialStatus || '').toUpperCase() === 'PAID'

  if (closeoutStatus === 'CLOSED') {
    return {
      id: paid ? 'closed-paid' : 'closed-payment-pending',
      label: paid ? 'CLOSED · PAID' : 'CLOSED · PAYMENT PENDING',
      rank: paid ? 60 : 50,
      readyToAssemble: false,
      missing,
      wrongFiledCount,
    }
  }

  if (closeoutStatus === 'SENT') {
    return {
      id: 'closeout-sent',
      label: 'CLOSEOUT SENT',
      rank: 40,
      readyToAssemble: false,
      missing,
      wrongFiledCount,
    }
  }

  if (load.documentFiling?.packetAssembled) {
    return {
      id: 'packet-assembled',
      label: 'PACKET ASSEMBLED',
      rank: 35,
      readyToAssemble: false,
      missing: [],
      wrongFiledCount: 0,
    }
  }

  if (readyToAssemble) {
    return {
      id: 'ready-to-assemble',
      label: 'READY TO ASSEMBLE',
      rank: 30,
      readyToAssemble: true,
      missing: [],
      wrongFiledCount: 0,
    }
  }

  if (tripDelivered) {
    return {
      id: 'paperwork-open',
      label: 'PAPERWORK OPEN',
      rank: 20,
      readyToAssemble: false,
      missing: [...new Set(missing)],
      wrongFiledCount,
    }
  }

  return {
    id: 'active-load',
    label: 'ACTIVE LOAD',
    rank: 10,
    readyToAssemble: false,
    missing: [...new Set(missing)],
    wrongFiledCount,
  }
}

export function sortLoadFolders(loads = [], workflows = {}) {
  return loads
    .filter((load) => isLoadFolderEligible(load, workflows[load.id] || {}))
    .map((load) => ({
      load,
      lifecycle: getLoadFolderLifecycle(load, workflows, loads),
    }))
    .sort((a, b) => {
      if (a.lifecycle.rank !== b.lifecycle.rank) {
        return a.lifecycle.rank - b.lifecycle.rank
      }

      return String(a.load.loadNumber || a.load.id).localeCompare(
        String(b.load.loadNumber || b.load.id),
        undefined,
        { numeric: true }
      )
    })
    .map((item) => item.load)
}
