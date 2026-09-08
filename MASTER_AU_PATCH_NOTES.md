# MASTER AU — Interaction & Puzzle Polish

Built from MASTER AT2.

## Player-owned puzzle completion
- Pickup no longer auto-finishes when all eight pallets are correct.
- Once all eight pallets are aboard, `SECURE LOAD` becomes available and shows remaining dock seconds.
- Delivery no longer auto-finishes when the final requested pallet reaches the receiver.
- `COMPLETE UNLOAD` becomes available and shows remaining dock seconds.
- Timeout behavior remains intact.

## Pickup trailer correction
- Trailer pallets can be swapped slot-to-slot, including when every trailer slot is occupied.
- This lets the player catch and repair a bad placement before securing the load.

## Efficiency reward
- Clean pickup and delivery facility operations can add a small XP efficiency bonus based on unused dock seconds.
- Speed does not erase freight or handling mistakes.
- Load Result now surfaces the efficiency XP when earned.

## Driver communication
- Marcus message threads now offer lightweight dispatcher quick replies.
- Replies are stored as outbound dispatcher messages; they do not mutate simulation state.
- Existing formal load-update workflow remains unchanged.

## Alert hierarchy
- Operations drawer notifications now identify their source category (Driver Comms, Facility Ops, Appointment, Documents, DOC OS).
- This is presentation-only; alerts still navigate and never mutate simulation state.

## Wording
- Delivery timeout now says `PALLET(S) NOT CLEARED` instead of `STILL ON DOCK`.

## Intentionally not changed
- Load lifecycle/state machine.
- Route recovery from AT2.
- Dock-ready pause behavior from AT1.
- POD/freight-condition continuity.
- Active-operation resume persistence is a separate stabilization concern and is not silently refactored here.
