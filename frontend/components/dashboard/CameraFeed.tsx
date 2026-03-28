'use client'

import { useRef, useEffect, useState } from 'react'

interface Detection {
  label: string
  confidence: number
}

interface CameraFeedProps {
  detection: Detection | null
  remoteConnected: boolean
}

export default function CameraFeed({ detection, remoteConnected }: CameraFeedProps) {
  const scanRef = useRef<HTMLDivElement>(null)
  const [scanPos, setScanPos] = useState(0)

  // Scan line animation
  useEffect(() => {
    let raf: number
    const animate = () => {
      setScanPos(p => (p + 0.25) % 100)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: '#0a0608' }}>

      {/* Atmosphere layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(180,60,20,0.22) 0%, transparent 55%),
            radial-gradient(ellipse at 72% 28%, rgba(200,140,40,0.12) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 85%, rgba(20,30,60,0.35) 0%, transparent 50%)
          `
        }}/>
      </div>

      {/* Building silhouettes */}
      <div className="absolute bottom-8 left-0 right-0 flex items-end gap-0.5 px-3 opacity-50 pointer-events-none">
        {[90,120,70,145,100,65,115,88,95,132,78,155,82,105,118,90,60,128].map((h, i) => (
          <div
            key={i}
            className="flex-shrink-0"
            style={{
              width: `${[18,24,14,30,20,12,28,22,16,26,18,32,14,20,24,18,10,28][i]}px`,
              height: `${h}px`,
              background: 'linear-gradient(180deg, rgba(50,30,20,0.8), rgba(20,12,8,0.9))',
              borderTop: '1px solid rgba(200,100,40,0.12)',
            }}
          />
        ))}
      </div>

      {/* Neon glows */}
      <div className="absolute pointer-events-none" style={{ top: '35%', left: '15%', width: 80, height: 18, background: 'rgba(200,80,20,0.28)', borderRadius: 2, boxShadow: '0 0 24px rgba(200,80,20,0.35), 0 0 48px rgba(200,80,20,0.15)' }}/>
      <div className="absolute pointer-events-none" style={{ top: '38%', left: '52%', width: 60, height: 14, background: 'rgba(20,120,200,0.2)', borderRadius: 2, boxShadow: '0 0 16px rgba(20,120,200,0.25)' }}/>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(transparent, rgba(200,80,20,0.06))' }}/>

      {/* Scan line */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{
          top: `${scanPos}%`,
          height: '1.5px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(132,204,22,0.6) 30%, rgba(132,204,22,0.9) 50%, rgba(132,204,22,0.6) 70%, transparent 100%)',
          boxShadow: '0 0 8px rgba(132,204,22,0.35)',
        }}
      />

      {/* GPS + Live badge */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        <div className="font-mono text-[9px] tracking-[0.08em] text-white/70 bg-black/70 border border-white/[0.08] px-2 py-0.5 rounded-[3px]">
          40.7306° N, 73.9975° W
        </div>
        <div className="font-mono text-[8px] tracking-[0.15em] text-white bg-red px-2 py-0.5 rounded-[3px] live-badge">
          {remoteConnected ? 'LIVE FEED' : 'NO REMOTE'}
        </div>
      </div>

      {/* Detection box */}
      {detection && (
        <div
          className="absolute detection-box z-20"
          style={{
            top: '22%',
            left: '28%',
            width: 140,
            height: 110,
            border: '2px solid #84cc16',
          }}
        >
          {/* Corner brackets */}
          {[
            'top-[-2px] left-[-2px] border-t-2 border-l-2',
            'top-[-2px] right-[-2px] border-t-2 border-r-2',
            'bottom-[-2px] left-[-2px] border-b-2 border-l-2',
            'bottom-[-2px] right-[-2px] border-b-2 border-r-2',
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-2.5 h-2.5 border-green ${cls}`}
            />
          ))}

          {/* Label */}
          <div className="absolute -top-[26px] left-[-1px] bg-green text-black font-mono font-medium text-[8px] tracking-[0.1em] px-2 py-0.5 whitespace-nowrap">
            IDENTIFIED: {detection.label.toUpperCase()}
          </div>
        </div>
      )}

      {/* No remote placeholder */}
      {!remoteConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="font-mono text-[9px] tracking-[0.15em] text-muted mb-3">AWAITING REMOTE CONNECTION</div>
          <div className="w-px h-8 bg-border" />
        </div>
      )}
    </div>
  )
}
