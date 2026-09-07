# MASTER AT1 PATCH NOTES

## Dock Ready Pause Hotfix

AT1 builds directly on Master AT and fixes one timing gap discovered during device testing.

### Problem
AT correctly paused time once the player pressed `BEGIN LOADING` / `BEGIN UNLOADING`, but the actionable facility popup itself could sit open at `DOCK READY` while the simulation clock continued advancing.

That allowed appointment/game time to move while DOC OS was explicitly waiting on a required dispatcher action.

### Fix
- Pickup `checked-in-pickup` / `DOCK READY` now pauses the authoritative game clock as soon as the state becomes actionable.
- Delivery `checked-in-delivery` / `DOCK READY` uses the same timing rule.
- Fast-forward is normalized to 1x at the decision point.
- AT1 records whether the player was already paused before DOC OS took ownership of the dock-ready pause.
- Pressing `BEGIN LOADING` or `BEGIN UNLOADING` no longer overwrites that pause provenance.
- Completing the owned workflow therefore restores the correct prior pause state.

### Timing contract
`WAITING FOR DOCK -> clock runs`

`DOCK READY -> clock pauses`

`BEGIN LOADING / BEGIN UNLOADING -> challenge remains paused`

`challenge completion -> apply earned service/delay minutes -> restore prior clock state`

### Unchanged
- Pickup/loading puzzle rules.
- Unload Sequencing rules and 45-second timer.
- Staging / receiver request logic.
- Freight-condition continuity.
- POD verification/closeout.
- Driver queue/promotion behavior.
- Routing and appointment calculations.

### Workflow status
TEST HOTFIX ONLY. Validate AT1 outside the real Git repo. Promote only after on-device confirmation.
