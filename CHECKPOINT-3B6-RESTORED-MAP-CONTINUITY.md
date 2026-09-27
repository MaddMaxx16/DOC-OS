# Checkpoint 3B.6 — Restored Map Continuity

## Finding
3B.5 proved the schedule departure writer was not firing during the observed jump. The freight movement trace was internally consistent after Play.

The remaining jump was in GameMap's visual animation lifecycle. On a fresh mount, `activeTravelKey` is empty. While paused, the map correctly displays the restored `runtimePositions` marker. On the first unpaused frame, the active freight leg looked "new" to GameMap, so the existing new-leg guard intentionally pinned the marker to route point 0 before normal interpolation resumed.

## Change
While the game is paused, GameMap now records the currently restored freight leg's travel key without moving the marker. Pressing Play therefore continues the already-restored leg instead of treating it as a newly installed route.

The existing route-origin pin remains unchanged for genuinely new freight legs created during live play.

## Acceptance
1. Load a save mid-route; game opens paused.
2. Marcus appears at the restored position.
3. Press Play.
4. Marcus must continue forward with no route-origin snap.
5. Newly started freight legs must still begin normally.
