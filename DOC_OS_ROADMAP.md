# DOC OS ROADMAP

Canonical roadmap introduced with CS2.0B.4.2. This file is the source of truth for phase order and status.

## CURRENT STABLE CHECKPOINT
**CS2.0B.4.2.1-STABLE — Seven-Day Agenda Foundation**

## IN TEST
### CS2.0B.4.2 — Multi-Day Planning & Overnight Operations
- [COMPLETE] Add actual calendar dates to Agenda instead of only “Today.”
- [COMPLETE] Let the player move forward at least 7 days.
- [COMPLETE] Add Day View; Week View may follow after Day View is proven.
- [IN TEST] Driver workday, lunch, availability, and routes become per-driver/per-date. (date-aware workday foundation complete; overnight continuity still pending)
- [ ] FreightLink loads get real pickup and delivery dates.
- [COMPLETE] Support loads that cross midnight in Agenda Day View.
- [ ] Overnight routes remain active when the date changes.
- [COMPLETE] Agenda shows carryover freight on both days, with only the stop belonging to each date rendered on that date.
- [ ] Daily Closeout becomes a business-day report, not a hard world reset.
- [ ] Open loads remain open into the next day.
- [ ] Revenue only posts when the load actually closes.

**Required stable checkpoint:** `CS2.0B.4.2-STABLE — Multi-Day Operations`

### Completed slice
**CS2.0B.4.2.1-STABLE — Seven-Day Agenda Foundation**
- Seven-day fixed date-tab navigation in Agenda/Scheduler.
- Real calendar date displayed for selected day.
- Driver workday editing writes to the selected date.
- Cross-midnight freight appears on both applicable dates without duplicating the opposite day's stop.
- Date-row fit/visual polish approved on iPhone.
- Existing B.4.1.3.7 Operations behavior remains protected.

### Next test slice
**CS2.0B.4.2.2-TEST — Midnight Rollover & Overnight Persistence**
- Preserve active routes and open loads across date rollover.
- Convert day rollover away from world-reset assumptions.
- Preserve driver position, assignment, route state, appointments, and future work across midnight.
- Midnight advances calendar state only; it must not auto-dispatch, teleport, complete, or close freight.

## NEXT
### CS2.0B.4.2.x — Compact Email Workflow Polish
Outgoing email becomes compact and standardized before document-correction workflows are introduced.

### CS2.0B.4.3 — Documents & Rate Confirmation Workflow
Rate Confirmation compare/verify/correction workflow; permanent load packet; Documents becomes archive/review/settlement hub.

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
