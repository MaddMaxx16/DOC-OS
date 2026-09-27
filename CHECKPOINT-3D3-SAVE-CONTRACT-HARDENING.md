# Checkpoint 3D.3 — Save Contract Hardening

- Adds explicit per-slot save-state schema versioning (`SAVE_STATE_VERSION = 1`).
- Migrates existing unversioned v2 slots and legacy v1 single-slot saves into the current state contract.
- Validates structural save data before accepting or loading it.
- Makes `saveGame` report success/failure instead of silently swallowing write failures.
- On localStorage quota pressure, evicts disposable persisted road-route geometry and retries the player save once.
- Reduces persisted road-route cache ceiling from 80 to 40 and shrinks/clears it on cache write pressure.
- Adds a mobile-safe in-game warning banner when a save genuinely cannot be written.
- Expands the truthful Node harness from 41 to 44 tests, including state migration, invalid-save rejection, and quota recovery.

Gameplay, movement authority, freight lifecycle, routing provider order, and save-slot UX are otherwise unchanged.
