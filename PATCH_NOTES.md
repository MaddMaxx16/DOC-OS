# PATCH NOTES — CS2.0B.4.4-STABLE

## Stable Promotion — LedgerDesk Banking
- Final B.4.4 regression passed on-device through CS2.0B.4.4.4.1.
- Persistent Operating Account, authoritative CASH, invoice-payment deposits, duplicate-post protection, transaction-to-invoice traceability, save/reload persistence, and the 07:00 End Operations → Day Briefing → Begin Operations loop are accepted.
- No new gameplay behavior is introduced by stable promotion; this package promotes the exact approved cumulative source plus canonical-document status updates.
- Next roadmap phase: CS2.0B.5 — Driver Duty & HOS.

## Banking Polish & Regression
- Payment transaction rows in LedgerDesk now open their linked invoice/receivable record, providing a direct audit trail from bank deposit back to the business record.
- `Deposits Posted` now counts invoice-payment credit deposits explicitly instead of all bank transactions.
- Preserves the accepted B.4.4.3.3 07:00 End Operations / Day Briefing / Begin Operations handoff.
- Preserves $2,500 opening capital, payment timing, save migration, duplicate-deposit protection, authoritative global CASH, and receivable accounting separation.
- No expense/debit system and no major visual redesign added.
- Added polish backlog note for the confusing top-bar DAY # label and oversized Operating Account hero card.

## CS2.0B.4.4.3.3-TEST — Begin Operations Handoff Fix

- Fixed the 07:00 Day Briefing immediately reopening after BEGIN OPERATIONS.
- The briefing trigger now requires the explicit pending overnight-advance target instead of falling back to the previous closeout report after that target has already been consumed.
- BEGIN OPERATIONS now dismisses the briefing once, resumes the live world at 07:00, restores 1× speed, and leaves freight, drivers, routes, banking, and calendar state untouched.

# PATCH NOTES — CS2.0B.4.4.2-TEST

- LedgerDesk now opens Account-first with the DOC OS Operating Account as the hero.
- Added transaction activity sourced from the authoritative banking ledger, including opening capital and carrier payment deposits.
- Existing Revenue & Payments workflow is preserved under Receivables.
- Banking math, payment timing, and duplicate-deposit protection are unchanged from B.4.4.1.
- Status-bar cash remains intentionally unchanged until B.4.4.3.

# PATCH NOTES — CS2.0B.4.4.1-TEST

## Banking Foundation
- Starts the DOC OS Operating Account at **$2,500.00**.
- Adds persistent banking state and transaction records separate from invoice/receivable workflow state.
- When a carrier invoice becomes `PAID`, its dispatch fee posts to the Operating Account as a distinct credit/deposit.
- Deposit IDs are deterministic per load, preventing duplicate money on rerender or save/resume.
- Existing B.4.3 saves migrate safely by reconstructing deposits for already-PAID receivables once.
- Adds a compact available-balance card in LedgerDesk as an acceptance-test surface.
- Removes the dormant direct receivable `pay` shortcut so all bank money uses one posting path.

## Intentionally deferred
- Full Account / Receivables LedgerDesk redesign: B.4.4.2.
- Status-bar cash, payment notifications, Daily Closeout/Briefing and settlement integration: B.4.4.3.
- Expenses/debits and broader money sinks are not added by this foundation patch.

## Protected checkpoint
`CS2.0B.4.3-STABLE — Documents & Rate Confirmation Workflow` remains protected. B.4.4.1 is TEST only.

## CS2.0B.4.4.3-TEST — Payment & Financial Integration
- Status bar CASH now reflects LedgerDesk available balance.
- Startup/Day Briefing Available Cash now reflects LedgerDesk available balance.
- Daily Closeout now records and displays the Operating Account balance alongside Cash Collected and Open Receivables.
- No change to payment timing, invoice lifecycle, deposit reconciliation, or opening capital.


## CS2.0B.4.4.3.1-TEST — Next-Day Briefing Restoration
- Audited End Operations / Daily Closeout against the B.4.2 multi-day contract.
- Daily Closeout remains a business-day report and does not advance the calendar.
- Restored the missing next-day briefing trigger when the live clock naturally reaches the report's next operation start.
- BEGIN OPERATIONS dismisses the briefing at the current live time; it does not teleport the clock, freight, drivers, or routes.
- Added one-per-game-day briefing protection for save/resume safety.


## CS2.0B.4.4.3.2-TEST — End Operations / 7 AM Day Handoff
- Fixed DOC OS dispatcher operating-day start at 7:00 AM.
- Daily Closeout remains a report and never resets/teleports world state.
- CONTINUE TO NEXT OPERATIONS starts a controlled high-speed live-clock overnight advance.
- Midnight, payments, driver movement, freight, and persistent world state continue through their existing authoritative systems.
- Auto-advance pauses at 7:00 AM and presents Day Briefing before player control resumes.
- A closeout between midnight and 7:00 AM targets that same morning's 7:00 AM start.
- TEST only; not promoted to stable.

### CS2.0B.4.4.4.1 — Closeout Session Guard
- Fixed End Operations → VIEW CLOSEOUT silently returning to the map when a previous closeout shared the same calendar date.
- Closeout protection now distinguishes an unconsumed closeout from a new operating session that already passed its 07:00 briefing.
- No banking, overnight movement, or 07:00 handoff rules changed.
