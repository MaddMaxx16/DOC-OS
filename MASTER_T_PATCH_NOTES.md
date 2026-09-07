# MASTER T — Camera Ownership Consistency

## Fix
- Facility focus no longer steals the map camera before Marcus is physically at that facility.
- Pickup owns the camera only during pickup interaction states.
- Delivery owns the camera only during delivery interaction states.
- During assigned/planned/en-route/loaded/route-ready states, Marcus remains the camera target.
- Any stale facility popup is closed when the load returns to a driver-owned state.

## Preserved
- Explicit facility interaction still works when Marcus arrives.
- Driver focus, dispatch route fitting, FreightLink browse mode, and dynamic positioning are unchanged.
