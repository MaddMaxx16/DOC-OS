# CS2.0B.1 — CarrierSource Data Architecture

Base: **CS2.0B.0.1 — Agenda Driver Tab Polish**

## Purpose
Prepare CarrierSource for multiple carriers without adding a second carrier yet and without reopening the frozen Operations lifecycle.

## Changed
- CarrierSource now receives the full `carriers` collection rather than a single `carriers[0]` account.
- Applications are resolved by carrier ID from `carrierApplicationsById` instead of `carrierApplicationsById.metroline`.
- Existing `carrierCareerById` state is now passed read-only into CarrierSource so relationship/account standing can render from authoritative saved career state.
- Phone navigation now tracks a selected CarrierSource carrier ID and opens the correct carrier account/opportunity.
- My Carriers and Opportunities render from carrier collections, so future authored carriers can be added without rewriting CarrierSource screen logic.
- Active carrier rosters render from each carrier's `driverIds` rather than a Marcus-only driver prop.
- Added `src/utils/carrierSource.js` as the CarrierSource presentation/view-model boundary for carrier location, initials, status, summary, roster labels, and relationship standing.
- Added a `carrierSource` presentation metadata block to Metroline's carrier data. Metroline remains the only authored carrier in this build.
- Carrier opportunity copy, agreement-email attachment name, and agreement market identity are now carrier-driven instead of Metroline/New York hardcodes.
- Carrier context is retained when an application email opens an agreement.

## Intentionally unchanged
- No second carrier was added.
- No CarrierSource RPG consequences, levels, strikes, unlocks, or negotiation mechanics were activated.
- No search/filter behavior was added to CarrierSource yet.
- No Operations lifecycle, driver movement, itinerary, routing, facility state, pickup/delivery challenge, POD, LedgerDesk, scheduler-planning, or save authority was changed.
- Metroline application -> offer -> agreement -> activation behavior remains the regression target.

## Frozen contract
**CS2.0A.14.1 Operations remains authoritative and frozen.**
**CS2.0B.0.1 Agenda remains approved and frozen.**
CarrierSource may read account state and call existing carrier application/agreement actions by ID, but it does not own Operations state.
