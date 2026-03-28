'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, ArrowRight } from 'lucide-react';

export default function SearchInput() {
    return (
        <div className="fixed bottom-10 left-32 right-[480px] z-50">
            <div className="glass h-14 rounded-full flex items-center px-8 border-electric-cyan/20 shadow-[0_0_40px_rgba(65,228,244,0.1)] group focus-within:border-electric-cyan/40 transition-all">
                <span className="text-electric-cyan font-bold text-[10px] uppercase tracking-[0.2em] mr-6 whitespace-nowrap">ASK NYC:</span>
                <input
                    type="text"
                    placeholder="Where can I find the best live jazz in Manhattan tonight?..."
                    className="bg-transparent border-none outline-none flex-1 text-white/90 placeholder:text-white/20 text-sm font-medium"
                />
                <div className="flex items-center gap-4">
                    <button className="p-2 text-white/40 hover:text-electric-cyan transition-colors">
                        <Mic className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-electric-cyan flex items-center justify-center text-midnight shadow-[0_0_20px_rgba(65,228,244,0.4)] hover:scale-105 active:scale-95 transition-all">
                        <ArrowRight className="w-5 h-5 stroke-[3]" />
                    </button>
                </div>
            </div>
        </div>
    );
}
