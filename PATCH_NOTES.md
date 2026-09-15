# CS2.0B.4.1.3.4 — Driver Tab Visual Fix

Base: **CS2.0B.4.1.3.3 — Comms + Workday UI Polish**

## Agenda / Today’s Plan
- Fixes the active driver tab indicator so it no longer renders across the driver name on iPhone.
- Removes the old active-tab pseudo underline and replaces it with a bottom-edge inset indicator.
- Explicitly prevents text decoration on driver labels.

## Intentionally unchanged
- Driver workday authoring.
- Set Lunch / Set Time controls.
- Lunch Ready and lunch decision behavior.
- Driver communications.
- Scheduler planning logic, Operations, itinerary, routing, facility, POD, LedgerDesk, CarrierSource, and save authority.


## CS2.0B.4.1.3.5 — Compact Driver Tabs
- Replaced Agenda's text-strip driver selector with compact visual tabs.
- Active driver uses a blue DOC OS tab treatment.
- Inactive drivers remain neutral/charcoal.
- Removed underline/strike-through active indicator.
- Horizontal scrolling remains available only when multiple driver tabs exceed available width.
- No scheduler or Operations logic changed.

- CS2.0B.4.1.3.6 — Replaced compact pill driver selector with folder/index-style driver tabs in Agenda.

## CS2.0B.4.1.3.7 — Driver Tab Shape Polish
- Replaces the oversized blue driver banner with a shorter raised index/file-divider tab.
- Keeps the active Marcus tab blue and future inactive tabs neutral.
- Removes the detached rectangular treatment and visually connects the tab row to Driver Workday.
- Preserves horizontal scrolling for future multi-driver schedules.
- No scheduler logic, workday logic, lunch behavior, communications behavior, or Operations authority changed.
