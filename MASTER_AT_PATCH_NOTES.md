# MASTER AT PATCH NOTES

## State Integrity & Resume Safety

AT builds directly on tested Master AS. This is a stabilization patch: no new gameplay systems and no changes to the AR2 unload puzzle rules.

### Problems addressed
- Decision/minigame modals recorded the clock's prior pause state but did not actually pause the simulation.
- A legacy App-level timed unload path could still convert `unloading-delivery` into a fabricated clean 12/12 POD, bypassing the AR2/AS unload and freight-condition workflow.
- Closing/backgrounding the app during Unload Sequencing could leave a saved `unloading-delivery` state without reopening the owned minigame on resume.
- Numeric fallback logic treated a legitimate `0` loaded/received pallet count as missing data.
- DEV POD presets still generated the old hard-coded 12/12 clean paperwork instead of the same shipment/POD model used by live gameplay.

### Changes
- `pauseClockForModal()` now actually pauses the authoritative simulation clock and normalizes fast-forward to 1x.
- Modal close/completion restores the exact pre-modal pause state using a ref, avoiding stale React state during fast open/close paths.
- Removed the legacy automatic delivery-unload/POD generator from `App.jsx`. Only the owned Unload Sequencing completion flow may create the delivery POD.
- Added unload resume recovery: if hydration finds an assigned load in `unloading-delivery`, DOC OS reopens Unload Sequencing and keeps simulation time paused.
- Hardened unload/POD pallet-count fallbacks so `0` is preserved as a valid numeric value rather than replaced by another count.
- Hardened `UnloadSequencingChallenge` manifest normalization for a legitimate zero-loaded shipment.
- Updated DEV `loaded`, `at-delivery`, `pod-ready`, and `load-complete` presets to carry realistic shipment state and generate PODs from the same freight-condition contract as live gameplay.

### Unchanged
- 45-second Unload Sequencing timer.
- Two staging spaces.
- Current + next two projected receiver requests.
- Rejected-move scoring and delay rules.
- Pickup loading gameplay.
- Queue promotion / POD approval closeout ownership.
- Freight condition remains established at pickup and carried through delivery/POD.

### Resume contract
`BEGIN UNLOADING -> clock paused -> unload workflow owns completion -> POD generated from shipment truth`

If the app is interrupted mid-unload:
`hydrate unloading-delivery -> reopen unload challenge -> keep clock paused -> player completes/cancels explicitly`

The simulation must never silently finish unloading or manufacture POD state in the background.

### Workflow status
TEST BUILD ONLY. Validate AT outside the real Git repo. Promote only after on-device confirmation.
