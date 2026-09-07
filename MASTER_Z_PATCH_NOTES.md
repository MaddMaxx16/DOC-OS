# MASTER Z — Freight Market Lock

Base: DOC-OS-MASTER-2026-09-06-Y

## Changes
- Morning board moved from 8:00 AM to 7:00 AM.
- Morning board includes the same full initial freight pool from Master Y.
- Additive refresh waves remain 10:00 AM, 12:00 PM, 2:30 PM, and 5:00 PM.
- Added stable player-facing load numbers in `LD-#####` format.
- Internal `DOC###` IDs remain unchanged for routing, save migration, references, and lifecycle logic.
- Updated player-facing FreightLink list/map, load detail, driver select/planning, operational map, documents/POD, and ledger displays to prefer the load number.
- Existing saves adopt the current seed load number and posting schedule during merge/migration.

## Lock
Freight Market v1 is considered complete after this build. Future work should move to communications (Alerts / Messages / Email) unless a regression is found.
