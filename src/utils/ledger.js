export function getReceivables(loads = [], carriers = [], workflows = {}) {
  return loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved).map((load) => {
    const carrier = carriers.find((item) => item.id === load.carrierId)
    if (!carrier) return null
    const agreement = carrier.dispatchAgreement || {}
    const percentage = agreement.type === 'percentage' ? agreement.percentage : 0
    const workflow = workflows[load.id] || {}
    return { loadId: load.id, carrierId: carrier.id, carrierName: carrier.name, carrierGross: load.rate, agreementType: agreement.type, agreementPercentage: percentage, dispatchRevenue: load.rate * percentage / 100, receivableStatus: 'OUTSTANDING', financialStatus: workflow.financialStatus || 'READY_TO_INVOICE', ...workflow, paymentAvailableGameMinute: workflow.paymentAvailableGameMinute ?? (Number.isFinite(workflow.invoiceSentGameMinute) ? workflow.invoiceSentGameMinute + 1440 : null) }
  }).filter(Boolean)
}

export function getLedgerSummary(receivables = []) {
  const revenue = receivables.reduce((sum, item) => sum + item.dispatchRevenue, 0)
  const collected = receivables.filter((item) => item.financialStatus === 'PAID').reduce((sum, item) => sum + item.dispatchRevenue, 0)
  return { revenueEarned: revenue, outstanding: revenue - collected, collected }
}
