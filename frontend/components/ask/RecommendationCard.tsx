'use client'

import { motion } from 'framer-motion'
import { MapPin, Trophy, TrendingUp } from 'lucide-react'
import type { Recommendation } from '@/lib/types'
import { BADGE_STYLES, type DataCategory } from '@/lib/types'

interface RecommendationCardProps {
  recommendation: Recommendation
  index: number
  rank: number
}

function scoreColor(score: number): string {
  if (score >= 80) return '#84cc16'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function scoreGlow(score: number): string {
  if (score >= 80) return 'rgba(132,204,22,0.3)'
  if (score >= 60) return 'rgba(245,158,11,0.3)'
  return 'rgba(239,68,68,0.3)'
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very Good'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Needs Review'
}

const DIMENSION_LABELS: Record<string, string> = {
  hygiene: 'Hygiene',
  complaints: 'Complaints',
  safety: 'Safety',
  housing: 'Housing',
  transit: 'Transit',
  construction: 'Activity',
}

export default function RecommendationCard({ recommendation: rec, index, rank }: RecommendationCardProps) {
  const color = scoreColor(rec.score)
  const glow = scoreGlow(rec.score)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.2,
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative group"
    >
      <div
        className="glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.01]"
        style={{
          boxShadow: `0 0 30px ${glow}, 0 4px 30px rgba(0,0,0,0.4)`,
          borderColor: `${color}20`,
        }}
      >
        {/* Top accent line */}
        <div
          className="h-px w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
        />

        <div className="p-5">
          {/* Header: Rank + Name + Score */}
          <div className="flex items-start gap-4">
            {/* Rank badge */}
            <div className="flex-shrink-0 relative">
              {rank <= 3 && (
                <div
                  className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: rank === 1 ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.05)' }}
                >
                  {rank === 1 ? (
                    <Trophy className="w-3 h-3 text-yellow-400" />
                  ) : (
                    <span className="text-[9px] font-bold text-white/30">#{rank}</span>
                  )}
                </div>
              )}

              {/* Score circle */}
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  {/* Background ring */}
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  {/* Score ring */}
                  <motion.circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - rec.score / 100) }}
                    transition={{ delay: index * 0.2 + 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    className="text-lg font-bold font-mono"
                    style={{ color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.2 + 0.5 }}
                  >
                    {rec.score}
                  </motion.span>
                </div>
              </div>
            </div>

            {/* Name + address */}
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-base font-display font-bold text-white/90 truncate">
                {rec.name}
              </h3>
              {rec.address && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-white/20 flex-shrink-0" />
                  <span className="text-[11px] text-white/35 truncate">{rec.address}</span>
                </div>
              )}
              <div className="mt-1.5">
                <span
                  className="text-[9px] font-bold tracking-wider uppercase"
                  style={{ color: `${color}CC` }}
                >
                  {scoreLabel(rec.score)}
                </span>
              </div>
            </div>
          </div>

          {/* Score breakdown bars */}
          {Object.keys(rec.score_breakdown).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(rec.score_breakdown).map(([key, value], i) => (
                <div key={key} className="flex items-center gap-2.5">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider w-20 text-right flex-shrink-0">
                    {DIMENSION_LABELS[key] || key}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${scoreColor(value)}80, ${scoreColor(value)})`,
                        boxShadow: `0 0 6px ${scoreColor(value)}40`,
                      }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${value}%` }}
                      transition={{
                        delay: index * 0.2 + 0.4 + i * 0.1,
                        duration: 0.8,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-white/25 w-6 text-right">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Badges */}
          {rec.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {rec.badges.map((badge, i) => {
                const style = BADGE_STYLES[badge.category as DataCategory]
                return (
                  <motion.span
                    key={`${badge.category}-${i}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.2 + 0.6 + i * 0.05 }}
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase"
                    style={{
                      background: style?.bg || 'rgba(255,255,255,0.05)',
                      color: style?.text || 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {badge.label}
                  </motion.span>
                )
              })}
            </div>
          )}

          {/* Reasoning */}
          {rec.reasoning.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3 h-3 text-white/20" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-white/30 uppercase">
                  Why we recommend this
                </span>
              </div>
              <ul className="space-y-1.5">
                {rec.reasoning.map((reason, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 + 0.8 + i * 0.1 }}
                    className="flex items-start gap-2 text-[11px] text-white/50 leading-relaxed"
                  >
                    <div
                      className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: color, boxShadow: `0 0 4px ${color}60` }}
                    />
                    {reason}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom accent */}
        <div
          className="h-px w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${color}20, transparent)` }}
        />
      </div>
    </motion.div>
  )
}
