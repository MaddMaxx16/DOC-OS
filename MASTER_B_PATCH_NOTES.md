# DOC OS Master B — Communications Cleanup

## Scope
Communications only. No new gameplay and no visual redesign.

## Fixed
1. Driver-message identity now survives load closeout and assignment transitions.
2. Marcus Reed no longer falls back to "Driver" when a historical message is rebuilt after his load state changes.
3. Loaded messages only show PLAN DELIVERY while delivery planning is actually still required.
4. Operations alerts no longer directly START TRIP or DISPATCH.
5. Legacy alert action names are backward-safe: they focus Marcus rather than mutating the load.
6. Pickup/delivery alerts navigate to the facility workflow; explicit CHECK IN remains in that workflow.

## Locked Communication Roles
- Messages: human conversation/history.
- Alerts: system operational attention.
- Operations Bar: navigation only.
- Driver/facility workflow: explicit game actions and state mutations.

## Regression target
Play DOC001 and DOC002 end-to-end and specifically test opening Messages before and after each Operations Bar alert.
