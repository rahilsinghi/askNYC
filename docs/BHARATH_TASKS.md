# Bharath — Live Camera + Voice + Deployment Tasks

> Updated: 2026-03-27
> Status: Ready to start
> Branch: `feat/live-camera` (remote page work), deployment config goes to `main`

---

## Prerequisites

### GCP Access
Ask Rahil to add your Google account as **Editor** on the existing project:
```bash
gcloud projects add-iam-policy-binding nth-segment-491623-d2 \
  --member="user:YOUR_EMAIL@gmail.com" \
  --role="roles/editor"
```

### Local Setup
```bash
# Clone and install
git clone https://github.com/rahilsinghi/askNYC.git
cd askNYC

# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in keys (get from Rahil)

# Frontend
cd ../frontend
pnpm install
cp .env.example .env.local  # NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Required API Keys (get from Rahil)
- `GOOGLE_GEMINI_API_KEY` — Gemini API key
- `GOOGLE_MAPS_API_KEY` — Google Maps Geocoding
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox for the map

---

## Task 1: Deploy Backend to Cloud Run

### 1a. Build and push Docker image
```bash
cd backend

# Authenticate
gcloud auth login
gcloud config set project nth-segment-491623-d2
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create Artifact Registry repo (one-time)
gcloud artifacts repositories create asknyc \
  --repository-format=docker \
  --location=us-central1

# Build and push
docker build -t us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest .
docker push us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest
```

### 1b. Deploy to Cloud Run
```bash
gcloud run deploy asknyc-backend \
  --image us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --timeout 300 \
  --session-affinity \
  --min-instances 1 \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_PROJECT=nth-segment-491623-d2,GOOGLE_CLOUD_LOCATION=us-central1,CORS_ORIGINS=*"
```

**Important flags:**
- `--session-affinity` — WebSocket connections must stick to the same instance
- `--min-instances 1` — avoid cold starts during demo
- `--timeout 300` — WebSocket connections can last up to 5 min
- Port is 8080 (set in Dockerfile via `$PORT` env var)

### 1c. Set secrets
```bash
# Set API keys as env vars (or use Secret Manager)
gcloud run services update asknyc-backend \
  --region us-central1 \
  --update-env-vars "GOOGLE_API_KEY=<key>,GOOGLE_MAPS_API_KEY=<key>"
```

### 1d. Verify
```bash
# Get the URL
BACKEND_URL=$(gcloud run services describe asknyc-backend --region us-central1 --format 'value(status.url)')
echo $BACKEND_URL

# Test health endpoint
curl $BACKEND_URL/health

# Test WebSocket (should connect and get session_ready)
# Use browser DevTools or wscat:
# npx wscat -c wss://<backend-url>/ws/dashboard
```

---

## Task 2: Deploy Frontend to Cloud Run

### 2a. Create frontend Dockerfile
Create `frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
```

**Note:** Add `output: 'standalone'` to `next.config.ts` for the standalone build:
```typescript
const nextConfig = {
  output: 'standalone',
  // ... existing config
}
```

### 2b. Build and deploy
```bash
cd frontend

# Get your backend URL first
BACKEND_URL=$(gcloud run services describe asknyc-backend --region us-central1 --format 'value(status.url)')
# Convert https:// to wss:// for WebSocket
WS_URL=$(echo $BACKEND_URL | sed 's/https/wss/')

docker build \
  --build-arg NEXT_PUBLIC_WS_URL=$WS_URL \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token> \
  -t us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/frontend:latest .

docker push us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/frontend:latest

gcloud run deploy asknyc-frontend \
  --image us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/frontend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi
```

### 2c. Update CORS
After frontend deploys, update backend CORS with the frontend URL:
```bash
FRONTEND_URL=$(gcloud run services describe asknyc-frontend --region us-central1 --format 'value(status.url)')
gcloud run services update asknyc-backend \
  --region us-central1 \
  --update-env-vars "CORS_ORIGINS=$FRONTEND_URL"
```

### 2d. Verify end-to-end
1. Open `$FRONTEND_URL/dashboard` in Chrome
2. Should show "BACKEND CONNECTED" with green dot
3. Upload an image, type "can I eat here", click ASK
4. Should see tool badges + data cards + audio response

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
