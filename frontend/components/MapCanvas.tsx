'use client';

import React, { useEffect, useRef } from 'react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// ─── Exact building footprint polygons ────────────────────────────────────────

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
    onMapLoad?: (map: unknown) => void;
}

export default function MapCanvas({ onMapLoad }: MapCanvasProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<unknown>(null);

    useEffect(() => {
        if (!MAPBOX_TOKEN || mapInstance.current || !mapContainer.current) return;

        let destroyed = false;

        const initMap = async () => {
            const mapboxgl = (await import('mapbox-gl')).default;
            await import('mapbox-gl/dist/mapbox-gl.css');
            mapboxgl.accessToken = MAPBOX_TOKEN;

            if (destroyed || !mapContainer.current) return;

            const map = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/dark-v11',
                center: [-73.998, 40.730],
                zoom: 14.5,
                pitch: 60,
                bearing: -18,
                antialias: true,
            });

            mapInstance.current = map;

            map.on('style.load', () => {
                if (destroyed) return;

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
                        'fill-extrusion-opacity': 0.92,
                        'fill-extrusion-vertical-gradient': true,
                    },
                });

                map.addSource('esb', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [ESB_FOOTPRINT] },
                });
                map.addLayer({
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

                map.addSource('wtc', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [WTC_FOOTPRINT] },
                });
                map.addLayer({
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

                map.setLight({
                    anchor: 'viewport',
                    color: '#afd2ff',
                    intensity: 0.4,
                    position: [1.5, 90, 80],
                });

                map.setFog({
                    range: [0.5, 7],
                    color: '#07111D',
                    'high-color': '#0B1D31',
                    'space-color': '#000005',
                    'star-intensity': 0.9,
                });

                if (onMapLoad) onMapLoad(map);
            });
        };

        initMap();

        return () => {
            destroyed = true;
            if (mapInstance.current) {
                (mapInstance.current as { remove: () => void }).remove();
                mapInstance.current = null;
            }
        };
    }, [onMapLoad]);

    if (!MAPBOX_TOKEN) {
        return (
            <div className="absolute inset-0 w-full h-full bg-[#07111D]">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                }} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/20 font-mono text-xs tracking-[0.2em] uppercase">Map loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 w-full h-full bg-[#07111D]">
            <div ref={mapContainer} className="w-full h-full" />
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
