'use client'

import { useState, useCallback } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import CameraFeed from '@/components/dashboard/CameraFeed'
import MiniMap from '@/components/dashboard/MiniMap'
import IntelligenceBrief from '@/components/dashboard/IntelligenceBrief'
import { useDashboardWs } from '@/hooks/useWebSocket'
import { useDemoMode } from '@/hooks/useDemoMode'

export default function DashboardPage() {
  const ws = useDashboardWs()
  const demo = useDemoMode()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  // Show remote-captured image on dashboard (overrides manual upload)
  const displayImage = ws.capturedImage || uploadedImage

  // Use WS data when backend is connected, demo data when not
  const isLive = ws.isConnected
  const agentState   = isLive ? ws.agentState   : demo.agentState
  const cards        = isLive ? ws.cards        : demo.cards
  const toolCalls    = isLive ? ws.toolCalls    : demo.toolCalls
  const transcript   = isLive ? ws.transcript   : demo.transcript

  const handleSendQuery = useCallback((text: string) => {
    ws.sendQuery(displayImage, text)
  }, [ws, displayImage])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col border-r border-border min-w-0">

        {/* Top status bar */}
        <div className="h-8 border-b border-border flex items-center px-4 gap-3 bg-bg2 flex-shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${ws.isConnected ? 'bg-green status-pulse' : 'bg-red red-pulse'}`}/>
          <span className="font-mono text-[8px] tracking-[0.15em] text-muted">
            {ws.isConnected ? 'BACKEND CONNECTED' : 'DEMO MODE — BACKEND OFFLINE'}
          </span>
          {ws.sessionId && (
            <>
              <div className="w-px h-3 bg-border"/>
              <span className="font-mono text-[8px] tracking-[0.1em] text-dim">
                SESSION {ws.sessionId}
              </span>
            </>
          )}
          {/* Demo trigger buttons — only show when backend offline */}
          {!isLive && (
            <div className="ml-auto flex gap-2">
              {(['restaurant', 'building', 'construction'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => demo.runDemo(s)}
                  className="font-mono text-[8px] tracking-[0.08em] px-2 py-0.5 rounded-[3px] border border-border hover:border-border2 text-muted hover:text-[#f4f4f5] transition-colors"
                >
                  DEMO: {s.toUpperCase()}
                </button>
              ))}
              <button
                onClick={demo.reset}
                className="font-mono text-[8px] tracking-[0.08em] px-2 py-0.5 rounded-[3px] border border-border text-dim hover:text-muted transition-colors"
              >
                RESET
              </button>
            </div>
          )}
        </div>

        {/* Camera feed */}
        <CameraFeed
          detection={ws.detection}
          remoteConnected={ws.remoteConnected}
          uploadedImage={displayImage}
          onImageUpload={setUploadedImage}
          onImageClear={() => setUploadedImage(null)}
          mapCenter={ws.mapCenter}
        />

        {/* Mini map */}
        <MiniMap
          pins={ws.pins}
          centerLat={ws.mapCenter?.lat}
          centerLng={ws.mapCenter?.lng}
        />
      </div>

      {/* Right panel */}
      <IntelligenceBrief
        agentState={agentState}
        cards={cards}
        toolCalls={toolCalls}
        transcript={transcript}
        sessionId={ws.sessionId}
        remoteUrl={ws.remoteUrl}
        remoteConnected={ws.remoteConnected}
        onSendQuery={isLive ? handleSendQuery : undefined}
        hasImage={!!displayImage}
        sessionSummary={ws.sessionSummary}
      />
    </div>
  )
}
