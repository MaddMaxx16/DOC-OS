# MASTER S — Dynamic Driver Positioning + Freight Market Refresh v1

## Scope
Gameplay-system closure pass for FreightLink after the Day 2 cohesion work.

## Dynamic Driver Positioning v1
- After completing a load with no queued assignment, Marcus dwells at the receiver for 20 game minutes.
- He then routes toward a sensible operating point instead of freezing indefinitely at the receiver.
- East-side finishes (Bronx/Queens) bias toward Queens Staging Area.
- NJ finishes (Newark/Elizabeth) bias toward Newark Fuel & Rest Stop.
- Other finishes bias toward Metroline Yard.
- Marcus's runtime map position updates as he travels.
- FreightLink fit/deadhead calculations continue to use the live runtime position.
- Assigning a new load cancels idle-positioning ownership immediately.
- The idle route is operational positioning only; it does not become an active freight route or change load state.

## Freight Market Refresh v1
- Day 2 freight no longer appears as one static full-day board.
- Loads publish in market waves using marketPostMinutes.
- Initial wave: 8:00 AM.
- Additional waves: 8:30 AM, 9:30 AM, 12:00 PM, 2:30 PM, and 5:00 PM.
- Existing expiration logic remains authoritative: once an unaccepted pickup window closes, the load moves to History as EXPIRED and leaves the available map.
- Added DOC108–DOC110 as later-day freight so the market continues refreshing beyond the original seven-load pool.
- Wave composition intentionally varies pickup facilities so perfect same-facility chaining is possible but not routine.

## Preserved Contracts
- Accept != assign != plan != dispatch.
- Main DOC OS map remains the geographic/operations world.
- FreightLink map remains market evaluation only.
- Completed delivery position remains Marcus's real physical origin until he begins idle repositioning or receives a new assignment.
