'use client'

import { useState, useEffect, useCallback } from 'react'

const VOLUME_KEY = 'asknyc-volume'
const MUTED_KEY = 'asknyc-muted'

interface UseSettingsReturn {
  volume: number
  setVolume: (v: number) => void
  muted: boolean
  setMuted: (m: boolean) => void
}

export function useSettings(): UseSettingsReturn {
  const [volume, setVolumeState] = useState(80)
  const [muted, setMutedState] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedVolume = localStorage.getItem(VOLUME_KEY)
      if (storedVolume !== null) {
        const parsed = Number(storedVolume)
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          setVolumeState(parsed)
        }
      }
      const storedMuted = localStorage.getItem(MUTED_KEY)
      if (storedMuted !== null) {
        setMutedState(storedMuted === 'true')
      }
    } catch {
      // localStorage unavailable (SSR or private browsing)
    }
  }, [])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)))
    setVolumeState(clamped)
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped))
    } catch {
      // ignore
    }
  }, [])

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m)
    try {
      localStorage.setItem(MUTED_KEY, String(m))
    } catch {
      // ignore
    }
  }, [])

  return { volume, setVolume, muted, setMuted }
}
