# MASTER L — FreightLink Lifecycle Cohesion

- Audited FreightLink home routing: DOC001, DOC002, and later loads all use the same `LoadBoardScreen` shell.
- AVAILABLE / ACTIVE / HISTORY filters are now explicitly protected as part of the FreightLink shell and are not tutorial/load-specific.
- Main-map FreightLink browse pickup and delivery markers now reuse the exact operational `.game-marker pickup` and `.game-marker delivery` visual language.
- Selected browse pickup gets only a subtle selection ring; its base icon no longer changes shape/color.
- No load lifecycle, assignment, planning, dispatch, or simulation logic changed.
