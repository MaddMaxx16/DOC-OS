# DOC OS Classic Baseline

This checkpoint preserves the uploaded original DOC OS as the visual and gameplay reference for the architecture cleanup.

## Preservation rule
During cleanup, visible UI/UX and gameplay behavior are not intentionally changed unless Maxx explicitly approves the change.

## Current local changes preserved
The uploaded baseline contains uncommitted changes in:
- src/App.css
- src/components/CareerSetupScreen.jsx
- src/components/DayOneEntryScreen.jsx
- src/components/MarketSelectionScreen.jsx
- src/components/StartScreen.jsx

These changes are intentionally retained in this checkpoint.

## Workflow
Maxx does not manually edit source files. Architecture changes are delivered as patched ZIP checkpoints with Terminal commands to unpack, install, verify, and run.

## Next cleanup checkpoint
Add a safety harness around high-risk pure game systems before extracting orchestration from App.jsx. Target areas: save/load, game time/day loop, route lifecycle, driver HOS, document lifecycle, and ledger/payment.
