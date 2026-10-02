# DOC OS — Build Bible

> **Canonical repo state:** P2.4 Experience Rebuild / Performance Architecture  
> **Last reconciled:** 2026-10-02  
> **Known-good onboarding checkpoint:** `checkpoint/perf-onboarding-stable-2026-10-02` from commit `6d9bf13`  
> **Current development branch:** `p2.4-experience-rebuild`  
> **Protected Operations foundation:** CS2.0B.4.2-STABLE + B.4.3-STABLE + B.4.4-STABLE + B.5 HOS contracts

This file is the design and systems source of truth for DOC OS. The current-state sections at the top describe what the game is **now**. Older Master/CS sections below are retained as historical contracts and regression references; an older heading does not override the current-state layer.

## 1. Vision

DOC OS is a realistic dispatcher simulation that looks and behaves like a professional operations system while still playing like a game. The player should learn dispatch thinking by doing the work: evaluating freight, planning drivers, communicating, handling facilities and paperwork, closing business loops, and living with the consequences of operational decisions.

The core loop remains:

**FIND → EVALUATE → ACCEPT → ASSIGN → PLAN → DISPATCH → MANAGE → DELIVER → CLOSE OUT → GET PAID → PROGRESS**

### Experience principles

- **The map is the operational world.** The phone is the dispatcher’s tool, not the world itself.
- **Professional, not sci-fi.** DOC OS should feel like believable dispatch software with game clarity layered on top.
- **Player judgment matters.** The system can provide information and warnings, but should not silently make meaningful dispatcher decisions.
- **Actions have owners.** A UI surface may expose an action, but it must not invent a competing lifecycle authority.
- **Quiet when nothing needs attention.** Notifications and driver communication should represent meaningful events, decisions, or exceptions rather than narrating every state change.
- **Mobile-first.** Every primary workflow must be usable and readable on iPhone without relying on desktop hover behavior or oversized scroll surfaces.
- **Performance is a design requirement.** A visually polished screen that keeps unrelated simulation systems awake is not acceptable.

## 2. Current Canonical State — 2026-10-02

### 2.1 Experience rebuild: title → player creation → First Day boundary

The current clean-new-player path is:

**DOC OS startup → workstation/login → New Dispatcher → name → Character Creator → Metroline employee-ID welcome → START FIRST DAY → Opening your workstation → real Operations map / Jordan welcome → Marcus’s real schedule**

The former Market Selection / Day-One Entry opening route has been retired and removed. The player begins the game as a **Metroline employee in New York**; market selection and CarrierSource application are not part of the rebuilt onboarding path.

**Employee-career start contract:** a clean new operation uses the Metroline employee career model. The player begins as a **Junior Dispatcher** at the Metroline employee workstation. Metroline is already active as the employer, Marcus is already on the Metroline roster, and onboarding must not require a carrier application or signed carrier agreement to create that state.

The current title is a physical workstation/login presentation over the office backdrop. Save slots are represented as workstation users. Entering a workstation physically pushes into the monitor before handoff. Returning from Career Setup must not replay the branded startup splash during the same app runtime.

Character Creator is the approved player-identity system. Its current categories are Skin, Hair, Hair Color, Brows, Eyes, Eye Color, Mouth, Facial Hair, Glasses, Accessories, Headwear, Outfit, and Outfit Color. The avatar is a composited local renderer; appearance work must preserve the established layer order and must not reintroduce live DiceBear network rendering.

**Current onboarding boundary — FD.1/FD.2 IN TEST:** the employee-ID presentation (ENTRY.1.1) is accepted on iPhone. START FIRST DAY is now enabled and performs the deliberate real Operations handoff. A brief opening transition covers dynamic imports and initialization; the operation is saved successfully before the simulator mounts. The real Metroline map opens with Jordan’s three-message welcome. His final action opens Marcus’s actual scheduler. This is the legitimate player flow, with no fake map or testing bypass. Maxx praised the arrival flow on iPhone on October 2 and requested the camera/icon refinement recorded below; revised presentation acceptance and the remaining workspace/battery checks are pending.


### 2.2 Performance architecture — LOCKED

The October 2 performance investigation established a hard architecture rule:

> **Nothing in the Operations simulation runtime may mount or execute until the player actually enters Operations.**

Before this split, the old top-level App mounted the dispatch simulation architecture while the player was still on title/onboarding. Controlled iPhone tests showed severe displayed battery loss even after the avatar and then the entire Character Creator were removed. Bypassing the old App sharply reduced the drain. The rebuilt lightweight startup runtime subsequently completed a five-minute on-device onboarding test from 100% to 100% displayed battery.

Battery percentage is coarse and does not prove zero energy use. The result is treated as a strong regression signal, not a laboratory power measurement.

**Protected implementation boundary:**
- `main.jsx` mounts the lightweight `StartupApp.jsx` for the currently reachable experience.
- Startup/onboarding may own save-slot identity, title presentation, player profile/appearance, and native keyboard presentation.
- Routing, freight-market simulation, HOS, driver movement, facility lifecycle, LedgerDesk reconciliation, day-loop simulation, Operations maps, and dev scenario tooling must remain dormant until Operations is entered.
- `StartupApp` dynamically imports the employee initializer and `App` only on START FIRST DAY, or imports `App` on explicit resume of a saved operation. The initializer never mounts the simulator; the saved game is hydrated by the existing runtime.
- Console Settings → Return to Title flushes the saved operation before unmounting `App`; the lightweight startup then owns the title again. A failed flush keeps Operations mounted and displays the save error.
- Operations CSS must remain outside the startup bundle. `AppShell.css` owns the lightweight shell; `App.css` is Operations-owned.
- Do not solve a future cross-boundary need by statically importing the entire Operations runtime into `StartupApp`.

**Known-good recovery point:** branch `checkpoint/perf-onboarding-stable-2026-10-02`, commit `6d9bf13`.

### 2.3 Loading and bundle ownership

The app now follows staged loading rather than preparing the whole game at launch:

1. **Startup layer:** title, office backdrop, save-slot UI, Career Setup, Character Creator.
2. **Operations layer:** the dispatch runtime and core Operations UI load only when the experience legitimately enters Operations.
3. **Phone layer:** the phone ecosystem loads only when the phone is opened.
4. **Phone-app layer:** secondary apps/workspaces load on demand rather than all being prepared with Phone Home.

The phone split is deliberate. Email, Documents, LedgerDesk, FreightLink, schedulers, POD/RC/invoice workspaces, filing views, Messages, Settings, and other secondary phone surfaces must not be made eager again without a measured reason.

### 2.4 Current Operations systems — protected

The existing Operations runtime remains the protected gameplay foundation while First Day is rebuilt around it.

**Multi-Day Operations — B.4.2-STABLE**
- Agenda uses real calendar dates and full-day views.
- Midnight changes calendar identity but does not independently complete freight, move drivers, reset HOS, or post revenue.
- Open freight, driver position, route progress, and assignments persist across date changes.
- Shift End owns post-work staging.
- FreightLink supports a rolling seven-day market and future-dated freight.

**Compact Email Workflow — B.4.2.6-STABLE**
- Required operational email uses locked **Review → Send**.
- Opening/reviewing an email is not the authoritative business-state transition.
- Workflow-generated recipient, subject, body, and required attachments remain locked where the business process requires them.

**Documents & Rate Confirmation — B.4.3-STABLE**
- Operational documents have lifecycle/version authority.
- Corrected documents create a new current version and preserve superseded history.
- Rate Confirmations require player verification.
- DOC OS may allow the player to approve bad paperwork; future consequences may respond to that decision rather than the UI silently correcting it.

**LedgerDesk Banking — B.4.4-STABLE**
- Operating Account starts with $2,500 opening capital.
- Revenue, receivables, collected accounting totals, and spendable bank cash are distinct concepts.
- Payment completion and bank-deposit posting are related but separate records.
- Global CASH reads the authoritative Operating Account balance.
- End Operations advances the live world toward the next 07:00 operating start rather than using midnight as a reset.

**Driver Duty & HOS — B.5**
- HOS is driver-scoped.
- Scheduled clock-in begins the duty session; a started session cannot have its historical start edited away.
- Driving consumes Drive + Duty; other on-duty activity consumes Duty.
- Ten continuous hours OFF DUTY are required for the modeled 11/14 reset.
- Midnight, Daily Closeout, and the 07:00 dispatcher handoff are not HOS resets.
- FreightLink load evaluation includes HOS as a separate operational signal rather than hiding it inside a generic fit label.

### 2.5 Employee career, communications, and driver identity

Metroline is the player's **employer at career start**, not a carrier the player applies to during First Day. Marcus remains the first authored driver and is already part of Metroline's operational roster when the employee operation is initialized. His physical starting position is the Metroline Yard and his schedule/HOS state comes from the real driver/workday systems.

Marcus must not be "activated" by reading an email or accepting a carrier agreement. His first operational communication occurs when he actually clocks in through the real workday/HOS system. Being rostered at the Yard does not itself make him on duty. Later communication follows legitimate work events such as schedule receipt/change, meaningful movement, delay/exception, or end-of-day sign-off.

Jordan is the player's **Metroline trainer/supervisor** for First Day. Jordan teaches context, expectations, and the reasoning behind the work without becoming a tutorial notification system or narrating every click.

### 2.6 UI / design language

DOC OS should feel like a coherent operating system rather than a collection of unrelated game menus.

**Operations workspace remodel — P2.4-FD.0 implemented, device acceptance pending:** the Live Map remains the main operational canvas. Replace the BOARD launcher with CONSOLE; Console owns the larger work surface for Email, Browser/FreightLink, Scheduler/Agenda, Documents, and LedgerDesk. The smaller Phone owns Contacts and Messages. DRIVERS opens the separate map-level Driver Hub. Both Console and Phone close back to the map. Preserve message history, unread counts, thread navigation, acknowledgements, quick replies, load updates, and notification destinations across the split. Retain camera-fit as a separate map utility.

The presentation split is implemented in the protected Operations runtime. `PhoneOverlay` retains the shared navigation/workflow state and chooses its shell from the active destination: Contacts/Messages/thread use Phone; business apps use Console. This avoids duplicating document, load, email, and driver context. Contacts lists the actual driver roster and opens the existing message thread without creating a clock-in or introduction. Console Settings is a utility outside the five business app tiles; Phone contains only Contacts and Messages. Both surfaces close to the map. Historical references below to business apps living in the phone describe the earlier implementation.

The header now shows Metroline for explicit Metroline employee career metadata (DOC OS for legacy independent careers), location, calendar date, operating day, and game time. Pause/play/speed and operational alerts share a compact second row. Alerts return to the map before opening their target. Console, Drivers, and Phone have separate bottom launchers; the old BOARD camera action is labeled FIT MAP and remains map-specific. Phone is at most 304 px wide and 540 px tall, clamped to the available map viewport; Console uses the larger map work surface. Console badges aggregate existing business/schedule counts; Phone badges count driver messages only. The Cash readout is removed from the header, while LedgerDesk's authoritative balances are unchanged. Employee-era money semantics remain undecided; no employee wage/personal-wallet behavior is introduced.

- Dark, restrained operations surfaces.
- Clear hierarchy before decoration.
- Compact, scannable cards and fixed actions where the workflow requires them.
- Plum/purple is an attention/accent language, not a glow effect applied everywhere.
- Green communicates legitimate positive/ready states; warnings/errors must remain semantically distinct.
- Paperwork should look like paperwork when document identity matters.
- Phone apps may have their own workspace character, but navigation, typography hierarchy, action ownership, and status language should remain recognizably DOC OS.
- Avoid platform-native controls when their presentation breaks the simulation language; use DOC OS controls for core authored workflows.
- Notification badges belong on app icons when unread/actionable state exists.
- The Home control remains stable and predictable.
- Full-screen or heavy visual systems must not continue rendering underneath an opaque surface when they can be suspended.

### 2.7 Character Creator visual contract

The Character Creator is functionally locked unless a real regression or an explicitly planned polish pass reopens it.

- Appearance changes must remain local and responsive.
- Full headwear suppresses scalp hair except intentionally compatible pieces such as the headband.
- Wearable stack is **body → clothes → facial hair → glasses/accessories → headwear**.
- Outfit recoloring must continue to work across supported AVA/Toon assets.
- Glasses retain the approved frame-color control.
- Do not restore removed “big ears,” “big smile,” or rejected appearance candidates simply because donor assets still exist.
- Asset/audition filenames are not proof that a file is dead; dependency-check before deleting them.

### 2.8 Current development objective

**Next objective: accept FD.1/FD.2 arrival and the remodeled workspace on iPhone, then teach the real Marcus workday/FreightLink DOC001 flow. Arrival, initialization, Jordan’s welcome, and scheduler handoff are implemented and browser checked; the full first-day tutorial and protected DOC001 device regression remain pending.**

The intended tutorial arc is:

**Create Player → Metroline employee workstation / Junior Dispatcher → Jordan orientation/training → Marcus already rostered at the Metroline Yard with real schedule/HOS state → first Marcus communication at actual clock-in → FreightLink DOC001 → evaluate driver fit/HOS → written Metroline load approval → accept/assign → plan route → brief Marcus → explicit dispatch to pickup → automatic facility check-in / facility cycle → delivery → POD/closeout → payment**

The employee opening removes carrier-relationship setup, not Metroline's load-approval or driver-briefing requirements. FreightLink acceptance still requires written approval for that load, and route confirmation still requires the correct driver brief followed by explicit dispatch. Facility check-in remains owned by the existing automatic facility lifecycle.

DOC002 may become available later the same operating day after DOC001.

First Day must teach the player through the real systems rather than through a parallel tutorial-only imitation. Tutorial pacing may accelerate waits, but it must not create competing authorities for freight, driver movement, documents, payment, or HOS.

**CarrierSource boundary:** CarrierSource is a later-career system associated with progression beyond the starting Metroline employee role. It must not appear as an application gate, agreement gate, or Marcus-activation gate during First Day.

### 2.8.1 Employee-ID welcome — PRESENTATION ACCEPTED / Operations arrival — FD.1/FD.2 IN TEST

Replace the current First Day placeholder after Character Creator with a Metroline employee-ID welcome. The ID is the centerpiece: Metroline branding, the created player avatar as the employee photo, player name, and **Junior Dispatcher · New York Operations**. Welcome copy establishes that the workstation is ready and Jordan will help the player get started. The primary action is **START FIRST DAY**.

Implemented transition: **Character Creator → employee-ID welcome → START FIRST DAY → brief “Opening your workstation…” transition → operational map → Jordan welcome conversation**. Jordan's compact conversation shows his portrait, name/trainer role, one short message at a time, and Continue; the final welcome action opens Marcus's real schedule. Game time pauses during the authored welcome conversation. This does not redefine ordinary communications or global simulation pause behavior.

Build the welcome presentation first; prepare the Operations workspace before enabling its live-map handoff. The button must ultimately enter the real Metroline employee operation, with Marcus already rostered at the Yard and schedule/HOS initialized through authoritative systems. Do not use a fake map or a permanent Operations bypass. Operations loads only at the deliberate handoff; no simulation runtime is added to the employee-ID screen. The accepted welcome now exposes the implemented START FIRST DAY handoff. The previous disabled-button placeholder is retired. A failed initial save returns to the ID, preserves the identity-only save, and shows the existing save alert. A failed runtime import returns to the originating screen with a retryable error.

**ENTRY.1.1 visual polish — PRESENTATION ACCEPTED:** following iPhone feedback, the ID is slightly narrower (304 px maximum) with tighter clip/header/body/footer spacing and a slightly smaller portrait frame. Text sizes remain readable. The redundant green Profile ready check is removed from the welcome header; the back-to-look control remains. The content is anchored below the header rather than recentered as the card shrinks. Identity save/resume was unchanged by this visual-only revision. Its then-disabled Operations handoff is superseded by FD.1/FD.2. Production build, focused ESLint, and browser workflow/layout checks passed; Maxx accepted the polished presentation on iPhone on October 2 (“this worked perfect we can move on”).

**Implemented identity boundary:** Continue from Character Creator saves the trimmed player name, full appearance, and Metroline employee career metadata in the active slot, with `careerSetupStep: employeeWelcome`. Resume opens the saved ID directly. Back/Edit returns to the existing creator; a subsequent Continue updates the ID and save. A failed save keeps the player in the creator and displays the existing save-failure alert rather than presenting an unsaved ID. New onboarding slots receive explicit employee career metadata without creating roster, freight, clock, or simulation state.

**Validation:** production build and focused ESLint passed; all 165 existing tests passed. Browser checks covered the clean path, avatar consistency, identity save/reload, edit/resave, long names, smaller viewports, simulated safe areas, disabled handoff, and failed-save recovery with no page errors. Physical iPhone presentation is accepted. A fresh five-minute battery check for this ID revision was not reported; the protected earlier onboarding battery checkpoint remains the reference. The full First Day flow is not promoted.

### 2.8.2 Operations workspace validation — P2.4-FD.0

Implemented in the protected runtime; the clean-save startup now reaches this workspace through START FIRST DAY. At the FD.0 checkpoint, the production startup build remained 46 modules with unchanged JS/CSS sizes. FD.1/FD.2 now compiles the deliberately lazy Operations chunks into the production output; those chunks are not loaded by cold startup. A temporary isolated browser harness compiled the actual Operations components and used the authoritative Metroline employee initializer, with QA-only message/email fixtures. No testing bypass or harness is shipped. Browser checks passed for launchers/header, exact Console/Phone app sets, email and schedule destinations, Contacts → existing driver thread, message read history, separate Driver Hub, and responsive Phone bounds at 390×844, 375×812, and 320×568; no page errors. Map tiles were unavailable in the test environment, so cartographic appearance is not accepted by that check. All 165 existing system tests passed. New/simple components pass ESLint; the three older runtime files retain their same pre-existing lint diagnostics, with no additional diagnostics.

The legitimate startup-to-Operations connection and Jordan conversation are now implemented below. Required next: on-device arrival/workspace/navigation/battery checks and protected DOC001 regression before promotion. A full visual pass across opening, creator, ID, map/header, Console, Phone, Driver Hub, and connected workflows follows the completed first-day flow; spacing, type, color, buttons, transitions, and phone/safe-area fit are included.

### 2.8.3 First Day arrival / initialization — FD.1/FD.2 IN TEST

The employee identity save is passed to `prepareFirstDayOperation` only after START FIRST DAY. It requires a completed Metroline employee ID, calls `initializeMetrolineEmployeeOperation`, and creates one real initial operation at Day 1, 6:00 AM, New York. Marcus is at the Metroline Yard, has Metroline-confirmed workdays (initial shift 7 AM–5 PM) and off-duty HOS, and has no manufactured introduction. Carrier application, agreement, and email state are empty. The existing financial baseline is preserved; this slice introduces no employee wage/wallet rules and does not resolve the pending employee money design.

Jordan uses a fixed local portrait from the existing avatar renderer, his name/trainer role, and three short authored messages. The player’s name appears in the welcome. The operational scene is inert during the conversation, the clock processor explicitly blocks advancement, and clock controls are disabled. No timed typing/animation loop is introduced. Welcome progress is saved immediately before advancing; failed saves leave the current message in place. The final action saves the `schedule` boundary and opens Marcus’s existing Driver Scheduler in Console. Game time remains paused for schedule review; Play resumes the existing clock rather than advancing it artificially.

`firstDay` is presentation progress, not a second simulation: `welcome` plus message index → `schedule` → `ready`. Every runtime persistence path retains it. Reload/resume restores the saved welcome message; a saved schedule boundary reopens Marcus’s scheduler. Closing that surface saves `ready`; subsequent resumes open the map without replaying Jordan or reinitializing roster/workday/HOS/position. Legacy saves without first-day metadata do not gain an invented welcome. Returning to title unmounts the Operations owner; normal title/new-character work remains lightweight even after visiting Operations.

Validation: production build passed; all 169 system tests passed, including four new handoff/resume/input-boundary tests. New/changed lightweight components pass ESLint; App and MainGameScreen retain the same 19/25 pre-existing lint diagnostics with none added. Production browser checks passed for cold startup requesting no Operations chunks, failed initial-save recovery, real handoff, welcome pause, failed-message-save recovery, message resume, scheduler handoff/resume, ready/map resume without reseeding, responsive accessible conversation controls, return-to-title unmount of a running operation, and Marcus remaining off duty/silent until the confirmed clock-in, then generating one message and real on-duty HOS. Map tiles were unavailable in the test environment; physical map appearance and device battery remain unverified. Full DOC001 regression and arrival/workspace promotion remain pending iPhone acceptance.

### 2.8.4 Arrival camera and map launcher refinement — IN TEST

Maxx reviewed the first-day flow on iPhone on October 2 and called it beautiful with a nice flow. The recording confirms map tiles render on the phone. Requested refinement: Metroline Yard and Marcus should already be centered on arrival, and the three wide labeled launchers should become computer, person, and phone icons using the familiar phone launcher style.

The real map now chooses Marcus's authoritative saved position once when it mounts for an operation with first-day metadata, falling back to his home base when no runtime position exists. On a new employee opening that position is Metroline Yard, at a closer 11.2 zoom. Later resume follows his actual saved position. Status/time updates do not recenter the camera; existing pan, FIT MAP, driver focus, and route controls retain authority. No driver coordinate or simulation state is changed.

Console, Drivers, and Phone now use 52 px circular icon launchers, placed left, center, and right along the lower map edge. The existing phone glyph is retained; the driver letter becomes a person glyph. Accessible button names, notification badges, driver count, open state, safe-area clearance, and real destinations are retained. Validation: production build and all 169 system tests pass, with no new lint diagnostics in GameMap/MainGameScreen. Browser checks use the actual MapLibre map with a local empty style (no cartographic acceptance): Marcus projects to the map center; all three 52 px launchers are accessible at 390×844, 375×812, and 320×568; the person icon opens the real roster; welcome, save failure, scheduler/resume, runtime exit, and clock-in/HOS checks still pass without page errors. Revised on-device visual acceptance is pending. The full visual pass, battery check, and protected DOC001 regression remain required before promotion.

### 2.8.5 Workstation visual refinement — IN TEST

October 2 follow-up: Maxx said the arrival screen still felt off. The phone screenshot showed a tall header with serif fallback text, overlapping Marcus/yard symbols, and three isolated launchers. Maxx authorized a tighter header, distinct named markers, and one compact bottom dock.

The Operations shell/header now uses an explicit local system sans-serif stack. The identity/time row is 48 px plus the real top safe area, with tighter line spacing and one notch padding budget. The legitimate iPhone notch space remains protected. The welcome backdrop follows the reduced header budget.

A centered Workstation dock groups the computer, person, and familiar phone glyph in a single dark rounded surface, approximately 198 px wide with three 52 px tap targets. Original destination/visibility conditions and badge/count/open behavior remain; the Driver Hub clears the taller dock. The dock stays inside the operational scene so Jordan's welcome keeps it inert and behind the conversation.

Yards carry their actual map-location name (Metroline Yard); driver symbols carry the driver's name (Marcus). When a driver is physically within 0.025 miles of an active home yard, its marker receives a small [34, -28] screen offset so the yard and driver are distinguishable. The offset clears as the driver departs and returns on arrival. It changes no longitude/latitude, route, movement owner, HOS, schedule, or saved operation. It shares the existing reconciliation/render lifecycle and introduces no timer; unchanged offsets do not trigger marker updates.

Validation: production build and 169 system tests pass; GameMap/MainGameScreen retain their existing 11/25 lint diagnostics with none added. Production browser checks pass for named non-overlapping markers, actual MapLibre centering with a local empty style, system-font/compact header, notch/home clearance, centered dock, three mobile-size tap targets, real Driver Hub navigation, existing welcome/save-failure/scheduler/resume/runtime-exit flow, and the confirmed single 7 AM clock-in/HOS message, without page errors. A separate moved-position resume check confirms Marcus centers on his actual saved position, has no yard offset away from the yard, and retains the saved coordinate. These map checks verify symbols/camera rather than cartographic appearance.

The earlier FD.1.1 spread-launcher presentation is superseded by this grouped dock. Revised physical iPhone acceptance, the full visual pass, battery check, and protected DOC001 regression remain pending.

### 2.8.6 Map palette continuity — IN TEST

October 2 phone feedback: Maxx likes the refined workstation layout, but the map feels too dark compared with the beginning screens. Preserve the deep dark palette and improve the transition between those screens.

The Operations map now overrides its inherited extra-dimming filter locally: saturate(.9), brightness(1.14), contrast(.94), replacing the existing .86/.88/.98 values only inside the Operations shell. The existing dark map style remains. A #151c25 canvas backing and .94 canvas opacity introduce a subtle cool charcoal undertone; land, roads, and labels gain definition. DOM markers and the header/dock retain their existing opacity, including the muted off-duty driver state. This is a presentation change to the existing canvas compositor, with no new loop, map style fetch, camera movement, or simulation/save change. Production build and browser checks confirm the scoped canvas filter/backing/opacity and retain the existing off-duty marker opacity through the real startup handoff. The QA map uses an empty local style, so revised real-map color acceptance remains pending on iPhone.

### 2.8.7 Continuous workstation handoff — IN TEST

October 2 phone recording: Maxx reported the employee-ID → workstation transition felt too quick and duplicated. The recording exercises saved-player ENTER/resume, which shares the same `openOperations` path. Startup, runtime hydration, and the lazy scene previously each supplied a separate opening screen, with a 300 ms minimum startup hold.

Startup now owns one persistent entry cover across opening → runtime hydration → actual MainGameScreen mount. App's managed hydration and scene suspense do not render additional opening messages. App and MainGameScreen chunks begin loading only after explicit start/resume; they are resolved together with a 1000 ms minimum readable hold. New employee initialization is still saved successfully before the runtime mounts. MainGameScreen reports its committed scene through a stable readiness callback; the existing cover then fades out over 320 ms and is removed. Reduced motion skips the fade. Save/import failures remove the cover and restore the prior entry boundary; there is no map mount before a successful new-operation save. A slow download keeps the same cover rather than showing a blank intermediate screen. Legacy direct-runtime fallback presentation remains isolated from the managed startup path.

The office/monitor ENTER camera push and initial branded splash remain their existing presentation owners. This slice changes the shared entry loading handoff, not employee initialization, Jordan progress, camera/position, HOS, routing, or saved simulation state. Validation: production build and all 169 system tests pass; StartupApp passes focused lint and App/MainGameScreen retain their existing 19/25 diagnostics with none added. Production browser checks observe one persistent opening DOM node with no duplicate message, a readable minimum hold, actual scene reveal, cold import isolation, save failure recovery, welcome/schedule/ready resume, runtime exit, and real clock-in/HOS timing without page errors. A separate fresh-context check delays MainGameScreen by 2200 ms and verifies one uninterrupted cover; an aborted import restores the employee ID without runtime mount or saved-operation initialization. Maxx accepted the transition on iPhone October 2 (“that's perfect”) and moved on to the schedule destination. This accepts the entry presentation only; remaining full visual/battery/DOC001 promotion checks are unchanged.

### 2.8.8 Jordan's schedule destination — IN TEST

October 2 correction: Jordan's final welcome opened Driver Scheduler with Marcus selected, but that component always initialized its TODAY overview. This was not the actual schedule review promised by the welcome action.

The saved first-day `schedule` boundary now explicitly requests the SCHEDULE tab in Driver Scheduler, preserving Marcus's existing selected driver context. The player sees the real carrier-confirmed workweek and Marcus's 7 AM–5 PM shift. The same destination is restored when resuming at that boundary. Ordinary Console → Scheduler entry retains TODAY as its default; shift-end prompts retain their existing DRIVER override. No shift, freight plan, HOS, time, or save authority changes. Closing Console continues to save the existing `ready` boundary. Validation: production build and all 169 tests pass. DriverSchedulerScreen/MainGameScreen/PhoneOverlay retain the existing 9/25/5 lint diagnostics with none added. Browser checks confirm Jordan opens SCHEDULE, Marcus's real confirmed 7a–5p shifts are visible, schedule-boundary reload/resume restores SCHEDULE, and ordinary Scheduler entry after closing the guided review starts on TODAY, without page errors. Physical schedule-destination acceptance remains pending.

### 2.9 First Day build guardrails

Before coding a First Day slice:
1. Define what the player is learning in that slice.
2. Identify the existing authoritative system/action that performs the work.
3. Design the smallest mobile-first presentation that exposes that action.
4. Keep unrelated Operations systems unloaded until the Operations handoff.
5. Initialize the clean new career as a Metroline employee; Metroline and Marcus must not depend on CarrierSource application/agreement state.
6. Do not resurrect deleted Market Selection / Day-One Entry components or their old CSS.
7. Do not make tutorial screens permanent owners of gameplay state.
8. Test the clean-save path on iPhone.
9. After the Operations handoff exists, run the full DOC001 regression path before promotion.

### 2.10 Development rules — current

1. **One canonical branch/build at a time.**
2. **Checkpoint every verified win.**
3. **Root cause before edit.**
4. **One system per change package whenever practical.**
5. **Logic before polish.**
6. **Design before code for significant interface changes.**
7. **Lock finished systems; do not touch them incidentally.**
8. **A successful build is not the same as a successful on-device regression test.**
9. **Performance regressions are functional regressions.**
10. **No hidden work:** if a screen is not using a heavy subsystem, suspend it, lazy-load it, or do not mount it.
11. **Bug report format:** What I did / What happened / What should happen.
12. **Regression-test before promotion.**
13. **Keep docs current with each change.** Update the Build Bible for approved behavior/design contracts and the Roadmap for order/status as decisions and implementation change. Distinguish approved/planned, implemented, tested, and promoted work; record the active branch/checkpoint so a new chat can resume from repository evidence.

### 2.10.1 Current phone testing / delivery workflow

The active testing workflow is **patch → push to `MaddMaxx16/DOC-OS`, branch `p2.4-experience-rebuild` → automatic Vercel deployment → Maxx refreshes the existing DOC OS link on iPhone**. Normal phone testing requires no terminal commands, local pull, Capacitor sync, or Xcode run. Maxx explicitly retired patched ZIP delivery on October 2: edit the repository directly and let Vercel update the phone experience. Do not create or attach routine patched ZIPs or terminal instructions. Check the pushed commit's Vercel deployment status before reporting it ready to test. Keep native build commands for an explicitly requested native-build workflow; do not present them as the default. A GitHub commit being saved and a Vercel deployment being ready are separate facts. The employee-ID code commit `6043a4782e5c1e18bb3a4aeca33c287171944ce0` has a successful Vercel status.

### 2.11 Change classes

**A — Visual only:** typography, spacing, card density, labels, color, layout. Must not alter gameplay state.

**B — Workflow/UI behavior:** opening panels, navigation, notification destinations, focus, modal behavior. Must not alter lifecycle except through an explicit existing action.

**C — State/Simulation:** trip status, routes, assignment, clock, movement, arrival/check-in, facility lifecycle, HOS, money authority, completion. Requires the relevant full regression path.

**D — New feature:** progression, events, expanded carrier systems, new tutorial mechanics, or other new game capability. Requires stable Class C foundations.

**P — Performance/Architecture:** loading boundaries, rendering ownership, bundle splitting, timer/animation ownership, simulation mounting. Requires functional regression plus an on-device performance/battery sanity check.

### 2.12 Historical contract policy

Sections below preserve the development history that produced the current game. They remain binding where they define an authority or regression rule that has not been explicitly superseded above.

When a historical section conflicts with the current canonical state:
1. the **current canonical state** wins;
2. the newer stable system contract wins over an older IN TEST note;
3. implementation must be checked before assuming an old parking-lot or “future phase” statement is still true.

---

## 3. Core Load Lifecycle — Locked Contract
AVAILABLE
-> ACCEPTED / ASSIGNED
-> PICKUP PLAN READY
-> EN ROUTE TO PICKUP
-> AT / WAITING AT PICKUP
-> CHECKED IN PICKUP
-> LOADING
-> LOADED
-> DELIVERY PLAN READY
-> EN ROUTE TO DELIVERY
-> AT DELIVERY
-> CHECKED IN DELIVERY
-> UNLOADING
-> AWAITING POD
-> DELIVERED / COMPLETED

### Two-step dispatch contract
Pickup and delivery use the same player rhythm:
PLAN -> CONFIRM PLAN -> return to map -> Operations action -> vehicle moves.

Planning never dispatches automatically.

## 4. Marcus Visibility Contract
Marcus must remain visible/locatable during every active-load state unless a deliberately designed facility-state presentation replaces his direct marker interaction.

A UI action may focus Marcus or a facility, but must never corrupt assignment, active load, trip status, runtime position, or route state.

## 5. Operations Notification Contract
An Operations alert is a doorway to an already-valid game action. It must not invent a new state transition.

Examples:
- Pickup route ready -> START TRIP
- Pickup arrival -> CHECK IN
- Loaded -> PLAN DELIVERY
- Delivery route ready -> DISPATCH
- Delivery arrival -> CHECK IN

## 6. Day 1 Acceptance Test — Marcus / DOC001
A build is not considered stable unless this full path passes from a clean save.

[ ] Start Day 1 / New York / Metroline state is correct.
[ ] FreightLink lists DOC001 correctly.
[ ] Open DOC001 details.
[ ] Accept load.
[ ] Assign Marcus.
[ ] Marcus appears on map as ASSIGNED.
[ ] PLAN TRIP opens pickup planning.
[ ] CONFIRM PLAN stores route but Marcus does NOT move.
[ ] Return to map: Marcus is still visible and assigned.
[ ] Operations shows START TRIP.
[ ] START TRIP dispatches Marcus exactly once.
[ ] Marcus remains visible en route.
[ ] Arrival at pickup changes to facility/check-in state without losing Marcus/load state.
[ ] CHECK IN works.
[ ] Loading completes.
[ ] Loaded message/Operations state appears.
[ ] PLAN DELIVERY opens delivery planning.
[ ] CONFIRM PLAN stores route but Marcus does NOT move.
[ ] Return to map: Marcus remains visible/locatable and load remains active.
[ ] Operations shows DISPATCH.
[ ] DISPATCH sends Marcus exactly once.
[ ] Marcus remains visible en route to delivery.
[ ] Arrival at delivery exposes delivery facility CHECK IN.
[ ] Fast-forward drops to 1x on informational arrival; DOCK READY pauses when a dispatcher action is required.
[ ] CHECK IN delivery works.
[ ] Unloading progresses.
[ ] POD/closeout path remains reachable.
[ ] Completion does not leave stale active-trip state.

## 7. Regression Smoke Test
Run after EVERY logic patch:
ACCEPT -> ASSIGN -> PLAN PICKUP -> START TRIP -> PICKUP -> LOAD -> PLAN DELIVERY -> DISPATCH -> DELIVERY -> POD/COMPLETE

If any previously passing step fails, the patch is rejected rather than patched again on top.

## 8. Development Rules
1. ONE MASTER BUILD. New work always starts from the latest verified master.
2. NEVER patch a patch. Apply a candidate change to a copy of Master, test it, then promote the whole result to the next Master.
3. ONE SYSTEM PER CHANGE PACKAGE. Example: load lifecycle, UI density, messaging, or progression—not several unrelated systems.
4. LOGIC BEFORE POLISH. Broken lifecycle blocks feature work.
5. DESIGN BEFORE CODE for significant interface changes.
6. LOCK FINISHED SYSTEMS. Do not touch them incidentally.
7. BUG REPORT FORMAT: What I did / What happened / What should happen.
8. ROOT CAUSE BEFORE EDIT. Trace event -> state transition -> derived UI -> map/runtime effect.
9. REGRESSION TEST BEFORE PROMOTION.
10. CHECKPOINT EVERY WIN. Keep a last-known-good master.

## 9. Change Classes
### A — Visual only
Typography, spacing, card density, labels, color, layout. Must not alter gameplay state.

### B — Workflow/UI behavior
Opening panels, notification destinations, focus, modal behavior. Must not alter lifecycle except via an explicit existing action.

### C — State/Simulation
Trip status, route assignment, driver assignment, clock, runtime movement, arrival/check-in, loading/unloading, completion. Requires full regression test.

### D — New feature
Progression, negotiation expansion, events, skill system, new carrier systems. Requires stable Class C baseline first.

## 10. Parking Lot — Do Not Build Until Core Is Stable
- Deeper XP/progression feedback
- Skill tree implementation
- Dynamic dispatcher events/choices
- Expanded negotiation
- Driver Duty / HOS management (driver start time, lunch/break window, end-of-day target, legal duty/driving constraints)
- Carrier growth/reputation
- Multiple-driver pressure
- More markets

These are not rejected. They are protected from being built on unstable foundations.

## 11. Next Engineering Objective
Do not redesign DOC OS.
Do not add features.

Next objective: make the Day 1 acceptance test pass cleanly on this master and identify any lifecycle state that has more than one competing transition owner.

Only after Day 1 is stable do we resume the "game feel" layer: decisions, consequences, XP feedback, progression, and satisfying completion.

## Communications Contract — Master B

### Messages
- Messages represent people communicating with the dispatcher.
- A message's sender identity and historical text are stable once the event exists.
- Driver messages resolve against the driver who handled the load (`assignedDriverId` or `completedDriverId`).
- Marcus must display as **Marcus Reed**, never as a generic **Driver** fallback when his load lifecycle advances.
- A message may offer a shortcut into a still-required workflow (for example, **PLAN DELIVERY**), but it does not silently advance trip state.

### Alerts / Operations Bar
- Alerts represent DOC OS surfacing operational attention, not conversation.
- The Operations Bar is a notification/navigation surface only.
- Tapping an alert may focus Marcus, pickup, delivery, Documents, LedgerDesk, or results.
- Tapping an alert must **never** dispatch a driver, send a driver to pickup, check in, complete a load, or otherwise mutate trip state.

### Ownership Rule
`game event -> communication presentation -> navigation -> explicit player action -> game-state mutation`

Messages and Alerts may both describe the same underlying event. That redundancy is intentional; they have different jobs.

## Accent Language — Master E
- Smoked plum (#756D80) is the standard interactive accent for selected, active, focused, and primary-action states.
- Soft plum-gray (#A49BAE) is used for accent copy and icons.
- Bright blue is not used by the live gameplay UI. The future tutorial layer will receive its own dedicated palette later.
- Semantic status colors remain independent: green = success/clear, orange = attention/warning, red = danger/error.

## FreightLink v1 — Cohesion Contract (Master H)
FreightLink owns freight discovery and load lifecycle visibility. Home filters are AVAILABLE / ACTIVE / HISTORY. AVAILABLE supports LIST / MAP. Map selection is only an alternate discovery path: selecting a pickup pin previews that load's pickup-to-delivery lane, and VIEW LOAD opens the same Load Detail screen used by List. There is no alternate acceptance path and no automatic dispatch action from FreightLink. After acceptance, driver selection/assignment remains explicit. After assignment, PLAN TRIP remains explicit. Confirming a plan returns operational dispatch ownership to the DOC OS map/driver workflow. Multi-load Build Route is deferred until simultaneous-load gameplay is intentionally implemented.

## FreightLink Geography Ownership — MASTER I
- FreightLink LIST lives in the phone/browser.
- FreightLink MAP uses the main DOC OS map; do not create a second embedded map for market browsing.
- Selecting an available pickup pin previews only that load's full pickup-to-delivery lane.
- VIEW LOAD returns to the normal FreightLink detail page; List and Map converge on one detail/acceptance flow.
- FreightLink map browsing never accepts, assigns, plans, or dispatches automatically.
- Phone owns information/decisions; the main map owns geography/spatial planning.

### FreightLink map ownership safety
When FreightLink Browse Mode hands a load back to the phone via VIEW LOAD, all browse-only map selection state must be cleared before load lifecycle mutations such as ACCEPT. The phone owns the selected load after handoff; the main map must not retain a stale AVAILABLE-load reference.

## FreightLink lifecycle cohesion — Master L
- FreightLink has one home layout for every load and tutorial phase: AVAILABLE / ACTIVE / HISTORY are permanent shell controls.
- List/Map are alternate discovery views under AVAILABLE; they do not create alternate lifecycle flows.
- FreightLink main-map browse mode reuses the same pickup/delivery marker visual language as the operational map. Context may add a load label or selection ring, but never a second facility-icon design.

## FreightLink UI Lock — Master N
- Driver selection pages use `Driver Select` as the primary page title; the target load ID belongs in compact contextual text, not the primary title.
- Lightweight driver map cards auto-close after a short delay to keep the map unobstructed.

## Master O FreightLink final-pass rules
- FreightLink lifecycle tabs remain visible; secondary sort controls collapse into a caret dropdown.
- FreightLink map browse never displays a straight-line placeholder; only completed road-route geometry is rendered.
- Selected browse loads always provide BACK to all pins without exiting FreightLink.

## Freight Market Time Contract — Master P
- An AVAILABLE load remains actionable through the end of its pickup window.
- Once the pickup window end passes without acceptance, the load becomes EXPIRED.
- EXPIRED freight leaves Available/market-map browsing and moves to History.
- Driver physical location persists across load closeout. The previous delivery facility becomes the origin for the next deadhead unless another active/queued operational state explicitly defines the origin.

### Travel Camera Ownership
- Explicit driver/facility focus may temporarily zoom the map to the selected object.
- Starting an en-route leg transfers camera ownership back to the operation: fit the complete active route once when the trip is dispatched.
- Do not continuously force-follow the driver after that fit; player pan/zoom takes precedence until another explicit focus or dispatch event.

## Dynamic Driver Positioning + Freight Market Refresh v1
- A driver without an active/queued load should not remain frozen at the last receiver forever.
- After a short post-delivery dwell, the driver may reposition toward a yard, staging point, fuel/rest stop, or similar operating location.
- Runtime position is authoritative for future deadhead/fit calculations.
- A new assignment immediately cancels idle-positioning ownership.
- FreightLink Day 2+ is a changing market, not a static all-day catalog.
- Loads post in waves; expired unaccepted loads leave Available and enter History as EXPIRED.
- Market waves should vary facility combinations so zero-deadhead opportunities feel rewarding rather than guaranteed.


### Camera ownership rule (Master T)
- Driver owns camera during assigned/planned/en-route/loaded/route-ready states.
- Pickup/delivery facilities own camera only when Marcus is physically in the corresponding facility interaction state.
- Stale facility popups must not survive into driver-owned states.

## Unified Gameplay Flow Contract — Master U
- Tutorial presentation/mechanics are dormant in the live build until a later tutorial-specific pass.
- Emails are informational/contextual; they never unlock or block freight, apps, or operational actions.
- Freight availability is determined by market posting time, operation day, and lifecycle status only.
- DOC001, DOC002, and all subsequent loads follow the same FreightLink lifecycle contract.
- A previous load never has to be completed merely to make the next market load visible.

### Map Resume Contract (Master V)
The active route and its operational markers are both derived UI. On app resume/visibility restoration, DOC OS must rebuild DOM-backed driver/facility markers from current game state so a restored MapLibre route layer can never appear without its corresponding markers.

### Map Resume Contract — Master W
- Route layers and DOM markers are both derived UI, but they can rehydrate on different timelines in WKWebView.
- Marcus, pickup, and delivery markers must be rebuilt from current game state whenever the game becomes visible again.
- Marker recreation must not depend on MapLibre style readiness.
- Resume recovery may retry after layout settles; missing markers after re-entry are never treated as valid saved state.

## Normal Market Contract (Master X)
Freight visibility is controlled only by market posting time and load lifecycle state. Tutorial emails/messages/alerts may inform the player but never unlock freight, End Day, or operation transitions. DOC001 and DOC002 use the same FreightLink lifecycle as the normal market pool.

## Freight Market Refresh V2
The market opens with a full morning board at 7:00 AM. Later waves add freight at 10:00 AM, 12:00 PM, 2:30 PM, and 5:00 PM. Existing valid freight remains until accepted or expired. Communications never gate market visibility.

## Freight Market Final Contract — Master Z
- The morning freight board posts at 7:00 AM, before the 8:00 AM operating day begins.
- Later market refreshes are additive at 10:00 AM, 12:00 PM, 2:30 PM, and 5:00 PM.
- Existing valid freight stays available until accepted or expired; refreshes do not wipe the board.
- Player-facing load references use realistic `LD-#####` numbers. Internal `DOC###` IDs remain stable implementation/save keys and should not be shown as the normal load reference in gameplay UI.
- Communications may report market events but never unlock or gate freight.
- Freight Market v1 is locked after Master Z; further changes should be bug fixes or an intentional future market-system expansion.

## Freight Market Date + Mileage Ownership Contract — Master AA
- Every market load exposes an explicit pickup calendar date and delivery calendar date in player-facing FreightLink surfaces. Same-day freight still shows both dates; overnight/future-day freight must never rely on an implied "today".
- `listedMiles` on FreightLink represents the load's pickup-to-delivery mileage only.
- FreightLink Available must not infer or display Marcus/current-driver deadhead, projected arrival, or fit before a driver is evaluated.
- Driver-specific deadhead and fit are owned by Driver Select / Driver Fit, where the selected driver's authoritative runtime/projected position can be used.
- Market-level sorting may use freight facts such as pickup time, rate, and load miles, but not an unselected driver's position.
- Master Z market population/timing rules remain locked: full board at 7:00 AM with additive 10:00 AM, 12:00 PM, 2:30 PM, and 5:00 PM refreshes.

## Communications + Character Interaction v1 — Master AB

### Channel Ownership
- **Alert** = operational attention. Use it when the player needs to do something or inspect an unresolved operating condition.
- **Message** = a person talking to the dispatcher. Messages may be operational, reactive, or personality-driven and do not require an action button.
- **Email** = formal business communication, documentation, or mentor content.
- Silence is a valid communication decision. Do not mirror every lifecycle state across every channel.

### Simulation Source-of-Truth Rule
`simulation event -> communication decision -> presentation/navigation -> explicit owned workflow -> simulation mutation`

- Communications report authoritative simulation state.
- Opening/reading an alert, message, or email never creates an arrival, check-in, loading event, dispatch, delivery, payment, or market state.
- Alerts may navigate to the relevant driver/facility/app.
- Formal agreement acceptance may change the carrier relationship only through the explicit signed agreement workflow.

### Jordan Blake
- Jordan is the player's Metroline trainer/supervisor, not the tutorial notification system.
- **Superseded onboarding note:** the earlier design in which Jordan's first email pointed the player toward CarrierSource is no longer part of First Day.
- Jordan appears at meaningful milestones, teachable moments, mistakes worth explaining, progression moments, and occasional strategic moments—not after every action.
- Reading a Jordan email or message never creates carrier status, activates Marcus, or silently advances normal gameplay.

### CarrierSource + Metroline Agreement — LATER CAREER / HISTORICAL CONTRACT
- **Superseded for First Day:** the player does not apply to Metroline or sign a Metroline carrier agreement to begin the game.
- CarrierSource remains available for a later career stage when the player progresses beyond the starting Metroline employee role.
- When a future independent-career carrier application/agreement workflow is used, CarrierSource owns the formal response and the explicit signed agreement remains the authoritative relationship action.
- Signed carrier agreements may be archived in Documents and remain read-only after acceptance.
- Carrier goals and individual driver preferences remain separate concepts.

### Marcus Reed Message Style
- Marcus is a professional truck driver, not a status object.
- Text messages should be short and natural; personality comes from phrasing and reactions, not long exposition.
- The first Marcus message establishes regional preference, reasonable deadhead, communication expectations, and current readiness.
- Marcus lifecycle texts may report pickup arrival, loaded status, and delivery arrival after the simulation has already produced those events.

### Driver Briefing Contract
Metroline requires the driver to be informed before dispatch.

Pickup flow:
`ASSIGN -> PLAN -> CONFIRM PLAN -> BRIEF DRIVER -> EXPLICIT PICKUP DISPATCH`

- Route confirmation does not dispatch Marcus.
- A route-ready load is **DRIVER UPDATE REQUIRED** until Marcus receives the correct load details.
- Messages exposes active company loads so the player must select the intended load.
- The UI must not silently remove wrong choices merely to prevent mistakes.
- Sending the wrong load is a communication mistake only. It never changes assignment or movement.
- Marcus may question/correct conflicting information.
- Only the correct current route-ready Marcus load records the pickup briefing requirement as satisfied.
- Once correctly briefed, the operational state becomes **READY FOR DISPATCH** and the player must still explicitly dispatch Marcus.

### Communication Persistence
- Persist character/business message records that need historical continuity.
- Derived lifecycle messages must use stable deterministic event IDs and authoritative simulation timestamps.
- Read state persists.
- Signed business documents persist.
- Player-facing load references in communications use `LD-#####`; internal `DOC###` IDs remain implementation keys.

### Documents Expansion
Documents is the business record center, not POD-only storage. It may contain signed carrier agreements, PODs, rate confirmations, invoices, and other future records. Master AB begins this expansion with signed carrier agreements while preserving the existing POD workflow.


## Metroline Agreement UX — Master AC (LATER CAREER / HISTORICAL)
> This retained agreement presentation is not part of First Day. Its historical carrier-activation/Marcus-introduction behavior does not apply to the Metroline employee opening; sections 2.1, 2.5, and 2.8 govern that opening.

- Master AC is a presentation/input hardening pass built from Master AB.
- The Metroline agreement uses a compact two-column information layout: **Shift goals** and **Operating expectations**.
- Carrier priorities remain visible in a compact full-width summary below the two columns.
- Agreement acceptance no longer requests a typed player/dispatcher name. **SIGN & SUBMIT** is the electronic-signature action and records the signer as `Authorized Dispatcher` with the authoritative in-game timestamp.
- Removing the text input prevents the agreement flow from invoking the iOS keyboard/viewport zoom behavior.
- The read-only agreement archived in Documents mirrors the same two-column content structure.
- Carrier activation, Marcus introduction, Documents archival, driver briefing, Freight Market, and simulation-state ownership are unchanged from Master AB.

## Messages History + Driver Queue Ownership — Master AD

### Message History Readability
- Marcus texts remain short and natural; introductions should use multiple short bubbles rather than one paragraph-sized message.
- Operational arrival messages must remain understandable in history. Pickup/delivery arrival texts include the actual facility name.
- Dispatcher load briefs use a compact multi-line structure: load reference, pickup, delivery, and deadhead when available.
- The active-load selector in Messages is a DOC OS-owned picker, not the native iOS `<select>` presentation.
- The player can still intentionally choose any active company load; the custom picker improves presentation without filtering away mistakes.

### Driver Queue Ownership
`QUEUED` means waiting for future ownership. It is never an active operational load.

- `getDriverActiveLoad()` returns only a non-queued, non-terminal assigned load; if only queued loads exist it returns `null`.
- GameMap never treats `queued` as an operationally active state.
- A queued load becomes active only through explicit queue promotion after the prior load closes.
- During the closeout handoff, the driver's authoritative physical position remains the previous load's delivery location.
- The promoted load begins in `assigned` state and must follow the normal pickup sequence from that runtime position: plan -> brief -> explicit dispatch -> pickup.
- A queued load must never contribute route/facility ownership early, preventing delivery-first jumps or mixed old/new load context.

## POD Approval + Driver Handoff — Master AE
POD approval is an explicit document/workflow action and may close the delivered load, but it must not leave load completion dependent on a later communication or UI event.

Normal closeout contract:
`AWAITING POD -> APPROVE POD -> COMPLETED -> PROMOTE NEXT QUEUED LOAD (if any)`

- The approval action records the POD approval and load completion together.
- Marcus remains physically at the completed load's receiver during closeout.
- If another load is queued, queue promotion happens in the same workflow handoff and the next load becomes `assigned`.
- The promoted load follows the normal pickup contract: `PLAN -> BRIEF DRIVER -> EXPLICIT DISPATCH -> EN ROUTE TO PICKUP`.
- POD approval never auto-dispatches Marcus.
- After approval, the phone returns control to the main operational map and refocuses Marcus so the next required action/alert is immediately visible.
- The old `delivered`-state closeout effect remains only as a recovery path for legacy saves/dev states.
- The current checkbox-based POD verification presentation is not considered final gameplay and will be redesigned separately; Master AE changes closeout ownership only.

## MASTER AF — POD closeout marker rule
When POD approval closes a load and Marcus has no next active load, the map marker must immediately clear any load-specific attention/status pill. Marker DOM state must never outlive the active load that produced it.

## Master AG queue handoff guard
Only `getDriverActiveLoad()` may own driver movement. Promoting a queued load resets travel/delivery/POD state; Marcus remains physically at the prior receiver until explicitly dispatched to the next pickup.

## Appointment Accountability — Master AH
Appointments are gameplay commitments, not passive FreightLink metadata.

Operational alert contract:
- 30 minutes before an unserved pickup/delivery window: surface an approaching appointment alert.
- During the appointment window: surface a purple attention alert with time remaining.
- After the window closes without arrival: surface a charcoal-red late alert with minutes late.
- Appointment alerts navigate to the relevant load details only; they never plan, dispatch, check in, or advance the load.
- Queued/accepted work remains eligible for appointment alerts so freight cannot disappear from the player's awareness simply because it is not the currently open FreightLink card.

Performance contract:
- Pickup performance is scored from `pickupArrivalGameMinute` against the pickup window.
- Delivery performance is scored from `deliveryArrivalGameMinute` against the delivery window.
- Early and in-window arrivals count as on time.
- Late arrivals lose the corresponding on-time bonus and apply an XP penalty.
- Load Results show pickup and delivery performance separately; the former hard-coded `ON TIME: YES` value is prohibited.
- Day-level service score and reputation reflect appointment misses as well as document completion.

Alert visual language:
- Purple is the primary DOC OS attention color.
- Success green and problem red are muted/charcoal-tinted rather than bright traffic-light colors.
- Color supports urgency; text must always communicate the actual operational condition.

## Facility Operations — Loading Challenge V1 (Master AI)
Pickup check-in no longer automatically starts and completes loading. Once checked in, the pickup facility exposes BEGIN LOADING. The challenge pauses the simulation clock and gives the player 24 real seconds to account for eight pallets. Successful pallets are persisted in shipment state. Unhandled pallets become missing freight and each adds five game minutes of handling delay. Confirming the result advances the game clock by the standard pickup service time plus earned delay and moves the load to LOADED. This system is the authoritative seed for later damage, unloading, and POD exception gameplay.

## Master AJ — Loading Challenge Interaction Contract

Loading Challenge V1 uses drag-and-drop as the primary touch/mouse interaction. A staged pallet must be dragged into an open trailer slot to count as loaded. Invalid drops do not mutate shipment state. Trailer slots are explicit and preserve the player's chosen placement. The challenge's timer and AI shipment-result contract remain unchanged.


## MASTER AK — 2026-09-07
- Fixed iOS Loading Challenge drag coordinates by portaling the floating pallet to `document.body`.
- Added pointer capture and touch visual hardening.
- AJ gameplay rules remain unchanged.

### Master AL — Loading Challenge iOS touch-drag fix
The loading challenge must use native touch events on iOS rather than Pointer Events with pointer capture. The drag ghost remains portaled to `document.body`; touch movement is tracked by touch identifier; release location is resolved with `document.elementFromPoint()` against trailer slots. Mouse drag remains available for desktop testing. Do not reintroduce `setPointerCapture()` into this minigame without device verification.

### Master AM — Facility Loading render hotfix
Master AM restores the `loadedIds` memo accidentally dropped during the AL native-touch rewrite. Loading Challenge effects and handlers depend on this derived list, so its absence caused an immediate runtime ReferenceError/white screen when the loading modal mounted. AM is intentionally surgical and preserves AL's native touch drag implementation and all AI/AJ gameplay rules.

## Loading Puzzle Contract — Master AN
The pickup loading challenge is a short player-skill puzzle. Heavy freight belongs at the front of the trailer, standard freight in the center, and fragile freight at the rear. A full but incorrectly arranged trailer must remain playable until the timer expires so the player can correct mistakes. Freight not loaded at timeout becomes missing; freight left in an invalid zone becomes damaged. These results persist in shipment state for later delivery and POD systems.

## Loading Challenge entry contract — Master AO
The loading puzzle begins with an instructional beat before live play. On the first loading challenge of the app session, show HEAVY -> FRONT, STANDARD -> CENTER, FRAGILE -> REAR for approximately two seconds and fade into the board. Later challenges use a short LOADING CHALLENGE sting. The dock timer must never run and freight must not be draggable until the entry overlay has completely cleared.


## Master AP — Automated Pickup Facility Cycle
Pickup Operations V1 complete: Marcus automatically checks in, facility dock waiting is appointment-aware, and DOC OS alerts the player only when loading is ready. AO loading puzzle remains unchanged.

## Master AP1 — Pickup Dock-Wait Pacing Rule
Routine pickup waiting must create background operational texture, not dead gameplay. Early arrivals use a 15-minute facility wait, in-window arrivals use 12 minutes, and late arrivals use 35 minutes. An in-progress saved wait is normalized to the current timing contract when hydrated. The map status pill displays remaining dock ETA rather than elapsed waiting time.

## Delivery Facility Arrival Contract — Master AQ
Routine receiver arrival is driver-owned, not dispatcher-owned.

Normal delivery facility lifecycle:
`ARRIVE AT DELIVERY -> CHECKING IN -> WAITING FOR DOCK -> DOCK READY -> BEGIN UNLOADING`

- Marcus automatically checks in with the receiver on arrival; there is no manual dispatcher CHECK IN action.
- Delivery check-in consumes five game minutes before the receiver wait begins.
- Receiver dock wait is appointment-aware: early arrival = 12 game minutes, in-window arrival = 10 game minutes, late arrival = 30 game minutes.
- While Marcus is checking in or waiting, the player may continue dispatcher work. The facility wait must not demand continuous attention.
- Marcus communicates arrival and completion of check-in through Messages. Messages never own or mutate the facility lifecycle.
- DOC OS surfaces `DOCK READY` only when the receiver is ready and the player has an actionable next step.
- The dock-ready alert navigates to the delivery facility but does not start unloading.
- `BEGIN UNLOADING` remains an explicit facility action. In AQ it starts the existing temporary timed unload behavior; a dedicated unloading/verification gameplay system will replace that placeholder later.
- Pickup and delivery share an interaction language, but their later gameplay consequences may differ.

## Master AR — Delivery Gameplay Identity
Delivery Operations V1 uses unload sequencing / space clearing as its core physical minigame. The trailer layout is inherited from pickup. Rear-most freight is accessible; blocked receiver-requested pallets require temporary staging. Delivery gameplay is therefore extraction/order planning rather than a second loading puzzle or a receiver classification quiz.

## Unload Sequencing Entry Contract — Master AR1
The first unload sequencing challenge in an app session must teach the loop before live play: receiver-requested freight is delivered in order; only rear-accessible trailer freight can move; two staging spaces clear blockers; requested freight goes to the receiver. The dock timer and interactions remain paused until the player dismisses the first-run briefing. Accessible pallets and staging spaces receive temporary first-move emphasis. Later unload challenges use a short title sting and enter live play automatically. AR gameplay rules and freight truth are unchanged.

## Delivery Unload Planning — AR2
Unload Sequencing exposes a short planning window: the current receiver request plus the next two projected requests. The purpose is to make staging a deliberate logistics decision. The player should use staging as temporary parking to clear blockers while considering which freight will be needed next. The planning window updates from the current trailer/staging state and does not alter the underlying freight truth or delivery lifecycle.

## Freight Condition Continuity + POD Handoff — Master AS
Freight condition is established by the physical pickup/loading workflow and must remain continuous through delivery and closeout.

Authoritative condition contract:
`PICKUP LOADING -> SHIPMENT STATE -> DELIVERY UNLOAD -> POD -> CLOSEOUT`

- `shipment.expectedPallets`, `shipment.loadedPallets`, `shipment.missingPallets`, `shipment.damagedPallets`, and `shipment.palletManifest` are the source of truth after pickup loading completes.
- Delivery unloading may report and display that condition, but it must not invent a new clean/damaged/short state that contradicts pickup shipment truth.
- A clean shipment produces a clean POD (`damage: None`) when all loaded freight arrives.
- Pickup-created damage remains damage at delivery and must be represented as a POD damage notation.
- Pickup-created shortages remain reflected in the POD piece count (`received / expected`).
- POD verification means confirming that the paperwork accurately reflects the shipment, not requiring the shipment itself to be exception-free.
- Therefore, a documented count mismatch or damage notation is a valid, verifiable POD condition and must not permanently block approval/closeout.
- Missing POD information remains invalid and requires review.
- AS does not add new random delivery damage, claims logic, OS&D workflows, or receiver disputes. Those are future exception-system layers.

## State Integrity & Resume Safety — Master AT
Owned player workflows must be temporally atomic from the simulation's perspective.

Modal timing contract:
- Trip planning, delivery planning, loading/unloading challenges, and end-of-day decisions pause the authoritative game clock while the player is making the owned decision.
- Entering one of these workflows records whether the player was already paused, forces simulation speed back to 1x, and pauses time.
- Leaving the workflow restores the exact pre-modal pause state.
- Phone browsing remains part of the live operation and does not pause time.

Delivery-unload ownership contract:
- `unloading-delivery` is not a passive timer state. Unload Sequencing owns completion.
- `App.jsx` must never auto-transition `unloading-delivery` to `awaiting-pod` and must never fabricate a default clean POD.
- Only `completeUnloadSequence()` may create delivery facility results/POD from the authoritative pickup shipment state.

Resume contract:
- If hydration finds an assigned load in `unloading-delivery`, reopen the unload challenge and keep simulation time paused.
- A resumed unload may restart the real-time puzzle board, but it must not silently complete, advance the game clock, or create paperwork without explicit player completion.

Numeric integrity contract:
- Zero is valid data. Use `Number.isFinite()` style fallbacks for shipment counts; do not use truthy `||` fallbacks where `0` has meaning.

DEV parity contract:
- DEV presets that represent loaded/delivered/POD states must build from the same shipment and freight-condition model as normal gameplay. Hard-coded 12/12 clean POD shortcuts are prohibited.

## Dock Ready Decision Timing — Master AT1
- Facility waiting/check-in remains live simulation time.
- Entering pickup `checked-in-pickup` or delivery `checked-in-delivery` means the facility is ready and DOC OS is waiting on an owned dispatcher decision; the authoritative game clock must pause immediately.
- `BEGIN LOADING` / `BEGIN UNLOADING` inherits that pause and must not overwrite whether the player was already paused beforehand.
- Workflow completion applies explicit service/delay minutes, then restores the player’s pre-decision pause state.

## Routing progression safety — AT2
Trip planning must never become a permanent progression blocker because an external routing request hangs or fails.

Contract:
`request live truck route -> live success OR bounded failure -> fallback route -> player can confirm plan`

Live ORS truck routing remains authoritative when available. If unavailable, DOC OS uses a deterministic estimated fallback route so gameplay continues. Fallback routing must be clearly identified to the player and must not silently masquerade as live route data.

## AU Interaction Contract
- Timer creates pressure; the player owns successful completion.
- A solved facility puzzle unlocks an explicit completion action rather than auto-ending.
- Remaining real-time dock seconds may reward clean execution, but never cancel mistakes.
- Pickup freight remains editable until SECURE LOAD; occupied trailer slots may be swapped.
- Driver quick replies are conversational only and never mutate simulation state.
- Operational alerts identify their source and remain navigation-only.


## Master AU1 — Map & Communication Language
- Brighter purple notification language.
- Driver Fit before load commitment.
- Quiet map: no driver card, wait progress ring, facility `!` attention.
- Dock-ready no longer globally pauses.
- Explicit message-driven dispatch.
- Message threads auto-scroll to newest.


## Master AU2 — Navigation & Operational Feedback
- Map labels remain compact: `EN ROUTE`, `ARRIVED`, `CHECKING IN…`, and `WAITING FOR DOCK`; detailed status stays in the Drivers drawer.
- Dock waiting uses a progress ring plus state label, never a minute-count banner.
- Actionable alerts must navigate to the workflow that resolves them. A delivery-plan alert opens delivery planning directly.
- Driver Messages may expose explicit operational commands. Loaded/no-route Marcus exposes `PLAN DELIVERY ROUTE`; route-ready Marcus exposes explicit route-sent dispatch.
- Drivers drawer rows may become direct state-appropriate actions when the next workflow is unambiguous.
- Purple attention tokens are the single badge/alert attention language across DOC OS.


## AU3 — Day Integrity & Operational Cleanup
Driver Fit is now review-only with explicit accept/assign commitment; appointment alerts are restricted to player-owned freight; legacy loading auto-completion is removed; mobile background saves flush immediately; idle return movement is smoothed; and active carrier yards are visible on the operations map.

## AV architecture contract — multi-driver foundation

DOC OS runtime state is driver-scoped. A driver owns a live position, runtime travel progress, one active load, an ordered queue, and idle repositioning state. Route geometry remains attached to the owned load. UI surfaces must resolve operational truth by `driverId`; they must not assume Marcus except for Marcus-specific authored dialogue/tutorial content.

Returning to a carrier yard is idle repositioning, not a commitment. New work may interrupt that repositioning and must plan from the driver's current runtime position.

Driver Fit projects against the driver's existing commitment chain. Drivers drawer exposes current load, next queued load, and projected availability.

Operational alerts carry `driverId` + `loadId` + explicit resolution action. Driver message threads are driver-scoped and reading a message never mutates simulation state; explicit player commands may.

Hands-on loading/unloading challenges are local real-time workflows. They do not pause the company-wide simulation clock. Challenge completion records the current simulation minute and must not add a duplicate global service-time jump.

Critical lifecycle boundaries persist immediately. Routine state continues to use debounced autosave.

## AV1 Interaction Ownership
- Map: lightweight location/status surface. En-route status is hidden during normal travel and can be revealed temporarily by tapping the driver marker.
- Driver drawer: status + current load + next load + the single primary action required to advance the driver's current operation.
- Messages: human conversation and explicit driver commands. A normal Reply control opens contextual operational replies; command selections become natural-language outgoing messages.
- Send load, Send route, and Dispatch are separate concepts. Reading a message never mutates simulation state; explicit player actions may.
- Facilities own physical loading/unloading actions. Documents own POD review. Trip planners own route planning.
- Driver/load action routing must resolve through driverId + loadId rather than a Marcus-specific path.

## AV2 interaction rules
- Pickup and delivery are windows. Fit/risk is judged against the END of the window.
- Driver Fit: GOOD FIT when comfortably before close; TIGHT within 30 minutes of close; AT RISK after close.
- Operations bar reports what matters now; schedule hamburger reports what is coming today.
- The schedule drawer is a lightweight dispatcher planning surface, not a full Calendar app.
- Driver facility communication should avoid spam: arrival + check-in/waiting normally becomes one natural message.
- Driver communication is gameplay. Reply choices may affect per-driver communication rapport and later progression/events.
- FreightLink is a live market. New freight should enter throughout the shift while valid freight remains until accepted or expired.
- EXPIRED is a danger/invalid state and must use red visual language, never green.


## AV2.1 — Communication Gate + Header Cleanup
- End Day moved to Notifications drawer footer.
- Pickup communication is gated: load brief → plan → route send → driver confirmation → dispatch message.
- Delivery uses the same route-send → confirmation → dispatch message pattern.
- Movement cannot be started by skipping required communication.

## AV2.2 — Formal communication + document workflow contract

DOC OS communication channels have distinct ownership:
- **Messages** owns driver conversation and driver dispatch instructions.
- **Email** owns formal carrier/business communication and document transmission.
- **Documents** owns document review and source paperwork.
- **LedgerDesk** owns invoices, receivables, payment terms, and collected cash.
- **Carrier agreements** define persistent operating permissions that later workflows must enforce.

Formal workflow pattern:
`operational need -> compose email -> choose correct recipient -> attach matching documents -> send -> business response -> owned system state update`

Opening or reading Email never moves a driver or changes physical trip progress. Formal Email may change business authorization/document/accounting state only after an explicit player send action and the corresponding workflow response.

Metroline booking authority:
- Metroline requires written load approval before FreightLink acceptance.
- Driver Fit may be reviewed first, but `ACCEPT & ASSIGN` remains blocked until approval is on file for that exact load.
- Approval requests must go to Carrier Operations and include the matching load offer.

POD review:
- Receiver paperwork and DOC OS shipment truth are separate concepts.
- Pickup establishes shipment condition truth.
- Delivery preserves that truth.
- Receiver POD paperwork may contain a documentation discrepancy on exception loads.
- A mismatched POD cannot be approved for billing.
- Correction is a formal Email workflow using the matching POD and supporting exception record.

Invoice submission:
- `CREATE INVOICE` creates a draft only.
- A draft becomes submitted only through Email to Accounting with the matching invoice + approved POD.
- Payment terms begin only after a valid submission.
- Wrong recipient or missing/mismatched attachments return a documentation-required response and do not start the payment clock.

## AV2.3 Workflow / Presentation Rules
- Driver relationship is a gameplay state. Store numeric value internally, but present it to the player as a relationship bar plus qualitative tier.
- Relationship gains/losses come from contextually meaningful actions, not raw message volume. Repeated identical events must not be farmable.
- Real-world documents may expand outside the phone shell using the shared document viewer. DOC OS remains the surrounding frame.
- Documents is a categorized file center, not a flat archive. Current categories: FreightLink Loads, PODs, Invoices, Agreements.
- Attachments use compact paperclip file-link language rather than large content cards.
- Any operational email concerning a load must preserve a related-record link back to that exact FreightLink load.
- Related-record navigation is bidirectional where useful: load ↔ approval email, email ↔ load/POD/invoice, Documents ↔ source record.
- The game may challenge the player's decisions and memory; it should not make the player hunt through UI to rediscover the record they were just working on.

## AV2.3.1 — Friction / Document Interaction Rules
- A planned route becomes operational only when the dispatcher explicitly sends it to the driver in Messages.
- **Send Route is the departure command.** Do not add a second ceremonial Dispatch action after route transmission.
- Pickup communication sequence: `accept/assign -> send load information -> plan pickup -> send route -> driver departs`.
- Delivery communication sequence: `plan delivery -> send route -> driver departs`.
- The driver may acknowledge the route after it is sent, but that acknowledgement does not require another player command before movement.
- Email attachment pickers must scale by category. Do not render the entire document library as one flat attachment list.
- Composer pattern: `choose document type -> choose file -> attach as compact paperclip link`.
- Tapping an attachment link opens the actual expanded document immediately. Do not insert a second detail screen whose only purpose is to expose an Expand button.
- Agreement review and signature belong on the expanded agreement itself.
- POD document inspection and DOC OS verification actions belong in one expanded review workflow.
- Expanded operational documents must visually belong to DOC OS: dark charcoal/slate surfaces, DOC OS typography/hierarchy, subtle blue-gray labels, restrained purple action emphasis, and status colors only when semantically meaningful.
- Formal document structure should remain recognizable, but generic white-paper styling is not the default DOC OS presentation language.

## AV2.13 Communications rule
Driver texts are human coordination; DOC OS alerts are operational attention. System errors do not belong in driver threads. Load IDs are secondary references, not primary conversation labels.

## AV2.18 planning rule
Planning must answer what adding freight does to the driver's whole day before carrier approval. Player-facing plan quality uses EFFICIENT / WORKABLE / TIGHT / CONFLICT rather than vague GOOD. FreightLink browsing should return to the market after ADD TO PLAN so the player can build several opportunities in one planning session. Load IDs remain reference data, not normal driver vocabulary.

## AV2.19 locked visual/operations rules
- Schedule is editable during planning. Tentative freight can be removed freely; pending approval can be withdrawn; booked freight can be canceled only before physical movement begins.
- A driver owns a persistent map color. All freight and route visuals for that driver use shades of that color family; color supplements, never replaces, P/D labels and business names.
- Route labels follow the bearing of the route segment and are flipped when needed so text never renders upside down.
- Driver conversation uses customer/facility identity, never normal freight IDs. IDs remain secondary operational references and document/accounting identifiers.
- Schedule changes alter operation first; UPDATE DRIVER communication reports only the delta from the last communicated schedule.


## AW1.6.2
Load Details CTA is anchored to the bottom action bar. Carrier approval returns to Today’s Plan. Approved schedule freight can be booked directly from the scheduler before the driver schedule is sent.


## Current patch
AW1.6.9 — Route Info Anchors. See `PATCH_NOTES.md`.

AW1.6.10 — Compact Route Peek. See `PATCH_NOTES.md`.


## AW1.6.10.3 — Route Label Shrink-Wrap Hotfix
Route peek geometry only: shrink-wrap the compact route label without changing typography or interaction behavior.

## AW1.6.12 Schedule Authority
Planning quality must be derived from the same stop-first mental model used by operations. A multi-load day is evaluated as one chronological pickup/delivery itinerary, not as independent load scores. Each transition must account for travel from the prior stop, appointment-window feasibility, and facility service time. A route can only be called WORKABLE when the entire stop sequence remains feasible.

## AW1.6.14 Scheduler Utility Contract
Today’s Plan is not just a calendar. It must explain why a driver plan is efficient, workable, tight, or conflicting using the same stop-by-stop itinerary simulation that operational movement follows. A conflict must be visible at the offending stop and must block approval/booking until resolved. Load Details keeps its primary planning CTA visible at the bottom of the browser viewport.


## AW1.7.1 stabilization note
AW1.7.1 establishes the driver itinerary as the compatibility authority for active-load consumers, makes FreightLink inspection read-only, repairs Operational Alert action delivery, and aligns the operations-map future route display with Today’s Plan stop order.

## AW1.7.3 — Map + Timeline Integrity Restore
- Operations map must render one visible remaining stop marker per `loadId + stopRole`.
- Shared facility coordinates must not collapse multiple scheduled stop events.
- FreightLink browse mode retains its pickup/delivery map markers.
- WKWebView resume/focus must rebuild DOM-backed operational markers without changing camera position.
- Future route visualization uses each load's pickup-to-delivery road geometry; itinerary order controls visual priority. Do not draw straight inter-stop connectors as freight routes.
- Scheduler stops within 75 minutes of adjacent stops use compact rendering so neighboring appointments remain independently readable.

### CS2.0B.4.1.3.6 — Index Driver Tabs
Agenda driver selection now uses raised file-divider style tabs rather than pill buttons.


### CS2.0B.4.1.3.7 — Driver Tab Shape Polish
Agenda driver selection uses a shorter raised file-divider tab attached visually to Driver Workday. This is presentation-only and does not change scheduler behavior or Operations authority.

## CS2.0B.4.2 Multi-Day Architecture — IN TEST
B.4.2 extends the existing absolute game-minute/day-index architecture rather than replacing it. Agenda Day View is date-selectable across a rolling seven-day window. Driver workday records remain keyed by driver and `workdayByDay[dayIndex]`; the selected Agenda date determines which record is viewed/edited. Freight continues to use `pickupDayIndex` and `deliveryDayIndex`. For cross-midnight freight, each date renders only the stop belonging to that date while the same load remains part of the driver's multi-day plan. HOS is explicitly out of scope until B.5. The B.4.1.3.7 Operations lifecycle remains protected while B.4.2 is IN TEST.

## CS2.0B.4.2.1-STABLE — Multi-Day Agenda Foundation
Approved 2026-09-15. Agenda now exposes a fixed seven-day Day View using real calendar dates. Driver workday editing is date-aware, and cross-midnight freight is represented on each applicable date with only that date's stop rendered. This slice does not yet change midnight rollover, open-load persistence, Daily Closeout semantics, revenue timing, or HOS. Those remain later B.4.2/B.5 responsibilities.


## CS2.0B.4.2.2 — Multi-Day Clock / Closeout Contract (IN TEST)
- The game clock is the sole authority for crossing a calendar boundary.
- Midnight changes calendar identity only; it does not move drivers, mutate load lifecycle, dispatch freight, complete freight, or post revenue.
- Driver runtime positions, route progress, assignments, appointments, and open load state persist across midnight through normal saved runtime state.
- Daily Closeout is a report overlay. It may report carryover work and must return to the same world minute when dismissed.
- HOS/rest legality is intentionally deferred to CS2.0B.5. Overnight staging decisions are not introduced in this slice.

### Hidden iPhone Dev Tools — B.4.2.2 testing support
Holding the `DOC OS` status-bar brand opens the existing hidden iPhone Dev Tools. During B.4.2.2 testing, its Time & Day section may set the current game clock to 11:55 PM, advance +1 hour, +6 hours, or +1 day. These controls are test infrastructure only and have no load, route, driver, closeout, or revenue authority.

### Hidden Dev Tools — multi-day safety
During CS2.0B.4.2 testing, the hidden iPhone Dev Tools panel is viewport-bounded and vertically scrollable with an always-accessible close control. The old Day 1 reset shortcut is disabled because it is incompatible with preserving multi-day test state. RESET GAME is the sole full-run destructive reset and requires confirmation. Time/day shortcuts remain test-only clock controls and do not receive operational lifecycle authority.

### Dev Tools — Controlled Overnight Scenario (B.4.2.2.3 TEST)
The hidden iPhone Dev Tools include `SETUP OVERNIGHT TEST`. It prepares an active Marcus delivery at 11:45 PM with pickup complete, delivery scheduled after midnight, an active loaded route, and the simulation paused. This is test infrastructure only and does not grant gameplay authority or implement HOS/overnight staging.

## CS2.0B.4.2.3 — Overnight staging contract (IN TEST)
- Overnight positioning is planned per driver and per calendar date in Agenda.
- The dispatcher explicitly chooses Metroline Yard or one of the fixed truck/rest staging locations available in the market.
- Load completion no longer starts an automatic return-to-yard countdown.
- An overnight positioning route begins only after the selected date's scheduled end-of-day and only when the driver has no active freight.
- Midnight has no movement authority. Any active overnight positioning route continues from its real runtime position across the date boundary.
- The resulting runtime position is authoritative for tomorrow's routing origin.
- B.4.2 does not judge legal rest, duty time, or HOS compliance; those remain B.5 scope.

### CS2.0B.4.2.3.1 — Player-Facing Roadmap Boundary
Player-facing DOC OS surfaces describe only systems and decisions that exist in the current game experience. Roadmap phases, future mechanics, deferred systems, build/version terminology, and development commentary belong only in project documentation. Overnight parking currently exposes two operational choices: Truck Stop and Carrier Yard. The choice is explicit per driver/date and uses normal routing rather than teleportation.

### Cross-Midnight Driver Workdays (CS2.0B.4.2.3.2-TEST)
A driver workday is owned by its Agenda start date. If its end clock time is at or before its start clock time, `endDayOffset: 1` means the scheduled end belongs to the next calendar day. Example: a Tuesday 2:00 PM–3:00 AM workday ends Wednesday at 3:00 AM. Midnight does not end the workday, trigger staging, reset driver state, or interrupt freight. Overnight staging becomes eligible only after the workday's absolute end and only when the driver is free of active freight. The following Agenda date surfaces the prior day's overnight carryover for operator awareness.

### Overnight staging movement authority
Once a driver has legitimately entered an overnight staging route, that repositioning movement persists until arrival at the selected staging destination. Future/next-day freight may prevent new staging from beginning when freight is already operationally active, but it must not freeze an overnight staging route that has already started. Overnight staging never interrupts an active freight movement.

### Overnight map status presentation
During overnight staging, the operational map uses compact visual state indicators rather than verbose development/operational labels: `💤` means the driver is actively repositioning to the selected overnight destination; `🌙` means the driver has arrived and is parked for the night. Detailed staging information belongs in Agenda/driver details so the map remains visually clean.


### Overnight map status presentation
During overnight staging, the map keeps the driver marker as the primary visual. A compact attached badge communicates overnight state: `💤` while traveling to the selected staging destination and `🌙` once parked for the night. Detailed overnight information remains in Agenda/driver surfaces rather than becoming a large map label.


### B.4.2 Overnight map badge presentation
Overnight status is rendered as a small corner badge on the canonical driver marker. The badge must never resize or replace the driver marker.

### Strategic overnight staging (CS2.0B.4.2.3.7-TEST)
Agenda overnight planning is a player decision. A scheduled driver may be staged at the carrier yard or one of three fixed truck/rest stops in the New York market. The chosen location is stored per driver/per workday and is used as the destination for the existing overnight repositioning route. The UI shows approximate straight-line distance from the driver's current known position for decision context. DOC OS does not label a choice as best or choose one automatically.



### Overnight Agenda timeline continuity (CS2.0B.4.2.3.8-TEST)
Agenda's seven-date selector remains a fixed navigation bar. The selected Day View owns a vertically scrollable operational timeline that may continue past midnight when that date's workday or same-load freight crosses into the following date. The midnight boundary is rendered as a subtle dated divider. Cross-midnight workday end, overnight lunch, and next-day delivery events use relative timeline minutes beyond 24:00 so their vertical positions remain chronologically true. The following calendar date still has its own Day View and carryover representation; the originating day's overnight extension is an additional continuity view, not a replacement. This presentation receives no routing, lifecycle, staging, revenue, or HOS authority.

### Carryover Day Timeline Window — CS2.0B.4.2.3.9-TEST
When a driver's previous calendar-day workday crosses midnight, the receiving date's Agenda Day View includes the carryover window beginning at 12:00 AM and marks the prior workday's actual end. This complements the originating day's extended overnight timeline: overnight work/freight can be understood from both calendar dates without converting the carryover into a new workday. Days without carryover keep the normal compact timeline. This is scheduler presentation only and does not grant lifecycle, movement, HOS, or midnight authority.

### Carryover Day Timeline
When a selected calendar date inherits work from the previous day, Agenda renders from 12:00 AM through the full receiving calendar day. The inherited workday remains distinct from that date's own Driver Workday. If operations on the receiving date extend into another date, the timeline can extend beyond midnight as needed.

### Agenda 24-Hour Day View — CS2.0B.4.2.3.11
- Every selected Agenda date renders a complete calendar-day timeline beginning at 12:00 AM and running through midnight.
- Carryover from the previous date occupies the receiving day's early-morning hours rather than changing the timeline window.
- If work or freight belonging to the selected operational plan truly continues into the next date, the timeline may extend beyond midnight to show that continuity.
- This is presentation/scheduler behavior only and does not grant lifecycle, movement, HOS, or midnight authority.

### Overnight map presentation (B.4.2.3.12)
Strategic truck stops are persistent world locations and appear as compact truck-stop markers on the operations map. Driver overnight staging movement is visually interpolated between authoritative simulation ticks; the simulation remains authoritative for route progress and arrival. The driver retains the small sleep/moon status badge during overnight staging.

### Map POI marker sizing
Carrier-yard and strategic truck-stop world markers use the same 30×30 px footprint with 18×18 px glyphs. Their visual treatments may differ by location type, but neither should visually outweigh the other through size alone.

## B.4.2 Closure Acceptance — CS2.0B.4.2.4-TEST
- Every Agenda Day View owns one full calendar day.
- Driver workday/lunch/overnight settings are stored under the selected day key; closure testing must prove neighboring dates remain independent.
- FreightLink appointments carry pickupDayIndex/deliveryDayIndex and render calendar dates through planning/detail surfaces; closure testing must prove the dates survive booking and overnight execution.
- LedgerDesk receivables are eligible only after a load is completed with approved POD. Midnight rollover itself has no payment/revenue authority.
- During authorized overnight staging travel, the map shows a subdued dashed route to the selected Yard/truck stop. Freight travel remains the stronger route authority.

## B.4.2 next-day movement authority
A future appointment or communicated schedule is planning state, not off-hours movement authority. After freight is physically completed and the driver's prior workday ends, an explicit overnight staging plan may reposition the driver to its selected Yard/truck-stop destination. Planned/assigned future freight may remain visible and assigned, but it cannot auto-depart outside the driver's current scheduled workday merely because it was previously communicated. Once legitimate staging travel starts, it retains repositioning authority through arrival.

## Shift End Staging Authority — B.4.2.4.2
Post-work staging is governed by the driver's per-date scheduled SHIFT END. The dispatcher selects a Shift End Plan (Carrier Yard or fixed truck stop). If active freight extends beyond shift end, freight completes first; staging then begins. Midnight does not trigger staging. The resulting physical location persists as the driver's next routing origin. Internal overnight-named persistence fields are retained for backward save compatibility during this revision.


### Shift End map presentation
When Shift End staging owns driver repositioning, the driver marker uses badge-only status: 💤 while traveling and 🌙 after arrival. No staging text label is shown. A future assigned load must not replace this presentation until staging authority ends.

### Shift End visual release (CS2.0B.4.2.4.4-TEST)
A completed Shift End staging state is temporary presentation/runtime authority. When the driver's next scheduled workday begins, the staged physical position is preserved but the moon/staging runtime state is released. Normal freight operation uses the standard driver marker presentation.


### Shift End visual release — B.4.2.4.5
After a completed Shift End staging state releases at the next scheduled workday, the driver marker returns to the normal active blue presentation while the driver is within the scheduled workday or actively operating freight. Queue/assignment bookkeeping must not force an on-duty driver marker gray. The staged physical position remains the routing origin.

## FreightLink multi-day market (B.4.2.5)
FreightLink is a rolling seven-day planning market. Available freight can have pickup dates today or on upcoming calendar days, including midnight and early-morning appointments. The board can be filtered by pickup date. Future freight may be planned/booked in advance, but visibility or assignment never authorizes off-hours movement; normal shift and explicit dispatch authority still apply.

## B.4.2-STABLE — Multi-Day Operations
B.4.2-STABLE freezes the approved multi-day architecture. Agenda owns real calendar dates and full-day views; midnight advances the calendar without lifecycle authority; active freight and physical driver state persist across date changes; Shift End is the explicit post-work staging instruction; future freight is planning state until legitimate work/dispatch authority exists; and FreightLink exposes a rolling seven-day market with real pickup/delivery dates including early-morning appointments. Payment/revenue authority remains tied to completed freight and approved POD. The stable candidate and exact promoted real-repository source both passed on-device testing. This section describes current stable behavior and introduces no future-phase mechanics.


## Email — Workflow Review Rule (B.4.2.6-STABLE)
Operational workflow emails are system-prepared business communications. The player reviews and sends them; recipient, subject, message, and required attachments are locked. Schedule Approval remains one batch email for the planned schedule. Email presentation must not independently advance freight, movement, POD, payment, or approval state before Send.

### Compact Workflow Email presentation — B.4.2.6-STABLE
Required operational email remains locked Review → Send. The review surface uses conventional email hierarchy (To, Subject, message body, attachments, Send) rather than independent dashboard cards. Operational workflow logic remains unchanged.

### Locked workflow email — fixed review surface (B.4.2.6-STABLE)
Workflow-generated Email remains a locked Review → Send experience presented as an email. The review surface is fixed rather than vertically scrollable: the toolbar and Send action stay anchored, the compact email body/attachments fit within the device, and vertical drag/overscroll is suppressed. General/freeform Email behavior is unchanged.


### Email correction entry points (B.4.2.6-STABLE)
- Pickup freight exceptions hold the driver until the dispatcher sends the locked pickup-correction email from the alert action.
- POD document corrections continue to originate from the POD review/document workflow and use the locked POD-correction email.
- Opening a correction email does not release the driver; SEND is the authoritative release event for the pickup exception.
- Locked workflow emails remain non-scrollable; three required attachments are compacted to remain visible.


## B.4.2.6-STABLE — Compact Email Workflow
The approved Email contract is formal Review → Send. Required operational emails are system-prepared and locked; the player reviews recipient, subject, message, and required attachments, then explicitly sends. Schedule Approval remains a multi-load batch communication. Correction and Invoice Submission workflows use the same presentation. Opening/reviewing an email never grants movement or business-state authority by itself. For pickup exception holds, SEND is the authoritative release event. The fixed workflow review surface does not vertically bounce and compacts required attachments to fit. General/freeform composer infrastructure remains available but is not the required workflow path.

### Known Documents handoff for B.4.3
The current Documents architecture may continue to expose Request Correction on a POD after a corrected copy has been received, and older exception details may surface in downstream document views. This is not part of the Email contract. B.4.3 must establish authoritative current-versus-superseded document versions and make downstream invoice/settlement workflows reference the current POD consistently.

## B.4.3-STABLE — Documents & Rate Confirmation Workflow
Documents now use explicit lifecycle semantics instead of destructive replacement. PODs have stable identity, version, current-authority state, and superseded history. A corrected POD creates a new current version while preserving the prior copy. Pickup exception correction and post-delivery POD correction remain distinct business events, and a sent POD correction stays visibly awaiting correction until the corrected document arrives.

Carrier approval creates a persistent load-owned Rate Confirmation and delivers it through inbound carrier Documentation email. Unreviewed Rate Confirmations appear in Documents > Pending. The dispatcher manually compares FreightLink Offer values with the Rate Confirmation and marks required fields ✓ or X. All ✓ allows confirmation; any X enables the locked Rate Confirmation correction Email workflow. SEND moves the document to correction-requested state; a corrected carrier response creates a new current version, supersedes the prior copy, and resets manual review. No automatic recognition performs the player's verification.

Completed loads can form a permanent load/settlement packet tying together the FreightLink record, confirmed Rate Confirmation, pickup/exception evidence when present, authoritative approved POD, invoice, and settlement/payment state. Existing folder views remain navigation surfaces over those load-owned records.

### Manual verification authority
The player's verification decision is authoritative. DOC OS may allow incorrect paperwork to be approved rather than blocking the decision. Such mistakes are eligible for later downstream financial, operational, relationship, or performance consequences. The consequence system is not added by B.4.3.

### Physical-paperwork presentation direction
The dedicated visual pass must present operational documents as actual business paperwork rather than generic database panels. Rate Confirmations, PODs, invoices, agreements, and settlement records should have document-specific paper layouts while retaining the lifecycle, versioning, correction, and load-packet architecture established in B.4.3.

### Promotion cleanup
The temporary B.4.3.3.1 forced Rate Confirmation discrepancy was acceptance scaffolding only and is absent from promoted gameplay. B.4.3-STABLE preserves B.4.2 multi-day operations, Shift End authority, midnight behavior, FreightLink movement rules, compact Email workflow authority, and LedgerDesk timing.


## CS2.0B.4.4.1 — LedgerDesk Banking Foundation (IN TEST)
LedgerDesk now distinguishes **business accounting** from **bank cash**. Receivables continue to own invoice lifecycle (`READY_TO_INVOICE → DRAFT → AWAITING_PAYMENT → PAID`). The new Operating Account owns spendable cash.

- Opening capital for a new operation is **$2,500.00**.
- A receivable becoming `PAID` does not itself equal cash; reconciliation posts a separate `invoice-payment` credit transaction tied to that load/invoice.
- Invoice-payment transaction identity is deterministic (`invoice-payment:<loadId>`), preventing duplicate deposits after time advancement, rerenders, save/resume, or migration.
- Existing saves with PAID invoices but no Banking state reconstruct those historical deposits once so the transition does not erase already-collected money.
- Current/available bank balance is derived from opening capital plus credits minus future debits. B.4.4.1 introduces credits only; expense/debit systems are intentionally not invented here.
- The current Revenue Earned / Outstanding / Collected summary remains accounting information and is not yet replaced by the bank UI.
- The status-bar cash and Daily Briefing integration remain unchanged until B.4.4.3; B.4.4.1 is the data-authority foundation.
- A compact LedgerDesk Operating Account balance is exposed only so the foundation can be acceptance-tested before the full B.4.4.2 banking presentation.


## CS2.0B.4.4.2 — LedgerDesk Account UI (IN TEST)
LedgerDesk has two primary sections: Account and Receivables. Account is the default and reads from `ledgerBanking`; it displays the authoritative available balance and transaction history. Receivables preserves the existing invoice lifecycle and Revenue/Outstanding/Collected accounting summaries. The status bar and other global cash surfaces are not authoritative-bank integrations until B.4.4.3.

### B.4.4.3 financial authority
LedgerDesk Banking is the authoritative source for spendable cash. The global status bar and Day Briefing read the Operating Account available balance. Revenue Earned, Outstanding, Collected, and Daily Closeout Cash Collected remain accounting/per-period metrics and must not be substituted for bank cash. Daily Closeout snapshots the Operating Account balance for that business-day report.


### Day Closeout → 07:00 Next Operations
Daily Closeout remains a business-day report and never directly resets or increments the calendar. `CONTINUE TO NEXT OPERATIONS` starts a controlled high-speed live simulation toward the next DOC OS operating-day start at **07:00**. Midnight, payments, legitimate driver movement, Shift End staging, freight, and persistent world state continue through their existing authoritative systems while time advances. If Closeout occurs after midnight but before 07:00, the target is that upcoming 07:00. At the target, DOC OS pauses the overnight advance and surfaces Day Briefing once. BEGIN OPERATIONS consumes that pending target, restores normal 1× control at the same live time, and historical closeout data cannot re-open the consumed briefing.


## CS2.0B.4.4.4 — Banking Polish & Regression (TEST)
LedgerDesk payment transactions retain their bank identity while linking back to the related receivable/invoice for operational traceability. Deposit count means posted invoice-payment credits, not all transaction rows, so later debit systems cannot corrupt that metric. B.4.4.4 adds no new money source/sink and must preserve duplicate-deposit protection, save migration, multi-day persistence, authoritative Operating Account cash, and the 07:00 End Operations handoff.


## CS2.0B.4.4-STABLE — LedgerDesk Banking
- Operating Account starts at $2,500 opening capital.
- Money is a resource, not a score: Revenue, Outstanding, Collected, and available bank cash remain distinct.
- Carrier payment completion and bank deposit posting are related but separate authoritative records.
- Global CASH reflects Operating Account balance.
- End Operations uses a controlled overnight live-clock advance and stops at the DOC OS operating-day start of 07:00 for Day Briefing; midnight itself remains calendar-only and never resets world state.
- Visual-pass backlog: replace/clarify top-bar DAY # language and reduce Operating Account hero-card height.

## B.5 HOS contract — Rest and duty-session history
- HOS state is driver-scoped, never global.
- A scheduled clock-in begins the driver's duty session. Once that session starts, its start time is historical and cannot be edited away.
- Driving consumes Drive + Duty; non-driving on-duty activity consumes Duty; OFF DUTY consumes neither.
- A new 11/14 availability reset requires 10 continuous hours OFF DUTY. Calendar midnight, Daily Closeout, End Operations, and the 07:00 dispatcher operating-day handoff are not HOS reset events.
- Active freight and legitimate Shift End staging retain movement authority until complete; rest begins only after the driver is no longer actively working or repositioning.
- Agenda is a player-facing operational view over a real 24-hour calendar. Future presentation may suppress empty midnight-first space, but must never remove real overnight/cross-midnight activity or mutate the underlying calendar.
