# MASTER Q PATCH NOTES

## Route Camera Ownership Fix

- Driver focus may still zoom in on Marcus for an explicit driver interaction.
- When a load transitions to `en-route-pickup` or `en-route-delivery`, the main map now automatically reframes the complete active route once.
- The travel camera uses the real runtime route geometry and keeps HUD / lower controls clear with asymmetric padding.
- The camera does not continuously recenter during travel, so the player can pan or zoom manually after the initial dispatch reframe without the map fighting them.
- The reframe is keyed to the actual departure event so ordinary runtime progress updates do not repeatedly trigger camera movement.

No load-state, route-planning, dispatch, travel-progress, or FreightLink logic was changed.
