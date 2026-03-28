'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { createRoot } from 'react-dom/client'
import MapEvidenceCard from './MapEvidenceCard'

interface MiniMapProps {
  pins?: any[]
  centerLat?: number
  centerLng?: number
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

const LANDMARK_REGISTRY = [
  { id: 'esb', title: 'Empire State Building', subtitle: 'Iconic Landmark', rating: '4.8', lat: 40.7484, lng: -73.9857, color: 'gold' as const },
  { id: 'wtc', title: 'One World Trade Center', subtitle: 'Hero Skyscraper', rating: '4.9', lat: 40.7127, lng: -74.0134, color: 'cyan' as const }
]

export default function MiniMap({ pins = [], centerLat, centerLng }: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const [styleLoaded, setStyleLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    // CRITICAL: Ensure container size is non-zero before initializing
    const init = () => {
      if (!mapContainer.current) return;

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-73.99, 40.73],
        zoom: 14,
        pitch: 62,
        bearing: -15,
        antialias: true,
        attributionControl: false
      })

      map.on('style.load', () => {
        setStyleLoaded(true)

        // Add 3D Buildings
        if (!map.getLayer('3d-buildings')) {
          map.addLayer({
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': '#0D1B2A',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.8,
              'fill-extrusion-vertical-gradient': true
            }
          })
        }
      })

      map.on('load', () => {
        mapRef.current = map
      })

      return map;
    }

    const map = init();

    return () => {
      map?.remove()
      mapRef.current = null
    }
  }, [])

  // Manage Markers
  useEffect(() => {
    if (!mapRef.current || !styleLoaded) return
    const map = mapRef.current
    const existing = markersRef.current

    LANDMARK_REGISTRY.forEach(landmark => {
      if (!existing.has(landmark.id)) {
        const el = document.createElement('div')
        const root = createRoot(el)
        root.render(
          <MapEvidenceCard
            id={landmark.id}
            title={landmark.title}
            subtitle={landmark.subtitle}
            rating={landmark.rating}
            status="active"
            position={{ x: 0, y: 0 }}
            color={landmark.color}
          />
        )

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom-left', offset: [20, -20] })
          .setLngLat([landmark.lng, landmark.lat])
          .addTo(map)
        existing.set(landmark.id, marker)
      }
    })
  }, [styleLoaded])

  return (
    <div className="absolute inset-0 w-full h-full min-h-screen bg-[#07111D] z-0">
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}
        className="mapbox-viewport"
      />

      {/* Legend Override */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
          <span className="text-[9px] tracking-[0.2em] font-bold text-white/40 uppercase font-mono">Landmark_Glow</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <span className="text-[9px] tracking-[0.2em] font-bold text-white/40 uppercase font-mono">Intelligence_node</span>
        </div>
      </div>
    </div>
  )
}
