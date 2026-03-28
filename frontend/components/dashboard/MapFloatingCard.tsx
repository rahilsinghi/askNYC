'use client'

import { motion } from 'framer-motion'
import { Star, Music, Building2, Shield, HardHat, TrainFront, AlertTriangle, MapPin } from 'lucide-react'
import { DataCard as DataCardType } from '@/lib/types'

interface MapFloatingCardProps {
  index: number
  card: DataCardType
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  health: <Music size={14} />,
  safety: <Shield size={14} />,
  nypd: <Shield size={14} />,
  permits: <HardHat size={14} />,
  complaints: <AlertTriangle size={14} />,
  violations: <AlertTriangle size={14} />,
  evictions: <Building2 size={14} />,
  transit: <TrainFront size={14} />,
}

const CATEGORY_PILLS: Record<string, string[]> = {
  health: ['Location', 'Info'],
  safety: ['Safety', 'Reports'],
  nypd: ['Incidents', 'Reports'],
  permits: ['Schedule', 'Reviews'],
  complaints: ['Complaints', 'Status'],
  violations: ['Violations', 'Class'],
  evictions: ['Vibe', 'Ratings'],
  transit: ['Routes', 'Access'],
}

const CATEGORY_COLOR: Record<string, string> = {
  health: '#84cc16',
  safety: '#3b82f6',
  nypd: '#ef4444',
  permits: '#3b82f6',
  complaints: '#f59e0b',
  violations: '#f59e0b',
  evictions: '#a855f7',
  transit: '#06b6d4',
}

export default function MapFloatingCard({ index, card }: MapFloatingCardProps) {
  const icon = CATEGORY_ICON[card.category] || <MapPin size={14} />
  const pills = CATEGORY_PILLS[card.category] || ['Info', 'Details']
  const color = CATEGORY_COLOR[card.category] || '#84cc16'

  // Generate a pseudo-rating from card content
  const rating = ((card.title.length + card.detail.length) % 20) / 4 + 3

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.35, ease: 'easeOut' }}
      className="glass-card p-3.5 w-[270px] relative pointer-events-auto"
      style={{ boxShadow: `0 0 20px rgba(0,0,0,0.4), 0 0 8px ${color}15` }}
    >
      {/* Header: Card number + title + icon */}
      <div className="flex justify-between items-start mb-2.5">
        <h3 className="text-[11px] font-bold tracking-[0.05em] text-white/90 leading-tight pr-2">
          <span className="text-white/40">Card {index}:</span>{' '}
          {card.title}
        </h3>
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
          {icon}
        </div>
      </div>

      {/* Category pills + rating */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {pills.map(pill => (
          <span
            key={pill}
            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-bold text-white/50 uppercase tracking-[0.12em]"
          >
            {pill}
          </span>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] font-mono text-white/70 font-bold">{rating.toFixed(1)}</span>
          <Star size={10} className="text-amber-400 fill-amber-400" />
        </div>
      </div>

      {/* Footer: Map connection + Mapbox */}
      <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[8px] tracking-[0.05em] text-white/30 uppercase font-mono">
          <MapPin size={8} style={{ color }} />
          Map Connection
        </div>
        <div className="flex items-center gap-1 text-[8px] text-white/20 font-mono">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-white/25">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 16l2-6 6-2-2 6z" fill="currentColor" />
          </svg>
          Mapbox
        </div>
      </div>

      {/* Connector line extending below */}
      <div
        className="absolute -bottom-8 left-8 w-[1px] h-8"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, ${color}40 0px, ${color}40 3px, transparent 3px, transparent 6px)`,
        }}
      />

      {/* Connector dot at bottom */}
      <div
        className="absolute -bottom-10 left-[29px] w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
      />
    </motion.div>
  )
}
