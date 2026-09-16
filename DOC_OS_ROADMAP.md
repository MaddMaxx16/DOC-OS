# DOC OS ROADMAP

Canonical roadmap introduced with CS2.0B.4.2. This file is the source of truth for phase order and status.

## CURRENT STABLE CHECKPOINT
**CS2.0B.4.2.6-STABLE — Compact Email Workflow**

## COMPLETE — STABLE
### CS2.0B.4.2 — Multi-Day Planning & Shift End Operations
All B.4.2 implementation slices passed user testing through `CS2.0B.4.2.5-TEST`, the stable candidate passed final on-device smoke testing, and the promoted source passed in the real repository.

- [COMPLETE] Actual calendar dates and rolling seven-day Agenda navigation.
- [COMPLETE] Full 24-hour Day View with cross-midnight/carryover continuity.
- [COMPLETE] Per-driver/per-date workday, lunch, Shift End planning, availability context, and routes.
- [COMPLETE] FreightLink real pickup/delivery dates and rolling seven-day future freight market, including midnight/early-morning pickups.
- [COMPLETE] Cross-midnight loads remain active through calendar rollover.
- [COMPLETE] Daily Closeout is a business-day report; it does not reset the world.
- [COMPLETE] Open freight, driver position, assignments, appointments, and routes persist into the next date.
- [COMPLETE] Revenue/payment eligibility remains tied to completed freight/approved POD rather than midnight.
- [COMPLETE] Shift End staging executes only after active freight releases authority, preserves physical location, and cannot be stolen by future scheduled freight.
- [COMPLETE] Shift End map presentation: 💤 while repositioning, 🌙 while staged, then normal blue active presentation when the next workday begins.

**Stable checkpoint:** `CS2.0B.4.2-STABLE — Multi-Day Operations`

**Protected at this checkpoint:** Operations/core lifecycle, explicit dispatch authority, midnight calendar-only behavior, payment/document closure rules, and B.4.1.3.7-established gameplay.

## COMPLETE — STABLE
### CS2.0B.4.2.x — Compact Email Workflow Polish
Operational workflow Email is now a locked Review → Send experience with conventional email presentation. Schedule Approval, POD Correction, pickup-exception correction, and Invoice Submission were acceptance-tested on device. Required attachments fit the fixed review surface, and formal workflow state changes occur only on explicit SEND.

**Stable checkpoint:** `CS2.0B.4.2.6-STABLE — Compact Email Workflow`

**Protected at this checkpoint:** `CS2.0B.4.2-STABLE` multi-day operations plus the approved locked workflow Email contract and presentation.

## NEXT
### CS2.0B.4.3 — Documents & Rate Confirmation Workflow
Rate Confirmation compare/verify/correction workflow; permanent load packet; Documents becomes archive/review/settlement hub. Corrected-document lifecycle must establish one authoritative current POD so superseded PODs do not continue offering `Request Correction` or leak stale exception details into downstream invoice/settlement views.

### CS2.0B.4.4 — LedgerDesk Banking
Available Cash, Pending Deposits, Accounts Receivable, transaction feed, and dispatcher-fee-only banking.

### CS2.0B.5 — Driver Duty & HOS
Per-driver duty state, HOS across midnight, schedule-vs-legal-hours evaluation, and HOS operational communication.

### CS2.0C.0 — Second Carrier + Second Driver
Add one meaningfully different carrier and second driver to prove generic multi-driver architecture.

### CS2.0C.1 — Multi-Driver Operations Polish
Stress-test simultaneous driver needs; improve readability, alerts, badges, Driver Hub, and Agenda only where play reveals pressure.

### CS2.0C.2 — Carrier Progression & Unlocks
Carrier XP/levels unlock real operating privileges and career resources.

### CS2.0C.3 — Dispatcher Skill Tree
Route Optimization, Driver Management, Carrier Capacity, Operations Intelligence, Negotiation; skills must alter decisions.

### CS2.0C.4 — Carrier Negotiation
Milestone-based career negotiation through CarrierSource/Documents with meaningful tradeoffs.

### Dedicated Visual Pass
Polish closeout, level-ups, reviews, document folders, and LedgerDesk without changing core gameplay.

### Communications Phase 2
Email threading, differentiated driver personality, varied phrasing, exception-driven communications.

### Dynamic Events
Traffic, delays, cancellations, paperwork mismatches, detention, equipment, driver issues, weather, and receiver problems integrated into existing systems.

### Additional Markets
Add markets only when the core simulation is deep; each market must materially differ in geography, traffic, freight, carriers, facilities, and operating style.

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
