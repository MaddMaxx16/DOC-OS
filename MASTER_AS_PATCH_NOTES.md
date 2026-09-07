# MASTER AS PATCH NOTES

## Freight Condition Continuity + POD Handoff

AS builds directly on the tested AR2 Unload Sequencing build with the `REJECTED MOVES` terminology polish.

### Problem
Pickup loading already creates persistent shipment truth for missing and damaged freight, but POD verification still assumed every approvable delivery had to be perfectly clean. That could disable `No damage reported` or block approval whenever legitimate pickup damage/shortage flowed into delivery.

### Changes
- POD creation now reads freight condition from the pickup-established `shipment` state.
- Expected pallet count, received pallet count, shortage count, and damage count are carried into the delivery result/POD from the same authoritative shipment state.
- POD stores a small `freightCondition` continuity record identifying pickup shipment state as the source.
- Clean loads continue to show `No damage reported`.
- Loads with pickup damage show `Damage notation present · X pallet(s) noted` and can be explicitly verified.
- Loads with a shortage show `Piece count recorded · received / expected` and can be explicitly verified.
- POD verification now checks whether count/damage information is present and accurate enough to review, rather than requiring a perfect count and zero damage.
- Exception helper copy identifies that the condition was carried forward from pickup.

### Unchanged
- AR2 Unload Sequencing / Space Clearing gameplay.
- 45-second dock timer.
- Two staging spaces.
- Current + next two receiver requests.
- Move/rejected-move scoring and delay rules.
- POD approval still owns operational closeout and queued-load handoff.

### Design intent
Damage and shortage happen in the physical freight lifecycle, not inside the paperwork screen. The POD is the final record of shipment truth:

`Pickup condition -> Trailer state -> Delivery -> POD -> Closeout`

### Workflow status
TEST BUILD ONLY. Do not sync AS into the real Git repo until Maxx confirms on-device that clean and exception PODs behave correctly.
