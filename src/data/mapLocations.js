const mapLocations = [
  {
    id: 'metroline-yard', name: 'Metroline Yard', type: 'yard', longitude: -74.0129, latitude: 40.6535,
  },
  {
    id: 'empire-freight-terminal',
    name: 'Empire Freight Terminal',
    type: 'pickup',
    longitude: -74.0116,
    latitude: 40.6759,
  },
  {
    id: 'harborline-logistics',
    name: 'Harborline Logistics',
    type: 'delivery',
    longitude: -73.9442,
    latitude: 40.7447,
  },
  { id: 'liberty-distribution-center', name: 'Liberty Distribution Center', type: 'pickup', longitude: -74.18, latitude: 40.66 },
  { id: 'bronx-commerce-terminal', name: 'Bronx Commerce Terminal', type: 'delivery', longitude: -73.91, latitude: 40.82 },

  // Fictional DOC OS facilities placed in real NY/NJ industrial districts.
  { id: 'brooklyn-industrial-terminal', name: 'Brooklyn Industrial Terminal', type: 'facility', longitude: -74.0060, latitude: 40.6570 },
  { id: 'queens-freight-center', name: 'Queens Freight Center', type: 'facility', longitude: -73.8440, latitude: 40.7350 },
  { id: 'newark-distribution-hub', name: 'Newark Distribution Hub', type: 'facility', longitude: -74.1610, latitude: 40.7080 },
  { id: 'elizabeth-logistics-park', name: 'Elizabeth Logistics Park', type: 'facility', longitude: -74.1870, latitude: 40.6630 },

  // Driver positioning destinations. These are operating/staging points rather than freight facilities.
  { id: 'queens-staging-area', name: 'Queens Staging Area', type: 'staging', longitude: -73.8990, latitude: 40.7470 },
  { id: 'newark-fuel-stop', name: 'Newark Fuel & Rest Stop', type: 'staging', longitude: -74.1485, latitude: 40.7200 },
]

export default mapLocations
