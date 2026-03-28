# Bharath — Live Camera + Voice + Deployment Tasks

> Updated: 2026-03-27
> Status: **Tasks 1 & 2 DONE** — Cloud Run deployed. Start from Task 3.
> Branch: work directly on `main`

---

## Live URLs

| Service | URL |
|---------|-----|
| **Backend** | `https://asknyc-backend-901435891859.us-central1.run.app` |
| **Frontend** | `https://asknyc-frontend-901435891859.us-central1.run.app` |
| **Backend Health** | `https://asknyc-backend-901435891859.us-central1.run.app/health` |
| **Dashboard** | `https://asknyc-frontend-901435891859.us-central1.run.app/dashboard` |
| **Remote (phone)** | `https://asknyc-frontend-901435891859.us-central1.run.app/remote` |

---

## Prerequisites

### Local Setup (if needed)
```bash
git clone https://github.com/rahilsinghi/askNYC.git
cd askNYC

# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in keys (get from Rahil)

# Frontend
cd ../frontend
npm install
cp .env.example .env.local  # NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## ~~Task 1: Deploy Backend to Cloud Run~~ — DONE

Deployed by Rahil on 2026-03-27. Backend is live at:
```
https://asknyc-backend-901435891859.us-central1.run.app
```

**Configuration:**
- Region: `us-central1`
- Image: `us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest`
- Memory: 512Mi, CPU: 1
- Session affinity enabled
- Env vars: Gemini API key, Maps API key, Socrata token, Vertex AI enabled
- CORS: allows frontend Cloud Run URL + localhost

**Health check confirmed:**
```json
{"status":"ok","service":"ask-nyc","version":"2.0.0","gemini_model":"gemini-2.5-flash-native-audio-latest","datasets":7,"vertex_ai":"TRUE","active_sessions":0}
```

### To redeploy (if you make backend changes):
```bash
cd backend
docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest .
docker push us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest
gcloud run deploy asknyc-backend --image us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest --region us-central1
```

---

## ~~Task 2: Deploy Frontend to Cloud Run~~ — DONE

Deployed by Rahil on 2026-03-27. Frontend is live at:
```
https://asknyc-frontend-901435891859.us-central1.run.app
```

**Configuration:**
- Dockerfile created at `frontend/Dockerfile` (uses npm, standalone Next.js output)
- `next.config.ts` updated with `output: 'standalone'`
- Built with `NEXT_PUBLIC_WS_URL=wss://asknyc-backend-901435891859.us-central1.run.app`
- Built with Mapbox token baked in
- Memory: 256Mi, CPU: 1
- Backend CORS updated to allow this frontend URL

### To redeploy (if you make frontend changes):
```bash
cd frontend
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_WS_URL=wss://asknyc-backend-901435891859.us-central1.run.app \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token> \
  -t us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/frontend:latest .
docker push us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/frontend:latest
gcloud run deploy asknyc-frontend --image us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/frontend:latest --region us-central1
```

---

## Task 3: Test Live Camera on iPhone (iOS Safari)

This is the core test. The `/remote` page captures camera + mic from the phone and streams to the backend.

### How to test
1. Open `$FRONTEND_URL/dashboard` on your laptop
2. You'll see a QR code in the bottom-right corner
3. Scan the QR code with your iPhone camera
4. It opens `$FRONTEND_URL/remote?session=XXXX`

### What should happen
1. Safari asks for camera + microphone permission → **Allow**
2. Camera preview appears in the video element
3. Status shows "CONNECTED" (green)
4. Dashboard shows "LIVE FEED" badge (instead of "NO REMOTE")
5. Camera frames (1fps JPEG) stream to backend → Gemini can see them
6. Hold the mic button → speak a question → release
7. Audio streams to Gemini Live → Gemini processes → speaks back
8. Dashboard shows: tool badges, data cards, map pins, audio playback

### iOS Safari known issues to watch for

**1. getUserMedia requires HTTPS**
- Cloud Run provides HTTPS automatically ✓
- Will NOT work on `http://localhost` — must use deployed URL or ngrok

**2. Camera facing mode**
- The code requests `facingMode: 'environment'` (rear camera)
- If rear camera fails, try removing the facingMode constraint
- File: `frontend/hooks/useWebSocket.ts` line 230-232

**3. Audio autoplay policy**
- iOS requires a user gesture before playing audio
- The MicButton tap serves as this gesture
- If audio doesn't play, the `initAudio()` call in `useWebSocket.ts` may need to be triggered on button press

**4. WebSocket disconnects**
- iOS Safari aggressively kills background WebSocket connections
- Keep the phone screen ON and Safari in foreground during testing
- The server-side heartbeat (25s) should help keep it alive

**5. MediaRecorder codec**
- The code uses `audio/webm;codecs=opus` for mic recording
- iOS Safari 17+ supports this, but if it fails, try `audio/mp4` as fallback
- File: `frontend/hooks/useWebSocket.ts` line 208

### What to log/report
For each test attempt, note:
- [ ] Camera permission prompt appeared?
- [ ] Camera preview visible in the video element?
- [ ] "CONNECTED" status shown?
- [ ] Dashboard shows "LIVE FEED"?
- [ ] Mic button works (hold to speak)?
- [ ] Can you see camera frames arriving in backend logs?
- [ ] Does Gemini respond with audio?
- [ ] Do data cards appear on the dashboard?
- [ ] Any console errors? (Connect Mac to iPhone via Safari Web Inspector)

### Debugging with Safari Web Inspector
1. iPhone: Settings → Safari → Advanced → Web Inspector ON
2. Connect iPhone to Mac via USB
3. Mac Safari: Develop → [iPhone name] → [page]
4. Check Console for errors

---

## Task 4: Voice Input → investigate_location Pipeline

Currently, voice input from the remote page sends audio to Gemini Live, which hears the question and should call `investigate_location()`. This is the same pipeline as the dashboard text query but triggered by voice.

### The flow
```
Phone mic → audio_frame WS message → backend send_audio_frame()
  → Gemini Live hears audio → extracts question
  → sees current video frame → identifies location
  → calls investigate_location(location_name, topic)
  → tool queries Socrata + pushes cards/pins
  → Gemini speaks response → audio_chunk to dashboard
```

### What to verify
1. Gemini actually calls `investigate_location` from voice input (check backend logs)
2. If Gemini answers from memory without calling tools, the ROOT_PROMPT may need strengthening for voice mode
3. Video frames are being sent alongside audio (both needed for Gemini to see + hear)

### Potential issues
- Gemini Live may not call tools from voice as reliably as from text
- The audio quality from phone mic may affect speech recognition
- Video frame + audio need to arrive close together for Gemini to correlate them

### If voice doesn't trigger tools
Try adding to the ROOT_PROMPT:
```
When you hear a voice question AND see a video frame, ALWAYS call investigate_location().
Do not answer from your own knowledge. The user expects real NYC government data.
```

---

## Quick Reference

### Commands
```bash
# Start backend locally
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Start frontend locally
cd frontend && pnpm dev

# Rebuild and redeploy backend
cd backend && docker build -t us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest . && docker push us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest && gcloud run deploy asknyc-backend --image us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest --region us-central1

# Check backend logs
gcloud run services logs read asknyc-backend --region us-central1 --limit 50

# Check active sessions
curl $(gcloud run services describe asknyc-backend --region us-central1 --format 'value(status.url)')/health
```

### Key files
| File | Purpose |
|------|---------|
| `frontend/app/remote/page.tsx` | Phone remote page (camera + mic UI) |
| `frontend/components/remote/MicButton.tsx` | Push-to-talk button |
| `frontend/hooks/useWebSocket.ts` | `useRemoteWs()` hook — camera/mic streaming |
| `backend/routers/ws.py` | `/ws/remote` endpoint |
| `backend/services/gemini_service.py` | `send_audio_frame()`, `send_video_frame()` |
| `backend/Dockerfile` | Backend container |

### Architecture
```
iPhone Safari (/remote)          Laptop Chrome (/dashboard)
  ├── Camera → 1fps JPEG ──┐      ├── Tool badges
  ├── Mic → PCM audio ─────┤      ├── Data cards
  └── MicButton (PTT) ─────┤      ├── Map pins
                            ▼      ├── Audio playback
                    Cloud Run      └── Waveform
                    (FastAPI)
                        │
                   Gemini Live
                   (voice+vision)
                        │
                   investigate_location()
                        │
                   NYC Open Data (Socrata)
```
