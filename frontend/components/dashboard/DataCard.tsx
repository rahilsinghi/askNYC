'use client'

import { motion } from 'framer-motion'
import { DataCard as DataCardType } from '@/lib/types'

interface DataCardProps {
  card: DataCardType
  index: number
}

const CATEGORY_COLORS: Record<string, string> = {
  health: '#84cc16',
  permits: '#3b82f6',
  complaints: '#f59e0b',
  violations: '#f59e0b',
  nypd: '#ef4444',
  safety: '#ef4444',
  evictions: '#a855f7',
  transit: '#06b6d4',
}

/**
 * DataCard: Polished for the Sariya Task 3 requirements.
 * Features staggered entrance, category-colored left border, and hover glow.
 */
export default function DataCard({ card, index }: DataCardProps) {
  const categoryColor = CATEGORY_COLORS[card.category] || '#84cc16'

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.06)' }}
      className="glass border border-white/5 rounded-xl overflow-hidden mb-4 group cursor-pointer relative"
    >
      {/* Category Left Border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: categoryColor }}
      />

      <div className="p-4 pl-6">
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[9px] font-black tracking-[0.2em] uppercase px-2 py-0.5 rounded border border-current"
            style={{ color: categoryColor, backgroundColor: `${categoryColor}10`, borderColor: `${categoryColor}30` }}
          >
            {card.badge_label}
          </span>
          <div className="flex items-center gap-1 opacity-20">
            <div className="w-1 h-1 rounded-full bg-white" />
            <div className="w-1 h-1 rounded-full bg-white" />
          </div>
        </div>

        <h3 className="text-[15px] font-bold text-white/90 mb-2 leading-snug group-hover:text-white transition-colors">
          {card.title}
        </h3>

        <p className="text-[11px] leading-relaxed text-white/40 group-hover:text-white/60 transition-colors font-mono tracking-tight">
          {card.detail}
        </p>

        {/* Footnote */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between opacity-20">
          <span className="text-[8px] font-bold uppercase tracking-widest">Dataset: NYC OpenData</span>
          {card.status === 'active' && (
            <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </div>
      </div>
    </motion.div>
  )
}
