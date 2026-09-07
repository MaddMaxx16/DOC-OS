# MASTER AL PATCH NOTES

## Purpose
Fix the iOS/WKWebView loading-challenge freeze that occurred immediately after beginning a pallet drag in Master AK.

## Root cause
Master AK still relied on Pointer Events plus `setPointerCapture()` for the loading interaction. In the Capacitor iOS/WKWebView environment, beginning a captured pointer drag inside the modal could leave the interaction stream stuck after the ghost pallet appeared.

## Changes
- Removed Pointer Events and pointer capture from the loading challenge.
- Added native touch handling for iPhone/iPad using `touchstart`, `touchmove`, `touchend`, and `touchcancel`.
- Touch movement is tracked by the original touch identifier so a drag remains attached to the same finger.
- Added separate mouse handling for desktop testing.
- Kept the drag ghost portal attached to `document.body` so coordinates remain viewport-correct.
- Drop detection still uses `document.elementFromPoint()` and existing trailer slot snap logic.
- No changes to timer, pallet count, shortage logic, delay penalties, visuals, or the rest of the load lifecycle.

## Test contract
1. Begin pickup loading challenge on iPhone.
2. Press and hold a pallet, then move finger.
3. Ghost pallet should follow finger continuously without freezing.
4. Drop over an open trailer slot; pallet should snap into that slot.
5. Drop outside trailer; pallet should return to staged freight.
6. Timer must continue normally throughout drag interaction.
