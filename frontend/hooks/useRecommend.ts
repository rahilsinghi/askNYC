'use client'

import { useState, useCallback, useRef } from 'react'
import type { AgentStatus, AgentDef, Recommendation, RecommendPhase } from '@/lib/types'

const API_URL = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000').replace(/^ws:/, 'http:').replace(/^wss:/, 'https:')

export interface RecommendState {
  phase: RecommendPhase
  agents: AgentStatus[]
  recommendations: Recommendation[]
  query: string
  parsedLocation: string
  parsedIntent: string
  error: string | null
  queryTimeMs: number | null
}

const INITIAL_STATE: RecommendState = {
  phase: 'idle',
  agents: [],
  recommendations: [],
  query: '',
  parsedLocation: '',
  parsedIntent: '',
  error: null,
  queryTimeMs: null,
}

// ─── Demo Sequences ─────────────────────────────────────────────────────────

interface DemoSequence {
  plan: { location: string; intent: string; agents: AgentDef[] }
  agentResults: Record<string, { summary: string }>
  recommendations: Recommendation[]
}

const FOOD_AGENTS: AgentDef[] = [
  { agent_id: 'geocoding', label: 'Geocoding', icon: 'map-pin' },
  { agent_id: 'restaurant_inspections', label: 'Restaurant Inspections', icon: 'utensils' },
  { agent_id: '311_complaints', label: '311 Complaints', icon: 'alert-triangle' },
  { agent_id: 'nypd_incidents', label: 'NYPD Incidents', icon: 'shield' },
  { agent_id: 'subway_entrances', label: 'Subway Access', icon: 'train' },
  { agent_id: 'synthesis', label: 'Synthesizing', icon: 'sparkles' },
]

const HOUSING_AGENTS: AgentDef[] = [
  { agent_id: 'geocoding', label: 'Geocoding', icon: 'map-pin' },
  { agent_id: 'hpd_violations', label: 'HPD Violations', icon: 'building' },
  { agent_id: 'evictions', label: 'Evictions', icon: 'home' },
  { agent_id: '311_complaints', label: '311 Complaints', icon: 'alert-triangle' },
  { agent_id: 'nypd_incidents', label: 'NYPD Incidents', icon: 'shield' },
  { agent_id: 'subway_entrances', label: 'Subway Access', icon: 'train' },
  { agent_id: 'synthesis', label: 'Synthesizing', icon: 'sparkles' },
]

const CONSTRUCTION_AGENTS: AgentDef[] = [
  { agent_id: 'geocoding', label: 'Geocoding', icon: 'map-pin' },
  { agent_id: 'dob_permits', label: 'DOB Permits', icon: 'hard-hat' },
  { agent_id: '311_complaints', label: '311 Complaints', icon: 'alert-triangle' },
  { agent_id: 'nypd_incidents', label: 'NYPD Incidents', icon: 'shield' },
  { agent_id: 'subway_entrances', label: 'Subway Access', icon: 'train' },
  { agent_id: 'synthesis', label: 'Synthesizing', icon: 'sparkles' },
]

const DEMO_SEQUENCES: Record<string, DemoSequence> = {
  'Best pizza place to eat near Washington Square Park': {
    plan: { location: 'Washington Square Park, NYC', intent: 'food', agents: FOOD_AGENTS },
    agentResults: {
      geocoding: { summary: 'Washington Square Park (40.7308, -73.9973)' },
      restaurant_inspections: { summary: 'Grade A — 8 restaurants found, 6 with Grade A' },
      '311_complaints': { summary: '12 Complaints — Mostly noise and sidewalk obstruction' },
      nypd_incidents: { summary: 'Low Activity — 6 incidents in 180 days' },
      subway_entrances: { summary: '3 Station(s) — W 4 St-Washington Sq (A/B/C/D/E/F/M), 8 St-NYU (N/R/W)' },
      synthesis: { summary: '3 recommendations' },
    },
    recommendations: [
      {
        name: "Joe's Pizza",
        address: '7 Carmine St, New York, NY',
        score: 94,
        score_breakdown: { hygiene: 96, complaints: 88, safety: 93, transit: 95 },
        badges: [{ category: 'health', label: 'Grade A' }, { category: 'safety', label: 'Low Crime' }, { category: 'transit', label: '3 Subway Lines' }],
        reasoning: [
          'Grade A health inspection — zero critical violations since 2019',
          'Only 3 complaints within 300m in 90 days, all noise-related',
          'Low crime area — 6 incidents in 180 days, mostly misdemeanors',
          'Excellent transit access — A/C/E/B/D/F/M lines within 2 blocks',
        ],
        lat: 40.7302, lng: -73.9998,
      },
      {
        name: "Arturo's Coal Oven Pizza",
        address: '106 W Houston St, New York, NY',
        score: 87,
        score_breakdown: { hygiene: 90, complaints: 82, safety: 88, transit: 92 },
        badges: [{ category: 'health', label: 'Grade A' }, { category: 'complaints', label: '5 Nearby' }],
        reasoning: [
          'Grade A restaurant — consistent clean inspections over 3 years',
          'Moderate complaint activity on Houston St corridor (5 in 90 days)',
          'Safe area with good foot traffic deterring incidents',
        ],
        lat: 40.7275, lng: -74.0006,
      },
      {
        name: 'Bleecker Street Pizza',
        address: '69 7th Ave S, New York, NY',
        score: 83,
        score_breakdown: { hygiene: 85, complaints: 78, safety: 87, transit: 90 },
        badges: [{ category: 'health', label: 'Grade A' }, { category: 'transit', label: 'Near Subway' }],
        reasoning: [
          'Grade A with minor non-critical violations (signage)',
          'Higher foot traffic area leads to more complaints (8 in 90 days)',
          'Steps from Christopher St-Sheridan Sq station (1/2 lines)',
        ],
        lat: 40.7330, lng: -74.0027,
      },
    ],
  },
  'Safest neighborhood to move to in Brooklyn near a subway': {
    plan: { location: 'Brooklyn, NYC', intent: 'housing', agents: HOUSING_AGENTS },
    agentResults: {
      geocoding: { summary: 'Brooklyn, NY (40.6782, -73.9442)' },
      hpd_violations: { summary: '23 Open Violations — 8 Class A, 10 Class B, 5 Class C' },
      evictions: { summary: '4 Evictions — 3 residential in past year' },
      '311_complaints': { summary: '34 Complaints — Heat/hot water, noise, rodents' },
      nypd_incidents: { summary: 'Moderate Activity — 18 incidents in 180 days' },
      subway_entrances: { summary: '4 Station(s) — Multiple lines accessible' },
      synthesis: { summary: '3 recommendations' },
    },
    recommendations: [
      {
        name: 'Park Slope',
        address: 'Park Slope, Brooklyn, NY',
        score: 91,
        score_breakdown: { housing: 92, safety: 94, complaints: 87, transit: 90 },
        badges: [{ category: 'safety', label: 'Very Low Crime' }, { category: 'transit', label: 'F/G/R Lines' }, { category: 'health', label: 'Family-Friendly' }],
        reasoning: [
          'Among the lowest crime rates in Brooklyn — 4 incidents per 180 days',
          'Few HPD violations relative to housing stock, mostly Class A (minor)',
          'Excellent subway access via F/G at 7th Ave and R at Union St/9th St',
          'Low eviction rate indicating stable rental market',
        ],
        lat: 40.6710, lng: -73.9812,
      },
      {
        name: 'Brooklyn Heights',
        address: 'Brooklyn Heights, Brooklyn, NY',
        score: 88,
        score_breakdown: { housing: 88, safety: 92, complaints: 85, transit: 94 },
        badges: [{ category: 'safety', label: 'Low Crime' }, { category: 'transit', label: '8+ Lines' }],
        reasoning: [
          'Historic district with well-maintained housing stock',
          'Excellent transit hub at Borough Hall (2/3/4/5/R/A/C/F)',
          'Low crime with strong community policing presence',
        ],
        lat: 40.6961, lng: -73.9936,
      },
    ],
  },
  "What's happening with construction around Hudson Yards": {
    plan: { location: 'Hudson Yards, NYC', intent: 'construction', agents: CONSTRUCTION_AGENTS },
    agentResults: {
      geocoding: { summary: 'Hudson Yards, Manhattan (40.7539, -74.0018)' },
      dob_permits: { summary: '47 Active Permits — NB, A1, DM types' },
      '311_complaints': { summary: '28 Complaints — Construction noise, dust, blocked sidewalks' },
      nypd_incidents: { summary: 'Low Activity — 5 incidents in 180 days' },
      subway_entrances: { summary: '2 Station(s) — 34 St-Hudson Yards (7), 34 St-Penn Station' },
      synthesis: { summary: '2 recommendations' },
    },
    recommendations: [
      {
        name: 'Hudson Yards Eastern Rail Yard',
        address: '20 Hudson Yards, New York, NY',
        score: 78,
        score_breakdown: { construction: 95, complaints: 62, safety: 88, transit: 85 },
        badges: [{ category: 'permits', label: '47 Active Permits' }, { category: 'complaints', label: 'High Noise' }],
        reasoning: [
          '47 active DOB permits — massive ongoing development including residential towers',
          '28 complaints in 90 days, primarily construction noise and blocked sidewalks',
          'Despite heavy construction, area remains safe with only 5 incidents in 180 days',
          '7 train provides direct access, Penn Station complex nearby',
        ],
        lat: 40.7539, lng: -74.0018,
      },
    ],
  },
  'Late night food options near Times Square that are clean': {
    plan: { location: 'Times Square, NYC', intent: 'food', agents: FOOD_AGENTS },
    agentResults: {
      geocoding: { summary: 'Times Square, Manhattan (40.7580, -73.9855)' },
      restaurant_inspections: { summary: 'Grade A — 15 restaurants found in radius' },
      '311_complaints': { summary: '45 Complaints — Noise, vendor, sanitation' },
      nypd_incidents: { summary: 'Moderate Activity — 22 incidents in 180 days' },
      subway_entrances: { summary: '5 Station(s) — Times Sq-42 St (1/2/3/7/N/Q/R/W/S), 42 St-Bryant Park' },
      synthesis: { summary: '3 recommendations' },
    },
    recommendations: [
      {
        name: 'Los Tacos No. 1',
        address: '229 W 43rd St, New York, NY',
        score: 89,
        score_breakdown: { hygiene: 94, complaints: 75, safety: 80, transit: 98 },
        badges: [{ category: 'health', label: 'Grade A' }, { category: 'transit', label: 'Times Sq Hub' }],
        reasoning: [
          'Spotless Grade A inspection record — zero critical violations',
          'Open late, located in Times Square with maximum transit connectivity',
          'Higher area complaint volume is typical for Times Square, not restaurant-specific',
        ],
        lat: 40.7573, lng: -73.9876,
      },
      {
        name: "Joe's Pizza Times Square",
        address: '1435 Broadway, New York, NY',
        score: 85,
        score_breakdown: { hygiene: 90, complaints: 72, safety: 78, transit: 96 },
        badges: [{ category: 'health', label: 'Grade A' }, { category: 'safety', label: 'Well-Lit Area' }],
        reasoning: [
          'Grade A — consistent inspections, open until 4 AM',
          'Busiest pedestrian area provides natural safety through foot traffic',
          'Direct access to every major subway line at Times Square station',
        ],
        lat: 40.7562, lng: -73.9867,
      },
    ],
  },
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useRecommend() {
  const [state, setState] = useState<RecommendState>(INITIAL_STATE)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(INITIAL_STATE)
  }, [])

  const _runDemo = useCallback((query: string) => {
    const demo = DEMO_SEQUENCES[query]
    if (!demo) return false

    setState({ ...INITIAL_STATE, phase: 'planning', query })

    const agents: AgentStatus[] = demo.plan.agents.map(a => ({ ...a, status: 'pending' as const }))

    // Plan event
    setTimeout(() => {
      setState(s => ({
        ...s,
        phase: 'agents',
        agents,
        parsedLocation: demo.plan.location,
        parsedIntent: demo.plan.intent,
      }))
    }, 400)

    // Stagger agent completions
    const agentIds = demo.plan.agents.map(a => a.agent_id)
    agentIds.forEach((id, i) => {
      const runDelay = 600 + i * 350
      const completeDelay = runDelay + 400 + Math.random() * 600

      // Running
      setTimeout(() => {
        setState(s => ({
          ...s,
          agents: s.agents.map(a => a.agent_id === id ? { ...a, status: 'running' } : a),
        }))
      }, runDelay)

      // Complete (synthesis gets "synthesizing" phase)
      setTimeout(() => {
        const isSynthesis = id === 'synthesis'
        setState(s => ({
          ...s,
          phase: isSynthesis ? 'synthesizing' : s.phase,
          agents: s.agents.map(a =>
            a.agent_id === id
              ? { ...a, status: 'complete', summary: demo.agentResults[id]?.summary }
              : a
          ),
        }))
      }, completeDelay)
    })

    // Recommendations
    const totalTime = 600 + agentIds.length * 350 + 1200
    demo.recommendations.forEach((rec, i) => {
      setTimeout(() => {
        setState(s => ({
          ...s,
          phase: 'complete',
          recommendations: [...s.recommendations, rec],
          queryTimeMs: totalTime + i * 300,
        }))
      }, totalTime + i * 400)
    })

    return true
  }, [])

  const submit = useCallback(async (query: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ ...INITIAL_STATE, phase: 'planning', query })

    try {
      const res = await fetch(`${API_URL}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        // Try demo fallback
        if (_runDemo(query)) return
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6))
              _handleEvent(currentEvent, data)
            } catch {
              // skip malformed JSON
            }
            currentEvent = ''
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      // Try demo fallback on network error
      if (_runDemo(query)) return
      setState(s => ({ ...s, phase: 'idle', error: String(err) }))
    }
  }, [_runDemo])

  const _handleEvent = useCallback((event: string, data: Record<string, unknown>) => {
    switch (event) {
      case 'plan':
        setState(s => ({
          ...s,
          phase: 'agents',
          parsedLocation: data.parsed_location as string || '',
          parsedIntent: data.parsed_intent as string || '',
          agents: (data.agents as AgentDef[]).map(a => ({ ...a, status: 'pending' as const })),
        }))
        break

      case 'agent_update': {
        const id = data.agent_id as string
        const status = data.status as AgentStatus['status']
        const isSynthesisRunning = id === 'synthesis' && status === 'running'
        setState(s => ({
          ...s,
          phase: isSynthesisRunning ? 'synthesizing' : s.phase,
          agents: s.agents.map(a =>
            a.agent_id === id
              ? { ...a, status, summary: (data.summary as string) || a.summary }
              : a
          ),
        }))
        break
      }

      case 'recommendation':
        setState(s => ({
          ...s,
          phase: 'complete',
          recommendations: [...s.recommendations, data as unknown as Recommendation],
        }))
        break

      case 'complete':
        setState(s => ({
          ...s,
          phase: 'complete',
          queryTimeMs: data.query_time_ms as number || null,
        }))
        break

      case 'error':
        setState(s => ({
          ...s,
          phase: 'idle',
          error: data.message as string || 'Unknown error',
        }))
        break
    }
  }, [])

  return { ...state, submit, reset }
}
