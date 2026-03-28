'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { WsMessage, DataCard, MapPin, ToolCall, AgentState, SessionSummary } from '@/lib/types'

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
  sessionSummary: SessionSummary | null
  capturedImage: string | null
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
    sessionSummary: null,
    capturedImage: null,
    remoteConnected: false,
    isConnected: false,
  })

  // iOS requires AudioContext creation inside a user gesture. We set up a
  // one-shot listener so the first tap/click on the dashboard page creates it.
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 })
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }, [])

  useEffect(() => {
    const unlock = () => { initAudio() }
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchend', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchend', unlock)
    }
  }, [initAudio])

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
          capturedImage: null,
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
      case 'captured_image':
        setState(s => ({ ...s, capturedImage: msg.data }))
        break
      case 'session_complete':
        setState(s => ({ ...s, sessionSummary: msg.session }))
        break
      case 'pong':
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


// ─── PCM audio helpers ───────────────────────────────────────────────────────

/** Convert Float32Array to Int16Array (PCM 16-bit) */
function float32ToInt16(f32: Float32Array): Int16Array {
  const out = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

/** Downsample from source rate to 16kHz by linear interpolation */
function downsampleTo16k(buffer: Float32Array, fromRate: number): Float32Array {
  if (fromRate === 16000) return buffer
  const ratio = fromRate / 16000
  const newLen = Math.round(buffer.length / ratio)
  const out = new Float32Array(newLen)
  for (let i = 0; i < newLen; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const frac = pos - idx
    out[i] = buffer[idx] + (buffer[Math.min(idx + 1, buffer.length - 1)] - buffer[idx]) * frac
  }
  return out
}

/** Base64-encode a typed array without stack overflow (safe for iOS) */
function arrayToBase64(arr: Uint8Array): string {
  const CHUNK = 8192
  let result = ''
  for (let i = 0; i < arr.length; i += CHUNK) {
    const slice = arr.subarray(i, Math.min(i + CHUNK, arr.length))
    result += String.fromCharCode(...slice)
  }
  return btoa(result)
}


// ─── Remote hook ──────────────────────────────────────────────────────────────

export interface RemoteState {
  isConnected: boolean
  isSpeaking: boolean
  cameraActive: boolean
  startSpeaking: () => void
  stopSpeaking: () => void
  captureFrame: () => void
}

export function useRemoteWs(
  sessionId: string,
  videoElId = 'camera-preview',
): RemoteState {
  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const captureVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  // ── Audio: capture mic → raw PCM 16kHz mono → base64 → WebSocket ──────────

  const startSpeaking = useCallback(async () => {
    send({ type: 'user_start_speaking' })
    setIsSpeaking(true)
    try {
      // iOS ignores sampleRate constraint — we'll resample manually
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      audioStreamRef.current = stream

      // Create AudioContext (must happen in user gesture on iOS — this is
      // called from onTouchStart/onMouseDown so it qualifies)
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') await ctx.resume()

      const source = ctx.createMediaStreamSource(stream)
      sourceNodeRef.current = source

      // ScriptProcessorNode to get raw PCM Float32 samples.
      // 4096 buffer = ~85ms at 48kHz — good balance of latency vs overhead.
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      const nativeSampleRate = ctx.sampleRate // 48000 on iOS, varies on desktop
      console.log(`[audio] native sample rate: ${nativeSampleRate}Hz, will resample to 16000Hz`)

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        // Downsample to 16kHz
        const resampled = downsampleTo16k(input, nativeSampleRate)
        // Convert to 16-bit PCM
        const pcm16 = float32ToInt16(resampled)
        // Encode as base64 (iOS-safe chunked method)
        const b64 = arrayToBase64(new Uint8Array(pcm16.buffer))
        send({ type: 'audio_frame', data: b64 })
      }

      source.connect(processor)
      processor.connect(ctx.destination) // Required for onaudioprocess to fire
    } catch (e) {
      console.error('[audio] mic access denied:', e)
      setIsSpeaking(false)
    }
  }, [send])

  const stopSpeaking = useCallback(() => {
    // Disconnect audio processing chain
    processorRef.current?.disconnect()
    sourceNodeRef.current?.disconnect()
    processorRef.current = null
    sourceNodeRef.current = null

    // Stop mic tracks
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
    audioStreamRef.current = null

    // Close AudioContext
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null

    setIsSpeaking(false)
    send({ type: 'user_stop_speaking' })
  }, [send])

  // ── Camera: rear camera → 1fps JPEG 768×768 → base64 → WebSocket ─────────

  const startCamera = useCallback(async () => {
    try {
      // Use 'ideal' constraints — iOS may not support exact 768×768
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 768 }, height: { ideal: 768 }, facingMode: 'environment' },
          audio: false,
        })
      } catch {
        // Fallback: drop facingMode constraint (use front camera if rear fails)
        console.warn('[camera] rear camera failed, trying without facingMode')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 768 }, height: { ideal: 768 } },
          audio: false,
        })
      }
      videoStreamRef.current = stream
      setCameraActive(true)

      // Attach preview to visible <video> element
      const videoEl = document.getElementById(videoElId) as HTMLVideoElement | null
      if (videoEl) {
        videoEl.srcObject = stream
        videoEl.setAttribute('playsinline', 'true')
        videoEl.setAttribute('webkit-playsinline', 'true')
        await videoEl.play().catch(() => {})
      }

      // Offscreen canvas for frame capture (768×768 square crop)
      const canvas = document.createElement('canvas')
      canvas.width = 768
      canvas.height = 768
      const ctx2d = canvas.getContext('2d')
      captureCanvasRef.current = canvas

      const offVid = document.createElement('video')
      offVid.srcObject = stream
      offVid.muted = true
      offVid.playsInline = true
      offVid.setAttribute('playsinline', 'true')
      await offVid.play()
      captureVideoRef.current = offVid

      // Helper: draw current frame to canvas (center-cropped to square)
      const drawFrame = () => {
        if (!ctx2d) return
        const vw = offVid.videoWidth || 768
        const vh = offVid.videoHeight || 768
        const size = Math.min(vw, vh)
        const sx = (vw - size) / 2
        const sy = (vh - size) / 2
        ctx2d.drawImage(offVid, sx, sy, size, size, 0, 0, 768, 768)
      }

      // Stream frames at 1fps (low quality, continuous context for Gemini)
      frameTimerRef.current = setInterval(() => {
        if (!ctx2d || wsRef.current?.readyState !== WebSocket.OPEN) return
        drawFrame()
        const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
        if (b64) send({ type: 'video_frame', data: b64 })
      }, 1000)

      console.log(`[camera] streaming at 1fps, resolution: ${offVid.videoWidth}x${offVid.videoHeight}`)
    } catch (e) {
      console.error('[camera] access denied:', e)
    }
  }, [send, videoElId])

  // ── Capture: high-quality snapshot → Gemini + dashboard ─────────────────────

  const captureFrame = useCallback(() => {
    const canvas = captureCanvasRef.current
    const offVid = captureVideoRef.current
    if (!canvas || !offVid) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    // Draw current frame at full quality
    const vw = offVid.videoWidth || 768
    const vh = offVid.videoHeight || 768
    const size = Math.min(vw, vh)
    const sx = (vw - size) / 2
    const sy = (vh - size) / 2
    ctx2d.drawImage(offVid, sx, sy, size, size, 0, 0, 768, 768)

    // Higher JPEG quality than the 1fps stream (0.92 vs 0.7)
    const b64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1]
    if (b64) {
      send({ type: 'capture_frame', data: b64 })
      console.log(`[camera] captured high-quality frame (${b64.length} chars)`)
    }
  }, [send])

  // ── WebSocket lifecycle ────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) return
    let mounted = true
    let pingTimer: ReturnType<typeof setInterval>

    const ws = new WebSocket(`${WS_URL}/ws/remote?session_id=${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mounted) return
      console.log(`[remote-ws] connected, session=${sessionId}`)
      setIsConnected(true)
      startCamera()
      // Heartbeat to keep WS alive through iOS background/proxy timeouts
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
      }, 25000)
    }
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'error') console.error('[remote-ws]', msg.message)
      } catch {}
    }
    ws.onclose = () => {
      console.log('[remote-ws] disconnected')
      clearInterval(pingTimer)
      if (mounted) setIsConnected(false)
    }
    ws.onerror = () => ws.close()

    return () => {
      mounted = false
      clearInterval(pingTimer)
      if (frameTimerRef.current) clearInterval(frameTimerRef.current)
      videoStreamRef.current?.getTracks().forEach(t => t.stop())
      audioStreamRef.current?.getTracks().forEach(t => t.stop())
      processorRef.current?.disconnect()
      sourceNodeRef.current?.disconnect()
      audioCtxRef.current?.close().catch(() => {})
      ws.close()
    }
  }, [sessionId, startCamera])

  return { isConnected, isSpeaking, cameraActive, startSpeaking, stopSpeaking, captureFrame }
}
