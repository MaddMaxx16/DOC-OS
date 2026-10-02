DOC OS — P2.4-ENTRY.1-TEST — Metroline Employee-ID Welcome
Branch: p2.4-experience-rebuild

What changed
- Replaces the final opening placeholder with the Metroline employee-ID welcome.
- Shows the created avatar, player name, Junior Dispatcher role, and New York Operations.
- Continue saves the player identity/appearance to the active save slot.
- Resume returns directly to the saved ID; Back/Edit allows changes and resaving.
- A failed save stays in the creator and shows the existing save alert.
- New opening saves carry explicit Metroline employee career metadata.
- Operations remains dormant; START FIRST DAY is disabled until the real map handoff is ready.
- Build Bible and Roadmap reflect implemented and pending work.

Validation
- npm run build passed.
- Focused ESLint on the changed JSX passed.
- All 165 existing tests passed.
- Browser checks passed for clean creation, avatar consistency, save/resume, edits,
  long names, responsive access, simulated safe areas, and failed-save recovery.
- Physical iPhone layout/resume/battery acceptance is pending.

Update from GitHub (run in your existing DOC OS repository)
git switch p2.4-experience-rebuild
git pull --ff-only origin p2.4-experience-rebuild
npm ci
npm run ios

npm run ios builds, syncs the native iOS project, and opens Xcode.
Use the existing iPhone run workflow in Xcode.

ZIP alternative
This ZIP contains the full source snapshot in DOC-OS/ and no node_modules or build output.
Use a separate folder if reviewing the ZIP; the connected GitHub branch is canonical.

iPhone check
1. Finish your name and appearance; tap Continue.
2. Confirm the ID shows your exact avatar, name, role, and New York Operations.
3. Tap Edit your look, change one option, and Continue again.
4. Close/reopen the app and enter the saved profile: confirm it returns to the ID.
5. Check safe-area spacing and readability; scroll is available for short screens/long names.
6. START FIRST DAY is intentionally inactive in this slice. The next work is the Operations workspace.
7. Run the same five-minute battery sanity check used for the protected opening checkpoint.
