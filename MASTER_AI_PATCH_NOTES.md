# DOC OS Master AI — Loading Challenge V1

Built from locked checkpoint Master AH.

## Added
- Interactive pickup Facility Ops loading challenge after pickup check-in.
- Facility popup now exposes BEGIN LOADING while checked in at pickup.
- 24-second dock timer with 8 pallet shipment.
- Player taps staged pallets to load trailer positions.
- Perfect completion records a clean 8/8 pickup.
- Timer expiry records any unhandled pallets as missing freight.
- Each missing pallet adds 5 game minutes of facility handling delay.
- Normal pickup loading consumes the existing 10 game-minute pickup service duration.
- Loading outcome is persisted on the load under `facilityOps.pickup` and `shipment` for future damage/unloading/POD exception systems.
- Game clock pauses while the challenge is open, then advances by service + earned delay when confirmed.

## Lifecycle change
Old:
CHECK IN -> automatic LOADING timer -> LOADED

Master AI:
CHECK IN -> facility popup -> BEGIN LOADING -> timed loading challenge -> CONFIRM LOAD -> LOADED

## Scope boundary
Master AI intentionally does not yet add fragile freight, damage mechanics, unloading challenge, or POD exception rendering. The shipment state added here is the foundation for those next patches.
