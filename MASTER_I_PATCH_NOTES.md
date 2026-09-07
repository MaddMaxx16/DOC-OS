# MASTER I PATCH NOTES — FreightLink Main-Map Browse Mode

Base: DOC-OS-MASTER-2026-09-06-H

## Purpose
Remove the duplicate embedded FreightLink map from the phone and make the main DOC OS map the single geographic workspace.

## Changes
- FreightLink AVAILABLE retains LIST / MAP controls.
- LIST stays inside FreightLink.
- MAP now dismisses the phone and opens FreightLink Browse Mode on the main DOC OS map.
- Browse Mode shows unlocked available-load pickup pins.
- Tapping a pickup pin selects the load, draws its full pickup-to-delivery route, and adds the selected delivery marker.
- A compact bottom preview shows load ID, rate, listed miles, lane, pickup time, delivery time, and VIEW LOAD.
- VIEW LOAD reopens the phone directly on the same FreightLink load-detail screen.
- EXIT leaves FreightLink Browse Mode without mutating load state.
- Existing ACCEPT -> SELECT DRIVER -> ASSIGN -> PLAN TRIP -> CONFIRM -> map dispatch flow is unchanged.
- Active operational facility markers are suppressed while FreightLink Browse Mode is active so market geography does not compete with trip geography.
- No multi-load route chaining was added; that remains deferred.

## Locked ownership rule
Phone = information and decisions.
Main DOC OS map = geography and spatial planning.
