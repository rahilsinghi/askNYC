'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MapPin, SOURCE_COLORS } from '@/lib/types'

interface MiniMapProps {
  pins?: MapPin[]
  centerLat?: number
  centerLng?: number
  highlightLat?: number | null
  highlightLng?: number | null
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

export default function MiniMap({ pins = [], centerLat, centerLng, highlightLat, highlightLng }: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const landmarkRootsRef = useRef<Map<string, { unmount: () => void }>>(new Map())
  const highlightMarkerRef = useRef<any>(null)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [styleLoaded, setStyleLoaded] = useState(false)

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
        setStyleLoaded(true)

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
              'fill-extrusion-color': '#050B14',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.8,
              'fill-extrusion-vertical-gradient': true,
            },
          })
        }

        // ─── Landmark: Empire State Building (Gold Glow) ───────────────────────
        if (!map.getSource('landmark-esb')) {
          map.addSource('landmark-esb', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [-73.9857, 40.7484] },
              properties: { height: 443, name: 'Empire State Building' }
            }
          })

          map.addLayer({
            id: 'esb-pillar',
            type: 'fill-extrusion',
            source: 'composite',
            'source-layer': 'building',
            filter: ['in', 'id', 23646540, 162985390, 23646537],
            paint: {
              'fill-extrusion-color': '#F2B35B',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.95,
              'fill-extrusion-vertical-gradient': true
            }
          })
        }

        // ─── Landmark: One World Trade Center (Cyan Glow) ─────────────────────
        if (!map.getSource('landmark-wtc')) {
          map.addSource('landmark-wtc', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [-74.0134, 40.7127] },
              properties: { height: 541, name: 'WTC' }
            }
          })

          map.addLayer({
            id: 'wtc-pillar',
            type: 'fill-extrusion',
            source: 'composite',
            'source-layer': 'building',
            filter: ['in', 'id', 23646538, 162985388, 23646549, 142171454],
            paint: {
              'fill-extrusion-color': '#41E4F4',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.95,
              'fill-extrusion-vertical-gradient': true
            }
          })
        }

        map.setFog({
          range: [0.5, 10],
          color: '#07111D',
          'horizon-blend': 0.1,
          'high-color': '#000000',
          'space-color': '#000000',
          'star-intensity': 0.9,
        })
      })

      map.on('load', () => {
        if (destroyed) return
        mapRef.current = map
        setMapLoaded(true)
        addLandmarkMarkers(map, mapboxgl)
      })
    }

    const addLandmarkMarkers = async (map: any, mapboxgl: any) => {
      const { createRoot } = await import('react-dom/client')
      const { default: MapEvidenceCard } = await import('./MapEvidenceCard')

      // Evidence Card Stack Logic
      const EVIDENCE_STACK = [
        { id: 'Card 1', title: 'Blue Note Jazz Club', rating: '4.8', lat: 40.7308, lng: -73.9973, color: 'gold' as const },
        { id: 'Card 2', title: 'Smalls Jazz Club', rating: '4.7', lat: 40.7308, lng: -73.9973, color: 'gold' as const },
        { id: 'Card 3', title: 'Django', rating: '4.6', lat: 40.7308, lng: -73.9973, color: 'gold' as const }
      ]

      EVIDENCE_STACK.forEach((card, i) => {
        const markerKey = `evidence-${card.id}`;
        if (markersRef.current.has(markerKey)) return

        const el = document.createElement('div')
        el.className = 'evidence-marker-container'
        const root = createRoot(el)
        root.render(
          <MapEvidenceCard
            id={card.id}
            title={card.title}
            rating={card.rating}
            stackIndex={i}
            color={card.color}
          />
        )

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom-left',
          offset: [20, -20]
        })
          .setLngLat([card.lng, card.lat])
          .addTo(map)

        markersRef.current.set(markerKey, marker)
        landmarkRootsRef.current.set(markerKey, root)
      })
    }

    initMap()

    return () => {
      destroyed = true
      const roots = Array.from(landmarkRootsRef.current.values())
      landmarkRootsRef.current.clear()
      setTimeout(() => roots.forEach(root => root.unmount()), 0)
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current.clear()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Manage Highlight Glow
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    const updateHighlight = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      if (highlightMarkerRef.current) {
        highlightMarkerRef.current.remove()
        highlightMarkerRef.current = null
      }

      if (highlightLat && highlightLng) {
        const el = document.createElement('div')
        el.className = 'detection-glow'
        el.style.cssText = `
          position:relative; width:140px; height:140px; 
          background:radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 70%); 
          border-radius:50%; 
          animation: pulse-glow 2.5s ease-out infinite;
          display: flex; align-items: center; justify-content: center;
        `

        const ring = document.createElement('div')
        ring.style.cssText = `
          position:absolute; width:100%; height:100%;
          border: 2px solid rgba(34,211,238,0.3);
          border-radius: 50%;
          animation: ring-pulse 2.5s ease-out infinite;
        `
        el.appendChild(ring)

        const inner = document.createElement('div')
        inner.style.cssText = `
          width:16px; height:16px; background:#22d3ee; border-radius:50%;
          box-shadow: 0 0 30px #22d3ee, 0 0 60px #22d3ee;
          z-index: 2;
        `
        el.appendChild(inner)

        const style = document.createElement('style')
        style.innerHTML = `
          @keyframes pulse-glow {
            0% { transform: scale(0.6); opacity: 0.8; }
            50% { opacity: 0.4; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes ring-pulse {
            0% { transform: scale(0.4); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
          }
        `
        document.head.appendChild(style)

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([highlightLng, highlightLat])
          .addTo(map)

        highlightMarkerRef.current = marker
      }
    }
    updateHighlight()
  }, [highlightLat, highlightLng, mapLoaded])

  // Sync backend pins
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    const syncPins = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      const map = mapRef.current
      const existing = markersRef.current
      const currentIds = new Set(pins.map(p => p.id))

      // Clean up old pins
      existing.forEach((marker, id) => {
        if (!id.startsWith('evidence-') && !currentIds.has(id)) {
          marker.remove()
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
    syncPins()
  }, [pins, mapLoaded])

  // Fly to center
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !centerLat || !centerLng) return
    mapRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom: 14.5,
      duration: 1500,
      essential: true,
    })
  }, [centerLat, centerLng, mapLoaded])

  if (!MAPBOX_TOKEN) return <CssFallbackMap pins={pins} />

  return (
    <div className="absolute inset-0 w-full h-full min-h-screen bg-[#07111D] z-0">
      <div ref={mapContainer} className="w-full h-screen absolute inset-0" />
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
  dot.style.cssText = `position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:8px; height:8px; border-radius:50%; background:${color}; box-shadow:0 0 6px ${color}80;`
  wrapper.appendChild(dot)
  const ring = document.createElement('div')
  ring.style.cssText = `position:absolute; top:50%; left:50%; width:18px; height:18px; border-radius:50%; border:1px solid ${color}60; animation: ringOut 2s ease-out infinite;`
  wrapper.appendChild(ring)
  return wrapper
}

function CssFallbackMap({ pins = [] }: { pins?: MapPin[] }) {
  return (
    <div className="absolute inset-0 w-full h-full min-h-screen bg-[#07111D] z-0">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.03] pointer-events-none" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.03] pointer-events-none" />
      {pins.map((pin) => {
        const color = SOURCE_COLORS[pin.source] || '#84cc16'
        return (
          <div key={pin.id} className="absolute" style={{ top: `${45 + (pin.lat - 40.73) * 400}%`, left: `${50 + (pin.lng + 73.99) * 400}%` }}>
            <div className="rounded-full" style={{ width: 8, height: 8, background: color, boxShadow: `0 0 5px ${color}80` }} />
          </div>
        )
      })}
    </div>
  )
}
