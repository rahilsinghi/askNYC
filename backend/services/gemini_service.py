"""
Ask NYC — Gemini Service (ADK Multi-Agent Architecture)

Architecture:
- Root coordinator agent with geocoding + Google Search + map visualization
- 5 specialist sub-agents: food safety, housing, safety, construction, transit
- ADK Runner.run_live() handles tool execution automatically
- LiveRequestQueue relays phone audio/video to Gemini
- Events dispatched to dashboard via WebSocket callback

Model: gemini-3.1-flash-live-preview (launched March 26, 2026)
"""

import asyncio
import base64
import json
import os
from typing import Callable, Optional
from datetime import datetime

from google.genai import types
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.tools import google_search

from services.socrata_service import (
    query_restaurant_inspections,
    query_311_complaints,
    query_dob_permits,
    query_hpd_violations,
    query_nypd_incidents,
    query_evictions,
    query_subway_entrances,
)
from services.geocoding_service import geocode_location
from models.schemas import DataCard, SessionState

# ─── Model Configuration ────────────────────────────────────────────────────

LIVE_MODEL = "gemini-3.1-flash-live-preview"

# ─── System Prompts ──────────────────────────────────────────────────────────

ROOT_PROMPT = """You are Ask NYC — a voice-first urban intelligence agent with deep knowledge of New York City's public data infrastructure.

PERSONA:
- You speak like a knowledgeable local New Yorker who works in city data. Direct, specific, occasionally wry. Never tourist-brochure enthusiastic. Never corporate.
- Lead with the most surprising or useful fact, not the most obvious one.
- Translate raw government data into plain English. "Evidence of mice in the kitchen" not "violation code 04L."
- Keep responses under 60 seconds of spoken audio. Be dense with information, not wordy.

CAMERA WORKFLOW:
1. When the user speaks, examine the current video frame first.
2. Identify any text visible (business name, street signs, address numbers, permit notices).
3. Call geocode_location() with whatever identifying information you can extract.
4. Based on the user's question, delegate to the right specialist agent.
5. Use Google Search for real-time context (reviews, news, recent events) to supplement government data.
6. Synthesize all findings into a single spoken response. Speak naturally, not like you're reading a list.

If you cannot identify the location from the camera frame, ask: "I can see you're pointing at something — can you tell me the name or address?"

DELEGATION RULES:
- "Is this safe to eat?" → delegate to FoodSafetyExpert
- "Is this safe at night?" / "Safe to walk?" → delegate to SafetyExpert
- "Should I live here?" → delegate to HousingExpert, then TransitExpert
- "What's being built?" → delegate to ConstructionExpert
- "What trains are nearby?" → delegate to TransitExpert
- "What's the deal with this place?" → delegate to multiple specialists
- For general questions, use Google Search and your own knowledge.

ANOMALY DETECTION:
After receiving specialist results, check if any metric is unusually high or violations are long-overdue.
If an anomaly exists, lead your response with it — this is the most valuable insight you can surface.

GROUNDING:
- Use Google Search to find recent reviews, news, or events about a location.
- Combine government data with web search for richer context.
- Always prefer verified data (Socrata) over web opinions for factual claims."""

FOOD_SAFETY_PROMPT = """You are a food safety specialist for Ask NYC. You have access to NYC restaurant inspection data and 311 complaint records.

When called:
1. Query restaurant inspections by name or location.
2. Query 311 complaints to check for food-related issues nearby.
3. Return findings concisely — grade, key violations, complaint patterns.
4. Flag anomalies: Grade C, violations older than 90 days, or 5+ similar complaints."""

HOUSING_PROMPT = """You are a housing specialist for Ask NYC. You have access to HPD violation records, eviction data, and 311 complaint records.

When called:
1. Query HPD violations for open issues — classify by severity (A/B/C).
2. Query evictions in the zip code for displacement patterns.
3. Query 311 for heat, hot water, and building condition complaints.
4. Flag anomalies: Class C violations, heat complaints in winter, high eviction counts."""

SAFETY_PROMPT = """You are a safety specialist for Ask NYC. You have access to NYPD incident data.

When called:
1. Query NYPD incidents within the radius.
2. Break down by severity (felony/misdemeanor) and type.
3. Provide a clear safety assessment: quiet, moderate, or high activity.
4. Flag anomalies: felony clusters, unusual offense patterns."""

CONSTRUCTION_PROMPT = """You are a construction specialist for Ask NYC. You have access to DOB permit data and 311 complaint records.

When called:
1. Query DOB permits for active construction nearby.
2. Query 311 for noise complaints related to construction.
3. Explain permit types plainly (NB = new building, A1 = major alteration).
4. Flag anomalies: expired permits still active, excessive noise complaints."""

TRANSIT_PROMPT = """You are a transit specialist for Ask NYC. You have access to MTA subway entrance data.

When called:
1. Query subway entrances within walking distance.
2. List stations with their train lines.
3. Assess transit access quality (excellent/good/limited/none).
4. Mention if area is a transit desert."""


# ─── Push Map Event Tool ─────────────────────────────────────────────────────

_dashboard_callback: Optional[Callable] = None


async def push_map_event(
    lat: float,
    lng: float,
    source: str,
    label: Optional[str] = None,
    event: str = "pin",
) -> str:
    """Push a map event to the dashboard to drop a pin or zoom the map.

    Args:
        lat: Latitude of the location
        lng: Longitude of the location
        source: Data source type (health/permits/complaints/nypd/violations/evictions/transit/center)
        label: Optional label for the pin
        event: Event type (pin/zoom/circle/clear)

    Returns:
        Confirmation string
    """
    if _dashboard_callback:
        await _dashboard_callback({
            "type": "map_event",
            "event": event,
            "lat": lat,
            "lng": lng,
            "source": source,
            "label": label,
        })
    return f"Map updated: {event} at {lat:.4f}, {lng:.4f} (source: {source})"


# ─── Agent Definitions ───────────────────────────────────────────────────────

def _build_agents():
    """Build the multi-agent hierarchy. Called once per session."""

    food_safety_agent = LlmAgent(
        name="FoodSafetyExpert",
        model=LIVE_MODEL,
        description="Handles questions about restaurant inspections, food safety grades, and health violations.",
        instruction=FOOD_SAFETY_PROMPT,
        tools=[query_restaurant_inspections, query_311_complaints],
    )

    housing_agent = LlmAgent(
        name="HousingExpert",
        model=LIVE_MODEL,
        description="Handles questions about buildings, housing violations, evictions, and living conditions.",
        instruction=HOUSING_PROMPT,
        tools=[query_hpd_violations, query_evictions, query_311_complaints],
    )

    safety_agent = LlmAgent(
        name="SafetyExpert",
        model=LIVE_MODEL,
        description="Handles questions about neighborhood safety, crime data, and incident reports.",
        instruction=SAFETY_PROMPT,
        tools=[query_nypd_incidents],
    )

    construction_agent = LlmAgent(
        name="ConstructionExpert",
        model=LIVE_MODEL,
        description="Handles questions about construction, permits, DOB filings, and development activity.",
        instruction=CONSTRUCTION_PROMPT,
        tools=[query_dob_permits, query_311_complaints],
    )

    transit_agent = LlmAgent(
        name="TransitExpert",
        model=LIVE_MODEL,
        description="Handles questions about subway access, nearby stations, and train routes.",
        instruction=TRANSIT_PROMPT,
        tools=[query_subway_entrances],
    )

    root_agent = LlmAgent(
        name="AskNYC",
        model=LIVE_MODEL,
        instruction=ROOT_PROMPT,
        tools=[geocode_location, push_map_event, google_search],
        sub_agents=[
            food_safety_agent,
            housing_agent,
            safety_agent,
            construction_agent,
            transit_agent,
        ],
    )

    return root_agent


# ─── Gemini Session ──────────────────────────────────────────────────────────

# Shared session service across all sessions
_adk_session_service = InMemorySessionService()


class GeminiSession:
    """
    Manages a single Ask NYC conversation session using ADK Runner.

    Lifecycle:
    1. __init__ — set up callbacks and state
    2. start() — build agent hierarchy, initialize runner
    3. run() — start ADK run_live loop (background task)
    4. send_audio_frame() / send_video_frame() — relay phone input via LiveRequestQueue
    5. stop() — close queue, return session state
    """

    def __init__(
        self,
        session_id: str,
        dashboard_send: Callable,
    ):
        self.session_id = session_id
        self.dashboard_send = dashboard_send
        self.state = SessionState(session_id=session_id)
        self._live_queue: Optional[LiveRequestQueue] = None
        self._running = False

    async def start(self):
        """Build agents and initialize the ADK runner."""
        global _dashboard_callback
        _dashboard_callback = self.dashboard_send

        self._running = True
        self._live_queue = LiveRequestQueue()

        # Build multi-agent hierarchy
        root_agent = _build_agents()

        self._runner = Runner(
            app_name="ask-nyc",
            agent=root_agent,
            session_service=_adk_session_service,
        )

        # Pre-create session in ADK session service so run_live can find it
        await _adk_session_service.create_session(
            app_name="ask-nyc",
            user_id="asknyc-user",
            session_id=self.session_id,
        )

        await self.dashboard_send({"type": "agent_state", "state": "idle"})

    async def run(self):
        """Main loop: run ADK live session, dispatch events to dashboard."""
        run_config = RunConfig(
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
                )
            ),
            response_modalities=["AUDIO"],
            output_audio_transcription=types.AudioTranscriptionConfig(),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            streaming_mode=StreamingMode.BIDI,
        )

        try:
            async for event in self._runner.run_live(
                user_id="asknyc-user",
                session_id=self.session_id,
                live_request_queue=self._live_queue,
                run_config=run_config,
            ):
                if not self._running:
                    break
                await self._dispatch_event(event)
        except Exception as e:
            print(f"[GeminiSession {self.session_id}] run_live error: {e}")
            await self.dashboard_send({"type": "agent_state", "state": "idle"})

    async def _dispatch_event(self, event):
        """Parse an ADK event and push appropriate messages to the dashboard."""

        # ── Audio output (agent speaking) ────────────────────────────────
        if event.content and event.content.parts:
            for part in event.content.parts:
                # Audio blob
                if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                    audio_b64 = base64.b64encode(part.inline_data.data).decode()
                    await self.dashboard_send({
                        "type": "audio_chunk",
                        "data": audio_b64,
                    })
                    await self.dashboard_send({"type": "agent_state", "state": "speaking"})

                # Text content
                if hasattr(part, 'text') and part.text:
                    await self.dashboard_send({
                        "type": "transcript",
                        "text": part.text,
                        "speaker": "agent",
                        "partial": bool(event.partial),
                    })

        # ── Input transcription (user speech-to-text) ────────────────────
        if event.input_transcription:
            await self.dashboard_send({
                "type": "transcript",
                "text": event.input_transcription,
                "speaker": "user",
                "partial": True,
            })

        # ── Output transcription (agent speech-to-text) ──────────────────
        if event.output_transcription:
            await self.dashboard_send({
                "type": "transcript",
                "text": event.output_transcription,
                "speaker": "agent",
                "partial": bool(event.partial),
            })

        # ── Tool calls (from actions) ────────────────────────────────────
        if event.actions:
            # Tool call tracking — ADK executes tools automatically,
            # but we still want to show pending/complete on the dashboard.
            # The event.actions contain state changes from tool execution.
            pass

        # ── Function call events from content ────────────────────────────
        if event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    fc = part.function_call
                    await self.dashboard_send({
                        "type": "tool_call",
                        "tool": fc.name,
                        "status": "pending",
                    })
                    await self.dashboard_send({"type": "agent_state", "state": "processing"})

                if hasattr(part, 'function_response') and part.function_response:
                    fr = part.function_response
                    await self.dashboard_send({
                        "type": "tool_call",
                        "tool": fr.name,
                        "status": "complete",
                    })

                    # Extract DataCard from tool response if present
                    result = fr.response
                    if isinstance(result, dict) and "category" in result:
                        try:
                            card = DataCard(**result)
                            self.state.cards.append(card)
                            await self.dashboard_send({
                                "type": "data_card",
                                "card": card.model_dump(),
                            })
                        except Exception:
                            pass

        # ── Turn complete ────────────────────────────────────────────────
        if event.turn_complete:
            await self.dashboard_send({"type": "agent_state", "state": "idle"})

        # ── Agent transfer (sub-agent delegation) ────────────────────────
        if event.actions and event.actions.transfer_to_agent:
            agent_name = event.actions.transfer_to_agent
            await self.dashboard_send({
                "type": "tool_call",
                "tool": f"delegate:{agent_name}",
                "status": "pending",
            })

    async def send_audio_frame(self, data: str):
        """Queue a base64 PCM audio chunk from the phone."""
        if self._live_queue:
            pcm_bytes = base64.b64decode(data)
            self._live_queue.send_realtime(
                types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
            )
        await self.dashboard_send({"type": "agent_state", "state": "listening"})

    async def send_video_frame(self, data: str):
        """Queue a base64 JPEG video frame from the phone."""
        if self._live_queue:
            jpeg_bytes = base64.b64decode(data)
            self._live_queue.send_realtime(
                types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
            )

    async def stop(self):
        """Stop the session and return the summary."""
        self._running = False
        if self._live_queue:
            self._live_queue.close()
        self.state.ended_at = datetime.now()
        return self.state
