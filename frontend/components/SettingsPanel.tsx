'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, VolumeX } from 'lucide-react'

type DemoScenario = 'all' | 'restaurant' | 'building' | 'construction'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onRunDemo: (scenario: DemoScenario) => void
  onVolumeChange: (volume: number) => void
  onMuteChange: (muted: boolean) => void
  volume: number
  muted: boolean
}

const SCENARIO_BUTTONS: { key: Exclude<DemoScenario, 'all'>; label: string }[] = [
  { key: 'restaurant', label: 'RESTAURANT' },
  { key: 'building', label: 'BUILDING' },
  { key: 'construction', label: 'CONSTRUCTION' },
]

export default function SettingsPanel({
  isOpen,
  onClose,
  onRunDemo,
  onVolumeChange,
  onMuteChange,
  volume,
  muted,
}: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-midnight/60"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-[70] h-full w-full sm:w-[320px] bg-midnight/95 backdrop-blur-xl border-l border-silver-mist/10 flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-silver-mist/10">
              <p className="font-mono text-[10px] tracking-[0.25em] text-silver-mist/60 uppercase">
                Settings
              </p>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-silver-mist/10 transition-colors"
              >
                <X className="w-4 h-4 text-silver-mist/50" />
              </button>
            </div>

            {/* Demo Mode Section */}
            <div className="px-5 py-5 border-b border-silver-mist/10">
              <p className="font-mono text-[8px] tracking-[0.25em] text-silver-mist/40 uppercase mb-4">
                Demo Mode
              </p>

              <button
                onClick={() => {
                  onRunDemo('all')
                  onClose()
                }}
                className="w-full py-2.5 rounded-md bg-electric-cyan/15 border border-electric-cyan/30 font-mono text-[10px] tracking-[0.15em] text-electric-cyan hover:bg-electric-cyan/25 transition-colors mb-3"
              >
                RUN FULL DEMO
              </button>

              <div className="flex gap-2">
                {SCENARIO_BUTTONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      onRunDemo(key)
                      onClose()
                    }}
                    className="flex-1 py-2 rounded-md bg-silver-mist/5 border border-silver-mist/10 font-mono text-[7px] tracking-[0.1em] text-silver-mist/60 hover:bg-silver-mist/10 hover:text-silver-mist/80 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Section */}
            <div className="px-5 py-5 border-b border-silver-mist/10">
              <p className="font-mono text-[8px] tracking-[0.25em] text-silver-mist/40 uppercase mb-4">
                Audio
              </p>

              {/* Volume slider */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono text-[9px] tracking-[0.15em] text-silver-mist/60">
                    VOLUME
                  </label>
                  <span className="font-mono text-[9px] text-silver-mist/40">
                    {volume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer bg-silver-mist/10 accent-electric-cyan"
                />
              </div>

              {/* Mute toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {muted ? (
                    <VolumeX className="w-3.5 h-3.5 text-silver-mist/40" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-silver-mist/60" />
                  )}
                  <span className="font-mono text-[9px] tracking-[0.15em] text-silver-mist/60">
                    MUTE
                  </span>
                </div>
                <button
                  onClick={() => onMuteChange(!muted)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    muted ? 'bg-electric-cyan/30' : 'bg-silver-mist/10'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
                      muted
                        ? 'translate-x-4 bg-electric-cyan'
                        : 'translate-x-0 bg-silver-mist/40'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto px-5 py-4">
              <p className="font-mono text-[7px] tracking-[0.1em] text-silver-mist/20 text-center">
                ASK NYC v0.1 — HACKATHON BUILD
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
