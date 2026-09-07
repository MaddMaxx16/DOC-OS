# DOC OS Master E — Accent Sweep

## Scope
Visual-only accent cleanup. No load lifecycle, routing, alert behavior, message behavior, or game-state logic changed.

## Locked accent language
- Smoked plum `#756D80` = ordinary selected, active, focused, and primary-action emphasis.
- Soft plum-gray `#A49BAE` = accent text/icons.
- Deep plum-gray `#554F5D` = selected borders / subdued accent edges.
- Tutorial blue `#4C8DFF` = reserved only for the future tutorial guidance layer.
- Green / orange / red remain semantic status colors (success / attention / danger), not selection colors.

## Project-wide changes
- Replaced legacy blue selection/action accents throughout the current UI with lavender.
- Replaced legacy blue-tinted selection backgrounds, borders, glows, route accents, selected cards, action buttons, and map selection emphasis.
- Replaced the amber selection language introduced in Master D with lavender.
- Normal route/action emphasis now uses lavender.
- Tutorial blue remains defined separately for the future guided tutorial layer.

## Regression rule
This pass is visual only. DOC001 and DOC002 lifecycle behavior must remain identical to Master D.
