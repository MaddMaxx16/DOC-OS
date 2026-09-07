# MASTER W PATCH NOTES

## Marker resume / re-entry hardening

- Fixed a remaining iOS/WKWebView re-entry race where the MapLibre route layer could restore while DOM-backed Marcus, pickup, and delivery markers remained missing.
- Operational markers no longer wait for MapLibre style readiness; DOM markers can be recreated as soon as the map instance is ready.
- On `visibilitychange`, `pageshow`, and window `focus`, DOC OS now treats operational marker DOM as disposable and rebuilds it from current game state.
- Resume recovery now calls `map.resize()` and performs two short settle retries (90 ms and 360 ms) so late WebView layout/style hydration cannot strand the route without markers.
- No load lifecycle, routing, dispatch, market, or camera behavior changed.
