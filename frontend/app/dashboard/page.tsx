'use client'

import { useState, useCallback } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import CameraFeed from '@/components/dashboard/CameraFeed'
import MiniMap from '@/components/dashboard/MiniMap'
import IntelligenceBrief from '@/components/dashboard/IntelligenceBrief'
import SearchInput from '@/components/dashboard/SearchInput'
import { useDashboardWs } from '@/hooks/useWebSocket'
import { useDemoMode } from '@/hooks/useDemoMode'
import GoogleMap3D from '@/components/maps/GoogleMap3D'

export default function DashboardPage() {
  const ws = useDashboardWs()
  const demo = useDemoMode()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  // Use WS data when backend is connected, demo data when not
  const isLive = ws.isConnected
  const agentState = isLive ? ws.agentState : demo.agentState
  const cards = isLive ? ws.cards : demo.cards
  const toolCalls = isLive ? ws.toolCalls : demo.toolCalls
  const transcript = isLive ? ws.transcript : demo.transcript

  const handleSendQuery = useCallback((text: string) => {
    ws.sendQuery(uploadedImage, text)
  }, [ws, uploadedImage])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg font-mono">

      {/* ─── Level 0: Cinematic Map Background ──────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <MiniMap
          pins={ws.pins}
          centerLat={ws.mapCenter?.lat}
          centerLng={ws.mapCenter?.lng}
        />
      </div>

      {/* ─── Level 1: UI Overlay Layer ───────────────────────────────────────── */}
      <div className="relative z-10 flex h-full pointer-events-none">

        {/* Left Rail: Sidebar */}
        <div className="pointer-events-auto flex-shrink-0">
          <Sidebar />
        </div>

        {/* Center Canvas: Status + Alerts + Camera + Ask Bar */}
        <div className="flex-1 flex flex-col items-center justify-between py-6 px-10 relative">

          {/* Top: Status Bar */}
          <div className="w-full flex justify-center pointer-events-auto">
            <div className="glass px-4 py-1.5 rounded-full flex items-center gap-3 border-white/5">
              <div className={`w-1.5 h-1.5 rounded-full ${ws.isConnected ? 'bg-health status-pulse shadow-[0_0_8px_#84cc16]' : 'bg-safety red-pulse'}`} />
              <span className="text-[10px] tracking-[0.2em] font-medium text-white/50">
                {ws.isConnected ? 'SYSTEM ONLINE' : 'OFFLINE SYNC — DEMO MODE'}
              </span>
              {ws.sessionId && (
                <>
                  <div className="w-px h-3 bg-white/10 mx-1" />
                  <span className="text-[9px] tracking-[0.1em] text-white/30 truncate max-w-[120px]">
                    ID: {ws.sessionId}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Middle: Camera Feedback (Floating Pill) */}
          <div className="pointer-events-auto mt-12">
            <CameraFeed
              detection={ws.detection}
              remoteConnected={ws.remoteConnected}
              uploadedImage={uploadedImage}
              onImageUpload={setUploadedImage}
              onImageClear={() => setUploadedImage(null)}
            />
          </div>

          {/* Bottom: Asking Experience */}
          <div className="w-full flex flex-col items-center gap-4 pointer-events-auto">
            {/* Demo triggers (if offline) */}
            {!isLive && (
              <div className="flex gap-2">
                {(['restaurant', 'building', 'construction'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => demo.runDemo(s)}
                    className="text-[9px] tracking-wider px-2.5 py-1 rounded bg-slate-900/40 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all"
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <SearchInput
              onSendQuery={isLive ? handleSendQuery : () => { }}
              disabled={!isLive || agentState !== 'idle'}
              hasImage={!!uploadedImage}
            />
          </div>
        </div>

        {/* Right Panel: Intelligence Briefing */}
        <div className="pointer-events-auto flex-shrink-0">
          <IntelligenceBrief
            agentState={agentState}
            cards={cards}
            toolCalls={toolCalls}
            transcript={transcript}
            sessionId={ws.sessionId}
            remoteUrl={ws.remoteUrl}
            remoteConnected={ws.remoteConnected}
            onSendQuery={isLive ? handleSendQuery : undefined}
            hasImage={!!uploadedImage}
          />
        </div>

      </div>
    </div>
  )
}
