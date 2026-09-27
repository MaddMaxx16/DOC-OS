# Checkpoint 3B.5 — Movement Authority Trace

Diagnostic-only checkpoint. No gameplay fix is attempted here.

Adds tracing around the schedule-owned departure effect that can transition freight into travel and reset a driver's runtime progress to zero. The trace now captures the pre-Play freight state, any schedule departure writer activation, any progress reset, and the normal movement input/result/position write.

Acceptance: reproduce the pause -> Play jump once and capture the 3B.5 trace overlay.
