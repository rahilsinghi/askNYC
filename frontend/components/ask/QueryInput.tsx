'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Loader2 } from 'lucide-react'
import type { RecommendPhase } from '@/lib/types'

const DEMO_PROMPTS = [
  'Best pizza place to eat near Washington Square Park',
  'Safest neighborhood to move to in Brooklyn near a subway',
  "What's happening with construction around Hudson Yards",
  'Late night food options near Times Square that are clean',
]

interface QueryInputProps {
  onSubmit: (query: string) => void
  phase: RecommendPhase
}

export default function QueryInput({ onSubmit, phase }: QueryInputProps) {
  const [query, setQuery] = useState('')
  const isLoading = phase !== 'idle' && phase !== 'complete'

  const handleSubmit = useCallback(() => {
    const q = query.trim()
    if (!q || isLoading) return
    onSubmit(q)
  }, [query, isLoading, onSubmit])

  const handleDemoClick = useCallback((prompt: string) => {
    setQuery(prompt)
    onSubmit(prompt)
  }, [onSubmit])

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="glass rounded-2xl p-1.5 transition-all duration-300 focus-within:border-cyan-400/30 focus-within:shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Search className="w-4 h-4 text-white/25 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Ask anything about NYC..."
              className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none font-mono"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={!query.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold tracking-[0.15em] uppercase transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: isLoading
                  ? 'rgba(6,182,212,0.15)'
                  : 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(132,204,22,0.2))',
                color: isLoading ? '#06b6d4' : '#06b6d4',
                boxShadow: !isLoading && query.trim()
                  ? '0 0 20px rgba(6,182,212,0.2)'
                  : 'none',
              }}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Investigate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Demo prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-4 flex flex-wrap justify-center gap-2"
      >
        {DEMO_PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            onClick={() => handleDemoClick(prompt)}
            disabled={isLoading}
            className="text-[10px] font-mono tracking-wide px-3 py-1.5 rounded-lg transition-all duration-300 disabled:opacity-30"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.35)',
            }}
            whileHover={{
              borderColor: 'rgba(6,182,212,0.3)',
              color: 'rgba(6,182,212,0.7)',
              background: 'rgba(6,182,212,0.05)',
            }}
          >
            {prompt.length > 45 ? `${prompt.slice(0, 45)}...` : prompt}
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
