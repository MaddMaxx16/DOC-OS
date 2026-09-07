# MASTER AA — Freight Market Date + Mileage Ownership Polish

Base: DOC-OS-MASTER-2026-09-06-Z

## Scope
Surgical Freight Market v1 polish only. No market population, posting-wave, lifecycle, routing, or dispatch behavior was intentionally changed.

## Changes
- Added explicit pickup and delivery calendar dates to FreightLink Available/Active/History list rows.
- Added pickup and delivery dates to the main-map FreightLink load preview and the fallback FreightLink market-map preview.
- Preserved the existing calendar-aware appointment display on Load Details and clarified the mileage metric as `LOAD MILES`.
- Overnight/future-day freight now reads clearly in player-facing market surfaces because pickup and delivery dates are shown independently.
- Removed automatic driver-specific fit/deadhead estimation from the Available Loads board.
- Removed `GOOD NEXT LOAD` / `TIGHT` / `POOR FIT` chips from the market board.
- Removed `~X MI TO PICKUP` from the market board.
- Available-board mileage now represents only the load's listed pickup-to-delivery mileage.
- FreightLink market sorting no longer uses Marcus/current-driver position. Available sorting is now Pickup Time, Rate, or Load Miles.
- Driver-specific deadhead, arrival timing, and fit remain owned by Driver Select / Driver Fit after the player chooses to evaluate a driver.
- Main-map FreightLink preview now uses the player-facing `LD-#####` load number and labels mileage as load mileage.

## Ownership Lock
Before driver selection:
`FreightLink load data = freight facts only`

After driver evaluation/selection:
`Driver Fit = driver origin + deadhead + projected arrival + fit`

Freight Market v1 remains complete after this regression/polish pass.
