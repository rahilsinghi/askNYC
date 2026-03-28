'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BootScreen({ onComplete }: { onComplete: () => void }) {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const timer1 = setTimeout(() => setPhase(1), 1000); // Skyline glow
        const timer2 = setTimeout(() => setPhase(2), 2500); // Grid pulse
        const timer3 = setTimeout(() => setPhase(3), 4000); // Logo fade
        const timer4 = setTimeout(() => onComplete(), 6000); // Complete

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
        };
    }, []); // Only run once on mount

    return (
        <div className="fixed inset-0 z-[100] bg-midnight flex flex-col items-center justify-center overflow-hidden">
            {/* 1. Subtle Skyline Glow */}
            <AnimatePresence>
                {phase >= 1 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.3, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#40e0d0_0%,transparent_70%)]"
                    />
                )}
            </AnimatePresence>

            {/* 2. Map Grid Pulse */}
            <AnimatePresence>
                {phase >= 2 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(64, 224, 208, 0.1) 1px, transparent 0)`,
                            backgroundSize: '40px 40px'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* 3. Logo & Title */}
            <div className="relative z-10 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center"
                >
                    <div className="w-16 h-16 rounded-3xl glass-pill flex items-center justify-center mb-8 border-electric-cyan/20">
                        <div className="w-8 h-8 rounded-lg bg-electric-cyan shadow-[0_0_30px_rgba(64,224,208,0.5)]" />
                    </div>
                    <h1 className="text-4xl font-medium tracking-[0.2em] uppercase text-silver-mist">ASK NYC</h1>
                    <p className="mt-4 text-[10px] font-mono tracking-[0.5em] text-silver-mist/40 uppercase">Antigravity Intelligence Layer</p>
                </motion.div>
            </div>

            {/* Loading Bar */}
            <div className="absolute bottom-24 w-48 h-[1px] bg-white/5 overflow-hidden">
                <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="w-full h-full bg-electric-cyan shadow-[0_0_10px_rgba(64,224,208,0.5)]"
                />
            </div>
        </div>
    );
}
