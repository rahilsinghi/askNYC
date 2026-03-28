# Ask NYC

> Point your phone at any building in New York City. Ask a question. Get answers from 7 city datasets in real time.

Ask NYC is a voice + camera AI agent that turns NYC's public data into spoken, contextual answers. Point your phone at a restaurant, apartment building, or construction site — the AI identifies what you're looking at, queries city databases, and speaks a natural-language response while the dashboard lights up with data cards and map pins.

**Built for:** NYC Build With AI Hackathon @ NYU Tandon — GDG NYC (March 27-28, 2026)

---

## How It Works

```
Phone Camera + Mic
       |
       | WebSocket (audio + video frames)
       v
  FastAPI Backend (Cloud Run)
       |
       | ADK Multi-Agent Architecture
       v
  ┌─ Root Coordinator (AskNYC) ─────────────────────┐
  │   Tools: Geocoding, Google Search, Map Pins      │
  │                                                   │
  │   ┌─ FoodSafetyExpert ──── Restaurant Inspections │
  │   ├─ HousingExpert ─────── HPD Violations         │
  │   ├─ SafetyExpert ──────── NYPD Incidents         │
  │   ├─ ConstructionExpert ── DOB Permits            │
  │   └─ TransitExpert ─────── Subway Entrances       │
  └───────────────────────────────────────────────────┘
       |
       | Spoken response + data events
       v
  Dashboard (Vercel)
  Map + Data Cards + Voice
```

## Demo Scenarios

| Scenario | Question | What Happens |
|----------|----------|-------------|
| Restaurant | "Is this safe to eat?" | Health grades, violations, 311 complaints |
| Apartment | "Should I live here?" | HPD violations, evictions, nearby transit |
| Construction | "What's being built?" | DOB permits, noise complaints, timeline |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Model** | Gemini 3.1 Flash Live (real-time voice + vision) |
| **Agent Framework** | Google ADK with 5 specialist sub-agents |
| **Grounding** | Google Search + 7 NYC Open Data datasets (40M+ records) |
| **Backend** | FastAPI + Python, deployed on Google Cloud Run |
| **Frontend** | Next.js 15 + React 19, deployed on Vercel |
| **Maps** | Mapbox GL JS (dark theme, animated markers) |
| **Data** | Socrata API — 311, restaurants, DOB, HPD, NYPD, evictions, subway |

## 7 NYC Open Data Sources

| Dataset | Records | What It Tells You |
|---------|---------|-------------------|
| Restaurant Inspections | Health grades, violations, inspection dates |
| 311 Service Requests | Noise, heat, water complaints by location |
| DOB Permit Issuance | Active construction, permit types, timelines |
| HPD Violations | Building violations by severity (A/B/C) |
| NYPD Complaint Data | Crime incidents, felony vs misdemeanor |
| Evictions | Displacement patterns by zip code |
| Subway Entrances | Nearby stations, train lines, transit access |

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Google AI Studio API key ([get one](https://aistudio.google.com/apikey))
- Google Maps API key (Geocoding API enabled)
- Mapbox token ([get one](https://mapbox.com))

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your API keys
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
pnpm install
cp .env.example .env  # add your tokens
pnpm dev
```

### Run
1. Open `http://localhost:3000/dashboard` on your laptop
2. Open `http://localhost:3000/remote` on your phone (same network)
3. Point your phone at something. Ask a question.

> For phone camera access you need HTTPS. Use `ngrok http 8000` or deploy to Cloud Run.

## Team

| Name | Role |
|------|------|
| **Rahil Singhi** | Backend Architecture, ADK Multi-Agent Pipeline |
| **Chinmay** | Cloud Deployment, WebSocket Infrastructure |
| **Sariya** | Frontend Design, Dashboard UX |
| **Bharath** | QA, Demo Preparation, Documentation |

## Project Structure

```
ask-nyc/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── routers/ws.py            # WebSocket endpoints
│   ├── services/
│   │   ├── gemini_service.py    # ADK multi-agent + Gemini Live
│   │   ├── socrata_service.py   # 7 NYC Open Data tools
│   │   ├── geocoding_service.py # Google Maps geocoding
│   │   └── session_service.py   # In-memory session store
│   └── models/schemas.py        # Pydantic models
├── frontend/
│   ├── app/                     # Next.js pages
│   ├── components/              # React components
│   ├── hooks/                   # WebSocket, audio, camera hooks
│   └── lib/                     # Types, constants
├── docs/                        # Data source reference
└── team/                        # Task assignments
```

## License

MIT
