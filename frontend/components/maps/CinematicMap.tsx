'use client';

import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import * as THREE from 'three';
import { SceneDirector } from '../../lib/maps/SceneDirector';
import { LandmarkGlowAgent } from '../../lib/maps/landmarkGlowAgent';
import { LandmarkResolver } from '../../lib/maps/LandmarkResolver';
import MiniMap from '../dashboard/MiniMap';

interface CinematicMapProps {
    center?: { lat: number; lng: number };
    zoom?: number;
    highlightCoords?: { lat: number; lng: number } | null;
    onLoad?: (map: google.maps.Map) => void;
}

export default function CinematicMap({
    center = { lat: 40.7484, lng: -73.9857 }, // Default to Empire State
    zoom = 15,
    highlightCoords,
    onLoad,
}: CinematicMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [failed, setFailed] = useState(false);
    const [loading, setLoading] = useState(true);
    const sceneDirectorRef = useRef<SceneDirector>(new SceneDirector());

    useEffect(() => {
        // Handle Google Maps authentication failures (like ApiNotActivatedMapError)
        (window as any).gm_authFailure = () => {
            console.error('Google Maps authentication failure detected');
            setFailed(true);
            setLoading(false);
        };

        return () => {
            (window as any).gm_authFailure = null;
        };
    }, []);

    useEffect(() => {
        const director = sceneDirectorRef.current;
        if (highlightCoords) {
            // 1. Highlight nearest landmark if exists
            const nearest = LandmarkResolver.findNearest(highlightCoords, 200);
            if (nearest) {
                director.highlights.clear();
                director.setHighlight(nearest.id, true);
            } else {
                // 2. Otherwise create an arbitrary highlight at these exact coords
                // 'current-detection' is a fixed ID for the active highlight
                director.highlightArbitraryLocation('active-detection', '#22d3ee');
            }
        } else {
            director.highlights.clear();
            director.removeLandmark('active-detection');
        }
    }, [highlightCoords]);

    useEffect(() => {
        if (map && center && !failed) {
            const finalZoom = highlightCoords ? 19 : zoom;
            const finalTilt = highlightCoords ? 67.5 : 45;
            const finalHeading = highlightCoords ? (map.getHeading() || 0) + 20 : 0; // Subtle rotation on focus

            map.panTo(center);
            map.setZoom(finalZoom);
            map.setTilt(finalTilt);
            map.setHeading(finalHeading);
        }
    }, [map, center, zoom, highlightCoords, failed]);

    useEffect(() => {
        setOptions({
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
            v: 'beta',
        });

        const init = async () => {
            setLoading(true);
            try {
                // Set a timeout to assume failure if library takes too long or fails silently
                const timeout = setTimeout(() => {
                    if (!map) {
                        console.warn('Google Maps load timeout - triggering fallback');
                        setFailed(true);
                    }
                }, 4000); // Reduced to 4 seconds for faster UX

                const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
                if (!mapRef.current) return;

                const mapInstance = new Map(mapRef.current, {
                    center,
                    zoom,
                    heading: 0,
                    tilt: 45,
                    mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'bd3203cf5e21d98e2013c633',
                    disableDefaultUI: true,
                    backgroundColor: '#07111D',
                    gestureHandling: 'greedy',
                });

                setMap(mapInstance);
                setLoading(false);
                clearTimeout(timeout);
                if (onLoad) onLoad(mapInstance);

                initWebGLOverlay(mapInstance);
            } catch (err) {
                console.error('Error loading Google Maps:', err);
                setFailed(true);
                setLoading(false);
            }
        };

        if (!map && !failed) init();
    }, [center, zoom, onLoad, map, failed]);

    const initWebGLOverlay = (map: google.maps.Map) => {
        const director = sceneDirectorRef.current;
        const webGLOverlayView = new google.maps.WebGLOverlayView();

        webGLOverlayView.onAdd = () => {
            const landmarks = LandmarkResolver.getAll();
            landmarks.forEach(l => {
                const rules = LandmarkGlowAgent.resolveRules(l.name, l.coords, l.category, 'NYC');
                director.addLandmark(l.id, rules, new THREE.Vector3(0, 0, 0));
            });
        };

        webGLOverlayView.onContextRestored = ({ gl }) => {
            const renderer = new THREE.WebGLRenderer({
                canvas: gl.canvas,
                context: gl,
                ...gl.getContextAttributes(),
            });
            renderer.autoClear = false;
            director.renderer = renderer;
        };

        webGLOverlayView.onDraw = ({ gl, transformer }) => {
            const renderer = director.renderer;
            if (!renderer) return;

            director.update();
            gl.disable(gl.SCISSOR_TEST);

            const landmarks = LandmarkResolver.getAll();
            landmarks.forEach(l => {
                const group = director.landmarks.get(l.id);
                if (group) {
                    const latLng = { lat: l.coords.lat, lng: l.coords.lng, altitude: 0 };
                    const matrix = (transformer as any).fromLatLngAltitude(latLng);
                    group.matrixAutoUpdate = false;
                    group.matrix.fromArray(matrix);
                }
            });

            // Update arbitrary detection highlight if active
            if (highlightCoords && director.landmarks.has('active-detection')) {
                const group = director.landmarks.get('active-detection');
                if (group) {
                    const latLng = { lat: highlightCoords.lat, lng: highlightCoords.lng, altitude: 0 };
                    const matrix = (transformer as any).fromLatLngAltitude(latLng);
                    group.matrixAutoUpdate = false;
                    group.matrix.fromArray(matrix);
                }
            }

            // Since we are using fromLatLngAltitude for each landmark to get the full MVP matrix,
            // the Three.js camera matrices should be identity to avoid double projection.
            const camera = director.getCamera();
            camera.projectionMatrix.identity();
            camera.matrixWorldInverse.identity();

            renderer.resetState();
            renderer.render(director.getScene(), camera);

            webGLOverlayView.requestRedraw();
        };

        webGLOverlayView.setMap(map);
    };

    if (failed) {
        return (
            <div className="relative w-full h-full bg-[#07111D] flex items-center justify-center">
                <MiniMap
                    centerLat={center.lat}
                    centerLng={center.lng}
                    highlightLat={highlightCoords?.lat}
                    highlightLng={highlightCoords?.lng}
                />
                <div className="absolute top-6 left-1/2 -translate-x-1/2 glass px-4 py-2 rounded-full border border-red-500/20 z-50 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-red-100/60 uppercase">
                        Cinematic_Node_Offline // Mapbox_Fallback_Active
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#07111D]">
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />

            {loading && !map && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07111D] z-50">
                    <div className="w-12 h-12 rounded-full border border-cyan-400/20 border-t-cyan-400 animate-spin" />
                    <p className="mt-4 text-[9px] font-bold tracking-[0.3em] text-cyan-400/40 uppercase">Initializing_Neural_Terrain</p>
                </div>
            )}

            {/* Cinematic Overlays */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 12, 24, 0.4) 60%, rgba(2, 12, 24, 0.8) 100%)',
                }}
            />

            {/* Bloom-like glow above map */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0F172A] to-transparent pointer-events-none opacity-60" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0F172A] to-transparent pointer-events-none opacity-60" />

            {/* Vignette */}
            <div className="absolute inset-0 ring-[60px] ring-inset ring-black/30 pointer-events-none" />
        </div>
    );
}
