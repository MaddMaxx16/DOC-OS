const mapLocations = [
  {
    id: 'metroline-yard', name: 'Metroline Yard', type: 'yard', longitude: -74.0129, latitude: 40.6535,
  },
  {
    id: 'empire-freight-terminal',
    name: 'Empire Wireless Distribution',
    type: 'pickup',
    longitude: -74.0116,
    latitude: 40.6759,
  },
  {
    id: 'harborline-logistics',
    name: 'Harborline Retail Supply',
    type: 'delivery',
    longitude: -73.9442,
    latitude: 40.7447,
  },
  { id: 'liberty-distribution-center', name: 'Liberty Pharmacy & Wellness DC', type: 'pickup', longitude: -74.18, latitude: 40.66 },
  { id: 'bronx-commerce-terminal', name: 'Bronx Fresh Markets DC', type: 'delivery', longitude: -73.91, latitude: 40.82 },

  // Fictional DOC OS facilities placed in real NY/NJ industrial districts.
  { id: 'brooklyn-industrial-terminal', name: 'Brooklyn Home & Hardware DC', type: 'facility', longitude: -74.0060, latitude: 40.6570 },
  { id: 'queens-freight-center', name: 'Queens Mobile & Electronics DC', type: 'facility', longitude: -73.8440, latitude: 40.7350 },
  { id: 'newark-distribution-hub', name: 'Newark Grocery Supply DC', type: 'facility', longitude: -74.1610, latitude: 40.7080 },
  { id: 'elizabeth-logistics-park', name: 'Elizabeth Pet & Home Distribution', type: 'facility', longitude: -74.1870, latitude: 40.6630 },


  // Customer-style facilities make the freight world feel like actual shippers and receivers.
  { id: 'zmart-regional-warehouse', name: 'ZMart Regional Warehouse', type: 'facility', longitude: -74.1320, latitude: 40.7270 },
  { id: 'freshway-grocery-dc', name: 'FreshWay Grocery DC', type: 'facility', longitude: -73.8900, latitude: 40.7520 },
  { id: 'northstar-home-supply', name: 'NorthStar Home Supply Warehouse', type: 'facility', longitude: -74.2140, latitude: 40.6960 },
  { id: 'summit-auto-parts-dc', name: 'Summit Auto Parts Distribution', type: 'facility', longitude: -74.0750, latitude: 40.7350 },
  { id: 'metro-beverage-warehouse', name: 'Metro Beverage Warehouse', type: 'facility', longitude: -73.9300, latitude: 40.8030 },
  // Regional / overnight lanes. Fictional customers, real-city geography.
  { id: 'keystone-retail-pittsburgh', name: 'Keystone Retail Distribution Center', type: 'facility', longitude: -80.0059, latitude: 40.4406 },
  { id: 'penn-valley-allentown', name: 'Penn Valley Fulfillment Center', type: 'facility', longitude: -75.4902, latitude: 40.6084 },
  { id: 'liberty-home-philadelphia', name: 'Liberty Home Goods DC', type: 'facility', longitude: -75.1652, latitude: 39.9526 },

  // Driver positioning destinations. These are operating/staging points rather than freight facilities.
  { id: 'queens-staging-area', name: 'Queens Staging Area', type: 'staging', longitude: -73.8990, latitude: 40.7470 },
  { id: 'newark-fuel-stop', name: 'Newark Fuel & Rest Stop', type: 'staging', longitude: -74.1485, latitude: 40.7200 },
]

export default mapLocations
