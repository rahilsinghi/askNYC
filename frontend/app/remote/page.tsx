'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRemoteWs } from '@/hooks/useWebSocket'
import MicButton from '@/components/remote/MicButton'
import { X } from 'lucide-react'
import Link from 'next/link'

function RemoteContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''

  const { isConnected, startSpeaking, stopSpeaking } = useRemoteWs(sessionId)

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
      {/* Camera feed (background) */}
      <div className="absolute inset-0 z-0">
        <video
          id="camera-preview"
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
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

        {/* Spacer to balance the close button */}
        <div className="w-11" />
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
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-electric-cyan/60 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-electric-cyan/60 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-electric-cyan/60 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-electric-cyan/60 rounded-br-2xl" />

            <p className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">
              Point at a location
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <footer className="relative z-10 pb-12 pt-6 flex flex-col items-center">
        <MicButton
          onStart={startSpeaking}
          onStop={stopSpeaking}
          disabled={!isConnected}
        />
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
