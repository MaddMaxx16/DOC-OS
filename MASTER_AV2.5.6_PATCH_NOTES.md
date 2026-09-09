# MASTER AV2.5.6 PATCH NOTES

## Continuous Driver Render Clock

AV2.5.6 is a one-purpose motion hotfix built on AV2.5.5.

### Changes
- Replaced tick-chasing driver marker interpolation with a persistent requestAnimationFrame render clock.
- Visual driver progress now advances using fractional game minutes derived from wall-clock elapsed time and simulation speed.
- The render loop no longer restarts when gameTime, runtime progress, or simulation speed updates.
- Pause freezes visual motion immediately; the authoritative simulation still owns trip state and arrival.
- Authoritative runtime progress is used only as a significant drift/recovery checkpoint instead of a once-per-tick visual target.
- Added cached route metrics and binary segment lookup so long route polylines are not re-measured every animation frame.

### Explicitly unchanged
- Routing providers and route geometry ownership
- Departure / arrival lifecycle
- Game clock cadence
- Save / resume state
- Alert routing
- Messages workflow
- Camera behavior

### Validation
- Source-level structural review completed.
- Archive integrity verified before delivery.
- Full Vite build could not be certified in the patch environment because dependency installation timed out; iPhone test build remains the acceptance gate.
