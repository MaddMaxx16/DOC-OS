# MASTER AR PATCH NOTES

**Build:** Master AR  
**Base:** Master AQ  
**Date:** 2026-09-07

## Unload Sequencing / Space Clearing V1

AR gives delivery a physical logistics puzzle instead of the rejected receiver-classification minigame.

- `BEGIN UNLOADING` opens a 45-second unload sequencing challenge and pauses the simulation clock.
- The trailer is reconstructed from the actual pickup pallet manifest and slot positions.
- Only the rear-most pallet in each trailer lane is accessible.
- The receiver calls for a specific pallet; blocked requested freight must be uncovered by moving accessible blockers into two temporary staging spaces.
- Only requested freight can be sent to the receiver dock.
- Receiver requests remain solvable with the two-space staging constraint.
- Extra moves, wrong receiver attempts, and unfinished freight create handling delay.
- Pickup-created missing/damaged freight remains authoritative and carries forward to the delivery/POD state.
- Confirming the unload consumes the base 8 game-minute delivery service time plus any player-created handling delay and generates POD-ready state.

Lifecycle:
`DOCK READY -> BEGIN UNLOADING -> UNLOAD SEQUENCING -> POD READY`

AQ arrival/check-in/dock-wait behavior and Pickup Operations V1 remain unchanged.
