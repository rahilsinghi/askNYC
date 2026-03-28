'use client'

import { useEffect, useRef } from 'react'
import { DataCard as DataCardType, BADGE_STYLES } from '@/lib/types'

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

export default function DataCard({ card, index }: DataCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const categoryColor = CATEGORY_COLORS[card.category] || '#84cc16'
  const style = BADGE_STYLES[card.category] || BADGE_STYLES.health

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const delay = index * 60
    setTimeout(() => {
      if (el) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }
    }, delay)
  }, [index])

  return (
    <div
      ref={ref}
      className="glass-card p-4 flex flex-col gap-3 transition-all duration-[450ms] ease-out hover:bg-white/[0.08] cursor-default group"
      style={{ opacity: 0, transform: 'translateY(10px)' }}
    >
      <div className="flex items-start justify-between">
        <span
          className="px-2 py-0.5 rounded text-[8px] font-bold tracking-[0.2em] uppercase border"
          style={{ background: `${categoryColor}15`, color: categoryColor, borderColor: `${categoryColor}30` }}
        >
          {card.badge_label}
        </span>
        <div className="w-2 h-2 rounded-full opacity-20 group-hover:opacity-60 transition-opacity" style={{ backgroundColor: categoryColor }} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-bold leading-tight font-syne text-white/90 group-hover:text-white transition-colors mb-2">
          {card.title}
        </h3>
        <p className="text-[10px] text-white/40 leading-relaxed font-mono tracking-tight group-hover:text-white/60 transition-colors">
          {card.detail}
        </p>
      </div>

      {/* Meta Indicators */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex -space-x-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-4 h-4 rounded-full border border-bg bg-white/10" />
          ))}
        </div>
        <span className="text-[8px] font-bold tracking-widest text-white/20 uppercase">Source: OpenData</span>
      </div>
    </div>
  )
}
