import { useEffect, useRef } from 'react'
import { AttributionControl, Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)

const NEW_YORK_START_VIEW = {
  // Same base map and center as the live operations workspace, just framed wider.
  center: [-73.9857, 40.7484],
  zoom: 9.55,
}

const NEW_YORK_MARKET_VIEW = {
  // Match GameMap's normal New York opening camera for a cleaner handoff
  // when the player starts the market.
  center: [-73.9857, 40.7484],
  zoom: 9.9,
}

function EntryLiveMap({ stage, selectedMarket }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  useEffect(() => {
    if (!containerRef.current) return undefined

    const map = new MapLibreMap({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: NEW_YORK_START_VIEW.center,
      zoom: NEW_YORK_START_VIEW.zoom,
      attributionControl: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      renderWorldCopies: false,
      fadeDuration: 0,
      maxTileCacheZoomLevels: 2,
      validateStyle: false,
      interactive: false,
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: false,
      keyboard: false,
      doubleClickZoom: false,
      scrollZoom: false,
      boxZoom: false,
    })

    mapRef.current = map
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      map.resize()

      const attribution = map.getContainer().querySelector('.maplibregl-ctrl-attrib')
      const attributionButton = attribution?.querySelector('.maplibregl-ctrl-attrib-button')
      attribution?.classList.remove('maplibregl-compact-show')
      attribution?.classList.add('docos-map-attribution', 'entry-map-attribution')

      if (attributionButton) {
        attributionButton.classList.add('docos-map-attribution-button')
        attributionButton.style.setProperty('background', 'rgba(15, 17, 21, 0.88)', 'important')
        attributionButton.style.setProperty('background-image', 'none', 'important')
        attributionButton.style.setProperty('border', '1px solid rgba(76, 84, 99, .58)', 'important')
        attributionButton.style.setProperty('border-radius', '999px', 'important')
        attributionButton.style.setProperty('appearance', 'none', 'important')
        attributionButton.style.setProperty('-webkit-appearance', 'none', 'important')
        attributionButton.replaceChildren()

        const infoGlyph = document.createElement('span')
        infoGlyph.className = 'docos-map-attribution-glyph'
        infoGlyph.textContent = 'i'
        infoGlyph.setAttribute('aria-hidden', 'true')
        attributionButton.appendChild(infoGlyph)
      }

      // PERF 1 — keep the entry map visually alive through stage changes only.
      // The previous 12-second repeating camera drift kept WebGL rendering almost
      // continuously on mobile even when the player was simply reading the screen.
    })

    const resize = () => map.resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const view = stage === 'market' && selectedMarket === 'new-york'
      ? NEW_YORK_MARKET_VIEW
      : stage === 'market'
        ? NEW_YORK_MARKET_VIEW
        : NEW_YORK_START_VIEW

    const applyView = () => map.easeTo({
      center: view.center,
      zoom: view.zoom,
      duration: 1500,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    })

    if (map.loaded()) applyView()
    else map.once('load', applyView)
  }, [stage, selectedMarket])

  return (
    <div className="entry-live-map" aria-hidden="true">
      <div ref={containerRef} className="entry-live-map-canvas" />
      <div className="entry-live-map-tone" />
    </div>
  )
}

export default EntryLiveMap
