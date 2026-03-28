'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface Landmark {
    id: string;
    lngLat: [number, number];
    primaryColor: string;
    glowR: number;
    glowG: number;
    glowB: number;
    buildingWidth: number;  // base width in "units" at zoom 14
    buildingHeight: number; // height in "units" at zoom 14
}

const LANDMARKS: Landmark[] = [
    {
        id: 'esb',
        lngLat: [-73.9857, 40.7484],
        primaryColor: '#F2B35B',
        glowR: 242, glowG: 179, glowB: 91,
        buildingWidth: 28,
        buildingHeight: 320,
    },
    {
        id: 'wtc',
        lngLat: [-74.0134, 40.7127],
        primaryColor: '#41E4F4',
        glowR: 65, glowG: 228, glowB: 244,
        buildingWidth: 22,
        buildingHeight: 260,
    },
];

interface Props {
    map: mapboxgl.Map | null;
}

export default function GlowingLandmarkOverlay({ map }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);

    useEffect(() => {
        if (!map || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;

        function syncSize() {
            const parent = canvas.parentElement;
            if (!parent) return;
            if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        }

        function draw() {
            syncSize();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const zoom = map!.getZoom();
            const pitch = map!.getPitch();

            // Scale factor driven by zoom
            const scale = Math.pow(2, zoom - 14) * 0.55;
            // Perspective foreshortening: higher pitch = more squash
            const perspectiveFactor = Math.cos((pitch * Math.PI) / 180);

            for (const lm of LANDMARKS) {
                const pt = map!.project(lm.lngLat as mapboxgl.LngLatLike);
                const bx = pt.x;
                const by = pt.y;

                const h = lm.buildingHeight * scale;
                const w = lm.buildingWidth * scale;

                // Apply pitch perspective to height (tall buildings get foreshortened at high pitch)
                const visualH = h * Math.max(perspectiveFactor, 0.35) * 2.8;

                // --- BLOOM GLOW (large soft halo) ---
                const bloomRadius = visualH * 0.9;
                const bloom = ctx.createRadialGradient(bx, by - visualH * 0.5, 0, bx, by - visualH * 0.5, bloomRadius);
                bloom.addColorStop(0, `rgba(${lm.glowR},${lm.glowG},${lm.glowB},0.22)`);
                bloom.addColorStop(0.5, `rgba(${lm.glowR},${lm.glowG},${lm.glowB},0.08)`);
                bloom.addColorStop(1, `rgba(${lm.glowR},${lm.glowG},${lm.glowB},0)`);
                ctx.fillStyle = bloom;
                ctx.beginPath();
                ctx.ellipse(bx, by - visualH * 0.3, bloomRadius, bloomRadius * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();

                // --- BUILDING FACE (front trapezoid) ---
                const topW = w * 0.55;
                ctx.beginPath();
                ctx.moveTo(bx - topW / 2, by - visualH);  // top-left
                ctx.lineTo(bx + topW / 2, by - visualH);  // top-right
                ctx.lineTo(bx + w / 2, by);             // bottom-right
                ctx.lineTo(bx - w / 2, by);             // bottom-left
                ctx.closePath();

                const faceGrad = ctx.createLinearGradient(bx, by - visualH, bx, by);
                faceGrad.addColorStop(0, lm.primaryColor + 'ff'); // bright top
                faceGrad.addColorStop(0.35, lm.primaryColor + 'cc');
                faceGrad.addColorStop(0.75, lm.primaryColor + '66');
                faceGrad.addColorStop(1, lm.primaryColor + '18'); // fade at base
                ctx.fillStyle = faceGrad;
                ctx.shadowColor = lm.primaryColor;
                ctx.shadowBlur = 24;
                ctx.fill();

                // --- SIDE FACE (right perspective side) ---
                const sideW = w * 0.25;
                ctx.beginPath();
                ctx.moveTo(bx + topW / 2, by - visualH);        // top-right (same as face)
                ctx.lineTo(bx + topW / 2 + sideW, by - visualH * 0.85); // top-right side
                ctx.lineTo(bx + w / 2 + sideW, by * 0.92 + by * 0.08); // bottom-right side
                ctx.lineTo(bx + w / 2, by);                      // bottom-right (face)
                ctx.closePath();

                const sideGrad = ctx.createLinearGradient(bx + topW / 2, by - visualH, bx + topW / 2, by);
                sideGrad.addColorStop(0, lm.primaryColor + 'aa');
                sideGrad.addColorStop(1, lm.primaryColor + '11');
                ctx.fillStyle = sideGrad;
                ctx.shadowBlur = 0;
                ctx.fill();

                // --- TOP FACE ---
                ctx.beginPath();
                ctx.moveTo(bx - topW / 2, by - visualH);
                ctx.lineTo(bx + topW / 2, by - visualH);
                ctx.lineTo(bx + topW / 2 + sideW, by - visualH * 0.85);
                ctx.lineTo(bx - topW / 2 + sideW * 0.3, by - visualH * 0.85);
                ctx.closePath();
                ctx.fillStyle = lm.primaryColor + 'dd';
                ctx.shadowColor = lm.primaryColor;
                ctx.shadowBlur = 20;
                ctx.fill();
                ctx.shadowBlur = 0;

                // --- ANTENNA / SPIRE ---
                ctx.beginPath();
                ctx.moveTo(bx, by - visualH);
                ctx.lineTo(bx, by - visualH - h * 0.3);
                const spireGrad = ctx.createLinearGradient(bx, by - visualH - h * 0.3, bx, by - visualH);
                spireGrad.addColorStop(0, lm.primaryColor + '00');
                spireGrad.addColorStop(1, lm.primaryColor + 'ff');
                ctx.strokeStyle = lm.primaryColor;
                ctx.lineWidth = 2;
                ctx.shadowColor = lm.primaryColor;
                ctx.shadowBlur = 15;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // --- INNER CORE GLOW (tight bright center) ---
                const innerGlow = ctx.createRadialGradient(bx, by - visualH * 0.7, 0, bx, by - visualH * 0.7, w * 0.8);
                innerGlow.addColorStop(0, `rgba(${lm.glowR},${lm.glowG},${lm.glowB},0.45)`);
                innerGlow.addColorStop(0.6, `rgba(${lm.glowR},${lm.glowG},${lm.glowB},0.1)`);
                innerGlow.addColorStop(1, `rgba(${lm.glowR},${lm.glowG},${lm.glowB},0)`);
                ctx.fillStyle = innerGlow;
                ctx.fillRect(bx - w * 0.8, by - visualH * 1.2, w * 1.6, visualH * 1.3);
            }
        }

        function renderLoop() {
            draw();
            animFrameRef.current = requestAnimationFrame(renderLoop);
        }

        renderLoop();

        return () => {
            cancelAnimationFrame(animFrameRef.current);
        };
    }, [map]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
        />
    );
}
