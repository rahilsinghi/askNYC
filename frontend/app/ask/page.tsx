'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Zap, Database, Clock } from 'lucide-react'
import QueryInput from '@/components/ask/QueryInput'
import ProgressTimeline from '@/components/ask/ProgressTimeline'
import AgentGrid from '@/components/ask/AgentGrid'
import RecommendationCard from '@/components/ask/RecommendationCard'
import { useRecommend } from '@/hooks/useRecommend'

export default function AskPage() {
  const router = useRouter()
  const rec = useRecommend()

  // Override body overflow:hidden from globals.css so this page can scroll
  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleNewQuery = useCallback(() => {
    rec.reset()
  }, [rec])

  return (
    <div className="relative min-h-screen bg-bg font-mono overflow-x-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Radial glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] tracking-[0.15em] font-bold uppercase">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
            <span className="text-[10px] tracking-[0.2em] font-bold text-white/40 uppercase">
              Ask NYC
            </span>
          </div>
        </div>

        {/* Hero heading */}
        <AnimatePresence mode="wait">
          {rec.phase === 'idle' && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white/90 mb-3">
                Ask NYC <span className="text-cyan-400">Anything</span>
              </h1>
              <p className="text-sm text-white/30 max-w-md mx-auto leading-relaxed">
                Ask a question. Our agents query 7 NYC Open Data sources in real-time
                and synthesize data-backed recommendations.
              </p>

              {/* Feature pills */}
              <div className="flex items-center justify-center gap-4 mt-5">
                {[
                  { icon: Database, label: '7 Datasets' },
                  { icon: Zap, label: 'Real-Time' },
                  { icon: Clock, label: '< 10 sec' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-white/15" />
                    <span className="text-[9px] tracking-wider text-white/20 font-bold uppercase">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active query header */}
        <AnimatePresence>
          {rec.phase !== 'idle' && (
            <motion.div
              key="active-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <p className="text-[11px] text-white/25 font-mono mb-1">INVESTIGATING</p>
              <h2 className="text-lg font-display font-bold text-white/70 max-w-lg mx-auto">
                &ldquo;{rec.query}&rdquo;
              </h2>
              {rec.parsedLocation && (
                <p className="text-[10px] text-cyan-400/50 mt-1 font-mono tracking-wide">
                  {rec.parsedLocation} &middot; {rec.parsedIntent}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search input */}
        <div className="mb-8">
          <QueryInput onSubmit={rec.submit} phase={rec.phase} />
        </div>

        {/* Progress timeline */}
        <div className="mb-8">
          <ProgressTimeline phase={rec.phase} />
        </div>

        {/* Agent grid */}
        <AnimatePresence>
          {rec.agents.length > 0 && (
            <motion.div
              key="agents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-10"
            >
              <AgentGrid agents={rec.agents} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recommendations */}
        <AnimatePresence>
          {rec.recommendations.length > 0 && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Section header */}
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_rgba(132,204,22,0.5)]" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                  Recommendations
                </span>
                <span className="text-[10px] font-mono text-green/50">{rec.recommendations.length}</span>
                {rec.queryTimeMs && (
                  <>
                    <div className="w-px h-3 bg-white/10 mx-1" />
                    <span className="text-[9px] font-mono text-white/20">
                      {(rec.queryTimeMs / 1000).toFixed(1)}s
                    </span>
                  </>
                )}
              </div>

              {/* Cards */}
              <div className="space-y-4">
                {rec.recommendations.map((r, i) => (
                  <RecommendationCard
                    key={`${r.name}-${i}`}
                    recommendation={r}
                    index={i}
                    rank={i + 1}
                  />
                ))}
              </div>

              {/* New query button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: rec.recommendations.length * 0.3 + 0.5 }}
                className="flex justify-center mt-8 mb-12"
              >
                <button
                  onClick={handleNewQuery}
                  className="text-[10px] tracking-[0.15em] font-bold uppercase px-6 py-2.5 rounded-xl transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'rgba(6,182,212,0.1)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    color: 'rgba(6,182,212,0.7)',
                    boxShadow: '0 0 20px rgba(6,182,212,0.1)',
                  }}
                >
                  Ask Another Question
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        {rec.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-6"
          >
            <p className="text-[11px] text-red/70 font-mono">{rec.error}</p>
            <button
              onClick={handleNewQuery}
              className="mt-3 text-[10px] text-white/30 hover:text-white/50 transition-colors underline"
            >
              Try again
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 mb-8">
          <p className="text-[9px] text-white/10 tracking-wider uppercase">
            Powered by NYC Open Data &middot; 7 Datasets &middot; Real-Time Analysis
          </p>
        </div>
      </div>
    </div>
  )
}
