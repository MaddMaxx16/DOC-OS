# MASTER O — FreightLink Final Polish Pass

Built from Master N.

## Changes
- Replaced the Day 2 four-button sort strip with a compact caret dropdown beside the load-section heading.
- Removed the redundant live-count pill beside the FreightLink title; counts remain in Available / Active / History.
- Raised the FreightLink browse-map instructional tooltip so it no longer crowds the Drivers control / bottom sheet.
- Added a BACK control while a FreightLink map load is selected. BACK clears the selected lane and returns to all available pins; EXIT still leaves FreightLink browse mode entirely.
- Removed the temporary straight-line route placeholder. A selected load now shows CALCULATING ROUTE… while the road route is being computed, and the lane is drawn only once the real routed geometry is ready.
- Added request guarding so rapidly selecting different loads cannot display a stale route response.

## Locked flow
All pins -> select load -> calculating -> real route -> preview -> BACK to all pins OR VIEW LOAD -> phone details.
