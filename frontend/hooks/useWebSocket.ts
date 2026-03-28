'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { WsMessage, DataCard, MapPin, ToolCall, AgentState } from '@/lib/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

// ─── Dashboard hook ───────────────────────────────────────────────────────────

export interface DashboardState {
  sessionId: string | null
  remoteUrl: string | null
  agentState: AgentState
  cards: DataCard[]
  pins: MapPin[]
  mapCenter: { lat: number; lng: number } | null
  toolCalls: ToolCall[]
  transcript: string
  detection: { label: string; confidence: number } | null
  remoteConnected: boolean
  isConnected: boolean
}

export function useDashboardWs(): DashboardState & { sendQuery: (image: string | null, text: string) => void } {
  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [state, setState] = useState<DashboardState>({
    sessionId: null,
    remoteUrl: null,
    agentState: 'idle',
    cards: [],
    pins: [],
    mapCenter: null,
    toolCalls: [],
    transcript: '',
    detection: null,
    remoteConnected: false,
    isConnected: false,
  })

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 })
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }, [])

  const playChunk = useCallback(async (b64: string) => {
    initAudio()
    const ctx = audioCtxRef.current
    if (!ctx) return
    try {
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const pcm = new Int16Array(bytes.buffer)
      const f32 = new Float32Array(pcm.length)
      for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768
      const buf = ctx.createBuffer(1, f32.length, 24000)
      buf.copyToChannel(f32, 0)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start()
    } catch (e) {
      console.warn('Audio playback:', e)
    }
  }, [initAudio])

  const onMessage = useCallback((msg: WsMessage) => {
    console.log('[ws] received:', msg.type, msg.type === 'audio_chunk' ? '(audio)' : JSON.stringify(msg).slice(0, 200))
    switch (msg.type) {
      case 'session_ready':
        // Reset stale state from previous session
        setState(s => ({
          ...s,
          sessionId: msg.session_id,
          remoteUrl: msg.remote_url,
          cards: [],
          toolCalls: [],
          pins: [],
          mapCenter: null,
          transcript: '',
          detection: null,
          agentState: 'idle',
        }))
        break
      case 'audio_chunk':
        playChunk(msg.data)
        break
      case 'transcript':
        if (!msg.partial) setState(s => ({ ...s, transcript: msg.text }))
        break
      case 'data_card':
        setState(s => ({ ...s, cards: [msg.card, ...s.cards].slice(0, 6) }))
        break
      case 'map_event':
        if (msg.event === 'clear') {
          setState(s => ({ ...s, pins: [], mapCenter: null }))
        } else if (msg.event === 'zoom') {
          setState(s => ({ ...s, mapCenter: { lat: msg.lat, lng: msg.lng } }))
        } else {
          const pin: MapPin = {
            id: `${msg.source}-${Date.now()}`,
            lat: msg.lat, lng: msg.lng,
            source: msg.source, label: msg.label,
            timestamp: Date.now(),
          }
          setState(s => ({ ...s, pins: [...s.pins, pin] }))
        }
        break
      case 'tool_call': {
        setState(s => {
          const entry: ToolCall = { tool: msg.tool, status: msg.status, timestamp: Date.now() }
          const idx = s.toolCalls.findIndex(t => t.tool === msg.tool)
          if (idx >= 0) {
            const calls = [...s.toolCalls]
            calls[idx] = entry
            return { ...s, toolCalls: calls }
          }
          return { ...s, toolCalls: [...s.toolCalls, entry].slice(-5) }
        })
        break
      }
      case 'detection':
        setState(s => ({ ...s, detection: { label: msg.label, confidence: msg.confidence } }))
        break
      case 'agent_state':
        setState(s => ({ ...s, agentState: msg.state }))
        break
      case 'remote_connected':
        setState(s => ({ ...s, remoteConnected: true }))
        initAudio()
        break
      case 'remote_disconnected':
        setState(s => ({ ...s, remoteConnected: false }))
        break
    }
  }, [playChunk, initAudio])

  useEffect(() => {
    let mounted = true

    const connect = () => {
      if (!mounted) return
      const ws = new WebSocket(`${WS_URL}/ws/dashboard`)
      wsRef.current = ws
      let pingTimer: ReturnType<typeof setInterval>

      ws.onopen = () => {
        if (!mounted) return
        setState(s => ({ ...s, isConnected: true }))
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
        }, 25000)
      }
      ws.onmessage = (e) => {
        try { onMessage(JSON.parse(e.data) as WsMessage) } catch {}
      }
      ws.onclose = () => {
        clearInterval(pingTimer)
        setState(s => ({ ...s, isConnected: false }))
        if (mounted) reconnectTimerRef.current = setTimeout(connect, 2500)
      }
      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      mounted = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [onMessage])

  const sendQuery = useCallback((image: string | null, text: string) => {
    const ws = wsRef.current
    console.log('[ws] sendQuery called:', { hasImage: !!image, imageLen: image?.length, text, wsReady: ws?.readyState === WebSocket.OPEN })
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'dashboard_query', image, text }))
      console.log('[ws] dashboard_query sent')
    } else {
      console.warn('[ws] sendQuery: WebSocket not open, message not sent')
    }
  }, [])

  return { ...state, sendQuery }
}


// ─── Remote hook ──────────────────────────────────────────────────────────────

export interface RemoteState {
  isConnected: boolean
  startSpeaking: () => void
  stopSpeaking: () => void
}

export function useRemoteWs(
  sessionId: string,
  videoElId = 'camera-preview',
): RemoteState {
  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const startSpeaking = useCallback(async () => {
    send({ type: 'user_start_speaking' })
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' })
      recorderRef.current = recorder
      recorder.ondataavailable = async (e) => {
        if (e.data.size === 0) return
        const buf = await e.data.arrayBuffer()
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
        send({ type: 'audio_frame', data: b64 })
      }
      recorder.start(100) // 100ms chunks = low latency
    } catch (e) {
      console.error('Mic access denied:', e)
    }
  }, [send])

  const stopSpeaking = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current = null
    send({ type: 'user_stop_speaking' })
  }, [send])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 768, height: 768, facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream

      // Attach preview to visible <video> element
      const videoEl = document.getElementById(videoElId) as HTMLVideoElement | null
      if (videoEl) {
        videoEl.srcObject = stream
        await videoEl.play().catch(() => {})
      }

      // Offscreen canvas for frame capture
      const canvas = document.createElement('canvas')
      canvas.width = 768
      canvas.height = 768
      const ctx2d = canvas.getContext('2d')

      const offVid = document.createElement('video')
      offVid.srcObject = stream
      offVid.muted = true
      await offVid.play()

      frameTimerRef.current = setInterval(() => {
        if (!ctx2d || wsRef.current?.readyState !== WebSocket.OPEN) return
        ctx2d.drawImage(offVid, 0, 0, 768, 768)
        const b64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1]
        send({ type: 'video_frame', data: b64 })
      }, 1000)
    } catch (e) {
      console.error('Camera access denied:', e)
    }
  }, [send, videoElId])

  useEffect(() => {
    if (!sessionId) return
    let mounted = true

    const ws = new WebSocket(`${WS_URL}/ws/remote?session_id=${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mounted) return
      setIsConnected(true)
      startCamera()
    }
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'error') console.error('Remote:', msg.message)
      } catch {}
    }
    ws.onclose = () => { if (mounted) setIsConnected(false) }
    ws.onerror = () => ws.close()

    return () => {
      mounted = false
      if (frameTimerRef.current) clearInterval(frameTimerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      ws.close()
    }
  }, [sessionId, startCamera])

  return { isConnected, startSpeaking, stopSpeaking }
}
