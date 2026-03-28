'use client'

import { QRCodeSVG } from 'qrcode.react'
import { AgentState, DataCard as DataCardType, ToolCall } from '@/lib/types'
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
}: IntelligenceBriefProps) {
  const stateColor = STATE_COLOR[agentState]
  const stateLabel = STATE_LABEL[agentState]

  // Build remote page URL
  const remoteFullUrl = typeof window !== 'undefined' && remoteUrl
    ? `${window.location.origin}${remoteUrl}`
    : null

  return (
    <div className="w-[320px] h-screen glass border-l-0 flex flex-col z-50">

      {/* Header */}
      <div className="px-6 py-8 border-b border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-1.5 h-1.5 rounded-full status-pulse"
            style={{ background: stateColor, boxShadow: `0 0 8px ${stateColor}` }}
          />
          <span className="text-[10px] font-bold tracking-[0.3em] text-white/40">
            {stateLabel}
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight font-syne text-white mb-1">
          AI ANALYSIS & RESPONSE
        </h2>
        <p className="text-[9px] font-bold tracking-[0.1em] text-white/20">AGENT_ANTIGRAVITY v4.0.2</p>
      </div>

      {/* Waveform & Transcript */}
      <div className="px-6 py-6 border-b border-white/5 bg-white/[0.02]">
        <Waveform state={agentState} />
        <div className="mt-4 min-h-[40px]">
          {transcript ? (
            <p className="text-[11px] leading-relaxed font-medium text-white/90 italic">
              "{transcript}"
            </p>
          ) : (
            <p className="text-[10px] tracking-wide text-white/20">
              {agentState === 'idle' ? 'Awaiting grid commands...' : 'Processing telemetry...'}
            </p>
          )}
        </div>
      </div>

      {/* Tool Progress */}
      {toolCalls.length > 0 && (
        <div className="px-6 py-4 border-b border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">Active Subprocesses</span>
            <span className="text-[9px] font-bold text-cyan-glow">{toolCalls.filter(t => t.status === 'complete').length}/{toolCalls.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {toolCalls.map((tc) => (
              <div
                key={tc.tool}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[9px] font-bold tracking-wider transition-all
                  ${tc.status === 'complete' ? 'bg-health/10 border-health/20 text-health'
                    : tc.status === 'error' ? 'bg-safety/10 border-safety/20 text-safety'
                      : 'bg-white/5 border-white/10 text-white/40 animate-pulse'}`}
              >
                {tc.tool.replace('query_', '').replace('_', ' ').toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights Stream */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-none">
        <div className="flex items-center justify-between px-2 mb-4">
          <span className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">Intelligence Briefing</span>
          <div className="w-12 h-px bg-white/10" />
        </div>

        {cards.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center opacity-20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M12 2v20M2 12h20" strokeDasharray="4 4" />
            </svg>
            <p className="text-[9px] font-bold tracking-[0.2em]">NO_DATA_STREAM</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card, i) => (
              <DataCard key={`${card.badge_label}-${i}`} card={card} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Grid Connection / QR */}
      <div className="mt-auto p-6 bg-white/[0.02] border-t border-white/5">
        {!remoteConnected && remoteFullUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">Grid_Bridge</p>
              <div className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/20 text-amber-500 text-[8px] font-bold animate-pulse">
                PENDING_SYNC
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <QRCodeSVG value={remoteFullUrl} size={64} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-white/40 leading-relaxed mb-2">
                  Scan to bridge secure mobile telemetry for live video/voice sync.
                </p>
                <code className="text-[9px] text-cyan-glow block font-bold">NODE: {sessionId?.slice(0, 8)}</code>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-health/10 border border-health/20 flex items-center justify-center text-health">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white uppercase tracking-wider">Telemetry Link</p>
                <p className="text-[9px] text-health font-bold">ACTIVE_ENCRYPTED</p>
              </div>
            </div>
            <button className="text-[9px] font-bold text-white/20 hover:text-white transition-colors">DISCONNECT</button>
          </div>
        )}
      </div>

    </div>
  )
}
