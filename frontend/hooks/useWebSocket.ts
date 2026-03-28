'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { WsMessage, DataCard, MapPin, ToolCall, AgentState, SessionSummary } from '@/lib/types'

// Build WS URL: use env var if set, otherwise derive from current page location.
// Always use plain ws:// for the backend (backend doesn't have TLS).
const WS_URL = (() => {
  const env = process.env.NEXT_PUBLIC_WS_URL
  if (env) return env
  if (typeof window !== 'undefined') {
    return `ws://${window.location.hostname}:8000`
  }
  return 'ws://localhost:8000'
})()

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
  const nextPlayTimeRef = useRef<number>(0)
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
      // Schedule chunk to play after the previous one finishes
      const now = ctx.currentTime
      const startAt = Math.max(now, nextPlayTimeRef.current)
      src.start(startAt)
      nextPlayTimeRef.current = startAt + buf.duration
    } catch (e) {
      console.warn('Audio playback:', e)
    }
  }, [initAudio])

  const onMessage = useCallback((msg: WsMessage) => {
    console.log('[ws] received:', msg.type, msg.type === 'audio_chunk' ? '(audio)' : JSON.stringify(msg).slice(0, 200))
    switch (msg.type) {
      case 'session_ready':
        // Reset stale state from previous session
        nextPlayTimeRef.current = 0
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
        setState(s => ({ ...s, transcript: msg.text }))
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
          setState(s => ({
            ...s,
            pins: [...s.pins, pin],
            mapCenter: { lat: msg.lat, lng: msg.lng },
          }))
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
  agentState: AgentState
  transcript: string
  startSpeaking: () => void
  stopSpeaking: () => void
  captureFrame: () => void
}

export function useRemoteWs(
  sessionId: string,
  videoElId = 'camera-preview',
): RemoteState {
  const wsRef = useRef<WebSocket | null>(null)
  // Separate audio contexts: one for mic capture, one for playback
  const micAudioCtxRef = useRef<AudioContext | null>(null)
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const nextPlayTimeRef = useRef<number>(0)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [agentState, setAgentState] = useState<AgentState>('idle')
  const [transcript, setTranscript] = useState('')
  const mountedRef = useRef(true)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cameraStartedRef = useRef(false)

  // Track send stats for debugging
  const sendStatsRef = useRef({ videoFrames: 0, audioFrames: 0, errors: 0 })

  // ── Playback: play Gemini's audio response on the phone speaker ───────────

  const initPlayback = useCallback(() => {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 })
      console.log('[playback] AudioContext created for Gemini audio')
    }
    if (playbackCtxRef.current.state === 'suspended') {
      playbackCtxRef.current.resume()
    }
  }, [])

  const playChunk = useCallback((b64: string) => {
    initPlayback()
    const ctx = playbackCtxRef.current
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
      const now = ctx.currentTime
      const startAt = Math.max(now, nextPlayTimeRef.current)
      src.start(startAt)
      nextPlayTimeRef.current = startAt + buf.duration
    } catch (e) {
      console.warn('[playback] error:', e)
    }
  }, [initPlayback])

  // iOS requires AudioContext creation inside a user gesture.
  // The MicButton's onTouchStart/onMouseDown qualifies as a gesture.
  // We also set up a one-shot listener for any tap on the page.
  useEffect(() => {
    const unlock = () => { initPlayback() }
    document.addEventListener('touchend', unlock, { once: true })
    document.addEventListener('click', unlock, { once: true })
    return () => {
      document.removeEventListener('touchend', unlock)
      document.removeEventListener('click', unlock)
    }
  }, [initPlayback])

  const send = useCallback((msg: object) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg))
        return true
      } catch (e) {
        sendStatsRef.current.errors++
        console.error('[remote-ws] send error:', e)
        return false
      }
    } else {
      console.warn(`[remote-ws] cannot send ${(msg as {type?: string}).type}: ws state=${ws?.readyState}`)
      return false
    }
  }, [])

  // ── Audio: capture mic → raw PCM 16kHz mono → base64 → WebSocket ──────────

  const startSpeaking = useCallback(async () => {
    // Ensure playback context is ready (user gesture unlocks iOS AudioContext)
    initPlayback()
    send({ type: 'user_start_speaking' })
    setIsSpeaking(true)
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[audio] mediaDevices not available (requires HTTPS). Mic disabled.')
        setIsSpeaking(false)
        return
      }
      // iOS ignores sampleRate constraint — we'll resample manually
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      audioStreamRef.current = stream

      // Separate AudioContext for mic capture (don't reuse playback context —
      // closing this one on stopSpeaking would kill playback too)
      const ctx = new AudioContext()
      micAudioCtxRef.current = ctx
      if (ctx.state === 'suspended') await ctx.resume()

      const source = ctx.createMediaStreamSource(stream)
      sourceNodeRef.current = source

      // ScriptProcessorNode to get raw PCM Float32 samples.
      // 4096 buffer = ~85ms at 48kHz — good balance of latency vs overhead.
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      const nativeSampleRate = ctx.sampleRate // 48000 on iOS, varies on desktop
      console.log(`[audio] native sample rate: ${nativeSampleRate}Hz, will resample to 16000Hz`)

      let audioChunkCount = 0
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        // Downsample to 16kHz
        const resampled = downsampleTo16k(input, nativeSampleRate)
        // Convert to 16-bit PCM
        const pcm16 = float32ToInt16(resampled)
        // Encode as base64 (iOS-safe chunked method)
        const b64 = arrayToBase64(new Uint8Array(pcm16.buffer))
        if (send({ type: 'audio_frame', data: b64 })) {
          audioChunkCount++
          sendStatsRef.current.audioFrames++
          if (audioChunkCount % 20 === 1) {
            console.log(`[audio] sent chunk #${audioChunkCount} (${b64.length} chars)`)
          }
        }
      }

      source.connect(processor)
      processor.connect(ctx.destination) // Required for onaudioprocess to fire
      console.log('[audio] mic capture started')
    } catch (e) {
      console.error('[audio] mic access denied:', e)
      setIsSpeaking(false)
    }
  }, [send, initPlayback])

  const stopSpeaking = useCallback(() => {
    console.log(`[audio] mic capture stopped — sent ${sendStatsRef.current.audioFrames} total audio frames`)
    // Disconnect audio processing chain
    processorRef.current?.disconnect()
    sourceNodeRef.current?.disconnect()
    processorRef.current = null
    sourceNodeRef.current = null

    // Stop mic tracks
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
    audioStreamRef.current = null

    // Close mic AudioContext (NOT the playback one — Gemini's response may still be playing)
    micAudioCtxRef.current?.close().catch(() => {})
    micAudioCtxRef.current = null

    setIsSpeaking(false)
    send({ type: 'user_stop_speaking' })
  }, [send])

  // ── Camera: rear camera → 1fps JPEG 768×768 → base64 → WebSocket ─────────

  const startCamera = useCallback(async () => {
    if (cameraStartedRef.current) return // Prevent double-start
    cameraStartedRef.current = true
    console.log('[camera] starting camera capture...')

    try {
      // navigator.mediaDevices requires a secure context (HTTPS or localhost).
      // On plain HTTP over LAN, it will be undefined — gracefully degrade.
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[camera] mediaDevices not available (requires HTTPS). Camera disabled.')
        cameraStartedRef.current = false
        return
      }

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
        if (!navigator.mediaDevices?.getUserMedia) {
          cameraStartedRef.current = false
          return
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 768 }, height: { ideal: 768 } },
          audio: false,
        })
      }
      videoStreamRef.current = stream

      // Use the VISIBLE video element for both preview AND frame capture.
      // iOS Safari does NOT reliably render frames on offscreen/detached video elements.
      const videoEl = document.getElementById(videoElId) as HTMLVideoElement | null
      if (!videoEl) {
        console.error(`[camera] video element #${videoElId} not found in DOM`)
        cameraStartedRef.current = false
        return
      }

      videoEl.srcObject = stream
      videoEl.setAttribute('playsinline', 'true')
      videoEl.setAttribute('webkit-playsinline', 'true')
      videoEl.muted = true

      // Wait for the video to actually have frame data before capturing
      await new Promise<void>((resolve) => {
        const onReady = () => {
          videoEl.removeEventListener('loadedmetadata', onReady)
          resolve()
        }
        // If metadata already loaded (e.g. stream was already active)
        if (videoEl.readyState >= 1) {
          resolve()
        } else {
          videoEl.addEventListener('loadedmetadata', onReady)
        }
      })

      await videoEl.play().catch((e) => console.warn('[camera] play() warning:', e))

      // Double-check we have actual video dimensions
      const checkDimensions = () => new Promise<void>((resolve) => {
        const check = () => {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            resolve()
          } else {
            requestAnimationFrame(check)
          }
        }
        check()
      })
      await checkDimensions()

      setCameraActive(true)
      console.log(`[camera] video ready: ${videoEl.videoWidth}x${videoEl.videoHeight}`)

      // Canvas for frame capture (768×768 square crop)
      const canvas = document.createElement('canvas')
      canvas.width = 768
      canvas.height = 768
      const ctx2d = canvas.getContext('2d')!
      captureCanvasRef.current = canvas

      // Helper: draw current frame to canvas (center-cropped to square)
      const drawFrame = () => {
        const vw = videoEl.videoWidth
        const vh = videoEl.videoHeight
        if (vw === 0 || vh === 0) return false // No frame data yet
        const size = Math.min(vw, vh)
        const sx = (vw - size) / 2
        const sy = (vh - size) / 2
        ctx2d.drawImage(videoEl, sx, sy, size, size, 0, 0, 768, 768)
        return true
      }

      // Stream frames at 1fps (low quality, continuous context for Gemini)
      let frameCount = 0
      frameTimerRef.current = setInterval(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return
        if (!drawFrame()) {
          console.warn('[camera] skipped frame — no video data')
          return
        }
        const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
        // Validate frame isn't too small (< 1KB = likely blank/error)
        if (!b64 || b64.length < 1000) {
          console.warn(`[camera] skipped frame — too small (${b64?.length ?? 0} chars)`)
          return
        }
        if (send({ type: 'video_frame', data: b64 })) {
          frameCount++
          sendStatsRef.current.videoFrames++
          if (frameCount <= 3 || frameCount % 10 === 0) {
            console.log(`[camera] sent frame #${frameCount} (${b64.length} chars)`)
          }
        }
      }, 1000)

      console.log(`[camera] streaming at 1fps`)
    } catch (e) {
      console.error('[camera] access denied:', e)
      cameraStartedRef.current = false
    }
  }, [send, videoElId])

  // ── Capture: high-quality snapshot → Gemini + dashboard ─────────────────────

  const captureFrame = useCallback(() => {
    const canvas = captureCanvasRef.current
    const videoEl = document.getElementById(videoElId) as HTMLVideoElement | null
    if (!canvas || !videoEl) {
      console.warn('[capture] no canvas or video element available')
      return
    }
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    const vw = videoEl.videoWidth
    const vh = videoEl.videoHeight
    if (vw === 0 || vh === 0) {
      console.warn('[capture] video has no frame data')
      return
    }

    // Draw current frame at full quality (center-cropped to square)
    const size = Math.min(vw, vh)
    const sx = (vw - size) / 2
    const sy = (vh - size) / 2
    ctx2d.drawImage(videoEl, sx, sy, size, size, 0, 0, 768, 768)

    // Higher JPEG quality than the 1fps stream (0.92 vs 0.7)
    const b64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1]
    if (b64 && b64.length > 1000) {
      send({ type: 'capture_frame', data: b64 })
      console.log(`[capture] high-quality frame sent (${b64.length} chars)`)
    } else {
      console.warn('[capture] frame too small or empty, not sent')
    }
  }, [send, videoElId])

  // ── WebSocket lifecycle with reconnection ─────────────────────────────────

  useEffect(() => {
    if (!sessionId) return
    mountedRef.current = true

    const connect = () => {
      if (!mountedRef.current) return
      console.log(`[remote-ws] connecting to ${WS_URL}/ws/remote?session_id=${sessionId}`)

      const ws = new WebSocket(`${WS_URL}/ws/remote?session_id=${sessionId}`)
      wsRef.current = ws
      let pingTimer: ReturnType<typeof setInterval>

      ws.onopen = () => {
        if (!mountedRef.current) return
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
          switch (msg.type) {
            case 'audio_chunk':
              // Play Gemini's spoken response on the phone speaker
              playChunk(msg.data)
              break
            case 'agent_state':
              setAgentState(msg.state)
              break
            case 'transcript':
              setTranscript(msg.text)
              break
            case 'error':
              console.error('[remote-ws] server error:', msg.message)
              break
            case 'remote_connected':
              console.log('[remote-ws] server confirmed remote connected')
              break
            case 'pong':
              break
            default:
              console.log('[remote-ws] received:', msg.type)
          }
        } catch {}
      }
      ws.onclose = (e) => {
        console.log(`[remote-ws] disconnected (code=${e.code}, reason=${e.reason})`)
        clearInterval(pingTimer)
        if (mountedRef.current) {
          setIsConnected(false)
          // Auto-reconnect after 2s (unless it was a normal close or session not found)
          if (e.code !== 1000 && e.code !== 4004) {
            console.log('[remote-ws] will reconnect in 2s...')
            reconnectTimerRef.current = setTimeout(connect, 2000)
          }
        }
      }
      ws.onerror = (e) => {
        console.error('[remote-ws] error:', e)
        ws.close()
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (frameTimerRef.current) clearInterval(frameTimerRef.current)
      videoStreamRef.current?.getTracks().forEach(t => t.stop())
      audioStreamRef.current?.getTracks().forEach(t => t.stop())
      processorRef.current?.disconnect()
      sourceNodeRef.current?.disconnect()
      micAudioCtxRef.current?.close().catch(() => {})
      playbackCtxRef.current?.close().catch(() => {})
      wsRef.current?.close()
      cameraStartedRef.current = false
      console.log(`[remote-ws] cleanup — sent ${sendStatsRef.current.videoFrames} video, ${sendStatsRef.current.audioFrames} audio, ${sendStatsRef.current.errors} errors`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  return { isConnected, isSpeaking, cameraActive, agentState, transcript, startSpeaking, stopSpeaking, captureFrame }
}
