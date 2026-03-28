# Ask NYC — Roadmap & Next Steps

> Everything left to build, organized by priority for the March 27-28 hackathon.
> Updated: March 28, 2026

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

### 2.1 Mapbox GL JS Integration — DONE

**Status:** Complete. MiniMap component has full Mapbox integration with pin rendering.
**Files:** `frontend/components/dashboard/MiniMap.tsx`

### 2.2 Tool Badge → Data Card Animation Pipeline — DONE

**Status:** Complete. Wired to real WebSocket events, animations working end-to-end.
**Files:** `frontend/app/dashboard/page.tsx`, `frontend/components/dashboard/DataCard.tsx`

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

### 3.1 `/insights` Page — Aggregate Analytics — DONE

**Status:** Complete. Fetches real session data from `/sessions` API.
**File:** `frontend/app/insights/page.tsx`

Implemented:
- ✅ Aggregate stats: total sessions, datasets queried, unique locations, avg cards/session
- ✅ Cards by Category bar chart (animated, sorted by count)
- ✅ Most Scanned Location with animated circular display
- ✅ Loading, error, and empty states
- ✅ Scrollable layout

Remaining (nice to have):
- Heat map of queried locations (requires Mapbox)
- "NYC data pulse" — live ticker of recent 311 complaints city-wide

### 3.2 `/sessions` Page — Live Session Management

**Status:** Placeholder only (icon + "coming soon")
**File:** `frontend/app/sessions/page.tsx`

Planned features:
- List of active WebSocket sessions
- Session state indicator (idle/listening/processing/speaking)
- Ability to switch between sessions on the dashboard
- Session duration timer
- Connected device indicator (phone linked vs. not)

### 3.3 Archive Page Filter Logic — DONE

**Status:** Complete. Fetches real data from `/sessions` API. All filters working.
**File:** `frontend/app/archive/page.tsx`

Implemented:
- ✅ `TODAY` filter: compare session timestamp to current date
- ✅ `THIS WEEK` filter: compare to last 7 days
- ✅ `ALL TIME` filter: show all
- ✅ Search by location name and address
- ✅ Connected to real `/sessions` API endpoint
- ✅ Shows location_name, location_address, cards count, datasets count, category pills, anomaly badge

### 3.4 Session Persistence — DONE

**Status:** JSON-file backed. Persists within Cloud Run instance lifetime.
**File:** `backend/services/session_service.py`

Implemented:
- ✅ JSON file at `/tmp/asknyc_sessions.json`
- ✅ Saves on session end: location_name, location_address, lat, lng, cards, datasets_queried, anomaly_found
- ✅ Max 50 sessions, newest first
- ✅ Loads from disk on startup

Remaining (nice to have):
- Google Cloud Firestore for persistence across Cloud Run restarts

### 3.5 Gemini Live Reconnection

**Status:** No reconnection logic exists
**File:** `backend/services/gemini_service.py`

What needs to happen:
- Detect Gemini Live session timeout/disconnect
- Auto-reconnect with fresh session, preserving conversation context summary
- Push `agent_state: "idle"` to dashboard on reconnect
- Frontend should show brief "reconnecting..." state

---

## Priority 4 — Deployment & Infrastructure — DONE (includes CI/CD auto-deploy)

### 4.1 Google Cloud Run Deployment — DONE

**Status:** Backend + Frontend both deployed to Cloud Run on 2026-03-27.

| Service | URL |
|---------|-----|
| Backend | `https://asknyc-backend-901435891859.us-central1.run.app` |
| Frontend | `https://asknyc-frontend-901435891859.us-central1.run.app` |

- Artifact Registry repo: `us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/`
- Backend: Vertex AI enabled, all API keys set, CORS configured, session affinity
- Frontend: standalone Next.js build, WS URL + Mapbox token baked in

### 4.2 Frontend Deployment — DONE

Deployed to Cloud Run (not Vercel) for simplicity. Both services in same region.

### 4.3 HTTPS for Phone Camera — DONE

Cloud Run provides HTTPS automatically. Phone camera access works on deployed URLs.

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
| Health check enhancement | Report Gemini connection status, Socrata reachability |
| Rate limiter | Protect Socrata calls from rapid-fire tool invocations |

### Backend Modules — Recently Completed
| Module | Purpose |
|--------|---------|
| Session data pipeline | `_do_investigate()` stores location_name, location_address, datasets_queried, cards on SessionState |
| JSON-file session persistence | Sessions saved to `/tmp/asknyc_sessions.json`, loaded on startup |

### Frontend Modules — Complete
| Module | File | Status |
|--------|------|--------|
| Splash page | `app/page.tsx` | Done |
| Dashboard layout | `app/dashboard/page.tsx` | Done |
| Remote phone page | `app/remote/page.tsx` | Done |
| Archive page | `app/archive/page.tsx` | Done (real data, all filters working) |
| Dashboard WebSocket hook | `hooks/useWebSocket.ts` | Done |
| Remote WebSocket hook | `hooks/useWebSocket.ts` | Done |
| Demo mode | `hooks/useDemoMode.ts` | Done (3 scenarios) |
| Sidebar nav (collapsible) | `components/dashboard/Sidebar.tsx` | Done |
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
| `/sessions` page | Live session management |
| Error boundary | Graceful handling of WebSocket disconnects, API failures |

### Frontend Modules — Recently Completed
| Module | Purpose |
|--------|---------|
| Mapbox GL integration | Real interactive map in MiniMap.tsx |
| `/insights` page | Aggregate analytics with real session data |
| Collapsible sidebar | 200px ↔ 56px toggle |
| FloatingCards on map | Data cards overlay positioned relative to sidebar |
| Archive date filters | TODAY / THIS WEEK / ALL filter logic |
| Loading states | Loading spinners for archive, insights pages |

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
- [x] Deploy backend to Google Cloud Run — DONE
- [x] Deploy frontend to Cloud Run — DONE
- [x] Test phone → deployed backend (HTTPS enables camera) — DONE
- [x] Set up Cloud Build CI/CD auto-deploy on push to main — DONE
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
