'use client'

import { SessionSummary, SOURCE_COLORS } from '@/lib/types'

interface SessionCardProps {
  session: SessionSummary
  anomaly?: boolean
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (h > 24) return `${Math.floor(h / 24)}D AGO`
  if (h > 0) return `${h}H AGO`
  return `${m}M AGO`
}

const BOROUGH_COLORS: Record<string, string> = {
  manhattan: 'linear-gradient(135deg, #1a1412, #0f0a08)',
  brooklyn:  'linear-gradient(135deg, #0e1520, #080d15)',
  queens:    'linear-gradient(135deg, #0f1a10, #080f08)',
  bronx:     'linear-gradient(135deg, #1a0e14, #10080c)',
  default:   'linear-gradient(135deg, #141420, #0c0c14)',
}

export default function SessionCard({ session, anomaly }: SessionCardProps) {
  const borough = session.location_address?.toLowerCase().includes('brooklyn') ? 'brooklyn'
    : session.location_address?.toLowerCase().includes('manhattan') ? 'manhattan'
    : 'default'

  const thumbColor = BOROUGH_COLORS[borough] || BOROUGH_COLORS.default
  const uniqueSources = [...new Set(session.cards.map(c => c.category))]

  return (
    <div
      className="bg-surface border rounded-lg p-4 cursor-pointer transition-all duration-150 hover:border-border2 group"
      style={{
        borderColor: anomaly ? '#ef4444' : 'var(--border)',
        borderLeftWidth: anomaly ? '2px' : '1px',
        borderLeftColor: anomaly ? '#ef4444' : 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-12 h-9 rounded flex-shrink-0"
            style={{ background: thumbColor }}
          />
          <div>
            <p className="font-display font-semibold text-[14px] text-[#f4f4f5] leading-tight">
              {session.location_name}
            </p>
            {session.location_address && (
              <p className="font-mono font-light text-[9px] text-muted mt-0.5">
                {session.location_address}
              </p>
            )}
          </div>
        </div>
        <span className="font-mono text-[9px] text-muted flex-shrink-0 ml-2">
          {session.ended_at ? timeAgo(session.ended_at) : '—'}
        </span>
      </div>

      {/* Findings preview */}
      {session.cards.length > 0 && (
        <div className="border-t border-border pt-3 mb-3 flex flex-col gap-1.5">
          {session.cards.slice(0, 3).map((card, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="font-mono text-[7px] tracking-[0.1em] px-1.5 py-0.5 rounded-[2px] flex-shrink-0"
                style={{
                  background: `${SOURCE_COLORS[card.category]}18`,
                  color: SOURCE_COLORS[card.category] || '#84cc16',
                }}
              >
                {card.badge_label.split(' ')[0]}
              </span>
              <span className="font-mono font-light text-[9px] text-[#f4f4f5] truncate">
                {card.title} · {card.detail.slice(0, 50)}{card.detail.length > 50 ? '...' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Source dots */}
        <div className="flex gap-1.5">
          {uniqueSources.map((source) => (
            <div
              key={source}
              className="w-1.5 h-1.5 rounded-full border"
              style={{
                background: SOURCE_COLORS[source] || '#84cc16',
                borderColor: `${SOURCE_COLORS[source] || '#84cc16'}60`,
              }}
            />
          ))}
          {uniqueSources.length === 0 && (
            <span className="font-mono text-[8px] text-dim">No data</span>
          )}
        </div>

        {/* View brief — appears on hover */}
        <span className="font-mono text-[8px] tracking-[0.1em] text-green opacity-0 group-hover:opacity-100 transition-opacity">
          VIEW BRIEF →
        </span>
      </div>
    </div>
  )
}
