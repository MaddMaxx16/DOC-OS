# DOC OS — Build Bible
Baseline: 2026-09-05
Canonical build: MASTER-2026-09-05-A

## 1. Vision
DOC OS is a realistic dispatcher simulation that looks like a professional operations system but plays like a game. The map is the primary world. The phone/device is a secondary operations tool.

The player loop is:
FIND -> EVALUATE -> ACCEPT -> ASSIGN -> PLAN -> DISPATCH -> MANAGE -> DELIVER -> CLOSE OUT -> GET PAID -> PROGRESS

## 2. Current Canonical Baseline
This master is the latest full source plus the existing verified patch chain, applied in order:
1. DOC-OS-FULL-CURRENT(1)
2. Phase 2.2c3 Active Trip Fix
3. Phase 2.2c4 Delivery Facility Fix
4. Phase 2.2c5 Trip Dispatch Consistency

No new gameplay feature was added during baseline creation.

## 3. Core Load Lifecycle — Locked Contract
AVAILABLE
-> ACCEPTED / ASSIGNED
-> PICKUP PLAN READY
-> EN ROUTE TO PICKUP
-> AT / WAITING AT PICKUP
-> CHECKED IN PICKUP
-> LOADING
-> LOADED
-> DELIVERY PLAN READY
-> EN ROUTE TO DELIVERY
-> AT DELIVERY
-> CHECKED IN DELIVERY
-> UNLOADING
-> AWAITING POD
-> DELIVERED / COMPLETED

### Two-step dispatch contract
Pickup and delivery use the same player rhythm:
PLAN -> CONFIRM PLAN -> return to map -> Operations action -> vehicle moves.

Planning never dispatches automatically.

## 4. Marcus Visibility Contract
Marcus must remain visible/locatable during every active-load state unless a deliberately designed facility-state presentation replaces his direct marker interaction.

A UI action may focus Marcus or a facility, but must never corrupt assignment, active load, trip status, runtime position, or route state.

## 5. Operations Notification Contract
An Operations alert is a doorway to an already-valid game action. It must not invent a new state transition.

Examples:
- Pickup route ready -> START TRIP
- Pickup arrival -> CHECK IN
- Loaded -> PLAN DELIVERY
- Delivery route ready -> DISPATCH
- Delivery arrival -> CHECK IN

## 6. Day 1 Acceptance Test — Marcus / DOC001
A build is not considered stable unless this full path passes from a clean save.

[ ] Start Day 1 / New York / Metroline state is correct.
[ ] FreightLink lists DOC001 correctly.
[ ] Open DOC001 details.
[ ] Accept load.
[ ] Assign Marcus.
[ ] Marcus appears on map as ASSIGNED.
[ ] PLAN TRIP opens pickup planning.
[ ] CONFIRM PLAN stores route but Marcus does NOT move.
[ ] Return to map: Marcus is still visible and assigned.
[ ] Operations shows START TRIP.
[ ] START TRIP dispatches Marcus exactly once.
[ ] Marcus remains visible en route.
[ ] Arrival at pickup changes to facility/check-in state without losing Marcus/load state.
[ ] CHECK IN works.
[ ] Loading completes.
[ ] Loaded message/Operations state appears.
[ ] PLAN DELIVERY opens delivery planning.
[ ] CONFIRM PLAN stores route but Marcus does NOT move.
[ ] Return to map: Marcus remains visible/locatable and load remains active.
[ ] Operations shows DISPATCH.
[ ] DISPATCH sends Marcus exactly once.
[ ] Marcus remains visible en route to delivery.
[ ] Arrival at delivery exposes delivery facility CHECK IN.
[ ] Fast-forward drops to 1x on informational arrival; DOCK READY pauses when a dispatcher action is required.
[ ] CHECK IN delivery works.
[ ] Unloading progresses.
[ ] POD/closeout path remains reachable.
[ ] Completion does not leave stale active-trip state.

## 7. Regression Smoke Test
Run after EVERY logic patch:
ACCEPT -> ASSIGN -> PLAN PICKUP -> START TRIP -> PICKUP -> LOAD -> PLAN DELIVERY -> DISPATCH -> DELIVERY -> POD/COMPLETE

If any previously passing step fails, the patch is rejected rather than patched again on top.

## 8. Development Rules
1. ONE MASTER BUILD. New work always starts from the latest verified master.
2. NEVER patch a patch. Apply a candidate change to a copy of Master, test it, then promote the whole result to the next Master.
3. ONE SYSTEM PER CHANGE PACKAGE. Example: load lifecycle, UI density, messaging, or progression—not several unrelated systems.
4. LOGIC BEFORE POLISH. Broken lifecycle blocks feature work.
5. DESIGN BEFORE CODE for significant interface changes.
6. LOCK FINISHED SYSTEMS. Do not touch them incidentally.
7. BUG REPORT FORMAT: What I did / What happened / What should happen.
8. ROOT CAUSE BEFORE EDIT. Trace event -> state transition -> derived UI -> map/runtime effect.
9. REGRESSION TEST BEFORE PROMOTION.
10. CHECKPOINT EVERY WIN. Keep a last-known-good master.

## 9. Change Classes
### A — Visual only
Typography, spacing, card density, labels, color, layout. Must not alter gameplay state.

### B — Workflow/UI behavior
Opening panels, notification destinations, focus, modal behavior. Must not alter lifecycle except via an explicit existing action.

### C — State/Simulation
Trip status, route assignment, driver assignment, clock, runtime movement, arrival/check-in, loading/unloading, completion. Requires full regression test.

### D — New feature
Progression, negotiation expansion, events, skill system, new carrier systems. Requires stable Class C baseline first.

## 10. Parking Lot — Do Not Build Until Core Is Stable
- Deeper XP/progression feedback
- Skill tree implementation
- Dynamic dispatcher events/choices
- Expanded negotiation
- Carrier growth/reputation
- Multiple-driver pressure
- More markets

These are not rejected. They are protected from being built on unstable foundations.

## 11. Next Engineering Objective
Do not redesign DOC OS.
Do not add features.

Next objective: make the Day 1 acceptance test pass cleanly on this master and identify any lifecycle state that has more than one competing transition owner.

Only after Day 1 is stable do we resume the "game feel" layer: decisions, consequences, XP feedback, progression, and satisfying completion.

## Communications Contract — Master B

### Messages
- Messages represent people communicating with the dispatcher.
- A message's sender identity and historical text are stable once the event exists.
- Driver messages resolve against the driver who handled the load (`assignedDriverId` or `completedDriverId`).
- Marcus must display as **Marcus Reed**, never as a generic **Driver** fallback when his load lifecycle advances.
- A message may offer a shortcut into a still-required workflow (for example, **PLAN DELIVERY**), but it does not silently advance trip state.

### Alerts / Operations Bar
- Alerts represent DOC OS surfacing operational attention, not conversation.
- The Operations Bar is a notification/navigation surface only.
- Tapping an alert may focus Marcus, pickup, delivery, Documents, LedgerDesk, or results.
- Tapping an alert must **never** dispatch a driver, send a driver to pickup, check in, complete a load, or otherwise mutate trip state.

### Ownership Rule
`game event -> communication presentation -> navigation -> explicit player action -> game-state mutation`

Messages and Alerts may both describe the same underlying event. That redundancy is intentional; they have different jobs.

## Accent Language — Master E
- Smoked plum (#756D80) is the standard interactive accent for selected, active, focused, and primary-action states.
- Soft plum-gray (#A49BAE) is used for accent copy and icons.
- Bright blue is not used by the live gameplay UI. The future tutorial layer will receive its own dedicated palette later.
- Semantic status colors remain independent: green = success/clear, orange = attention/warning, red = danger/error.

## FreightLink v1 — Cohesion Contract (Master H)
FreightLink owns freight discovery and load lifecycle visibility. Home filters are AVAILABLE / ACTIVE / HISTORY. AVAILABLE supports LIST / MAP. Map selection is only an alternate discovery path: selecting a pickup pin previews that load's pickup-to-delivery lane, and VIEW LOAD opens the same Load Detail screen used by List. There is no alternate acceptance path and no automatic dispatch action from FreightLink. After acceptance, driver selection/assignment remains explicit. After assignment, PLAN TRIP remains explicit. Confirming a plan returns operational dispatch ownership to the DOC OS map/driver workflow. Multi-load Build Route is deferred until simultaneous-load gameplay is intentionally implemented.

## FreightLink Geography Ownership — MASTER I
- FreightLink LIST lives in the phone/browser.
- FreightLink MAP uses the main DOC OS map; do not create a second embedded map for market browsing.
- Selecting an available pickup pin previews only that load's full pickup-to-delivery lane.
- VIEW LOAD returns to the normal FreightLink detail page; List and Map converge on one detail/acceptance flow.
- FreightLink map browsing never accepts, assigns, plans, or dispatches automatically.
- Phone owns information/decisions; the main map owns geography/spatial planning.

### FreightLink map ownership safety
When FreightLink Browse Mode hands a load back to the phone via VIEW LOAD, all browse-only map selection state must be cleared before load lifecycle mutations such as ACCEPT. The phone owns the selected load after handoff; the main map must not retain a stale AVAILABLE-load reference.

## FreightLink lifecycle cohesion — Master L
- FreightLink has one home layout for every load and tutorial phase: AVAILABLE / ACTIVE / HISTORY are permanent shell controls.
- List/Map are alternate discovery views under AVAILABLE; they do not create alternate lifecycle flows.
- FreightLink main-map browse mode reuses the same pickup/delivery marker visual language as the operational map. Context may add a load label or selection ring, but never a second facility-icon design.

## FreightLink UI Lock — Master N
- Driver selection pages use `Driver Select` as the primary page title; the target load ID belongs in compact contextual text, not the primary title.
- Lightweight driver map cards auto-close after a short delay to keep the map unobstructed.

## Master O FreightLink final-pass rules
- FreightLink lifecycle tabs remain visible; secondary sort controls collapse into a caret dropdown.
- FreightLink map browse never displays a straight-line placeholder; only completed road-route geometry is rendered.
- Selected browse loads always provide BACK to all pins without exiting FreightLink.

## Freight Market Time Contract — Master P
- An AVAILABLE load remains actionable through the end of its pickup window.
- Once the pickup window end passes without acceptance, the load becomes EXPIRED.
- EXPIRED freight leaves Available/market-map browsing and moves to History.
- Driver physical location persists across load closeout. The previous delivery facility becomes the origin for the next deadhead unless another active/queued operational state explicitly defines the origin.

### Travel Camera Ownership
- Explicit driver/facility focus may temporarily zoom the map to the selected object.
- Starting an en-route leg transfers camera ownership back to the operation: fit the complete active route once when the trip is dispatched.
- Do not continuously force-follow the driver after that fit; player pan/zoom takes precedence until another explicit focus or dispatch event.

## Dynamic Driver Positioning + Freight Market Refresh v1
- A driver without an active/queued load should not remain frozen at the last receiver forever.
- After a short post-delivery dwell, the driver may reposition toward a yard, staging point, fuel/rest stop, or similar operating location.
- Runtime position is authoritative for future deadhead/fit calculations.
- A new assignment immediately cancels idle-positioning ownership.
- FreightLink Day 2+ is a changing market, not a static all-day catalog.
- Loads post in waves; expired unaccepted loads leave Available and enter History as EXPIRED.
- Market waves should vary facility combinations so zero-deadhead opportunities feel rewarding rather than guaranteed.


### Camera ownership rule (Master T)
- Driver owns camera during assigned/planned/en-route/loaded/route-ready states.
- Pickup/delivery facilities own camera only when Marcus is physically in the corresponding facility interaction state.
- Stale facility popups must not survive into driver-owned states.

## Unified Gameplay Flow Contract — Master U
- Tutorial presentation/mechanics are dormant in the live build until a later tutorial-specific pass.
- Emails are informational/contextual; they never unlock or block freight, apps, or operational actions.
- Freight availability is determined by market posting time, operation day, and lifecycle status only.
- DOC001, DOC002, and all subsequent loads follow the same FreightLink lifecycle contract.
- A previous load never has to be completed merely to make the next market load visible.

### Map Resume Contract (Master V)
The active route and its operational markers are both derived UI. On app resume/visibility restoration, DOC OS must rebuild DOM-backed driver/facility markers from current game state so a restored MapLibre route layer can never appear without its corresponding markers.

### Map Resume Contract — Master W
- Route layers and DOM markers are both derived UI, but they can rehydrate on different timelines in WKWebView.
- Marcus, pickup, and delivery markers must be rebuilt from current game state whenever the game becomes visible again.
- Marker recreation must not depend on MapLibre style readiness.
- Resume recovery may retry after layout settles; missing markers after re-entry are never treated as valid saved state.

## Normal Market Contract (Master X)
Freight visibility is controlled only by market posting time and load lifecycle state. Tutorial emails/messages/alerts may inform the player but never unlock freight, End Day, or operation transitions. DOC001 and DOC002 use the same FreightLink lifecycle as the normal market pool.

## Freight Market Refresh V2
The market opens with a full morning board at 7:00 AM. Later waves add freight at 10:00 AM, 12:00 PM, 2:30 PM, and 5:00 PM. Existing valid freight remains until accepted or expired. Communications never gate market visibility.

## Freight Market Final Contract — Master Z
- The morning freight board posts at 7:00 AM, before the 8:00 AM operating day begins.
- Later market refreshes are additive at 10:00 AM, 12:00 PM, 2:30 PM, and 5:00 PM.
- Existing valid freight stays available until accepted or expired; refreshes do not wipe the board.
- Player-facing load references use realistic `LD-#####` numbers. Internal `DOC###` IDs remain stable implementation/save keys and should not be shown as the normal load reference in gameplay UI.
- Communications may report market events but never unlock or gate freight.
- Freight Market v1 is locked after Master Z; further changes should be bug fixes or an intentional future market-system expansion.

## Freight Market Date + Mileage Ownership Contract — Master AA
- Every market load exposes an explicit pickup calendar date and delivery calendar date in player-facing FreightLink surfaces. Same-day freight still shows both dates; overnight/future-day freight must never rely on an implied "today".
- `listedMiles` on FreightLink represents the load's pickup-to-delivery mileage only.
- FreightLink Available must not infer or display Marcus/current-driver deadhead, projected arrival, or fit before a driver is evaluated.
- Driver-specific deadhead and fit are owned by Driver Select / Driver Fit, where the selected driver's authoritative runtime/projected position can be used.
- Market-level sorting may use freight facts such as pickup time, rate, and load miles, but not an unselected driver's position.
- Master Z market population/timing rules remain locked: full board at 7:00 AM with additive 10:00 AM, 12:00 PM, 2:30 PM, and 5:00 PM refreshes.

## Communications + Character Interaction v1 — Master AB

### Channel Ownership
- **Alert** = operational attention. Use it when the player needs to do something or inspect an unresolved operating condition.
- **Message** = a person talking to the dispatcher. Messages may be operational, reactive, or personality-driven and do not require an action button.
- **Email** = formal business communication, documentation, or mentor content.
- Silence is a valid communication decision. Do not mirror every lifecycle state across every channel.

### Simulation Source-of-Truth Rule
`simulation event -> communication decision -> presentation/navigation -> explicit owned workflow -> simulation mutation`

- Communications report authoritative simulation state.
- Opening/reading an alert, message, or email never creates an arrival, check-in, loading event, dispatch, delivery, payment, or market state.
- Alerts may navigate to the relevant driver/facility/app.
- Formal agreement acceptance may change the carrier relationship only through the explicit signed agreement workflow.

### Jordan Blake
- Jordan is the player's Dispatch Mentor, not the tutorial notification system.
- His first email is `A good place to start` and points the player toward CarrierSource.
- Jordan appears at meaningful milestones, teachable moments, mistakes worth explaining, progression moments, and occasional strategic moments—not after every action.
- Reading Jordan email never unlocks normal gameplay.

### CarrierSource + Metroline Agreement
- CarrierSource owns formal carrier-application responses.
- The Metroline agreement is a compact operating-goals document, not several screens of legal copy.
- The dispatcher signs and explicitly submits the agreement.
- The signed record is permanently archived in Documents and is read-only after acceptance.
- Carrier goals and individual driver preferences remain separate concepts.

### Marcus Reed Message Style
- Marcus is a professional truck driver, not a status object.
- Text messages should be short and natural; personality comes from phrasing and reactions, not long exposition.
- The first Marcus message establishes regional preference, reasonable deadhead, communication expectations, and current readiness.
- Marcus lifecycle texts may report pickup arrival, loaded status, and delivery arrival after the simulation has already produced those events.

### Driver Briefing Contract
Metroline requires the driver to be informed before dispatch.

Pickup flow:
`ASSIGN -> PLAN -> CONFIRM PLAN -> BRIEF DRIVER -> EXPLICIT PICKUP DISPATCH`

- Route confirmation does not dispatch Marcus.
- A route-ready load is **DRIVER UPDATE REQUIRED** until Marcus receives the correct load details.
- Messages exposes active company loads so the player must select the intended load.
- The UI must not silently remove wrong choices merely to prevent mistakes.
- Sending the wrong load is a communication mistake only. It never changes assignment or movement.
- Marcus may question/correct conflicting information.
- Only the correct current route-ready Marcus load records the pickup briefing requirement as satisfied.
- Once correctly briefed, the operational state becomes **READY FOR DISPATCH** and the player must still explicitly dispatch Marcus.

### Communication Persistence
- Persist character/business message records that need historical continuity.
- Derived lifecycle messages must use stable deterministic event IDs and authoritative simulation timestamps.
- Read state persists.
- Signed business documents persist.
- Player-facing load references in communications use `LD-#####`; internal `DOC###` IDs remain implementation keys.

### Documents Expansion
Documents is the business record center, not POD-only storage. It may contain signed carrier agreements, PODs, rate confirmations, invoices, and other future records. Master AB begins this expansion with signed carrier agreements while preserving the existing POD workflow.


## Metroline Agreement UX — Master AC
- Master AC is a presentation/input hardening pass built from Master AB.
- The Metroline agreement uses a compact two-column information layout: **Shift goals** and **Operating expectations**.
- Carrier priorities remain visible in a compact full-width summary below the two columns.
- Agreement acceptance no longer requests a typed player/dispatcher name. **SIGN & SUBMIT** is the electronic-signature action and records the signer as `Authorized Dispatcher` with the authoritative in-game timestamp.
- Removing the text input prevents the agreement flow from invoking the iOS keyboard/viewport zoom behavior.
- The read-only agreement archived in Documents mirrors the same two-column content structure.
- Carrier activation, Marcus introduction, Documents archival, driver briefing, Freight Market, and simulation-state ownership are unchanged from Master AB.

## Messages History + Driver Queue Ownership — Master AD

### Message History Readability
- Marcus texts remain short and natural; introductions should use multiple short bubbles rather than one paragraph-sized message.
- Operational arrival messages must remain understandable in history. Pickup/delivery arrival texts include the actual facility name.
- Dispatcher load briefs use a compact multi-line structure: load reference, pickup, delivery, and deadhead when available.
- The active-load selector in Messages is a DOC OS-owned picker, not the native iOS `<select>` presentation.
- The player can still intentionally choose any active company load; the custom picker improves presentation without filtering away mistakes.

### Driver Queue Ownership
`QUEUED` means waiting for future ownership. It is never an active operational load.

- `getDriverActiveLoad()` returns only a non-queued, non-terminal assigned load; if only queued loads exist it returns `null`.
- GameMap never treats `queued` as an operationally active state.
- A queued load becomes active only through explicit queue promotion after the prior load closes.
- During the closeout handoff, the driver's authoritative physical position remains the previous load's delivery location.
- The promoted load begins in `assigned` state and must follow the normal pickup sequence from that runtime position: plan -> brief -> explicit dispatch -> pickup.
- A queued load must never contribute route/facility ownership early, preventing delivery-first jumps or mixed old/new load context.

## POD Approval + Driver Handoff — Master AE
POD approval is an explicit document/workflow action and may close the delivered load, but it must not leave load completion dependent on a later communication or UI event.

Normal closeout contract:
`AWAITING POD -> APPROVE POD -> COMPLETED -> PROMOTE NEXT QUEUED LOAD (if any)`

- The approval action records the POD approval and load completion together.
- Marcus remains physically at the completed load's receiver during closeout.
- If another load is queued, queue promotion happens in the same workflow handoff and the next load becomes `assigned`.
- The promoted load follows the normal pickup contract: `PLAN -> BRIEF DRIVER -> EXPLICIT DISPATCH -> EN ROUTE TO PICKUP`.
- POD approval never auto-dispatches Marcus.
- After approval, the phone returns control to the main operational map and refocuses Marcus so the next required action/alert is immediately visible.
- The old `delivered`-state closeout effect remains only as a recovery path for legacy saves/dev states.
- The current checkbox-based POD verification presentation is not considered final gameplay and will be redesigned separately; Master AE changes closeout ownership only.

## MASTER AF — POD closeout marker rule
When POD approval closes a load and Marcus has no next active load, the map marker must immediately clear any load-specific attention/status pill. Marker DOM state must never outlive the active load that produced it.

## Master AG queue handoff guard
Only `getDriverActiveLoad()` may own driver movement. Promoting a queued load resets travel/delivery/POD state; Marcus remains physically at the prior receiver until explicitly dispatched to the next pickup.

## Appointment Accountability — Master AH
Appointments are gameplay commitments, not passive FreightLink metadata.

Operational alert contract:
- 30 minutes before an unserved pickup/delivery window: surface an approaching appointment alert.
- During the appointment window: surface a purple attention alert with time remaining.
- After the window closes without arrival: surface a charcoal-red late alert with minutes late.
- Appointment alerts navigate to the relevant load details only; they never plan, dispatch, check in, or advance the load.
- Queued/accepted work remains eligible for appointment alerts so freight cannot disappear from the player's awareness simply because it is not the currently open FreightLink card.

Performance contract:
- Pickup performance is scored from `pickupArrivalGameMinute` against the pickup window.
- Delivery performance is scored from `deliveryArrivalGameMinute` against the delivery window.
- Early and in-window arrivals count as on time.
- Late arrivals lose the corresponding on-time bonus and apply an XP penalty.
- Load Results show pickup and delivery performance separately; the former hard-coded `ON TIME: YES` value is prohibited.
- Day-level service score and reputation reflect appointment misses as well as document completion.

Alert visual language:
- Purple is the primary DOC OS attention color.
- Success green and problem red are muted/charcoal-tinted rather than bright traffic-light colors.
- Color supports urgency; text must always communicate the actual operational condition.

## Facility Operations — Loading Challenge V1 (Master AI)
Pickup check-in no longer automatically starts and completes loading. Once checked in, the pickup facility exposes BEGIN LOADING. The challenge pauses the simulation clock and gives the player 24 real seconds to account for eight pallets. Successful pallets are persisted in shipment state. Unhandled pallets become missing freight and each adds five game minutes of handling delay. Confirming the result advances the game clock by the standard pickup service time plus earned delay and moves the load to LOADED. This system is the authoritative seed for later damage, unloading, and POD exception gameplay.

## Master AJ — Loading Challenge Interaction Contract

Loading Challenge V1 uses drag-and-drop as the primary touch/mouse interaction. A staged pallet must be dragged into an open trailer slot to count as loaded. Invalid drops do not mutate shipment state. Trailer slots are explicit and preserve the player's chosen placement. The challenge's timer and AI shipment-result contract remain unchanged.


## MASTER AK — 2026-09-07
- Fixed iOS Loading Challenge drag coordinates by portaling the floating pallet to `document.body`.
- Added pointer capture and touch visual hardening.
- AJ gameplay rules remain unchanged.

### Master AL — Loading Challenge iOS touch-drag fix
The loading challenge must use native touch events on iOS rather than Pointer Events with pointer capture. The drag ghost remains portaled to `document.body`; touch movement is tracked by touch identifier; release location is resolved with `document.elementFromPoint()` against trailer slots. Mouse drag remains available for desktop testing. Do not reintroduce `setPointerCapture()` into this minigame without device verification.

### Master AM — Facility Loading render hotfix
Master AM restores the `loadedIds` memo accidentally dropped during the AL native-touch rewrite. Loading Challenge effects and handlers depend on this derived list, so its absence caused an immediate runtime ReferenceError/white screen when the loading modal mounted. AM is intentionally surgical and preserves AL's native touch drag implementation and all AI/AJ gameplay rules.

## Loading Puzzle Contract — Master AN
The pickup loading challenge is a short player-skill puzzle. Heavy freight belongs at the front of the trailer, standard freight in the center, and fragile freight at the rear. A full but incorrectly arranged trailer must remain playable until the timer expires so the player can correct mistakes. Freight not loaded at timeout becomes missing; freight left in an invalid zone becomes damaged. These results persist in shipment state for later delivery and POD systems.

## Loading Challenge entry contract — Master AO
The loading puzzle begins with an instructional beat before live play. On the first loading challenge of the app session, show HEAVY -> FRONT, STANDARD -> CENTER, FRAGILE -> REAR for approximately two seconds and fade into the board. Later challenges use a short LOADING CHALLENGE sting. The dock timer must never run and freight must not be draggable until the entry overlay has completely cleared.


## Master AP — Automated Pickup Facility Cycle
Pickup Operations V1 complete: Marcus automatically checks in, facility dock waiting is appointment-aware, and DOC OS alerts the player only when loading is ready. AO loading puzzle remains unchanged.

## Master AP1 — Pickup Dock-Wait Pacing Rule
Routine pickup waiting must create background operational texture, not dead gameplay. Early arrivals use a 15-minute facility wait, in-window arrivals use 12 minutes, and late arrivals use 35 minutes. An in-progress saved wait is normalized to the current timing contract when hydrated. The map status pill displays remaining dock ETA rather than elapsed waiting time.

## Delivery Facility Arrival Contract — Master AQ
Routine receiver arrival is driver-owned, not dispatcher-owned.

Normal delivery facility lifecycle:
`ARRIVE AT DELIVERY -> CHECKING IN -> WAITING FOR DOCK -> DOCK READY -> BEGIN UNLOADING`

- Marcus automatically checks in with the receiver on arrival; there is no manual dispatcher CHECK IN action.
- Delivery check-in consumes five game minutes before the receiver wait begins.
- Receiver dock wait is appointment-aware: early arrival = 12 game minutes, in-window arrival = 10 game minutes, late arrival = 30 game minutes.
- While Marcus is checking in or waiting, the player may continue dispatcher work. The facility wait must not demand continuous attention.
- Marcus communicates arrival and completion of check-in through Messages. Messages never own or mutate the facility lifecycle.
- DOC OS surfaces `DOCK READY` only when the receiver is ready and the player has an actionable next step.
- The dock-ready alert navigates to the delivery facility but does not start unloading.
- `BEGIN UNLOADING` remains an explicit facility action. In AQ it starts the existing temporary timed unload behavior; a dedicated unloading/verification gameplay system will replace that placeholder later.
- Pickup and delivery share an interaction language, but their later gameplay consequences may differ.

## Master AR — Delivery Gameplay Identity
Delivery Operations V1 uses unload sequencing / space clearing as its core physical minigame. The trailer layout is inherited from pickup. Rear-most freight is accessible; blocked receiver-requested pallets require temporary staging. Delivery gameplay is therefore extraction/order planning rather than a second loading puzzle or a receiver classification quiz.

## Unload Sequencing Entry Contract — Master AR1
The first unload sequencing challenge in an app session must teach the loop before live play: receiver-requested freight is delivered in order; only rear-accessible trailer freight can move; two staging spaces clear blockers; requested freight goes to the receiver. The dock timer and interactions remain paused until the player dismisses the first-run briefing. Accessible pallets and staging spaces receive temporary first-move emphasis. Later unload challenges use a short title sting and enter live play automatically. AR gameplay rules and freight truth are unchanged.

## Delivery Unload Planning — AR2
Unload Sequencing exposes a short planning window: the current receiver request plus the next two projected requests. The purpose is to make staging a deliberate logistics decision. The player should use staging as temporary parking to clear blockers while considering which freight will be needed next. The planning window updates from the current trailer/staging state and does not alter the underlying freight truth or delivery lifecycle.

## Freight Condition Continuity + POD Handoff — Master AS
Freight condition is established by the physical pickup/loading workflow and must remain continuous through delivery and closeout.

Authoritative condition contract:
`PICKUP LOADING -> SHIPMENT STATE -> DELIVERY UNLOAD -> POD -> CLOSEOUT`

- `shipment.expectedPallets`, `shipment.loadedPallets`, `shipment.missingPallets`, `shipment.damagedPallets`, and `shipment.palletManifest` are the source of truth after pickup loading completes.
- Delivery unloading may report and display that condition, but it must not invent a new clean/damaged/short state that contradicts pickup shipment truth.
- A clean shipment produces a clean POD (`damage: None`) when all loaded freight arrives.
- Pickup-created damage remains damage at delivery and must be represented as a POD damage notation.
- Pickup-created shortages remain reflected in the POD piece count (`received / expected`).
- POD verification means confirming that the paperwork accurately reflects the shipment, not requiring the shipment itself to be exception-free.
- Therefore, a documented count mismatch or damage notation is a valid, verifiable POD condition and must not permanently block approval/closeout.
- Missing POD information remains invalid and requires review.
- AS does not add new random delivery damage, claims logic, OS&D workflows, or receiver disputes. Those are future exception-system layers.

## State Integrity & Resume Safety — Master AT
Owned player workflows must be temporally atomic from the simulation's perspective.

Modal timing contract:
- Trip planning, delivery planning, loading/unloading challenges, and end-of-day decisions pause the authoritative game clock while the player is making the owned decision.
- Entering one of these workflows records whether the player was already paused, forces simulation speed back to 1x, and pauses time.
- Leaving the workflow restores the exact pre-modal pause state.
- Phone browsing remains part of the live operation and does not pause time.

Delivery-unload ownership contract:
- `unloading-delivery` is not a passive timer state. Unload Sequencing owns completion.
- `App.jsx` must never auto-transition `unloading-delivery` to `awaiting-pod` and must never fabricate a default clean POD.
- Only `completeUnloadSequence()` may create delivery facility results/POD from the authoritative pickup shipment state.

Resume contract:
- If hydration finds an assigned load in `unloading-delivery`, reopen the unload challenge and keep simulation time paused.
- A resumed unload may restart the real-time puzzle board, but it must not silently complete, advance the game clock, or create paperwork without explicit player completion.

Numeric integrity contract:
- Zero is valid data. Use `Number.isFinite()` style fallbacks for shipment counts; do not use truthy `||` fallbacks where `0` has meaning.

DEV parity contract:
- DEV presets that represent loaded/delivered/POD states must build from the same shipment and freight-condition model as normal gameplay. Hard-coded 12/12 clean POD shortcuts are prohibited.

## Dock Ready Decision Timing — Master AT1
- Facility waiting/check-in remains live simulation time.
- Entering pickup `checked-in-pickup` or delivery `checked-in-delivery` means the facility is ready and DOC OS is waiting on an owned dispatcher decision; the authoritative game clock must pause immediately.
- `BEGIN LOADING` / `BEGIN UNLOADING` inherits that pause and must not overwrite whether the player was already paused beforehand.
- Workflow completion applies explicit service/delay minutes, then restores the player’s pre-decision pause state.
