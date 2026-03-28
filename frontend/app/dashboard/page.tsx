'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import CameraFeed from '@/components/dashboard/CameraFeed'
import MiniMap from '@/components/dashboard/MiniMap'
import IntelligenceBrief from '@/components/dashboard/IntelligenceBrief'
import SearchInput from '@/components/dashboard/SearchInput'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import MapCardOverlay from '@/components/dashboard/MapCardOverlay'
import { useDashboardWs } from '@/hooks/useWebSocket'
import { useDemoMode } from '@/hooks/useDemoMode'

type DemoScenario = 'restaurant' | 'building' | 'construction' | 'safety' | 'transit' | 'general'

// Known locations for URL param testing
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
  const [lastQuery, setLastQuery] = useState('')
  const [overrideCenter, setOverrideCenter] = useState<{ lat: number; lng: number } | null>(null)
  const urlProcessedRef = useRef(false)

  const displayImage = ws.capturedImage || uploadedImage

  // Demo data priority: show demo cards while backend processes real query
  const isLive = ws.isConnected
  const demoActive = demo.agentState !== 'idle' || demo.cards.length > 0
  const preferDemo = demoActive && (ws.cards.length === 0)
  const agentState = preferDemo ? demo.agentState : (isLive ? ws.agentState : demo.agentState)
  const cards = preferDemo ? demo.cards : (isLive ? ws.cards : demo.cards)
  const toolCalls = preferDemo ? demo.toolCalls : (isLive ? ws.toolCalls : demo.toolCalls)
  const transcript = preferDemo ? demo.transcript : (isLive ? ws.transcript : demo.transcript)
  const mapCenter = overrideCenter ?? (isLive ? ws.mapCenter : undefined)

  const handleSendQuery = useCallback((text: string) => {
    setLastQuery(text)
    ws.sendQuery(displayImage, text)
  }, [ws, displayImage])

  // Stable refs for URL param handling
  const demoRunDemo = demo.runDemo
  const sendQueryRef = useRef(handleSendQuery)
  sendQueryRef.current = handleSendQuery

  useEffect(() => {
    const q = searchParams.get('q')
    const locationParam = searchParams.get('location')
    const demoParam = searchParams.get('demo')

    if (!q && !demoParam && !locationParam) return
    if (urlProcessedRef.current) return
    urlProcessedRef.current = true

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
      setTimeout(() => {
        sendQueryRef.current(queryText)
        router.replace('/dashboard', { scroll: false })
      }, 500)
      return
    }

    if (demoParam) {
      const validScenarios = ['restaurant', 'building', 'construction', 'safety', 'transit', 'general']
      if (demoParam === 'all') {
        setTimeout(() => demoRunDemo('restaurant' as any), 0)
        setTimeout(() => demoRunDemo('building' as any), 12_000)
        setTimeout(() => demoRunDemo('construction' as any), 24_000)
      } else if (validScenarios.includes(demoParam)) {
        setTimeout(() => demoRunDemo(demoParam as any), 0)
      }
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router, demoRunDemo])

  return (
    <DashboardLayout>
      <div className="relative h-full w-full overflow-hidden">

        {/* ─── Level 0: Mapbox 3D Map Background ──────────────────────────── */}
        <div className="fixed inset-0 z-0 pointer-events-auto">
          <MiniMap
            pins={ws.pins}
            centerLat={mapCenter?.lat}
            centerLng={mapCenter?.lng}
            highlightLat={mapCenter?.lat}
            highlightLng={mapCenter?.lng}
          />
        </div>

        {/* ─── Level 0.5: Floating Data Cards on Map ─────────────────────── */}
        <MapCardOverlay
          cards={cards}
          toolCalls={toolCalls}
          transcript={transcript}
          agentState={agentState}
        />

        {/* ─── Level 1: UI Overlay ─────────────────────────────────────────── */}
        <div className="relative z-10 flex w-full h-full pointer-events-none">
          <div className="flex-1 flex flex-col items-center justify-between py-6 px-6 relative">

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
            </div>

            <div className="flex-1" />

            {/* Bottom: Query Bar */}
            <div className="w-full pointer-events-auto">
              {!isLive && (
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                  {(['restaurant', 'building', 'construction', 'safety', 'transit'] as const).map(s => (
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
                isFocusMode={false}
              />
            </div>
          </div>

          {/* Right Panel: AI Analysis */}
          <div className="pointer-events-auto flex-shrink-0">
            <IntelligenceBrief
              agentState={agentState}
              toolCalls={toolCalls}
              transcript={transcript}
              lastQuery={lastQuery}
              cards={cards}
              sessionId={ws.sessionId}
              remoteUrl={ws.remoteUrl}
              remoteConnected={ws.remoteConnected}
              onSendQuery={handleSendQuery}
              hasImage={!!displayImage}
              sessionSummary={ws.sessionSummary}
            />
          </div>
        </div>

        {/* ─── Level 2: Camera PiP ─────────────────────────────────────────── */}
        <div className="fixed bottom-24 right-[420px] z-20 pointer-events-auto">
          <div className="w-[160px] h-[100px] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900/60 backdrop-blur-sm pip-camera">
            <CameraFeed
              detection={ws.detection}
              remoteConnected={ws.remoteConnected}
              uploadedImage={displayImage}
              onImageUpload={setUploadedImage}
              onImageClear={() => setUploadedImage(null)}
              mapCenter={mapCenter}
              agentState={agentState}
              mini
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
