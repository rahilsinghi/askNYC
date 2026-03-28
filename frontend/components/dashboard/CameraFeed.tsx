'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface Detection {
  label: string
  confidence: number
}

interface CameraFeedProps {
  detection: Detection | null
  remoteConnected: boolean
  uploadedImage: string | null
  onImageUpload: (base64: string) => void
  onImageClear: () => void
  mapCenter?: { lat: number; lng: number } | null
}

export default function CameraFeed({ detection, remoteConnected, uploadedImage, onImageUpload, onImageClear, mapCenter }: CameraFeedProps) {
  const scanRef = useRef<HTMLDivElement>(null)
  const [scanPos, setScanPos] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return

    // Resize to 768x768 JPEG to match remote camera format
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 768
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Center crop to square
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ background: '#0a0608' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Uploaded image display */}
      {uploadedImage && (
        <div className="absolute inset-0 z-5">
          <img
            src={`data:image/jpeg;base64,${uploadedImage}`}
            alt="Uploaded location"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
          <button
            onClick={onImageClear}
            className="absolute top-3 right-3 z-30 bg-black/70 border border-white/20 text-white/80 font-mono text-[9px] tracking-wider px-2 py-1 rounded hover:bg-red/80 hover:border-red transition-colors"
          >
            CLEAR
          </button>
        </div>
      )}

      {/* Atmosphere layers (dimmed when image present) */}
      {!uploadedImage && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse at 30% 40%, rgba(180,60,20,0.22) 0%, transparent 55%),
              radial-gradient(ellipse at 72% 28%, rgba(200,140,40,0.12) 0%, transparent 45%),
              radial-gradient(ellipse at 50% 85%, rgba(20,30,60,0.35) 0%, transparent 50%)
            `
          }}/>
        </div>
      )}

      {/* Building silhouettes */}
      {!uploadedImage && (
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
      )}

      {/* Neon glows */}
      {!uploadedImage && (
        <>
          <div className="absolute pointer-events-none" style={{ top: '35%', left: '15%', width: 80, height: 18, background: 'rgba(200,80,20,0.28)', borderRadius: 2, boxShadow: '0 0 24px rgba(200,80,20,0.35), 0 0 48px rgba(200,80,20,0.15)' }}/>
          <div className="absolute pointer-events-none" style={{ top: '38%', left: '52%', width: 60, height: 14, background: 'rgba(20,120,200,0.2)', borderRadius: 2, boxShadow: '0 0 16px rgba(20,120,200,0.25)' }}/>
        </>
      )}

      {/* Bottom fade */}
      {!uploadedImage && (
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(transparent, rgba(200,80,20,0.06))' }}/>
      )}

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
          {mapCenter ? `${mapCenter.lat.toFixed(4)}° N, ${Math.abs(mapCenter.lng).toFixed(4)}° W` : 'AWAITING LOCATION'}
        </div>
        <div className="font-mono text-[8px] tracking-[0.15em] text-white bg-red px-2 py-0.5 rounded-[3px] live-badge">
          {remoteConnected ? 'LIVE FEED' : uploadedImage ? 'UPLOADED' : 'NO REMOTE'}
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
          {[
            'top-[-2px] left-[-2px] border-t-2 border-l-2',
            'top-[-2px] right-[-2px] border-t-2 border-r-2',
            'bottom-[-2px] left-[-2px] border-b-2 border-l-2',
            'bottom-[-2px] right-[-2px] border-b-2 border-r-2',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-2.5 h-2.5 border-green ${cls}`} />
          ))}
          <div className="absolute -top-[26px] left-[-1px] bg-green text-black font-mono font-medium text-[8px] tracking-[0.1em] px-2 py-0.5 whitespace-nowrap">
            IDENTIFIED: {detection.label.toUpperCase()}
          </div>
        </div>
      )}

      {/* Hidden file input — always mounted */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) {
            handleFile(files[0])
          }
          e.target.value = ''
        }}
      />

      {/* Drop zone / upload prompt */}
      {!remoteConnected && !uploadedImage && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center z-30 cursor-pointer transition-colors ${isDragging ? 'bg-green/10' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          {isDragging ? (
            <div className="font-mono text-[13px] tracking-[0.15em] text-green font-medium">DROP IMAGE HERE</div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 rounded-lg border border-dashed border-white/20 bg-black/40 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-full border border-green/40 flex items-center justify-center text-green text-xl">+</div>
              <div className="font-mono text-[10px] tracking-[0.12em] text-white/70">DROP AN IMAGE OR CLICK TO UPLOAD</div>
              <div className="font-mono text-[8px] tracking-[0.1em] text-white/40">Street view, storefront, building photo</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
