'use client'

import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { AgentState, DataCard as DataCardType, ToolCall, SessionSummary } from '@/lib/types'
import Waveform from './Waveform'

interface IntelligenceBriefProps {
  agentState: AgentState
  toolCalls: ToolCall[]
  transcript: string
  lastQuery?: string
  sessionId: string | null
  remoteUrl?: string | null
  remoteConnected?: boolean
  onSendQuery?: (text: string) => void
  hasImage?: boolean
  sessionSummary?: SessionSummary | null
  cards?: DataCardType[]
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  investigate_location: 'ANALYZING',
  geocode_location: 'GEOCODING',
  query_restaurant_inspections: 'HEALTH INSPECTIONS',
  query_311_complaints: '311 COMPLAINTS',
  query_nypd_incidents: 'NYPD DATA',
  query_hpd_violations: 'HPD VIOLATIONS',
  query_dob_permits: 'DOB PERMITS',
  query_subway_entrances: 'SUBWAY DATA',
  query_evictions: 'EVICTIONS',
}

const STATE_COLOR: Record<AgentState, string> = {
  idle: 'text-white/20',
  listening: 'text-cyan-400',
  processing: 'text-amber-400',
  speaking: 'text-health',
}

const STATE_LABEL: Record<AgentState, string> = {
  idle: 'IDLE_SYNC',
  listening: 'LISTENING',
  processing: 'THINKING',
  speaking: 'RESPONDING',
}

function QrBridge({ url, sessionId }: { url: string; sessionId: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="pt-4 border-t border-white/5 space-y-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between group"
      >
        <p className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase group-hover:text-white/50 transition-colors">
          Grid_Bridge
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-white/20 group-hover:text-white/40 transition-colors">
            {open ? 'HIDE' : 'SHOW'}
          </span>
          <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-bold animate-pulse">
            PENDING_SYNC
          </div>
        </div>
      </button>

      {open && (
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-lg opacity-80 hover:opacity-100 transition-opacity">
            <QRCodeSVG value={url} size={56} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] text-white/30 leading-relaxed mb-2 uppercase tracking-tighter">
              Bridge node for mobile telemetry.
            </p>
            <code className="text-[8px] text-cyan-glow block font-bold">SHA: {sessionId?.slice(0, 12)}</code>
          </div>
        </div>
      )}
    </div>
  )
}

export default function IntelligenceBrief({
  agentState,
  toolCalls,
  transcript,
  lastQuery,
  sessionId,
  remoteUrl,
  remoteConnected,
  sessionSummary,
  cards = [],
}: IntelligenceBriefProps) {
  const stateColor = STATE_COLOR[agentState]
  const stateLabel = STATE_LABEL[agentState]

  const remoteFullUrl = typeof window !== 'undefined' && remoteUrl
    ? `${window.location.origin}${remoteUrl}`
    : null

  return (
    <div className="w-[380px] h-screen glass border-l border-white/10 flex flex-col z-[100] font-sans p-8 overflow-y-auto scrollbar-none bg-[#07111D]/90 backdrop-blur-3xl shadow-[-20px_0_50px_rgba(0,0,0,0.8)]">

      {/* Header Section */}
      <h1 className="text-[20px] font-bold text-white mb-1 tracking-tight uppercase">
        AI Analysis & Response
      </h1>
      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-8">
        AGENT_ANTIGRAVITY v4.0.2
      </p>

      {/* Your Query */}
      {lastQuery && (
        <div className="mb-6 pb-4 border-b border-white/5">
          <p className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase mb-2">Your Query</p>
          <div className="border-l-2 border-cyan-400/40 pl-3">
            <p className="text-[12px] leading-relaxed text-white/70 italic">&ldquo;{lastQuery}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Waveform / State */}
      <div className="mb-10 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
        <Waveform state={agentState} />
        <div className="mt-6 min-h-[40px]">
          <p className="text-[12px] leading-relaxed font-medium text-white/90 italic">
            {transcript ? `"${transcript}"` : (
              <span className="text-white/20 uppercase tracking-widest text-[9px]">
                {agentState === 'idle' ? 'Awaiting grid commands...' : 'Processing telemetry...'}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tool Execution Stream */}
      {toolCalls.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Active Subprocesses</h2>
            <span className="text-[9px] font-mono text-cyan-400">{toolCalls.filter(t => t.status === 'complete').length}/{toolCalls.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {toolCalls.map((tc) => (
              <div
                key={tc.tool}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-bold tracking-widest transition-all duration-300
                  ${tc.status === 'complete' ? 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400'
                    : tc.status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500'
                      : 'bg-white/5 border-white/10 text-white/40 animate-pulse'}`}
              >
                {tc.status !== 'complete' && <div className="w-1 h-1 rounded-full bg-current animate-ping" />}
                {TOOL_DISPLAY_NAMES[tc.tool] || tc.tool.replace('query_', '').replace('_', ' ').toUpperCase()}
                {tc.status === 'complete' && <span className="ml-1 opacity-60">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings Section */}
      <div className="mb-8">
        <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">
          Intelligence Briefing
        </h2>

        {cards.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center opacity-10">
            <div className="w-8 h-8 rounded-full border border-white border-dashed animate-spin-slow mb-4" />
            <p className="text-[9px] font-bold tracking-widest">NO_DATA_STREAM</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cards.map((card, i) => (
              <div key={i} className="group relative">
                <div className="absolute -left-4 top-4 bottom-0 w-[1px] bg-white/5 group-last:bg-transparent" />
                <div className="absolute -left-6 top-4 w-4 h-[1px] bg-white/5" />

                <p className="text-[13px] leading-relaxed text-white/70 pl-2">
                  <span className="font-bold text-white italic">{card.badge_label}: </span>
                  {card.title}. {card.detail}
                  <br />
                  {card.source_url && (
                    <span className="text-cyan-400/60 text-[10px] underline cursor-pointer hover:text-cyan-400 transition-colors mt-1 inline-block">
                      {card.source_url}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto p-6 bg-white/[0.02] border-t border-white/5 space-y-6">
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

        {!remoteConnected && remoteFullUrl ? (
          <QrBridge url={remoteFullUrl} sessionId={sessionId} />
        ) : (
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-health animate-pulse shadow-[0_0_8px_#84cc16]" />
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Mobile_Node Active</p>
            </div>
            <button className="text-[9px] font-bold text-white/10 hover:text-red-400 transition-colors">SHUTDOWN</button>
          </div>
        )}

        {/* Real-time State */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]">
              GRID_LINK_ENCRYPTED
            </span>
          </div>
          <span className="text-[8px] font-mono text-white/10 uppercase font-black">NODE_ASKNYC_V2</span>
        </div>
      </div>
    </div>
  )
}
