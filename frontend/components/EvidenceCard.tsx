'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, BarChart3 } from 'lucide-react';
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
            transition={{ delay: 1 + delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "glass p-7 rounded-[2rem] min-w-[320px] pointer-events-auto",
                className
            )}
        >
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-white tracking-wide">{idText}: {title}</h3>
                <div className="w-9 h-9 rounded-xl bg-warm-amber/20 flex items-center justify-center border border-warm-amber/30">
                    <BarChart3 className="w-5 h-5 text-warm-amber" />
                </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
                {buttons?.map((btn, i) => (
                    <button key={i} className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/70 hover:bg-white/10 transition-all uppercase tracking-[0.1em]">
                        {btn}
                    </button>
                ))}
                {rating && (
                    <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-sm text-warm-amber font-bold">{rating}</span>
                        <Star className="w-4 h-4 text-warm-amber fill-warm-amber" />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-silver-mist/40" />
                    <span className="text-[10px] text-silver-mist/40 uppercase tracking-widest">Map Connection</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-40">
                    <div className="w-3 h-3 rounded-full border border-current" />
                    <span className="text-[8px] font-mono tracking-tighter">Mapbox</span>
                </div>
            </div>
        </motion.div>
    );
}
