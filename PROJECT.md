# Ask NYC — Project Setup Guide

## Hackathon Context

**Event:** NYC Build With AI Hackathon @ NYU Tandon
**Organizer:** GDG NYC
**Part of:** NYC Open Data Week
**Date:** March 27-28, 2026
**Team:** Rahil Singhi + Aishwarya Ghaiwat
**Prizes:** Google I/O tickets + private pitch with Google AI Futures Fund
**Required tech:** Gemini Live API, ADK, Google Cloud, NYC Open Data

---

## Current Status (as of March 26, 2026)

### What's Working

| Component | Status | Notes |
|-----------|--------|-------|
| Backend (FastAPI) | Running | `uvicorn main:app --reload --port 8000` |
| `/health` endpoint | Verified | Returns `{"status":"ok","service":"ask-nyc"}` |
| `/sessions` endpoint | Verified | Returns session history (empty until first session) |
| WebSocket `/ws/dashboard` | Implemented | Creates GeminiSession, sends events to dashboard |
| WebSocket `/ws/remote` | Implemented | Receives audio+video from phone, relays to Gemini |
| Socrata API (7 datasets) | **7/7 passing** | All return real NYC data, tested at NYU Tandon coords |
| Geocoding service | Implemented | Falls back to NYC center without API key |
| Gemini Live integration | Implemented | Needs `GOOGLE_API_KEY` to activate |
| Session store | Implemented | In-memory, lost on restart |
| Frontend (Next.js 15) | Building clean | Zero TypeScript errors |
| Splash page (`/`) | Complete | Animated wordmark, count-up stats, CTA |
| Dashboard (`/dashboard`) | Complete | 4-panel layout, demo mode, WebSocket integration |
| Remote (`/remote`) | Complete | Camera + mic UI, hold-to-speak button |
| Archive (`/archive`) | Complete | Session grid with demo data fallback |
| Demo mode | Complete | 3 offline scenarios (restaurant, building, construction) |
| Design system | Complete | Tailwind config, CSS animations, Google Fonts |

### What Needs API Keys

| Feature | Key Required | How to Get |
|---------|-------------|------------|
| Gemini Live voice + video pipeline | `GOOGLE_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| Google Maps geocoding | `GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → Enable Geocoding API |
| Mapbox mini map (future) | `NEXT_PUBLIC_MAPBOX_TOKEN` | [mapbox.com](https://mapbox.com) → sign up → default token |
| Socrata rate limits | `SOCRATA_APP_TOKEN` | [data.cityofnewyork.us](https://data.cityofnewyork.us) → Developer Settings |

### What Works Without Keys

- All 7 Socrata queries (restaurant inspections, 311 complaints, DOB permits, HPD violations, NYPD incidents, evictions, subway entrances)
- Full frontend UI (all 4 pages)
- Demo mode (click DEMO: RESTAURANT/BUILDING/CONSTRUCTION on dashboard)
- WebSocket connection between frontend and backend
- Archive page with demo session cards

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15 + React 19)               │
│                                                                   │
│  /              Splash — animated wordmark + "ACTIVATE SYSTEM"    │
│  /dashboard     Main screen — camera + map + intelligence brief   │
│  /remote        Phone page — camera + mic hold-to-speak           │
│  /archive       Session history — grid of past conversations      │
│  /insights      [PLACEHOLDER] — aggregate analytics               │
│  /sessions      [PLACEHOLDER] — live session management           │
│                                                                   │
│  Hooks:                                                           │
│    useDashboardWs() — connects to /ws/dashboard, handles events   │
│    useRemoteWs()    — connects to /ws/remote, streams audio+video │
│    useDemoMode()    — 3 offline demo scenarios                    │
│                                                                   │
│  Components:                                                      │
│    Sidebar ─── CameraFeed ─── MiniMap ─── IntelligenceBrief       │
│    DataCard ── Waveform ──── MicButton ── SessionCard             │
└──────────────────────────────────────────────────────────────────┘
          ▲ WebSocket (JSON events)         │
          │                                 │
          │  Events TO dashboard:           │  Events FROM phone:
          │  audio_chunk, transcript,       │  video_frame (1fps JPEG)
          │  data_card, map_event,          │  audio_frame (16kHz PCM)
          │  tool_call, agent_state,        │  user_start/stop_speaking
          │  detection, session_complete    │
          │                                 │
┌─────────┴─────────────────────────────────▼──────────────────────┐
│                    BACKEND (FastAPI + Python)                      │
│                                                                   │
│  main.py          ─── FastAPI app, CORS, lifespan, /health        │
│  routers/ws.py    ─── /ws/dashboard + /ws/remote endpoints        │
│                                                                   │
│  services/                                                        │
│    gemini_service.py   ─── GeminiSession class                    │
│    │                       ├─ Gemini Live connection               │
│    │                       ├─ Audio/video relay from phone         │
│    │                       ├─ Tool execution + result dispatch     │
│    │                       └─ System prompt (NYC data expert)      │
│    │                                                              │
│    socrata_service.py  ─── 7 NYC Open Data tool functions         │
│    │  ├─ query_restaurant_inspections (name + radius fallback)    │
│    │  ├─ query_311_complaints (within_circle on 'location')       │
│    │  ├─ query_dob_permits (text lat/lng bounding box)            │
│    │  ├─ query_hpd_violations (zip + borough approximation)       │
│    │  ├─ query_nypd_incidents (within_circle on 'geocoded_column')│
│    │  ├─ query_evictions (zip code strategy)                      │
│    │  └─ query_subway_entrances (within_circle on data.ny.gov)    │
│    │                                                              │
│    geocoding_service.py ── Google Maps lat/lng lookup              │
│    session_service.py   ── In-memory session store (50 max)       │
│                                                                   │
│  models/schemas.py ─── Pydantic models for all message types      │
└──────────────────────────────────────────────────────────────────┘
          │ tool calls (SoQL queries, ~500ms each)
          ▼
┌──────────────────────────────────────────────────────────────────┐
│              NYC OPEN DATA (Socrata API)                           │
│                                                                   │
│  311 complaints        erm2-nwe9   within_circle(location,...)    │
│  Restaurant grades     43nn-pn8j   upper(dba) LIKE + location     │
│  DOB permits           ipu4-2q9a   text lat/lng bounding box      │
│  HPD violations        wvxf-dwi5   zip + boroid (no geo column)   │
│  NYPD incidents        5uac-w243   within_circle(geocoded_column) │
│                                                                   │
│  — Free, no auth required for <1000 rows, JSON response —         │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow (end-to-end)

```
1. User opens /dashboard → useDashboardWs() connects to /ws/dashboard
2. Backend creates GeminiSession → sends session_ready with QR URL
3. User scans QR → opens /remote?session={id} → useRemoteWs() connects
4. Phone streams: video frames (1fps, 768x768 JPEG) + audio (16kHz PCM)
5. GeminiSession relays frames to Gemini Live (20ms tick loop)
6. Gemini processes audio+video → decides which tools to call
7. Tool functions execute (Socrata API queries, geocoding)
8. Results flow back:
   ├─ Audio chunks → dashboard plays via Web Audio API (24kHz PCM)
   ├─ Tool call status → dashboard shows badge animations
   ├─ DataCards → dashboard appends to intelligence brief
   ├─ Map events → dashboard updates pin positions
   └─ Agent state → dashboard drives waveform animation
9. On disconnect: session state saved to SessionService
10. Archive page fetches /sessions → displays past conversations
```

### Agent State Machine

```
idle → listening (user presses mic / audio detected)
listening → processing (user releases mic / VAD speech end)
processing → speaking (Gemini begins streaming response)
speaking → idle (response complete / turn_complete event)
```

---

## Getting Started (from zero)

### Prerequisites

- Python 3.12+
- Node.js 20+
- Google AI Studio account (free) → API key
- Google Cloud account (free tier) → Maps API key
- Mapbox account (free tier) → token (optional)

### Quick Start

```bash
# One command:
chmod +x dev.sh && ./dev.sh

# Or manually:

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then fill in API keys
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env.local  # NEXT_PUBLIC_WS_URL=ws://localhost:8000
npm run dev
```

### API Keys Setup

**Google AI Studio (Gemini):**
1. Go to https://aistudio.google.com/apikey
2. Create API key
3. Add to `backend/.env` as `GOOGLE_API_KEY`

**Google Maps Geocoding:**
1. Go to https://console.cloud.google.com
2. Enable "Geocoding API"
3. Create credentials → API key
4. Add to `backend/.env` as `GOOGLE_MAPS_API_KEY`

**Mapbox (mini map):**
1. Go to https://mapbox.com → sign up
2. Copy default public token
3. Add to `frontend/.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`

**Socrata (optional but recommended):**
1. Go to https://data.cityofnewyork.us
2. Create account → Profile → Developer Settings
3. Create app token
4. Add to `backend/.env` as `SOCRATA_APP_TOKEN`
   (Without this, rate limit is 1 req/s. With it: unlimited.)

### Verify Setup

```bash
# Backend health
curl http://localhost:8000/health
# → {"status":"ok","service":"ask-nyc"}

# Socrata APIs
cd backend && source venv/bin/activate && python test_socrata.py
# → 5/5 APIs responding

# Frontend
open http://localhost:3000
# → Splash page with "ASK NYC" wordmark
```

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# Required for Gemini Live voice + video pipeline
GOOGLE_API_KEY=

# Required for address → lat/lng lookup (falls back to NYC center without)
GOOGLE_MAPS_API_KEY=

# Optional: increases Socrata rate limit from 1/s to unlimited
SOCRATA_APP_TOKEN=

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

### Frontend (`frontend/.env.local`)

```bash
# WebSocket backend URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Optional: Mapbox GL JS token for real map rendering
NEXT_PUBLIC_MAPBOX_TOKEN=
```

---

## Socrata API — Column Reference

Each dataset uses different geo columns. This matters for SoQL queries.

| Dataset | Endpoint | Geo Strategy | Key Fields |
|---------|----------|-------------|------------|
| 311 Service Requests | `erm2-nwe9` | `within_circle(location, lat, lng, radius)` | `created_date`, `complaint_type`, `descriptor`, `status` |
| Restaurant Inspections | `43nn-pn8j` | Name: `upper(dba) like ...` / Radius: `within_circle(location, ...)` | `dba`, `grade`, `inspection_date`, `violation_description` |
| DOB Permits | `ipu4-2q9a` | Text bounding box on `gis_latitude` / `gis_longitude` | `job_type`, `work_type`, `filing_date`, `expiration_date` |
| HPD Violations | `wvxf-dwi5` | Zip code + borough (no geo column) | `novdescription`, `class`, `violationstatus`, `inspectiondate` |
| NYPD Complaints | `5uac-w243` | `within_circle(geocoded_column, lat, lng, radius)` | `ofns_desc`, `law_cat_cd`, `cmplnt_fr_dt` |
| Evictions | `6z8x-wfk4` | Zip code (text lat/lng, no geo column) | `eviction_address`, `executed_date`, `residential_commercial_ind`, `eviction_zip` |
| Subway Entrances | `i9wp-a4ja` (**data.ny.gov**) | `within_circle(entrance_georeference, lat, lng, radius)` | `stop_name`, `daytime_routes`, `entrance_type`, `entrance_latitude` |

---

## Demo Preparation

### Pre-built Scenario Cards

Print these at A4, high quality. Use Google Street View for photos.

**Card 1 — The Restaurant (Joe's Pizza)**
```
Address: 7 Carmine St, New York, NY 10014
Expected data: Grade A, clean record
Key query: restaurant inspections + 311 complaints
Talk track: "Here's one of NYC's most famous pizza spots. Let me check what the city knows..."
```

**Card 2 — A Building with HPD Violations**
```
Find a building near NYU Tandon with open violations:
Query: https://data.cityofnewyork.us/resource/wvxf-dwi5.json?$where=zip='11201' AND violationstatus='Open'&$limit=20
Pick one with 3+ violations and look up its street address on Google Maps.
Talk track: "This apartment building. I want to know if it's a good place to live."
```

**Card 3 — Construction Site near NYU Tandon**
```
Find active permits:
Query: https://data.cityofnewyork.us/resource/ipu4-2q9a.json?$where=zip_code='11201'&$limit=10&$order=filing_date DESC
Print a Street View of whichever construction site has the most interesting permit.
Talk track: "What's being built here?"
```

### Demo Mode (no API keys needed)

On the dashboard, when backend is offline or Gemini isn't connected:
1. Click **DEMO: RESTAURANT** — shows Grade A card + 311 complaints + permit
2. Click **DEMO: BUILDING** — shows HPD violations + complaints + NYPD data
3. Click **DEMO: CONSTRUCTION** — shows DOB permits + noise complaints

Cards animate in with staggered timing, tool badges shimmer, waveform transitions through states, transcript updates live.

---

## Deploy to Google Cloud Run

```bash
cd backend

# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ask-nyc-backend

# Deploy
gcloud run deploy ask-nyc-backend \
  --image gcr.io/YOUR_PROJECT_ID/ask-nyc-backend \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=xxx,GOOGLE_MAPS_API_KEY=yyy,CORS_ORIGINS=https://your-frontend.vercel.app
```

**Important:** Cloud Run scales to zero. Hit `/health` once before presenting to warm it up.

---

## Build Priority

| Priority | Task | Status | Owner |
|----------|------|--------|-------|
| 1 | Backend WebSocket skeleton | DONE | Rahil |
| 2 | Socrata service — all 7 tools tested | DONE | Rahil |
| 3 | Gemini Live audio in → audio out | DONE (needs key) | Rahil |
| 4 | Frontend WS hook + audio playback | DONE | Aishwarya |
| 5 | Dashboard UI — camera + cards | DONE | Aishwarya |
| 6 | Tool call → card animation | DONE | Both |
| 7 | Phone remote page | DONE | Aishwarya |
| 8 | Map pins (Mapbox) | NOT STARTED | Either |
| 9 | Session archive | DONE | Either |
| 10 | Onboarding/splash | DONE | Either |

**Minimum viable demo (items 1-7): COMPLETE.**

**Full roadmap with all remaining features → see [NEXT.md](NEXT.md)**

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Canonical context for Claude Code — architecture, rules, system prompt |
| [PROJECT.md](PROJECT.md) | Setup guide, current status, quick start (this file) |
| [NEXT.md](NEXT.md) | Detailed roadmap — all remaining features, modules, timeline |
| [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) | Socrata API reference — endpoints, geo strategies, example queries |
| [docs/STITCH_PROMPT.md](docs/STITCH_PROMPT.md) | Design system spec — colors, typography, component specs |

---

## Known Issues + Fixes Applied

| Issue | Fix |
|-------|-----|
| `google-genai==1.0.0` conflicted with `google-adk==1.0.0` | Loosened to `google-genai>=1.14.0` |
| `uvicorn==0.32.0` conflicted with `google-adk` | Loosened to `uvicorn>=0.34.0` |
| Nested quote syntax error in `socrata_service.py` line 56 | Used `chr(39)` for single quotes in f-string |
| 311 dataset has no `the_geom` column | Changed to `within_circle(location, ...)` |
| NYPD dataset has no `the_geom` column | Changed to `within_circle(geocoded_column, ...)` |
| DOB permits has text lat/lng, not numeric | Changed to text bounding box comparison |
| HPD violations has no geo columns at all | Changed to zip code + borough approximation |
| No `.gitignore` in repository | Created with venv, node_modules, .env, .next, __pycache__ |

## File Ownership

| File/Directory | Owner |
|----------------|-------|
| `backend/` (all) | Rahil |
| `frontend/hooks/` | Rahil |
| `frontend/lib/types.ts` | Rahil |
| `frontend/app/dashboard/` | Aishwarya |
| `frontend/app/remote/` | Aishwarya |
| `frontend/app/archive/` | Aishwarya |
| `frontend/app/page.tsx` (splash) | Aishwarya |
| `frontend/components/` | Aishwarya |
