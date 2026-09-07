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
    listedMiles: 10.1,
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
    rate: 825, listedMiles: 30.6, plannedMiles: null, plannedDriveTimeMinutes: null, selectedRouteId: null, candidateDriverId: null, status: 'available', assignedDriverId: null,
  },

  // Day 2 freight pool. The calendar date is resolved when Day 2 begins so the
  // operation can start correctly even when the tutorial closes late.
  { id: 'DOC101', scheduledOperationDay: 2, pickupLocationId: 'brooklyn-industrial-terminal', deliveryLocationId: 'queens-freight-center', pickupWindowStartMinutes: 525, pickupWindowEndMinutes: 585, deliveryWindowStartMinutes: 660, deliveryWindowEndMinutes: 735, rate: 575, listedMiles: 15.8, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC102', scheduledOperationDay: 2, pickupLocationId: 'bronx-commerce-terminal', deliveryLocationId: 'newark-distribution-hub', pickupWindowStartMinutes: 570, pickupWindowEndMinutes: 630, deliveryWindowStartMinutes: 720, deliveryWindowEndMinutes: 795, rate: 760, listedMiles: 22.4, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC103', scheduledOperationDay: 2, pickupLocationId: 'queens-freight-center', deliveryLocationId: 'elizabeth-logistics-park', pickupWindowStartMinutes: 645, pickupWindowEndMinutes: 705, deliveryWindowStartMinutes: 795, deliveryWindowEndMinutes: 870, rate: 890, listedMiles: 31.7, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC104', scheduledOperationDay: 2, pickupLocationId: 'newark-distribution-hub', deliveryLocationId: 'brooklyn-industrial-terminal', pickupWindowStartMinutes: 720, pickupWindowEndMinutes: 780, deliveryWindowStartMinutes: 855, deliveryWindowEndMinutes: 930, rate: 845, listedMiles: 19.9, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC105', scheduledOperationDay: 2, pickupLocationId: 'elizabeth-logistics-park', deliveryLocationId: 'bronx-commerce-terminal', pickupWindowStartMinutes: 780, pickupWindowEndMinutes: 840, deliveryWindowStartMinutes: 930, deliveryWindowEndMinutes: 1005, rate: 1025, listedMiles: 35.2, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC106', scheduledOperationDay: 2, pickupLocationId: 'queens-freight-center', deliveryLocationId: 'brooklyn-industrial-terminal', pickupWindowStartMinutes: 855, pickupWindowEndMinutes: 915, deliveryWindowStartMinutes: 960, deliveryWindowEndMinutes: 1020, rate: 525, listedMiles: 12.6, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC107', scheduledOperationDay: 2, pickupLocationId: 'brooklyn-industrial-terminal', deliveryLocationId: 'newark-distribution-hub', pickupWindowStartMinutes: 900, pickupWindowEndMinutes: 960, deliveryWindowStartMinutes: 1035, deliveryWindowEndMinutes: 1110, rate: 930, listedMiles: 24.8, status: 'available', assignedDriverId: null, candidateDriverId: null },
]

export default loads
