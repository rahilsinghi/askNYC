'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BootScreen({ onComplete }: { onComplete: () => void }) {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const timer1 = setTimeout(() => setPhase(1), 800);  // Deep glow
        const timer2 = setTimeout(() => setPhase(2), 2000); // Neural grid
        const timer3 = setTimeout(() => setPhase(3), 3500); // Logo reveal
        const timer4 = setTimeout(() => onComplete(), 5500); // Sequence complete

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] bg-[#020408] flex flex-col items-center justify-center overflow-hidden">
            {/* 1. Deep Atmospheric Glow */}
            <AnimatePresence>
                {phase >= 1 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(8,18,36,1)_0%,transparent_70%)]"
                    />
                )}
            </AnimatePresence>

            {/* 2. Neural Navigation Grid */}
            <AnimatePresence>
                {phase >= 2 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.2 }}
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
                            backgroundSize: '32px 32px'
                        }}
                    />
                )}
            </AnimatePresence>

            {/* 3. Central Identity */}
            <div className="relative z-10 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 15 }}
                    transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/20 flex items-center justify-center mb-10">
                        <div className="w-4 h-4 rounded-full bg-white/80 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
                    </div>
                    <h1 className="text-3xl font-black tracking-[0.4em] uppercase text-white italic">ASK NYC</h1>
                    <div className="mt-6 flex flex-col items-center gap-2">
                        <div className="h-[1px] w-12 bg-white/20" />
                        <p className="text-[9px] font-black tracking-[0.6em] text-white/30 uppercase">Antigravity Core</p>
                    </div>
                </motion.div>
            </div>

            {/* Loading Progress */}
            <div className="absolute bottom-20 w-40 h-[1px] bg-white/5">
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 4.5, ease: "easeInOut" }}
                    className="w-full h-full bg-white origin-left shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                />
            </div>
        </div>
    );
}
