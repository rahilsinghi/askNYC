'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { DataCard as DataCardType, ToolCall } from '@/lib/types'
import {
  CheckCircle2, Loader2, MessageSquare,
  Lightbulb, TrendingUp, AlertTriangle as AlertIcon, Info,
  Database, Activity,
  Utensils, Building2, Shield, HardHat, TrainFront, MapPin,
} from 'lucide-react'

interface MapCardOverlayProps {
  cards: DataCardType[]
  toolCalls?: ToolCall[]
  transcript?: string
  agentState?: string
}

// ── Category Styling ──────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  health: '#84cc16', safety: '#3b82f6', nypd: '#ef4444',
  permits: '#3b82f6', complaints: '#f59e0b', violations: '#f59e0b',
  evictions: '#a855f7', transit: '#06b6d4',
}

const CAT_ICON: Record<string, React.ReactNode> = {
  health: <Utensils size={12} />, safety: <Shield size={12} />,
  nypd: <Shield size={12} />, permits: <HardHat size={12} />,
  complaints: <AlertTriangle size={12} />, violations: <AlertTriangle size={12} />,
  evictions: <Building2 size={12} />, transit: <TrainFront size={12} />,
}

const CAT_LABEL: Record<string, string> = {
  health: 'Health & Safety', safety: 'Public Safety', nypd: 'NYPD Records',
  permits: 'DOB Permits', complaints: '311 Reports', violations: 'HPD Violations',
  evictions: 'Eviction Records', transit: 'Transit Access',
}

const TOOL_COLORS: Record<string, string> = {
  query_restaurant_inspections: '#84cc16', query_311_complaints: '#f59e0b',
  query_dob_permits: '#3b82f6', query_hpd_violations: '#f59e0b',
  query_nypd_incidents: '#ef4444', query_evictions: '#a855f7',
  query_subway_entrances: '#06b6d4', geocode_location: '#22d3ee',
  investigate_location: '#84cc16',
}

const INSIGHT_ICONS = [Lightbulb, TrendingUp, AlertIcon, Info]
const INSIGHT_COLORS = ['#22d3ee', '#84cc16', '#f59e0b', '#a855f7', '#3b82f6', '#ef4444']

function AlertTriangle(props: { size: number }) {
  return <AlertIcon {...props} />
}

function getToolLabel(tool: string): string {
  return tool.replace('query_', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function extractInsight(card: DataCardType): string {
  const sentences = card.detail.split(/\.\s+/).filter(s => s.length > 15)
  const withNumbers = sentences.filter(s => /\d/.test(s))
  const pick = withNumbers[0] || sentences[0] || card.detail
  return pick.length > 120 ? pick.slice(0, 117) + '…' : pick.replace(/\.$/, '')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DataCardItem({ card, i }: { card: DataCardType; i: number }) {
  const color = CAT_COLOR[card.category] || '#84cc16'
  const icon = CAT_ICON[card.category] || <MapPin size={12} />
  const label = CAT_LABEL[card.category] || card.category
  const numbers = card.detail.match(/\d[\d,]*/g)?.slice(0, 4) || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: i * 1.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl overflow-hidden backdrop-blur-xl"
      style={{
        background: 'rgba(10, 18, 32, 0.88)',
        border: `1px solid ${color}35`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 12px ${color}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* Top accent gradient */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}40, transparent)` }} />
      {/* Left border */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `linear-gradient(180deg, ${color}, ${color}50)` }} />

      <div className="p-3 pl-4">
        {/* Badge + icon row */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[7px] font-black tracking-[0.2em] uppercase px-2 py-[2px] rounded-md"
            style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}
          >
            {card.badge_label}
          </span>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${color}12`, color }}>
            {icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-bold text-white/95 leading-snug mb-1">{card.title}</h3>

        {/* Detail */}
        <p className="text-[9px] leading-[1.55] text-white/50 font-mono tracking-tight mb-2">
          {card.detail}
        </p>

        {/* Stat pills */}
        {numbers.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {numbers.map((num, j) => (
              <span
                key={j}
                className="px-1.5 py-[1px] rounded text-[8px] font-bold font-mono"
                style={{
                  color: j === 0 ? color : 'rgba(255,255,255,0.45)',
                  background: j === 0 ? `${color}12` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${j === 0 ? `${color}20` : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                {num}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-1">
            <Database size={7} className="text-white/20" />
            <span className="text-[7px] font-mono text-white/20 uppercase tracking-wider">{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity size={7} style={{ color: `${color}60` }} />
            <span className="text-[7px] font-mono text-white/15">NYC OpenData</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function InsightBubble({ card, i }: { card: DataCardType; i: number }) {
  const color = INSIGHT_COLORS[i % INSIGHT_COLORS.length]
  const IconComp = INSIGHT_ICONS[i % INSIGHT_ICONS.length]
  const insight = extractInsight(card)

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 1.2 + 0.6, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg rounded-tl-sm px-3 py-2 backdrop-blur-xl"
      style={{
        background: 'rgba(10, 18, 32, 0.78)',
        border: `1px solid ${color}25`,
        boxShadow: `0 2px 12px rgba(0,0,0,0.3), 0 0 6px ${color}08`,
      }}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center" style={{ background: `${color}12` }}>
          <IconComp size={9} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[6px] font-black tracking-[0.15em] uppercase block mb-0.5" style={{ color: `${color}80` }}>
            {card.badge_label}
          </span>
          <p className="text-[8px] leading-[1.5] text-white/55 font-mono">{insight}</p>
        </div>
      </div>
    </motion.div>
  )
}

function ToolPill({ tc, i }: { tc: ToolCall; i: number }) {
  const color = TOOL_COLORS[tc.tool] || '#84cc16'
  const done = tc.status === 'complete'
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.35, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-xl"
      style={{
        background: 'rgba(10, 18, 32, 0.75)',
        border: `1px solid ${done ? `${color}45` : 'rgba(255,255,255,0.06)'}`,
        boxShadow: done ? `0 0 8px ${color}12` : 'none',
      }}
    >
      {done
        ? <CheckCircle2 size={9} style={{ color }} />
        : <Loader2 size={9} className="animate-spin" style={{ color }} />
      }
      <span className="text-[7px] font-mono font-bold tracking-wider text-white/55 uppercase whitespace-nowrap">
        {getToolLabel(tc.tool)}
      </span>
      {done && (
        <span className="text-[6px] font-mono font-bold px-1 py-[1px] rounded" style={{ color, background: `${color}12` }}>
          DONE
        </span>
      )}
    </motion.div>
  )
}

// ── Main Overlay ──────────────────────────────────────────────────────────────

export default function MapCardOverlay({
  cards,
  toolCalls = [],
  transcript = '',
  agentState = 'idle',
}: MapCardOverlayProps) {
  const hasContent = cards.length > 0 || toolCalls.length > 0
  const showTranscript = transcript.length > 0 && agentState !== 'idle'

  if (!hasContent && !showTranscript) return null

  return (
    <div className="fixed left-16 top-14 bottom-28 z-[5] w-[320px] pointer-events-auto overflow-y-auto overflow-x-hidden scrollbar-none">
      <div className="flex flex-col gap-3 p-3 pr-2">

        {/* Section: Active agents */}
        {toolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-1">
            <span className="text-[7px] font-mono font-bold tracking-[0.25em] text-white/25 uppercase pl-1">
              Active Agents
            </span>
            <div className="flex flex-wrap gap-1.5">
              {toolCalls.slice(0, 6).map((tc, i) => (
                <ToolPill key={`${tc.tool}-${i}`} tc={tc} i={i} />
              ))}
            </div>
          </div>
        )}

        {/* Section: Transcript bubble */}
        {showTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl rounded-bl-sm px-3 py-2.5 backdrop-blur-xl"
            style={{
              background: 'rgba(10, 18, 32, 0.85)',
              border: '1px solid rgba(34, 211, 238, 0.25)',
              boxShadow: '0 0 15px rgba(34, 211, 238, 0.06)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare size={8} className="text-cyan-400/60" />
              <span className="text-[6px] font-mono font-bold tracking-[0.2em] text-cyan-400/40 uppercase">
                AI Analysis
              </span>
              {agentState === 'speaking' && (
                <span className="flex gap-[2px] ml-1">
                  {[0, 1, 2].map(j => (
                    <motion.span
                      key={j}
                      className="w-[2.5px] h-[2.5px] rounded-full bg-cyan-400/50"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: j * 0.15 }}
                    />
                  ))}
                </span>
              )}
            </div>
            <p className="text-[9px] leading-[1.6] text-white/60 font-mono">
              {transcript.length > 200 ? transcript.slice(0, 197) + '…' : transcript}
            </p>
          </motion.div>
        )}

        {/* Section: Data findings */}
        {cards.length > 0 && (
          <>
            <span className="text-[7px] font-mono font-bold tracking-[0.25em] text-white/25 uppercase pl-1 mt-1">
              Findings — {cards.length} dataset{cards.length !== 1 ? 's' : ''}
            </span>

            <AnimatePresence>
              {cards.map((card, i) => (
                <div key={`${card.badge_label}-${card.title}-${i}`} className="flex flex-col gap-2">
                  <DataCardItem card={card} i={i} />
                  <InsightBubble card={card} i={i} />
                </div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}
