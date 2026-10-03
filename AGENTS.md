# DOC OS — Agent Working Agreement

This file is the source of truth for how AI-assisted development should be performed in this repository.

Before making repository changes, read this file and `docs/DEVELOPMENT_WORKFLOW.md`.

## Core rule

**Design the work packet first. Build it as one coherent change. Verify it once. Merge only when green.**

Do not use the repository as a scratchpad.

## Required workflow

1. **Lock the work packet before coding**
   - Discuss the feature, bug, UX change, or architecture change with Maxx first.
   - Define the goal, scope, expected behavior, and test scenario.
   - For small obvious fixes, the current agreed request can itself be the locked work packet.

2. **Use a dedicated feature branch**
   - Branch from the current phone-test checkpoint branch.
   - Current checkpoint branch: `p2.4-experience-rebuild`.
   - Do not change the checkpoint branch name unless Maxx and the assistant explicitly decide to replace it.

3. **Batch related edits**
   - A commit represents a coherent tested change, not one edited file.
   - Prefer one implementation commit for a work packet.
   - If verification finds problems, group related corrections into one follow-up commit.
   - Do not create a new commit after every file edit, screenshot, or small thought.

4. **Do not create temporary CI workflows**
   - Never add a one-off `.github/workflows/*check.yml` for an individual feature and delete it later.
   - Use the repository's permanent verification workflow when available.
   - `npm run verify` remains the target full-repository verification command.
   - Until the existing lint baseline is cleaned, permanent CI blocks on lint for changed JS/JSX, the full automated test suite, and the production build; it also reports the full-repo lint audit as a visible non-blocking debt signal.

5. **Keep Vercel out of normal native-development churn**
   - DOC OS is tested primarily as a native iPhone app.
   - Development branches should not generate unnecessary Vercel preview deployments.
   - Do not request or create a Vercel preview unless the web preview is actually needed for the task.
   - A Vercel deployment quota failure is not automatically a code/build failure; verify those separately.

6. **Merge only verified code**
   - Run the permanent verification gate before merge.
   - Current blocking gate: changed-file lint + automated tests + production build.
   - Full-repo lint remains visible but non-blocking only while documented legacy lint debt exists.
   - Do not introduce new lint failures in touched source files.
   - When the legacy lint baseline is cleared, restore full `npm run verify` as the blocking gate.
   - If verification fails, inspect the whole failure set and fix it as a batch.
   - Do not merge known new failures.

7. **Checkpoint testing**
   - After a verified squash merge into `p2.4-experience-rebuild`, provide:
     - the checkpoint commit SHA,
     - what changed,
     - the exact scenario Maxx should test.
   - Maxx normally tests by reloading the native iPhone app.
   - Do not provide terminal/pull instructions unless they are genuinely required.

8. **Collect feedback before the next patch**
   - When practical, gather multiple related findings from phone testing into one polish packet.
   - Avoid a new repository push for every screenshot or tiny visual observation.

9. **Keep the repository clean**
   - Do not leave temporary workflow files, abandoned implementation files, duplicate systems, obsolete patches, or dead experimental code behind.
   - Prefer replacing old architecture cleanly over layering another competing system on top.
   - Add regression tests for architecture changes and meaningful bug fixes.

## Development priorities

When rules compete, prefer:

1. Correct game/state architecture
2. A clear player-facing experience
3. Regression safety
4. Clean repository history
5. Fast iteration

Fast iteration does **not** mean many tiny pushes. It means fewer, better work packets.

## Native iPhone testing

The usual loop is:

**Design → feature branch → batched implementation → verify → squash merge → reload native app → test checkpoint**

The native app reload is the normal test handoff. Do not assume Vercel or a browser preview is required.

## More detail

See `docs/DEVELOPMENT_WORKFLOW.md`.
