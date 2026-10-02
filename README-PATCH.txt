DOC OS — P2.4-FD.4.1-TEST — Rate Confirmation Departure Gate
Branch: p2.4-experience-rebuild

Direct repository edits → automatic Vercel → refresh DOC OS on iPhone.

A driver cannot start a new freight leg until the current rate con is CONFIRMED.
Carrier approval and schedule acknowledgement do not bypass this requirement.
Automatic departures, queued promotion, itinerary handoff, and manual route sends
use the gate. Missing, pending, correction-requested, superseded, and wrong-load
documents cannot authorize departure. A corrected current document needs review.
Already-active travel/facility work is preserved; no mid-route reset or teleport.

Today’s Plan and Driver conversations explain DISPATCH HELD with REVIEW RATE CON.
Trip Plan and map driver panels also lead to the current document. Confirming
requires the four manual comparison checks on the displayed current document.
Marking a discrepancy as matched remains a player decision; future penalties
remain planned. Confirmation saves through the existing operation persistence.

Jordan now uses the Empire-to-Harborline lane name and REVIEW THE LANE instead
of DOC001 in his lesson. The fuller Lane Review redesign is the next UI slice.
Build Bible and Roadmap record the gameplay rule and lane-review requirements.

Build and 176 tests passed; no added runtime lint diagnostics. Browser checks
use a booked/acknowledged fixture with real document review, departure, and save
controls. Physical iPhone/full approval-booking/lane-redesign checks remain pending.
