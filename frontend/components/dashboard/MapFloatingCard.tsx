'use client'

import { motion } from 'framer-motion'
import {
  Utensils, Building2, Shield, HardHat, TrainFront,
  AlertTriangle, MapPin, Activity, Database,
} from 'lucide-react'
import { DataCard as DataCardType } from '@/lib/types'

interface MapFloatingCardProps {
  index: number
  card: DataCardType
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  health: <Utensils size={13} />,
  safety: <Shield size={13} />,
  nypd: <Shield size={13} />,
  permits: <HardHat size={13} />,
  complaints: <AlertTriangle size={13} />,
  violations: <AlertTriangle size={13} />,
  evictions: <Building2 size={13} />,
  transit: <TrainFront size={13} />,
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

const CATEGORY_LABEL: Record<string, string> = {
  health: 'Health & Safety',
  safety: 'Public Safety',
  nypd: 'NYPD Records',
  permits: 'DOB Permits',
  complaints: '311 Reports',
  violations: 'HPD Violations',
  evictions: 'Eviction Records',
  transit: 'Transit Access',
}

export default function MapFloatingCard({ index, card }: MapFloatingCardProps) {
  const color = CATEGORY_COLOR[card.category] || '#84cc16'
  const icon = CATEGORY_ICON[card.category] || <MapPin size={13} />
  const categoryLabel = CATEGORY_LABEL[card.category] || card.category

  // Extract key numbers from detail text for stat display
  const numbers = card.detail.match(/\d+/g)?.slice(0, 3) || []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-[280px] rounded-xl overflow-hidden pointer-events-auto backdrop-blur-xl"
      style={{
        background: 'rgba(10, 18, 32, 0.85)',
        border: `1px solid ${color}40`,
        boxShadow: `0 0 30px rgba(0,0,0,0.5), 0 0 15px ${color}20, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Colored top accent */}
      <div
        className="h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}40, transparent)` }}
      />

      {/* Colored left border strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: `linear-gradient(180deg, ${color}, ${color}60)` }}
      />

      <div className="p-3.5 pl-4">
        {/* Header: badge + icon */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[8px] font-black tracking-[0.2em] uppercase px-2 py-[3px] rounded-md"
            style={{
              color,
              background: `${color}15`,
              border: `1px solid ${color}30`,
            }}
          >
            {card.badge_label}
          </span>
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15`, color }}
          >
            {icon}
          </div>
        </div>

        {/* Title — the headline finding */}
        <h3 className="text-[14px] font-bold text-white/95 leading-snug mb-1.5">
          {card.title}
        </h3>

        {/* Detail — the actual data insight */}
        <p className="text-[10px] leading-[1.5] text-white/55 font-mono tracking-tight mb-3">
          {card.detail}
        </p>

        {/* Stat pills extracted from detail */}
        {numbers.length > 0 && (
          <div className="flex gap-1.5 mb-3">
            {numbers.map((num, i) => (
              <span
                key={i}
                className="px-2 py-[2px] rounded text-[9px] font-bold font-mono"
                style={{
                  color: i === 0 ? color : 'rgba(255,255,255,0.5)',
                  background: i === 0 ? `${color}15` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${i === 0 ? `${color}25` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {num}
              </span>
            ))}
          </div>
        )}

        {/* Footer: source + live indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <Database size={8} className="text-white/25" />
            <span className="text-[7px] font-mono tracking-[0.1em] text-white/25 uppercase">
              {categoryLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={8} style={{ color: `${color}80` }} />
            <span className="text-[7px] font-mono text-white/20">NYC OpenData</span>
          </div>
        </div>
      </div>

      {/* Ambient glow */}
      <div
        className="absolute -inset-[1px] rounded-xl opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${color}08, transparent 70%)`,
        }}
      />
    </motion.div>
  )
}
