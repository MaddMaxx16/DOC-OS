# Checkpoint 3B.3 — Resume Hydration Continuity

Fixes the paused-save resume jump at the hydration boundary.

The saved runtime position/progress are now preserved as authoritative for an active travel leg during hydration, and the leg departure clock is aligned to that saved progress before the simulation is allowed to tick.

This prevents the first Play frame from reconstructing an older route position from a stale departure timestamp.

Safety harness: 30/30 tests passing in patch environment.
