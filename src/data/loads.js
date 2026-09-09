const loads = [
  // Freight Market Refresh V2
  // 7:00 AM opens with a healthy pre-shift board. Later waves ADD freight while
  // valid existing freight stays on the board until accepted or expired.
  // Email state never controls market visibility.
  {
    id: 'DOC001', loadNumber: 'LD-78421', postedGameMinute: 420, marketPostMinutes: 420,
    pickupLocationId: 'empire-freight-terminal', deliveryLocationId: 'harborline-logistics',
    pickupDayIndex: 0, pickupWindowStartMinutes: 540, pickupWindowEndMinutes: 600,
    deliveryDayIndex: 0, deliveryWindowStartMinutes: 720, deliveryWindowEndMinutes: 780,
    rate: 650, listedMiles: 10.1, plannedMiles: null, plannedDriveTimeMinutes: null,
    selectedRouteId: null, candidateDriverId: null, status: 'available', assignedDriverId: null,
  },
  {
    id: 'DOC002', loadNumber: 'LD-61854', postedGameMinute: 420, marketPostMinutes: 420,
    pickupLocationId: 'liberty-distribution-center', deliveryLocationId: 'bronx-commerce-terminal',
    pickupDayIndex: 1, pickupWindowStartMinutes: 540, pickupWindowEndMinutes: 600,
    deliveryDayIndex: 1, deliveryWindowStartMinutes: 750, deliveryWindowEndMinutes: 840,
    rate: 825, listedMiles: 30.6, plannedMiles: null, plannedDriveTimeMinutes: null,
    selectedRouteId: null, candidateDriverId: null, status: 'available', assignedDriverId: null,
  },

  // 7:00 AM INITIAL MARKET — seven total choices including the first two seeded loads.
  { id: 'DOC101', loadNumber: 'LD-90317', postedGameMinute: 420, marketPostMinutes: 420, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'brooklyn-industrial-terminal', deliveryLocationId: 'queens-freight-center', pickupWindowStartMinutes: 600, pickupWindowEndMinutes: 660, deliveryWindowStartMinutes: 735, deliveryWindowEndMinutes: 810, rate: 575, listedMiles: 15.8, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC102', loadNumber: 'LD-47266', postedGameMinute: 420, marketPostMinutes: 420, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'bronx-commerce-terminal', deliveryLocationId: 'newark-distribution-hub', pickupWindowStartMinutes: 630, pickupWindowEndMinutes: 690, deliveryWindowStartMinutes: 780, deliveryWindowEndMinutes: 855, rate: 760, listedMiles: 22.4, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC103', loadNumber: 'LD-85109', postedGameMinute: 420, marketPostMinutes: 420, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'queens-freight-center', deliveryLocationId: 'elizabeth-logistics-park', pickupWindowStartMinutes: 675, pickupWindowEndMinutes: 735, deliveryWindowStartMinutes: 825, deliveryWindowEndMinutes: 900, rate: 890, listedMiles: 31.7, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC104', loadNumber: 'LD-33642', postedGameMinute: 420, marketPostMinutes: 420, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'newark-distribution-hub', deliveryLocationId: 'brooklyn-industrial-terminal', pickupWindowStartMinutes: 720, pickupWindowEndMinutes: 780, deliveryWindowStartMinutes: 855, deliveryWindowEndMinutes: 930, rate: 845, listedMiles: 19.9, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC105', loadNumber: 'LD-72518', postedGameMinute: 420, marketPostMinutes: 420, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'elizabeth-logistics-park', deliveryLocationId: 'bronx-commerce-terminal', pickupWindowStartMinutes: 780, pickupWindowEndMinutes: 840, deliveryWindowStartMinutes: 930, deliveryWindowEndMinutes: 1005, rate: 1025, listedMiles: 35.2, status: 'available', assignedDriverId: null, candidateDriverId: null },

  // 9:00 AM CONTINUOUS MARKET REFRESH
  { id: 'DOC106', loadNumber: 'LD-59403', postedGameMinute: 540, marketPostMinutes: 540, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'queens-freight-center', deliveryLocationId: 'brooklyn-industrial-terminal', pickupWindowStartMinutes: 750, pickupWindowEndMinutes: 810, deliveryWindowStartMinutes: 855, deliveryWindowEndMinutes: 930, rate: 525, listedMiles: 12.6, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC107', loadNumber: 'LD-81725', postedGameMinute: 570, marketPostMinutes: 570, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'brooklyn-industrial-terminal', deliveryLocationId: 'newark-distribution-hub', pickupWindowStartMinutes: 810, pickupWindowEndMinutes: 870, deliveryWindowStartMinutes: 945, deliveryWindowEndMinutes: 1020, rate: 930, listedMiles: 24.8, status: 'available', assignedDriverId: null, candidateDriverId: null },

  // 10:30 AM CONTINUOUS MARKET REFRESH
  { id: 'DOC108', loadNumber: 'LD-26094', postedGameMinute: 630, marketPostMinutes: 630, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'newark-distribution-hub', deliveryLocationId: 'queens-freight-center', pickupWindowStartMinutes: 855, pickupWindowEndMinutes: 915, deliveryWindowStartMinutes: 990, deliveryWindowEndMinutes: 1065, rate: 980, listedMiles: 27.2, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC109', loadNumber: 'LD-68137', postedGameMinute: 690, marketPostMinutes: 690, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'elizabeth-logistics-park', deliveryLocationId: 'brooklyn-industrial-terminal', pickupWindowStartMinutes: 900, pickupWindowEndMinutes: 960, deliveryWindowStartMinutes: 1020, deliveryWindowEndMinutes: 1095, rate: 840, listedMiles: 22.0, status: 'available', assignedDriverId: null, candidateDriverId: null },

  // 12:30 PM CONTINUOUS MARKET REFRESH
  { id: 'DOC110', loadNumber: 'LD-94512', postedGameMinute: 750, marketPostMinutes: 750, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'queens-freight-center', deliveryLocationId: 'newark-distribution-hub', pickupWindowStartMinutes: 990, pickupWindowEndMinutes: 1050, deliveryWindowStartMinutes: 1110, deliveryWindowEndMinutes: 1185, rate: 1100, listedMiles: 30.5, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC111', loadNumber: 'LD-40386', postedGameMinute: 810, marketPostMinutes: 810, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'bronx-commerce-terminal', deliveryLocationId: 'elizabeth-logistics-park', pickupWindowStartMinutes: 1020, pickupWindowEndMinutes: 1080, deliveryWindowStartMinutes: 1170, deliveryWindowEndMinutes: 1245, rate: 965, listedMiles: 29.1, status: 'available', assignedDriverId: null, candidateDriverId: null },

  // 2:30 PM CONTINUOUS MARKET REFRESH
  { id: 'DOC112', loadNumber: 'LD-75931', postedGameMinute: 870, marketPostMinutes: 870, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'brooklyn-industrial-terminal', deliveryLocationId: 'queens-freight-center', pickupWindowStartMinutes: 1110, pickupWindowEndMinutes: 1170, deliveryWindowStartMinutes: 1230, deliveryWindowEndMinutes: 1305, rate: 705, listedMiles: 16.9, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC113', loadNumber: 'LD-52847', postedGameMinute: 930, marketPostMinutes: 930, pickupDayIndex: 0, deliveryDayIndex: 1, pickupLocationId: 'newark-distribution-hub', deliveryLocationId: 'bronx-commerce-terminal', pickupWindowStartMinutes: 1170, pickupWindowEndMinutes: 1230, deliveryWindowStartMinutes: 510, deliveryWindowEndMinutes: 600, rate: 1180, listedMiles: 26.4, status: 'available', assignedDriverId: null, candidateDriverId: null },

  // 4:30 PM+ LATE-DAY MARKET — enough freight remains to keep a long shift alive.
  { id: 'DOC114', loadNumber: 'LD-31478', postedGameMinute: 990, marketPostMinutes: 990, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'queens-freight-center', deliveryLocationId: 'bronx-commerce-terminal', pickupWindowStartMinutes: 1050, pickupWindowEndMinutes: 1140, deliveryWindowStartMinutes: 1200, deliveryWindowEndMinutes: 1290, rate: 790, listedMiles: 18.4, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC115', loadNumber: 'LD-67245', postedGameMinute: 1050, marketPostMinutes: 1050, pickupDayIndex: 0, deliveryDayIndex: 0, pickupLocationId: 'elizabeth-logistics-park', deliveryLocationId: 'queens-freight-center', pickupWindowStartMinutes: 1110, pickupWindowEndMinutes: 1200, deliveryWindowStartMinutes: 1260, deliveryWindowEndMinutes: 1350, rate: 1015, listedMiles: 28.7, status: 'available', assignedDriverId: null, candidateDriverId: null },
  { id: 'DOC116', loadNumber: 'LD-88902', postedGameMinute: 1110, marketPostMinutes: 1110, pickupDayIndex: 0, deliveryDayIndex: 1, pickupLocationId: 'newark-distribution-hub', deliveryLocationId: 'brooklyn-industrial-terminal', pickupWindowStartMinutes: 1170, pickupWindowEndMinutes: 1260, deliveryWindowStartMinutes: 480, deliveryWindowEndMinutes: 570, rate: 1240, listedMiles: 23.5, status: 'available', assignedDriverId: null, candidateDriverId: null },

]

export default loads
