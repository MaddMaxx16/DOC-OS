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
  const driftTimerRef = useRef(null)
  const stageRef = useRef(stage)

  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  useEffect(() => {
    if (!containerRef.current) return undefined

    const map = new MapLibreMap({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: NEW_YORK_START_VIEW.center,
      zoom: NEW_YORK_START_VIEW.zoom,
      attributionControl: false,
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

      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (!reducedMotion) {
        let phase = false
        const drift = () => {
          const base = stageRef.current === 'market' ? NEW_YORK_MARKET_VIEW : NEW_YORK_START_VIEW
          const offset = phase ? [0.028, 0.012] : [-0.022, -0.01]
          phase = !phase
          map.easeTo({
            center: [base.center[0] + offset[0], base.center[1] + offset[1]],
            zoom: base.zoom + (phase ? 0.04 : 0),
            duration: 12000,
            easing: (t) => t * t * (3 - 2 * t),
          })
        }
        drift()
        driftTimerRef.current = window.setInterval(drift, 12200)
      }
    })

    const resize = () => map.resize()
    window.addEventListener('resize', resize)

    return () => {
      if (driftTimerRef.current) window.clearInterval(driftTimerRef.current)
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
