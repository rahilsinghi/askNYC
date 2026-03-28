'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, BarChart3, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceCardProps {
    idText: string;
    title: string;
    type: 'permit' | 'complaint' | 'insight' | 'location';
    status?: string;
    rating?: number;
    className?: string;
    delay?: number;
    buttons?: string[];
}

export default function EvidenceCard({ idText, title, type, rating, buttons, className, delay = 0 }: EvidenceCardProps) {
    return (
        <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "glass-card p-6 min-w-[340px] pointer-events-auto border-white/10 group hover:bg-white/[0.08] transition-colors",
                className
            )}
        >
            <div className="flex items-start justify-between mb-5">
                <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20 mb-1">{idText}</p>
                    <h3 className="text-lg font-bold text-white tracking-tight font-syne leading-tight">{title}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-cyan-glow/30 transition-colors">
                    <Info className="w-5 h-5 text-white/20 group-hover:text-cyan-glow transition-colors" />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6">
                {buttons?.map((btn, i) => (
                    <button key={i} className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-white/40 hover:bg-cyan-glow/10 hover:border-cyan-glow/30 hover:text-cyan-glow transition-all uppercase tracking-[0.15em]">
                        {btn}
                    </button>
                ))}
                {rating && (
                    <div className="flex items-center gap-1.5 ml-auto bg-cyan-glow/10 px-3 py-1.5 rounded-lg border border-cyan-glow/30">
                        <span className="text-[10px] text-cyan-glow font-bold">{rating}</span>
                        <Star className="w-3 h-3 text-cyan-glow fill-cyan-glow" />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-glow shadow-[0_0_8px_#15BFD2]" />
                    <span className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em]">Telemetry Verified</span>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-white/5 text-[8px] font-mono text-white/20 uppercase tracking-tighter border border-white/5">
                    GRID_NODE_402
                </div>
            </div>
        </motion.div>
    );
}
