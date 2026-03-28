'use client'

import { motion } from 'framer-motion'
import { MapPin, Star, Share2 } from 'lucide-react'

interface MapEvidenceCardProps {
    id: string
    title: string
    subtitle?: string
    rating: string
    stackIndex?: number
    color?: 'cyan' | 'gold' | 'mint'
}

const COLOR_MAP = {
    cyan: {
        accent: '#41E4F4',
        glow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    },
    gold: {
        accent: '#F2B35B',
        glow: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]',
    },
    mint: {
        accent: '#34d399',
        glow: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]',
    },
} as const

/**
 * MapEvidenceCard: A pixel-perfect recreation of the "Card 1" spec from the reference.
 * Supports stacking via the stackIndex prop.
 */
export default function MapEvidenceCard({
    id,
    title,
    subtitle = "NYC DATA NODE",
    rating,
    stackIndex = 0,
    color = 'cyan'
}: MapEvidenceCardProps) {

    const c = COLOR_MAP[color] || COLOR_MAP.cyan;

    // Stacking offsets
    const stackOffset = {
        x: stackIndex * 12,
        y: stackIndex * 12,
        z: 50 - stackIndex,
        scale: 1 - (stackIndex * 0.05),
        opacity: 1 - (stackIndex * 0.3)
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{
                opacity: stackOffset.opacity,
                x: stackOffset.x,
                y: stackOffset.y,
                scale: stackOffset.scale
            }}
            style={{ zIndex: stackOffset.z }}
            className={`absolute glass-card w-[240px] p-4 border-white/10 ${c.glow} pointer-events-auto`}
        >
            {/* Header: Card ID + Icon */}
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-[10px] font-bold text-white/90 tracking-wide uppercase truncate pr-4">
                    {id}: {title}
                </h3>
                <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: c.accent }} />
                </div>
            </div>

            {/* Middle: Info & Rating */}
            <div className="flex items-center gap-2 mb-5">
                <div className="px-2.5 py-1 rounded bg-white/5 border border-white/5 flex items-center gap-1.5">
                    <MapPin size={10} style={{ color: c.accent }} />
                    <span className="text-[8px] font-bold text-white/40 tracking-wider uppercase">
                        {subtitle}
                    </span>
                </div>

                <div className="px-2 py-1 rounded bg-white/5 border border-white/10 flex items-center gap-1">
                    <span className="text-[9px] font-bold text-white/80">{rating}</span>
                    <Star size={8} className="text-amber-400 fill-amber-400" />
                </div>
            </div>

            {/* Footer: Map Connection + Mapbox Logo */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5 opacity-40">
                    <div className="flex gap-0.5">
                        {[1, 2, 3].map(i => <div key={i} className="w-0.5 h-0.5 rounded-full bg-white" />)}
                    </div>
                    <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-white">Grid Connection</span>
                </div>

                <div className="flex items-center gap-1 opacity-60">
                    <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center p-0.5">
                        <Share2 size={8} className="text-white" />
                    </div>
                    <span className="text-[8px] font-black tracking-tighter text-white">NYC_INTEL</span>
                </div>
            </div>

            {/* Optional connecting line visual decoration */}
            <div className={`absolute -bottom-4 left-6 w-[1px] h-4 bg-gradient-to-t from-transparent to-white/20`} />
        </motion.div>
    )
}
