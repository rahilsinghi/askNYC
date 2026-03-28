'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, X, MoreVertical, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function RemotePage() {
    return (
        <main className="relative h-screen w-screen bg-black overflow-hidden flex flex-col">
            {/* 1. Camera Mock (Background) */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover opacity-80"
                    src="https://static.videezy.com/system/resources/previews/000/039/292/original/nyc-night-skyline-timelapse.mp4"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
            </div>

            {/* 2. Top Chrome */}
            <header className="relative z-10 p-6 flex items-center justify-between">
                <Link href="/" className="p-3 rounded-full glass-pill text-white/60 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </Link>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-electric-cyan animate-pulse" />
                        <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase">Connected</span>
                    </div>
                    <p className="text-white font-medium text-sm">Lexington & 42nd St</p>
                </div>
                <button className="p-3 rounded-full glass-pill text-white/60 hover:text-white transition-colors">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </header>

            {/* 3. Central Lens Overlay */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
                <div className="relative w-64 h-64 border border-white/10 rounded-full flex items-center justify-center">
                    {/* Animated Ring */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border border-dashed border-electric-cyan/20 rounded-full"
                    />
                    {/* Focus Corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-electric-cyan rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-electric-cyan rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-electric-cyan rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-electric-cyan rounded-br-2xl" />

                    <div className="flex flex-col items-center">
                        <Sparkles className="w-8 h-8 text-electric-cyan mb-4 animate-pulse" />
                        <p className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">Scanning...</p>
                    </div>
                </div>

                {/* Floating Identity Prediction */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="mt-12 glass px-6 py-4 rounded-3xl flex items-center gap-4 bg-white/5 backdrop-blur-3xl"
                >
                    <div className="w-10 h-10 rounded-full bg-electric-cyan/20 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-electric-cyan" />
                    </div>
                    <div>
                        <p className="text-xs text-white/40 mb-0.5">Identified</p>
                        <p className="text-lg font-medium text-white">The Chrysler Building</p>
                    </div>
                </motion.div>
            </div>

            {/* 4. Bottom Controls */}
            <footer className="relative z-10 p-12 flex flex-col items-center gap-8">
                <p className="text-center text-white/60 text-lg max-w-xs font-light italic">
                    "Point at a building and ask a question about its history or status."
                </p>

                <div className="flex items-center gap-10">
                    <button className="p-4 rounded-full border border-white/10 text-white/40 hover:text-white transition-colors">
                        <Camera className="w-6 h-6" />
                    </button>

                    <button className="w-20 h-20 rounded-full bg-electric-cyan flex items-center justify-center shadow-[0_0_50px_rgba(64,224,208,0.4)] animate-pulse-cyan">
                        <Mic className="w-8 h-8 text-midnight fill-midnight" />
                    </button>

                    <button className="p-4 rounded-full border border-white/10 text-white/40 hover:text-white transition-colors">
                        <Sparkles className="w-6 h-6" />
                    </button>
                </div>
            </footer>
        </main>
    );
}
