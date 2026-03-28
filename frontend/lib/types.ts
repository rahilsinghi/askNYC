// Ask NYC — Shared TypeScript Types
// All WebSocket message types and UI state interfaces

// ─── WebSocket Messages (Backend → Dashboard) ────────────────────────────────

export type AgentState = 'idle' | 'listening' | 'processing' | 'speaking'

export type DataCategory =
  | 'health'
  | 'safety'
  | 'permits'
  | 'complaints'
  | 'nypd'
  | 'violations'
  | 'evictions'
  | 'transit'

export interface DataCard {
  category: DataCategory
  badge_label: string  // e.g. "HEALTH INSPECTION"
  title: string        // e.g. "Grade A"
  detail: string       // e.g. "Last inspected Jan 12, 2024."
  source_url?: string
}

export type WsMessage =
  | { type: 'session_ready'; session_id: string; remote_url: string }
  | { type: 'audio_chunk'; data: string }
  | { type: 'transcript'; text: string; speaker: 'agent' | 'user'; partial: boolean }
  | { type: 'tool_call'; tool: string; status: 'pending' | 'complete' | 'error'; result_count?: number }
  | { type: 'data_card'; card: DataCard }
  | { type: 'map_event'; event: 'pin' | 'zoom' | 'circle' | 'clear'; lat: number; lng: number; source: string; label?: string }
  | { type: 'detection'; label: string; confidence: number; box?: number[] }
  | { type: 'agent_state'; state: AgentState }
  | { type: 'session_complete'; session: SessionSummary }
  | { type: 'captured_image'; data: string }
  | { type: 'remote_connected' }
  | { type: 'remote_disconnected' }
  | { type: 'pong' }

// ─── WebSocket Messages (Remote → Backend) ───────────────────────────────────

export type RemoteMessage =
  | { type: 'video_frame'; data: string }
  | { type: 'audio_frame'; data: string }
  | { type: 'capture_frame'; data: string }
  | { type: 'user_start_speaking' }
  | { type: 'user_stop_speaking' }
  | { type: 'ping' }

// ─── Session ─────────────────────────────────────────────────────────────────

export interface SessionSummary {
  session_id: string
  location_name: string
  location_address?: string
  lat?: number
  lng?: number
  started_at: string
  ended_at?: string
  cards: DataCard[]
  datasets_queried: string[]
  anomaly_found: boolean
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export interface MapPin {
  id: string
  lat: number
  lng: number
  source: string
  label?: string
  timestamp: number
}

// ─── Tool call (for badge animation) ─────────────────────────────────────────

export interface ToolCall {
  tool: string
  status: 'pending' | 'complete' | 'error'
  timestamp: number
}

// ─── Design system ────────────────────────────────────────────────────────────

export const SOURCE_COLORS: Record<string, string> = {
  health: '#84cc16',
  permits: '#3b82f6',
  complaints: '#f59e0b',
  violations: '#f59e0b',
  nypd: '#ef4444',
  evictions: '#a855f7',
  transit: '#06b6d4',
  center: '#84cc16',
  safety: '#3b82f6',
}

export const BADGE_STYLES: Record<DataCategory, { bg: string; text: string }> = {
  health: { bg: 'rgba(132,204,22,0.12)', text: '#84cc16' },
  safety: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  permits: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  complaints: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  violations: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  nypd: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  evictions: { bg: 'rgba(168,85,247,0.12)', text: '#a855f7' },
  transit: { bg: 'rgba(6,182,212,0.12)', text: '#06b6d4' },
}
