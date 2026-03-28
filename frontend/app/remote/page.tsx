'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import MicButton from '@/components/remote/MicButton'
import { useRemoteWs } from '@/hooks/useWebSocket'

function RemoteContent() {
  const params = useSearchParams()
  const sessionId = params.get('session') || ''
  const { isConnected, startSpeaking, stopSpeaking } = useRemoteWs(sessionId)

  const streamStats = [
    { icon: '📹', label: 'CAMERA STREAM', value: '720p · 1fps to agent' },
    { icon: '🎤', label: 'AUDIO STREAM',  value: '16kHz PCM · live' },
    { icon: '⚡', label: 'LATENCY',        value: isConnected ? '~50ms' : '—' },
  ]

  return (
    <main className="flex flex-col h-screen city-grid overflow-hidden max-w-[390px] mx-auto">

      {/* Top bar */}
      <div className="h-[60px] flex items-center justify-between px-5 border-b border-border flex-shrink-0">
        <span className="font-display font-bold text-[16px] text-green tracking-[-0.01em]">ASK NYC</span>
        <div
          className="flex items-center gap-1.5 font-mono text-[9px] px-2.5 py-1 rounded-[3px] border"
          style={{
            background: isConnected ? 'rgba(132,204,22,0.1)' : 'rgba(239,68,68,0.08)',
            borderColor: isConnected ? 'rgba(132,204,22,0.25)' : 'rgba(239,68,68,0.2)',
            color: isConnected ? '#84cc16' : '#ef4444',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isConnected ? '#84cc16' : '#ef4444',
              animation: isConnected ? 'statusPulse 2s ease-in-out infinite' : 'redPulse 1.5s ease-in-out infinite',
            }}
          />
          {isConnected ? 'CONNECTED' : 'CONNECTING...'}
        </div>
      </div>

      {/* Camera preview placeholder */}
      <div className="mx-5 mt-5 rounded-xl border border-border overflow-hidden flex-shrink-0" style={{ height: 200, background: '#09090c', position: 'relative' }}>
        <video
          id="camera-preview"
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover opacity-70"
        />
        {/* Live indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red red-pulse"/>
          <span className="font-mono text-[8px] text-red tracking-[0.15em]">LIVE</span>
        </div>
      </div>

      {/* Stream meta */}
      <div className="mx-5 mt-2 flex gap-2">
        {['VIDEO 720p', 'AUDIO 16kHz'].map(label => (
          <span key={label} className="font-mono text-[8px] text-muted bg-surface border border-border px-2 py-0.5 rounded-[3px]">
            {label}
          </span>
        ))}
      </div>

      {/* Mic button — center of screen */}
      <div className="flex-1 flex items-center justify-center">
        <MicButton
          onStart={startSpeaking}
          onStop={stopSpeaking}
          disabled={!isConnected}
        />
      </div>

      {/* Stream stats */}
      <div className="pb-8 px-5 flex flex-col gap-2.5">
        {streamStats.map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="text-[12px]">{icon}</span>
            <span className="font-mono text-[9px] tracking-[0.1em] text-muted">{label}</span>
            <span className="font-mono text-[9px] text-muted ml-auto">{value}</span>
          </div>
        ))}
        <p className="font-mono font-light text-[8px] text-dim text-center mt-2 leading-relaxed">
          Your camera and voice are processed by Gemini Live.
          Nothing is stored.
        </p>
      </div>

    </main>
  )
}

export default function RemotePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <span className="font-mono text-[9px] tracking-[0.2em] text-muted">LOADING...</span>
      </div>
    }>
      <RemoteContent />
    </Suspense>
  )
}
