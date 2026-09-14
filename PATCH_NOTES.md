# CS2.0B.2 — CarrierSource Workspace Overhaul

Base: **CS2.0B.1 — CarrierSource Data Architecture**

## Purpose
Give CarrierSource the visible upgrade promised by the B.1 architecture work while preserving the frozen Operations boundary and all existing carrier application/agreement behavior.

## Changed
- Reworked the signed-in CarrierSource landing screen into a dispatcher business workspace.
- Added a network summary showing active carrier count and drivers under dispatch.
- Upgraded **My Carriers** cards with active-account status, relationship standing, 0–100 relationship health meter, dispatch fee, driver count, region, and stronger account navigation.
- Upgraded **Opportunities** cards with carrier/equipment/region/dispatch-fee metadata and clearer status-aware actions.
- Reworked active carrier detail pages into an account dashboard with:
  - relationship score and standing,
  - account profile,
  - live agreement terms,
  - carrier service standards,
  - account-health metrics (standing, strikes, level, carrier XP),
  - active driver roster and dispatcher ownership.
- Opportunity/pending/offer states retain their existing application behavior and use the same existing agreement flow.
- All new account-health presentation reads the existing `carrierCareerById` state; no duplicate relationship system was introduced.

## Intentionally unchanged
- Metroline remains the only authored carrier.
- No second carrier, negotiation, carrier unlock, level effect, strike consequence, or performance-history gameplay was activated.
- No application timing/state transition was changed.
- No agreement acceptance behavior was changed.
- No Operations lifecycle, driver movement, itinerary, routing, facility state, pickup/delivery challenge, POD, LedgerDesk, Agenda/scheduler planning, or save authority changed.

## Frozen contract
**CS2.0A.14.1 Operations remains authoritative and frozen.**
**CS2.0B.0.1 Agenda remains approved and frozen.**
**CS2.0B.1 CarrierSource data architecture remains authoritative.**
B.2 is a presentation/workspace layer that reads those existing states.
