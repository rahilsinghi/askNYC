# Sariya — Frontend Engineer

> All frontend revamp: dashboard polish, animations, responsive design, new pages

---

## Task 1: Error Boundaries + Loading States (Hours 0-2)

**Why:** If any component crashes, the entire dashboard dies. Judges will see a white screen.

### 1a. Create Error Boundary

Create `frontend/components/ErrorBoundary.tsx`:
```tsx
'use client'
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false }

  static getDerivedStateFromError() { return { hasError: true } }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full bg-bg text-muted font-mono text-xs">
          <div className="text-center">
            <p className="text-red mb-2">SYSTEM ERROR</p>
            <p>Component failed to render.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-3 py-1 border border-border rounded text-[10px] hover:border-border2"
            >
              RETRY
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

Wrap in `app/dashboard/page.tsx`:
```tsx
<ErrorBoundary>
  <CameraFeed ... />
</ErrorBoundary>
<ErrorBoundary>
  <MiniMap ... />
</ErrorBoundary>
```

### 1b. Loading/Skeleton States

Add a loading shimmer while WebSocket connects:
```tsx
{!ws.isConnected && !isDemo && (
  <div className="animate-pulse bg-surface rounded h-[200px]" />
)}
```

---

## Task 2: Responsive Dashboard — Mobile Sidebar (Hours 2-4)

**Problem:** Sidebar is 200px fixed. On mobile (390px), it takes 51% of the screen.

### Solution: Collapsible sidebar with hamburger menu

Update `Sidebar.tsx`:
- Add state: `const [collapsed, setCollapsed] = useState(false)`
- On mobile (<768px): show hamburger icon, hide sidebar
- When open: overlay sidebar on top of content (z-50)
- Icons-only mode for tablet (768-1024px)

```tsx
// In dashboard/page.tsx
const [sidebarOpen, setSidebarOpen] = useState(false)

<div className="flex h-screen overflow-hidden">
  {/* Mobile hamburger */}
  <button
    className="md:hidden fixed top-2 left-2 z-50 p-2"
    onClick={() => setSidebarOpen(!sidebarOpen)}
  >
    <svg ...>≡</svg>
  </button>

  {/* Sidebar - hidden on mobile unless open */}
  <div className={`${sidebarOpen ? 'fixed inset-0 z-40' : 'hidden'} md:block`}>
    <Sidebar onClose={() => setSidebarOpen(false)} />
  </div>

  {/* Main content */}
  <div className="flex-1 ...">
    ...
  </div>
</div>
```

---

## Task 3: Boot Animation (Hours 4-6)

**Why:** First 10 seconds matter for judges (30% demo score). A system boot sequence creates the "wow."

Create `frontend/components/dashboard/BootSequence.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'

const BOOT_STEPS = [
  { label: 'INITIALIZING SYSTEM', delay: 0 },
  { label: 'CONNECTING TO GEMINI AI', delay: 400 },
  { label: 'LOADING 7 NYC DATASETS', delay: 800 },
  { label: 'ACTIVATING MAPBOX GL', delay: 1200 },
  { label: 'SYSTEM READY', delay: 1600 },
]

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    BOOT_STEPS.forEach((s, i) => {
      setTimeout(() => setStep(i + 1), s.delay)
    })
    setTimeout(onComplete, 2200)
  }, [onComplete])

  return (
    <div className="fixed inset-0 bg-bg z-50 flex items-center justify-center city-grid">
      <div className="w-[400px]">
        <h1 className="font-display text-2xl text-text mb-8 tracking-wider">ASK NYC</h1>
        {BOOT_STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3 mb-2 font-mono text-[10px] tracking-[0.1em]">
            <div className={`w-1.5 h-1.5 rounded-full ${i < step ? 'bg-green' : 'bg-dim'}`} />
            <span className={i < step ? 'text-muted' : 'text-dim'}>{s.label}</span>
            {i < step && <span className="text-green ml-auto">✓</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Use in `dashboard/page.tsx`:
```tsx
const [booted, setBooted] = useState(false)

return (
  <>
    {!booted && <BootSequence onComplete={() => setBooted(true)} />}
    <div className={`flex h-screen ${booted ? '' : 'invisible'}`}>
      ...
    </div>
  </>
)
```

---

## Task 4: Data Card Entrance Animation Upgrade (Hours 6-8)

**Current:** setTimeout DOM manipulation (bypasses React, can cause hydration issues)

**New approach:** Pure CSS with animation-delay:

```tsx
// DataCard.tsx
export default function DataCard({ card, index }: { card: DataCard; index: number }) {
  return (
    <div
      className="slide-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Shimmer bar before content */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border2 to-transparent mb-3" />

      {/* Badge */}
      <div className="..." style={{ background: style.bg, color: style.text }}>
        {card.badge_label}
      </div>

      {/* Title with fade-up */}
      <h3 className="fade-up" style={{ animationDelay: `${index * 80 + 100}ms` }}>
        {card.title}
      </h3>

      {/* Detail with staggered fade */}
      <p className="fade-up" style={{ animationDelay: `${index * 80 + 200}ms` }}>
        {card.detail}
      </p>
    </div>
  )
}
```

---

## Task 5: Sound Design (Hours 8-10)

**Critical for multimodal UX (40% of score).** Subtle audio cues make the system feel alive.

Create `frontend/lib/sounds.ts`:
```typescript
class SoundDesign {
  private ctx: AudioContext | null = null

  private init() {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  // Short beep when tool call starts
  toolCall() {
    const ctx = this.init()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain).connect(ctx.destination)
    osc.frequency.value = 880  // A5
    gain.gain.value = 0.08     // very quiet
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc.stop(ctx.currentTime + 0.08)
  }

  // Rising tone when card appears
  cardReveal() {
    const ctx = this.init()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain).connect(ctx.destination)
    osc.frequency.value = 440
    osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.12)
    gain.gain.value = 0.06
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  }

  // State change tone
  stateChange(state: string) {
    if (state === 'listening') this.toolCall()  // subtle acknowledge
  }
}

export const sounds = new SoundDesign()
```

Wire into WebSocket hook or dashboard page:
```tsx
// When tool_call arrives:
sounds.toolCall()
// When data_card arrives:
sounds.cardReveal()
```

---

## Task 6: Archive Page Fixes (Hours 10-12)

### Fix filter buttons (currently broken):
```tsx
const filtered = sessions.filter(s => {
  const matchesSearch = s.location_name.toLowerCase().includes(search.toLowerCase())
  if (!matchesSearch) return false

  if (filter === 'ALL') return true
  const sessionDate = new Date(s.started_at)
  const now = new Date()
  if (filter === 'TODAY') {
    return sessionDate.toDateString() === now.toDateString()
  }
  if (filter === 'THIS WEEK') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sessionDate >= weekAgo
  }
  return true
})
```

### Make grid responsive:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## Task 7: Insights Page — Basic Stats (Hours 12-14)

Replace placeholder with real session stats:

```tsx
export default function InsightsPage() {
  // Fetch from /sessions API
  const [sessions, setSessions] = useState([])

  return (
    <div className="p-8">
      <h1 className="font-display text-xl mb-6">DATA INSIGHTS</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="TOTAL SESSIONS" value={sessions.length} />
        <StatCard label="DATASETS QUERIED" value={7} />
        <StatCard label="ANOMALIES FOUND" value={anomalyCount} />
        <StatCard label="LOCATIONS SCANNED" value={uniqueLocations} />
      </div>

      {/* Category breakdown - simple bar chart with CSS */}
      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.name} className="flex items-center gap-3">
            <span className="w-24 text-[10px] font-mono text-muted">{c.name}</span>
            <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${c.percentage}%`, background: SOURCE_COLORS[c.key] }}
              />
            </div>
            <span className="w-8 text-right text-[10px] font-mono text-dim">{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Task 8: Camera Permission UI for Remote Page (Hours 14-16)

```tsx
// In remote/page.tsx — handle denied permissions
const [permissionError, setPermissionError] = useState<string | null>(null)

// On getUserMedia failure:
setPermissionError('Camera access denied. Please allow camera and microphone access.')

// Render:
{permissionError && (
  <div className="flex flex-col items-center justify-center h-40 text-center px-6">
    <p className="text-red text-xs font-mono mb-4">{permissionError}</p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 border border-border rounded font-mono text-xs"
    >
      RETRY
    </button>
  </div>
)}
```

---

## Files You Own

| File | Action |
|------|--------|
| `frontend/components/ErrorBoundary.tsx` | CREATE |
| `frontend/components/dashboard/BootSequence.tsx` | CREATE |
| `frontend/lib/sounds.ts` | CREATE |
| `frontend/components/dashboard/Sidebar.tsx` | UPDATE — responsive collapse |
| `frontend/components/dashboard/DataCard.tsx` | UPDATE — CSS animations |
| `frontend/app/dashboard/page.tsx` | UPDATE — error boundaries, boot sequence |
| `frontend/app/archive/page.tsx` | UPDATE — fix filters, responsive grid |
| `frontend/app/insights/page.tsx` | REWRITE — real stats page |
| `frontend/app/remote/page.tsx` | UPDATE — permission error UI |

---

## Definition of Done

- [ ] Error boundary wraps every dashboard section
- [ ] Loading states show while WebSocket connects
- [ ] Sidebar collapses on mobile (<768px)
- [ ] Boot animation plays on first dashboard load
- [ ] Data cards animate in with CSS (no DOM manipulation)
- [ ] Sound effects play on tool calls and card reveals
- [ ] Archive filters work (TODAY, THIS WEEK, ALL)
- [ ] Insights page shows real session stats
- [ ] Remote page handles camera denial gracefully
- [ ] All pages look good on mobile
