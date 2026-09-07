# MASTER V PATCH NOTES

## Resume Marker Rehydration

- Fixed operational map markers disappearing after leaving/backgrounding and re-entering the game while the active route line remained visible.
- Pickup, delivery, and driver markers are now re-derived from live/saved game state whenever the app becomes visible again (`visibilitychange` / `pageshow`).
- Detached MapLibre marker DOM nodes are detected and rebuilt instead of being trusted as valid references.
- Marker refresh dependencies now include pickup/delivery location IDs and planning route context so marker state follows the active load consistently.
- No load lifecycle, routing, dispatch, timing, or market logic changed.
