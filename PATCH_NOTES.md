# PATCH NOTES

## CS2.0B.4.2.1-STABLE — Seven-Day Agenda Foundation
Base: `CS2.0B.4.1.3.7-STABLE`
Approved: **2026-09-15**
Status: **STABLE SLICE — APPROVED**

### Locked in
- Rolling seven-day Agenda Day View with real calendar dates.
- Fixed seven-across date-tab navigation with no horizontal scrolling.
- Correct tab-row height so weekday and date remain fully visible on iPhone.
- Large selected-date heading retained; redundant compact date subtitle removed.
- Driver workday editing targets the selected date.
- Cross-midnight freight can appear on both applicable Agenda dates while each date renders only its own stop.

### Protected systems
- Operations lifecycle and explicit dispatch/movement authority.
- Pickup/delivery gameplay and POD flow.
- Driver runtime position and route lifecycle.
- CarrierSource/FreightLink booking authority.
- Ledger workflow.

### Next
`CS2.0B.4.2.2-TEST — Midnight Rollover & Overnight Persistence`

---

## CS2.0B.4.2.1.2-TEST — Agenda Date Row Fit Polish
Base: `CS2.0B.4.2.1.1-TEST`
Status: **TEST ONLY — NOT STABLE**

### Fixed
- Increased the fixed seven-day Agenda tab row height so both weekday and calendar date remain fully visible.
- Kept all seven dates on-screen with no horizontal scrolling.
- Removed the redundant compact `SEP ## · DAY VIEW` subtitle beneath the large selected-date heading.

### Protected systems
- No Operations, freight lifecycle, driver runtime, POD, CarrierSource/FreightLink authority, or Ledger behavior changed.


## CS2.0B.4.2.1-TEST — Seven-Day Agenda Foundation
Base: `CS2.0B.4.1.3.7-STABLE`
Status: **TEST ONLY — NOT STABLE**

### Added
- Introduced `DOC_OS_ROADMAP.md` as the canonical roadmap/source of truth.
- Agenda/Scheduler now exposes a rolling seven-day Day View beginning on the live game date.
- Selected Agenda day shows its real calendar date.
- Freight indicators identify dates containing planned/assigned freight.
- Driver workday editing is now visibly tied to the selected date rather than implicitly to Today.

### Fixed / prepared for multi-day
- Cross-midnight loads can appear on both relevant Agenda dates.
- A pickup renders only on its pickup date and a delivery renders only on its delivery date; the opposite-day stop is no longer duplicated onto the selected day timeline.
- Timeline framing uses only stops that actually occur on the selected date.

### Protected systems
- B.4.1.3.7 Operations lifecycle.
- Explicit dispatch and movement rules.
- Pickup/delivery gameplay and POD flow.
- Driver runtime position and route lifecycle.
- CarrierSource/FreightLink booking authority behavior.
- Ledger workflow.

### Not in this slice
- Midnight persistence/overnight route rollover.
- Daily Closeout conversion to business-day reporting.
- Open-load carryover rules at closeout.
- Week View.
- HOS (reserved for B.5).

### Build verification
Source changes were prepared from the stable ZIP. Dependency installation was not available in the build container, so the Vite compile must be verified locally with the Terminal commands supplied with this TEST package before iPhone testing.

## CS2.0B.4.2.1.1-TEST — Agenda Date Navigation Polish
- Revised the seven-day Agenda selector from horizontally scrollable pill buttons to a fixed seven-column tab bar.
- All seven planning days remain visible at once; horizontal scrolling is disabled.
- Active day now uses the established DOC OS tab treatment with a subtle active surface and bottom indicator.
- No Operations lifecycle, load authority, driver runtime, POD, or Ledger behavior changed.
