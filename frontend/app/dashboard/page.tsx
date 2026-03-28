'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import Sidebar from '@/components/dashboard/Sidebar'
import CameraFeed from '@/components/dashboard/CameraFeed'
import MiniMap from '@/components/dashboard/MiniMap'
import IntelligenceBrief from '@/components/dashboard/IntelligenceBrief'
import SettingsPanel from '@/components/SettingsPanel'
import { useDashboardWs } from '@/hooks/useWebSocket'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useSettings } from '@/hooks/useSettings'

type DemoScenario = 'restaurant' | 'building' | 'construction'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const ws = useDashboardWs()
  const demo = useDemoMode()
  const settings = useSettings()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleRunDemo = useCallback((scenario: 'all' | 'restaurant' | 'building' | 'construction') => {
    if (scenario === 'all') {
      demo.runDemo('restaurant')
      setTimeout(() => demo.runDemo('building'), 12_000)
      setTimeout(() => demo.runDemo('construction'), 24_000)
    } else {
      demo.runDemo(scenario)
    }
  }, [demo])

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

  // ─── Query param handling ────────────────────────────────────────────────────

  useEffect(() => {
    const q = searchParams.get('q')
    const location = searchParams.get('location')
    const demoParam = searchParams.get('demo')
    const voice = searchParams.get('voice')

    if (!q && !demoParam && !voice) return

    // Voice mode placeholder
    if (voice === 'true') {
      setVoiceMode(true)
      console.log('Voice mode activated')
    }

    // Auto-submit text query after short delay for WS to connect
    if (q) {
      const queryText = location ? `${location}: ${q}` : q
      const timer = setTimeout(() => {
        handleSendQuery(queryText)
        router.replace('/dashboard', { scroll: false })
      }, 500)
      return () => clearTimeout(timer)
    }

    // Auto-trigger demo mode
    if (demoParam) {
      const validScenarios: DemoScenario[] = ['restaurant', 'building', 'construction']
      const timers: ReturnType<typeof setTimeout>[] = []

      if (demoParam === 'all') {
        timers.push(setTimeout(() => demo.runDemo('restaurant'), 0))
        timers.push(setTimeout(() => demo.runDemo('building'), 12_000))
        timers.push(setTimeout(() => demo.runDemo('construction'), 24_000))
      } else if (validScenarios.includes(demoParam as DemoScenario)) {
        timers.push(setTimeout(() => demo.runDemo(demoParam as DemoScenario), 0))
      }

      router.replace('/dashboard', { scroll: false })
      return () => timers.forEach(clearTimeout)
    }

    // Clean URL if only voice param was set
    router.replace('/dashboard', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          {voiceMode && (
            <>
              <div className="w-px h-3 bg-border"/>
              <span className="font-mono text-[8px] tracking-[0.1em] text-green">
                VOICE MODE
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
          <button
            onClick={() => setShowSettings(true)}
            className={`${isLive ? 'ml-auto' : ''} w-5 h-5 flex items-center justify-center rounded hover:bg-silver-mist/10 transition-colors`}
          >
            <Settings className="w-3 h-3 text-silver-mist/40 hover:text-silver-mist/70" />
          </button>
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

      {/* Settings panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onRunDemo={handleRunDemo}
        onVolumeChange={settings.setVolume}
        onMuteChange={settings.setMuted}
        volume={settings.volume}
        muted={settings.muted}
      />

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

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}
