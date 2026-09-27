# DOC OS Classic — Checkpoint 1: Safety Harness

Purpose: protect existing DOC OS behavior before architecture cleanup.

## Non-negotiable preservation rule
This checkpoint intentionally changes no player-facing UI, visual styling, game content, or gameplay flow.

## Added verification commands
- `npm test` — runs the zero-dependency Node safety suite.
- `npm run verify` — runs lint, tests, then production build.

## Initial protected contracts
- Game calendar/time formatting
- Route lifecycle labels and tones
- POD creation/correction versioning
- Ledger revenue math and receivable eligibility
- End Operations carryover and next-day boundary
- Player progression derivation
- Save/load slot round trips and legacy-save migration

These tests are guardrails, not a complete specification. Additional tests should be added before each risky subsystem is refactored.
