# Ask NYC — CLAUDE.md

> This file is the canonical context document for Claude Code.  
> Read it in full before touching any file. Every architectural decision is documented here.

---

## What This Is

**Ask NYC** is a voice + camera AI agent that answers questions about NYC locations in real time.

The user points their phone camera at a restaurant, building, or street corner. They speak a question. Gemini Live identifies what it sees in the camera frame, queries 7 NYC Open Data datasets via the Socrata API, and speaks a natural-language answer while the dashboard animates with data cards and map pins.

This is a **2-day hackathon build** for the NYC Build With AI Hackathon @ NYU Tandon (GDG NYC, part of NYC Open Data Week). Prizes: Google I/O tickets + private pitch with Google AI Futures Fund.

**Judging criteria:**
1. Innovation & Multimodal UX (40%) — must break the "text box" paradigm
2. Technical Implementation (30%) — real ADK usage, Google Cloud deployment
3. Demo & Presentation (30%) — self-contained, wow in <60 seconds

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                     │
│                                                             │
│  /dashboard    Main screen (camera+map+brief) ──────────┐  │
│  /remote       Phone page (camera+mic)         ─────┐   │  │
│  /archive      Session history                      │   │  │
│  /             Splash / onboarding                  │   │  │
└─────────────────────────────────────────────────────────────┘
         ▲ WebSocket (audio + map events)      │   │
         │                                     │   │
┌────────┴────────────────────────────────────▼───▼──────────┐
│                   BACKEND (FastAPI, Python)                  │
│                                                             │
│  /ws/dashboard   Dashboard WebSocket (receives events)      │
│  /ws/remote      Remote WebSocket (receives audio+video)    │
│  /sessions       REST: GET session history                  │
│                                                             │
│  GeminiService   ─── ADK agent + Gemini Live session        │
│  SocrataService  ─── 7 NYC Open Data tool functions         │
│  GeocodingService ── Google Maps lat/lng lookup             │
│  SessionService  ─── In-memory session store                │
└─────────────────────────────────────────────────────────────┘
         │ tool calls (SoQL queries, ~500ms each)
         ▼
┌─────────────────────────────────────────────────────────────┐
│              NYC OPEN DATA (Socrata API)                     │
│  311 complaints · DOB permits · Restaurant inspections      │
│  HPD violations · NYPD incidents · Evictions · Subway       │
│  — Free, no auth required, JSON, queryable by lat/lng —     │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow (critical — understand this before writing code)

1. **Phone** opens `/remote` → establishes WebSocket to `/ws/remote`
2. **Phone** captures camera frames (JPEG, 1fps) + mic audio (PCM 16kHz) → sends over WS
3. **Backend** `RemoteHandler` receives frames/audio → relays into `GeminiService.live_queue`
4. **Gemini Live** sees the video frame, hears the voice question, decides which tools to call
5. **ADK tool function** executes (e.g., `query_restaurant_inspections("Joe's Pizza")`)
6. **Tool** queries Socrata API → returns structured JSON
7. **ADK** returns tool results to Gemini → Gemini synthesizes response
8. **Backend** receives: agent audio chunks + tool call events
9. **Backend** pushes to `/ws/dashboard`:
   - `{type: "audio_chunk"}` → dashboard plays agent voice
   - `{type: "data_card"}` → dashboard animates new card into brief
   - `{type: "map_event"}` → dashboard drops pin on map
   - `{type: "tool_call"}` → dashboard shows tool badge animation
   - `{type: "detection"}` → dashboard shows bounding box label
   - `{type: "agent_state"}` → waveform animation state
10. **Session** saved to in-memory store on conversation end

---

## Project Structure

```
ask-nyc/
├── CLAUDE.md                    ← you are here
├── PROJECT.md                   ← full setup guide
├── frontend/                    ← Next.js 15 + TypeScript
│   ├── app/
│   │   ├── page.tsx             ← splash/onboarding
│   │   ├── dashboard/page.tsx   ← main dashboard
│   │   ├── remote/page.tsx      ← phone remote
│   │   └── archive/page.tsx     ← session history
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── CameraFeed.tsx
│   │   │   ├── MiniMap.tsx
│   │   │   ├── IntelligenceBrief.tsx
│   │   │   ├── DataCard.tsx
│   │   │   └── Waveform.tsx
│   │   ├── remote/
│   │   │   └── MicButton.tsx
│   │   └── archive/
│   │       └── SessionCard.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts      ← WS connection + reconnect
│   │   ├── useAudioPlayer.ts    ← plays agent audio chunks
│   │   └── useCameraCapture.ts  ← getUserMedia + frame capture
│   ├── lib/
│   │   ├── types.ts             ← all shared TypeScript types
│   │   └── constants.ts         ← WS_URL, colors, dataset IDs
│   └── package.json
├── backend/
│   ├── main.py                  ← FastAPI app entry
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   ├── routers/
│   │   └── ws.py                ← WebSocket endpoints
│   ├── services/
│   │   ├── gemini_service.py    ← ADK agent + Gemini Live
│   │   ├── socrata_service.py   ← 7 NYC Open Data tools
│   │   ├── geocoding_service.py ← Google Maps geocoding
│   │   └── session_service.py   ← in-memory session store
│   └── models/
│       └── schemas.py           ← Pydantic models
└── docs/
    ├── STITCH_PROMPT.md         ← design system + screen specs
    └── DATA_SOURCES.md          ← Socrata API reference
```

---

## WebSocket Message Protocol

All messages are JSON. Every message has a `type` field.

### Dashboard ← Backend (events TO the frontend)

```typescript
// Agent speaking
{ type: "audio_chunk", data: string }  // base64 PCM 24kHz

// Live transcript (word by word)
{ type: "transcript", text: string, speaker: "agent" | "user", partial: boolean }

// Tool call started
{ type: "tool_call", tool: string, status: "pending" | "complete" | "error" }

// New data card to render
{ type: "data_card", category: "health" | "safety" | "permits" | "complaints" | "nypd" | "evictions" | "transit", data: DataCard }

// Map pin to drop
{ type: "map_event", event: "pin" | "zoom" | "circle", lat: number, lng: number, source: string, label?: string }

// Camera detection result
{ type: "detection", label: string, confidence: number, bbox?: BBox }

// Agent state (drives waveform animation)
{ type: "agent_state", state: "idle" | "listening" | "processing" | "speaking" }

// Session complete
{ type: "session_complete", session_id: string, summary: SessionSummary }
```

### Backend ← Remote (events FROM the phone)

```typescript
// Camera frame (1fps)
{ type: "video_frame", data: string }  // base64 JPEG

// Audio chunk (continuous)  
{ type: "audio_frame", data: string }  // base64 PCM 16kHz mono

// User pressed mic button
{ type: "user_start_speaking" }
{ type: "user_stop_speaking" }

// Remote connected
{ type: "remote_ready", session_id: string }
```

---

## Socrata API — Exact Endpoints

All free, no authentication required for <1000 rows. Base URL: `https://data.cityofnewyork.us`

| Dataset | Endpoint | Key fields |
|---------|----------|------------|
| 311 Service Requests | `/resource/erm2-nwe9.json` | `created_date`, `complaint_type`, `descriptor`, `latitude`, `longitude`, `status` |
| Restaurant Inspections | `/resource/43nn-pn8j.json` | `dba`, `grade`, `inspection_date`, `violation_description`, `latitude`, `longitude` |
| DOB Permit Issuance | `/resource/ipu4-2q9a.json` | `job_type`, `work_type`, `filing_date`, `expiration_date`, `latitude`, `longitude` |
| HPD Violations | `/resource/wvxf-dwi5.json` | `novdescription`, `class`, `ordernumber`, `inspectiondate`, `latitude`, `longitude` |
| NYPD Complaint Data YTD | `/resource/5uac-w243.json` | `ofns_desc`, `law_cat_cd`, `cmplnt_fr_dt`, `latitude`, `longitude` |
| Evictions | `/resource/6z8x-wfk4.json` | `eviction_zip`, `executed_date`, `residential_commercial` |
| Subway Entrances | `data.ny.gov/resource/i9wp-a4ja.json` | `station_name`, `route_1`–`route_11`, `entrance_georeference` |

**Standard query pattern:**
```
GET /resource/{endpoint}.json
  ?$where=within_circle(the_geom,{lat},{lng},{radius_meters})
  &$where=created_date>'{ISO_date}'
  &$limit=50
  &$order=created_date DESC
```

**Restaurant lookup by name:**
```
GET /resource/43nn-pn8j.json
  ?$where=upper(dba) like upper('%{name}%')
  &$order=inspection_date DESC
  &$limit=10
```

---

## ADK Multi-Agent Architecture

Root coordinator + 5 specialist sub-agents. ADK `Runner.run_live()` handles tool execution automatically.

```python
# Root agent (coordinates, geocodes, searches web, drops map pins)
root_agent.tools = [geocode_location, push_map_event, google_search]
root_agent.sub_agents = [FoodSafetyExpert, HousingExpert, SafetyExpert, ConstructionExpert, TransitExpert]

# Sub-agent tool assignments:
FoodSafetyExpert.tools = [query_restaurant_inspections, query_311_complaints]
HousingExpert.tools = [query_hpd_violations, query_evictions, query_311_complaints]
SafetyExpert.tools = [query_nypd_incidents]
ConstructionExpert.tools = [query_dob_permits, query_311_complaints]
TransitExpert.tools = [query_subway_entrances]
```

The `push_map_event` tool is special — it doesn't query external APIs. It fires a WebSocket message to the dashboard, causing a map pin to appear. The agent calls it after receiving data to make the visualization update.

---

## Agent System Prompts

All prompts are defined in `backend/services/gemini_service.py`. Key prompts:

- **ROOT_PROMPT** — Root coordinator persona (knowledgeable NYC local), camera workflow, delegation rules
- **FOOD_SAFETY_PROMPT** — Restaurant inspections + 311 food complaints
- **HOUSING_PROMPT** — HPD violations, evictions, building condition complaints
- **SAFETY_PROMPT** — NYPD incidents, felony/misdemeanor breakdown
- **CONSTRUCTION_PROMPT** — DOB permits, noise complaints
- **TRANSIT_PROMPT** — Subway entrances, train line access

**Delegation rules** (root agent decides which sub-agent to call):
- "Is this safe to eat?" → FoodSafetyExpert
- "Is this safe at night?" → SafetyExpert
- "Should I live here?" → HousingExpert + TransitExpert
- "What's being built?" → ConstructionExpert
- "What trains are nearby?" → TransitExpert
- General questions → Google Search + own knowledge

**Model:** `gemini-2.5-flash-native-audio-latest` (all agents — stable live audio model; gemini-3.1-flash-live-preview exists but is unstable in preview)

---

## Environment Variables

```bash
# Backend
GOOGLE_GEMINI_API_KEY=       # Gemini API key (Google AI Studio) — aliased to GOOGLE_API_KEY at runtime
GOOGLE_GENAI_USE_VERTEXAI=   # Set to TRUE for Vertex AI (Cloud Run)
GOOGLE_CLOUD_PROJECT=        # GCP project ID (for Vertex AI)
GOOGLE_CLOUD_LOCATION=       # GCP region (for Vertex AI)
GOOGLE_MAPS_API_KEY=         # Google Maps Geocoding API
SOCRATA_APP_TOKEN=           # Optional: increases rate limits
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app

# Frontend
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=    # Mapbox GL JS (free tier sufficient)
```

---

## Key Implementation Rules

### DO
- Stream audio from Gemini Live as it arrives — don't buffer, don't wait for completion
- Call Socrata with `$limit=50` always — we never need more than 50 results
- Geocode once per session, cache the lat/lng for subsequent tool calls
- Use asyncio.gather() to run multiple Socrata queries in parallel
- Push `{type: "tool_call", status: "pending"}` immediately when a tool fires, then `"complete"` when it returns
- Use `within_circle(the_geom, lat, lng, meters)` SoQL for all radius-based queries
- For restaurant lookups, search by name first, fall back to radius if no results

### DON'T
- Don't store any user data beyond the current session in-memory store
- Don't call Socrata with `$limit` > 1000 — it will timeout
- Don't import or use pandas, numpy, or any data science library — pure requests only
- Don't use SQLite or any persistent database — sessions are in-memory only
- Don't buffer more than 100ms of audio before forwarding to Gemini Live
- Don't block the WebSocket receive loop — use asyncio properly

### State machine (agent_state)
```
idle → listening (user presses mic)
listening → processing (user releases mic or VAD detects speech end)
processing → speaking (Gemini begins streaming response)
speaking → idle (response complete)
```

---

## Demo Scenario Cards

Pre-built demo scenarios with known data. Prepare physical printed cards (A4, street-view photos).

**Card 1 — The Restaurant (health story):**
Joe's Pizza, 7 Carmine St, Manhattan
Expected: Grade A, clean record. Contrast with a nearby restaurant that has violations.
Query: restaurant inspections + 311 complaints

**Card 2 — The Apartment Building (housing story):**
Target: a building in Brooklyn with open HPD violations
Search HPD violations data for a building with ≥3 open class B/C violations
Query: HPD violations + evictions

**Card 3 — The Construction Site (permits story):**
Target: active construction site near NYU Tandon (Jay St area)
Query: DOB permits + 311 noise complaints from nearby residents

Run these queries manually before the demo. Know the answers. The "surprise" is always real data.

---

## Build Priority Order

1. Backend WebSocket skeleton (ws.py + main.py) — must work before anything else
2. Socrata service (socrata_service.py) — test each endpoint manually
3. Gemini Live session (gemini_service.py) — audio in, audio out working
4. Frontend WebSocket hooks (useWebSocket.ts, useAudioPlayer.ts)
5. Dashboard UI (CameraFeed.tsx, IntelligenceBrief.tsx, DataCard.tsx)
6. Tool call → card animation pipeline (the core experience)
7. Phone remote page (remote/page.tsx)
8. Map pins (MiniMap.tsx) — nice to have, do last

**Hackathon minimum viable demo:** Items 1–6 working. The rest is polish.

---

## Common Failure Modes (from past hackathons)

1. **Audio latency** — If audio chunks are buffered server-side before sending, the voice feels laggy. Stream immediately.
2. **CORS** — FastAPI needs `allow_origins` configured before the frontend can connect.
3. **iOS audio autoplay** — Require a user gesture (tap) before starting audio playback. The MicButton serves this purpose.
4. **Socrata timeout** — Some queries take 1-2s. Always show the "pending" tool badge immediately.
5. **Gemini context limit** — Don't include full Socrata JSON in the conversation. Summarize results to ≤200 tokens before feeding back to the agent.
6. **Demo reliability** — Have the three scenario card answers memorized. If the live query fails, you can still demo the UI with cached responses.
