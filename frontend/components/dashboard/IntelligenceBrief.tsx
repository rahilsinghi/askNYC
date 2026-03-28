'use client'

import { useState } from 'react'
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
  idle: 'SYSTEM ACTIVE',
  listening: 'LISTENING',
  processing: 'PROCESSING',
  speaking: 'SPEAKING',
}

const STATE_COLOR: Record<AgentState, string> = {
  idle: '#84cc16',
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
}: IntelligenceBriefProps) {
  const stateColor = STATE_COLOR[agentState]
  const stateLabel = STATE_LABEL[agentState]
  const [queryText, setQueryText] = useState('')

  // Build remote page URL
  const remoteFullUrl = typeof window !== 'undefined' && remoteUrl
    ? `${window.location.origin}${remoteUrl}`
    : null

  return (
    <div className="w-[320px] min-w-[320px] bg-bg2 flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-[5px] h-[5px] rounded-full status-pulse"
              style={{ background: stateColor }}
            />
            <span
              className="font-mono text-[8px] tracking-[0.2em]"
              style={{ color: stateColor }}
            >
              {stateLabel}
            </span>
          </div>
          <h1 className="font-display font-bold text-[26px] tracking-[-0.02em] leading-none text-[#f4f4f5]">
            ASK NYC
          </h1>
        </div>
        <div className="flex gap-2 pt-1">
          <button className="w-7 h-7 rounded-md border border-border bg-surface flex items-center justify-center text-muted hover:text-[#f4f4f5] transition-colors text-[11px]">
            ⚙
          </button>
          {/* Remote status indicator */}
          <button
            className="w-7 h-7 rounded-md border flex items-center justify-center"
            style={{
              background: remoteConnected ? 'rgba(245,158,11,0.15)' : 'var(--surface)',
              borderColor: remoteConnected ? 'rgba(245,158,11,0.3)' : 'var(--border)',
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: remoteConnected ? '#f59e0b' : '#3f3f46' }}
            />
          </button>
        </div>
      </div>

      {/* Waveform */}
      <div className="px-5 py-3 border-b border-border">
        <Waveform state={agentState} />
        {transcript && (
          <p className="font-mono font-light text-[10px] italic mt-2 leading-relaxed"
            style={{ color: 'rgba(132,204,22,0.8)' }}>
            "{transcript}"
          </p>
        )}
        {!transcript && (
          <p className="font-mono font-light text-[10px] italic mt-2 text-muted">
            {agentState === 'idle' ? 'Point the camera and ask a question...' : 'Processing...'}
          </p>
        )}
      </div>

      {/* Tool call badges */}
      {toolCalls.length > 0 && (
        <div className="px-5 py-2 border-b border-border flex flex-wrap gap-1.5">
          {toolCalls.map((tc) => (
            <span
              key={tc.tool}
              className={`font-mono text-[7px] tracking-[0.1em] px-2 py-1 rounded-[3px] border ${tc.status === 'pending' ? 'tool-pending' : ''}`}
              style={{
                background: tc.status === 'complete' ? 'rgba(132,204,22,0.1)'
                  : tc.status === 'error' ? 'rgba(239,68,68,0.1)'
                  : 'rgba(59,130,246,0.1)',
                borderColor: tc.status === 'complete' ? 'rgba(132,204,22,0.25)'
                  : tc.status === 'error' ? 'rgba(239,68,68,0.25)'
                  : 'rgba(59,130,246,0.25)',
                color: tc.status === 'complete' ? '#84cc16'
                  : tc.status === 'error' ? '#ef4444'
                  : '#3b82f6',
              }}
            >
              {tc.tool.replace('query_', '').replace('_', ' ').toUpperCase()} {tc.status === 'pending' ? '···' : tc.status === 'complete' ? '✓' : '✗'}
            </span>
          ))}
        </div>
      )}

      {/* Live context label */}
      <p className="font-mono text-[8px] tracking-[0.2em] text-muted px-5 pt-3 pb-2">
        LIVE CONTEXT
      </p>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="w-px h-8 bg-border mb-3" />
            <p className="font-mono text-[9px] text-dim tracking-[0.1em]">NO DATA YET</p>
            <p className="font-mono font-light text-[8px] text-dim mt-1">Scan the QR code to begin</p>
          </div>
        )}
        {cards.map((card, i) => (
          <DataCard key={`${card.badge_label}-${i}`} card={card} index={i} />
        ))}
      </div>

      {/* Text query input */}
      {!remoteConnected && onSendQuery && (
        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-mono text-[8px] tracking-[0.2em] text-muted">ASK A QUESTION</p>
            {hasImage && (
              <span className="font-mono text-[7px] tracking-wider px-1.5 py-0.5 rounded bg-green/15 border border-green/30 text-green">
                IMAGE ATTACHED
              </span>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (queryText.trim() && agentState === 'idle') {
                onSendQuery(queryText.trim())
                setQueryText('')
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value.slice(0, 500))}
              placeholder="Is this restaurant safe to eat at?"
              disabled={agentState !== 'idle'}
              className="flex-1 bg-surface border border-border rounded-md px-3 py-2 font-mono text-[10px] text-[#f4f4f5] placeholder:text-dim focus:outline-none focus:border-green/50 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!queryText.trim() || agentState !== 'idle'}
              className="px-3 py-2 bg-green/20 border border-green/30 rounded-md font-mono text-[9px] tracking-wider text-green hover:bg-green/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ASK
            </button>
          </form>
        </div>
      )}

      {/* QR code / Recent explorations */}
      <div className="border-t border-border px-5 py-3">
        {!remoteConnected && remoteFullUrl ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[8px] tracking-[0.2em] text-muted">CONNECT REMOTE</p>
              <p className="font-mono text-[8px] text-muted">Scan to activate camera</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white p-1.5 rounded-md">
                <QRCodeSVG value={remoteFullUrl} size={56} />
              </div>
              <div>
                <p className="font-mono text-[8px] text-muted leading-relaxed">
                  Open on your phone to stream camera + voice to Ask NYC
                </p>
                <p className="font-mono text-[9px] text-green mt-1 tracking-[0.05em]">
                  Session: {sessionId}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="font-mono text-[8px] tracking-[0.2em] text-muted">RECENT EXPLORATIONS</p>
              <p className="font-mono text-[8px] text-green cursor-pointer hover:text-[#6aad0f]">View All</p>
            </div>
            <div className="flex gap-2 items-stretch">
              {[
                { name: 'High Line', time: '2H AGO', color: '#1a2a1a' },
                { name: 'Chelsea Market', time: '5H AGO', color: '#1a1a2a' },
              ].map(({ name, time, color }) => (
                <div
                  key={name}
                  className="flex-1 bg-surface border border-border rounded-md p-2 flex items-center gap-2 cursor-pointer hover:border-border2 transition-colors"
                >
                  <div className="w-7 h-[22px] rounded-[3px] flex-shrink-0" style={{ background: color }}/>
                  <div>
                    <p className="font-mono text-[9px] text-[#f4f4f5]">{name}</p>
                    <p className="font-mono text-[8px] text-muted mt-0.5">{time}</p>
                  </div>
                </div>
              ))}
              <div className="w-9 h-9 rounded-lg bg-green flex items-center justify-center text-black font-display font-bold text-lg cursor-pointer hover:bg-[#6aad0f] transition-colors flex-shrink-0 self-center">
                +
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
