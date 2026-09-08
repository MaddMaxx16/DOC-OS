# MASTER AU2 — Navigation & Operational Feedback

Built from Master AU1.

- Restores compact `EN ROUTE` status text above Marcus while traveling without bringing back the removed driver card.
- Adds clear `ARRIVED`, `CHECKING IN…`, and `WAITING FOR DOCK` map feedback so automatic facility processing never looks stalled.
- Keeps the dock wait progress ring while removing minute-count clutter from the map.
- Loaded Marcus now exposes `PLAN DELIVERY ROUTE` directly in the driver text thread.
- `DELIVERY PLAN REQUIRED` Operations alerts navigate directly into delivery planning instead of merely focusing the driver.
- The Drivers drawer turns Marcus's loaded/no-route row into a direct `PLAN DELIVERY` action.
- Strengthens the global purple attention token and applies it consistently to alert counts, phone/app badges, and actionable Operations cards.
- AU loading/unloading puzzle behavior and the underlying load lifecycle are unchanged.

Navigation contract:
`Marcus reports loaded -> PLAN DELIVERY ROUTE -> confirm route -> SEND ROUTE SENT & DISPATCH -> EN ROUTE`
