# Checkpoint 3A — GameMap Lifecycle

Scope: React-safe synchronization of GameMap animation inputs.

- Moves `motionStateRef.current` synchronization out of render and into `useLayoutEffect`.
- Preserves the existing continuous requestAnimationFrame loop and its non-restarting behavior.
- No intentional UI, map styling, route authority, simulation timing, gameplay, or CSS changes.
- Existing GameMap dependency/cleanup warnings are intentionally deferred to later isolated checkpoints.

Verification in patch environment:
- Safety harness: 18/18 tests passed.
- Targeted ESLint: the prior `Cannot access refs during render` error at the motion-state synchronization is eliminated.
- Full Vite build could not be certified in Linux because the source snapshot contains macOS-native Rolldown dependencies; Mac remains the production build gate.
