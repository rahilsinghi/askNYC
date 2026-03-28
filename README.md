# Ask NYC

> Point your phone at any building in New York City. Ask a question. Get answers from 7 city datasets in real time.

Ask NYC is a multimodal AI agent that turns NYC's public data into spoken, contextual answers. It combines **real-time voice + camera input** with a **multi-agent recommendation engine** — two distinct experiences powered by the same data infrastructure.

**Built for:** NYC Build With AI Hackathon @ NYU Tandon — GDG NYC (March 27-28, 2026)

**Try it live:** [asknyc-frontend-901435891859.us-central1.run.app](https://asknyc-frontend-901435891859.us-central1.run.app)

---

## Two Experiences

### 1. Live Voice + Camera Dashboard (`/dashboard`)

Point your phone camera at a restaurant, apartment building, or construction site. Speak a question. The AI identifies what you're looking at, queries city databases in real time, and speaks a natural-language response while the dashboard lights up with data cards and map pins.

- Real-time audio streaming via WebSocket (PCM 24kHz)
- Camera frame analysis at 1fps (JPEG 768x768)
- Animated data cards + map pins appear as agents query datasets
- Separate phone remote (`/remote`) connects via QR code

### 2. Ask NYC Recommendation Engine (`/ask`)

Type any question about NYC — "Best pizza near Washington Square Park", "Safest neighborhood in Brooklyn near a subway". The system runs 6-8 data agents **visibly in parallel**, streams their progress, and synthesizes everything into scored recommendation cards with data-backed reasoning.

- SSE streaming shows agents working in real time
- Score circles, breakdown bars, badges, and reasoning bullets
- 4 built-in demo prompts for maximum agent coverage
- Offline demo fallback with hardcoded sequences

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                     │
│                                                             │
│  /             Splash — search, voice input, navigation     │
│  /dashboard    Live dashboard — 3D map, cards, audio        │
│  /ask          Multi-agent recommendation engine            │
│  /remote       Phone remote — camera + mic input            │
│  /archive      Session history with search + filters        │
│  /insights     Aggregate analytics from session data        │
└─────────────────────────────────────────────────────────────┘
         │ WebSocket              │ SSE Stream       │ REST
         ▼                       ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI, Python)                  │
│                                                             │
│  /ws/dashboard   WebSocket — pushes audio, cards, map pins  │
│  /ws/remote      WebSocket — receives camera + mic from phone│
│  /api/recommend  POST → SSE stream for recommendation cards │
│  /sessions       GET — session history                      │
│                                                             │
│  Services:                                                  │
│  ├── GeminiService     — ADK agent + Gemini Live session    │
│  ├── RecommendService  — Multi-agent recommendation pipeline│
│  ├── SocrataService    — 7 NYC Open Data query functions    │
│  ├── GeocodingService  — Google Maps lat/lng lookup         │
│  └── SessionService    — In-memory JSON session store       │
└─────────────────────────────────────────────────────────────┘
         │                       │                  │
         ▼                       ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                              │
│                                                             │
│  Gemini Live (2.5 Flash Native Audio) — voice + vision      │
│  Gemini Flash (2.5 Flash Preview)     — JSON structured out │
│  Google ADK (LlmAgent + Runner)       — agent orchestration │
│  Google Maps Geocoding API            — address → coords    │
│  NYC Open Data (Socrata API)          — 7 civic datasets    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow — Live Voice Pipeline

```
Phone ──(WebSocket)──► Backend ──(ADK)──► Gemini Live
  │ video frames (1fps)    │                  │
  │ audio (PCM 16kHz)      │                  │ tool calls
  │                        │                  ▼
  │                        │          investigate_location()
  │                        │            ├── geocode
  │                        │            ├── query Socrata (parallel)
  │                        │            └── return summary
  │                        │                  │
  │                        │◄─────────────────┘
  │                        │  audio + data_card + map_event
  │                        ▼
  │                   Dashboard
  │                   ├── plays agent voice
  │                   ├── animates data cards
  │                   └── drops map pins
```

### Data Flow — Recommend Pipeline

```
User types question on /ask
  │
  POST /api/recommend ──► SSE Stream
  │
  ├─ Gemini Flash: parse query → { location, intent, datasets }
  ├─ Geocode location via Google Maps
  ├─ Run 5-7 Socrata queries via asyncio.gather()
  ├─ Gemini Flash: synthesize → scored recommendation cards
  └─ SSE complete
```

---

## Google Products Used

| Product | Usage | Details |
|---------|-------|---------|
| **Gemini 2.5 Flash Native Audio** | Live voice + vision | Real-time multimodal streaming via ADK |
| **Gemini 2.5 Flash (Text API)** | Recommendation pipeline | JSON structured output for query parsing + synthesis |
| **Google ADK** | Agent orchestration | LlmAgent, Runner, LiveRequestQueue, InMemorySessionService |
| **Google Maps Geocoding API** | Location resolution | Business name / address → lat/lng coordinates |
| **Google Cloud Run** | Production hosting | Backend + Frontend, us-central1, auto-scaling |
| **Google Cloud Build** | CI/CD | Auto-deploys both services on push to main |
| **Google Artifact Registry** | Container images | Docker images for backend + frontend |
| **Google Cloud Logging** | Observability | Centralized log collection |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Model** | Gemini 2.5 Flash Native Audio (live voice + vision) |
| **AI Model** | Gemini 2.5 Flash Preview (text API, JSON structured output) |
| **Agent Framework** | Google ADK v1.27+ (LlmAgent, Runner, LiveRequestQueue) |
| **Backend** | FastAPI + Python 3.12, WebSocket + SSE endpoints |
| **Frontend** | Next.js 15 + React 19 + TypeScript strict mode |
| **Styling** | Tailwind CSS v4, glass morphism, dark mode only |
| **Animations** | Framer Motion 12 (spring physics, staggered entrances) |
| **Maps** | Mapbox GL JS (3D dark theme, animated markers, building extrusions) |
| **Icons** | Lucide React |
| **Data** | Socrata API — 7 NYC Open Data datasets (40M+ records) |
| **Geocoding** | Google Maps Geocoding API |
| **Deployment** | Google Cloud Run + Cloud Build + Artifact Registry |
| **Testing** | Playwright (e2e) |

---

## 7 NYC Open Data Sources

All datasets are free, no authentication required. Queried via Socrata API with SoQL.

| Dataset | Endpoint | What It Tells You |
|---------|----------|-------------------|
| Restaurant Inspections | `43nn-pn8j` | Health grades, violations, inspection dates |
| 311 Service Requests | `erm2-nwe9` | Noise, heat, water, rodent complaints by location |
| DOB Permit Issuance | `ipu4-2q9a` | Active construction, permit types, timelines |
| HPD Violations | `wvxf-dwi5` | Building violations by severity class (A/B/C) |
| NYPD Complaint Data YTD | `5uac-w243` | Crime incidents, felony vs misdemeanor |
| Evictions | `6z8x-wfk4` | Displacement patterns by zip code |
| Subway Entrances | `i9wp-a4ja` | Nearby stations, train lines, transit access |

Standard query pattern: `$where=within_circle(the_geom, lat, lng, radius_meters)` with `$limit=50`.

---

## Demo Scenarios

### Live Voice Dashboard

| Scenario | Question | Datasets Queried |
|----------|----------|-----------------|
| Restaurant | "Is this safe to eat at?" | Restaurant Inspections, 311 Complaints |
| Apartment | "Should I live here?" | HPD Violations, Evictions, Subway |
| Construction | "What's being built?" | DOB Permits, 311 Complaints |
| Safety | "Is this area safe?" | NYPD Incidents |

### Ask NYC Recommendations

| Demo Prompt | Intent | Agents |
|-------------|--------|--------|
| "Best pizza place to eat near Washington Square Park" | Food | Geocoding, Restaurant Inspections, 311, NYPD, Subway (6 agents) |
| "Safest neighborhood to move to in Brooklyn near a subway" | Housing | Geocoding, HPD, Evictions, 311, NYPD, Subway (7 agents) |
| "What's happening with construction around Hudson Yards" | Construction | Geocoding, DOB Permits, 311, NYPD, Subway (6 agents) |
| "Late night food options near Times Square that are clean" | Food | Geocoding, Restaurant Inspections, 311, NYPD, Subway (6 agents) |

---

## Live Deployment

| Service | URL |
|---------|-----|
| **Frontend** | [asknyc-frontend-901435891859.us-central1.run.app](https://asknyc-frontend-901435891859.us-central1.run.app) |
| **Backend** | [asknyc-backend-901435891859.us-central1.run.app](https://asknyc-backend-901435891859.us-central1.run.app) |
| **Backend Health** | [/docs](https://asknyc-backend-901435891859.us-central1.run.app/docs) (FastAPI Swagger UI) |

CI/CD: Every push to `main` triggers Google Cloud Build, which builds Docker images, pushes to Artifact Registry, and deploys to Cloud Run automatically.

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 18+ (via fnm or nvm)
- pnpm (`npm install -g pnpm`)
- Google AI Studio API key — [get one](https://aistudio.google.com/apikey)
- Google Maps API key (Geocoding API enabled) — [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Mapbox access token — [get one](https://account.mapbox.com/access-tokens/)

### 1. Clone the repository

```bash
git clone https://github.com/rahilsinghi/askNYC.git
cd askNYC
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

Create `backend/.env`:

```bash
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_maps_api_key
SOCRATA_APP_TOKEN=              # optional, increases rate limits
CORS_ORIGINS=http://localhost:3000
GOOGLE_GENAI_USE_VERTEXAI=FALSE
```

Start the backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend setup

```bash
cd frontend
pnpm install
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

Start the frontend:

```bash
pnpm dev
```

### 4. Access the application

| Page | URL | Description |
|------|-----|-------------|
| Splash | [localhost:3000](http://localhost:3000) | Landing page with search + navigation |
| Dashboard | [localhost:3000/dashboard](http://localhost:3000/dashboard) | Main live dashboard with 3D map |
| Ask NYC | [localhost:3000/ask](http://localhost:3000/ask) | Multi-agent recommendation engine |
| Phone Remote | [localhost:3000/remote](http://localhost:3000/remote) | Phone camera + mic input |
| Archive | [localhost:3000/archive](http://localhost:3000/archive) | Session history |
| Insights | [localhost:3000/insights](http://localhost:3000/insights) | Aggregate analytics |

### 5. Phone camera setup

For the live voice pipeline, you need the phone remote:

1. Open `/dashboard` on your laptop
2. Open `/remote` on your phone (same WiFi network)
3. Point your phone at something and speak a question

> **Note:** Camera access requires HTTPS on mobile. For local dev, use `ngrok http 3000` to get an HTTPS URL, or deploy to Cloud Run.

### 6. Testing the /ask page without backend

The `/ask` page has built-in demo fallback. If the backend is unreachable, clicking any of the 4 demo prompts will play a hardcoded sequence with timed animations — no backend required.

---

## Project Structure

```
askNYC/
├── CLAUDE.md                        # AI context document
├── README.md                        # This file
├── cloudbuild.yaml                  # CI/CD: auto-deploy on push to main
│
├── backend/
│   ├── main.py                      # FastAPI app entry, CORS, routers
│   ├── Dockerfile                   # Production container
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Environment variable template
│   ├── routers/
│   │   ├── ws.py                    # WebSocket endpoints (/ws/dashboard, /ws/remote)
│   │   └── recommend.py             # SSE endpoint (POST /api/recommend)
│   ├── services/
│   │   ├── gemini_service.py        # ADK agent + Gemini Live session
│   │   ├── recommend_service.py     # Multi-agent recommendation pipeline
│   │   ├── socrata_service.py       # 7 NYC Open Data query functions
│   │   ├── geocoding_service.py     # Google Maps geocoding
│   │   └── session_service.py       # In-memory session store
│   └── models/
│       └── schemas.py               # Pydantic models
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Splash / landing page
│   │   ├── dashboard/page.tsx       # Live dashboard (3D map-dominant)
│   │   ├── ask/page.tsx             # Multi-agent recommendation page
│   │   ├── remote/page.tsx          # Phone remote (camera + mic)
│   │   ├── archive/page.tsx         # Session history
│   │   ├── insights/page.tsx        # Aggregate analytics
│   │   └── globals.css              # Global styles, glass morphism, animations
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx          # Icon sidebar with hover tooltips
│   │   │   ├── CameraFeed.tsx       # Camera view + PiP mode
│   │   │   ├── MiniMap.tsx          # Mapbox 3D map (full-screen background)
│   │   │   ├── MapFloatingCard.tsx   # Floating data cards on map
│   │   │   ├── IntelligenceBrief.tsx # Right panel: transcript, cards, tools
│   │   │   ├── DataCard.tsx         # Individual data card component
│   │   │   └── Waveform.tsx         # Audio waveform visualization
│   │   ├── ask/
│   │   │   ├── AgentCard.tsx        # Individual agent status (running/complete)
│   │   │   ├── AgentGrid.tsx        # Grid of agent cards + progress bar
│   │   │   ├── RecommendationCard.tsx # Scored card with reasoning
│   │   │   ├── QueryInput.tsx       # Input + demo prompt buttons
│   │   │   └── ProgressTimeline.tsx # PARSE → AGENTS → SYNTHESIS → RESULTS
│   │   ├── remote/
│   │   │   └── MicButton.tsx        # Push-to-talk button
│   │   └── SettingsPanel.tsx        # Demo toggle, volume, mute
│   ├── hooks/
│   │   ├── useWebSocket.ts          # WebSocket connection + reconnect
│   │   ├── useRecommend.ts          # SSE client + demo fallback
│   │   ├── useAudioPlayer.ts        # Sequential audio chunk playback
│   │   ├── useCameraCapture.ts      # getUserMedia + frame capture
│   │   └── useSettings.ts          # Settings state
│   └── lib/
│       ├── types.ts                 # All shared TypeScript types
│       └── constants.ts             # WS_URL, colors, dataset IDs
│
└── docs/
    ├── architecture.html            # Animated architecture diagram
    ├── architecture.mmd             # Mermaid architecture diagram
    ├── google-products.html         # Google products visualization
    ├── DATA_SOURCES.md              # Socrata API reference
    └── STITCH_PROMPT.md             # Design system specs
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_GEMINI_API_KEY` | Yes | Gemini API key from Google AI Studio |
| `GOOGLE_MAPS_API_KEY` | Yes | Google Maps Geocoding API key |
| `SOCRATA_APP_TOKEN` | No | Socrata app token (increases rate limits) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `GOOGLE_GENAI_USE_VERTEXAI` | No | Set to `FALSE` for AI Studio, `TRUE` for Vertex AI |
| `GOOGLE_CLOUD_PROJECT` | No | GCP project ID (for Vertex AI only) |
| `GOOGLE_CLOUD_LOCATION` | No | GCP region (for Vertex AI only) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket URL (`ws://localhost:8000` or `wss://...`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Mapbox GL JS access token |

---

## Team

| Name | Email | Role |
|------|-------|------|
| **Rahil Singhi** | rs9174@nyu.edu | Backend Architecture, ADK Multi-Agent Pipeline, Recommend Engine |
| **Bharath Mahesh Gera** | bharathmaheshgera@stern.nyu.edu | Camera Integration, Demo Preparation, QA |
| **Chinmay Shringi** | chinmayshringi4@gmail.com | 3D Map Dashboard, Cloud Deployment, WebSocket Infrastructure |
| **Sariya Rizwan** | sariyarizwan25@gmail.com | Frontend Design, Dashboard UX, Splash Page |

---

## License

MIT
