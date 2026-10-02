# DOC OS ROADMAP

> **Roadmap reconciled:** 2026-10-02  
> **Current branch:** `p2.4-experience-rebuild`  
> **Known-good onboarding/performance checkpoint:** `checkpoint/perf-onboarding-stable-2026-10-02` / `6d9bf13`  
> **Current active phase:** P2.4 Experience Rebuild — First Day Onboarding

This file is the source of truth for **phase order and status**. `DOC_OS_BUILD_BIBLE.md` is the source of truth for system behavior, ownership contracts, design rules, and protected regression behavior.

Historical test notes remain below for traceability. Their old IN TEST/NEXT labels do not override this current status map.

## CURRENT STABLE FOUNDATION

### Operations systems — COMPLETE / PROTECTED

- [COMPLETE] **CS2.0B.4.2-STABLE — Multi-Day Operations**
  - Real calendar dates and rolling seven-day Agenda.
  - Full 24-hour Day View and cross-midnight continuity.
  - Per-driver/per-date workday, lunch, routes, and Shift End.
  - Future-dated FreightLink market.
  - Midnight is calendar-only; it does not reset the world.
  - Open freight, physical driver state, assignments, and routes persist across dates.
  - Shift End owns post-work staging.

- [COMPLETE] **CS2.0B.4.2.6-STABLE — Compact Email Workflow**
  - Required operational Email uses locked Review → Send.
  - Schedule Approval, correction workflows, and Invoice Submission use explicit SEND authority.
  - Fixed mobile review surfaces passed on-device testing.

- [COMPLETE] **CS2.0B.4.3-STABLE — Documents & Rate Confirmation**
  - Versioned/current-authority document lifecycle.
  - Rate Confirmation receipt, manual compare/verify, correction request, and corrected version.
  - Permanent load/settlement packet foundation.
  - Player verification remains authoritative; bad approval may be allowed for future consequence systems.

- [COMPLETE] **CS2.0B.4.4-STABLE — LedgerDesk Banking**
  - Operating Account and receivables are distinct.
  - Opening capital: $2,500.
  - Payment and bank-deposit records remain separate.
  - Global CASH reads authoritative bank balance.
  - End Operations advances the live world to the next 07:00 operating start.

- [COMPLETE] **CS2.0B.5.3 — Driver Duty / HOS + HOS-Aware Load Evaluation**
  - Driver-scoped Drive/Duty clocks.
  - Started duty-session time is historical/locked.
  - Rest recovery follows continuous OFF DUTY rather than midnight/day-close resets.
  - FreightLink exposes HOS as an operational evaluation signal.
  - Existing Agenda midnight-first presentation remains a polish item, not a data-model defect.

### Player experience foundation — COMPLETE / PROTECTED

- [COMPLETE] Rebuilt DOC OS workstation/title experience.
- [COMPLETE] New Dispatcher name flow.
- [COMPLETE] Character Creator foundation and approved appearance library.
- [COMPLETE] Local avatar rendering; no live DiceBear dependency for the Toon Head base.
- [COMPLETE] Character layer/recolor/headwear/facial-hair fixes.
- [COMPLETE] Phone ecosystem lazy loading.
- [COMPLETE] Secondary phone-app/workspace code splitting.
- [COMPLETE] Startup/Operations runtime separation.
- [COMPLETE] Removal of obsolete Market Selection / old Day-One Entry route.
- [COMPLETE] Performance cleanup checkpoint: five-minute reachable onboarding test showed 100% → 100% displayed iPhone battery on the known-good build.

Battery percentage is a coarse signal; the result is used as a strong regression check rather than a claim of zero power consumption.

## ACTIVE NOW — P2.4 EXPERIENCE REBUILD

### First Day Onboarding

**Goal:** turn the current First Day placeholder into the real bridge between player creation and the protected Operations simulation.

Current reachable clean-save flow:

**Startup → Workstation/Login → New Dispatcher → Name → Character Creator → First Day**

Target tutorial arc:

**First Day at Metroline → Jordan orientation/training → employee workstation/phone → Marcus already rostered with Metroline → FreightLink DOC001 → evaluate/assign/accept through the real Metroline workflow → plan → dispatch → pickup → facility cycle → delivery → paperwork → payment**

DOC002 may become available later the same operating day after DOC001.

**Career-start contract:** the player begins as a Metroline employee. Metroline is already active, Marcus is already on the carrier roster at the Metroline Yard, and the clean employee operation has no CarrierSource application or signed-agreement dependency. CarrierSource is reserved for later career progression beyond the starting employee role.

### First Day implementation slices

- [NEXT] **P2.4-FD.1 — First Day Arrival / Orientation**
  - Establish the player at the Metroline workstation after Character Creator.
  - Establish the player's Junior Dispatcher employee role and Jordan as Metroline trainer/supervisor.
  - Teach only the minimum workstation/phone orientation needed for the first assignment.
  - No fake simulation state and no full Operations runtime before required.

- [PLANNED] **P2.4-FD.2 — Employee Operation Initialization**
  - Initialize the real Metroline employee career state.
  - Metroline begins active as the employer.
  - Marcus already belongs to the Metroline roster and begins from the Metroline Yard.
  - Preserve real workday/HOS state and carrier-controlled schedule data.
  - No CarrierSource application, approval, or agreement dependency.

- [PLANNED] **P2.4-FD.3 — Marcus / First Workday Context**
  - Introduce Marcus as the player's assigned Metroline driver without an artificial activation event.
  - Surface the real schedule/HOS context the player needs for the first assignment.
  - Driver communication begins from legitimate work events such as clock-in or schedule communication.

- [PLANNED] **P2.4-FD.4 — FreightLink / DOC001**
  - Introduce the real FreightLink board and DOC001.
  - Teach load evaluation, driver fit/HOS signal, assignment, and acceptance under the real Metroline workflow.

- [PLANNED] **P2.4-FD.5 — First Dispatch**
  - Enter the protected Operations runtime at the legitimate handoff.
  - Plan the real route.
  - Explicit dispatch remains separate from planning.

- [PLANNED] **P2.4-FD.6 — Pickup / Facility Operations**
  - Teach arrival, check-in, waiting/loading, and meaningful exceptions using existing facility authority.

- [PLANNED] **P2.4-FD.7 — Delivery / POD / Closeout**
  - Complete delivery, document review, correction if applicable, invoice/payment loop, and first-job completion feedback.

- [PLANNED] **P2.4-FD.8 — First Day Regression & Promotion**
  - Clean-save iPhone run from startup through DOC001 completion.
  - Verify save/resume at meaningful tutorial boundaries.
  - Verify no startup battery regression.
  - Verify Operations still passes its protected lifecycle regression.
  - Promote First Day only after the full path passes.

### P2.4 performance gate

The Operations engine must remain dormant until the tutorial legitimately enters Operations. Do not move routing, movement, HOS simulation, LedgerDesk reconciliation, facility runtime, map runtime, or dev-scenario systems back into the startup bundle to make onboarding implementation easier.

Performance regressions block promotion just like lifecycle regressions.

## LATER CAREER BOUNDARY

### CarrierSource / Independent Career Progression
CarrierSource is **not** part of First Day or the starting Metroline employee loop. It returns later when career progression moves the player beyond the employee role and carrier relationships/applications become a player responsibility. Do not surface CarrierSource early merely because its existing systems remain in the codebase.

The exact progression gate should be designed from the employee-career experience rather than hard-coded into First Day.

## AFTER FIRST DAY — CORE EXPANSION

### CS2.0C.0 — Second Carrier + Second Driver
Add one meaningfully different carrier and a second driver to prove that the architecture is genuinely generic rather than Metroline/Marcus-specific.

### CS2.0C.1 — Multi-Driver Operations Polish
Stress-test simultaneous driver needs. Improve readability, alerts, badges, Driver Hub, and Agenda only where real play pressure demonstrates the need.

### CS2.0C.2 — Carrier Progression & Unlocks
Carrier XP/levels should unlock real operating privileges, access, and career resources rather than acting as decorative score.

### CS2.0C.3 — Dispatcher Skill Tree
Route Optimization, Driver Management, Carrier Capacity, Operations Intelligence, and Negotiation. Skills must change decisions or operating capability.

### CS2.0C.4 — Carrier Negotiation
Milestone-based career negotiation through CarrierSource/Documents with meaningful tradeoffs.

## LATER SYSTEM / CONTENT PASSES

### Dedicated Visual Pass
Polish closeout, level-ups, reviews, document folders, LedgerDesk, remaining Agenda presentation debt, and other proven workflows without changing their underlying authority.

### Communications Phase 2
Email threading, differentiated driver personality, varied phrasing, and richer exception-driven communication while preserving the quiet-when-routine contract.

### Dynamic Events
Traffic, delays, cancellations, paperwork mismatches, detention, equipment, driver issues, weather, and receiver problems integrated into existing systems rather than as detached minigames.

### Additional Markets
Add markets only after the core simulation has sufficient depth. Each market must materially differ in geography, traffic, freight, carriers, facilities, or operating style.

## ROADMAP RULES

1. First Day is the active feature phase; do not skip ahead to C.0 systems while the clean-new-player path ends at a placeholder.
2. The player starts as a Metroline employee; CarrierSource is not an onboarding gate.
3. Build tutorial slices through the real authoritative systems.
4. Keep the startup/Operations performance boundary intact.
5. Preserve the known-good performance checkpoint before architecture changes.
6. Stable Operations contracts are not rewritten merely to make tutorial scripting easier.
7. On-device acceptance is required before promotion.
8. Historical notes below are evidence/history, not the current priority list.

---

## HISTORICAL IMPLEMENTATION / TEST LOG

> **B.4.2 test infrastructure note — CS2.0B.4.2.2.1-TEST:** Existing hidden iPhone Dev Tools now include clock-jump controls for midnight/multi-day validation. This is testing support only and does not add or reorder roadmap gameplay scope.

> Test note — CS2.0B.4.2.2.2: hidden Dev Tools safety was hardened to support multi-day testing. This is test infrastructure only and does not alter B.4.2 roadmap scope. B.4.2 remains IN TEST.

> B.4.2 test note — CS2.0B.4.2.2.3: controlled overnight Dev Tools scenario added to validate cross-midnight persistence. B.4.2 remains IN TEST; no roadmap scope added.

> **B.4.2 progress — CS2.0B.4.2.2 validated:** midnight rollover, carryover freight, preserved driver/route state, unchanged world clock through Daily Closeout, and Return to Operations continuity passed iPhone testing.
>
> **Current test slice — CS2.0B.4.2.3-TEST:** Overnight Staging & Next-Day Continuity. Add explicit per-driver/per-date overnight positioning choices; preserve the resulting physical position as tomorrow's routing origin. HOS remains deferred to B.5.

> **B.4.2 test revision — CS2.0B.4.2.3.1-TEST:** Overnight staging narrowed to Truck Stop or Carrier Yard. Player-facing future-build/HOS commentary removed. Explicit selection required. B.4.2 remains IN TEST.

### Current test revision
CS2.0B.4.2.3.3-TEST — Overnight Staging Movement Persistence. B.4.2 remains IN TEST; stable checkpoint remains CS2.0B.4.2.1-STABLE until user approval.

**Current B.4.2 test note:** CS2.0B.4.2.3.4-TEST applies presentation polish to the proven overnight staging flow. B.4.2 remains IN TEST; no phase order or scope changes.

<!-- CS2.0B.4.2.3.5-TEST: overnight marker badge polish in test; B.4.2 remains IN TEST. -->


- CS2.0B.4.2.3.6-TEST: overnight badge size correction remains IN TEST under B.4.2; no phase advancement.

> CS2.0B.4.2.3.7-TEST: Strategic Truck Stop Selection is IN TEST under B.4.2.3. Overnight staging now supports explicit fixed-world player selection (Carrier Yard + three truck/rest stops). B.4.2 remains IN TEST; no stable promotion yet.


> **CS2.0B.4.2.3.8-TEST:** Overnight Agenda Timeline Continuity is IN TEST. The fixed seven-day date strip remains unchanged; the selected Day View may extend vertically across midnight when that operational day requires it. B.4.2 remains IN TEST; stable checkpoint remains CS2.0B.4.2.1-STABLE.

- CS2.0B.4.2.3.10-TEST: Full Carryover Day Timeline — IN TEST. Receiving dates with overnight carryover retain the 12:00 AM carryover window while rendering the complete calendar day.

> **B.4.2 test revision — CS2.0B.4.2.3.11-TEST:** Agenda Day View normalized to a full 24-hour calendar-day canvas for every date, simplifying carryover presentation while preserving cross-midnight continuity. B.4.2 remains IN TEST.

### B.4.2.3.12 TEST NOTE — Truck Stop Map Markers & Staging Movement Polish
IN TEST. Adds persistent truck-stop map markers and smooth visual interpolation for already-authorized overnight staging travel. This is presentation polish inside B.4.2.3; it does not add HOS or change staging authority.

- CS2.0B.4.2.3.13-TEST — Map POI Marker Size Consistency — IN TEST. Aligns yard/truck-stop POI marker sizing; no operational logic changes.

> **B.4.2 closure revision — CS2.0B.4.2.4-TEST:** Parent-phase acceptance audit is IN TEST. Code audit confirms FreightLink load appointments carry calendar day indexes through market generation/planning displays and LedgerDesk receivables are created only for completed loads with approved POD. Final iPhone acceptance still required for per-date driver/lunch isolation, real pickup/delivery date continuity, and no-revenue-before-close behavior. Overnight staging now retains a subdued destination route line while repositioning. No Communications, HOS, Documents, or Banking scope added.

> **B.4.2 closure revision — CS2.0B.4.2.4.1-TEST:** Next-Day Dispatch Authority Fix. Acceptance testing proved per-date lunch/workday data, real FreightLink pickup/delivery dates, and invoice/payment/document continuity. A remaining blocker was found: communicated next-day freight could take movement authority immediately after an overnight completion. This revision prevents pre-shift/future scheduled freight from auto-departing and allows the selected overnight staging plan to retain repositioning authority. B.4.2 remains IN TEST pending iPhone validation.

> **B.4.2 closure revision — CS2.0B.4.2.4.2-TEST:** Shift End Staging Authority. The staging decision is now formally owned by the driver's scheduled shift end, not by midnight or a generic overnight trigger. Active freight retains authority until completed; then the saved Shift End Plan repositions the driver to the selected Carrier Yard or truck stop. Midnight remains calendar-only. Existing `overnight*` persistence keys are retained internally for save compatibility. B.4.2 remains IN TEST.


> **B.4.2 closure revision — CS2.0B.4.2.4.3-TEST:** Shift End staging marker presentation restored: 💤 while repositioning and 🌙 once staged. Text staging labels are intentionally removed. Future assigned freight does not replace the Shift End badge while staging owns movement. B.4.2 remains IN TEST.

> **B.4.2 closure revision — CS2.0B.4.2.4.4-TEST:** Shift End visual release is IN TEST. Completed staging presentation now expires at the next scheduled workday start while preserving physical position. B.4.2 remains IN TEST pending user acceptance.


> **B.4.2 closure revision — CS2.0B.4.2.4.5-TEST:** Driver Active Color Restoration corrects the Shift End → next-workday visual handoff. B.4.2 remains IN TEST; no roadmap scope added.

- CS2.0B.4.2.5-TEST — Multi-Day FreightLink Market: IN TEST. FreightLink now exposes a rolling seven-day pickup market, including midnight/early-morning freight, with pickup-date filtering. Future freight visibility does not grant movement authority.


> **Stable promotion — CS2.0B.4.2-STABLE:** Final stable candidate passed on-device smoke testing and the exact promoted source passed in the real repository. B.4.2 is complete; next roadmap work is Compact Email Workflow Polish.

### CS2.0B.4.2.6 — Compact Locked Workflow Email — ACCEPTED
- Workflow-generated Email is Review → Send: recipient, subject, body, and required attachments are locked.
- Schedule Approval uses the existing multi-load batch approval flow, now with a review gate and time-neutral copy.
- POD Correction and Invoice Submission use the same compact locked review presentation.
- General/freeform composer infrastructure remains available but is not used for required operational workflows.
- Protected: CS2.0B.4.2-STABLE multi-day, Shift End, FreightLink, freight lifecycle, POD, LedgerDesk/payment, approval timing, and automated response timing.

### CS2.0B.4.2.6.1 — Email Presentation — ACCEPTED
- Keeps locked Review → Send workflow behavior from B.4.2.6.
- Removes workflow/card-stack presentation from locked operational email.
- Locked email now uses conventional To/Subject header rows, open message body, inline attachment area, and compact Send action.
- No workflow authority, timing, freight, POD, payment, or B.4.2-STABLE behavior changes.

### CS2.0B.4.2.6.2 — Fixed Workflow Email Review — ACCEPTED
- [COMPLETE] Locked Review → Send workflow email is fixed/non-scrollable when its compact content fits the device.
- [COMPLETE] Removes vertical drag/overscroll from workflow email while preserving the approved email-style presentation.
- Protected: CS2.0B.4.2-STABLE gameplay systems and operational email workflow logic remain unchanged.

- **CS2.0B.4.2.6.3 — Correction Email Entry Points + Attachment Fit — ACCEPTED:** Pickup exception alert now opens a locked correction email; the driver remains held until SEND. POD document correction remains the canonical post-delivery POD correction path. Fixed workflow email layout compacts three attachments so none are cut off. B.4.2-STABLE remains protected.


> **Stable promotion — CS2.0B.4.2.6-STABLE:** Compact Email Workflow passed acceptance testing for Schedule Approval, correction workflows, Invoice Submission, fixed Review → Send presentation, SEND-owned workflow authority, and three-attachment fit. The known repeated-correction behavior on already-corrected PODs is intentionally deferred to B.4.3 Documents architecture.

## CS2.0B.4.3-STABLE — Documents & Rate Confirmation Workflow
B.4.3 passed on-device acceptance through the cumulative B.4.3.1 → B.4.3.4 test chain. The phase establishes versioned authoritative documents, distinct pickup/POD correction states, carrier-delivered Rate Confirmations, manual FreightLink Offer vs Rate Confirmation review, Rate Confirmation correction/versioning, and permanent per-load settlement packets.

**Locked gameplay contract:** manual document verification is authoritative. DOC OS does not silently correct or reject a player's verification decision. Incorrectly approved paperwork may create downstream financial, operational, relationship, or performance consequences when those systems are implemented.

**Document presentation direction locked for the dedicated visual pass:** operational documents should feel like real business paperwork the dispatcher receives, reviews, corrects, files, and retrieves—not database-style UI records. Rate Confirmations, PODs, invoices, agreements, and settlement paperwork should use distinct paper/document layouts while retaining the lifecycle architecture established here.

**TEST hook removed:** the temporary forced +$125 Rate Confirmation discrepancy used to validate the correction branch is not present in the promoted gameplay source.

**Protected stable checkpoint after promotion:** `CS2.0B.4.3-STABLE — Documents & Rate Confirmation Workflow`

## CS2.0B.4.4-STABLE — LedgerDesk Banking
B.4.4 passed final regression and is approved for stable promotion from protected checkpoint `CS2.0B.4.3-STABLE`. LedgerDesk Banking is now the completed banking phase, preserving the B.4.3 document lifecycle and all B.4.2 multi-day/Email contracts.

### CS2.0B.4.4.1-TEST — Banking Foundation
- Establish a persistent DOC OS Operating Account with **$2,500 opening capital**.
- Separate accounts receivable state from bank cash: `PAID` invoices generate distinct deposit transactions.
- Use deterministic invoice-payment transaction IDs so save/resume and repeated reconciliation cannot double-post deposits.
- Existing saves migrate safely: prior PAID receivables are reconstructed as bank deposits once.
- Keep Revenue Earned / Outstanding / Collected accounting intact while introducing authoritative spendable cash underneath it.
- Expose only a compact Operating Account balance proof surface in LedgerDesk; full banking UI is deferred to B.4.4.2.
- Remove the dormant direct-pay shortcut so bank deposits have one authoritative path.

**Acceptance target:** a fresh operation shows $2,500 available; an invoice becoming PAID creates exactly one bank deposit and increases available balance by the dispatch fee; save/reload does not duplicate the deposit.

### Planned B.4.4 slices
1. **B.4.4.1 — Banking Foundation** — account, transactions, opening capital, payment deposits, migration/duplicate protection.
2. **B.4.4.2 — LedgerDesk Account UI** — Operating Account and transaction activity as first-class banking surfaces while preserving receivables.
3. **B.4.4.3 — Payment & Financial Integration** — status bar, notifications, Daily Closeout/Briefing, documents/settlement references use authoritative bank cash.
4. **B.4.4.4 — Banking Polish & Regression** — transaction detail, persistence, references, regression, then B.4.4-STABLE.


### CS2.0B.4.4.2-TEST — LedgerDesk Account UI
**Status:** PASS

Account-first LedgerDesk presentation with Operating Account balance and posted transaction activity. Receivables remains the accounting workflow. Next: B.4.4.3 payment/financial integration across status bar, briefing, closeout, and document packet surfaces.

### CS2.0B.4.4.3 — Payment & Financial Integration — PASS
- Connect global CASH and Day Briefing Available Cash to the LedgerDesk Operating Account.
- Add Operating Account balance to Daily Closeout without replacing the separate Cash Collected metric.
- Preserve LedgerDesk as the single authority for spendable cash.
- Next: B.4.4.4 Banking Polish & Regression, then B.4.4-STABLE.


### B.4.4.3.1 TEST correction
Payment & Financial Integration testing exposed a dormant day-loop handoff: Daily Closeout correctly returned to the live world, but the next-operation briefing had no reachable trigger. B.4.4.3.1 restores that briefing at the naturally reached next operation start while preserving the locked B.4.2 rule that Closeout never advances the calendar or teleports world state.
B.4.4.3.3 fixes the BEGIN OPERATIONS handoff so the consumed 07:00 briefing cannot immediately re-open from historical closeout data.


### CS2.0B.4.4.4 — Banking Polish & Regression — TEST
- Payment transactions now provide a direct reference back to their linked invoice/receivable record.
- Deposit count is explicitly derived from posted invoice-payment credits rather than generic transaction count, keeping the UI correct when future debits arrive.
- Preserve $2,500 opening capital, one-deposit-per-paid-invoice reconciliation, save/reload persistence, authoritative global CASH, and the 07:00 operating-day handoff.
- No new expense system, banking mechanic, or major visual redesign is introduced.
- Final regression accepted, including transaction traceability, duplicate-deposit protection, authoritative CASH, persistent balance, and the 07:00 End Operations handoff.
- **Protected stable checkpoint after promotion:** `CS2.0B.4.4-STABLE — LedgerDesk Banking`.
- **Next roadmap phase:** `CS2.0B.5 — Driver Duty & HOS`.

**Polish backlog:** replace/clarify the prototype `DAY #` top-bar language now that DOC OS uses real calendar dates; reduce the Operating Account hero card's vertical footprint during the dedicated visual pass.

### CS2.0B.5.1.1 — Driver Hub HOS Readability — TEST
B.5.1 duty/driving clock behavior passed on device. This micro-patch only corrects Driver Hub clock readability before B.5.2 Rest & HOS Recovery; it does not alter HOS calculations or authority.

### CS2.0B.5.2 — Rest & HOS Recovery (TEST)
- Continuous 10-hour off-duty recovery restores 11-hour Drive / 14-hour Duty availability.
- Shift End movement and active freight must finish before off-duty recovery begins.
- Current duty-session start becomes immutable once the driver has gone on duty; future schedule starts remain editable.
- Agenda presentation cleanup is queued inside B.5 polish: operationally focused timeline, while real cross-midnight events remain visible.
- Next after acceptance: B.5.3 HOS-aware dispatch planning.
