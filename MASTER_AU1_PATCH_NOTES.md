# MASTER AU1 — Map & Communication Language

- Brighter project-wide purple attention language for notification badges and Operations alerts.
- Driver Fit is checked before committing an available FreightLink load.
- Detailed driver card removed from the map; Drivers drawer and Messages own driver detail.
- Waiting-for-dock text removed from Marcus; a circular progress ring shows wait progress.
- Pickup/delivery facilities show a compact `!` only when player action is required.
- Dock-ready no longer globally pauses the simulation; high speed returns to 1x.
- Pickup and delivery dispatch can be issued explicitly from the driver text thread with an outbound route-sent message.
- Driver message threads automatically stay at the newest message.

Multi-driver note: dock-ready no longer freezes other drivers. Loading/unloading challenge modals still pause the shared clock while open in AU1; per-driver challenge-time simulation is a later architecture step.
