'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import SessionCard from '@/components/archive/SessionCard'
import { SessionSummary } from '@/lib/types'

const FILTERS = ['ALL', 'TODAY', 'THIS WEEK'] as const
type Filter = typeof FILTERS[number]

// Demo sessions for when backend has nothing yet
const DEMO_SESSIONS: SessionSummary[] = [
  {
    session_id: 'demo-1',
    location_name: "Joe's Pizza",
    location_address: '7 Carmine St, Manhattan',
    lat: 40.7306, lng: -73.9975,
    started_at: new Date(Date.now() - 7200000).toISOString(),
    ended_at: new Date(Date.now() - 7100000).toISOString(),
    cards: [
      { category: 'health', badge_label: 'HEALTH INSPECTION', title: 'Grade A', detail: 'Last inspected Jan 12, 2024. Zero critical violations.' },
      { category: 'complaints', badge_label: '311 COMPLAINTS', title: '3 Complaints', detail: 'Minor noise complaints in last 90 days.' },
    ],
    datasets_queried: ['health', 'complaints'],
    anomaly_found: false,
  },
  {
    session_id: 'demo-2',
    location_name: 'High Line',
    location_address: 'W 20th St & 10th Ave, Manhattan',
    lat: 40.748, lng: -74.005,
    started_at: new Date(Date.now() - 18000000).toISOString(),
    ended_at: new Date(Date.now() - 17900000).toISOString(),
    cards: [
      { category: 'permits', badge_label: 'DOB PERMITS', title: '2 Active Permits', detail: 'Maintenance and structural work within 300m.' },
      { category: 'nypd', badge_label: 'NYPD INCIDENTS', title: 'Low Activity', detail: '4 incidents in last 180 days, all misdemeanors.' },
    ],
    datasets_queried: ['permits', 'nypd'],
    anomaly_found: false,
  },
  {
    session_id: 'demo-3',
    location_name: '280 Nevins St',
    location_address: 'Boerum Hill, Brooklyn',
    lat: 40.686, lng: -73.985,
    started_at: new Date(Date.now() - 86400000).toISOString(),
    ended_at: new Date(Date.now() - 86300000).toISOString(),
    cards: [
      { category: 'violations', badge_label: 'HPD VIOLATIONS', title: '7 Open Violations', detail: 'Class B: 3, Class C: 2. Two heat violations open >90 days.' },
      { category: 'complaints', badge_label: '311 COMPLAINTS', title: '14 Complaints', detail: 'Heating and hot water complaints dominate last 60 days.' },
    ],
    datasets_queried: ['violations', 'complaints'],
    anomaly_found: true,
  },
]

const STATS = [
  { value: 14, label: 'SESSIONS', sub: 'THIS WEEK' },
  { value: 6,  label: 'DATASETS', sub: 'QUERIED' },
  { value: 847, label: 'DATA POINTS', sub: 'PROCESSED' },
  { value: 3,  label: 'ANOMALIES', sub: 'FOUND' },
]

export default function ArchivePage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Try to fetch real sessions from backend
    fetch(`${process.env.NEXT_PUBLIC_WS_URL?.replace('ws', 'http')}/sessions`)
      .then(r => r.json())
      .then(data => {
        if (data.sessions?.length > 0) {
          setSessions(data.sessions)
        } else {
          setSessions(DEMO_SESSIONS)
        }
      })
      .catch(() => setSessions(DEMO_SESSIONS))
  }, [])

  const filtered = sessions.filter(s =>
    s.location_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="h-[60px] border-b border-border flex items-center px-8 justify-between flex-shrink-0">
          <h1 className="font-display font-bold text-[20px] tracking-[-0.01em] text-[#f4f4f5]">
            ARCHIVES
          </h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search locations..."
              className="w-60 h-9 bg-surface border border-border rounded-md px-3 font-mono font-light text-[11px] text-[#f4f4f5] placeholder:text-muted focus:outline-none focus:border-border2 transition-colors"
            />
            <div className="flex gap-2">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="font-mono text-[9px] tracking-[0.1em] px-3 py-1.5 rounded-[3px] border transition-colors"
                  style={{
                    background: filter === f ? 'rgba(132,204,22,0.12)' : 'var(--surface)',
                    borderColor: filter === f ? 'rgba(132,204,22,0.3)' : 'var(--border)',
                    color: filter === f ? '#84cc16' : 'var(--muted)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-b border-border px-8 py-4 flex items-center gap-8 flex-shrink-0">
          {STATS.map(({ value, label, sub }, i) => (
            <div key={label} className="flex items-center gap-8">
              <div>
                <p className="font-display font-semibold text-[22px] text-[#f4f4f5] leading-none">{value}</p>
                <p className="font-mono font-light text-[8px] tracking-[0.15em] text-muted mt-1">{label} · {sub}</p>
              </div>
              {i < STATS.length - 1 && <div className="w-px h-8 bg-border"/>}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="flex items-end gap-1 mb-4 opacity-20">
                {[40, 80, 60].map((h, i) => (
                  <div key={i} className="w-5 bg-muted rounded-t" style={{ height: h }}/>
                ))}
              </div>
              <p className="font-display font-semibold text-[16px] text-muted">No sessions yet.</p>
              <p className="font-mono font-light text-[11px] text-muted mt-2">
                Start a conversation on the main dashboard.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filtered.map((session) => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  anomaly={session.anomaly_found}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
