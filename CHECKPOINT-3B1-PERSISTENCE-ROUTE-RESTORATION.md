# DOC OS Checkpoint 3B.1 — Persistence / Route Restoration

Diagnosis: routine autosave used a 700ms debounce. During active simulation, continuously changing clock/runtime state repeatedly cancelled that timer, so mid-route state could remain unsaved until a lifecycle boundary or pagehide. Restarting the dev build could therefore restore an older route position.

Change: routine autosave is now trailing/throttled. The latest complete snapshot is retained and written at most 700ms after a save window opens, even while simulation state continues changing. Existing immediate lifecycle and pagehide persistence remain unchanged.

Scope: src/App.jsx only. No movement interpolation, route geometry, load lifecycle, UI, CSS, or game-clock rules changed.

Verification in patch environment: npm test — 26/26 passing.
