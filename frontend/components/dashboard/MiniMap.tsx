'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, SOURCE_COLORS } from '@/lib/types'

interface MiniMapProps {
  pins: MapPin[]
  centerLat?: number
  centerLng?: number
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

const DEFAULT_CENTER: [number, number] = [-73.99, 40.73]
const DEFAULT_ZOOM = 14
const DEFAULT_PITCH = 62
const DEFAULT_BEARING = -15

const LANDMARK_REGISTRY = [
  { id: 'esb', title: 'Empire State Building', subtitle: 'Iconic Landmark', rating: '4.8', lat: 40.7484, lng: -73.9857, color: 'gold' as const },
  { id: 'wtc', title: 'One World Trade Center', subtitle: 'Hero Skyscraper', rating: '4.9', lat: 40.7127, lng: -74.0134, color: 'cyan' as const },
]

const LEGEND = [
  { label: 'LANDMARKS', color: '#fbbf24' },
  { label: 'COMPLAINTS', color: '#ef4444' },
  { label: 'PERMITS', color: '#3b82f6' },
  { label: 'INSPECTIONS', color: '#84cc16' },
  { label: 'VIOLATIONS', color: '#f59e0b' },
]

export default function MiniMap({ pins, centerLat, centerLng }: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const markersRef = useRef<Map<string, unknown>>(new Map())
  const landmarkRootsRef = useRef<Map<string, { unmount: () => void }>>(new Map())
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current || mapRef.current) return

    let destroyed = false

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')
      mapboxgl.accessToken = MAPBOX_TOKEN

      if (destroyed || !mapContainer.current) return

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: centerLng && centerLat ? [centerLng, centerLat] : DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        antialias: true,
        attributionControl: false,
      })

      map.on('style.load', () => {
        if (destroyed) return

        // 3D buildings
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
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.8,
              'fill-extrusion-vertical-gradient': true,
            },
          })
        }

        map.setFog({
          range: [0.5, 7],
          color: '#07111D',
          'high-color': '#0B1D31',
          'space-color': '#000005',
          'star-intensity': 0.9,
        })
      })

      map.on('load', () => {
        if (destroyed) return
        mapRef.current = map
        setMapLoaded(true)

        // Add landmark markers
        addLandmarkMarkers(map, mapboxgl)
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addLandmarkMarkers = async (map: any, mapboxgl: any) => {
      const { createRoot } = await import('react-dom/client')
      const { default: MapEvidenceCard } = await import('./MapEvidenceCard')

      LANDMARK_REGISTRY.forEach(landmark => {
        if (markersRef.current.has(landmark.id)) return

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
        markersRef.current.set(landmark.id, marker)
        landmarkRootsRef.current.set(landmark.id, root)
      })
    }

    initMap()

    return () => {
      destroyed = true
      // Defer React root unmounts to avoid unmounting during a render cycle
      const roots = Array.from(landmarkRootsRef.current.values())
      landmarkRootsRef.current.clear()
      setTimeout(() => roots.forEach(root => root.unmount()), 0)
      // Clean up markers
      markersRef.current.forEach(marker => (marker as { remove: () => void }).remove())
      markersRef.current.clear()
      // Clean up map
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove()
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync backend pins to markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    const initPins = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      const map = mapRef.current as InstanceType<typeof mapboxgl.Map>
      const existing = markersRef.current
      const currentIds = new Set(pins.map(p => p.id))

      // Remove markers no longer in pins (skip landmarks)
      existing.forEach((marker, id) => {
        if (!currentIds.has(id) && !LANDMARK_REGISTRY.some(l => l.id === id)) {
          (marker as { remove: () => void }).remove()
          existing.delete(id)
        }
      })

      // Add new pins
      pins.forEach(pin => {
        if (existing.has(pin.id)) return

        const color = SOURCE_COLORS[pin.source] || '#84cc16'
        const el = createMarkerEl(color)

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map)
        existing.set(pin.id, marker)
      })
    }

    initPins()
  }, [pins, mapLoaded])

  // Fly to explicit center when provided
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !centerLat || !centerLng) return

    const map = mapRef.current as { flyTo: (opts: Record<string, unknown>) => void }
    map.flyTo({
      center: [centerLng, centerLat],
      zoom: 14.5,
      duration: 1500,
      essential: true,
    })
  }, [centerLat, centerLng, mapLoaded])

  // No token — CSS fallback
  if (!MAPBOX_TOKEN) {
    return <CssFallbackMap pins={pins} />
  }

  return (
    <div className="absolute inset-0 w-full h-full min-h-screen bg-[#07111D] z-0">
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-1.5 pointer-events-none">
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-[9px] tracking-[0.2em] font-bold text-white/40 uppercase font-mono">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function createMarkerEl(color: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:relative;width:16px;height:16px;'

  const dot = document.createElement('div')
  dot.style.cssText = `
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width:8px; height:8px; border-radius:50%;
    background:${color}; box-shadow:0 0 6px ${color}80;
  `
  wrapper.appendChild(dot)

  const ring = document.createElement('div')
  ring.style.cssText = `
    position:absolute; top:50%; left:50%;
    width:18px; height:18px; border-radius:50%;
    border:1px solid ${color}60;
    animation: ringOut 2s ease-out infinite;
  `
  wrapper.appendChild(ring)

  wrapper.style.transform = 'scale(0)'
  wrapper.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
  requestAnimationFrame(() => {
    wrapper.style.transform = 'scale(1)'
  })

  return wrapper
}

// ─── CSS Fallback (no Mapbox token) ──────────────────────────────────────────

function CssFallbackMap({ pins }: { pins: MapPin[] }) {
  return (
    <div className="absolute inset-0 w-full h-full min-h-screen bg-[#07111D] z-0">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
      }}/>

      <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.03] pointer-events-none"/>
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.03] pointer-events-none"/>

      {[120, 60].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full border border-dashed pointer-events-none"
          style={{
            width: size, height: size,
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            borderColor: `rgba(132,204,22,${i === 0 ? 0.08 : 0.14})`,
          }}
        />
      ))}

      <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10 }}>
        <div className="w-2.5 h-2.5 rounded-full bg-green" style={{ boxShadow: '0 0 8px rgba(132,204,22,0.6)' }}/>
      </div>

      {pins.map((pin) => {
        const color = SOURCE_COLORS[pin.source] || '#84cc16'
        return (
          <div
            key={pin.id}
            className="absolute"
            style={{
              top: `${45 + (pin.lat - 40.73) * 400}%`,
              left: `${50 + (pin.lng + 73.99) * 400}%`,
            }}
          >
            <div
              className="rounded-full"
              style={{ width: 8, height: 8, background: color, boxShadow: `0 0 5px ${color}80` }}
            />
          </div>
        )
      })}

      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-1.5 pointer-events-none">
        {[
          { label: 'COMPLAINTS', color: '#ef4444' },
          { label: 'PERMITS', color: '#3b82f6' },
          { label: 'INSPECTIONS', color: '#84cc16' },
          { label: 'VIOLATIONS', color: '#f59e0b' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-[9px] tracking-[0.2em] font-bold text-white/40 uppercase font-mono">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
