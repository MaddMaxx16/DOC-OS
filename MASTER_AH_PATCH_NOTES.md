# MASTER AH — Appointment Accountability + Alert Palette

Base: DOC-OS-MASTER-2026-09-06-AG

## Why
A player could accept a load, leave it under FreightLink Active, forget the appointment, and receive no meaningful service consequence. The Load Results screen also hard-coded `ON TIME / YES`, so appointment performance had no gameplay weight.

## Appointment alerts
- Adds a 30-minute upcoming warning.
- Adds a live `WINDOW OPEN` warning with minutes remaining.
- Adds a `LATE` warning after the appointment window closes.
- Covers pickup first, then delivery once pickup is complete.
- Includes queued/accepted operational freight, not only the currently focused load.
- Tapping the alert opens that FreightLink load's detail page; navigation does not mutate simulation state.

## Performance
Load Results now score actual pickup and delivery arrival timestamps.

Per-load XP:
- Load complete: +100
- Pickup on time/early: +15
- Pickup late: -10
- Delivery on time/early: +20
- Delivery late: -20
- POD approved: +15
- Maximum clean load: 150 XP

Day service score and reputation now react to appointment misses. Day close no longer awards separate load XP, preventing duplicate progression.

## Alert colors
- Attention: existing DOC OS purple family.
- Success: charcoal/muted green.
- Problem/late: charcoal/muted red.
- Removed the bright orange/green traffic-light feel from Operations alerts.

## Preserved
- AG multi-load movement ownership guard.
- AF stale POD marker cleanup.
- AE POD atomic closeout.
- Communications ownership contract.
- Freight Market timing/population.
