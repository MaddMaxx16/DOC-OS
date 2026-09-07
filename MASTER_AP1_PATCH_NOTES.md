# MASTER AP1 PATCH NOTES

## Pickup dock-wait pacing hotfix

AP1 is a test-build hotfix on top of Master AP. It does not begin Delivery Operations.

- Early pickup arrivals now receive a 15 game-minute dock wait instead of waiting all the way toward the appointment window.
- On-time arrivals remain a 12 game-minute dock wait.
- Late arrivals retain a meaningful consequence with a 35 game-minute dock wait.
- Hydration recalculates the dock-ready target for an in-progress pickup wait so an AP save with an excessive wait is repaired after loading AP1.
- The map status pill now shows remaining dock ETA rather than elapsed wait time.
- Automatic Marcus check-in, messages, dock-ready alert, and the AO loading puzzle are unchanged.

### Target pacing
Normal pickup facility cycle: 5 min automatic check-in + 12–15 min dock wait before loading attention is required.
