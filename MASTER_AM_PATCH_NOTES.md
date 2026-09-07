# DOC OS MASTER AM PATCH NOTES

## Purpose
Hotfix the white-screen crash introduced in Master AL when opening the Facility Loading Challenge.

## Root cause
During the AL touch-event rewrite, the derived `loadedIds` memo was accidentally removed from `src/components/LoadingChallenge.jsx` while multiple effects and handlers still referenced it. Opening the loading challenge therefore threw a runtime `ReferenceError` before the panel could render.

## Fix
Restored:

```js
const loadedIds = useMemo(() => slotAssignments.filter(Boolean), [slotAssignments])
```

immediately after the loading challenge state declarations, before any effect or handler reads it.

## Scope
No gameplay tuning, visual changes, timer changes, pallet-count changes, drag rules, shortage rules, or load-lifecycle behavior were changed. This is a surgical render-crash fix on top of AL.

## Expected behavior
- BEGIN LOADING opens the challenge instead of a white screen.
- The 24-second timer starts normally.
- Eight staged pallets render.
- Native touch drag behavior from AL remains intact for on-device testing.
- Loaded pallet count and shortage calculation work again.
