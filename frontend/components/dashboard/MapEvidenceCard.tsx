'use client'

import { motion } from 'framer-motion'
import { MapPin, Info, Star, ChevronRight } from 'lucide-react'

interface MapEvidenceCardProps {
    id: string
    title: string
    subtitle: string
    rating: string
    status: 'active' | 'pending' | 'resolved'
    position: { x: number; y: number }
    color?: 'cyan' | 'gold' | 'mint'
}

/**
 * MapEvidenceCard: A premium floating UI component for the Cinematic Map.
 * Recreates the "Card 1: Blue Note" aesthetic from the reference image.
 */
export default function MapEvidenceCard({
    title,
    subtitle,
    rating,
    status,
    color = 'cyan'
}: MapEvidenceCardProps) {

    const accentColor = color === 'cyan' ? 'cyan-400' : color === 'gold' ? 'amber-400' : 'emerald-400';
    const glowShadow = color === 'cyan' ? 'shadow-[0_0_15px_rgba(34,211,238,0.3)]' : color === 'gold' ? 'shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'shadow-[0_0_15px_rgba(52,211,153,0.3)]';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`glass-card p-3 w-[260px] relative pointer-events-auto border-white/10 ${glowShadow}`}
        >
            {/* Top Header */}
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-[11px] font-bold tracking-[0.1em] text-white/90 uppercase truncate">
                    {title}
                </h3>
                <div className="flex gap-1">
                    <button className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                        <Info size={10} />
                    </button>
                </div>
            </div>

            {/* Main Content Pill Area */}
            <div className="flex items-center gap-2 mb-3">
                <div className={`px-2 py-1 rounded bg-${accentColor}/10 border border-${accentColor}/20 flex items-center gap-1.5`}>
                    <MapPin size={10} className={`text-${accentColor}`} />
                    <span className={`text-[9px] font-bold text-${accentColor}/80 tracking-wider`}>
                        {subtitle.toUpperCase()}
                    </span>
                </div>

                <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded border border-white/5">
                    <span className="text-[9px] font-mono text-white/60">{rating}</span>
                    <Star size={8} className="text-amber-400 fill-amber-400" />
                </div>
            </div>

            {/* Footer / Map Connection Label */}
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[8px] tracking-[0.05em] text-white/30 uppercase font-mono italic">
                    <div className={`w-1 h-1 rounded-full bg-${accentColor} pulse-gentle`} />
                    Map Connection
                </div>
                <div className="flex items-center gap-1 text-[8px] text-white/20 font-mono">
                    <div className="w-3 h-3 rounded-full bg-white/5 flex items-center justify-center p-0.5">
                        <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                    </div>
                    Mapbox_Link
                </div>
            </div>

            {/* Attachment Line (Visual anchor to map pin) */}
            <div className="absolute -bottom-4 left-6 w-[1px] h-4 bg-gradient-to-t from-transparent to-white/20" />
        </motion.div>
    )
}
