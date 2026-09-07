# MASTER AO PATCH NOTES

## Loading Challenge briefing
- Branched from tested Master AN.
- Added a short pre-challenge briefing so the player can read the freight-placement rule before the dock timer starts.
- First loading challenge in the current app session shows a 2-second briefing: HEAVY -> FRONT, STANDARD -> CENTER, FRAGILE -> REAR.
- Later loading challenges in the same session show a brief 0.65-second LOADING CHALLENGE title instead of repeating the full tutorial.
- Briefing fades out over 0.32 seconds into the existing loading board.
- Dock timer does not start until the briefing has fully cleared.
- Dragging, keyboard loading, and auto-completion are blocked during the briefing.
- No changes to pallet puzzle rules, damage/shortage scoring, delays, shipment manifest, or load lifecycle.
