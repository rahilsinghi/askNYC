'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRemoteWs } from '@/hooks/useWebSocket'
import MicButton from '@/components/remote/MicButton'
import { X, Camera } from 'lucide-react'
import Link from 'next/link'

function RemoteContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''

  const { isConnected, isSpeaking, cameraActive, startSpeaking, stopSpeaking, captureFrame } = useRemoteWs(sessionId)
  const [showFlash, setShowFlash] = useState(false)
  const [captured, setCaptured] = useState(false)

  // Flash effect resets after animation
  useEffect(() => {
    if (showFlash) {
      const t = setTimeout(() => setShowFlash(false), 300)
      return () => clearTimeout(t)
    }
  }, [showFlash])

  const handleCapture = () => {
    captureFrame()
    setShowFlash(true)
    setCaptured(true)
    // Reset "captured" badge after 5s
    setTimeout(() => setCaptured(false), 5000)
  }

  // No session ID — prompt user to scan QR from dashboard
  if (!sessionId) {
    return (
      <main className="h-screen w-screen bg-midnight flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full border border-electric-cyan/30 flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-electric-cyan">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="14" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 14v7h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-xl font-medium text-silver-mist mb-2">No Session</h1>
        <p className="text-sm text-silver-mist/50 max-w-xs leading-relaxed">
          Scan the QR code from the dashboard to connect your phone as a remote camera.
        </p>
        <Link
          href="/"
          className="mt-8 px-6 py-3 rounded-full border border-electric-cyan/20 text-electric-cyan text-sm font-mono tracking-wide hover:bg-electric-cyan/10 transition-colors"
        >
          Go to Dashboard
        </Link>
      </main>
    )
  }

  return (
    <main className="relative h-screen w-screen bg-black overflow-hidden flex flex-col">
      {/* Camera feed (background) — always mounted so getUserMedia can attach */}
      <div className="absolute inset-0 z-0">
        <video
          id="camera-preview"
          autoPlay
          playsInline
          webkit-playsinline="true"
          muted
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

        {/* Capture flash */}
        {showFlash && (
          <div className="absolute inset-0 bg-white/70 z-50 pointer-events-none animate-[flash_0.3s_ease-out_forwards]" />
        )}
      </div>

      {/* Top bar */}
      <header className="relative z-10 p-6 flex items-center justify-between">
        <Link
          href="/"
          className="p-3 rounded-full glass-pill text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </Link>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-electric-cyan animate-pulse' : 'bg-warm-amber'
              }`}
            />
            <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          <p className="text-white/40 text-xs font-mono">
            Session {sessionId.slice(0, 8)}
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-col items-end gap-1">
          {cameraActive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-electric-cyan/10">
              <div className="w-1.5 h-1.5 rounded-full bg-electric-cyan" />
              <span className="text-[8px] font-mono tracking-wider text-electric-cyan uppercase">Live</span>
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warm-amber/10">
              <div className="w-1.5 h-1.5 rounded-full bg-warm-amber animate-pulse" />
              <span className="text-[8px] font-mono tracking-wider text-warm-amber uppercase">Mic On</span>
            </div>
          )}
        </div>
      </header>

      {/* Center viewfinder */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        {!isConnected && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-electric-cyan/40 border-t-electric-cyan rounded-full animate-spin" />
            <p className="text-xs font-mono tracking-widest text-white/40 uppercase">
              Connecting to backend...
            </p>
          </div>
        )}

        {isConnected && (
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Focus corners */}
            <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-2xl transition-colors duration-300 ${isSpeaking ? 'border-warm-amber' : 'border-electric-cyan/60'}`} />
            <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-2xl transition-colors duration-300 ${isSpeaking ? 'border-warm-amber' : 'border-electric-cyan/60'}`} />
            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-2xl transition-colors duration-300 ${isSpeaking ? 'border-warm-amber' : 'border-electric-cyan/60'}`} />
            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-2xl transition-colors duration-300 ${isSpeaking ? 'border-warm-amber' : 'border-electric-cyan/60'}`} />

            <p className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">
              {isSpeaking ? 'Listening...' : captured ? 'Now hold mic to ask' : 'Point at a location'}
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <footer className="relative z-10 pb-12 pt-6 flex flex-col items-center gap-4">
        {/* Captured confirmation */}
        {captured && (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-electric-cyan/10 border border-electric-cyan/20">
            <div className="w-2 h-2 rounded-full bg-electric-cyan" />
            <span className="text-[10px] font-mono tracking-wider text-electric-cyan uppercase">
              Photo sent to dashboard
            </span>
          </div>
        )}

        {/* Controls row: Capture — Mic — (spacer) */}
        <div className="flex items-center gap-8">
          {/* Capture button */}
          <button
            onClick={handleCapture}
            disabled={!isConnected || !cameraActive}
            className="p-4 rounded-full border border-white/10 text-white/50 hover:text-electric-cyan hover:border-electric-cyan/40 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Camera className="w-6 h-6" />
          </button>

          {/* Mic button (center, largest) */}
          <MicButton
            onStart={startSpeaking}
            onStop={stopSpeaking}
            disabled={!isConnected}
          />

          {/* Spacer to balance layout */}
          <div className="w-14" />
        </div>

        <p className="text-[9px] font-mono tracking-wider text-white/20 text-center max-w-xs">
          Tap capture to snap, then hold mic to ask
        </p>
      </footer>
    </main>
  )
}

export default function RemotePage() {
  return (
    <Suspense
      fallback={
        <main className="h-screen w-screen bg-midnight flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-electric-cyan/40 border-t-electric-cyan rounded-full animate-spin" />
        </main>
      }
    >
      <RemoteContent />
    </Suspense>
  )
}
