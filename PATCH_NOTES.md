# CS2.0B.3 — Carrier Relationship RPG

Base: **CS2.0B.2 — CarrierSource Workspace Overhaul**

## Purpose
Turn the CarrierSource career dashboard into a persistent gameplay system without changing the frozen driver movement, scheduling, facility, POD, or freight lifecycle authorities.

## Changed
- Day Close now creates one persistent carrier performance review per operation day.
- Reviews record:
  - letter grade,
  - loads completed,
  - pickup/delivery service windows met,
  - freight exceptions,
  - relationship before/change/after,
  - Carrier XP earned,
  - account level progression,
  - strike/account-status changes.
- Carrier XP now progresses independently from dispatcher XP.
- Carrier account levels use **300 Carrier XP per level** and begin at Level 1.
- Serious service failure (an F review) can issue a service strike.
- One strike or relationship score below 40 moves an active account to **AT RISK**.
- Two strikes or relationship score below 25 moves an active account to **PROBATION**.
- A clean A-grade review removes one prior service strike, allowing the account to recover from PROBATION -> AT RISK -> ACTIVE over strong operating days.
- CarrierSource My Carriers now surfaces account status, level, last review grade, and strike count.
- Active carrier account pages now include:
  - Carrier XP progress,
  - account status,
  - warning/probation messaging,
  - persistent recent performance history.
- Daily Results now shows carrier performance grade, Carrier XP, account level, account status, and warning/recovery events.
- CarrierSource sends an email when a performance review causes a meaningful career event (level-up, strike, strike recovery, or account-status change).
- Existing B.2/B.1 saves migrate to Level 1 and derive AT RISK/PROBATION from their persisted relationship score/strike state.

## Intentionally unchanged
- Metroline remains the only authored carrier.
- B.3 does **not** terminate the only active carrier; termination remains reserved for a later multi-carrier career phase so the current game cannot dead-end.
- No second carrier or second driver is added.
- No negotiation, carrier unlocks, skill tree, or new opportunity requirements are added.
- Existing relationship-score calculation remains authoritative; B.3 builds progression and consequences on top of it rather than creating a second score.
- No FreightLink booking rule changes.
- No Agenda/scheduler planning changes.
- No driver movement, itinerary, routing, facility lifecycle, pickup/delivery challenge, POD, LedgerDesk, or save authority changes.

## Frozen contract
**CS2.0A.14.1 Operations remains authoritative and frozen.**
**CS2.0B.0.1 Agenda remains approved and frozen.**
**CS2.0B.1 CarrierSource data architecture remains authoritative.**
**CS2.0B.2 CarrierSource workspace remains the presentation foundation.**
B.3 adds career progression at Day Close and reads it back through CarrierSource.
