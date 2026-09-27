# DOC OS Checkpoint 3B.2 — Resume Continuity

Fixes a restored mid-route driver jumping backward when Play resumes the simulation.

The saved runtime progress is treated as a continuity floor on the first resumed movement frame. If the route departure clock would calculate an earlier point than the restored progress, DOC OS rebases that leg's departure minute to the restored position. Subsequent game-clock ticks then continue forward normally.

Includes the prior 3B.1 autosave correction because App.jsx is cumulative.

Safety harness: 28/28 tests passing in patch environment.
