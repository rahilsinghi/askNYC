'use client'

import { useEffect, useRef } from 'react'
import { DataCard as DataCardType, BADGE_STYLES } from '@/lib/types'

interface DataCardProps {
  card: DataCardType
  index: number
}

const DOC_COLORS: Record<string, string> = {
  health:     'rgba(132,204,22,0.2)',
  safety:     'rgba(59,130,246,0.2)',
  permits:    'rgba(59,130,246,0.2)',
  complaints: 'rgba(245,158,11,0.2)',
  violations: 'rgba(245,158,11,0.2)',
  nypd:       'rgba(239,68,68,0.2)',
}

export default function DataCard({ card, index }: DataCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const style = BADGE_STYLES[card.category] || BADGE_STYLES.health
  const docColor = DOC_COLORS[card.category] || 'rgba(132,204,22,0.2)'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Stagger entrance
    const delay = index * 80
    setTimeout(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateX(0)'
    }, delay)
  }, [index])

  return (
    <div
      ref={ref}
      className="bg-surface border border-border rounded-lg p-3 mb-2 flex items-start gap-3 transition-all duration-[350ms] ease-out"
      style={{ opacity: 0, transform: 'translateX(16px)' }}
    >
      {/* Card body */}
      <div className="flex-1 min-w-0">
        <span
          className="inline-block font-mono text-[7.5px] tracking-[0.15em] font-medium px-1.5 py-0.5 rounded-[3px] mb-1.5"
          style={{ background: style.bg, color: style.text }}
        >
          {card.badge_label}
        </span>
        <p className="font-display font-semibold text-[18px] leading-tight text-[#f4f4f5] mb-1">
          {card.title}
        </p>
        <p className="font-mono font-light text-[9.5px] text-muted leading-relaxed tracking-[0.01em]">
          {card.detail}
        </p>
      </div>

      {/* Document thumbnail */}
      <div
        className="w-10 h-[50px] rounded border border-border2 flex-shrink-0 overflow-hidden"
        style={{ transform: 'rotate(1.5deg)' }}
      >
        <div className="h-[10px] w-full" style={{ background: docColor }} />
        <div className="flex-1 p-1 flex flex-col gap-[3px] pt-1.5">
          <div className="h-[2px] w-full rounded-full" style={{ background: docColor }} />
          <div className="h-[2px] w-4/5 rounded-full bg-white/[0.06]" />
          <div className="h-[2px] w-full rounded-full bg-white/[0.06]" />
          <div className="h-[2px] w-3/5 rounded-full" style={{ background: `${docColor.replace('0.2','0.15')}` }} />
          <div className="h-[2px] w-full rounded-full bg-white/[0.06]" />
          <div className="h-[2px] w-4/5 rounded-full bg-white/[0.06]" />
        </div>
      </div>
    </div>
  )
}
