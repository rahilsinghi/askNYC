'use client'

import { useCallback, useRef } from 'react'

interface MicButtonProps {
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  active: boolean
}

export default function MicButton({ onStart, onStop, disabled, active }: MicButtonProps) {
  const handledByTouchRef = useRef(false)

  const toggle = useCallback(() => {
    if (disabled) return
    if (active) {
      onStop()
    } else {
      onStart()
    }
  }, [disabled, active, onStart, onStop])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    handledByTouchRef.current = true
    toggle()
  }, [toggle])

  const handleClick = useCallback(() => {
    if (handledByTouchRef.current) {
      handledByTouchRef.current = false
      return
    }
    toggle()
  }, [toggle])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {active && (
          <>
            <div
              className="absolute rounded-full border border-warm-amber/40 pointer-events-none"
              style={{
                width: 144, height: 144,
                animation: 'pulse-cyan 1.5s ease-out infinite',
              }}
            />
            <div
              className="absolute rounded-full border border-warm-amber/20 pointer-events-none"
              style={{
                width: 168, height: 168,
                animation: 'pulse-cyan 1.5s ease-out 0.5s infinite',
              }}
            />
          </>
        )}

        <div
          className="w-[120px] h-[120px] rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            border: `1.5px solid ${active ? '#F2B35B' : 'rgba(244,244,245,0.1)'}`,
          }}
        >
          <button
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
            disabled={disabled}
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all duration-200 select-none"
            style={{
              background: active ? 'rgba(242,179,91,0.15)' : 'rgba(26,39,56,0.72)',
              border: `1px solid ${active ? '#F2B35B' : 'rgba(175,210,255,0.12)'}`,
              boxShadow: active ? '0 0 30px rgba(242,179,91,0.3)' : 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: active ? '#F2B35B' : 'rgba(244,247,251,0.5)' }}
            >
              <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <p
        className="font-mono text-[11px] tracking-[0.05em] transition-colors"
        style={{ color: active ? '#F2B35B' : 'rgba(244,247,251,0.4)' }}
      >
        {active ? 'Listening... tap to stop' : disabled ? 'Connecting...' : 'Tap to speak'}
      </p>
    </div>
  )
}
