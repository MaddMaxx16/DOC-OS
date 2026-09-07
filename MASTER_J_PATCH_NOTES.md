# DOC OS Master J — FreightLink Accept Crash Guard

## Scope
Small stability patch on top of Master I. No visual redesign and no gameplay-flow change.

## Fix
- FreightLink main-map Browse Mode now fully clears its selected load ID before reopening the phone on a load detail page.
- This prevents an accepted load from invalidating the AVAILABLE-load collection while the main map still retains a stale browse selection.
- LIST/MAP, VIEW LOAD, ACCEPT LOAD, SELECT DRIVER, ASSIGN, PLAN TRIP, and dispatch ownership remain unchanged.

## Packaging
- ZIP is flattened so package.json is at the ZIP root after extraction.
