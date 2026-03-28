# Ask NYC — Master Plan (24-Hour Hackathon)

> March 27-28, 2026 | NYC Build With AI @ NYU Tandon
> Track: **Live Agents** (real-time audio/vision interaction)

---

## Judging Criteria (from hackathon website)

| Criterion | Weight | What Judges Want |
|-----------|--------|-----------------|
| Innovation & Multimodal UX | **40%** | Break the "text box" paradigm. Seamless audio/vision. Live, context-aware interactions. |
| Technical Implementation & Agent Architecture | **30%** | Effective ADK usage. Sound agent logic. Grounding to avoid hallucinations. System design robustness. |
| Demo & Presentation | **30%** | Clear problem narrative. Architecture diagrams. **Visual proof of Cloud deployment.** Working software (not mockups). |

**Prohibited:** Basic RAG apps, AI medical advisors, standard education chatbots.

---

## What Makes Us Win

1. **Voice + camera multimodal** (40% of score) — user points phone at building, speaks, gets spoken answer with real city data
2. **Multi-agent ADK architecture** (30% of score) — specialized sub-agents (food safety, housing, safety, construction, transit) coordinated by root agent
3. **7 live NYC Open Data sources** — real data, not mocked
4. **Google Search grounding** — combines government data with real-time web results
5. **Deployed on Google Cloud Run + Vertex AI** — production-ready, not localhost
6. **Interactive dashboard** — map pins, data cards, waveform, all animated in real-time

---

## Architecture (Target State)

```
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js 15 on Vercel)            │
│                                                             │
│  /              Splash — boot animation → dashboard         │
│  /dashboard     Main screen — map + cards + waveform        │
│  /remote        Phone — camera + mic (HTTPS required)       │
│  /archive       Session history with real data              │
└─────────────────────────────────────────────────────────────┘
         ▲ WebSocket (wss://)                │
         │                                   │
┌────────┴───────────────────────────────────▼────────────────┐
│          BACKEND (FastAPI on Google Cloud Run)               │
│                                                             │
│  ADK Runner.run_live() ─── LiveRequestQueue                 │
│    │                                                        │
│    ├── Root Agent (gemini-3.1-flash-live-preview)            │
│    │     ├── geocode_location (Google Maps)                  │
│    │     ├── google_search (web grounding)                   │
│    │     └── push_map_event (dashboard visualization)        │
│    │                                                        │
│    ├── FoodSafetyExpert (sub-agent)                          │
│    │     ├── query_restaurant_inspections                    │
│    │     └── query_311_complaints                            │
│    │                                                        │
│    ├── HousingExpert (sub-agent)                             │
│    │     ├── query_hpd_violations                            │
│    │     ├── query_evictions                                 │
│    │     └── query_311_complaints                            │
│    │                                                        │
│    ├── SafetyExpert (sub-agent)                              │
│    │     └── query_nypd_incidents                            │
│    │                                                        │
│    ├── ConstructionExpert (sub-agent)                        │
│    │     └── query_dob_permits                               │
│    │                                                        │
│    └── TransitExpert (sub-agent)                             │
│          └── query_subway_entrances                          │
│                                                             │
│  Vertex AI (GOOGLE_GENAI_USE_VERTEXAI=TRUE)                 │
│  GCP Project: nth-segment-491623-d2                         │
└─────────────────────────────────────────────────────────────┘
         │ SoQL queries (~500ms)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  NYC OPEN DATA (7 datasets) + Google Search (web grounding) │
└─────────────────────────────────────────────────────────────┘
```

---

## Team Assignments

| Person | Role | Focus Area | Task File |
|--------|------|-----------|-----------|
| **Rahil** | Lead / Backend Architect | ADK rewrite, multi-agent, Gemini Live pipeline | [RAHIL.md](RAHIL.md) |
| **Chinmay** | Backend Engineer | Cloud Run deployment, Vertex AI, WebSocket hardening | [CHINMAY.md](CHINMAY.md) |
| **Sariya** | Frontend Engineer | Dashboard revamp, animations, responsive design, UX polish | [SARIYA.md](SARIYA.md) |
| **Bharath** | QA / Demo / Docs | Testing, demo script, presentation slides, env setup | [BHARATH.md](BHARATH.md) |

---

## Timeline (24 Hours)

### Phase 1: Foundation (Hours 0-6) — Evening March 27

| Time | Rahil | Chinmay | Sariya | Bharath |
|------|-------|---------|--------|---------|
| 0-2h | ADK rewrite: Runner.run_live + LiveRequestQueue | Enable GCP APIs, set up Vertex AI, generate all keys | Error boundaries + loading states | Run test_socrata.py, verify 7/7, document results |
| 2-4h | Multi-agent architecture: 5 specialist sub-agents | Cloud Run deployment (backend), test WebSocket over HTTPS | Responsive dashboard (mobile sidebar collapse) | Set up GitHub repo, push code, write README |
| 4-6h | Google Search grounding integration | Frontend Vercel deployment, wire to Cloud Run backend | Mapbox map polish: clustering, zoom controls | Prepare 3 printed demo cards (Street View photos) |

### Phase 2: Integration (Hours 6-12) — Night/Early Morning March 28

| Time | Rahil | Chinmay | Sariya | Bharath |
|------|-------|---------|--------|---------|
| 6-8h | End-to-end testing: phone → Gemini → tools → dashboard | WebSocket hardening: reconnection, error handling | Sound design: boot sequence, tool call beeps | Test full flow on phone over HTTPS |
| 8-10h | Fix audio streaming issues (latency, format) | Session persistence (Firestore or JSON file) | Data card entrance animations: shimmer + reveal | Draft demo script (3 scenarios, 45 seconds each) |
| 10-12h | Performance tuning: parallel tool calls, caching | Monitoring: add latency metrics to /health | Archive page: fix filters, connect to real /sessions API | Rehearse demo x3, time each scenario |

### Phase 3: Polish (Hours 12-18) — Morning March 28

| Time | Rahil | Chinmay | Sariya | Bharath |
|------|-------|---------|--------|---------|
| 12-14h | Multi-agent demo scenario: "What's the deal with this place?" | Load testing: 3 concurrent sessions | Boot animation: system initialization sequence | Build presentation slides (architecture diagram) |
| 14-16h | Edge case handling: unknown locations, API failures | Cloud Run warm-up script, min-instances=1 | Insights page: basic session stats chart | Record backup demo video |
| 16-18h | Code review + cleanup | Final deployment with all env vars | Final UI polish pass | Final rehearsal with full team |

### Phase 4: Demo (Hours 18-24) — Afternoon March 28

| Time | Everyone |
|------|----------|
| 18-20h | Full team integration test on deployed stack |
| 20-22h | Dress rehearsal: 5-minute demo including architecture walkthrough |
| 22-24h | **DEMO TIME** — Hit /health to warm up Cloud Run, then present |

---

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Gemini model | `gemini-3.1-flash-live-preview` | Launched yesterday, best Live API model, 90.8% function calling accuracy |
| ADK version | `>=1.27.0` | Supports Runner.run_live(), LiveRequestQueue, multi-agent |
| Agent pattern | Multi-agent with sub_agents | Strong differentiator, judges see sophisticated architecture |
| Grounding | Google Search + Socrata | Combines government data + web data = unique insight |
| Deployment | Cloud Run (backend) + Vercel (frontend) | Judges require "visual proof of Cloud deployment" |
| Vertex AI | Yes, for Cloud Run | Shows production readiness, uses GCP properly |
| AI Studio | Yes, for local dev | Fast iteration, no IAM setup needed |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Gemini Live API fails | Demo dies | Demo mode with 3 offline scenarios already works |
| Cloud Run cold start | Slow first request | Set `--min-instances 1` |
| Phone can't reach backend | No camera/mic | Use ngrok for local testing, Cloud Run for HTTPS |
| Socrata rate limiting | Tool calls fail | App token already configured (unlimited) |
| Audio latency > 500ms | UX feels broken | Stream immediately, never buffer server-side |
| Multi-agent routing wrong | Wrong specialist answers | Fallback: root agent has all tools as backup |
