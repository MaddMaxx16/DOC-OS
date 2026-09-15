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
