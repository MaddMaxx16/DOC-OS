import { useEffect, useRef } from 'react'
import { LngLatBounds, Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapLocations from '../data/mapLocations.js'

setWorkerUrl(workerUrl)

function GameMap() {
  const mapContainer = useRef(null)

  useEffect(() => {
    const map = new Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-73.9857, 40.7484],
      zoom: 10,
      attributionControl: { compact: true, position: 'bottom-left' },
    })
    map.resize()

    const markers = []
    map.on('load', () => {
      const bounds = new LngLatBounds()

      mapLocations.forEach((location) => {
        bounds.extend([location.longitude, location.latitude])
        const markerElement = document.createElement('div')
        markerElement.className = `game-marker ${location.type}`
        markerElement.textContent = location.type === 'pickup'
          ? 'P'
          : location.type === 'delivery'
            ? 'D'
            : 'T'

        const popupContent = document.createElement('div')
        const name = document.createElement('strong')
        name.textContent = location.name
        const type = document.createElement('span')
        type.textContent = location.type[0].toUpperCase() + location.type.slice(1)
        popupContent.append(name, type)

        const popup = new Popup({ offset: 20 }).setDOMContent(popupContent)
        const marker = new Marker({ element: markerElement })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(popup)
          .addTo(map)

        markers.push(marker)
      })

      map.fitBounds(bounds, { padding: 50, maxZoom: 12 })
    })

    return () => {
      markers.forEach((marker) => marker.remove())
      map.remove()
    }
  }, [])

  return <div ref={mapContainer} className="game-map" />
}

export default GameMap
