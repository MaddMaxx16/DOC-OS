# MASTER AF PATCH NOTES

Baseline: `DOC-OS-MASTER-2026-09-06-AE.zip`

## POD READY marker cleanup

Fixed a stale map-marker status after POD approval.

Before this patch, POD approval correctly closed the load and returned Marcus to `AVAILABLE`, but `GameMap` returned early when there was no longer an active load. Because the status pill is a DOM node owned by the existing Marcus marker, its previous `POD READY` text could remain visible until another UI event caused the marker to refresh.

MASTER AF now explicitly clears the existing driver status pill whenever Marcus has no active load.

### Result

- POD approval still closes the load atomically.
- Marcus becomes available immediately when no queued load is promoted.
- The map marker no longer continues to show `POD READY` after the load has completed.
- Closing the load-results screen is no longer required to visually clear that state.
- No load lifecycle, queue-promotion, POD, results, or communication logic was otherwise changed.
