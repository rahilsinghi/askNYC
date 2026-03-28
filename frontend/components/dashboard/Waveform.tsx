'use client'

import { useEffect, useRef } from 'react'
import { AgentState } from '@/lib/types'

const BAR_COUNT = 22

interface WaveformProps {
  state: AgentState
}

export default function Waveform({ state }: WaveformProps) {
  const barsRef = useRef<HTMLDivElement[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const animate = () => {
      const t = Date.now() / 350
      const isActive = state === 'speaking' || state === 'listening'

      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        let height: number
        let alpha: number

        if (!isActive) {
          // Idle: very subtle drift
          const drift = Math.abs(Math.sin(t * 0.3 + i * 0.5)) * 0.15
          height = 3 + drift * 6
          alpha = 0.25 + drift * 0.2
        } else if (state === 'listening') {
          // Listening: fast, irregular
          const v = Math.abs(
            Math.sin(t * 2.2 + i * 0.5) * 0.6 +
            Math.sin(t * 3.7 + i * 0.9) * 0.3 +
            Math.sin(t * 1.1 + i * 1.4) * 0.1
          )
          height = 3 + v * 26
          alpha = 0.5 + v * 0.5
        } else {
          // Speaking: smooth, musical
          const v = Math.abs(
            Math.sin(t + i * 0.38) * 0.7 +
            Math.sin(t * 1.5 + i * 0.6) * 0.2 +
            Math.sin(t * 0.7 + i * 0.2) * 0.1
          )
          height = 3 + v * 28
          alpha = 0.4 + v * 0.6
        }

        bar.style.height = `${height}px`
        bar.style.background = state === 'listening'
          ? `rgba(132, 204, 22, ${alpha})`
          : `rgba(59, 130, 246, ${alpha})`
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [state])

  return (
    <div className="flex items-center gap-[2.5px] h-9">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { if (el) barsRef.current[i] = el }}
          className="w-[3px] rounded-full min-h-[3px] transition-none"
          style={{ background: 'rgba(59,130,246,0.4)' }}
        />
      ))}
    </div>
  )
}
