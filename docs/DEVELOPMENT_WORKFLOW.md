# DOC OS Development Workflow

This document defines the working process for building DOC OS with Maxx and an AI coding assistant.

The goal is to keep development fast without creating noisy Git history, excessive CI runs, unnecessary Vercel deployments, or half-finished architecture.

---

## 1. The development loop

The standard DOC OS loop is:

**Discuss → Lock scope → Build → Verify → Merge → Phone test → Collect feedback → Next packet**

### Discuss

Before implementation, agree on what problem is being solved.

For UX work, identify:
- what feels wrong now,
- what the player should understand or be able to do instead,
- which screen(s) or flow(s) are in scope.

For architecture work, identify:
- the new source of truth,
- which legacy assumptions are being replaced,
- compatibility/migration needs,
- runtime systems that depend on the architecture,
- regression tests required.

### Lock scope

A work packet should be specific enough that implementation can proceed without repeatedly redefining the goal.

Example:

> **P2.5 Driver Manifest Architecture**
> - stop order is the source of truth,
> - multiple loads may be onboard,
> - pickups and deliveries may interleave,
> - trailer capacity is enforced,
> - FreightLink/HOS/runtime all use the same manifest,
> - Day 1 demonstrates the architecture.

That is one work packet.

A button alignment change may also be one small work packet.

---

## 2. Branch strategy

### Phone-test checkpoint

The current native iPhone checkpoint branch is:

`p2.4-experience-rebuild`

This branch should remain stable enough for Maxx to reload and test.

It is **not** the assistant's scratch branch.

### Feature branches

Create a dedicated feature branch for substantial work.

Examples:

- `p2.5-driver-manifest-architecture`
- `p2.5-manifest-ui-polish`
- `p2.5-day1-staging-lesson`

Branch from the current checkpoint branch unless a different base is explicitly agreed.

### Merge style

Use a squash merge for a completed work packet.

The checkpoint branch should receive one coherent checkpoint commit rather than a long stream of internal implementation commits.

---

## 3. Commit discipline

### Preferred

One coherent implementation commit, followed by at most one or a small number of grouped correction commits if verification exposes issues.

### Avoid

Do not do this:

```text
edit file A → commit
edit file B → commit
change copy → commit
fix typo → commit
update test → commit
change CSS → commit
```

Every push can create:
- another CI run,
- another Vercel preview attempt,
- another notification,
- more repository noise.

Instead:

```text
edit A + B + tests + CSS + migration
→ one coherent commit
→ verify
→ grouped correction if needed
```

When using GitHub APIs, prefer creating a Git tree containing all related file changes, then creating one commit from that tree.

---

## 4. Verification

The canonical project verification command is:

```bash
npm run verify
```

The current package script runs the repository's lint/tests/build verification chain.

### Merge gate

A work packet is ready to merge when:
- lint passes,
- automated tests pass,
- production build passes,
- temporary development artifacts are removed,
- migration behavior has been considered where relevant.

### Test failures

A failing intermediate run is not automatically evidence that the feature is fundamentally broken.

When verification fails:

1. Read all failures.
2. Separate stale test expectations from true runtime regressions.
3. Fix the complete related failure set.
4. Re-run the full verification gate.
5. Merge only after green.

Do not weaken correct product behavior merely to satisfy a stale test. Update the test contract when the intentional product contract changed.

---

## 5. CI policy

DOC OS should have **one permanent verification workflow**, not a new workflow per feature.

Desired permanent workflow behavior:

- run on pull requests into the phone-test checkpoint branch,
- run on pull requests into `main`,
- allow manual runs,
- execute `npm ci`,
- execute `npm run verify`.

### Never

Do not repeatedly create files such as:

```text
.github/workflows/p25-feature-check.yml
.github/workflows/day1-fix-check.yml
.github/workflows/temp-build-check.yml
```

and then delete them after the feature.

If the permanent verifier does not exist yet, create it once as its own infrastructure work packet.

---

## 6. Vercel policy

DOC OS development is primarily validated in the native iPhone app.

Vercel previews are useful only when a web preview is specifically needed.

### Why this matters

A branch push may trigger a Vercel preview deployment. During rapid development, many small pushes can consume deployment quotas even when the code itself is healthy.

Therefore:

- development branches should not automatically create unnecessary Vercel previews,
- do not treat a Vercel quota error as a code compilation failure,
- use GitHub verification results to judge code health,
- request a Vercel preview intentionally when browser testing is needed.

The repository should eventually include a stable Vercel branch-deployment policy rather than relying on manual restraint.

---

## 7. Native iPhone checkpoint handoff

After a successful merge into the checkpoint branch, the assistant should give Maxx:

### Checkpoint

The merge commit SHA.

### What changed

A short explanation of the completed work packet.

### What to test

A precise scenario, for example:

```text
Reload the native app.

Test:
1. Book Load 1.
2. Open Jordan's recommended Load 2.
3. Confirm manifest shows P1 → P2 → D1 → D2.
4. Confirm trailer state shows both loads onboard after P2.
5. Continue through lunch and Load 3.
```

### Commands

Do **not** provide terminal commands by default.

Maxx normally reloads the native iPhone app.

Give terminal/Xcode/pull commands only if the current task actually requires a native rebuild, dependency change, Capacitor sync, signing action, or another step that cannot be picked up by normal reload.

---

## 8. Feedback packets

During phone testing, Maxx may send screenshots, recordings, or several observations.

Do not immediately push after every individual observation if they are part of the same problem.

Prefer:

```text
Observation 1
Observation 2
Observation 3
→ agree on final design
→ one polish work packet
→ one verification
→ one merge
```

A severe blocker or crash can still justify an immediate focused fix.

---

## 9. Repository cleanliness

At the end of each work packet:

- remove temporary debug UI unless intentionally retained,
- remove temporary workflow files,
- remove abandoned implementation branches/files when appropriate,
- do not keep duplicate legacy systems active beside their replacement,
- keep terminology consistent,
- update tests to match the new contract,
- preserve migrations needed for existing saves,
- avoid "old garbage" remaining in the runtime path.

Architecture replacements should clearly identify the new source of truth.

---

## 10. Architecture work

For major architecture changes, explicitly answer these questions before merge:

1. What is the new source of truth?
2. Which old assumption is being removed?
3. Which systems consume the new truth?
4. How are existing saves migrated?
5. What compatibility bridge remains, if any?
6. What regression tests prove the new invariant?
7. Does the player-facing UI expose the same logic the engine actually uses?

Example from P2.5:

- Source of truth: driver manifest stop order.
- Removed assumption: one complete load must finish before the next pickup.
- Consumers: FreightLink fit, HOS, itinerary, trailer state, runtime handoff, movement, tutorial UI.
- Compatibility bridge: legacy "active load" fields may remain temporarily but do not own stop order.
- Regression invariant: sequences such as `P1 → P2 → D1 → P3 → D2 → D3` must work.

---

## 11. Communication rules

The assistant should tell Maxx when:
- the scope is locked,
- verification found a real blocker,
- a migration will reset or modify unfinished save state,
- a checkpoint is merged and ready to test.

The assistant should **not** flood the conversation with every internal file edit or tiny commit.

Progress updates should describe meaningful milestones.

---

## 12. Workflow summary

### Normal feature

```text
Agree on design
↓
Create feature branch
↓
Batch implementation
↓
One coherent commit
↓
npm run verify
↓
Grouped correction if needed
↓
npm run verify
↓
Squash merge to checkpoint
↓
Maxx reloads native app
↓
Test checkpoint
```

### What we are avoiding

```text
tiny edit
↓
push
↓
CI
↓
Vercel
↓
email
↓
tiny edit
↓
push
↓
CI
↓
Vercel
↓
email
...
```

The first loop is the permanent DOC OS workflow.
