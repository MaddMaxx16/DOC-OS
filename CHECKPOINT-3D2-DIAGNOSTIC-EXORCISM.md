# Checkpoint 3D.2 — Diagnostic Exorcism

Removes dormant diagnostic instrumentation only.

- Removes resume trace hooks from App.jsx.
- Deletes src/utils/resumeTrace.js when applying the patch.
- Removes hidden lunch diagnostic state, collection effect, and dead render placeholder.
- Removes lunch diagnostic CSS.
- Preserves gameplay, movement authority, lunch behavior, freight lifecycle, and useful development utilities.

Validation baseline: 41 Node tests passing and production build passing.
