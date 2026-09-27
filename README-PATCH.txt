DOC OS — Checkpoint 3C.4 Freight Lifecycle Consolidation

Scope:
- Consolidates pickup completion state transition into src/utils/loadLifecycle.js.
- MainGameScreen remains coordinator for UI, driver messages, pause state, and routing.
- Preserves 3C.3 delivery lifecycle extraction unchanged.
- No GameMap, movement, timing, visual, DEV, or diagnostic changes.

Validation:
- Run npm test
- Run npm run build
- Live-test pickup completion and delivery completion once each.
