CS2.0A.12.2 — Scheduler Final Polish
Base: CS2.0A.12.1
Scope: scheduler presentation only; operations logic frozen.

CS2.0A.12.4 — Scheduler Shell + Route Continuity

- CS2.0A.14 — Facility Attention Marker Restore: restores live P/D attention cue without changing operations authority.

- CS2.0A.14.1 — Facility Attention Badge Hotfix: reliable iPhone live-facility attention badge; no Operations logic change.
- CS2.0B.0 — Agenda Access: adds first-class Agenda app and direct Today’s Plan entry; existing scheduler and Operations logic remain frozen.
- CS2.0B.0.1 — Agenda Driver Tab Polish: removes redundant per-driver route-count subtitle; route total remains in plan summary strip; no scheduler or Operations logic change.
- CS2.0B.1 — CarrierSource Data Architecture: removes Metroline-only CarrierSource wiring, adds carrier-ID selection and career-state read plumbing, and makes CarrierSource/agreement identity carrier-driven; Operations remains frozen.

- CS2.0B.2 — CarrierSource Workspace Overhaul: visible CarrierSource business workspace with network summary, account health, live terms, service standards and roster presentation; no Operations authority changes.
- CS2.0B.3 — Carrier Relationship RPG: turns Day Close carrier performance into persistent grades, carrier XP/levels, performance history, strikes, AT RISK/PROBATION states, and clean-service recovery; live Operations authority remains frozen.
- CS2.0B.4 — Communications Overhaul: upgrades Email and Messages into first-class DOC OS communication workspaces, preserves workflow context in carrier replies, and adds career-review presentation; Operations authority remains frozen.
- CS2.0B.4.1 — Driver Communications Intelligence: narrows proactive driver texting to meaningful events, adds clock-in/sign-off cadence, makes routine check-ins silent until a real delay, replaces generic reply choices with contextual responses/dispatch actions, and preserves Operations authority.


## CS2.0B.4.1.1 — Agenda Driver Workday Inputs
- Adds per-driver, per-operating-day workday inputs in Agenda: start time, lunch start, lunch duration, and end-of-day.
- Persists workday settings inside the existing driver save state (`workdayByDay`).
- Visualizes shift start, lunch, and end-of-day on the Agenda timeline.
- No HOS enforcement and no Operations lifecycle changes.

- CS2.0B.4.1.2 — Workday + Email Polish: scheduled clock-in messaging, movable lunch controls, manual Email compose removed.
- CS2.0B.4.1.3 — Lunch Decision Events: adds an 18-option rotating lunch event pool, presents 3 context-aware choices, records afternoon recovery/relationship/positioning effects, and surfaces lunch status in Agenda/Messages without changing itinerary authority.
- CS2.0B.4.1.3.1 — Lunch UX Polish: turns lunch into a manual ready task with Operations/Agenda/driver-card alerts, full-screen decision UI, and corrected Agenda lunch-summary placement; lunch effects and Operations authority remain unchanged.
- CS2.0B.4.1.3.2 — Condensed Lunch Decision Panel: replaces the full-screen lunch takeover with a compact live-operation sheet, drops the sim to 0.75× while reviewing choices, keeps time controls available, and makes ON LUNCH a driver-specific unavailable state while the rest of DOC OS continues.
- CS2.0B.4.1.3.3 — Comms + Workday UI Polish: Email defaults to Unread, removes redundant driver-status context in Messages, separates shift time from lunch settings, and replaces native time/select menus with DOC OS controls.
- CS2.0B.4.1.3.4 — Driver Tab Visual Fix: removes the active-driver underline pseudo-element that could render across the driver name on iPhone; preserves a clean active-tab indicator at the bottom edge. No scheduler logic or Operations behavior changes.

- CS2.0B.4.1.3.5 — Compact Driver Tabs: Agenda driver selector now uses compact blue active tabs; no underline/strike-through indicator.

CS2.0B.4.1.3.6 — Agenda uses raised index-style driver tabs; active driver is blue and future inactive drivers remain neutral.
- CS2.0B.4.1.3.7 — Driver Tab Shape Polish: refines Agenda driver selection into a compact raised file-divider tab attached to Driver Workday; presentation only.

## CS2.0B.4.2.1-TEST — Seven-Day Agenda Foundation
**Base:** CS2.0B.4.1.3.7-STABLE
**Status:** IN TEST — not a stable checkpoint.
Introduces the canonical roadmap and first Multi-Day Operations slice: seven-day Agenda navigation, real calendar dates, selected-date driver workdays, and correct cross-midnight stop rendering. Stable source remains CS2.0B.4.1.3.7-STABLE until user approval.

### CS2.0B.4.2.1.1-TEST
B.4.2.1 visual-feedback revision. Replaced the scrollable seven-day Agenda pill selector with a fixed seven-across tab bar. B.4.2 remains IN TEST; CS2.0B.4.1.3.7-STABLE remains the stable checkpoint.

- `CS2.0B.4.2.1.2-TEST` — Agenda seven-day tab height corrected; redundant selected-date subtitle removed. TEST ONLY.

## CS2.0B.4.2.1-STABLE — Seven-Day Agenda Foundation
**Base:** CS2.0B.4.1.3.7-STABLE
**Approved:** 2026-09-15
**Status:** STABLE SLICE within CS2.0B.4.2; full B.4.2 remains IN TEST.
Locks the approved seven-day Agenda Day View, real calendar dates, per-date workday editing foundation, cross-midnight stop rendering, fixed seven-across date tabs, corrected tab-row height, and removal of the redundant selected-date subtitle. Next development slice: CS2.0B.4.2.2-TEST — Midnight Rollover & Overnight Persistence.

## CS2.0B.4.2.2-TEST — Midnight Rollover & Overnight Persistence
**Base:** CS2.0B.4.2.1-STABLE
**Status:** IN TEST — not stable.
Separates calendar rollover from Daily Closeout authority. Midnight advances date bookkeeping only; active/open freight, driver assignment, runtime position, and route state remain untouched. Daily Closeout becomes a report and returns to the same live game minute instead of jumping to a future start time.

### CS2.0B.4.2.2.1-TEST — Hidden Dev Time Controls
**Base:** CS2.0B.4.2.2-TEST
**Status:** IN TEST — testing-support revision only.
Extends the existing long-press DOC OS iPhone Dev Tools with current game time, Set Near Midnight (11:55 PM), +1 Hour, +6 Hours, and +1 Day controls. The controls mutate only the existing game clock and add no gameplay authority. B.4.2 remains IN TEST.

### CS2.0B.4.2.2.2-TEST — Dev Tools Safety Fix
Built on CS2.0B.4.2.2.1-TEST. Test-only safety revision: scrollable hidden Dev Tools, persistent close control, legacy Day 1 reset disabled, and confirmation required for full game reset. B.4.2 remains IN TEST; stable checkpoint remains CS2.0B.4.2.1-STABLE.

### CS2.0B.4.2.2.3-TEST
Testing-support revision on B.4.2.2.2. Adds a controlled overnight delivery preset to the existing hidden iPhone Dev Tools so midnight persistence can be tested without manufacturing a late appointment.

## CS2.0B.4.2.3-TEST — Overnight Staging & Next-Day Continuity
**Base:** approved CS2.0B.4.2.2 test line
**Status:** IN TEST — not stable.
Adds explicit per-driver/per-date overnight staging to Agenda. End-of-day idle positioning is no longer an automatic yard return: the dispatcher selects Stay Near Final Stop, Nearby Staging, or Return to Metroline. The selected physical position/route persists into the next date and becomes the next routing origin. HOS/rest legality remains deferred to B.5.

### CS2.0B.4.2.3.1-TEST — Overnight Choice Cleanup
**Base:** CS2.0B.4.2.3-TEST
**Status:** IN TEST — not stable.
Narrows overnight parking to Truck Stop or Carrier Yard, removes player-facing development-roadmap language, and requires an explicit overnight selection before showing the completed state.

### CS2.0B.4.2.3.2-TEST — Cross-Midnight Workdays
Built on CS2.0B.4.2.3.1-TEST. Adds next-calendar-day workday end semantics and makes overnight staging use the workday's absolute end across midnight. B.4.2 remains IN TEST.

- CS2.0B.4.2.3.3-TEST — Overnight Staging Movement Persistence (IN TEST)

### CS2.0B.4.2.3.4-TEST — Overnight Map Status Polish
**Base:** CS2.0B.4.2.3.3-TEST
**Status:** IN TEST — presentation-only revision.
Replaces verbose overnight map labels with compact state symbols: 💤 while Marcus is traveling to his selected overnight staging destination and 🌙 once he has arrived and is parked for the night. No routing, schedule, lifecycle, HOS, or staging-authority behavior changed.

- CS2.0B.4.2.3.5-TEST — Overnight Status Badge Polish: compact overnight map status attached to the driver marker; no operational logic changes.

- CS2.0B.4.2.3.6-TEST — Overnight Badge Size Fix (IN TEST): restores canonical driver marker size while retaining corner overnight badge.
- CS2.0B.4.2.3.7-TEST — Strategic Truck Stop Selection: explicit fixed-world overnight staging choices (Carrier Yard + three truck stops) with distance context; selected location drives existing staging route. IN TEST.


- CS2.0B.4.2.3.8-TEST — Overnight Agenda Timeline Continuity: extends selected-day Agenda vertically through midnight when work/freight continues, with a next-date divider and true next-day workday/stop positions. IN TEST.

- CS2.0B.4.2.3.9-TEST — Carryover Day Timeline Window: receiving-day Agenda exposes the post-midnight portion of a prior day's cross-midnight workday and marks its true end; no Operations authority changes.

### CS2.0B.4.2.3.10-TEST — Full Carryover Day Timeline
Receiving-day Agenda continuity fix: carryover dates render the complete calendar day while preserving the inherited overnight window and any later same-day operations.

### CS2.0B.4.2.3.11-TEST — 24-Hour Agenda Day View
Agenda Day View normalized to a complete midnight-to-midnight calendar canvas for every selected date. Carryover and true next-day extensions remain supported. B.4.2 remains IN TEST.

## CS2.0B.4.2.3.12-TEST — Truck Stop Map Markers & Staging Movement Polish
- Added persistent compact map markers for the three strategic overnight truck stops.
- Overnight staging travel now uses the map's fractional render clock for smooth visual movement while preserving simulation-authoritative arrival.

- CS2.0B.4.2.3.13-TEST — Map POI Marker Size Consistency: truck-stop and carrier-yard POI markers now share the same footprint.

## CS2.0B.4.2.4-TEST — B.4.2 Closure & Acceptance
Built cumulatively from CS2.0B.4.2.3.13-TEST. Adds subdued overnight staging route visibility and moves the parent B.4.2 phase into explicit closure acceptance testing. No stable promotion yet.

## CS2.0B.4.2.4.1-TEST — Next-Day Dispatch Authority Fix
- Built cumulatively from CS2.0B.4.2.4-TEST.
- Prevents a communicated next-day route from auto-departing outside the driver's scheduled workday.
- Planned/assigned future freight no longer blocks an already-eligible overnight staging reposition.
- Preserves freight, financial, document, Agenda, and HOS boundaries.

## CS2.0B.4.2.4.2-TEST — Shift End Staging Authority
- Refines B.4.2 closure behavior from overnight-trigger language to shift-end authority.
- Shift End Plan owns post-shift staging once active freight is clear.
- Midnight remains calendar-only and future scheduled freight does not become movement authority merely because the date changed.
- Player-facing Agenda terminology changed from Overnight to Shift End.

- CS2.0B.4.2.4.3-TEST — Shift End Status Badge Restoration: removes staging text labels and restores badge-only 💤 → 🌙 presentation while preserving Shift End movement authority.

- CS2.0B.4.2.4.4-TEST — Shift End Visual Release: next workday clears completed staging presentation; active freight restores normal driver marker color.


### CS2.0B.4.2.4.5-TEST — Driver Active Color Restoration
Presentation handoff correction: after Shift End state releases, an on-duty/active driver returns to the canonical blue marker instead of inheriting queue-driven unavailable gray styling. No routing or lifecycle authority changes.

- CS2.0B.4.2.5-TEST — Added rolling seven-day FreightLink market, future-dated pickup opportunities (including 12 AM–6 AM), and pickup-date filters.

## CS2.0B.4.2-STABLE-CANDIDATE — Multi-Day Operations
- Built cumulatively from the user-approved CS2.0B.4.2.5-TEST source chain.
- Feature work frozen for final regression/smoke acceptance.
- Consolidates the proven B.4.2 multi-day Agenda, cross-midnight persistence, Shift End staging, next-day visual handoff, and rolling seven-day FreightLink market.
- Not stable until the user approves the candidate on-device and the approved source is promoted into the real Git repository.

## CS2.0B.4.2-STABLE — Multi-Day Operations
- Promoted from the user-approved CS2.0B.4.2-STABLE-CANDIDATE with no gameplay changes.
- Final candidate passed on-device smoke testing; the exact promoted source also passed in the real Git repository.
- Freezes the completed B.4.2 multi-day Agenda, cross-midnight persistence, Shift End staging/authority, next-workday visual handoff, and rolling seven-day FreightLink market.
- Official stable checkpoint replacing CS2.0B.4.2.1-STABLE.

## CS2.0B.4.2.6-TEST — Compact Locked Workflow Email
- Built from CS2.0B.4.2-STABLE.
- Added locked Review → Send presentation for operational workflow email.
- Added review gate to existing batch Schedule Approval email without changing approval authority/timing.
- Removed time-specific "Morning" copy from Schedule Approval.

## CS2.0B.4.2.6.1-TEST — Email Presentation
- Built cumulatively from CS2.0B.4.2.6-TEST.
- Presentation-only revision: locked workflow Review → Send now reads visually as an email rather than a stack of workflow cards.

## CS2.0B.4.2.6.2-TEST — Fixed Workflow Email Review
- Presentation-only follow-up to B.4.2.6.1.
- Removes vertical scrolling/overscroll from locked workflow Review → Send.
- Compacts body/attachment spacing so the fixed email surface remains usable on iPhone.
- No workflow authority, timing, freight, driver, document, or payment logic changed.

- CS2.0B.4.2.6.3-TEST — routed pickup correction alert through locked Email Review → Send; SEND releases pickup hold; compacted fixed attachment list so three scheduled-load attachments remain visible.


## CS2.0B.4.2.6-STABLE — Compact Email Workflow
Promoted after user acceptance of the cumulative B.4.2.6 → B.4.2.6.3 test chain.
- Workflow-generated Email uses locked Review → Send for required operational communication.
- Schedule Approval preserves the multi-load batch email and time-neutral copy.
- POD/pickup correction entry points route through formal Email; opening the email does not release the pickup hold, SEND does.
- Invoice Submission uses the same locked review presentation.
- Fixed review surface prevents whole-screen bounce while keeping required attachments visible, including three-load schedule approval.
- Known Documents issue deferred to B.4.3: an already-corrected POD may still expose Request Correction / stale original exception context because authoritative document-version architecture has not yet been rebuilt.
- Protected base: CS2.0B.4.2-STABLE Multi-Day Operations.

## CS2.0B.4.3.1-TEST — Document Lifecycle Foundation
- Based on CS2.0B.4.2.6-STABLE.
- Adds reusable POD document identity/version/history helpers.
- Corrected POD response now creates a new authoritative version instead of overwriting the only copy.
- Superseded POD metadata is retained in document history.
- Existing saved PODs normalize to v1/current without resetting gameplay.
- A corrected POD that matches the shipment record no longer immediately offers another correction request.
- B.4.3 remains IN TEST; stable checkpoint remains CS2.0B.4.2.6-STABLE.
- CS2.0B.4.3.1.1-TEST — correction-state clarity: distinguishes pickup exception correction from POD correction and surfaces pending POD correction state in Documents.

- CS2.0B.4.3.2-TEST — Rate Confirmation Generation & Documents. Builds cumulatively on accepted B.4.3.1.1.


## CS2.0B.4.3.2.1-TEST — Rate Confirmation Delivery & Presentation
- Rate Confirmations are delivered by inbound carrier Documentation email with an unread Email notification and attachment.
- The attachment opens the persistent Rate Confirmation document tied to the load.
- Unreviewed Rate Confirmations appear in Documents > Pending rather than silently living only in Files.
- Rate Confirmation presentation is compact and uses the established POD-style document language.
- No review/confirmation authority is added here; manual FreightLink comparison remains the next B.4.3 workflow slice.
- CS2.0B.4.2.6-STABLE remains the protected checkpoint.


## CS2.0B.4.3.3-TEST — Rate Confirmation Manual Review & Correction
- Adds manual FreightLink Offer vs Rate Confirmation field review with player-owned ✓ / X decisions.
- A Rate Confirmation confirms only after all required fields are manually marked as matching.
- Any flagged field enables the locked Rate Confirmation correction Email workflow with both source documents attached.
- Sending the correction request moves the document to CORRECTION_REQUESTED; the carrier response creates a new current version and supersedes the prior copy.
- Corrected Rate Confirmations return to Pending review with checks reset.
- No automatic document recognition or hidden lifecycle advancement is introduced.
- Protected stable checkpoint remains CS2.0B.4.2.6-STABLE.


## CS2.0B.4.3.3.1-TEST — Forced Rate Con Discrepancy
- Cumulative from CS2.0B.4.3.3-TEST.
- Adds a temporary test-only +$125 rate discrepancy to newly generated initial Rate Confirmations.
- Corrected v2 returns to the authoritative FreightLink/load rate.
- Must be removed before stable promotion.

## CS2.0B.4.3.4-TEST — Settlement Packet & Documents Polish
- Built cumulatively from the accepted B.4.3.3 correction-path test chain.
- Removed the temporary forced Rate Confirmation discrepancy from gameplay.
- Added permanent load packets tying confirmed Rate Confirmation, approved authoritative POD, invoice, exception evidence when present, and settlement/payment state to the load record.
- Passed on-device functional acceptance.

## CS2.0B.4.3-STABLE — Documents & Rate Confirmation Workflow
- Promoted from the user-approved cumulative B.4.3.4 test source with no new gameplay mechanics.
- Freezes document identity/version/current-authority semantics, POD correction state, Rate Confirmation Email delivery, Pending review, manual ✓/X comparison, correction/versioning workflow, and load packets.
- Temporary B.4.3.3.1 forced-discrepancy acceptance hook is absent from promoted gameplay.
- Locks future physical-paperwork visual treatment for the dedicated visual pass without reopening B.4.3 lifecycle architecture.
- Replaces CS2.0B.4.2.6-STABLE as the protected checkpoint after real-repo verification and tag.

