# MASTER AU3 — Day Integrity & Operational Cleanup

Built from AU2. Focus: explicit FreightLink commitment, day rollover integrity, idle-driver presentation, carrier-yard visibility, and mobile persistence hardening.

## Changes
- Driver Fit is review-only. Selecting a fit no longer accepts or assigns freight.
- Load Details now requires an explicit `ACCEPT & ASSIGN <DRIVER>` action after fit review.
- Available/candidate freight never creates appointment accountability alerts; only player-owned freight can alert.
- Removed the stale `loading-at-pickup` clock-driven auto-completion path. LoadingChallenge is the sole owner of loading completion.
- Added pagehide/background save flushing while retaining the normal debounced autosave.
- Idle return movement is visually tweened between authoritative clock positions to remove choppy marker jumps.
- Active carrier home base now appears on the map as a Metroline yard marker.
- Idle Marcus shows `RETURNING TO YARD` while repositioning.

## Intentionally not included
- Multi-driver architecture refactor.
- Per-driver runtime progress/routes.
- Minigame/global-clock redesign.
- Unload puzzle visual redesign.
