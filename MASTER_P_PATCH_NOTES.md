# MASTER P — Freight Market Time + Driver Origin Integrity

## Scope
Small integrity pass after FreightLink visual lock. No redesign.

## Fixed
- Available freight now expires when the pickup window fully closes.
- Expired loads persist as `status: expired` / `tripStatus: expired` and move to FreightLink History.
- Expired loads disappear from the Available list and FreightLink market map.
- History can retain completed/expired scheduled loads beyond their original operation day.
- Driver closeout now explicitly persists the completed delivery facility as the runtime position.
- The next load deadhead therefore starts from the driver's actual previous receiver location.
- Runtime travel progress is cleared at load closeout to prevent stale travel state from bleeding into the next assignment.

## Locked behavior
A completed delivery is the driver's next physical origin. This is intentional. The driver does not teleport back to the carrier yard between loads.
