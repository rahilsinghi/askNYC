'use client'

import { useState, useEffect, useCallback } from 'react'
import { DataCard, AgentState, ToolCall } from '@/lib/types'

// Pre-built demo sequences for each scenario card.
// Use this when backend is unavailable or for dry runs.

const DEMO_SEQUENCE_RESTAURANT: DataCard[] = [
  {
    category: 'health',
    badge_label: 'HEALTH INSPECTION',
    title: 'Grade A',
    detail: "Last inspected Jan 12, 2024. Zero critical violations found. Clean since 2019.",
  },
  {
    category: 'complaints',
    badge_label: '311 COMPLAINTS',
    title: '3 Complaints',
    detail: "3 noise complaints within 300m in the last 90 days. All filed between 11pm–2am weekends. Consistent with bar activity nearby.",
  },
  {
    category: 'permits',
    badge_label: 'DOB PERMITS',
    title: '1 Active Permit',
    detail: "Minor alteration permit for interior work filed March 2024. Expires September 2024. Owner: West Village Properties LLC.",
  },
]

const DEMO_SEQUENCE_BUILDING: DataCard[] = [
  {
    category: 'violations',
    badge_label: 'HPD VIOLATIONS',
    title: '7 Open Violations',
    detail: "Class B: 3, Class C: 2, Class A: 2. Two heat violations open since October 2023 — 14 months unresolved. Top 1% slowest in Brooklyn.",
  },
  {
    category: 'complaints',
    badge_label: '311 COMPLAINTS',
    title: '14 Complaints',
    detail: "Heating and hot water complaints dominate — 9 of 14 in the last 60 days. Pattern suggests systemic boiler issue.",
  },
  {
    category: 'nypd',
    badge_label: 'NYPD INCIDENTS',
    title: 'Low Activity',
    detail: "6 incidents within 400m in last 180 days. 5 misdemeanors, 1 felony (grand larceny, unrelated to building). Safe block overall.",
  },
]

const DEMO_SEQUENCE_CONSTRUCTION: DataCard[] = [
  {
    category: 'permits',
    badge_label: 'DOB PERMITS',
    title: '3 Active Permits',
    detail: "New building — 14-story residential. Filed January 2024, runs through October 2025. Owner: Fulton Street Development LLC. Work type: NB (New Building).",
  },
  {
    category: 'complaints',
    badge_label: '311 COMPLAINTS',
    title: '31 Complaints',
    detail: "31 noise complaints in the last 30 days, 19 filed between 7–9am. Consistent with early construction schedule. All from addresses within 150m.",
  },
]

type DemoScenario = 'restaurant' | 'building' | 'construction'

const SEQUENCES: Record<DemoScenario, DataCard[]> = {
  restaurant: DEMO_SEQUENCE_RESTAURANT,
  building: DEMO_SEQUENCE_BUILDING,
  construction: DEMO_SEQUENCE_CONSTRUCTION,
}

const TRANSCRIPTS: Record<DemoScenario, string[]> = {
  restaurant: [
    "I can see Joe's Pizza on Carmine Street. Let me pull their inspection history...",
    "Grade A — zero critical violations. Last inspected January 2024. One of the cleaner records in the Village.",
    "Three noise complaints nearby, all weekend nights — that's the bar two doors down, not the restaurant.",
  ],
  building: [
    "Looking at this residential building on Nevins Street, Brooklyn...",
    "Seven open HPD violations. Two of them are heat violations filed October 2023 — that's 14 months unresolved. This is unusual.",
    "14 complaints in 60 days, mostly heating and hot water. This pattern suggests a systemic boiler problem, not isolated incidents.",
  ],
  construction: [
    "That's an active construction site — a new 14-story residential building...",
    "Three active DOB permits, new building filing from January. Runs until October 2025, so you're looking at another 18 months of this.",
    "31 noise complaints in 30 days — 19 between 7 and 9am. If you're living nearby, early mornings are the problem window.",
  ],
}

interface DemoModeReturn {
  cards: DataCard[]
  transcript: string
  agentState: AgentState
  toolCalls: ToolCall[]
  mapCenter: { lat: number, lng: number } | null
  runDemo: (scenario: DemoScenario) => void
  reset: () => void
}

export function useDemoMode(): DemoModeReturn {
  const [cards, setCards] = useState<DataCard[]>([])
  const [transcript, setTranscript] = useState('')
  const [agentState, setAgentState] = useState<AgentState>('idle')
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null)

  const reset = useCallback(() => {
    setCards([])
    setTranscript('')
    setAgentState('idle')
    setToolCalls([])
    setMapCenter(null)
  }, [])

  const runDemo = useCallback((scenario: DemoScenario) => {
    reset()
    const sequence = SEQUENCES[scenario]
    const transcripts = TRANSCRIPTS[scenario]

    setAgentState('listening')

    // Step 1: listening → processing
    setTimeout(() => {
      setAgentState('processing')
    }, 800)

    // Step 2: show tool calls firing
    setTimeout(() => {
      const toolNames = ['query_restaurant_inspections', 'query_311_complaints', 'query_dob_permits']
      toolNames.slice(0, sequence.length).forEach((tool, i) => {
        setTimeout(() => {
          setToolCalls(prev => [...prev, { tool, status: 'pending', timestamp: Date.now() }])
        }, i * 300)
      })
    }, 1200)

    // Step 3: start speaking + first transcript
    setTimeout(() => {
      setAgentState('speaking')
      setTranscript(transcripts[0])
      // Set map center for focus mode
      if (scenario === 'restaurant') setMapCenter({ lat: 40.7308, lng: -73.9973 })
      else if (scenario === 'building') setMapCenter({ lat: 40.6841, lng: -73.9822 })
      else if (scenario === 'construction') setMapCenter({ lat: 40.7061, lng: -73.9969 })
    }, 2000)

    // Step 4: cards arrive one by one
    sequence.forEach((card, i) => {
      setTimeout(() => {
        setCards(prev => [card, ...prev])
        setToolCalls(prev => prev.map((tc, idx) =>
          idx === i ? { ...tc, status: 'complete' } : tc
        ))
        if (transcripts[i + 1]) setTranscript(transcripts[i + 1])
      }, 2500 + i * 1800)
    })

    // Step 5: done
    setTimeout(() => {
      setAgentState('idle')
      setTranscript(transcripts[transcripts.length - 1])
    }, 2500 + sequence.length * 1800 + 1000)
  }, [reset])

  return { cards, transcript, agentState, toolCalls, mapCenter, runDemo, reset }
}
