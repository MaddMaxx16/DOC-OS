# MASTER AK PATCH NOTES

## iOS loading drag coordinate fix

- Preserves Master AJ loading challenge visuals and gameplay.
- Moves the floating drag pallet into a React DOM portal attached to `document.body`.
- This keeps the drag ghost in true viewport coordinates instead of inheriting transformed/backdrop-filtered game layers in iOS WKWebView.
- Adds pointer capture when a pallet drag begins so the drag remains attached to the same finger until release.
- Adds iOS tap-highlight/user-select hardening to prevent the pallet from visually zooming/selecting during touch drag.
- Drop behavior remains unchanged: valid open slot snaps; invalid/occupied/outside drop returns the pallet to staging.

### Regression contract
- No changes to the 24-second timer.
- No changes to pallet count, missing-pallet logic, or delay penalties.
- No changes to load lifecycle outside the Loading Challenge.
