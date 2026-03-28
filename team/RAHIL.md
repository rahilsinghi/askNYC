# Rahil — Backend Architect & Lead

> Heavy lifting: ADK rewrite, multi-agent architecture, Gemini Live pipeline

---

## Task 1: Rewrite gemini_service.py to Use ADK Properly (Hours 0-4)

**Current problem:** Code imports `google.adk` but doesn't use it. Manual tool dispatch, manual session management, manual function declarations. Judges will see this isn't real ADK usage.

**Target:** Use `Runner.run_live()` + `LiveRequestQueue` pattern.

### Step 1: Update requirements.txt
```
google-adk>=1.27.0    # was ==1.0.0
google-genai>=1.14.0  # keep as-is
```

### Step 2: Switch model ID
```python
# OLD (DEPRECATED - may stop working anytime)
model = "gemini-live-2.5-flash-native-audio"

# NEW (launched March 26, 2026)
model = "gemini-3.1-flash-live-preview"
```

### Step 3: Rewrite GeminiSession using ADK Runner

```python
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.genai import types

class GeminiSession:
    def __init__(self, session_id, dashboard_send):
        self.session_id = session_id
        self.dashboard_send = dashboard_send
        self.live_queue = LiveRequestQueue()

        # ADK handles tool execution automatically
        self.agent = LlmAgent(
            name="ask_nyc",
            model="gemini-3.1-flash-live-preview",
            instruction=SYSTEM_PROMPT,
            tools=[
                geocode_location,
                query_restaurant_inspections,
                query_311_complaints,
                query_dob_permits,
                query_hpd_violations,
                query_nypd_incidents,
                query_evictions,
                query_subway_entrances,
                push_map_event,  # special tool for dashboard
            ],
            # sub_agents added in Task 2
        )

        self.runner = Runner(
            app_name="ask-nyc",
            agent=self.agent,
            session_service=InMemorySessionService(),
        )

    async def run(self):
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
                )
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )

        async for event in self.runner.run_live(
            user_id="asknyc-user",
            session_id=self.session_id,
            live_request_queue=self.live_queue,
            run_config=run_config,
        ):
            # ADK yields events — dispatch to dashboard
            await self._dispatch_event(event)

    async def send_audio(self, pcm_bytes: bytes):
        self.live_queue.send_realtime(
            types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
        )

    async def send_video(self, jpeg_bytes: bytes):
        self.live_queue.send_realtime(
            types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
        )

    async def _dispatch_event(self, event):
        # Parse ADK event and push appropriate messages to dashboard
        # Audio chunks, transcripts, tool calls, etc.
        pass  # implement based on ADK event structure
```

### Step 4: Remove manual dispatch code
- Delete `_fn_decl()` helper
- Delete `_execute_tool()` dispatch
- Delete manual `types.FunctionDeclaration` building

---

## Task 2: Multi-Agent Architecture (Hours 4-8)

**Why:** Judges evaluate "Agent Architecture" (30%). Multi-agent is the strongest differentiator.

```python
from google.adk.agents import LlmAgent

food_safety_agent = LlmAgent(
    name="FoodSafetyExpert",
    model="gemini-3.1-flash-live-preview",
    description="Handles restaurant inspections, food safety grades, health violations.",
    instruction="You specialize in NYC restaurant and food safety data. Be direct about health risks.",
    tools=[query_restaurant_inspections, query_311_complaints],
)

housing_agent = LlmAgent(
    name="HousingExpert",
    model="gemini-3.1-flash-live-preview",
    description="Handles building violations, evictions, housing conditions.",
    instruction="You specialize in NYC housing data. Flag Class C violations immediately.",
    tools=[query_hpd_violations, query_evictions, query_311_complaints],
)

safety_agent = LlmAgent(
    name="SafetyExpert",
    model="gemini-3.1-flash-live-preview",
    description="Handles neighborhood safety, crime data, incident reports.",
    instruction="You specialize in NYC safety data. Distinguish felonies from misdemeanors clearly.",
    tools=[query_nypd_incidents],
)

construction_agent = LlmAgent(
    name="ConstructionExpert",
    model="gemini-3.1-flash-live-preview",
    description="Handles permits, construction activity, DOB filings.",
    instruction="You specialize in NYC construction data. Explain permit types plainly.",
    tools=[query_dob_permits],
)

transit_agent = LlmAgent(
    name="TransitExpert",
    model="gemini-3.1-flash-live-preview",
    description="Handles subway access, nearby stations, train routes.",
    instruction="You specialize in NYC transit data. Name specific train lines.",
    tools=[query_subway_entrances],
)

# Root agent coordinates and delegates
root_agent = LlmAgent(
    name="AskNYC",
    model="gemini-3.1-flash-live-preview",
    instruction=SYSTEM_PROMPT,
    tools=[geocode_location, google_search, push_map_event],
    sub_agents=[food_safety_agent, housing_agent, safety_agent, construction_agent, transit_agent],
)
```

---

## Task 3: Google Search Grounding (Hours 4-6)

```python
from google.adk.tools import google_search

# Just add to root agent's tools list
root_agent = LlmAgent(
    ...
    tools=[geocode_location, google_search, push_map_event],
    ...
)
```

Update system prompt to include:
```
GROUNDING:
- Use Google Search to find recent reviews, news, or events about a location.
- Combine Socrata government data with web search results for richer answers.
- Example: "Joe's Pizza has a Grade A from the health department. Google reviews mention it's been crowded since the Netflix documentary."
```

---

## Task 4: End-to-End Testing (Hours 6-10)

1. Set GOOGLE_API_KEY, start backend
2. Open /dashboard in browser
3. Open /remote on phone (needs HTTPS — use ngrok or deployed Cloud Run)
4. Point phone at a restaurant → speak "What's this place?"
5. Verify: audio streams to Gemini → tools fire → cards appear → voice response plays
6. Test all 3 demo scenarios with real data
7. Measure latency: target <2s from question to first audio response

---

## Task 5: Fix Audio Pipeline Issues (Hours 8-12)

Known risks:
- Phone sends WebM/Opus (via MediaRecorder), but Gemini wants raw PCM 16kHz
- May need to decode WebM to PCM on backend before forwarding
- Dashboard audio playback: verify 24kHz PCM decoding works in all browsers
- iOS Safari requires user gesture before AudioContext — MicButton already serves this purpose

---

## Files You Own

| File | Action |
|------|--------|
| `backend/services/gemini_service.py` | REWRITE — ADK Runner pattern |
| `backend/requirements.txt` | UPDATE — google-adk>=1.27.0 |
| `backend/routers/ws.py` | UPDATE — adapt to new GeminiSession API |
| `backend/models/schemas.py` | UPDATE if needed for new event types |
| `backend/services/socrata_service.py` | DONE — 7 tools verified |

---

## Definition of Done

- [ ] ADK Runner.run_live() replaces manual Gemini Live connection
- [ ] Multi-agent: 5 specialists + root coordinator
- [ ] Google Search grounding active
- [ ] Model is gemini-3.1-flash-live-preview
- [ ] End-to-end: phone camera → voice answer with data cards
- [ ] Audio latency < 2 seconds
- [ ] All 7 Socrata tools fire correctly through ADK
