"""
Ask NYC — Gemini Service (ADK Multi-Agent Architecture)

Architecture:
- Root coordinator agent with geocoding + Google Search + map visualization
- 5 specialist sub-agents: food safety, housing, safety, construction, transit
- ADK Runner.run_live() handles tool execution automatically
- LiveRequestQueue relays phone audio/video to Gemini
- Events dispatched to dashboard via WebSocket callback

Model: gemini-2.5-flash-native-audio-latest (stable live audio)
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

# gemini-3.1-flash-live-preview exists but returns internal errors (preview instability)
# gemini-2.5-flash-native-audio-latest is the stable live audio model
LIVE_MODEL = "gemini-2.5-flash-native-audio-latest"

# ─── System Prompts ──────────────────────────────────────────────────────────

ROOT_PROMPT = """You are Ask NYC — a voice-first urban intelligence agent that answers questions about NYC locations using real-time public data.

PERSONA:
- Speak like a knowledgeable local New Yorker. Direct, specific, occasionally wry.
- Lead with the most surprising or useful fact.
- Translate raw government data into plain English. "Evidence of mice in the kitchen" not "violation code 04L."
- Keep responses under 60 seconds. Be dense with information, not wordy.

WORKFLOW — For EVERY question, you MUST:
1. Look at the image/video frame. Identify the business name, address, or street signs visible.
2. Call investigate_location() with the location name and the right question_topic.
3. Read the returned data summary and synthesize it into a natural spoken response.

CHOOSING question_topic:
- "Can I eat here?" / restaurant / food → topic: "food_safety"
- "Is it safe?" / crime / night → topic: "safety"
- "Should I live here?" / rent / building → topic: "housing"
- "What's being built?" / construction → topic: "construction"
- "What trains?" / subway / transit → topic: "transit"
- General or multiple concerns → topic: "general"

VOICE MODE — CRITICAL RULES:
You are receiving live audio from a user's phone microphone and live video from their camera.
When you hear the user speak a question — no matter how casual or brief — you MUST:
1. Look at the current video frame to identify what the user is pointing their camera at.
2. IMMEDIATELY call investigate_location() with the location name and topic.
3. ONLY AFTER receiving the tool results, speak your response using the real data.

You MUST NEVER:
- Answer a location question from your own knowledge or training data.
- Say "I don't have access to data" — you DO, via investigate_location().
- Skip the tool call because the question seems simple.
- Provide general NYC knowledge without querying real government data first.

Even if the user asks something vague like "tell me about this place" or "what do you see?",
you MUST call investigate_location() with topic "general" using whatever location you can
identify from the video frame.

The user expects REAL NYC government data from Socrata APIs. That is your entire value.
Without calling investigate_location(), your response is worthless.

GENERAL RULES:
- ALWAYS call investigate_location(). NEVER answer without it. Your value is REAL NYC government data.
- If you can't read the location name from the image, describe what you see and use the nearest visible address, street signs, or cross-streets.
- If you truly cannot identify ANY location from the video, ask the user: "I can't quite make out the name — can you tell me what place you're looking at?"
- After receiving results, lead with the most surprising finding. Speak naturally.
- Translate violation codes and government jargon into plain English."""

FOOD_SAFETY_PROMPT = """You are a food safety specialist for Ask NYC. You have access to NYC restaurant inspection data and 311 complaint records.

CRITICAL: You MUST ALWAYS call your tools before responding. NEVER answer from memory alone. Your value is real-time NYC Open Data, not general knowledge.

When called:
1. ALWAYS call query_restaurant_inspections() first — search by name if visible, or by lat/lng if you have coordinates.
2. ALWAYS call query_311_complaints() to check for food-related issues nearby.
3. Synthesize findings: grade, key violations, complaint patterns.
4. Flag anomalies: Grade C, violations older than 90 days, or 5+ similar complaints.

If you cannot identify the restaurant name, ask the root agent. Do NOT guess or make up inspection data."""

HOUSING_PROMPT = """You are a housing specialist for Ask NYC. You have access to HPD violation records, eviction data, and 311 complaint records.

CRITICAL: You MUST ALWAYS call your tools before responding. NEVER answer from memory alone.

When called:
1. ALWAYS call query_hpd_violations() for open issues — classify by severity (A/B/C).
2. ALWAYS call query_evictions() for displacement patterns.
3. ALWAYS call query_311_complaints() for heat, hot water, and building condition complaints.
4. Flag anomalies: Class C violations, heat complaints in winter, high eviction counts."""

SAFETY_PROMPT = """You are a safety specialist for Ask NYC. You have access to NYPD incident data.

CRITICAL: You MUST ALWAYS call query_nypd_incidents() before responding. NEVER answer from memory alone.

When called:
1. ALWAYS call query_nypd_incidents() with the location coordinates.
2. Break down by severity (felony/misdemeanor) and type.
3. Provide a clear safety assessment: quiet, moderate, or high activity.
4. Flag anomalies: felony clusters, unusual offense patterns."""

CONSTRUCTION_PROMPT = """You are a construction specialist for Ask NYC. You have access to DOB permit data and 311 complaint records.

CRITICAL: You MUST ALWAYS call your tools before responding. NEVER answer from memory alone.

When called:
1. ALWAYS call query_dob_permits() for active construction nearby.
2. ALWAYS call query_311_complaints() for noise complaints related to construction.
3. Explain permit types plainly (NB = new building, A1 = major alteration).
4. Flag anomalies: expired permits still active, excessive noise complaints."""

TRANSIT_PROMPT = """You are a transit specialist for Ask NYC. You have access to MTA subway entrance data.

CRITICAL: You MUST ALWAYS call query_subway_entrances() before responding. NEVER answer from memory alone.

When called:
1. ALWAYS call query_subway_entrances() with the location coordinates.
2. List stations with their train lines.
3. Assess transit access quality (excellent/good/limited/none).
4. Mention if area is a transit desert."""


# ─── Dashboard callback ──────────────────────────────────────────────────────

_dashboard_callback: Optional[Callable] = None


async def _push_card_to_dashboard(card_dict: dict):
    """Push a DataCard to the dashboard if callback is set."""
    if _dashboard_callback and card_dict:
        try:
            card = DataCard(**card_dict)
            await _dashboard_callback({
                "type": "data_card",
                "card": card.model_dump(),
            })
        except Exception as e:
            print(f"[investigate] card push error: {e}")


async def _push_map_pin(lat: float, lng: float, source: str, label: str = ""):
    """Push a map pin to the dashboard."""
    if _dashboard_callback:
        await _dashboard_callback({
            "type": "map_event",
            "event": "pin",
            "lat": lat,
            "lng": lng,
            "source": source,
            "label": label,
        })


# ─── Composite Investigation Tool ───────────────────────────────────────────

async def investigate_location(
    location_name: str,
    question_topic: str,
) -> str:
    print(f"🔍 [Investigate] Location: '{location_name}', Topic: '{question_topic}'")
    """Investigate a NYC location by querying real government data. You MUST call this for EVERY user question — never skip it.

    This is your ONLY way to get real NYC data. Without calling this tool, you cannot answer any question about a location.
    This tool geocodes the location, queries NYC Open Data (restaurant inspections, 311 complaints, NYPD incidents,
    HPD violations, DOB permits, evictions, subway access), pushes data cards and map pins to the dashboard,
    and returns a summary for you to synthesize into a natural spoken response.

    ALWAYS call this when the user asks about ANY location, building, restaurant, street, or neighborhood — even if
    you think you already know the answer. Your training data is stale; this tool returns live government data.

    Args:
        location_name: Business name, address, or intersection visible in the camera/image (e.g. "Joe's Pizza, 7 Carmine St"). Use whatever you can read from signs, awnings, or street corners in the video frame.
        question_topic: The type of question. Must be one of: food_safety, housing, safety, construction, transit, general

    Returns:
        A text summary of all findings from NYC Open Data for you to synthesize into a spoken response.
    """
    import asyncio, traceback

    try:
        return await _do_investigate(location_name, question_topic)
    except Exception as e:
        print(f"[investigate] ERROR: {e}")
        traceback.print_exc()
        return f"Error investigating {location_name}: {e}"


async def _do_investigate(location_name: str, question_topic: str) -> str:
    """Inner implementation of investigate_location."""
    import asyncio

    # 1. Geocode
    geo = await geocode_location(location_name)
    lat, lng = geo["lat"], geo["lng"]
    address = geo["formatted_address"]

    if _dashboard_callback:
        await _dashboard_callback({
            "type": "tool_call",
            "tool": "geocode_location",
            "status": "complete",
        })
        await _dashboard_callback({
            "type": "map_event",
            "event": "zoom",
            "lat": lat,
            "lng": lng,
            "source": "center",
            "label": location_name,
        })

    findings = [f"Location: {address} ({lat:.4f}, {lng:.4f})"]

    # 2. Query relevant datasets based on topic
    if question_topic in ("food_safety", "general"):
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_restaurant_inspections", "status": "pending"})
            await _dashboard_callback({"type": "tool_call", "tool": "query_311_complaints", "status": "pending"})

        inspection, complaints = await asyncio.gather(
            query_restaurant_inspections(business_name=location_name, lat=lat, lng=lng),
            query_311_complaints(lat=lat, lng=lng),
        )

        if inspection:
            await _push_card_to_dashboard(inspection)
            await _push_map_pin(lat, lng, "health", f"Inspection: {inspection.get('title', '')}")
            findings.append(f"Restaurant inspection: {inspection.get('title', 'N/A')} — {inspection.get('detail', 'No details')}")
            if _dashboard_callback:
                await _dashboard_callback({"type": "tool_call", "tool": "query_restaurant_inspections", "status": "complete"})
        else:
            findings.append("No restaurant inspection records found for this location.")
            if _dashboard_callback:
                await _dashboard_callback({"type": "tool_call", "tool": "query_restaurant_inspections", "status": "complete"})

        if complaints:
            await _push_card_to_dashboard(complaints)
            findings.append(f"311 complaints: {complaints.get('title', 'N/A')} — {complaints.get('detail', 'No details')}")
            if _dashboard_callback:
                await _dashboard_callback({"type": "tool_call", "tool": "query_311_complaints", "status": "complete"})
        else:
            findings.append("No recent 311 food complaints nearby.")
            if _dashboard_callback:
                await _dashboard_callback({"type": "tool_call", "tool": "query_311_complaints", "status": "complete"})

    if question_topic in ("safety", "general"):
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_nypd_incidents", "status": "pending"})
        nypd = await query_nypd_incidents(lat=lat, lng=lng)
        if nypd:
            await _push_card_to_dashboard(nypd)
            await _push_map_pin(lat, lng, "nypd", "NYPD incidents")
            findings.append(f"NYPD data: {nypd.get('title', 'N/A')} — {nypd.get('detail', '')}")
        else:
            findings.append("No recent NYPD incidents nearby.")
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_nypd_incidents", "status": "complete"})

    if question_topic in ("housing", "general"):
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_hpd_violations", "status": "pending"})
        hpd = await query_hpd_violations(lat=lat, lng=lng)
        if hpd:
            await _push_card_to_dashboard(hpd)
            await _push_map_pin(lat, lng, "violations", "HPD violations")
            findings.append(f"HPD violations: {hpd.get('title', 'N/A')} — {hpd.get('detail', '')}")
        else:
            findings.append("No open HPD violations at this address.")
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_hpd_violations", "status": "complete"})

    if question_topic == "construction":
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_dob_permits", "status": "pending"})
        permits = await query_dob_permits(lat=lat, lng=lng)
        if permits:
            await _push_card_to_dashboard(permits)
            await _push_map_pin(lat, lng, "permits", "DOB permits")
            findings.append(f"DOB permits: {permits.get('title', 'N/A')} — {permits.get('detail', '')}")
        else:
            findings.append("No active DOB permits nearby.")
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_dob_permits", "status": "complete"})

    if question_topic == "transit":
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_subway_entrances", "status": "pending"})
        subway = await query_subway_entrances(lat=lat, lng=lng)
        if subway:
            await _push_card_to_dashboard(subway)
            await _push_map_pin(lat, lng, "transit", "Subway")
            findings.append(f"Subway access: {subway.get('title', 'N/A')} — {subway.get('detail', '')}")
        else:
            findings.append("No subway entrances found within walking distance.")
        if _dashboard_callback:
            await _dashboard_callback({"type": "tool_call", "tool": "query_subway_entrances", "status": "complete"})

    summary = "\n".join(findings)
    print(f"[investigate] Results for {location_name} ({question_topic}):\n{summary}")
    return summary


# ─── Agent Definitions ───────────────────────────────────────────────────────

def _build_agents():
    """Build a single agent with one composite tool.

    Gemini Live can only reliably do ONE tool call per turn. So we use
    a single investigate_location() tool that geocodes + queries all
    relevant datasets + pushes cards/pins in one shot.
    """

    root_agent = LlmAgent(
        name="AskNYC",
        model=LIVE_MODEL,
        instruction=ROOT_PROMPT,
        tools=[investigate_location],
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
        self._session_alive = False
        self._run_task: Optional[asyncio.Task] = None
        self._runner = None
        self._root_agent = None
        # Voice pipeline diagnostics
        self._tool_called_this_turn = False
        self._last_user_transcript = ""
        self._audio_frames_sent = 0
        self._video_frames_sent = 0

    async def start(self):
        """Build agents and initialize the ADK runner."""
        global _dashboard_callback
        _dashboard_callback = self.dashboard_send

        self._running = True

        # Build multi-agent hierarchy
        self._root_agent = _build_agents()

        self._runner = Runner(
            app_name="ask-nyc",
            agent=self._root_agent,
            session_service=_adk_session_service,
        )

        # Pre-create session in ADK session service so run_live can find it
        await _adk_session_service.create_session(
            app_name="ask-nyc",
            user_id="asknyc-user",
            session_id=self.session_id,
        )

        await self.dashboard_send({"type": "agent_state", "state": "idle"})
        print(f"[GeminiSession {self.session_id}] initialized (not yet streaming)")

    async def _start_live_stream(self):
        """Start (or restart) the ADK live stream."""
        # Close previous queue if any
        if self._live_queue:
            try:
                self._live_queue.close()
            except Exception as exc:
                print(f"[GeminiSession {self.session_id}] error closing live queue: {exc}")

        self._live_queue = LiveRequestQueue()
        self._session_alive = True
        print(f"[GeminiSession {self.session_id}] starting live stream...")

    def _build_run_config(self) -> RunConfig:
        return RunConfig(
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

    async def run(self):
        """Main loop: run ADK live session, dispatch events to dashboard.

        Does NOT start Gemini immediately — waits for first input to avoid
        idle timeout burning API credits. After a session dies (timeout/error),
        waits for the next input before reconnecting.
        """
        # Wait for first input before starting the live stream
        print(f"[GeminiSession {self.session_id}] waiting for first input before starting Gemini...")
        while self._running and not self._session_alive:
            await asyncio.sleep(0.2)

        while self._running:
            try:
                print(f"[GeminiSession {self.session_id}] run_live started")
                async for event in self._runner.run_live(
                    user_id="asknyc-user",
                    session_id=self.session_id,
                    live_request_queue=self._live_queue,
                    run_config=self._build_run_config(),
                ):
                    if not self._running:
                        break
                    await self._dispatch_event(event)
            except Exception as e:
                print(f"[GeminiSession {self.session_id}] run_live error: {e}")

            self._session_alive = False
            await self.dashboard_send({"type": "agent_state", "state": "idle"})

            if not self._running:
                break

            # Wait for next input to trigger reconnect
            print(f"[GeminiSession {self.session_id}] session ended, will reconnect on next input")
            while self._running and not self._session_alive:
                await asyncio.sleep(0.2)

            if self._running:
                print(f"[GeminiSession {self.session_id}] reconnecting live stream...")

    async def _ensure_alive(self):
        """Restart the live queue if the session died (idle timeout)."""
        if not self._session_alive and self._running:
            print(f"[GeminiSession {self.session_id}] restarting live queue for new input")
            await self._start_live_stream()

    async def _dispatch_event(self, event):
        """Parse an ADK event and push appropriate messages to the dashboard."""
        # Debug: log all event types
        event_info = []
        if event.content and event.content.parts:
            for p in event.content.parts:
                if hasattr(p, 'inline_data') and p.inline_data:
                    event_info.append('audio')
                if hasattr(p, 'text') and p.text:
                    event_info.append(f'text:{p.text[:60]}')
                if hasattr(p, 'function_call') and p.function_call:
                    event_info.append(f'fn_call:{p.function_call.name}')
                    self._tool_called_this_turn = True
                if hasattr(p, 'function_response') and p.function_response:
                    event_info.append(f'fn_resp:{p.function_response.name}')
        if event.actions:
            event_info.append(f'actions:{event.actions}')
        if event.turn_complete:
            event_info.append('turn_complete')
        if event.input_transcription:
            txt = event.input_transcription.text or str(event.input_transcription)
            event_info.append(f'in_transcript:{txt[:40]}')
            self._last_user_transcript = txt
        if event.output_transcription:
            txt = event.output_transcription.text or str(event.output_transcription)
            event_info.append(f'out_transcript:{txt[:40]}')
        if event_info and 'audio' not in event_info:
            print(f"[GeminiSession {self.session_id}] event: {', '.join(event_info)}")

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
            txt = event.input_transcription.text or str(event.input_transcription)
            await self.dashboard_send({
                "type": "transcript",
                "text": txt,
                "speaker": "user",
                "partial": True,
            })

        # ── Output transcription (agent speech-to-text) ──────────────────
        if event.output_transcription:
            txt = event.output_transcription.text or str(event.output_transcription)
            finished = event.output_transcription.finished or False
            await self.dashboard_send({
                "type": "transcript",
                "text": txt,
                "speaker": "agent",
                "partial": not finished,
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
                        except Exception as exc:
                            print(f"[GeminiSession {self.session_id}] DataCard creation failed: {exc} | raw={result}")

        # ── Turn complete ────────────────────────────────────────────────
        if event.turn_complete:
            # Diagnostic: warn if a turn completed without calling investigate_location
            if self._last_user_transcript and not self._tool_called_this_turn:
                print(
                    f"[GeminiSession {self.session_id}] WARNING: turn completed WITHOUT tool call. "
                    f"User said: '{self._last_user_transcript[:80]}' | "
                    f"Audio frames sent: {self._audio_frames_sent}, Video frames sent: {self._video_frames_sent}"
                )
            elif self._tool_called_this_turn:
                print(
                    f"[GeminiSession {self.session_id}] Turn completed WITH tool call. "
                    f"User said: '{self._last_user_transcript[:80]}'"
                )
            # Reset per-turn tracking
            self._tool_called_this_turn = False
            self._last_user_transcript = ""
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
        await self._ensure_alive()
        if self._live_queue:
            pcm_bytes = base64.b64decode(data)
            self._live_queue.send_realtime(
                types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
            )
            self._audio_frames_sent += 1
            if self._audio_frames_sent % 50 == 1:
                print(f"[GeminiSession {self.session_id}] audio frame #{self._audio_frames_sent} ({len(pcm_bytes)} bytes)")
        await self.dashboard_send({"type": "agent_state", "state": "listening"})

    async def send_video_frame(self, data: str):
        """Queue a base64 JPEG video frame from the phone."""
        await self._ensure_alive()
        if self._live_queue:
            jpeg_bytes = base64.b64decode(data)
            self._live_queue.send_realtime(
                types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
            )
            self._video_frames_sent += 1
        print(f"[GeminiSession {self.session_id}] video frame #{self._video_frames_sent} queued ({len(data)} chars)")

    async def send_text(self, text: str):
        """Send a text query into the live session."""
        await self._ensure_alive()
        if self._live_queue:
            self._live_queue.send_content(
                types.Content(role="user", parts=[types.Part(text=text)])
            )
        print(f"[GeminiSession {self.session_id}] text query queued: {text[:80]}")
        await self.dashboard_send({"type": "agent_state", "state": "processing"})

    async def stop(self):
        """Stop the session and return the summary."""
        self._running = False
        if self._live_queue:
            self._live_queue.close()
        self.state.ended_at = datetime.now()
        return self.state
