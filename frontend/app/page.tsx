'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const STATS = [
  { value: 40, suffix: 'M+', label: 'DATA POINTS' },
  { value: 6,  suffix: '',   label: 'LIVE DATASETS' },
  { value: 365, suffix: '',  label: 'DAYS UPDATED' },
]

function useCountUp(target: number, duration = 1200, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    const startTime = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, start])
  return val
}

function StatPill({ value, suffix, label, start }: { value: number; suffix: string; label: string; start: boolean }) {
  const count = useCountUp(value, 1200, start)
  return (
    <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-[3px] opacity-0 fade-up" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
      <span className="font-display font-semibold text-[13px] text-[#f4f4f5]">
        {count}{suffix}
      </span>
      <span className="font-mono text-[9px] tracking-[0.15em] text-muted">{label}</span>
    </div>
  )
}

export default function SplashPage() {
  const router = useRouter()
  const [statsStart, setStatsStart] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStatsStart(true), 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="relative w-full h-screen flex flex-col items-center justify-center city-grid overflow-hidden">

      {/* Faint radial rings — top right */}
      {[800, 600, 400, 200, 80].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full border border-white/[0.025] pointer-events-none"
          style={{ width: size, height: size, top: -size * 0.4, right: -size * 0.3 }}
        />
      ))}

      {/* Content */}
      <div className="-mt-10 flex flex-col items-start">

        {/* Eyebrow */}
        <p
          className="font-mono text-[9px] tracking-[0.3em] text-muted mb-6 opacity-0 fade-up"
          style={{ animationDelay: '0s', animationFillMode: 'forwards' }}
        >
          NYC OPEN DATA · GEMINI LIVE · REAL-TIME INTELLIGENCE
        </p>

        {/* Wordmark */}
        <div className="flex flex-col leading-none mb-8">
          <span
            className="font-display font-bold text-[96px] tracking-[-0.03em] text-[#f4f4f5] opacity-0 fade-up"
            style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
          >
            ASK
          </span>
          <span
            className="font-display font-bold text-[96px] tracking-[-0.03em] text-green ml-12 opacity-0 fade-up"
            style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
          >
            NYC
          </span>
        </div>

        {/* Tagline */}
        <p
          className="font-mono font-light text-[13px] text-muted mb-12 opacity-0 fade-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          Point. Speak. Know everything the city knows.
        </p>

        {/* CTA */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-60 h-12 bg-green text-black font-mono font-medium text-[11px] tracking-[0.15em] rounded-[6px] hover:bg-[#6aad0f] transition-colors opacity-0 fade-up mb-6"
          style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
        >
          ACTIVATE SYSTEM →
        </button>

        {/* Stats */}
        <div className="flex gap-3">
          {STATS.map((s) => (
            <StatPill key={s.label} {...s} start={statsStart} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 font-mono font-light text-[9px] tracking-wide text-dim text-center">
        Built for NYC Open Data Week · Powered by Google Gemini Live
      </p>
    </main>
  )
}
