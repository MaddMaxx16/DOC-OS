import { getCarrierRelationshipLabel } from './carrierAgreement.js'

export function getCarrierSourceLocation(carrier) {
  const explicit = carrier?.carrierSource?.homeBaseLabel
  if (explicit) return explicit
  return [carrier?.city, carrier?.state].filter(Boolean).join(', ') || 'Location not listed'
}

export function getCarrierSourceInitials(carrier) {
  if (carrier?.carrierSource?.initials) return carrier.carrierSource.initials
  const words = String(carrier?.name || 'Carrier').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'CR'
}

export function getCarrierSourceAccountType(carrier) {
  return carrier?.carrierSource?.accountType || 'Independent Dispatch'
}

export function getCarrierSourceSummary(carrier) {
  return carrier?.carrierSource?.summary || `${carrier?.serviceArea || 'Regional'} carrier seeking day-to-day dispatch support for freight sourcing, trip planning, service windows and driver communication.`
}

export function getCarrierSourceDescription(carrier) {
  const equipment = carrier?.equipment?.length ? carrier.equipment.join(', ') : 'general freight'
  return carrier?.carrierSource?.description || `${carrier?.name || 'This carrier'} operates ${equipment} service in the ${carrier?.serviceArea || 'regional'} market and is looking for day-to-day dispatch support.`
}

export function getCarrierSourceMarketLabel(carrier) {
  if (carrier?.carrierSource?.marketLabel) return carrier.carrierSource.marketLabel
  if (carrier?.state) return carrier.state === 'NY' ? 'NEW YORK' : carrier.state
  return String(carrier?.serviceArea || 'OPPORTUNITIES').toUpperCase()
}

export function getCarrierSourceEquipmentLabel(carrier) {
  const raw = carrier?.carrierSource?.equipmentLabel || carrier?.equipment?.[0] || 'General Freight'
  return String(raw).replace(/^53['’]\s*/i, '').trim()
}

export function getCarrierSourceRosterLabel(carrier) {
  const count = Number(carrier?.fleetSize ?? carrier?.driverIds?.length ?? 0)
  return `${count} driver${count === 1 ? '' : 's'}`
}

export function isCarrierSourceActive(carrier, application) {
  return application?.status === 'ACCEPTED' || carrier?.status === 'active'
}

export function getCarrierSourceStatus(application, carrier) {
  if (isCarrierSourceActive(carrier, application)) return { key: 'active', label: 'ACTIVE CLIENT' }
  if (application?.status === 'OFFER_RECEIVED') return { key: 'offer', label: 'OFFER RECEIVED' }
  if (application?.status === 'PENDING') return { key: 'pending', label: 'APPLICATION PENDING' }
  return { key: 'prospect', label: 'NOW HIRING' }
}

export function getCarrierSourceStanding(carrier, career) {
  if (career?.standing) return career.standing
  const score = Number.isFinite(Number(career?.relationshipScore)) ? Number(career.relationshipScore) : carrier?.relationshipScore
  return getCarrierRelationshipLabel(score)
}
