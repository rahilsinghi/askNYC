'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgentState } from '@/lib/types'

interface Detection {
  label: string
  confidence: number
  box?: number[] // [ymin, xmin, ymax, xmax] 0-1000
}

interface CameraFeedProps {
  detection: Detection | null
  remoteConnected: boolean
  uploadedImage: string | null
  onImageUpload: (base64: string) => void
  onImageClear: () => void
  mapCenter?: { lat: number; lng: number } | null
  agentState: AgentState
  isFocusMode?: boolean
  mini?: boolean
}

export default function CameraFeed({
  detection,
  remoteConnected,
  uploadedImage,
  onImageUpload,
  onImageClear,
  mapCenter,
  agentState,
  isFocusMode,
  mini
}: CameraFeedProps) {
  const [scanPos, setScanPos] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Analysis states
  const isAnalyzing = agentState === 'processing'
  const isComplete = agentState === 'speaking' || (agentState === 'idle' && uploadedImage)

  // Scan line animation
  useEffect(() => {
    let raf: number
    const animate = () => {
      setScanPos(p => (p + (isAnalyzing ? 1.2 : 0.25)) % 100)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [isAnalyzing])

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 768
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      const base64 = dataUrl.split(',')[1]
      if (base64) onImageUpload(base64)
    }
    img.src = URL.createObjectURL(file)
  }

  // Typewriter effect for coordinates
  const [displayText, setDisplayText] = useState('')
  const targetText = useMemo(() => {
    if (!mapCenter) return 'DECODING GRID...'
    return `${mapCenter.lat.toFixed(4)}° N, ${Math.abs(mapCenter.lng).toFixed(4)}° W`
  }, [mapCenter])

  useEffect(() => {
    if (isAnalyzing) {
      let i = 0
      setDisplayText('')
      const interval = setInterval(() => {
        setDisplayText(targetText.slice(0, i))
        i++
        if (i > targetText.length) clearInterval(interval)
      }, 50)
      return () => clearInterval(interval)
    } else if (!uploadedImage) {
      setDisplayText('')
    } else {
      setDisplayText(targetText)
    }
  }, [isAnalyzing, targetText, uploadedImage])

  const [currentTime, setCurrentTime] = useState<string | null>(null)
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString())
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Mini PiP mode
  if (mini) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-[#07111D] cursor-pointer"
           onClick={() => !uploadedImage && fileInputRef.current?.click()}>
        {uploadedImage ? (
          <img src={`data:image/jpeg;base64,${uploadedImage}`} alt="Location" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(20,30,60,0.5) 0%, rgba(7,17,29,1) 80%)' }} />
        )}
        <div className="absolute left-0 right-0 pointer-events-none z-10 opacity-40"
          style={{ top: `${scanPos}%`, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(132,204,22,0.6) 50%, transparent 100%)' }} />
        <div className="absolute top-2 right-2 z-20">
          <div className={`w-2 h-2 rounded-full ${remoteConnected || uploadedImage ? 'bg-[#84cc16] shadow-[0_0_6px_#84cc16]' : 'bg-white/20'}`} />
        </div>
        {detection && (
          <div className="absolute bottom-1 left-1 right-1 z-20">
            <div className="bg-black/70 px-1.5 py-0.5 rounded text-[7px] font-mono text-[#84cc16] tracking-wider truncate">
              {detection.label.toUpperCase()}
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files; if (f?.[0]) handleFile(f[0]); e.target.value = '' }} />
      </div>
    )
  }

  return (
    <div
      className="flex h-[320px] relative overflow-hidden bg-[#07111D] transition-all duration-500"
      style={{ width: uploadedImage ? '1000px' : '480px' }}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
    >
      {/* Left Plate: Image Analysis */}
      <motion.div
        animate={{ width: isAnalyzing || isComplete ? '50%' : '100%' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-full border-r border-white/5 overflow-hidden flex-shrink-0"
      >
        <AnimatePresence>
          {uploadedImage ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <img
                src={`data:image/jpeg;base64,${uploadedImage}`}
                alt="Source"
                className="w-full h-full object-cover grayscale-[0.3] brightness-75"
              />
              <div className="absolute inset-0 bg-cyan-900/10 mix-blend-overlay" />

              {/* Scanline intensity */}
              <div
                className="absolute left-0 right-0 pointer-events-none z-10"
                style={{
                  top: `${scanPos}%`,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, #41E4F4, transparent)',
                  boxShadow: '0 0 10px #41E4F4',
                }}
              />

              {/* Analytical Brackets */}
              {isAnalyzing && !detection && (
                <div className="absolute inset-8 border border-cyan-400/20 pointer-events-none">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
                </div>
              )}

              {/* Real Detection Overlay */}
              {detection && detection.box && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute border-2 border-cyan-400 z-20 pointer-events-none"
                  style={{
                    top: `${detection.box[0] / 10}%`,
                    left: `${detection.box[1] / 10}%`,
                    height: `${(detection.box[2] - detection.box[0]) / 10}%`,
                    width: `${(detection.box[3] - detection.box[1]) / 10}%`,
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-cyan-400 text-black text-[10px] font-bold px-2 py-0.5 whitespace-nowrap uppercase tracking-wider">
                    {detection.label} {Math.round(detection.confidence * 100)}%
                  </div>
                  {/* Corner Accents */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-200" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-200" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-200" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-200" />
                </motion.div>
              )}

              <button
                onClick={onImageClear}
                className="absolute top-3 right-3 z-30 px-2 py-1 bg-black/50 hover:bg-red-500/80 text-white/40 text-[8px] font-bold rounded border border-white/10 transition-all uppercase tracking-widest"
              >
                Clear
              </button>
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center text-white/20 text-xl font-light">+</div>
              <p className="mt-4 text-[9px] font-bold tracking-[0.2em] text-white/20 uppercase">Awaiting Visual Input</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-full h-full cursor-pointer"
              />
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files![0])} />
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right Plate: Data/Coordinates (Appears on query) */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{
          width: isAnalyzing || isComplete ? '50%' : '0%',
          opacity: isAnalyzing || isComplete ? 1 : 0
        }}
        className="relative h-full bg-[#0B1D31]/40 flex flex-col p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-bold text-cyan-400 tracking-[.3em] uppercase">Geo_Sync</span>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[8px] font-mono text-cyan-400/40">LINK_STABLE</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Decoded Coordinates</h4>
          <p className="text-[18px] font-black text-white tracking-widest font-mono">
            {displayText}<span className="animate-pulse">_</span>
          </p>

          <div className="mt-8 space-y-4">
            <div className="h-1 flex gap-1">
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`flex-1 h-full rounded-full ${i < 12 ? 'bg-cyan-400/60' : 'bg-white/5'}`} />
              ))}
            </div>
            <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-bold leading-relaxed">
              Source: Satellite Telemetry // Ground-truth confirmed
              <br />
              Entity: MANHATTAN_GRID_SECTOR_07
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between opacity-30">
          <span className="text-[8px] font-mono">NODE_774.2_SYNC</span>
          <span className="text-[8px] font-mono">{currentTime}</span>
        </div>
      </motion.div>

      {/* Top Badge: System Status */}
      <div className="absolute top-4 left-4 z-40 bg-black/60 px-2 py-1 rounded border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-1 rounded-full ${isAnalyzing ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-cyan-400'} animate-pulse`} />
          <span className="text-[8px] font-bold tracking-[0.15em] text-white/60">
            {isAnalyzing ? 'ANALYZING...' : isComplete ? 'SOURCE_LOCKED' : 'SYSTEM_IDLE'}
          </span>
        </div>
      </div>
    </div>
  )
}
