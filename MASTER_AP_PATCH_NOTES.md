# MASTER AP PATCH NOTES

## Pickup Operations V1 completion

Master AP removes the manual pickup CHECK IN action and moves routine facility work to Marcus.

### New pickup lifecycle

EN ROUTE TO PICKUP -> ARRIVE -> CHECKING IN -> WAITING FOR DOCK -> DOCK READY -> LOADING CHALLENGE -> LOADED -> PLAN DELIVERY -> DISPATCH

- Marcus automatically checks in after arrival.
- Check-in takes 5 game minutes.
- Marcus sends an arrival/check-in message, then a checked-in/waiting-for-door message.
- Dock wait is appointment-aware: early arrivals wait toward the appointment, on-time arrivals receive a normal wait, late arrivals can lose their dock slot and wait longer.
- Waiting is background simulation work. The player can fast-forward or work elsewhere.
- When the dock is ready, DOC OS returns speed to 1x and surfaces a DOCK READY alert.
- Tapping the alert/facility exposes BEGIN LOADING and opens the existing AO loading puzzle.
- Pickup CHECK IN is no longer a player action.
- Delivery CHECK IN remains unchanged.

### Locked interaction principle
Routine driver actions happen automatically. Dispatcher attention is requested only when an operational decision or action is needed.
