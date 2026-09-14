# CS2.0A.14.1 — Facility Attention Badge Hotfix

Fixes the facility `!` cue not appearing reliably on iPhone.

The A.14 state logic was correct, but the visual cue depended on a CSS `::after` pseudo-element attached to a MapLibre DOM marker. On iOS/WKWebView, class changes on an existing marker did not reliably repaint that pseudo-element.

A.14.1 renders the attention cue as a real child DOM element inside the live P/D marker and toggles it directly from the same facility-attention state.

No operational logic changed.
