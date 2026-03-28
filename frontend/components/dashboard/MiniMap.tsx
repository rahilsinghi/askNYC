'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, SOURCE_COLORS } from '@/lib/types'

interface MiniMapProps {
  pins: MapPin[]
  centerLat?: number
  centerLng?: number
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

// NYC default center (City Hall area)
const DEFAULT_CENTER: [number, number] = [-73.9857, 40.7484]
const DEFAULT_ZOOM = 13.5

const LEGEND = [
  { label: 'COMPLAINTS', color: '#ef4444' },
  { label: 'PERMITS',    color: '#3b82f6' },
  { label: 'INSPECTIONS',color: '#84cc16' },
  { label: 'VIOLATIONS', color: '#f59e0b' },
]

export default function MiniMap({ pins, centerLat, centerLng }: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current || mapRef.current) return

    let map: mapboxgl.Map

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      mapboxgl.accessToken = MAPBOX_TOKEN

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: centerLng && centerLat ? [centerLng, centerLat] : DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: 0,
        attributionControl: false,
        logoPosition: 'bottom-right',
      })

      // Strip chrome — keep it minimal
      map.getCanvas().style.cursor = 'default'

      map.on('load', () => {
        mapRef.current = map
        setMapLoaded(true)
      })
    }

    initMap()

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()
      map?.remove()
      mapRef.current = null
    }
  }, [centerLat, centerLng])

  // Sync pins to markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const existing = markersRef.current
    const currentIds = new Set(pins.map(p => p.id))

    // Remove markers no longer in pins
    existing.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        existing.delete(id)
      }
    })

    // Add new pins
    pins.forEach(pin => {
      if (existing.has(pin.id)) return

      const color = SOURCE_COLORS[pin.source] || '#84cc16'
      const el = createMarkerEl(color)

      const addMarker = async () => {
        const mapboxgl = (await import('mapbox-gl')).default
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map)
        existing.set(pin.id, marker)
      }

      addMarker()
    })

    // Fly to most recent pin
    if (pins.length > 0) {
      const latest = pins[pins.length - 1]
      map.flyTo({
        center: [latest.lng, latest.lat],
        zoom: Math.max(map.getZoom(), 14),
        duration: 1200,
        essential: true,
      })
    }
  }, [pins, mapLoaded])

  // Fly to explicit center when provided
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !centerLat || !centerLng) return
    mapRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom: 14.5,
      duration: 1500,
      essential: true,
    })
  }, [centerLat, centerLng, mapLoaded])

  // No token — fall back to CSS map
  if (!MAPBOX_TOKEN) {
    return <CssFallbackMap pins={pins} />
  }

  return (
    <div className="h-[220px] relative overflow-hidden" style={{ background: '#09090c' }}>
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Scan overlay — subtle grid on top of map */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
      }}/>

      {/* Legend */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-4 z-10">
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }}/>
            <span className="font-mono text-[8px] tracking-[0.1em] text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Create a glowing dot marker element */
function createMarkerEl(color: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:relative;width:16px;height:16px;'

  // Inner dot
  const dot = document.createElement('div')
  dot.style.cssText = `
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width:8px; height:8px; border-radius:50%;
    background:${color}; box-shadow:0 0 6px ${color}80;
  `
  wrapper.appendChild(dot)

  // Pulse ring
  const ring = document.createElement('div')
  ring.style.cssText = `
    position:absolute; top:50%; left:50%;
    width:18px; height:18px; border-radius:50%;
    border:1px solid ${color}60;
    animation: ringOut 2s ease-out infinite;
  `
  wrapper.appendChild(ring)

  // Entry animation — scale in
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
    <div className="h-[220px] relative overflow-hidden" style={{ background: '#09090c' }}>

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
      }}/>

      {/* Crosshairs */}
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.03] pointer-events-none"/>
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.03] pointer-events-none"/>

      {/* Radius rings */}
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

      {/* Center point */}
      <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10 }}>
        <div className="w-2.5 h-2.5 rounded-full bg-green" style={{ boxShadow: '0 0 8px rgba(132,204,22,0.6)' }}/>
        <div
          className="absolute rounded-full border"
          style={{
            width: 18, height: 18,
            top: '50%', left: '50%',
            borderColor: 'rgba(132,204,22,0.4)',
            animation: 'ringOut 2s ease-out infinite',
          }}
        />
      </div>

      {/* Static demo pins */}
      {pins.length === 0 && (
        <>
          <DemoDot top="38%" left="58%" color="#84cc16" size={10} delay="0s"/>
          <DemoDot top="60%" left="41%" color="#f59e0b" size={8} delay="0.7s"/>
          <DemoDot top="72%" left="34%" color="#3b82f6" size={8} delay="1.2s"/>
          <DemoDot top="78%" left="55%" color="#ef4444" size={7} delay="0.4s"/>
        </>
      )}

      {/* Real pins */}
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

      {/* Legend */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-4">
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }}/>
            <span className="font-mono text-[8px] tracking-[0.1em] text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoDot({ top, left, color, size, delay }: {
  top: string; left: string; color: string; size: number; delay: string
}) {
  return (
    <div className="absolute" style={{ top, left, transform: 'translate(-50%,-50%)' }}>
      <div
        className="rounded-full"
        style={{ width: size, height: size, background: color, boxShadow: `0 0 ${size - 2}px ${color}80` }}
      />
      <div
        className="absolute rounded-full border"
        style={{
          width: size + 8, height: size + 8,
          top: '50%', left: '50%',
          borderColor: `${color}60`,
          animation: `ringOut 2s ease-out ${delay} infinite`,
        }}
      />
    </div>
  )
}
