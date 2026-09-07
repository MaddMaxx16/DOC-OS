# MASTER U — Unified Game Flow

## Purpose
Remove remaining tutorial/progression gates from the core operation so DOC001, DOC002, and later freight follow one consistent market lifecycle.

## Changes
- Tutorial mechanics default to dormant for new games and migrate dormant for existing saves.
- Removed load visibility dependency on `unlockAfterLoadId` / prior-load completion.
- Freight visibility is now governed by market post timing + operation day only.
- DOC001 posts at Day 1 7:00 AM.
- DOC002 posts at Day 1 10:00 AM independently of DOC001 completion, while retaining its next-day pickup appointment.
- Existing saves remove legacy `unlockAfterLoadId` during hydration.
- DOC001/DOC002 no longer receive special tutorial-shortened payment timing; standard payment timing applies consistently.
- Carrier application approval remains a real timed system event/email.
- Market waves, expiry, driver positioning, route logic, and load lifecycle remain unchanged.

## Locked rule
Emails may inform the player. They do not unlock freight or gate operational actions.
Loads post because of market time, not because a tutorial step was completed.
