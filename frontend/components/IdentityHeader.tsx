'use client';

import React from 'react';
import { MapPin, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IdentityHeader() {
    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
        >
            <div className="glass h-14 rounded-2xl flex items-center justify-between px-6 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-electric-cyan/20 flex items-center justify-center animate-pulse-cyan">
                        <MapPin className="w-4 h-4 text-electric-cyan" />
                    </div>
                    <div>
                        <h1 className="text-sm font-medium text-silver-mist leading-none">Empire State Building</h1>
                        <p className="text-[10px] uppercase tracking-widest text-silver-mist/40 font-mono mt-1">350 5th Ave, New York</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-6 w-[1px] bg-white/10" />
                    <button className="text-silver-mist/60 hover:text-electric-cyan transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full glass-pill">
                        <div className="w-1.5 h-1.5 rounded-full bg-electric-cyan" />
                        <span className="text-[10px] font-mono text-silver-mist/80">LIVE</span>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
