'use client'

import { DataCard as DataCardType } from '@/lib/types'
import DataCard from './DataCard'

interface FloatingCardsProps {
  cards: DataCardType[]
  isFocusMode?: boolean
}

export default function FloatingCards({ cards, isFocusMode }: FloatingCardsProps) {
  if (cards.length === 0) return null

  return (
    <div className={`absolute bottom-28 z-30 w-[340px] max-h-[50vh] overflow-y-auto scrollbar-none pointer-events-auto transition-all duration-1000 ease-in-out ${isFocusMode ? 'right-6 opacity-40 hover:opacity-100' : 'left-4'}`}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-health shadow-[0_0_6px_#84cc16]" />
        <span className="text-[9px] font-bold tracking-[0.2em] text-white/40 uppercase">
          Intelligence Briefing
        </span>
        <span className="text-[9px] font-bold text-health/60">{cards.length}</span>
      </div>
      <div className="space-y-3">
        {cards.map((card, i) => (
          <DataCard key={`${card.badge_label}-${i}`} card={card} index={i} />
        ))}
      </div>
    </div>
  )
}
