// P1.3 — FreightLink Driver Fit 2.0
// Translate a load's authoritative HOS projection into dispatcher-facing language.
// Schedule conflicts remain a separate top-level planning signal in LoadBoardScreen.

const TIGHT_MARGIN_MINUTES = 60

export function getFreightLinkDriverFit(evaluation) {
  if (!evaluation) return null

  const driveMargin = Number(evaluation.driveAvailableMinutes) - Number(evaluation.driveRequiredMinutes)
  const dutyMargin = Number(evaluation.dutyAvailableMinutes) - Number(evaluation.dutyRequiredMinutes)
  const legal = evaluation.driveOk === true && evaluation.dutyOk === true

  if (!legal || !Number.isFinite(driveMargin) || !Number.isFinite(dutyMargin)) {
    return {
      label: 'POOR',
      tone: 'poor',
      detail: !evaluation?.driveOk ? 'Not enough driving time for this plan.' : 'Not enough legal work time for this plan.',
      driveMarginMinutes: driveMargin,
      dutyMarginMinutes: dutyMargin,
    }
  }

  const usefulMargin = Math.min(driveMargin, dutyMargin)
  if (usefulMargin < TIGHT_MARGIN_MINUTES) {
    return {
      label: 'TIGHT',
      tone: 'tight',
      detail: 'Fits, but leaves less than an hour of usable driver-time margin.',
      driveMarginMinutes: driveMargin,
      dutyMarginMinutes: dutyMargin,
    }
  }

  return {
    label: 'GOOD',
    tone: 'good',
    detail: 'Fits with useful driver-time margin remaining.',
    driveMarginMinutes: driveMargin,
    dutyMarginMinutes: dutyMargin,
  }
}
