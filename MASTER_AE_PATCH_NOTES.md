# MASTER AE — POD Closeout Handoff Fix

Base: DOC-OS-MASTER-2026-09-06-AD

## Problem
During AD playtesting, approving a verified POD could leave Marcus sitting at the receiver instead of cleanly handing the operation to the next queued load. The normal flow used two separate owners:

1. Phone/POD UI changed `awaiting-pod` to `delivered`.
2. A later App effect had to notice `delivered`, convert it to `completed`, update Marcus, preserve receiver position, and promote the next queue item.

That intermediate state made closeout dependent on a later render/effect and made the player-facing handoff unclear.

## Fix
- POD approval is now owned by an App-level `approvePodAndCloseout()` workflow with access to load, driver, queue, and runtime-position state.
- One explicit approval action now:
  - marks the POD approved,
  - marks the load completed,
  - records completed driver/time/operation day,
  - clears the completed load from Marcus,
  - preserves Marcus at the receiver,
  - promotes the first queued load to `assigned` when present,
  - updates Marcus's assigned/queued load records,
  - resets stale travel progress.
- The Phone no longer performs the intermediate `tripStatus: delivered` mutation during normal POD approval.
- After successful approval, the phone closes to the main map and Marcus is refocused so the next operational alert/action is visible immediately.
- The existing `delivered` closeout effect remains as a recovery path for legacy/dev states only.

## Important Contract
POD approval does **not** automatically move or dispatch Marcus.

If another load is queued, the expected flow is:

`POD APPROVED -> CURRENT LOAD COMPLETED -> NEXT LOAD ASSIGNED -> PLAN PICKUP -> BRIEF MARCUS -> EXPLICIT DISPATCH -> EN ROUTE TO PICKUP`

## POD Review UI
The checkbox-based POD verification mechanic is intentionally unchanged in Master AE. It is still considered temporary and should receive a separate gameplay/UX redesign after the closeout flow is stable.

## Validation
- App.jsx, MainGameScreen.jsx, and PhoneOverlay.jsx parse successfully as JSX with the TypeScript parser.
- Normal POD approval no longer relies on the intermediate `delivered` state.
- Queue promotion remains explicit and `queued` loads remain non-operational until promoted.
