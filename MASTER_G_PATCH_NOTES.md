# MASTER G — Phone Information Grid v1

## Purpose
Establish the shared information-density rule for the DOC OS dispatch phone before the app-by-app cohesion audit.

## Locked layout rule
- Compact facts use a two-column grid.
- Narrative content stays single-column.
- Primary actions stay full-width or use a compact Back / Confirm action row.
- App shells, headers, and navigation remain unchanged.

## Applied in this patch
- Added reusable `.docos-info-grid` and `.docos-info-cell` primitives.
- Converted Route Planning to the shared compact two-column language.
- Reworked FreightLink load economics from a four-across strip to a clearer 2x2 grid.
- Tightened pickup/delivery appointment density.
- Normalized Driver Select expanded facts and Assignment Impact to the same grid rhythm.

## Not changed
- Gameplay state logic.
- Load lifecycle.
- Alert/message behavior.
- Final global color system (parked for a later full-system visual pass).
