# DOC OS — Driver Operations v2.1 + Trip Planning v2

This build is based on the tested Driver Operations v2 + Trip Planning v2 source.

## Tiny operational consistency fixes
- WAITING AT PICKUP no longer repeats Empire Freight Terminal as both NEXT STOP and LOCATION.
- WAITING AT PICKUP now shows CURRENT LOCATION and WAIT TIME.
- LOADED now correctly shows:
  - CURRENT LOCATION: Empire Freight Terminal
  - NEXT STOP: Harborline Logistics
- READY FOR DISPATCH carries the same current-location / next-stop model forward.

## Preserved
- Driver Operations v2 visual design
- Trip Planning v2 visual design
- Route A / recommended route flow
- Tutorial highlights
- SELECT ROUTE -> CONFIRM PLAN behavior
- SEND TO PICKUP
- pickup wait/check-in/loading flow
- PLAN DELIVERY TRIP progression

## Delivery Planning v2 patch
- Restyles Delivery Planning to match Trip Planning v2.
- Adds loaded-route ETA and delivery-window buffer metrics.
- Preserves existing route selection / confirm logic and tutorial highlights.
- Narrows the SELECT ROUTE CTA on both Trip Planning and Delivery Planning for better inset spacing on iPhone.
