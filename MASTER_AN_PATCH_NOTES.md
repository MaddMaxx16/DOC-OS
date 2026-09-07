# DOC OS MASTER AN PATCH NOTES

## Loading Puzzle V1

Master AN branches from the verified Master AM loading drag-and-drop checkpoint.

### Gameplay changes
- Loading challenge is now a quick placement puzzle instead of pure speed.
- 8 pallets are deterministically mixed per load:
  - 2 HEAVY
  - 4 STANDARD
  - 2 FRAGILE
- Trailer zones:
  - FRONT: heavy freight
  - CENTER: standard freight
  - REAR: fragile freight
- Challenge timer is 28 real seconds.
- Filling all 8 slots incorrectly does not end the challenge. The clock continues so the player can rearrange freight.
- Pallets already inside the trailer can be dragged to another open slot.
- Challenge ends early only when all 8 pallets are loaded in their correct zones.

### Consequences
- Freight not aboard when time expires is recorded as missing freight.
- Freight left in the wrong zone when time expires is recorded as damaged freight.
- Missing freight adds 5 game minutes per pallet.
- Misplaced/damaged freight adds 3 game minutes per pallet.
- Pickup shipment state now stores pallet manifest, slot, type, loaded state, and damage state for later delivery/POD integration.

### Scope
- No unloading challenge yet.
- No POD exception rendering yet.
- No changes to load dispatch, routing, queue handoff, or Master AM drag mechanics beyond allowing trailer-to-trailer rearrangement.
