const loads = [
  {
    id: 'DOC001',
    pickupLocationId: 'empire-freight-terminal',
    deliveryLocationId: 'harborline-logistics',
    pickupDayIndex: 0,
    pickupWindowStartMinutes: 540,
    pickupWindowEndMinutes: 600,
    deliveryDayIndex: 0,
    deliveryWindowStartMinutes: 720,
    deliveryWindowEndMinutes: 780,
    rate: 650,
    listedMiles: null,
    plannedMiles: null,
    plannedDriveTimeMinutes: null,
    selectedRouteId: null,
    candidateDriverId: null,
    status: 'available',
    assignedDriverId: null,
  },
  {
    id: 'DOC002', pickupLocationId: 'liberty-distribution-center', deliveryLocationId: 'bronx-commerce-terminal', unlockAfterLoadId: 'DOC001',
    pickupDayIndex: 1, pickupWindowStartMinutes: 540, pickupWindowEndMinutes: 600, deliveryDayIndex: 1, deliveryWindowStartMinutes: 750, deliveryWindowEndMinutes: 840,
    rate: 825, listedMiles: null, plannedMiles: null, plannedDriveTimeMinutes: null, selectedRouteId: null, candidateDriverId: null, status: 'available', assignedDriverId: null,
  },
]

export default loads
