# Ask NYC — Roadmap & Next Steps

> Everything left to build, organized by priority for the March 27-28 hackathon.
> Updated: March 26, 2026

---

## Priority 1 — Demo-Critical (Must have for judging)

### 1.1 Gemini Live End-to-End Pipeline

**Status:** Code complete, untested with real API key
**Files:** `backend/services/gemini_service.py`, `backend/routers/ws.py`
**Blocked by:** `GOOGLE_API_KEY` from Google AI Studio

What needs to happen:
- Set `GOOGLE_API_KEY` in `backend/.env`
- Test full flow: phone → `/ws/remote` → GeminiSession → Gemini Live → audio out → `/ws/dashboard`
- Verify audio format: phone sends 16kHz PCM mono, Gemini returns 24kHz PCM
- Verify tool calling: Gemini should trigger Socrata tools based on voice + camera input
- Test the 20ms tick loop in `GeminiSession._relay_loop()` — may need tuning
- Verify `turn_complete` event properly transitions agent state back to `idle`

Known risks:
- Gemini Live sessions timeout after ~10 minutes of inactivity
- Audio latency — chunks must stream immediately, never buffer server-side
- Context window — Socrata JSON results must be summarized to ≤200 tokens before feeding back

### 1.2 Audio Streaming (Remote → Dashboard)

**Status:** Hooks exist, not tested with real audio
**Files:** `frontend/hooks/useWebSocket.ts` (useRemoteWs), dashboard audio playback logic

What needs to happen:
- Remote page: verify `getUserMedia()` captures 16kHz PCM mono correctly
- Remote page: verify JPEG frame capture at 1fps from camera stream
- Dashboard: verify Web Audio API playback of 24kHz PCM base64 chunks
- Test on iOS Safari — requires user gesture before AudioContext can start
- Test audio queuing — chunks arrive faster than playback, need sequential scheduling

### 1.3 Camera → Gemini Vision

**Status:** Frame capture implemented in remote page, relay logic in ws.py
**Files:** `frontend/app/remote/page.tsx`, `backend/routers/ws.py`

What needs to happen:
- Verify JPEG quality/size at 768x768 — may need to adjust for bandwidth
- Verify Gemini Live accepts inline JPEG frames via the `live_queue`
- Test that Gemini can read text from camera frames (business names, addresses, signs)
- HTTPS required for `getUserMedia()` on non-localhost — need ngrok or Cloud Run for phone testing

---

## Priority 2 — Demo Polish (High impact on judging scores)

### 2.1 Mapbox GL JS Integration

**Status:** Package installed (`mapbox-gl` in package.json), component is CSS-only placeholder
**Files:** `frontend/components/dashboard/MiniMap.tsx`
**Blocked by:** `NEXT_PUBLIC_MAPBOX_TOKEN` in `frontend/.env.local`

What needs to happen:
- Sign up at mapbox.com → copy default public token → add to `.env.local`
- Replace CSS-only map in `MiniMap.tsx` with real Mapbox GL JS instance
- Handle `map_event` WebSocket messages:
  - `pin` → add marker at lat/lng with source-colored icon
  - `zoom` → fly to coordinates
  - `circle` → draw radius circle overlay
- Color-code pins by data source (green=health, amber=complaints, blue=permits, red=NYPD)
- Add smooth fly-to animation when new pins arrive
- Current MiniMap already has the legend UI — just needs real map underneath

### 2.2 Tool Badge → Data Card Animation Pipeline

**Status:** Individual pieces work (demo mode proves it), needs real-data wiring
**Files:** `frontend/app/dashboard/page.tsx`, `frontend/components/dashboard/DataCard.tsx`

What needs to happen:
- Verify `tool_call` → `data_card` event sequence renders correctly with live Gemini data
- Test staggered card entry animation with real timing (not demo's fixed 800ms intervals)
- Verify badge shimmer animation triggers on `tool_call` pending → complete transition
- Test with all 5 data source categories rendering simultaneously

### 2.3 Detection Overlay

**Status:** `CameraFeed.tsx` has detection box UI, backend sends `detection` events
**Files:** `frontend/components/dashboard/CameraFeed.tsx`

What needs to happen:
- Wire `detection` WebSocket messages to the camera feed overlay
- Show bounding box with label and confidence percentage
- Auto-dismiss after 3-5 seconds or on next detection
- Test with Gemini's actual detection output format

---

## Priority 3 — Feature Complete (Nice to have for hackathon)

### 3.1 `/insights` Page — Aggregate Analytics

**Status:** Placeholder only (icon + "coming soon")
**File:** `frontend/app/insights/page.tsx`

Planned features:
- Aggregate stats across all past sessions (total queries, datasets hit, locations scanned)
- Heat map of queried locations (requires Mapbox)
- Most common complaint types across all sessions
- "NYC data pulse" — live ticker of recent 311 complaints city-wide
- Chart: complaints by category, violations by severity class

### 3.2 `/sessions` Page — Live Session Management

**Status:** Placeholder only (icon + "coming soon")
**File:** `frontend/app/sessions/page.tsx`

Planned features:
- List of active WebSocket sessions
- Session state indicator (idle/listening/processing/speaking)
- Ability to switch between sessions on the dashboard
- Session duration timer
- Connected device indicator (phone linked vs. not)

### 3.3 Archive Page Filter Logic

**Status:** Search-by-name works, date filters are non-functional
**File:** `frontend/app/archive/page.tsx`

What needs to happen:
- `TODAY` filter: compare session timestamp to current date
- `THIS WEEK` filter: compare to start of current week
- `ALL TIME` filter: show all (already works)
- Sort by: most recent first (already works), most data cards, longest duration
- Connect to real `/sessions` API endpoint instead of demo data fallback

### 3.4 Session Persistence

**Status:** In-memory only, lost on backend restart
**File:** `backend/services/session_service.py`

Options (hackathon-appropriate):
- JSON file on disk (simplest — write on session end, read on startup)
- Google Cloud Firestore (fits the "Google Cloud" judging requirement)
- Keep in-memory but add `/sessions/export` endpoint for manual backup

### 3.5 Gemini Live Reconnection

**Status:** No reconnection logic exists
**File:** `backend/services/gemini_service.py`

What needs to happen:
- Detect Gemini Live session timeout/disconnect
- Auto-reconnect with fresh session, preserving conversation context summary
- Push `agent_state: "idle"` to dashboard on reconnect
- Frontend should show brief "reconnecting..." state

---

## Priority 4 — Deployment & Infrastructure

### 4.1 Google Cloud Run Deployment

**Status:** Dockerfile exists, not tested
**Files:** `backend/Dockerfile`, `dev.sh`

Steps:
```bash
# Build
gcloud builds submit --tag gcr.io/PROJECT_ID/ask-nyc-backend

# Deploy
gcloud run deploy ask-nyc-backend \
  --image gcr.io/PROJECT_ID/ask-nyc-backend \
  --platform managed --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=xxx,GOOGLE_MAPS_API_KEY=yyy,CORS_ORIGINS=https://ask-nyc.vercel.app
```

Considerations:
- Cloud Run scales to zero — hit `/health` before demo to warm up
- WebSocket support: Cloud Run supports WS but has a 15-minute idle timeout
- Need to update `NEXT_PUBLIC_WS_URL` in frontend to point to Cloud Run URL
- HTTPS provided automatically by Cloud Run — needed for phone camera access

### 4.2 Frontend Deployment (Vercel)

**Steps:**
- Push to GitHub
- Connect repo to Vercel
- Set environment variables: `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`
- Verify WebSocket connection to Cloud Run backend

### 4.3 HTTPS for Phone Camera

**Status:** `getUserMedia()` requires HTTPS on non-localhost
**Options:**
- ngrok tunnel during local development: `ngrok http 3000`
- Cloud Run (automatic HTTPS) for demo day
- Self-signed cert with mkcert for local network testing

---

## Missing Files to Create

### `backend/.env.example`
```bash
# Required: Gemini Live voice + video pipeline
GOOGLE_API_KEY=

# Required: Address → lat/lng lookup (falls back to NYC center without)
GOOGLE_MAPS_API_KEY=

# Optional: Increases Socrata rate limit from 1/s to unlimited
SOCRATA_APP_TOKEN=

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3000
```

### `frontend/.env.example`
```bash
# WebSocket backend URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Optional: Mapbox GL JS token for real map rendering
NEXT_PUBLIC_MAPBOX_TOKEN=
```

### `docs/DATA_SOURCES.md`
Referenced in CLAUDE.md project structure but doesn't exist. Should contain:
- All 5 Socrata dataset details with endpoint IDs
- Column names and types for each dataset
- Geo-query strategy per dataset (which column, which SoQL function)
- Example queries with expected responses
- Rate limiting info (1 req/s without token, unlimited with)
- Known column quirks (DOB has text lat/lng, HPD has no geo columns)

---

## Module Inventory

### Backend Modules — Complete
| Module | File | Status |
|--------|------|--------|
| FastAPI app + CORS | `main.py` | Done |
| WebSocket endpoints | `routers/ws.py` | Done |
| Gemini Live session | `services/gemini_service.py` | Done (needs API key testing) |
| Socrata 5-dataset tools | `services/socrata_service.py` | Done (all 5 verified) |
| Geocoding service | `services/geocoding_service.py` | Done (needs API key) |
| Session store | `services/session_service.py` | Done (in-memory) |
| Pydantic schemas | `models/schemas.py` | Done |

### Backend Modules — Not Started
| Module | Purpose |
|--------|---------|
| `push_map_event` tool | WebSocket message to dashboard for map pin (referenced in CLAUDE.md, logic is in gemini_service.py but not standalone) |
| Session export/import | Persist sessions across restarts |
| Health check enhancement | Report Gemini connection status, Socrata reachability |
| Rate limiter | Protect Socrata calls from rapid-fire tool invocations |

### Frontend Modules — Complete
| Module | File | Status |
|--------|------|--------|
| Splash page | `app/page.tsx` | Done |
| Dashboard layout | `app/dashboard/page.tsx` | Done |
| Remote phone page | `app/remote/page.tsx` | Done |
| Archive page | `app/archive/page.tsx` | Done (filters need work) |
| Dashboard WebSocket hook | `hooks/useWebSocket.ts` | Done |
| Remote WebSocket hook | `hooks/useWebSocket.ts` | Done |
| Demo mode | `hooks/useDemoMode.ts` | Done (3 scenarios) |
| Sidebar nav | `components/dashboard/Sidebar.tsx` | Done |
| Camera feed + overlay | `components/dashboard/CameraFeed.tsx` | Done |
| Mini map (CSS) | `components/dashboard/MiniMap.tsx` | Done (needs Mapbox) |
| Intelligence brief | `components/dashboard/IntelligenceBrief.tsx` | Done |
| Data card | `components/dashboard/DataCard.tsx` | Done |
| Waveform | `components/dashboard/Waveform.tsx` | Done |
| Mic button | `components/remote/MicButton.tsx` | Done |
| Session card | `components/archive/SessionCard.tsx` | Done |
| Design system | `globals.css` + `tailwind.config.ts` | Done |

### Frontend Modules — Not Started
| Module | Purpose |
|--------|---------|
| Mapbox GL integration | Replace CSS map with real interactive map |
| `/insights` page | Aggregate analytics dashboard |
| `/sessions` page | Live session management |
| Audio player hook | `useAudioPlayer.ts` referenced in CLAUDE.md but may not exist as standalone |
| Camera capture hook | `useCameraCapture.ts` referenced in CLAUDE.md but may not exist as standalone |
| Archive date filters | TODAY / THIS WEEK filter logic |
| Error boundary | Graceful handling of WebSocket disconnects, API failures |
| Loading states | Skeleton screens for archive, insights pages |

---

## Hackathon Day Timeline Suggestion

### Day 1 Morning (March 27, 9am-12pm)
- [ ] Get `GOOGLE_API_KEY` → test Gemini Live end-to-end
- [ ] Get `GOOGLE_MAPS_API_KEY` → test geocoding
- [ ] Test full pipeline: phone camera → Gemini → tool calls → dashboard cards
- [ ] Fix any audio streaming issues (format, latency, playback)

### Day 1 Afternoon (March 27, 12pm-6pm)
- [ ] Get `NEXT_PUBLIC_MAPBOX_TOKEN` → integrate real map in MiniMap
- [ ] Wire map pins to `map_event` WebSocket messages
- [ ] Polish tool badge → data card animation timing with real data
- [ ] Run through all 3 demo scenarios with real API calls

### Day 1 Evening (March 27, 6pm-10pm)
- [ ] Deploy backend to Google Cloud Run
- [ ] Deploy frontend to Vercel
- [ ] Test phone → deployed backend (HTTPS enables camera)
- [ ] Prepare physical demo cards (print Street View photos)

### Day 2 Morning (March 28, 9am-12pm)
- [ ] Final integration testing on deployed stack
- [ ] Rehearse demo script (3 scenarios, <60 seconds each)
- [ ] Build presentation slides (architecture diagram, data flow)
- [ ] Record backup video in case live demo fails

### Day 2 Afternoon (March 28, demo time)
- [ ] Hit `/health` to warm up Cloud Run before presenting
- [ ] Run demo: Restaurant → Building → Construction site
- [ ] Fallback plan: demo mode buttons if live pipeline fails
