# Checkpoint 3B.7 — Diagnostic Cleanup

## Base
Checkpoint 3B.6 — Restored Map Continuity.

## Change
- Preserves the 3B.6 paused-save travel-key hydration fix exactly.
- Removes the temporary GameMap debug logger dependency and map-state diagnostic emission.
- No simulation, movement, route, camera, lifecycle, gameplay, or visual design behavior is intentionally changed.

## Acceptance
1. Load the same mid-route save with the game paused.
2. Marcus appears at the restored position.
3. Press Play.
4. Marcus continues forward with no route-origin snap.
5. Arrival and normal app navigation still behave normally.
6. Run `npm test` and `npm run build` before continuing.

## Note
This patch only cleans diagnostics present in the 3B.6 patch surface. Any older trace UI installed by an earlier diagnostic patch but living outside GameMap should be removed in a separate cleanup patch after inspecting that file from the project source.
