# DOC OS Master K Patch Notes

## Driver assignment white-screen fix
- Fixed a React render crash after ASSIGN LOAD in FreightLink.
- The compact Driver Assignment row was rendering the driver's `equipment` object directly as JSX.
- It now renders `equipment.label` (for Marcus: `53' Dry Van`) instead.
- No load lifecycle, assignment, routing, or dispatch logic was changed.

## Regression path
FreightLink → Available → Load → Accept Load → Select Driver → Marcus → Assign Load → Load Details.
