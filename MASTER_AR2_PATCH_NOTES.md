# MASTER AR2 PATCH NOTES

## Unload Planning Visibility

AR2 builds directly on AR1 Unload Sequencing Onboarding Polish.

### Changes
- Adds an UP NEXT planning panel beside the current receiver request.
- Shows the next two projected receiver requests so the player can use staging intentionally instead of guessing.
- Projection follows an efficient unload path from the current trailer/staging state and updates as the puzzle changes.
- First-run briefing now explicitly teaches the player to use UP NEXT when choosing what to stage.
- In-game hint updated to reinforce staging as a planning resource.
- No changes to the 45-second dock timer, staging capacity, move scoring, receiver acceptance rule, or load/POD lifecycle.

### Design intent
Pickup remains about placing freight correctly. Delivery remains about extracting freight efficiently. AR2 gives the player enough forward visibility for staging decisions to become skill-based instead of luck-based.

### Workflow status
TEST BUILD ONLY. Do not sync to the real Git repo until Maxx confirms the planning window feels right on device.

## Terminology polish
- Renamed player-facing unload result label from `MIS-CUES` to `REJECTED MOVES` for clearer feedback.
- No gameplay, scoring, timing, or unload-sequencing logic changed.
