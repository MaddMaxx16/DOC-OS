# PATCH NOTES — CS2.0B.4.2-STABLE

## Stable promotion
B.4.2 — Multi-Day Planning & Shift End Operations is approved STABLE. The final stable candidate passed on-device smoke testing, and the exact promoted source passed again in the real Git repository. This promotion changes documentation/status only; it introduces no new gameplay behavior beyond the approved candidate.

## Stable contents
- Seven-day, real-date Agenda with full 24-hour Day View.
- Per-date driver workday/lunch planning and cross-midnight continuity.
- Calendar-only midnight rollover with open freight/route/position persistence.
- Shift End Plan staging to Carrier Yard or fixed truck/rest stops.
- Active freight retains authority past Shift End until completion; staging executes afterward.
- Shift End badges: 💤 traveling, 🌙 staged, normal blue presentation on next workday.
- Future scheduled freight cannot steal off-hours/staging movement authority.
- Rolling seven-day FreightLink market with future-date and midnight/early-morning pickups.
- Real pickup/delivery calendar dates retained through booking and operation.
- Daily Closeout remains a business-day report rather than a world reset.
- Revenue/payment eligibility remains tied to load closure/approved POD, not date rollover.

## Protected systems
No intentional changes to frozen Operations/core lifecycle, explicit dispatch flow, Communications scope, HOS, Documents correction workflows, or LedgerDesk banking scope.

## Next roadmap phase
CS2.0B.4.2.x — Compact Email Workflow Polish.
