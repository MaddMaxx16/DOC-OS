# MASTER AQ PATCH NOTES

**Date:** 2026-09-07  
**Base:** Master AP1  
**Focus:** Delivery Facility Arrival Lifecycle V1

## What changed
- Removed the manual delivery `CHECK IN` requirement.
- Marcus automatically enters `CHECKING IN` when he reaches the receiver.
- After five game minutes he reports that he is checked in and moves to `WAITING FOR DOCK`.
- Receiver dock timing is appointment-aware:
  - Early: 12 game minutes
  - In-window: 10 game minutes
  - Late: 30 game minutes
- The map status pill shows remaining delivery dock ETA.
- When the dock becomes ready, DOC OS surfaces a `DOCK READY` delivery alert.
- The delivery facility popup then exposes `BEGIN UNLOADING`.
- `BEGIN UNLOADING` starts the existing 8-game-minute unloading placeholder and preserves the current POD flow.

## Communication contract
- Marcus sends an arrival message when he reaches the receiver.
- Marcus sends a second message after check-in when he is waiting for a door.
- Messages are derived from authoritative load timestamps and do not advance trip state.

## Intentionally unchanged
- Pickup Operations V1 / AP1 behavior.
- Pickup loading puzzle and shipment-state rules.
- Delivery unloading gameplay beyond the existing timed placeholder.
- POD verification/approval and closeout logic.
- Freight Market, ledger, queue promotion, and appointment scoring.

## Test target
`EN ROUTE TO DELIVERY -> ARRIVE -> CHECKING IN -> WAITING FOR DOCK -> DOCK READY -> BEGIN UNLOADING -> UNLOADING -> POD READY`
