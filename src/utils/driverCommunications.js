function hashText(value = '') {
  let hash = 0
  const text = String(value)
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0
  return Math.abs(hash)
}

function choose(key, options) {
  if (!Array.isArray(options) || !options.length) return ''
  return options[hashText(key) % options.length]
}

export function getRelationshipStartMessage(driver) {
  const firstName = String(driver?.fullName || driver?.name || 'Driver').split(' ')[0]
  return choose(`relationship:${driver?.id || firstName}`, [
    `Hey, ${firstName} here. Looks like we’re working together. I’m staged and ready whenever you’ve got the plan.`,
    `${firstName} here. Good to meet you. I’m ready on my end — send the plan over when you’re set.`,
  ])
}

export function getClockInMessage() {
  return 'Good morning, clocked in and ready to go.'
}

export function getScheduleAcknowledgement(driver, operationDay = 1, isRevision = false) {
  if (isRevision) return choose(`schedule-revision:${driver?.id}:${operationDay}`, [
    'Got it. I see the change.',
    'Copy. I’ve got the revised plan.',
    'Got the update. I’m tracking the change.',
  ])
  return choose(`schedule:${driver?.id}:${operationDay}`, [
    'Got it. I have the schedule.',
    'Schedule received. I’ve got the plan.',
    'Copy. I have today’s plan.',
  ])
}

export function getDepartureMessage({ driver, load, phase, facilityName, operationDay = 1 }) {
  const key = `departure:${driver?.id}:${load?.id}:${phase}:${operationDay}`
  if (phase === 'delivery') return choose(key, [
    `Loaded and rolling to ${facilityName}.`,
    `I’m rolling to ${facilityName} now.`,
    `Freight is secure. Heading to ${facilityName}.`,
  ])
  return choose(key, [
    `Heading to ${facilityName} now.`,
    `I’m rolling to ${facilityName}.`,
    `On my way to ${facilityName}.`,
  ])
}

export function getEndOfDayMessage(driver, operationDay = 1) {
  return choose(`signoff:${driver?.id}:${operationDay}`, [
    'That’s me for today. Everything’s wrapped up on my end. Talk tomorrow.',
    'I’m clear for the day. Everything is squared away on my end. See you tomorrow.',
    'All done on my side for today. I’ll catch you tomorrow.',
  ])
}

export function getDelayMessage({ facilityName, phase = 'pickup', waitedMinutes = 20 }) {
  const phaseLabel = phase === 'delivery' ? 'receiver' : 'pickup'
  return choose(`delay:${facilityName}:${phase}:${Math.floor(waitedMinutes / 10)}`, [
    `Still waiting on a door at ${facilityName}. This is starting to eat into the schedule.`,
    `I’m still sitting at ${facilityName}. No door yet, and the wait is starting to matter.`,
    `No door yet at ${facilityName}. I’m still here and it’s starting to squeeze the next move.`,
    `Still tied up at the ${phaseLabel}. I’ll keep you posted, but this delay is getting long.`,
  ])
}

export function getPickupExceptionMessage({ damagedPallets = 0, missingPallets = 0 }) {
  if (damagedPallets > 0) return `${damagedPallets} pallet${damagedPallets === 1 ? '' : 's'} were damaged during loading. I’m holding here until we get direction.`
  if (missingPallets > 0) return `The load is short by ${missingPallets} pallet${missingPallets === 1 ? '' : 's'}. I’m holding here until we get it corrected.`
  return 'There’s a loading issue here. I’m holding until we get it sorted out.'
}


export function getUnloadExceptionMessage({ wrongMoves = 0, delayMinutes = 0 }) {
  const miscues = Math.max(1, Number(wrongMoves || 0))
  const delay = Math.max(0, Number(delayMinutes || 0))
  if (delay >= 4) return `Receiver had me re-stage freight during the unload. It cost us about ${Math.round(delay)} minutes, but it’s sorted now.`
  return `Receiver kicked back ${miscues === 1 ? 'one unload move' : `${miscues} unload moves`}. We got it sorted and the freight is off.`
}

export function getDriverReplyOptions(latestInbound, currentLoad) {
  if (!latestInbound || latestInbound.direction === 'outbound') return []
  const intent = latestInbound.messageIntent || ''
  const status = currentLoad?.tripStatus || ''

  if (intent === 'facility-delay' && !['waiting-at-pickup', 'waiting-at-delivery'].includes(status)) return []
  if (intent === 'facility-delay') return [
    { label: 'HOLD POSITION', body: 'Hold there for now. I’m tracking the delay.', communication: 'delay-hold', score: 1 },
    { label: 'SEND UPDATED ETA', body: 'Send me an updated ETA once they get you moving.', communication: 'request-eta', score: 1 },
    { label: 'I’LL CHECK FACILITY', body: 'Stay put. I’m checking on the facility from my side.', communication: 'facility-followup', score: 1 },
  ]

  if (intent === 'pickup-exception' || status === 'pickup-issue') return [
    { label: 'HOLD POSITION', body: 'Hold there. Don’t roll until we get this corrected.', communication: 'issue-hold', score: 1 },
    { label: 'GET IT CORRECTED', body: 'Have them correct the freight before you leave. Keep me posted.', communication: 'issue-correction', score: 1 },
    { label: 'SEND DETAILS', body: 'Send me the details on what’s wrong and hold there.', communication: 'issue-details', score: 1 },
  ]

  if (intent === 'delivery-exception') return [
    { label: 'HOLD POSITION', body: 'Hold there while I work on it.', communication: 'issue-hold', score: 1 },
    { label: 'SEND DETAILS', body: 'Send me exactly what the receiver is saying.', communication: 'issue-details', score: 1 },
    { label: 'KEEP FREIGHT SECURE', body: 'Keep the freight secured. Don’t release anything until we sort it out.', communication: 'issue-protect', score: 1 },
  ]

  if (latestInbound.requiresResponse) return [
    { label: 'ACKNOWLEDGE', body: 'Copy. I’m on it.', communication: 'acknowledge', score: 0 },
  ]

  return []
}
