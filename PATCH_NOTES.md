# DOC OS AW1.7.4 — Map Continuity + Driver Layering

## Scope
Map presentation only. No scheduler, booking, approval, movement, loading/unloading, or facility lifecycle changes.

## Changes
- Completed pickup and delivery stop markers persist for the rest of the operating day in a muted visual state.
- Completed pickup-to-delivery route geometry persists as low-opacity route history.
- Marcus now renders above route lines/history but below every pickup/delivery stop marker.
- Current P/D stop remains the strongest/highest stop marker.
- Completed history remains non-authoritative; itinerary state and live movement logic are unchanged.

## Layer contract
1. Popup / route labels
2. Current P/D stop
3. Future P/D stops
4. Completed P/D history
5. Marcus
6. Route lines / completed route history
7. Basemap
