'use client'

import { useState, useCallback } from 'react'

interface MicButtonProps {
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export default function MicButton({ onStart, onStop, disabled }: MicButtonProps) {
  const [isActive, setIsActive] = useState(false)

  const handleStart = useCallback(() => {
    if (disabled) return
    setIsActive(true)
    onStart()
  }, [disabled, onStart])

  const handleStop = useCallback(() => {
    setIsActive(false)
    onStop()
  }, [onStop])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Outer ring */}
      <div className="relative flex items-center justify-center">
        {/* Pulse ring (active only) */}
        {isActive && (
          <div
            className="absolute rounded-full border border-green/40"
            style={{
              width: 144, height: 144,
              animation: 'ringOut 1.5s ease-out infinite',
            }}
          />
        )}

        {/* Second pulse ring (staggered) */}
        {isActive && (
          <div
            className="absolute rounded-full border border-green/20"
            style={{
              width: 168, height: 168,
              animation: 'ringOut 1.5s ease-out 0.5s infinite',
            }}
          />
        )}

        {/* Static outer border */}
        <div
          className="w-[120px] h-[120px] rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            border: `1.5px solid ${isActive ? '#84cc16' : 'rgba(244,244,245,0.1)'}`,
          }}
        >
          {/* Inner button */}
          <button
            onMouseDown={handleStart}
            onMouseUp={handleStop}
            onTouchStart={(e) => { e.preventDefault(); handleStart() }}
            onTouchEnd={(e) => { e.preventDefault(); handleStop() }}
            disabled={disabled}
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all duration-200 select-none"
            style={{
              background: isActive ? 'rgba(132,204,22,0.12)' : 'var(--surface)',
              border: `1px solid ${isActive ? '#84cc16' : 'var(--border)'}`,
              ...(isActive ? { boxShadow: '0 0 0 0 rgba(132,204,22,0.5)', animation: 'micPulse 1s ease-out infinite' } : {}),
            }}
          >
            {/* Mic icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: isActive ? '#84cc16' : 'var(--muted)' }}
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
        style={{ color: isActive ? '#84cc16' : 'var(--muted)' }}
      >
        {isActive ? 'Listening...' : disabled ? 'Connecting...' : 'Hold to speak'}
      </p>
    </div>
  )
}
