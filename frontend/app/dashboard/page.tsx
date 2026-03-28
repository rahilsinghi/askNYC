'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import CameraFeed from '@/components/dashboard/CameraFeed'
import CinematicMap from '@/components/maps/CinematicMap'
import IntelligenceBrief from '@/components/dashboard/IntelligenceBrief'
import FloatingCards from '@/components/dashboard/FloatingCards'
import SearchInput from '@/components/dashboard/SearchInput'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { useDashboardWs } from '@/hooks/useWebSocket'
import { useDemoMode } from '@/hooks/useDemoMode'

type DemoScenario = 'restaurant' | 'building' | 'construction' | 'safety' | 'transit' | 'general'

// Known locations for URL param testing — maps slug to coordinates + demo scenario
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; name: string; demo: DemoScenario }> = {
  'empire-state-building': { lat: 40.7484, lng: -73.9857, name: 'Empire State Building', demo: 'restaurant' },
  'times-square':          { lat: 40.7580, lng: -73.9855, name: 'Times Square', demo: 'restaurant' },
  'one-world-trade':       { lat: 40.7127, lng: -74.0134, name: 'One World Trade Center', demo: 'construction' },
  'brooklyn-bridge':       { lat: 40.7061, lng: -73.9969, name: 'Brooklyn Bridge', demo: 'building' },
  'central-park':          { lat: 40.7829, lng: -73.9654, name: 'Central Park', demo: 'restaurant' },
  'joes-pizza':            { lat: 40.7308, lng: -74.0020, name: "Joe's Pizza, Carmine St", demo: 'restaurant' },
  'nyu-tandon':            { lat: 40.6942, lng: -73.9866, name: 'NYU Tandon, Jay St', demo: 'construction' },
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const ws = useDashboardWs()
  const demo = useDemoMode()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [lastQuery, setLastQuery] = useState('')
  const [overrideCenter, setOverrideCenter] = useState<{ lat: number; lng: number } | null>(null)
  const urlProcessedRef = useRef(false)

  // Show remote-captured image on dashboard (overrides manual upload)
  const displayImage = ws.capturedImage || uploadedImage

  // Use WS data when backend is connected, demo data when not.
  // When demo is actively running, show demo data even if WS is connected.
  const isLive = ws.isConnected
  const demoActive = demo.agentState !== 'idle' || demo.cards.length > 0
  const preferDemo = demoActive && (ws.cards.length === 0)
  const agentState = preferDemo ? demo.agentState : (isLive ? ws.agentState : demo.agentState)
  const cards = preferDemo ? demo.cards : (isLive ? ws.cards : demo.cards)
  const toolCalls = preferDemo ? demo.toolCalls : (isLive ? ws.toolCalls : demo.toolCalls)
  const transcript = preferDemo ? demo.transcript : (isLive ? ws.transcript : demo.transcript)
  const mapCenter = overrideCenter ?? (isLive ? ws.mapCenter : demo.mapCenter)

  // Focus mode: Clear the map and move cards to the right when a location is being discussed
  const isFocusMode = (agentState === 'processing' || agentState === 'speaking') && !!mapCenter

  const handleSendQuery = useCallback((text: string) => {
    setLastQuery(text)
    ws.sendQuery(displayImage, text)
  }, [ws, displayImage])

  // Stable refs for URL param handling (avoid re-render loops)
  const demoRunDemo = demo.runDemo
  const sendQueryRef = useRef(handleSendQuery)
  sendQueryRef.current = handleSendQuery

  // ─── Query param handling ───────────────────────────────────────────────────
  // Supports: ?location=empire-state-building | ?q=query | ?demo=restaurant
  useEffect(() => {
    const q = searchParams.get('q')
    const locationParam = searchParams.get('location')
    const demoParam = searchParams.get('demo')
    const voice = searchParams.get('voice')

    if (!q && !demoParam && !voice && !locationParam) return
    if (urlProcessedRef.current) return
    urlProcessedRef.current = true

    if (voice === 'true') setVoiceMode(true)

    // Location param: look up known place, fly to it, run demo + real query
    if (locationParam) {
      const loc = KNOWN_LOCATIONS[locationParam]
      if (loc) {
        setLastQuery(loc.name)
        setOverrideCenter({ lat: loc.lat, lng: loc.lng })
        setTimeout(() => {
          sendQueryRef.current(loc.name)
          demoRunDemo(loc.demo as any)
        }, 1500)
        return
      }
    }

    if (q) {
      const locationName = searchParams.get('loc')
      const queryText = locationName ? `${locationName}: ${q}` : q
      const timer = setTimeout(() => {
        sendQueryRef.current(queryText)
        router.replace('/dashboard', { scroll: false })
      }, 500)
      return () => clearTimeout(timer)
    }

    if (demoParam) {
      const validScenarios: string[] = ['restaurant', 'building', 'construction', 'safety', 'transit', 'general']
      const timers: ReturnType<typeof setTimeout>[] = []

      if (demoParam === 'all') {
        timers.push(setTimeout(() => demoRunDemo('restaurant'), 0))
        timers.push(setTimeout(() => demoRunDemo('building'), 12_000))
        timers.push(setTimeout(() => demoRunDemo('construction'), 24_000))
      } else if (validScenarios.includes(demoParam)) {
        timers.push(setTimeout(() => demoRunDemo(demoParam as any), 0))
      }

      router.replace('/dashboard', { scroll: false })
      return () => timers.forEach(clearTimeout)
    }

    router.replace('/dashboard', { scroll: false })
  }, [searchParams, router, demoRunDemo])

  return (
    <DashboardLayout>
      <div className="relative h-full w-full overflow-hidden">
        {/* ─── Level 0: Cinematic Map Background ──────────────────────────────── */}
        <div className="fixed inset-0 z-0 pointer-events-auto">
          <CinematicMap
            center={mapCenter || undefined}
            highlightCoords={mapCenter}
          />
          <FloatingCards cards={cards} isFocusMode={isFocusMode} />
        </div>

        {/* ─── Level 1: UI Overlay Layer ───────────────────────────────────────── */}
        <div className="relative z-10 flex w-full h-full pointer-events-none">
          {/* Center Canvas: Status + Alerts + Camera + Ask Bar */}
          <div className={`flex-1 flex flex-col justify-between py-6 px-10 relative transition-all duration-1000 ease-in-out ${isFocusMode ? 'items-end pr-12' : 'items-center'}`}>
            {/* Top: Status Bar */}
            <div className={`w-full flex justify-between items-start pointer-events-auto transition-all duration-700 ${isFocusMode ? 'opacity-0 scale-95' : 'opacity-100'}`}>
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
            </div>

            {/* Middle: Camera Feedback (Floating Pill) */}
            <div className={`pointer-events-auto transition-all duration-1000 ease-in-out ${isFocusMode ? 'mt-20 scale-[0.65] origin-top-right translate-y-[-40px]' : 'mt-12'}`}>
              <CameraFeed
                detection={ws.detection}
                remoteConnected={ws.remoteConnected}
                uploadedImage={displayImage}
                onImageUpload={setUploadedImage}
                onImageClear={() => setUploadedImage(null)}
                mapCenter={mapCenter}
                agentState={agentState}
                isFocusMode={isFocusMode}
              />
            </div>

            {/* Bottom: Asking Experience */}
            <div className={`flex flex-col items-center gap-4 pointer-events-auto transition-all duration-700 ${isFocusMode ? 'opacity-20 translate-y-10 scale-90' : 'w-full'}`}>
              {/* Demo Quick Select (only if not live) */}
              {!isLive && (
                <div className={`flex flex-wrap justify-center gap-2 ${isFocusMode ? 'hidden' : ''}`}>
                  {(['restaurant', 'building', 'construction', 'safety', 'transit', 'general'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => demo.runDemo(s as any)}
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
                isFocusMode={isFocusMode}
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
              lastQuery={lastQuery}
              sessionId={ws.sessionId}
              remoteUrl={ws.remoteUrl}
              remoteConnected={ws.remoteConnected}
              onSendQuery={handleSendQuery}
              hasImage={!!displayImage}
              sessionSummary={ws.sessionSummary}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}
