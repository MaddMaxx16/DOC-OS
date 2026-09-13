export function getCarrierRelationshipLabel(score = 50) {
  const value = Number(score || 0)
  if (value >= 85) return 'EXCELLENT'
  if (value >= 70) return 'STRONG'
  if (value >= 55) return 'GOOD'
  if (value >= 40) return 'PROFESSIONAL'
  if (value >= 25) return 'STRAINED'
  return 'AT RISK'
}

export function getAgreementRules(carrier) {
  const agreement = carrier?.dispatchAgreement || {}
  return {
    type: agreement.type || 'percentage',
    percentage: Number(agreement.percentage || 0),
    loadApprovalRequired: agreement.loadApprovalRequired !== false,
    paymentTermsDays: Number.isFinite(Number(agreement.paymentTermsDays)) ? Number(agreement.paymentTermsDays) : 1,
    equipmentScope: Array.isArray(agreement.equipmentScope) && agreement.equipmentScope.length ? agreement.equipmentScope : (carrier?.equipment || []),
    preferredRegion: agreement.preferredRegion || carrier?.serviceArea || 'Not specified',
    minimumRatePerLoadedMile: Number.isFinite(Number(agreement.minimumRatePerLoadedMile)) ? Number(agreement.minimumRatePerLoadedMile) : null,
    driverAssignmentAuthority: agreement.driverAssignmentAuthority !== false,
    serviceExpectations: {
      onTimeWindows: agreement.serviceExpectations?.onTimeWindows !== false,
      cleanPaperwork: agreement.serviceExpectations?.cleanPaperwork !== false,
      driverCommunication: agreement.serviceExpectations?.driverCommunication !== false,
    },
  }
}

export function getCarrierDayRelationshipChange({ carrier, completedLoads = [] }) {
  if (!carrier || !completedLoads.length) return 0
  const rules = getAgreementRules(carrier)
  return completedLoads.reduce((sum, load) => {
    let delta = 2
    const pickupEnd = Number(load.pickupDayIndex) * 1440 + Number(load.pickupWindowEndMinutes)
    const deliveryEnd = Number(load.deliveryDayIndex) * 1440 + Number(load.deliveryWindowEndMinutes)
    if (Number.isFinite(load.pickupArrivalGameMinute) && Number.isFinite(pickupEnd) && load.pickupArrivalGameMinute > pickupEnd) delta -= 2
    if (Number.isFinite(load.deliveryArrivalGameMinute) && Number.isFinite(deliveryEnd) && load.deliveryArrivalGameMinute > deliveryEnd) delta -= 3
    if (rules.serviceExpectations.cleanPaperwork && !load.pod?.approved) delta -= 2
    if (Number(load.pod?.freightCondition?.damagedAtPickup || 0) > 0 || Number(load.pod?.freightCondition?.missingAtPickup || 0) > 0) delta -= 1
    if (Number.isFinite(rules.minimumRatePerLoadedMile) && Number(load.loadedMiles || load.loadedDistanceMiles || 0) > 0) {
      const ratePerMile = Number(load.rate || 0) / Number(load.loadedMiles || load.loadedDistanceMiles)
      if (ratePerMile < rules.minimumRatePerLoadedMile) delta -= 1
    }
    return sum + delta
  }, 0)
}
