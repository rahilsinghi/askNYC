'use client'

import { useState, useCallback, useRef } from 'react'

interface MicButtonProps {
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export default function MicButton({ onStart, onStop, disabled }: MicButtonProps) {
  const [isActive, setIsActive] = useState(false)
  const activeRef = useRef(false) // Avoid stale closure in touch events

  const handleStart = useCallback(() => {
    if (disabled || activeRef.current) return
    activeRef.current = true
    setIsActive(true)
    onStart()
  }, [disabled, onStart])

  const handleStop = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    setIsActive(false)
    onStop()
  }, [onStop])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Outer ring */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings (active only) */}
        {isActive && (
          <>
            <div
              className="absolute rounded-full border border-warm-amber/40"
              style={{
                width: 144, height: 144,
                animation: 'pulse-cyan 1.5s ease-out infinite',
              }}
            />
            <div
              className="absolute rounded-full border border-warm-amber/20"
              style={{
                width: 168, height: 168,
                animation: 'pulse-cyan 1.5s ease-out 0.5s infinite',
              }}
            />
          </>
        )}

        {/* Static outer border */}
        <div
          className="w-[120px] h-[120px] rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            border: `1.5px solid ${isActive ? '#F2B35B' : 'rgba(244,244,245,0.1)'}`,
          }}
        >
          {/* Inner button */}
          <button
            onMouseDown={handleStart}
            onMouseUp={handleStop}
            onMouseLeave={handleStop}
            onTouchStart={(e) => { e.preventDefault(); handleStart() }}
            onTouchEnd={(e) => { e.preventDefault(); handleStop() }}
            onTouchCancel={handleStop}
            disabled={disabled}
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all duration-200 select-none touch-none"
            style={{
              background: isActive ? 'rgba(242,179,91,0.15)' : 'rgba(26,39,56,0.72)',
              border: `1px solid ${isActive ? '#F2B35B' : 'rgba(175,210,255,0.12)'}`,
              boxShadow: isActive ? '0 0 30px rgba(242,179,91,0.3)' : 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Mic icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: isActive ? '#F2B35B' : 'rgba(244,247,251,0.5)' }}
            >
              <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Instruction */}
      <p
        className="font-mono text-[11px] tracking-[0.05em] transition-colors"
        style={{ color: isActive ? '#F2B35B' : 'rgba(244,247,251,0.4)' }}
      >
        {isActive ? 'Listening...' : disabled ? 'Connecting...' : 'Hold to speak'}
      </p>
    </div>
  )
}
