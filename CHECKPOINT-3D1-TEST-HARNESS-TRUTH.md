# Checkpoint 3D.1 — Test Harness Truth

Purpose: make `npm test` execute the freight-lifecycle and movement-authority regressions added during the 3C cleanup.

Changes:
- Adds Node test-runner coverage for delivery unloading start/resume/completion/handoff.
- Extends pickup lifecycle coverage through clean completion and pickup exceptions.
- Adds movement-owner precedence coverage: lunch > freight > idle route > runtime hold.
- Retires the orphaned Vitest-only source tests; no Vitest dependency is required.

Expected automated result at this checkpoint: 41 tests, 41 pass, 0 fail.

No gameplay, UI, movement, routing, timing, or persistence implementation is changed by this checkpoint.
