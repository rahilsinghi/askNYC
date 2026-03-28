'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, ArrowRight, Command } from 'lucide-react';

export default function SearchInput() {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-10 left-32 right-[480px] z-50 pointer-events-none"
        >
            <div className="bg-slate-950/60 backdrop-blur-2xl h-16 rounded-full flex items-center px-10 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] group focus-within:border-white/20 transition-all pointer-events-auto max-w-4xl mx-auto">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mr-6">
                    <Command className="w-4 h-4 text-white/40" />
                </div>
                <input
                    type="text"
                    placeholder="Identify active Manhattan jazz circuits..."
                    className="bg-transparent border-none outline-none flex-1 text-white text-base font-light placeholder:text-white/10 tracking-wide"
                />
                <div className="flex items-center gap-6">
                    <button className="text-white/30 hover:text-white transition-colors">
                        <Mic className="w-5 h-5" />
                    </button>
                    <div className="w-[1px] h-6 bg-white/10" />
                    <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all">
                        <ArrowRight className="w-5 h-5 stroke-[3]" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
