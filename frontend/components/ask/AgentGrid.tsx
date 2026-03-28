'use client'

import { motion, AnimatePresence } from 'framer-motion'
import AgentCard from './AgentCard'
import type { AgentStatus } from '@/lib/types'

interface AgentGridProps {
  agents: AgentStatus[]
}

export default function AgentGrid({ agents }: AgentGridProps) {
  if (agents.length === 0) return null

  const completed = agents.filter(a => a.status === 'complete').length
  const total = agents.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            {completed < total && (
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase font-mono">
            Data Agents
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/30">
          {completed}/{total} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-px bg-white/5 mb-4 mx-1 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400/60 to-green/60"
          initial={{ width: '0%' }}
          animate={{ width: `${(completed / total) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <AnimatePresence mode="popLayout">
          {agents.map((agent, i) => (
            <AgentCard key={agent.agent_id} agent={agent} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
