# PATCH NOTES

## CS2.0B.4.2.6-STABLE — Compact Email Workflow Promotion

This cumulative promotion patch moves the fully acceptance-tested Email work from the disposable B.4.2.6 test chain into the protected real repository.

### Promoted behavior
- Locked Review → Send for required operational workflow emails.
- Conventional email presentation with To, Subject, open message body, attachments, and one Send action.
- Fixed/non-bouncing workflow review surface.
- Three required attachments compact correctly instead of being cut off.
- Schedule Approval keeps one multi-load batch email with time-neutral copy.
- Pickup exception alert opens the formal correction email; the driver remains held until SEND.
- POD document correction continues through the same formal Email contract.
- Invoice + approved POD submission uses the locked review workflow.
- Existing response timing and protected B.4.2 multi-day Operations behavior remain unchanged.

### Known issue intentionally deferred
Documents can still offer Request Correction after a corrected POD has already been received, and older POD exception context can appear in later document views. This is a B.4.3 document-version/lifecycle architecture issue and is intentionally not patched during Email promotion.

### Next roadmap phase
`CS2.0B.4.3 — Documents & Rate Confirmation Workflow`
