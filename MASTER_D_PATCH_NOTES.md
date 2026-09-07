# MASTER D — Interaction Polish

## Scope
No gameplay lifecycle changes.

## Changes
1. Facility popup owns the facility interaction surface. While a pickup/delivery facility popup is open, the driver's WAITING / LOADING / UNLOADING / POD status pill is hidden to prevent visual overlap.
2. Once Marcus enters `en-route-pickup` or `en-route-delivery`, an open Marcus map popup closes automatically after 1.8 seconds. This lets the player see the state change without leaving a card covering the map during travel.
3. Normal selected/open/active emphasis now uses DOC OS amber (`#D9A45B`) instead of blue in the current high-visibility interaction surfaces.
4. Tutorial blue (`#4C8DFF`) remains reserved for future `.tutorial-target` guidance only.

## Regression expectations
- DOC001 / DOC002 lifecycle remains unchanged.
- Facility Check In continues to work from the facility popup.
- Operational status pills return when the facility popup closes.
- Driver popup can still be reopened manually while en route after auto-close.
