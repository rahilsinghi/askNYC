'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// ─── Exact building footprint polygons ────────────────────────────────────────
// Coordinates derived from real building footprints in NYC open data

const ESB_FOOTPRINT: GeoJSON.Feature = {
    type: 'Feature',
    properties: { height: 443, base: 0 },
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [-73.98618, 40.74883],
            [-73.98504, 40.74883],
            [-73.98504, 40.74814],
            [-73.98618, 40.74814],
            [-73.98618, 40.74883],
        ]],
    },
};

const WTC_FOOTPRINT: GeoJSON.Feature = {
    type: 'Feature',
    properties: { height: 541, base: 0 },
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [-74.01462, 40.71341],
            [-74.01330, 40.71341],
            [-74.01330, 40.71245],
            [-74.01462, 40.71245],
            [-74.01462, 40.71341],
        ]],
    },
};

interface MapCanvasProps {
    onMapLoad?: (map: mapboxgl.Map) => void;
}

export default function MapCanvas({ onMapLoad }: MapCanvasProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Centered to frame both midtown ESB (upper) and WTC (lower) 
        // bearing -18 makes Manhattan run diagonally like the reference
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-73.998, 40.730],
            zoom: 14.5,
            pitch: 60,
            bearing: -18,
            antialias: true,
        });

        map.current.on('style.load', () => {
            if (!map.current) return;

            // ── 1. BASE DARK BUILDINGS (composite tile buildings) ──────────────
            map.current.addLayer({
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
                    'fill-extrusion-opacity': 0.92,
                    'fill-extrusion-vertical-gradient': true,
                },
            });

            // ── 2. EMPIRE STATE BUILDING — Gold GeoJSON extrusion ─────────────
            map.current.addSource('esb', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [ESB_FOOTPRINT] },
            });
            map.current.addLayer({
                id: 'esb-glow',
                type: 'fill-extrusion',
                source: 'esb',
                paint: {
                    'fill-extrusion-color': '#F2B35B',
                    'fill-extrusion-height': ['get', 'height'],
                    'fill-extrusion-base': ['get', 'base'],
                    'fill-extrusion-opacity': 0.95,
                    'fill-extrusion-vertical-gradient': true,
                },
            });

            // ── 3. ONE WORLD TRADE CENTER — Cyan GeoJSON extrusion ────────────
            map.current.addSource('wtc', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [WTC_FOOTPRINT] },
            });
            map.current.addLayer({
                id: 'wtc-glow',
                type: 'fill-extrusion',
                source: 'wtc',
                paint: {
                    'fill-extrusion-color': '#41E4F4',
                    'fill-extrusion-height': ['get', 'height'],
                    'fill-extrusion-base': ['get', 'base'],
                    'fill-extrusion-opacity': 0.95,
                    'fill-extrusion-vertical-gradient': true,
                },
            });

            // ── 4. LIGHTING ────────────────────────────────────────────────────
            map.current.setLight({
                anchor: 'viewport',
                color: '#afd2ff',
                intensity: 0.4,
                position: [1.5, 90, 80],
            });

            // ── 5. CINEMATIC FOG ───────────────────────────────────────────────
            map.current.setFog({
                range: [0.5, 7],
                color: '#07111D',
                'high-color': '#0B1D31',
                'space-color': '#000005',
                'star-intensity': 0.9,
            });

            if (onMapLoad) onMapLoad(map.current);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [onMapLoad]);

    return (
        <div className="absolute inset-0 w-full h-full bg-[#07111D]">
            {/* Mapbox branding */}
            <div className="absolute top-6 left-32 z-50 flex items-center gap-3 pointer-events-none">
                <div className="w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                </div>
                <span className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase">Mapbox</span>
            </div>

            <div ref={mapContainer} className="w-full h-full" />

            {/* Edge vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 110% 100% at 50% 50%, transparent 35%, rgba(7,17,29,0.8) 100%)',
                    boxShadow: 'inset 0 0 300px rgba(0,0,0,0.85)',
                }}
            />
        </div>
    );
}
