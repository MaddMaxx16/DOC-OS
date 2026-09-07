# DOC OS Master C Patch Notes

## Ready-for-Dispatch Driver Access Fix

- Fixed a navigation guard in `GameMap.jsx` that incorrectly treated the `loaded` state as a pickup-only interaction state.
- `VIEW DRIVER` and message-based driver focus can now open Marcus while a delivery route is ready.
- The existing driver operational model supplies the explicit `DISPATCH` action when `tripStatus === loaded` and `deliveryPlanningStatus === route-ready`.
- No load lifecycle transitions, route planning rules, notification ownership, or dispatch state mutations were changed.
