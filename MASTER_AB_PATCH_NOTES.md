# MASTER AB — Communications + Character Interaction v1 Foundation

Base: DOC-OS-MASTER-2026-09-06-AA

## Scope
Communications + Character Interaction v1 foundation only, plus the previously parked `DEL` -> `DELIVERY` label cleanup. Freight Market v1 population, refresh timing, mileage ownership, routing, load lifecycle, facility timing, POD workflow, and ledger behavior were not intentionally redesigned.

## Locked Opening Sequence
1. A normal new operation receives Jordan Blake's first email: **A good place to start**.
2. Jordan is a mentor, not a tutorial state machine. His email navigates to CarrierSource but does not unlock gameplay.
3. Metroline application approval creates a formal email from **CarrierSource**.
4. The Metroline Dispatch Operating Agreement is a compact, scannable operating-goals form.
5. The dispatcher must type a signature and press **SIGN & SUBMIT**.
6. Signing activates Metroline through the explicit agreement workflow.
7. A read-only signed agreement is archived in **Documents**.
8. Marcus Reed then creates the first driver conversation with his approved short introduction.

## Metroline Agreement v1
The signed agreement records these operating expectations:
- Book at least 2 loads when market conditions reasonably allow.
- Target $2.00+ per loaded mile.
- Preferred freight: Dry Van / General Freight.
- Preferred region: Northeast.
- Keep deadhead under 75 miles when possible.
- Protect pickup and delivery appointments.
- Keep the driver informed before dispatch.
- Consider next-load positioning.
- Dispatch fee remains 8% of carrier gross on completed dispatched loads.

Carrier priorities are stored as on-time service, rate quality, reasonable deadhead, driver communication, and smart truck positioning.

## Messages v1
- Messages now present a persistent driver thread instead of giving every driver message a generic `VIEW DRIVER` button.
- Marcus messages are short, human communications.
- Marcus introduction persists in save data.
- Pickup arrival, loaded, and delivery-arrival texts remain derived from authoritative simulation timestamps.
- Opening a thread marks communication read; reading never mutates load lifecycle state.

## Driver Briefing Mechanic
Metroline's communication expectation is now gameplay:

`PLAN PICKUP -> CONFIRM PLAN -> DRIVER UPDATE REQUIRED -> SEND CORRECT LOAD -> READY FOR DISPATCH -> EXPLICIT DISPATCH`

Rules:
- A route-ready pickup cannot dispatch until the current load has been correctly briefed to Marcus.
- The Messages reply composer exposes the company's active loads; it does not secretly filter to the correct answer.
- Selecting the correct current Marcus load sends the load number, pickup/delivery appointments, and planned deadhead and records `pickupDriverBriefedGameMinute` on that load.
- Selecting the wrong active load is allowed.
- Wrong-load communication does **not** reassign freight, change trip state, or move Marcus.
- Marcus responds contextually (for example, reminding the player which load he thought he was assigned).
- Sending a load before its route is locked is allowed, but it does not satisfy the briefing requirement.

## Alert Ownership
Operational alerts remain navigation/attention surfaces only.
- Assigned + no pickup plan -> **PICKUP PLAN REQUIRED**.
- Pickup route ready + Marcus not briefed -> **DRIVER UPDATE REQUIRED** and Messages navigation.
- Correct briefing -> **READY FOR DISPATCH**.
- Pickup/delivery arrival alerts use player-facing `LD-#####` references.
- Alerts do not dispatch, check in, plan, or otherwise mutate simulation state.

## Tutorial-Era Cleanup
- The legacy DOC002 paid/reviewed fallback that could create `mentor-tutorial-complete` and force simulation speed to 1 has been disabled.
- Dormant tutorial infrastructure remains parked for a future intentional tutorial pass; Communications v1 does not depend on it.

## Documents
- Added persistent `businessDocuments` save data.
- Signed carrier agreements appear in Documents -> Archive alongside approved PODs.
- Signed agreements are read-only references.

## Persistence
Added save/hydration/reset support for:
- `driverMessages`
- `businessDocuments`

The actual driver-briefed flag lives on the authoritative load record and therefore persists with load state.

## Small AA Cleanup
- FreightLink board label changed from `DEL` to `DELIVERY`.

## Ownership Lock
`simulation event -> communication decision -> presentation/navigation -> explicit owned workflow -> simulation mutation`

Communications report or request attention. They never secretly become a second simulation engine.
