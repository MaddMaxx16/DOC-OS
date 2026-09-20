# CS2.0B.5.3.3.10.7 — Shared Route Sampler Foundation

Built from the exact DOC-OS-CURRENT-IPHONE-TEST source supplied after the .10.6 test.

- Adds src/utils/routeSampler.js as the single route-progress sampler.
- Uses latitude-corrected distance weighting rather than vertex-index timing.
- App authoritative freight/runtime movement now uses the shared sampler.
- Shift End/staging movement now uses the shared sampler.
- GameMap freight, lunch, staging, bearing, and route-label sampling now use the shared sampler.
- Physical lunch runtime movement now interpolates with the same sampler instead of rounded vertex stepping.
- Removes the GameMap 0.08 reconciliation workaround between incompatible route parameterizations.
- Does NOT add provider segment-duration data yet; this is intentionally the compatibility-safe foundation fix.
