## Current build: AW1.6.7 — Stop Marker Integrity + Map Layer Hierarchy

# MASTER-2026-09-05-A Build Chain

Base:
- DOC-OS-FULL-CURRENT(1).zip

Applied in order:
1. Phase2.2c3 Active Trip Fix
   - src/App.css
   - src/components/LoadDetailsScreen.jsx
   - src/components/MainGameScreen.jsx
2. Phase2.2c4 Delivery Facility Fix
   - src/components/GameMap.jsx
   - src/components/MainGameScreen.jsx
3. Phase2.2c5 Trip Dispatch Consistency
   - src/components/MainGameScreen.jsx

This file exists to stop version ambiguity. Future work begins from this complete master, not from an isolated patch ZIP.

## Master D — 2026-09-06
Built from Master C. Interaction-polish-only pass: facility/status-pill ownership, en-route driver popup auto-close, and amber normal selection accent with tutorial blue reserved.

## Master E — 2026-09-06
Source: Master D
Change: Project-wide accent sweep. Ordinary selected/active/action emphasis moved to lavender; legacy blue removed from normal UI; tutorial blue reserved for future tutorial guidance. No gameplay logic changes.

## Master G — 2026-09-06
Base: DOC-OS-MASTER-2026-09-06-F
Patch: Phone Information Grid v1 / App Cohesion Foundation
No gameplay-state changes.

## MASTER H — 2026-09-06 — FreightLink Cohesion
Built from MASTER G. Adds Available/Active/History filters, Available List/Map browsing, single-load lane preview, compact load header, and compact Driver Assignment row while preserving the accepted two-step planning/dispatch contract.

## MASTER I — 2026-09-06 — FreightLink Main-Map Browse Mode
Built from MASTER H. Removes the embedded FreightLink map from the phone. The FreightLink MAP control now dismisses the phone and opens a temporary FreightLink Browse Mode on the main DOC OS map, where available pickup pins can be selected to preview the full pickup-to-delivery lane. VIEW LOAD returns to the normal FreightLink load detail flow. No load-state or dispatch-state ownership changed.

## Master J — 2026-09-06
- Base: Master I
- FreightLink accept crash guard: clear browse-only selected load before reopening phone.
- Packaging normalized: package.json at archive root.

## Master K — 2026-09-06
- FreightLink post-assignment white-screen fix.
- Compact Driver Assignment row now renders the equipment label instead of the equipment object.

## MASTER L — FreightLink lifecycle cohesion
Built from Master K. Locks one FreightLink home shell across DOC001/DOC002+ and unifies FreightLink browse markers with the operational map marker system.

- MASTER M: FreightLink header density polish + informational facility popup auto-close.

## Master N — FreightLink final polish
- Driver map popup auto-close (~2.2s).
- Driver Select primary header normalized; load ID moved to compact kicker.

- Master O: FreightLink final polish — sort dropdown, browse back path, raised hint, routed-line-only rendering.

## Master P — 2026-09-06
Built from Master O. Adds authoritative freight expiration and explicit driver-location carry-forward between completed and subsequent loads.

## Master Q — Route Camera Ownership Fix
- Based on Master P.
- Dispatch now takes camera ownership back from driver-focus zoom and fits the full active route once at departure.
- Manual camera control remains free after the initial route fit.

## MASTER S — 2026-09-06
Built from MASTER Q.
- Dynamic Driver Positioning v1
- Freight Market Refresh v1
- Day 2 load-wave posting
- Added later-day DOC108–DOC110 market freight


## MASTER T — Camera Ownership Consistency
Facilities only own camera focus once Marcus is physically at that facility; otherwise driver focus remains authoritative.

## MASTER U — Unified Game Flow
- Removes legacy tutorial/progression gates from freight visibility.
- DOC001/DOC002 now use timed market posting like later loads.
- Tutorial emails no longer control operational availability.

## Master V — Resume Marker Rehydration
Built from Master U.
- Restores driver/facility markers after app background/return.
- Keeps route line and marker state synchronized from game state.

## Master W — Marker Resume Hardening
Built from Master V. Re-entry/resume now recreates operational DOM markers independently of MapLibre style readiness and retries after WKWebView layout settles.

## Master X — Normal Market From Game Start
- Removed tutorial/operation-day freight visibility gates.
- Normal timed market pool is available from the first operation day.
- Removed Day-2 special load reset and mentor transition dependency.
- End Day no longer depends on a closeout email.

- MASTER Y: Freight Market Refresh V2 — full 8:00 AM board + additive refresh waves.

## Master Z — Freight Market Lock
Built from Master Y.
- Initial market board posts at 7:00 AM so freight is already live before the 8:00 AM operating day.
- Refresh waves remain additive at 10:00 AM, 12:00 PM, 2:30 PM, and 5:00 PM.
- Added player-facing broker-style load numbers (`LD-#####`) while preserving internal `DOC###` IDs for save/game logic.
- Updated FreightLink, market map, planning, driver, documents, and ledger surfaces to display the player-facing load number.
- Freight Market v1 considered locked after this pass.

## Master AA — Freight Market Date + Mileage Ownership Polish
Built from Master Z.
- Adds explicit pickup/delivery dates to FreightLink market surfaces for same-day, future-day, and overnight freight.
- Removes automatic Marcus/driver deadhead and fit estimates from Available Loads.
- Available-board mileage is load mileage only; driver-specific deadhead remains in Driver Select / Driver Fit.
- Market population, 7:00 AM opening board, additive refresh waves, lifecycle, and `LD-#####` references remain unchanged.

## Master AB — Communications + Character Interaction v1 Foundation
Built from Master AA only.
- Locks Jordan Blake's opening mentor email into normal gameplay without tutorial gating.
- Rewrites the CarrierSource approval email and replaces the long Metroline contract with a compact signed operating-goals agreement.
- Archives the signed Metroline agreement in Documents as a read-only business record.
- Introduces persistent Marcus conversation history and his short first-driver message.
- Adds the active-load briefing composer in Messages, including intentional wrong-load selection/correction gameplay.
- Pickup dispatch now requires the current Marcus load to be correctly briefed after route confirmation; briefing never dispatches the truck.
- Operations alerts distinguish PICKUP PLAN REQUIRED, DRIVER UPDATE REQUIRED, and READY FOR DISPATCH while remaining navigation-only.
- Disables the legacy DOC002 tutorial-closeout email/simulation-speed fallback.
- Applies the parked player-facing `DEL` -> `DELIVERY` label cleanup.


## Master AC — Metroline Agreement UX Polish
Built from Master AB.
- Converts the Metroline operating agreement to a compact two-column layout.
- Removes typed-name signature entry and uses explicit SIGN & SUBMIT electronic acceptance instead.
- Prevents the agreement flow from opening the iOS keyboard / leaving the phone viewport zoomed.
- Mirrors the two-column agreement layout in the signed Documents archive.
- No Freight Market, routing, load lifecycle, driver briefing, or communication-ownership logic changes.

## Master AD — Messages Polish + Queue Handoff Fix
Built from Master AC.
- Replaces the native iOS active-load select in Messages with a DOC OS in-app load picker.
- Splits Marcus's introduction into short text bubbles and compacts CarrierSource approval copy.
- Formats outbound load briefs for message-history readability and includes facility names in Marcus pickup/delivery arrival texts.
- Fixes multi-load chaining so `queued` loads can never become the driver's active operational load before explicit queue promotion.
- Keeps Marcus physically at the prior receiver during load closeout; the promoted next load plans deadhead from the authoritative runtime position to its pickup.
- No Freight Market timing/population or unrelated lifecycle systems changed.

## Master AE — POD Closeout Handoff Fix
Built from Master AD.
- POD approval now completes the current load and performs driver/queue closeout in the same explicit workflow action.
- Removes the normal two-render `awaiting-pod -> delivered -> completed` handoff that could leave Marcus stranded in an intermediate state.
- Preserves Marcus at the receiver as the authoritative origin and promotes the next queued load immediately when one exists.
- After approval, Documents closes back to the operational map and Marcus is refocused so the next required action is visible.
- No automatic dispatch: a promoted load still requires pickup planning, driver briefing, and explicit dispatch.
- Existing POD checkbox-verification UI is intentionally unchanged in this stability patch and remains queued for redesign.

## MASTER AF — stale POD READY marker cleanup
- Baseline: MASTER AE.
- GameMap now clears Marcus's existing status-pill DOM text when no active load remains after POD closeout.
- Prevents completed/available Marcus from visually retaining `POD READY` until the results UI is closed.
- No simulation-state or closeout behavior changed.

- Master AG: hardened multi-load handoff so only the promoted active load owns movement; promoted queued loads reset to a fresh pickup leg.

## Master AH — Appointment Accountability + Alert Palette
Built from Master AG.
- Adds operational appointment monitoring for active/queued loads: approaching, window open, and late alerts.
- Appointment alerts open the relevant FreightLink load; they never mutate simulation state.
- Pickup and delivery arrival timestamps now drive real on-time/late scoring in Load Results.
- Per-load XP is performance-based: completion baseline, pickup/delivery bonuses or late penalties, and POD bonus.
- Day service/reputation now reflects missed pickup/delivery appointments instead of treating every approved POD as perfect service.
- Operations alert palette uses DOC OS purple for attention and charcoal-tinted green/red for success/problem states.

## MASTER AI — 2026-09-07
Base: MASTER AH (locked checkpoint)
Purpose: Facility Operations / Loading Challenge V1.
Adds an interactive timed pickup loading challenge after check-in. Eight pallets must be loaded within 24 seconds. Missed pallets persist as shipment shortages and add facility delay. Results are stored on the load for later unloading/POD exception systems.

## MASTER AJ — 2026-09-07
**Base:** AI  
**Focus:** Loading Challenge drag-and-drop interaction.

- Replaced tap-to-load with true pointer drag-and-drop.
- Added floating pallet drag feedback and open-slot highlighting.
- Pallets now snap into the exact trailer slot where they are dropped.
- Invalid/occupied drops return freight to staging.
- Preserved AI timer, pallet accounting, delay, and shipment-state behavior.

See `MASTER_AJ_PATCH_NOTES.md`.


## MASTER AK — 2026-09-07
- Fixed iOS Loading Challenge drag coordinates by portaling the floating pallet to `document.body`.
- Added pointer capture and touch visual hardening.
- AJ gameplay rules remain unchanged.

## MASTER AL — 2026-09-07
- Branches from Master AK.
- Replaced Pointer Events / pointer capture in Loading Challenge with native iOS touch drag handling plus mouse fallback.
- Fixes iPhone/WKWebView freeze immediately after drag begins.
- Preserves AK visuals and all AI/AJ loading challenge gameplay rules.

## MASTER AM — 2026-09-07
- Base: MASTER AL
- Hotfix: restored missing `loadedIds` derived state in `LoadingChallenge.jsx`.
- Fixes immediate white-screen `ReferenceError` when BEGIN LOADING opens.
- No other gameplay or visual behavior changed.

## MASTER AN — 2026-09-07
Base: MASTER AM
Purpose: Loading Puzzle V1.
Adds heavy/standard/fragile freight placement rules, recoverable trailer rearrangement, and player-caused missing/damage shipment state.

## Master AO — 2026-09-07
Branched from AN. Adds a pre-loading briefing/fade. First loading challenge in the app session receives the full 2-second rule card; subsequent challenges receive a short title sting. The dock timer and pallet interaction remain paused until the briefing clears. Puzzle and load-state rules are unchanged.


## Master AP — Automated Pickup Facility Cycle
Pickup Operations V1 complete: Marcus automatically checks in, facility dock waiting is appointment-aware, and DOC OS alerts the player only when loading is ready. AO loading puzzle remains unchanged.

## Master AP1 — Pickup Dock-Wait Pacing Hotfix
Test hotfix on AP. Caps normal early/on-time dock waits at 15/12 game minutes, keeps a 35-minute late penalty, repairs excessive in-progress AP waits on hydration, and changes the map pill to show remaining dock ETA. Pickup lifecycle behavior otherwise remains AP.

## Master AQ — Delivery Arrival Lifecycle V1
Built from Master AP1.
- Delivery arrival now mirrors the professional-driver ownership established at pickup: Marcus automatically begins receiver check-in on arrival.
- Adds delivery `CHECKING IN -> WAITING FOR DOCK -> DOCK READY` phases driven by the authoritative game clock.
- Receiver dock waits are appointment-aware and paced for active gameplay: 12 minutes early, 10 minutes in-window, 30 minutes late.
- Marcus sends arrival and checked-in/waiting messages; communications report simulation state but never advance it.
- DOC OS surfaces a `DOCK READY` alert only when player attention is required.
- Tapping the delivery facility at dock-ready exposes `BEGIN UNLOADING`; this explicit action starts the existing temporary 8-game-minute unload flow.
- No unloading puzzle or freight verification logic is added in AQ; those remain Delivery Operations follow-up work.

## Master AR — Unload Sequencing / Space Clearing V1
Built from Master AQ. Replaces passive delivery unloading with a 45-second spatial logistics puzzle using the actual pickup trailer layout. The receiver requests freight in sequence; the player clears blocking pallets into two staging spaces and sends only requested freight to the dock. Extra moves/rejected receiver attempts add handling delay. Pickup-created shipment truth remains authoritative.

## Master AR1 — Unload Sequencing Onboarding Polish
Built from Master AR. Preserves Unload Sequencing / Space Clearing V1 gameplay and adds a first-run instructional briefing, paused timer until dismissal, trailer → staging → receiver flow cue, first-move highlights for accessible pallets and staging spaces, and a short repeat-play title sting.

## AR2 — Unload Planning Visibility
- Built from AR1 unload sequencing onboarding polish.
- Adds current + next two receiver-request visibility for staging strategy.
- Updates onboarding/hint copy to teach forward planning.
- Gameplay rules and delivery lifecycle remain unchanged.
- Status: test build pending device approval.

## Master AS — Freight Condition Continuity + POD Handoff
Built from Master AR2 (Rejected Moves terminology polish).
- Pickup shipment state is the authoritative source for expected, loaded, missing, and damaged pallet counts through delivery closeout.
- Unload completion now carries pickup-established condition into delivery facility results and the POD instead of deriving a new condition at delivery.
- POD verification now verifies that piece-count and damage information is recorded, even when the load contains a legitimate shortage or damage exception.
- Clean freight still presents `No damage reported`; damaged freight presents a damage notation carried forward from pickup.
- Exception freight can now complete POD verification and proceed to closeout instead of becoming permanently blocked by a non-clean shipment.
- Unload Sequencing gameplay, timing, staging, receiver requests, and scoring are unchanged.
- Status: test build pending device approval.

## Master AT — State Integrity & Resume Safety
Built from tested Master AS.
- Modal-owned planning/minigame workflows now actually pause the simulation clock and restore the player's prior pause state on exit.
- Removes the obsolete App-level automatic unload path that could fabricate a clean 12/12 POD.
- Interrupted `unloading-delivery` saves reopen Unload Sequencing on resume with time safely paused.
- Zero loaded/received pallet counts are preserved as real values instead of falling through numeric defaults.
- DEV delivery/POD presets now use the same shipment truth and POD continuity model as live gameplay.
- No AR2 unload gameplay rules changed.
- Status: test build pending device approval.

## Master AT1 — Dock Ready Pause Hotfix
Built from Master AT.
- `DOCK READY` at pickup now pauses the authoritative simulation clock before the player presses `BEGIN LOADING`.
- `DOCK READY` at delivery follows the same rule before `BEGIN UNLOADING`.
- Fast-forward normalizes to 1x at the owned decision point.
- The pre-existing pause state is preserved so completing the loading/unloading workflow restores the correct clock state.
- No loading/unloading gameplay, shipment, POD, routing, queue, or scoring rules changed.
- Status: test build pending device approval.

## AT2 — Route Planning Recovery
- Adds a hard route-resolution ceiling so external routing cannot deadlock progression.
- Live ORS routing remains preferred.
- Timeout/error/missing-key cases resolve to a deterministic fallback route.
- Pickup and delivery planning both receive the same protection.
- Fallback routes are visibly labeled in planning UI.

## MASTER AU — Interaction & Puzzle Polish
- Built from AT2.
- Player-owned pickup/delivery puzzle completion.
- Full-trailer pickup pallet swapping before secure.
- Clean-operation time efficiency XP.
- Lightweight dispatcher quick replies.
- Notification source hierarchy and unload timeout wording polish.


## Master AU1 — Map & Communication Language
- Brighter purple notification language.
- Driver Fit before load commitment.
- Quiet map: no driver card, wait progress ring, facility `!` attention.
- Dock-ready no longer globally pauses.
- Explicit message-driven dispatch.
- Message threads auto-scroll to newest.


## Master AU2 — Navigation & Operational Feedback
- Built from AU1.
- Restores compact en-route/arrival/check-in map feedback.
- Makes delivery planning directly reachable from Alerts, Messages, and the Drivers drawer.
- Strengthens one project-wide purple attention language.


## AU3 — Day Integrity & Operational Cleanup
Driver Fit is now review-only with explicit accept/assign commitment; appointment alerts are restricted to player-owned freight; legacy loading auto-completion is removed; mobile background saves flush immediately; idle return movement is smoothed; and active carrier yards are visible on the operations map.

## MASTER AV — Multi-Load Operations Foundation
- Driver-independent runtime progress and movement ownership.
- Driver-scoped current/queued load architecture and queue projection.
- Interruptible idle/yard repositioning.
- Drivers drawer shows current/next/projected availability.
- Shared driver operational-state model drives map/drawer language.
- Alerts and Messages carry driver/load ownership.
- Loading/unloading challenges no longer globally pause simulation.
- Critical lifecycle transitions flush saves immediately.
- Operational Marcus hardcodes removed; Marcus remains the only content driver for AV regression testing.
- Next intended step after AV passes: AV1 adds Driver #2.

## AV1 — Driver Action Hub & Natural Messaging
AV1 preserves AV's multi-load/multi-driver foundation while making the driver drawer the direct next-action hub. Driver cards now route the player into the exact workflow required by the current load. En-route map labels are tap-to-reveal instead of permanently displayed. Driver Messages return to a normal text-thread interaction model: Reply opens contextual choices, Send Route and Dispatch are separate, and operational actions produce natural outbound messages.

## MASTER AV2 — Schedule, Communication & Market Rhythm
- Built from AV1.
- Adds daily load schedule hamburger drawer.
- Driver Fit risk now uses pickup-window close, not pickup-window open.
- Combines arrival/check-in/waiting into one driver update per facility.
- Adds communication reply choices + per-driver communication rapport.
- Cleans alert language around pickup/delivery windows.
- Makes EXPIRED freight red.
- Increases FreightLink posting cadence and adds late-day freight.
- Preserves AV per-driver architecture and AV1 natural messaging/driver action hub.


## AV2.1 — Communication Gate + Header Cleanup
- End Day moved to Notifications drawer footer.
- Pickup communication is gated: load brief → plan → route send → driver confirmation → dispatch message.
- Delivery uses the same route-send → confirmation → dispatch message pattern.
- Movement cannot be started by skipping required communication.

## MASTER AV2.2 — Operational Documents + Email Workflow
- Built from AV2.1.
- Email gains a compose workflow with recipient selection and document attachments.
- Metroline's signed agreement now enforces carrier approval before FreightLink acceptance.
- Load approval is requested and returned through Email.
- Agreement and POD receive artifact-style visual treatments.
- Exception PODs can require formal correction through Email before approval.
- LedgerDesk invoice drafts are submitted through Email with invoice + POD attachments.
- Incorrect recipient/document combinations create documentation follow-up instead of silently succeeding.
- Carrier yard marker is now a depot/garage icon.
- AV2.1 driver communication/dispatch gates, puzzles, routing, queue ownership, and market cadence are unchanged.

## MASTER AV2.3 — Relationship + Documents + Workflow Navigation
- Relationship UI replaces COMMS RAPPORT number with qualitative bar/tier.
- Relationship scoring now reacts to meaningful dispatcher-driver communication and deduplicates repeated events.
- Agreement and POD gain reusable expanded document viewing outside the phone frame.
- Documents archive becomes accordion folders for FreightLink Loads, PODs, Invoices, and Agreements.
- Email attachments become compact paperclip file links.
- Operational emails and Documents records gain direct related-record navigation.
- FreightLink pending carrier approval can reopen the exact approval request email.

## MASTER AV2.3.1 — Friction Cleanup + Native Documents
- Built from AV2.3.
- Sending a driver route now releases that driver into pickup/delivery movement; the redundant final Dispatch step is removed.
- Email attachment selection is category-first using document-type + file dropdowns instead of a flat list.
- Email attachments render as compact paperclip links and open directly into expanded document view.
- Agreement and POD open directly outside the phone shell; Agreement signing and POD review actions live inside the expanded document workflow.
- Agreement, POD, load-offer, invoice, and exception previews use native DOC OS document styling instead of generic paper styling.
- Multi-load architecture, puzzles, routing, formal Email workflows, relationship system, and AV2.3 related-record navigation are preserved.

## AV2.4 — Foundation Cleanup
Built from AV2.3.4. Removes the retired assisted-flow scaffolding from runtime source, normalizes Day 1 into the standard operation loop, cleans daily closeout reporting, equalizes Agreement term styling, restrains purple attention surfaces, adds proximity-aware pickup communication, and finishes the active terminology cleanup. No Driver #2 or core lifecycle redesign.


## AV2.4.1
Foundation cleanup recovery. Rebased visual CSS on AV2.3.4 after AV2.4 test rejection.

## AV2.5 — Map & Planning Awareness
Built from the promoted AV2.4.1 stable foundation. Adds an explicit BOARD camera fit, automatic multi-driver board framing, and full driver → pickup → delivery spatial context during pickup planning. Route movement and lifecycle ownership are unchanged.


## AV2.5.1 — Planning Visibility Polish
- MARKET moved into Operations drawer.
- Planning camera made overlay-aware.
- Planning cards tightened; BOARD remains map-specific.

- AV2.5.4: Action-aware Operations alerts + continuous visual driver interpolation.

## AV2.5.6 — Continuous Driver Render Clock
- Built from AV2.5.5.
- Driver markers use a stable animation-frame render clock with fractional game-time progress.
- Route segment metrics are cached for smooth iPhone rendering.
- Simulation state and arrival lifecycle remain authoritative and unchanged.

## AV2.6 — CarrierSource Identity + Live Agreements
- Persistent dispatcher profile created inside CarrierSource.
- CarrierSource now separates My Carriers and Opportunities.
- Metroline agreement is live operating data shared by CarrierSource, FreightLink approval rules, LedgerDesk economics, and Daily Closeout.
- Carrier relationship is distinct from driver relationship and updates from daily service results.

- AV2.6.1 — DOC OS identity polish for CarrierSource landing page.


## AV2.8 — Trip Planning System
- Driver Select creates a provisional trip once.
- Carrier approval preserves the plan.
- BOOK LOAD commits driver + deadhead + loaded route legs.
- Loaded route persists through pickup; normal delivery is SEND ROUTE, not re-plan.

## AV2.9 — Dispatch Operations Workflow
- Schedule promoted to authoritative workday view.
- Normal player route-planning / Send Route ceremony retired.
- Driver movement begins from assignment/physical facility release.
- Driver release separated from POD administrative closeout.
- Messages shifted from workflow controller to human coordination.


## AV2.9.3 — Confirm Unload Reference Fix
- Fixed missing `promoteNextQueuedLoad` import used by unload completion.
- Prevents runtime ReferenceError / white screen on CONFIRM UNLOAD.

## AV2.9.4 — Handoff + Multi-Driver Schedule Foundation + Message Reply UI
- Persist queued-load driver briefing/acknowledgment and auto-start acknowledged next loads on promotion.
- Preserve queued trip route geometry through handoff.
- Add ALL DRIVERS / per-driver Schedule selector foundation.
- Replace always-visible message replies with DOC OS-styled contextual REPLY dropdown.
- Keep AV2.9 dispatch-operations workflow and AV2.9.3 unload-confirm fix intact.

## AV2.9.5 — Day Flow Polish (test build)
- Schedule completed-state visual cleanup.
- CarrierSource phone-first layout pass.
- FreightLink player-owned map camera.
- FreightLink broader full-day floor inventory.
- Remaining follow-on planning wording removed from market map.

## AV2.9.6 — Approval Flow + Handoff Movement
- Load Details auto-evaluates single-driver fit; approval-required freight goes directly to REQUEST APPROVAL.
- Driver fit alone stays off Schedule; pending/approved requests create provisional holds; BOOK LOAD commits.
- Queued-load handoff recalculates actual receiver → next pickup route before movement, preventing pickup teleport.

## AV2.9.7 — Appointment Gates + Full-Day Freight Market
- Hard pickup/delivery service gates prevent early loading/unloading.
- Full-day FreightLink coverage through 8 PM at start, extending later on hourly refresh.
- Generated market appointments use :00/:30 pickup times.

- AV2.9.8 — Multi-Load Foundation I: appointment-aware staging, driver-context Messages UPDATE/REPLY split, staged departure projection.


## AV2.10 — Multi-Stop Itinerary Foundation
- Built from AV2.9.8 test source.
- Adds onboard freight state, automatic pickup-before-delivery insertion, load-ID-aware messaging, customer facilities, and overnight freight generation.

- AV2.10.1: itinerary authority; provisional pre-pickup insertion, stop-first schedule, shared driver itinerary context, overnight alert guard.

- AV2.10.2 — iPhone developer tools: hidden DOC OS long-press menu now includes persistent CREATE TEST PROFILE plus RESET GAME.

- AV2.10.3 — itinerary order authority, message time formatting, operational update dedupe, readable multi-stop preview.

- AV2.10.4 — Late multi-stop activation when a compatible queued load is sent after anchor loading completes.
- AV2.10.5 — Active Itinerary Map: all unfinished assigned-load stops visible; current travel route authoritative; future planned legs dashed.

- AV2.10.6 — Itinerary Sequencing + Route Identity: time-prioritized constrained itinerary, next-stop routing after inserted pickups, per-load pickup/delivery route styling and labels.

- AV2.10.7 — Live itinerary diversion: loaded drivers can divert from a later active delivery to a newly confirmed compatible pickup; route from live position and keep anchor freight onboard.

- AV2.11 — Authoritative Driver Itinerary: canonical next-stop movement authority + map layer hierarchy.

- AV2.11.1 — itinerary authority gate before routing + map UI stacking contract

## AV2.11.2
Itinerary-safe pickup recovery and stop-first driver availability projection.

## AV2.12 — Driver Movement Authority + Freight Identity
- One canonical physical movement leg per driver.
- Per-driver route-request token guards against stale async route races.
- Route-origin sanity check protects live diversions from cached geometry teleports.
- Operational freight identity moved to customer/facility + freight type; load IDs remain reference/document identifiers.

## AV2.13
Communications Center V1: messaging/alerts cleanup plus iPhone Carrier Approval dev controls.


## AV2.14 — Schedule-First Operations
Schedule owns the workday; Messages communicate plans, relationship, and exceptions rather than controlling routine load progression.

## AV2.15 — 6 AM Planning + Carrier Gate
- Workday standard start moved to 6:00 AM for pre-shift planning.
- Initial freight market moved to 6:00 AM.
- FreightLink locked until an active carrier relationship exists and its driver is on roster.
- Preserves fit-before-load-approval and schedule-first operation.


## AV2.17 — Grouped Carrier Approval + Schedule Action Polish
FreightLink adds freight to the plan without contacting the carrier. Schedule sends one grouped approval request and uses the DOC OS action surface.

## AV2.17.1 — Build repair + patch-note consolidation
- Repaired AV2.17 schedule-action CSS where escaped `\\n` text had been written literally into `src/App.css`, causing Lightning CSS/Vite to fail.
- Consolidated legacy `MASTER_*_PATCH_NOTES.md` files into one root `PATCH_NOTES.md` file for test/master ZIP cleanliness.
- Going forward, append release notes to `PATCH_NOTES.md` instead of creating a new patch-note file per build.

AV2.18 — Planning Intelligence
- Built from AV2.17.1.
- Planning UX only; execution foundation protected.

AV2.18.1 — Added post-carrier 6:00 AM day reset shortcut in iPhone Dev Tools.

AV2.18.2 — Freight haul classification (LOCAL / REGIONAL / LONG HAUL) added to FreightLink planning and Schedule.

AV2.19 — Schedule Control + Multi-Driver Visual Identity
- Built from AV2.18.2.
- Planning controls: remove/withdraw/cancel pre-movement freight, whole-day impact, open/travel windows, completed collapse.
- Communications: delta-only schedule updates; facility-first Marcus language.
- Map: persistent per-driver color families; per-load route shades; route-bearing labels that stay upright.
- Protected: authoritative driver movement / canonical itinerary engine.


## AW1.6.2
Load Details CTA is anchored to the bottom action bar. Carrier approval returns to Today’s Plan. Approved schedule freight can be booked directly from the scheduler before the driver schedule is sent.


## AW1.6.3 — Schedule State Integrity
Booking no longer starts movement. Today’s Plan order is persisted through booking, SEND SCHEDULE grants movement authority, and Driver Hub follows the same authoritative itinerary as the map.


## Current patch
AW1.6.9 — Route Info Anchors. See `PATCH_NOTES.md`.

AW1.6.10 — Compact Route Peek. See `PATCH_NOTES.md`.


## AW1.6.10.3 — Route Label Shrink-Wrap Hotfix
Route peek geometry only: shrink-wrap the compact route label without changing typography or interaction behavior.

## AW1.6.10.4 — Stacked Route Label Final Polish
- Narrowed route annotation by stacking status, pickup time, and delivery time.
- Preserved existing typography and interaction behavior.
- Removed redundant same-day date text from route annotation times.



## AW1.6.11 — Facility Ops Restore
Restores authoritative loading/unloading minigame entry and clock ownership during facility gameplay.

## AW1.6.12 — Itinerary Schedule Validation
Today’s Plan planning intelligence now simulates the full ordered stop sequence. Stop-to-stop travel, appointment windows, service time, waiting time, tight windows, and conflicts are evaluated before producing the plan-quality verdict. Dense timeline stops use a compact card treatment for readability.

## AW1.6.14 — Scheduler Utility + Load Detail Layout
- Today’s Plan surfaces stop-by-stop travel, buffer, wait, and lateness from the itinerary simulation.
- Conflict plans block approval/booking actions until resolved.
- Dense timeline stops preserve route identity without overlapping as heavily.
- Load Details is viewport-locked with a persistent bottom CTA.


## AW1.7.1 stabilization note
AW1.7.1 establishes the driver itinerary as the compatibility authority for active-load consumers, makes FreightLink inspection read-only, repairs Operational Alert action delivery, and aligns the operations-map future route display with Today’s Plan stop order.

## AW1.7.3 — Map + Timeline Integrity Restore
AW1.7.3 restores the itinerary stop markers, FreightLink browse markers, and iOS marker-rebuild safeguards lost during the AW1.7 cleanup. Future operations-map route visuals now use stable pickup-to-delivery road geometry per load while the authoritative itinerary controls priority/order. Scheduler cards within 75 minutes of adjacent stops render compactly to avoid overlap.

## AW1.7.4
Map continuity + driver layering. Completed legs/stops remain visible as muted day history. Marcus is layered above route geometry but below P/D markers.
