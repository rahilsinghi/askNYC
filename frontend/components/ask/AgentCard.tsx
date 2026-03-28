'use client'

import { motion } from 'framer-motion'
import {
  MapPin, Utensils, AlertTriangle, HardHat, Building, Shield,
  Home, Train, Sparkles, Search, Check, X, Loader2,
} from 'lucide-react'
import type { AgentStatus } from '@/lib/types'

const ICON_MAP: Record<string, React.ElementType> = {
  'map-pin': MapPin,
  utensils: Utensils,
  'alert-triangle': AlertTriangle,
  'hard-hat': HardHat,
  building: Building,
  shield: Shield,
  home: Home,
  train: Train,
  sparkles: Sparkles,
  search: Search,
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'rgba(255,255,255,0.15)',
  running: 'rgba(6,182,212,0.6)',
  complete: 'rgba(132,204,22,0.6)',
  error: 'rgba(239,68,68,0.6)',
}

interface AgentCardProps {
  agent: AgentStatus
  index: number
}

export default function AgentCard({ agent, index }: AgentCardProps) {
  const Icon = ICON_MAP[agent.icon] || Search
  const isRunning = agent.status === 'running'
  const isComplete = agent.status === 'complete'
  const isError = agent.status === 'error'
  const glowColor = STATUS_COLORS[agent.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isComplete ? [1, 1.03, 1] : 1,
      }}
      transition={{
        delay: index * 0.08,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
        scale: { delay: 0, duration: 0.3 },
      }}
      className="relative group"
    >
      <div
        className="glass-card p-3.5 rounded-xl transition-all duration-500"
        style={{
          boxShadow: isRunning
            ? `0 0 20px ${glowColor}, inset 0 0 15px rgba(6,182,212,0.05)`
            : isComplete
              ? `0 0 15px ${glowColor}, inset 0 0 10px rgba(132,204,22,0.05)`
              : isError
                ? `0 0 12px ${glowColor}`
                : '0 0 0 transparent',
          borderColor: isRunning
            ? 'rgba(6,182,212,0.3)'
            : isComplete
              ? 'rgba(132,204,22,0.2)'
              : isError
                ? 'rgba(239,68,68,0.2)'
                : undefined,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-500"
            style={{
              background: isComplete
                ? 'rgba(132,204,22,0.12)'
                : isRunning
                  ? 'rgba(6,182,212,0.12)'
                  : isError
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(255,255,255,0.05)',
            }}
          >
            <Icon
              className="w-4 h-4 transition-colors duration-500"
              style={{
                color: isComplete
                  ? '#84cc16'
                  : isRunning
                    ? '#06b6d4'
                    : isError
                      ? '#ef4444'
                      : 'rgba(255,255,255,0.3)',
              }}
            />
          </div>

          {/* Label + summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold tracking-wide uppercase transition-colors duration-500"
                style={{
                  color: isComplete
                    ? 'rgba(132,204,22,0.9)'
                    : isRunning
                      ? 'rgba(6,182,212,0.9)'
                      : isError
                        ? 'rgba(239,68,68,0.9)'
                        : 'rgba(255,255,255,0.4)',
                }}
              >
                {agent.label}
              </span>
            </div>
            {agent.summary && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="text-[10px] text-white/40 mt-0.5 truncate"
              >
                {agent.summary}
              </motion.p>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex-shrink-0">
            {isRunning && (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            )}
            {isComplete && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Check className="w-4 h-4 text-green" />
              </motion.div>
            )}
            {isError && (
              <X className="w-4 h-4 text-red" />
            )}
            {agent.status === 'pending' && (
              <div className="w-2 h-2 rounded-full bg-white/10" />
            )}
          </div>
        </div>
      </div>

      {/* Running animation: scanning line */}
      {isRunning && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-scan"
          />
        </div>
      )}
    </motion.div>
  )
}
