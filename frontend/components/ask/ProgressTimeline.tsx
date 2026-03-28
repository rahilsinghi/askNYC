'use client'

import { motion } from 'framer-motion'
import type { RecommendPhase } from '@/lib/types'

const STEPS: { id: RecommendPhase; label: string }[] = [
  { id: 'planning', label: 'PARSE' },
  { id: 'agents', label: 'AGENTS' },
  { id: 'synthesizing', label: 'SYNTHESIS' },
  { id: 'complete', label: 'RESULTS' },
]

const PHASE_ORDER: RecommendPhase[] = ['idle', 'planning', 'agents', 'synthesizing', 'complete']

interface ProgressTimelineProps {
  phase: RecommendPhase
}

export default function ProgressTimeline({ phase }: ProgressTimelineProps) {
  if (phase === 'idle') return null

  const currentIdx = PHASE_ORDER.indexOf(phase)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="flex items-center justify-between relative">
        {/* Connecting line (background) */}
        <div className="absolute top-[9px] left-6 right-6 h-px bg-white/5" />

        {/* Animated progress line */}
        <motion.div
          className="absolute top-[9px] left-6 h-px"
          style={{
            background: 'linear-gradient(90deg, rgba(6,182,212,0.6), rgba(132,204,22,0.6))',
            boxShadow: '0 0 6px rgba(6,182,212,0.3)',
          }}
          initial={{ width: '0%' }}
          animate={{
            width: currentIdx <= 1
              ? '0%'
              : currentIdx === 2
                ? '33%'
                : currentIdx === 3
                  ? '66%'
                  : '100%',
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {STEPS.map((step, i) => {
          const stepIdx = PHASE_ORDER.indexOf(step.id)
          const isActive = stepIdx === currentIdx
          const isComplete = stepIdx < currentIdx
          const isFuture = stepIdx > currentIdx

          return (
            <div key={step.id} className="flex flex-col items-center gap-1.5 relative z-10">
              {/* Dot */}
              <div className="relative">
                <motion.div
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  style={{
                    background: isActive
                      ? 'rgba(6,182,212,0.15)'
                      : isComplete
                        ? 'rgba(132,204,22,0.1)'
                        : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${
                      isActive
                        ? 'rgba(6,182,212,0.5)'
                        : isComplete
                          ? 'rgba(132,204,22,0.3)'
                          : 'rgba(255,255,255,0.06)'
                    }`,
                  }}
                  animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                  transition={isActive ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : {}}
                >
                  <div
                    className="w-2 h-2 rounded-full transition-colors duration-500"
                    style={{
                      background: isActive
                        ? '#06b6d4'
                        : isComplete
                          ? '#84cc16'
                          : 'rgba(255,255,255,0.08)',
                      boxShadow: isActive
                        ? '0 0 8px rgba(6,182,212,0.6)'
                        : isComplete
                          ? '0 0 6px rgba(132,204,22,0.4)'
                          : 'none',
                    }}
                  />
                </motion.div>

                {/* Active ping effect */}
                {isActive && (
                  <div className="absolute inset-0 w-[18px] h-[18px] rounded-full border border-cyan-400/30 animate-ping" />
                )}
              </div>

              {/* Label */}
              <span
                className="text-[8px] font-bold tracking-[0.2em] font-mono transition-colors duration-500"
                style={{
                  color: isActive
                    ? 'rgba(6,182,212,0.8)'
                    : isComplete
                      ? 'rgba(132,204,22,0.5)'
                      : isFuture
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.3)',
                }}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
