'use client'

import { QRCodeSVG } from 'qrcode.react'
import { AgentState, DataCard as DataCardType, ToolCall, SessionSummary } from '@/lib/types'
import Waveform from './Waveform'
import DataCard from './DataCard'

interface IntelligenceBriefProps {
  agentState: AgentState
  cards: DataCardType[]
  toolCalls: ToolCall[]
  transcript: string
  sessionId: string | null
  remoteUrl: string | null
  remoteConnected: boolean
  onSendQuery?: (text: string) => void
  hasImage?: boolean
  sessionSummary?: SessionSummary | null
}

const STATE_LABEL: Record<AgentState, string> = {
  idle: 'SYSTEM_READY',
  listening: 'LISTENING',
  processing: 'ANALYZING_GRID',
  speaking: 'RESPONDING',
}

const STATE_COLOR: Record<AgentState, string> = {
  idle: '#ffffff30',
  listening: '#84cc16',
  processing: '#f59e0b',
  speaking: '#3b82f6',
}

export default function IntelligenceBrief({
  agentState,
  cards,
  toolCalls,
  transcript,
  sessionId,
  remoteUrl,
  remoteConnected,
  onSendQuery,
  hasImage,
  sessionSummary,
}: IntelligenceBriefProps) {
  const stateColor = STATE_COLOR[agentState]
  const stateLabel = STATE_LABEL[agentState]

  // Build remote page URL
  const remoteFullUrl = typeof window !== 'undefined' && remoteUrl
    ? `${window.location.origin}${remoteUrl}`
    : null

  return (
    <div className="w-[320px] h-screen glass border-l-0 flex flex-col z-50 font-mono">

      {/* Header */}
      <div className="px-6 py-8 border-b border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-1.5 h-1.5 rounded-full status-pulse"
            style={{ background: stateColor, boxShadow: `0 0 8px ${stateColor}` }}
          />
          <span className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase">
            {stateLabel}
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight font-syne text-white mb-1 uppercase italic">
          AI ANALYSIS & RESPONSE
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold tracking-[0.1em] text-white/20">AGENT_ANTIGRAVITY v4.0.2</p>
          <div className={`w-2 h-2 rounded-full ${remoteConnected ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-white/10'}`} />
        </div>
      </div>

      {/* Waveform & Transcript */}
      <div className="px-6 py-8 border-b border-white/5 bg-white/[0.02]">
        <Waveform state={agentState} />
        <div className="mt-6 min-h-[50px]">
          {transcript ? (
            <p className="text-[11px] leading-relaxed font-medium text-white/90 italic">
              "{transcript}"
            </p>
          ) : (
            <p className="text-[10px] tracking-wide text-white/20 uppercase">
              {agentState === 'idle' ? 'Awaiting grid commands...' : 'Processing telemetry...'}
            </p>
          )}
        </div>
      </div>

      {/* Tool Progress */}
      {toolCalls.length > 0 && (
        <div className="px-6 py-4 border-b border-white/5 overflow-hidden bg-white/[0.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">Active Subprocesses</span>
            <span className="text-[9px] font-bold text-[#15BFD2]">{toolCalls.filter(t => t.status === 'complete').length}/{toolCalls.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {toolCalls.map((tc) => (
              <div
                key={tc.tool}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[8px] font-bold tracking-widest transition-all
                  ${tc.status === 'complete' ? 'bg-health/10 border-health/20 text-health'
                    : tc.status === 'error' ? 'bg-safety/10 border-safety/20 text-safety'
                      : 'bg-white/5 border-white/10 text-white/20 animate-pulse'}`}
              >
                {tc.tool.replace('query_', '').replace('_', ' ').toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights Stream */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-none">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[9px] font-bold tracking-[0.2em] text-white/20 uppercase">Intelligence Briefing</span>
          <div className="w-12 h-px bg-white/5" />
        </div>

        {cards.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center opacity-10">
            <div className="w-8 h-8 rounded-full border border-dashed border-white mb-4 animate-spin-slow" />
            <p className="text-[9px] font-bold tracking-[0.3em]">SYNCHRONIZING</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cards.map((card, i) => (
              <DataCard key={`${card.badge_label}-${i}`} card={card} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Footer: Recent Sync / Mobile Link */}
      <div className="mt-auto p-6 bg-white/[0.02] border-t border-white/5 space-y-6">
        {/* Recent Explore section from main */}
        <div>
          <p className="text-[9px] tracking-[0.2em] text-white/20 font-bold mb-3 uppercase">Recent Exploration</p>
          {sessionSummary ? (
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
              <div className="w-1 flex-shrink-0 h-8 bg-health/40 rounded-full" />
              <div>
                <p className="text-[10px] text-white/80 font-bold uppercase">{sessionSummary.location_name}</p>
                <p className="text-[8px] text-white/20 mt-1 uppercase">
                  {(() => {
                    const ended = sessionSummary.ended_at ?? sessionSummary.started_at
                    const diff = Date.now() - new Date(ended).getTime()
                    const mins = Math.floor(diff / 60000)
                    if (mins < 1) return 'JUST NOW'
                    if (mins < 60) return `${mins}M AGO`
                    const hrs = Math.floor(mins / 60)
                    if (hrs < 24) return `${hrs}H AGO`
                    return `${Math.floor(hrs / 24)}D AGO`
                  })()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-white/10 italic">No recent explorations in grid history.</p>
          )}
        </div>

        {/* QR Section */}
        {!remoteConnected && remoteFullUrl ? (
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">Grid_Bridge</p>
              <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-bold animate-pulse">
                PENDING_SYNC
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg opacity-80 hover:opacity-100 transition-opacity">
                <QRCodeSVG value={remoteFullUrl} size={56} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] text-white/30 leading-relaxed mb-2 uppercase tracking-tighter">
                  Bridge node for mobile telemetry.
                </p>
                <code className="text-[8px] text-cyan-glow block font-bold">SHA: {sessionId?.slice(0, 12)}</code>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-health animate-pulse shadow-[0_0_8px_#84cc16]" />
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Mobile_Node Active</p>
            </div>
            <button className="text-[9px] font-bold text-white/10 hover:text-safety transition-colors">SHUTDOWN</button>
          </div>
        )}
      </div>
    </div>
  )
}
