'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// ─── Exact building IDs for Mapbox Standard ──────────────────────────────────
// We'll use these to apply custom highlights if needed, or stick to GeoJSON for bloom control
const ESB_COORDS: [number, number] = [-73.9857, 40.7484];
const WTC_COORDS: [number, number] = [-74.0135, 40.7126];

interface MapCanvasProps {
    onMapLoad?: (map: mapboxgl.Map) => void;
}

export default function MapCanvas({ onMapLoad }: MapCanvasProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Start from a wider overview for the cinematic reveal
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/standard',
            center: [-73.99, 40.735],
            zoom: 13,
            pitch: 45,
            bearing: 0,
            antialias: true,
        });

        map.current.on('style.load', () => {
            if (!map.current) return;

            // ── 1. CONFIGURE MAPBOX STANDARD ──────────────────────────────────
            map.current.setConfigProperty('basemap', 'lightPreset', 'night');
            map.current.setConfigProperty('basemap', 'show3dObjects', true);
            map.current.setConfigProperty('basemap', 'show3dBuildings', true);
            map.current.setConfigProperty('basemap', 'show3dLandmarks', true);
            map.current.setConfigProperty('basemap', 'show3dFacades', true);

            // Reduce label clutter aggressively
            map.current.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
            map.current.setConfigProperty('basemap', 'showTransitLabels', false);
            map.current.setConfigProperty('basemap', 'showPlaceLabels', true); // Keep for context
            map.current.setConfigProperty('basemap', 'showRoadLabels', true);

            // ── 2. ATMOSPHERE / FOG ───────────────────────────────────────────
            // Standard handle atmosphere well, but we can fine-tune fog for depth
            map.current.setFog({
                'range': [0.8, 10],
                'color': '#020408',
                'high-color': '#081224',
                'space-color': '#000000',
                'star-intensity': 0.15
            });

            // ── 3. CINEMATIC FLY-IN ──────────────────────────────────────────
            setTimeout(() => {
                map.current?.flyTo({
                    center: [-73.993, 40.728], // Framed for Manhattan diagonal
                    zoom: 15.2,
                    pitch: 62.5,
                    bearing: -28.5,
                    duration: 5000,
                    essential: true,
                    curve: 0.8
                });
            }, 1000);

            // ── 4. PREMIUM LANDMARK HIGHLIGHTS ───────────────────────────────
            // We use specialized glow layers instead of simple extrusions
            // These will sit slightly above or at the base

            // Function to add a soft radial glow at a coordinate
            const addGlow = (id: string, coords: [number, number], color: string) => {
                if (!map.current) return;

                map.current.addSource(id, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: coords },
                        properties: {}
                    }
                });

                // Soft outer halo
                map.current.addLayer({
                    id: `${id}-halo`,
                    type: 'circle',
                    source: id,
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 20, 16, 120],
                        'circle-color': color,
                        'circle-blur': 0.85,
                        'circle-opacity': 0.3
                    }
                });

                // Inner core spike
                map.current.addLayer({
                    id: `${id}-core`,
                    type: 'circle',
                    source: id,
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 5, 16, 30],
                        'circle-color': color,
                        'circle-blur': 0.2,
                        'circle-opacity': 0.6
                    }
                });
            };

            addGlow('esb-highlight', ESB_COORDS, '#F2B35B'); // Golden ESB
            addGlow('wtc-highlight', WTC_COORDS, '#41E4F4'); // Cyan WTC

            if (onMapLoad) onMapLoad(map.current);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [onMapLoad]);

    return (
        <div className="absolute inset-0 w-full h-full bg-[#020408]">
            {/* Mapbox Branding / Status Overlay */}
            <div className="absolute top-8 left-32 z-50 flex flex-col gap-1 pointer-events-none opacity-60">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] font-black tracking-[0.3em] text-white uppercase">Neural Mapping Core</span>
                </div>
                <div className="h-[1px] w-24 bg-gradient-to-r from-white/20 to-transparent" />
            </div>

            <div ref={mapContainer} className="w-full h-full" />

            {/* Deep Cinematic Vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 4, 8, 0.4) 60%, rgba(2, 4, 8, 0.95) 100%)',
                }}
            />

            {/* Horizontal scanline effect subtle */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
        </div>
    );
}
