export function getReceivables(loads = [], carriers = []) {
  return loads.filter((load) => load.tripStatus === 'completed' && load.pod?.approved).map((load) => {
    const carrier = carriers.find((item) => item.id === load.carrierId)
    if (!carrier) return null
    const agreement = carrier.dispatchAgreement || {}
    const percentage = agreement.type === 'percentage' ? agreement.percentage : 0
    return { loadId: load.id, carrierId: carrier.id, carrierName: carrier.name, carrierGross: load.rate, agreementType: agreement.type, agreementPercentage: percentage, dispatchRevenue: load.rate * percentage / 100, receivableStatus: 'OUTSTANDING' }
  }).filter(Boolean)
}

export function getLedgerSummary(receivables = []) {
  const revenue = receivables.reduce((sum, item) => sum + item.dispatchRevenue, 0)
  return { revenueEarned: revenue, outstanding: revenue, collected: 0 }
}
