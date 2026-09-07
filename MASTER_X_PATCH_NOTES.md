# MASTER X — Normal Market From Game Start

## Goal
Remove the last tutorial/operation-day gates from FreightLink so the first operation uses the same market rules as later play.

## Changes
- DOC101–DOC110 now participate in the normal market from Day 1.
- Their market waves remain timed; loads are not all dumped onto the board at once.
- DOC001 and DOC002 are ordinary freight entries, not progression unlocks.
- Removed operation-day gating from FreightLink list and map visibility.
- Removed Day-2 special freight reset behavior.
- Removed the Day-2 mentor email as a gameplay transition dependency.
- End Day is now part of the normal operation loop and is not unlocked by a tutorial email.
- Legacy saves with `scheduledOperationDay` are migrated away from that gate; untouched available freight is normalized back to the seed market timeline.
- Existing accepted/completed/history loads preserve their real state and dates during migration.

## Market timing
Fresh-save normal freight posts in waves using `postedGameMinute` / `marketPostMinutes`:
- 7:00 AM: DOC001
- 8:00 AM: DOC101, DOC102
- 8:30 AM: DOC103
- 9:30 AM: DOC104, DOC105
- 10:00 AM: DOC002
- 12:00 PM: DOC106, DOC107
- 2:30 PM: DOC108, DOC109
- 5:00 PM: DOC110

Expired pickup windows continue to move unaccepted freight to History.
