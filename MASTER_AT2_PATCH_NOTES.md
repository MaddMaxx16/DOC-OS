# MASTER AT2 — Route Planning Recovery

AT2 is a narrow progression-safety hotfix built on AT1.

## Fixed

- Pickup and delivery trip planning can no longer remain stuck forever on `CALCULATING` when the external routing service hangs or fails.
- Added a hard 10-second route-resolution ceiling around the live truck-routing request.
- Missing API key, network failure, timeout, malformed response, or routing-service failure now resolves to a deterministic fallback route instead of blocking progression.
- Fallback route provides estimated distance, drive time, and usable geometry so `CONFIRM PLAN` becomes available.
- Reopening trip planning no longer inherits an unresolved route request because the route service always resolves to either live ORS data or a fallback route.
- Pickup and delivery planning share the same protection.
- Planning UI identifies fallback routing rather than pretending the estimate is a live recommended route.

## Fallback contract

`LIVE ROUTE SUCCESS -> use ORS truck route`

`LIVE ROUTE FAILURE / HARD TIMEOUT -> generate safe estimated fallback -> allow CONFIRM PLAN`

The fallback is deliberately simple: straight-line map geometry with a road-distance multiplier and conservative truck-speed estimate. It exists to preserve gameplay progression, not to replace live routing quality.

## Not changed

- Load lifecycle
- Dispatch ownership
- Pickup/delivery state machines
- Loading challenge
- Unload sequencing
- POD / freight-condition continuity
- Dock-ready pause behavior from AT1
