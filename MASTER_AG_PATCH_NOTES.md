# MASTER AG — Multi-Load Handoff Movement Guard

Base: DOC-OS-MASTER-2026-09-06-AF

## Problem
With two accepted loads, Marcus could regress into the earlier handoff bug and visually/operationally jump toward a delivery during the transition to the next load.

## Fix
- Movement ownership now comes only from `getDriverActiveLoad()` — the single promoted non-queued load.
- Queued or stale travel states can no longer own Marcus movement.
- When the next queued load is promoted, it is normalized into a fresh `assigned` pickup-leg state.
- Old pickup/delivery departure, arrival, route, unloading, and POD fields are cleared on promotion.
- The previous receiver remains Marcus's authoritative runtime position; the next valid sequence is `ASSIGNED -> PLAN PICKUP -> BRIEF -> DISPATCH -> EN ROUTE TO PICKUP`.

## Preserved
- AF stale POD marker-label fix.
- POD closeout behavior.
- Communications V1.
- Freight market and unrelated systems.
