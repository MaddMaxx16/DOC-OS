# DOC OS Desktop Experience Architecture v1

Status: **Locked design direction for Desktop Build 1**

This document is the source of truth for the first desktop-first DOC OS experience. It records the product, UX, interaction, and implementation boundaries agreed before coding begins.

The goal is not to recreate the mobile interface at a larger size. The goal is to make DOC OS feel like a real dispatch simulator built around a dispatcher workstation, while preserving the simulation systems already created.

---

## 1. Product direction

DOC OS is now designed **desktop-first**.

The long-term target is a packaged PC game suitable for a platform such as Steam. The phone version is not deleted, but it is no longer the primary design constraint. Mobile can be revisited later as a compact edition, companion experience, or alternate presentation.

### Primary design target

- Reference resolution: **1920 × 1080**
- Mouse and keyboard are the primary desktop inputs.
- The interface should scale down reasonably to common laptop sizes without being redesigned around phone widths.
- Wider screens may reveal additional map/workspace area later.
- Desktop presentation must remain separate from the underlying simulation engine.

### Core principle

**One game state, multiple possible presentations.**

Manifest logic, HOS, freight, routing, messages, documents, saves, banking, driver state, tutorial state, and other simulation systems remain shared. Desktop receives a new presentation shell rather than a second game engine.

---

## 2. Game hierarchy

DOC OS has three distinct experience layers.

### Layer 1 — Title Screen

The current Metroline cubicle should no longer serve as the title screen.

A new dedicated title screen will be created for the desktop game.

Expected primary options:

- Continue
- New Career
- Load Career
- Settings
- Quit

The title screen should establish DOC OS as a PC game, not imitate a software login screen.

Visual direction:

- dark
- modern
- sleek
- restrained
- logistics/dispatch atmosphere
- cinematic enough to establish tone without becoming visually noisy

The exact title-screen art direction may evolve during implementation, but it must remain separate from the player's physical career workspace.

### Layer 2 — Career World / Physical Workspace

After selecting or creating a career, the player enters the physical work environment associated with that save.

For a new Metroline employee, this begins as a basic Metroline cubicle.

The physical workspace is part of career progression and should evolve over time:

- entry-level cubicle
- improved/personalized workstation
- more established professional desk
- senior or higher-status workspace
- eventual owner/business office

This progression should be visible, not only represented by numbers in a menu.

The physical workspace may eventually support:

- desk/workspace customization
- character-related customization access
- career awards or certificates
- a limited set of meaningful physical interactions
- visual upgrades purchased or earned through progression

DOC OS dispatching remains centered on the computer. The physical workspace should support the career fantasy without turning the project into a general life simulator.

### Layer 3 — DOC OS Workstation

The player clicks the computer in the physical workspace.

The camera then moves/zooms toward the monitor and transitions into the DOC OS workstation interface.

The workstation is the main operational simulation layer.

Backing out of the workstation should reverse that relationship: the player returns to the physical workspace rather than being thrown directly to the title screen.

---

## 3. New Career flow

Create-A-Character is preserved.

It is a major part of the game and should gain value in the desktop version rather than being discarded.

New Career flow:

**Title Screen → New Career → Create-A-Character → Metroline introduction / career setup → physical Metroline cubicle → click computer → DOC OS workstation**

The created character may later appear in places such as:

- employee profile
- Metroline ID/badge
- career screens
- messages/avatar surfaces
- appropriate documents
- physical workspace scenes
- customization/shop flows

Existing Create-A-Character assets and systems should be reused rather than rebuilt without cause.

---

## 4. Visual language

DOC OS should maintain a consistent **dark, modern, sleek operations-software identity**.

Desktop is not an enlarged mobile UI.

Preferred characteristics:

- charcoal/navy surfaces
- controlled accent colors
- crisp typography
- high information density without tiny unreadable text
- thin dividers
- structured rows
- operational tables
- timelines
- restrained shadows
- subtle motion
- contextual overlays
- fewer oversized rounded mobile cards
- strong map presence
- clear hierarchy between operational state and secondary information

Avoid:

- generic Windows-style floating-window clutter
- bright dashboard-card overload
- cyberpunk neon excess
- rainbow driver coloring
- mobile layouts simply stretched to desktop dimensions

The workstation should feel like purpose-built dispatch software that also communicates game state clearly.

---

## 5. Workstation shell

The desktop workstation has five major regions.

### Top — Global bar

Owns global state such as:

- operation/day information
- date/time
- money or relevant account summary
- simulation controls
- global operational alerts
- settings/system actions

The top bar is the single global location for operational alerts.

### Left — Driver access

The left side begins as a compact driver roster or rail.

Its job is driver selection, not full operational detail.

Selecting a driver intentionally from the roster opens a **driver slide-over** from the left.

The slide-over should be useful but not oversized. It may include:

- driver identity
- duty/status
- current location
- next stop
- HOS snapshot
- trailer snapshot
- quick actions such as Message, Route, Details, or View Day

The map must remain visually important while the slide-over is open.

### Center — Live map

The map is the primary operational surface and should own the largest portion of the normal workstation.

It is not decorative. It is an interactive control surface tied directly to driver, stop, facility, manifest, route, and timing state.

### Right — Operational truth panel

The right panel displays the selected driver's operational truth.

Primary contents may include:

- selected driver
- current duty/status
- HOS
- trailer state
- onboard freight
- manifest / stop order
- current stop
- next stop
- important timing/risk information

This panel answers:

> What is this driver's operational situation right now?

It should not duplicate the purpose of the driver roster.

### Bottom — App workspace

The bottom edge contains the application strip and expandable work area.

Initial app direction:

- FreightLink
- Email
- Documents
- Messages
- Banking
- CarrierSource
- Shop

LedgerDesk is not the employee banking app. It is reserved for later business/owner gameplay.

---

## 6. Driver color and map identity

All drivers use one consistent DOC driver color/treatment.

Do not assign each driver a permanent unique color.

Driver state should be communicated through:

- icon/state treatment
- movement
- status label
- warning indicators
- selection emphasis
- opacity/brightness
- contextual popovers

Selected routes or drivers may temporarily brighten while unrelated routes recede.

This prevents the map from becoming a rainbow as the fleet grows.

---

## 7. Map interaction contract

Map interaction should provide useful context without opening large panels by default.

### Clicking a driver marker

Shows a small status popover.

Example information:

- Marcus Reed
- En Route
- next stop
- ETA, e.g. "10 min"
- a critical HOS/status warning if relevant

This click does **not** automatically open the full driver slide-over.

A deliberate secondary action such as "View Driver" may open deeper driver information.

### Clicking a stop / facility

Shows a compact contextual popover with information such as:

- facility name
- facility type
- appointment information
- expected arrivals
- the player's drivers currently expected there
- future congestion/wait estimate when that simulation exists

Facilities should eventually support shared traffic: multiple drivers may arrive around the same time, contributing to dock pressure and wait time.

Desktop Build 1 should expose the data surface cleanly without requiring the complete congestion simulation to exist yet.

### Clicking a pickup or delivery point

May show:

- load number
- pickup/delivery role
- appointment window
- assigned driver
- projected arrival
- early / on-time / at-risk state

### Clicking a route leg

Shows a small route popover with information such as:

- assigned driver
- related load or manifest leg
- destination
- estimated remaining travel time
- miles remaining when available
- current route status

### Map ↔ manifest synchronization

Selection should be bidirectional.

Examples:

- clicking P2 in the manifest highlights P2 on the map
- clicking P2 on the map highlights the related manifest row
- selecting a route leg may highlight the related driver and manifest segment

The player should be able to understand the same operation from either the map or the manifest.

### Map information-density rule

Map clicks use lightweight contextual overlays by default.

Deeper detail requires a deliberate action such as:

- View Driver
- View Facility
- Open Load
- Open in FreightLink
- View Manifest

This preserves map readability as the world becomes busier.

---

## 8. Bottom workspace state model

The bottom workspace has three states.

These are gameplay states, not merely different panel sizes.

### Collapsed

Purpose: **monitor operations**

Presentation:

- narrow bottom strip
- app names/icons visible
- badges where appropriate
- map receives maximum space

Example:

**FreightLink | Email | Documents | Messages | Banking | CarrierSource 🔒 | Shop**

Gameplay time: **RUNNING**

### Working

Purpose: **use an app while keeping operational context**

Presentation:

- selected app rises from the bottom
- approximately the lower 35–45% of the workstation may be used as a starting design target
- map and driver context remain visible
- right operational panel remains available

Examples:

- browsing FreightLink
- reading normal email
- checking messages
- reviewing the Documents list
- viewing Banking
- browsing Shop

Gameplay time: **RUNNING**

Working mode should preserve the pressure of active dispatching.

### Focused

Purpose: **perform a gameplay task requiring concentrated interaction**

Focused is not simply "make the app bigger."

It means:

> The player has entered an active work task.

Examples:

- verifying a Rate Confirmation
- inspecting/correcting paperwork
- reviewing a POD in detail
- assembling/confirming invoice documents
- completing a detailed planning interaction

Gameplay time: **PAUSED AUTOMATICALLY**

The player should not lose operational time because they are physically reading or manipulating detailed paperwork.

Focused mode receives most of the screen.

The full right operations panel may compress into a thin operational summary instead of disappearing entirely.

Example summary:

**MARCUS · PAUSED · NEXT P2 · HOS 9:42 · TRAILER 14/26**

When the Focused task ends, the player returns to Working mode.

---

## 9. Time model

The following time behavior is locked for v1:

- Title Screen: **paused**
- Physical career workspace: **paused**
- DOC OS Collapsed: **running**
- DOC OS Working: **running**
- DOC OS Focused: **paused**
- Pause menu: **paused**

Entering or leaving the computer does not itself begin or end the workday.

The operational day lifecycle remains a separate game concept.

---

## 10. Back / Escape hierarchy

Desktop navigation should be predictable.

Preferred hierarchy:

**Focused → Esc → Working → Esc → Collapsed → Esc → zoom out to physical workspace**

From the physical workspace, Esc opens the normal game pause/menu layer.

Esc should not unexpectedly throw the player back to the title screen or destroy current work.

Context-specific confirmation may be required when leaving a partially completed Focused task.

---

## 11. Right operations panel behavior

### Collapsed workspace

Full right operations panel remains visible.

### Working workspace

Full right operations panel remains visible unless a specific app layout requires a temporary narrower presentation.

### Focused workspace

The panel compresses to a thin operational summary strip rather than consuming large horizontal space.

The goal is to give the task enough room while preserving the fact that the player is still working inside an active dispatch operation.

---

## 12. Physical documents

Desktop gives Documents a more tactile role.

Important documents may be represented as physical papers during Focused tasks.

Supported interaction direction:

- move papers
- bring to front
- stack/overlap
- zoom
- inspect
- compare side-by-side
- return to document storage
- possibly limited natural rotation where useful

Do not turn document handling into tedious filing housekeeping.

The tactile interaction exists to improve understanding and task gameplay.

### Rate Confirmation example

A Rate Confirmation Focused task may allow the player to compare:

- FreightLink booking information
- physical Rate Con
- pickup facility
- delivery facility
- appointment times
- equipment
- rate
- miles

Then the player can:

- confirm the document
- request a correction

Desktop Build 1 only needs to establish the Focused-state shell. Full paper interaction can follow in a dedicated Documents work packet.

---

## 13. Application progression

### FreightLink

Available during Metroline employment.

Purpose:

- shop lanes/loads
- evaluate fit
- pursue/approve/book freight
- support the manifest planning loop

FreightLink is the first app that should be converted to the desktop Working model.

### Email

Available during Metroline employment.

Working mode handles normal reading.

Focused mode may activate when an attachment or task requires deeper work.

### Documents

Available during Metroline employment.

Owns stored operational paperwork.

Focused mode supports tactile document workflows.

### Messages

Available during Metroline employment.

Owns driver/business communication.

### Banking

Available as an employee-facing personal finance app.

Potential contents:

- paychecks
- deposits
- balance
- transaction history
- personal career earnings

This replaces the old idea of using LedgerDesk as the employee banking surface.

### CarrierSource

Visible but locked during early Metroline employment.

It becomes relevant later in Career Play when the player reaches the appropriate carrier/business stage.

The lock should communicate future progression, not feel like paid-content gating.

### Shop

Available as a career/progression surface.

Potential categories:

- character cosmetics
- workspace decoration
- desk items
- workstation themes
- visual equipment upgrades
- other earned career purchases

Shop should use in-game progression/economy.

The project is not being designed around real-money microtransactions.

### LedgerDesk

Reserved for business ownership.

Potential future purpose:

- business banking
- settlements
- receivables
- carrier expenses
- invoices
- business cash flow

Personal Banking and LedgerDesk may coexist later because personal and business money are separate concepts.

---

## 14. Notifications

There is one global operational alert system.

### Global bell / alert area

Used for operational issues requiring attention.

Examples:

- appointment risk
- HOS problem
- facility problem
- driver operational issue
- route disruption

### App badges

Apps may carry their own unread/new-content badges.

Examples:

- Email badge = unread email
- Messages badge = unread messages
- Documents badge = new paperwork

Do not create multiple competing "Alerts" destinations.

---

## 15. Career workspace progression

The physical workspace is an observable career progression system.

Early career should feel modest.

Examples of progression:

- cubicle quality
- chair
- monitor count
- desk quality
- personal items
- company recognition
- wall items/certificates
- office privacy/space
- eventual company branding

Some changes may be:

- automatically unlocked by career status
- purchased in Shop
- cosmetic
- tied to meaningful progression

The workspace should visually tell the story of the player's career.

---

## 16. Day lifecycle

Entering DOC OS is not the same thing as starting operations.

Leaving DOC OS is not the same thing as ending operations.

The game should preserve a separate operational lifecycle such as:

**Begin Operations → dispatch/work day → End Operations → closeout → progression/pay**

The player may zoom out to the physical workspace and return to the workstation without silently completing the day.

---

## 17. Save architecture direction

The desktop future should be designed around a proper career save rather than assuming one permanent browser session.

A career save should ultimately be able to contain:

- created character
- career progression
- employer/business state
- workspace progression/customization
- money
- owned items
- game day/time
- drivers
- loads
- manifests
- HOS
- documents
- messages
- world/facility state
- current operation
- tutorial/progression state

Desktop Build 1 does not require a complete save-system rewrite.

However, new desktop architecture should not make multi-career/save-slot support impossible later.

Autosave checkpoints should eventually include meaningful events such as:

- bookings
- deliveries
- major document decisions
- purchases
- entering/leaving DOC OS
- end-of-day closeout

---

## 18. Desktop controls

Mouse is the primary pointer interaction.

Keyboard conventions should begin consistently.

Initial direction:

- **Esc** = back/close according to the defined hierarchy
- **Space** = pause/play when appropriate
- simulation speed shortcuts may be added later
- app shortcuts may be added later

Avoid interactions that depend exclusively on tiny precision targets.

Controller support is deferred but the layout should not intentionally make it impossible.

---

## 19. Steam / packaged-game direction

The first desktop implementation may continue to run as the existing React/Vite application for fast iteration.

That is a development/testing strategy, not a statement that DOC OS will remain a browser-only product.

Long-term packaging should support a real PC-game experience, including future concerns such as:

- local career saves
- windowed/fullscreen modes
- resolution handling
- audio
- keyboard controls
- install/update lifecycle
- Steam integration
- achievements
- overlay compatibility

The final packaging technology is not selected in Desktop Architecture v1.

Do not block Desktop Build 1 on Steam packaging work.

---

## 20. Browser checkpoint testing

Early desktop checkpoints should be tested intentionally in a desktop browser before packaging work begins.

Preferred test strategy:

1. complete a coherent desktop work packet
2. verify it
3. create one intentional browser preview/checkpoint when needed
4. test on Mac in fullscreen
5. collect screenshots/screen recordings and multiple related findings
6. create the next polish packet

Do not create a preview deployment for every small edit.

The eventual development flow will move toward packaged desktop builds after the shell and major interactions are stable.

---

## 21. Desktop Build 1 scope

Desktop Build 1 exists to prove the new experience architecture.

It is **not** a full desktop conversion of every app.

### Build 1 must include

1. New dedicated title-screen structure
2. Continue / New Career entry flow foundation
3. Existing Create-A-Character preserved
4. Physical Metroline cubicle used as the first career workspace
5. Click computer
6. Camera/visual transition into DOC OS
7. 1920×1080-first dark desktop shell
8. Live existing map integrated into the shell
9. Compact driver roster
10. Driver slide-over from roster selection
11. Small driver map popover
12. Right-side operational truth panel
13. Bottom Collapsed app strip
14. FreightLink opening into Working mode
15. Focused-state shell
16. Automatic game pause in Focused mode
17. Escape/back hierarchy
18. One-color driver visual system
19. Basic stop/facility and route-leg contextual popover structure
20. Existing simulation state reused rather than duplicated

### Build 1 does not need to include

- full paper physics
- full desktop Documents redesign
- complete facility congestion simulation
- full Shop implementation
- full Banking redesign
- business LedgerDesk implementation
- unlocked CarrierSource career gameplay
- Steam packaging
- controller support
- complete multi-save UI
- every mobile screen converted to desktop

These belong in later work packets.

---

## 22. Build 1 acceptance scenario

A successful first desktop checkpoint should allow Maxx to:

1. Launch DOC OS and see the new title-screen structure.
2. Start or continue a career.
3. Confirm Create-A-Character remains intact for a new career.
4. Enter the Metroline cubicle as the physical career workspace.
5. Click the workstation computer.
6. See a clean transition/zoom into DOC OS.
7. Use the desktop workstation at the intended 1920×1080 design scale.
8. See the existing live map in the center.
9. Click Marcus on the map and receive a small status popover rather than a large panel.
10. Select Marcus from the roster and open the driver slide-over.
11. View Marcus's operational truth in the right panel.
12. Click a stop/facility and see a contextual popover.
13. Click a route leg and see assigned-driver/timing context.
14. Use the bottom app strip.
15. Open FreightLink into Working state while the simulation continues.
16. Enter a Focused interaction and verify that simulation time pauses automatically.
17. Back out through Focused → Working → Collapsed.
18. Exit the workstation and return to the physical cubicle without ending the operational day.

This scenario is the primary experience proof for Desktop Build 1.

---

## 23. Architecture boundaries

### New source of truth

Desktop layout state may own presentation concepts such as:

- shell mode
- selected driver
- selected map entity
- workspace state
- active app
- active Focused task
- slide-over visibility

It must not replace simulation truth already owned elsewhere.

### Existing simulation truth remains authoritative

Examples:

- driver duty/HOS
- manifest stop order
- trailer capacity
- load state
- routing
- appointment state
- game clock
- documents
- messages
- freight market

Desktop components consume that truth.

They should not create a competing desktop-only version of it.

### Compatibility

Mobile-specific presentation components may remain during transition.

They must not be treated as the source of truth for the new desktop shell.

Shared logic should be extracted or reused when appropriate rather than duplicated.

---

## 24. Deferred systems

The following ideas are intentionally preserved for future design, but are not required for Desktop Architecture v1 implementation:

- advanced facility traffic/congestion simulation
- dock availability modeling
- NPC carrier traffic
- deeper physical office interaction
- expanded office ownership/business environments
- desktop paper physics
- drag-and-drop manifest editing
- controller support
- Steam achievements
- Steam Cloud
- cross-device/mobile companion behavior
- final desktop packaging technology

Deferred does not mean rejected. It means they should not expand Desktop Build 1.

---

## 25. Locked design summary

The following decisions are considered locked unless deliberately reopened:

- DOC OS is desktop-first.
- 1920×1080 is the primary reference resolution.
- PC/Steam is the long-term platform direction.
- The current cubicle is no longer the title screen.
- A new dedicated title screen is created.
- Create-A-Character stays.
- The physical Metroline cubicle becomes the first career workspace.
- The career workspace visually upgrades over time.
- Clicking the physical computer transitions into DOC OS.
- DOC OS uses a dark, modern, sleek operations design.
- The map is the central operational surface.
- All drivers use one consistent visual color system.
- Clicking a driver on the map shows a small status popover.
- Selecting a driver from the roster opens the driver slide-over.
- Stops/facilities and route legs have compact contextual map popovers.
- Map and manifest selections should synchronize.
- The right panel owns selected-driver operational truth.
- The bottom workspace has Collapsed, Working, and Focused states.
- Collapsed runs game time.
- Working runs game time.
- Focused pauses game time automatically.
- Focused mode represents actual gameplay work, not merely a larger panel.
- Focused mode compresses the right operations panel into a thin summary.
- Physical/tactile document interaction belongs primarily to Focused tasks.
- FreightLink is the first desktop Working-mode app.
- Employee money lives in Banking.
- LedgerDesk is reserved for business ownership.
- CarrierSource remains visible but locked until later Career Play.
- Shop supports in-game progression/cosmetics/workspace customization.
- Global operational alerts live in one place.
- Entering/leaving the computer does not begin/end the operational day.
- Desktop presentation reuses the existing simulation engine.
- Early desktop testing uses intentional browser checkpoints.
- Full Steam packaging happens later, after the desktop experience is stable.

---

## 26. Next work packets

After this architecture document, the intended sequence is:

### Infrastructure packet

- one permanent GitHub verification workflow
- Vercel development-branch deployment guard
- no temporary per-feature workflows

### Desktop Build 1

Build the shell and experience defined in this document.

### Likely later packets

- FreightLink / Lane Review desktop conversion
- Documents + tactile paperwork
- Email / Messages desktop conversion
- Banking
- Shop
- physical workspace progression
- facility traffic/wait simulation
- business ownership / CarrierSource / LedgerDesk
- packaged desktop build
- Steam integration

---

This document should be updated deliberately when a major desktop architecture decision changes. Small implementation details do not require rewriting the architecture unless they alter the product contract above.
