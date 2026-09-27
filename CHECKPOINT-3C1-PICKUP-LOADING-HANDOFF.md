# DOC OS Checkpoint 3C.1 — Pickup Loading Handoff

Scope: isolate pickup-loading lifecycle decisions from MainGameScreen without changing visible gameplay.

Changes:
- Added `src/utils/loadLifecycle.js` as the first load-lifecycle boundary.
- Extracted interrupted pickup-loading challenge selection into a pure helper.
- Extracted the transition into `loading-at-pickup` into a pure helper while preserving an existing loading start timestamp.
- Added four regression tests covering challenge resume guards, driver ownership, valid pickup states, and timestamp preservation.

Intentionally unchanged:
- UI/CSS
- LoadingChallenge component and minigame behavior
- two-phase Confirm Load handoff
- delivery/unloading lifecycle
- route/movement behavior
- clock pause/resume behavior

Verification in patch environment: 26/26 Node safety tests pass.
Full Vite build/lint remains the Mac-side gate because this clean source snapshot excludes node_modules.
