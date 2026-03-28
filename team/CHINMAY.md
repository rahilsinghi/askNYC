# Chinmay — Backend Engineer & DevOps

> Heavy lifting: Cloud Run deployment, Vertex AI setup, WebSocket hardening
>
> **Tasks 1-3 DONE.** Cloud Run backend + frontend deployed. Vertex AI enabled. CORS configured.
> Backend: `https://asknyc-backend-901435891859.us-central1.run.app`
> Frontend: `https://asknyc-frontend-901435891859.us-central1.run.app`

---

## Task 1: GCP Setup & API Enablement (Hours 0-2)

**GCP Project:** askNYC (ID: `nth-segment-491623-d2`)
**Email:** rahilsinghi300@gmail.com

### APIs to Enable (Google Cloud Console → APIs & Services → Enable)
1. **Vertex AI API** — for Gemini models via Vertex
2. **Cloud Run Admin API** — for deployment
3. **Cloud Build API** — for building containers
4. **Artifact Registry API** — for storing Docker images
5. **Geocoding API** — for address → lat/lng (already enabled)
6. **Generative Language API** — for Gemini via AI Studio (backup)

### Generate Keys & Service Account
1. **Gemini API Key** (AI Studio — for local dev):
   - Go to https://aistudio.google.com/apikey
   - Create key → add to `backend/.env` as `GOOGLE_API_KEY`

2. **Service Account** (for Cloud Run → Vertex AI):
   ```bash
   gcloud iam service-accounts create asknyc-backend \
     --display-name="Ask NYC Backend"

   gcloud projects add-iam-policy-binding nth-segment-491623-d2 \
     --member="serviceAccount:asknyc-backend@nth-segment-491623-d2.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

3. **Maps API Key** (for geocoding):
   - Console → APIs & Services → Credentials → Create API Key
   - Restrict to Geocoding API only
   - Add to `backend/.env` as `GOOGLE_MAPS_API_KEY`

---

## Task 2: Cloud Run Deployment — Backend (Hours 2-4)

### Update Dockerfile
```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV PORT=8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
```

### Deploy
```bash
cd backend

# Enable Artifact Registry
gcloud artifacts repositories create asknyc \
  --repository-format=docker \
  --location=us-central1

# Build
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend

# Deploy
gcloud run deploy ask-nyc-backend \
  --image us-central1-docker.pkg.dev/nth-segment-491623-d2/asknyc/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --timeout 3600 \
  --concurrency 100 \
  --min-instances 1 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --service-account asknyc-backend@nth-segment-491623-d2.iam.gserviceaccount.com \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=TRUE,GOOGLE_CLOUD_PROJECT=nth-segment-491623-d2,GOOGLE_CLOUD_LOCATION=us-central1,SOCRATA_APP_TOKEN=0SE7BJ0CvQoInAFXHJW7B8VLH,CORS_ORIGINS=https://ask-nyc.vercel.app"
```

### Verify
```bash
# Get URL
gcloud run services describe ask-nyc-backend --region us-central1 --format='value(status.url)'

# Test health
curl https://YOUR-URL/health
```

### Critical Settings
- `--min-instances 1` — keeps one warm (no cold start during demo)
- `--timeout 3600` — allows 60-min WebSocket sessions
- `--concurrency 100` — multiple concurrent WebSocket connections per instance
- Service account has `roles/aiplatform.user` for Vertex AI access

---

## Task 3: Frontend Vercel Deployment (Hours 4-6)

1. Push repo to GitHub
2. Go to vercel.com → Import Project
3. Set environment variables:
   ```
   NEXT_PUBLIC_WS_URL=wss://YOUR-CLOUD-RUN-URL
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
   ```
4. Deploy
5. Add Vercel URL to Cloud Run CORS:
   ```bash
   gcloud run services update ask-nyc-backend \
     --region us-central1 \
     --update-env-vars "CORS_ORIGINS=https://ask-nyc.vercel.app,http://localhost:3000"
   ```

---

## Task 4: WebSocket Hardening (Hours 6-10)

### 4a. Reconnection with Exponential Backoff

Update `routers/ws.py`:
```python
# Add heartbeat to detect stale connections
async def _heartbeat(ws: WebSocket, interval: int = 30):
    while True:
        try:
            await asyncio.sleep(interval)
            await ws.send_json({"type": "pong"})
        except Exception:
            break
```

### 4b. Graceful Error Handling
- Catch `WebSocketDisconnect` exceptions
- Clean up GeminiSession on disconnect
- Send `session_complete` before closing
- Log all errors with structured logging

### 4c. CORS Validation
- Verify WebSocket upgrade requests come from allowed origins
- Add rate limiting per IP (simple counter, 10 connections/minute)

---

## Task 5: Session Persistence (Hours 8-10)

Replace in-memory session store with JSON file:

```python
# services/session_service.py
import json
from pathlib import Path

SESSIONS_FILE = Path("/tmp/asknyc_sessions.json")

class SessionService:
    def __init__(self):
        self.sessions = {}
        self._load()

    def _load(self):
        if SESSIONS_FILE.exists():
            self.sessions = json.loads(SESSIONS_FILE.read_text())

    def _save(self):
        SESSIONS_FILE.write_text(json.dumps(self.sessions, default=str))

    def save_session(self, session):
        self.sessions[session.session_id] = session.dict()
        self._save()
```

On Cloud Run, `/tmp` persists within an instance's lifetime. For true persistence across restarts, use Firestore (but JSON file is fine for hackathon).

---

## Task 6: Health Check Enhancement (Hours 10-12)

```python
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ask-nyc",
        "version": "2.0.0",
        "gemini_model": "gemini-3.1-flash-live-preview",
        "datasets": 7,
        "vertex_ai": os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "FALSE"),
        "active_sessions": len(_sessions),
    }
```

---

## Files You Own

| File | Action |
|------|--------|
| `backend/Dockerfile` | UPDATE — optimize for Cloud Run |
| `backend/routers/ws.py` | UPDATE — reconnection, error handling |
| `backend/services/session_service.py` | UPDATE — JSON persistence |
| `backend/main.py` | UPDATE — health endpoint, structured logging |
| Cloud Run deployment | NEW — full pipeline |
| Vercel deployment | NEW — frontend hosting |

---

## Definition of Done

- [ ] Backend deployed to Cloud Run, accessible via HTTPS
- [ ] Frontend deployed to Vercel, connected to Cloud Run backend
- [ ] WebSocket works over wss:// (not just ws://)
- [ ] Phone camera works over HTTPS (Cloud Run provides this)
- [ ] /health returns version, model, dataset count
- [ ] Sessions persist across WebSocket disconnects
- [ ] Reconnection handles network drops gracefully
- [ ] `--min-instances 1` set (no cold start during demo)
