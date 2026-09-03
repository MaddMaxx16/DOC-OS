# DOC OS — Browser v2 + Marcus Location + Ledger Polish

This patch is based on the locked LedgerDesk v2 build.

## Browser v2
- Redesigns the Browser home screen to match the DOC OS v2 visual system.
- Replaces the oversized legacy bookmark tiles with compact operational cards.
- Uses the same Inter typography, dark surfaces, compact spacing, borders, and accent language as CarrierSource / FreightLink / LedgerDesk.
- Keeps existing browser navigation and bookmark behavior unchanged.

## Marcus location continuity
- When Marcus becomes available after completing a load, his driver record now remembers the last delivery location.
- The available-driver popup shows that real location (for example Harborline Logistics / Bronx Commerce Terminal) instead of generic “Current position”.
- Existing saves are also handled by resolving an exact runtime position against known map locations when possible.

## LedgerDesk v2 polish
- Keeps “Outstanding” on one clean line in the summary card.
- Adds safe bottom spacing so the awaiting-payment note does not disappear behind the fixed phone navigation.
