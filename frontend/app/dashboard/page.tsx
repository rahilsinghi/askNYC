'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import Sidebar from '@/components/dashboard/Sidebar'
import CameraFeed from '@/components/dashboard/CameraFeed'
import MiniMap from '@/components/dashboard/MiniMap'
import IntelligenceBrief from '@/components/dashboard/IntelligenceBrief'
import SearchInput from '@/components/dashboard/SearchInput'
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
  const agentState = isLive ? ws.agentState : demo.agentState
  const cards = isLive ? ws.cards : demo.cards
  const toolCalls = isLive ? ws.toolCalls : demo.toolCalls
  const transcript = isLive ? ws.transcript : demo.transcript

  const handleSendQuery = useCallback((text: string) => {
    ws.sendQuery(displayImage, text)
  }, [ws, displayImage])

  // ─── Query param handling ───────────────────────────────────────────────────
  useEffect(() => {
    const q = searchParams.get('q')
    const location = searchParams.get('location')
    const demoParam = searchParams.get('demo')
    const voice = searchParams.get('voice')

    if (!q && !demoParam && !voice) return

    if (voice === 'true') {
      setVoiceMode(true)
    }

    if (q) {
      const queryText = location ? `${location}: ${q}` : q
      const timer = setTimeout(() => {
        handleSendQuery(queryText)
        router.replace('/dashboard', { scroll: false })
      }, 500)
      return () => clearTimeout(timer)
    }

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

    router.replace('/dashboard', { scroll: false })
  }, [searchParams, router, handleSendQuery, demo])

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
          <div className="w-full flex justify-between items-start pointer-events-auto">
            <div className="glass px-4 py-1.5 rounded-full flex items-center gap-3 border-white/5">
              <div className={`w-1.5 h-1.5 rounded-full ${ws.isConnected ? 'bg-health status-pulse shadow-[0_0_8px_#84cc16]' : 'bg-safety red-pulse shadow-[0_0_8px_#ef4444]'}`} />
              <span className="text-[10px] tracking-[0.2em] font-medium text-white/50 uppercase">
                {ws.isConnected ? 'SYSTEM_ONLINE' : 'OFFLINE_SYNC'}
              </span>
              {ws.sessionId && (
                <>
                  <div className="w-px h-3 bg-white/10 mx-1" />
                  <span className="text-[9px] tracking-[0.1em] text-white/30 truncate max-w-[120px]">
                    SESSION_{ws.sessionId.substring(0, 8)}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="glass w-8 h-8 flex items-center justify-center rounded-full border-white/5 hover:border-cyan-400/50 hover:bg-cyan-400/10 transition-all group"
            >
              <Settings className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
            </button>
          </div>

          {/* Middle: Camera Feedback (Floating Pill) */}
          <div className="pointer-events-auto mt-12 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
            <CameraFeed
              detection={ws.detection}
              remoteConnected={ws.remoteConnected}
              uploadedImage={displayImage}
              onImageUpload={setUploadedImage}
              onImageClear={() => setUploadedImage(null)}
              mapCenter={ws.mapCenter}
            />
          </div>

          {/* Bottom: Asking Experience */}
          <div className="w-full flex flex-col items-center gap-4 pointer-events-auto">
            {!isLive && (
              <div className="flex gap-2">
                {(['restaurant', 'building', 'construction'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => demo.runDemo(s)}
                    className="text-[9px] tracking-wider px-2.5 py-1 rounded bg-slate-900/40 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all uppercase"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <SearchInput
              onSendQuery={handleSendQuery}
              disabled={agentState !== 'idle'}
              hasImage={!!displayImage}
              uploadedImage={displayImage}
              onImageUpload={setUploadedImage}
              onImageClear={() => setUploadedImage(null)}
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
            onSendQuery={handleSendQuery}
            hasImage={!!uploadedImage}
            sessionSummary={ws.sessionSummary}
          />
        </div>
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
