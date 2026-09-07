# MASTER AD — Messages Polish + Queue Handoff Fix

Base: DOC-OS-MASTER-2026-09-06-AC

## Scope
Targeted follow-up to the Master AC playtest screenshots plus a multi-load chaining bug. Freight Market v1, carrier agreement ownership, facility timing, payment, and unrelated simulation systems remain unchanged.

## Messages UX
- Replaced the native iOS `<select>` load dropdown with a custom DOC OS active-load picker.
- The picker still exposes active company loads rather than silently filtering to the correct answer, preserving communication-mistake gameplay.
- Split Marcus's introduction into three short message bubbles.
- Existing AC saves containing the single old `marcus-intro` message migrate to the short-bubble history.
- Tightened the CarrierSource approval email.
- Dispatcher load updates now render as compact multi-line briefs with load number, pickup, delivery, and deadhead.
- Message bubbles preserve line breaks.
- Marcus pickup-arrival messages include the actual pickup facility name.
- Marcus delivery-arrival messages include the actual receiver facility name.

## Multi-load Queue Fix
Root cause: `getDriverActiveLoad()` previously fell back to `assigned[0]` when no non-queued load existed. During the small handoff window after the current load became delivered and before the next load was promoted, that fallback could expose the queued load as the active operational load. GameMap also considered queued loads operationally active.

Fix:
- `getDriverActiveLoad()` now returns `null` when only queued loads exist.
- MainGameScreen fallbacks explicitly exclude `queued`.
- GameMap explicitly excludes `queued` from active operational facility ownership.
- Queue promotion remains the only transition that turns the next queued load into `assigned`.
- The previous receiver remains Marcus's authoritative runtime location at closeout, so the promoted load deadheads from there to its pickup.
- Hydration preserves queued-load IDs without treating them as active.

## Validation
- JS/JSX parse validation passed using the TypeScript parser.
- Driver queue contract test passed for: delivered current load + two queued loads -> no active load before promotion -> first queued promoted active -> remaining queued preserved.
- Full `npm install`/Vite build could not be completed in the patch environment because package-registry access timed out; run the normal Mac build commands below as the final compile/install validation.
