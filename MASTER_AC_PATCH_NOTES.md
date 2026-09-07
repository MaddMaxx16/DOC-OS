# MASTER AC — Metroline Agreement UX Polish

Base: DOC-OS-MASTER-2026-09-06-AB

## Scope
Focused agreement UX correction only. Master AB communications, Marcus briefing gameplay, Freight Market v1, routing, facility timing, load lifecycle, Documents ownership, and simulation-state contracts remain intact.

## Agreement Layout
- Reworked the Metroline Dispatch Operating Agreement into a compact two-column layout.
- Left column: **Shift goals**.
- Right column: **Operating expectations**.
- Carrier priorities remain in a compact full-width summary beneath the columns.
- The signed read-only copy in Documents mirrors the same structure.

## Electronic Signature
Removed the typed dispatcher-name input.

New flow:
`REVIEW AGREEMENT -> SIGN & SUBMIT -> AGREEMENT ACCEPTED`

- **SIGN & SUBMIT** itself is the explicit electronic-signature action.
- New agreements record `Authorized Dispatcher` as the signer plus the authoritative in-game timestamp.
- No text field means the agreement no longer invokes the iOS keyboard.
- This also removes the agreement-specific small-font input that could cause WKWebView/iOS viewport zoom to remain enlarged after submission.

## Unchanged Ownership
Agreement acceptance still explicitly:
- accepts the Metroline carrier relationship,
- activates Metroline/Marcus,
- archives the signed agreement in Documents,
- creates Marcus's introduction message.

Reading/opening the agreement still does not activate the carrier. No communication action dispatches or moves the driver.
