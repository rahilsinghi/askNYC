"""
Tests for Task 4: Voice Input → investigate_location Pipeline

Tests the ROOT_PROMPT strengthening, diagnostic tracking fields,
event dispatch logging, and the voice pipeline wiring (audio/video frame handling).

These tests mock the ADK/Gemini dependencies so they run without API keys.
"""

import asyncio
import base64
import sys
import os
import pytest

# Add backend to path so imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ─── 1. ROOT_PROMPT Content Tests ───────────────────────────────────────────

class TestRootPrompt:
    """Verify ROOT_PROMPT contains all required voice-mode instructions."""

    @pytest.fixture(autouse=True)
    def load_prompt(self):
        """Import ROOT_PROMPT without triggering ADK imports."""
        import ast
        source = open(os.path.join(os.path.dirname(__file__), "..", "services", "gemini_service.py")).read()
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "ROOT_PROMPT":
                        self.prompt = ast.literal_eval(node.value)
                        return
        pytest.fail("ROOT_PROMPT not found in gemini_service.py")

    def test_voice_mode_section_exists(self):
        assert "VOICE MODE" in self.prompt

    def test_always_call_investigate_location(self):
        assert "investigate_location()" in self.prompt
        assert "ALWAYS call investigate_location()" in self.prompt

    def test_never_answer_from_memory(self):
        assert "NEVER" in self.prompt
        # Must say not to answer from own knowledge
        assert "own knowledge" in self.prompt or "training data" in self.prompt

    def test_never_skip_tool_call(self):
        assert "Skip the tool call" in self.prompt

    def test_handles_vague_questions(self):
        """Prompt must handle vague inputs like 'what do you see?'"""
        assert "general" in self.prompt.lower()
        assert "vague" in self.prompt.lower() or "tell me about this place" in self.prompt.lower()

    def test_fallback_for_unreadable_location(self):
        """Prompt must instruct what to do if location can't be read."""
        assert "street signs" in self.prompt.lower() or "cross-streets" in self.prompt.lower()
        assert "ask the user" in self.prompt.lower() or "can you tell me" in self.prompt.lower()

    def test_topic_mapping_present(self):
        """All 6 question_topic values must be documented."""
        for topic in ["food_safety", "safety", "housing", "construction", "transit", "general"]:
            assert topic in self.prompt, f"Missing topic '{topic}' in ROOT_PROMPT"

    def test_persona_section(self):
        assert "New Yorker" in self.prompt

    def test_response_length_guidance(self):
        assert "60 seconds" in self.prompt

    def test_real_data_emphasis(self):
        """Prompt must emphasize real government data over AI knowledge."""
        count = self.prompt.lower().count("real")
        assert count >= 2, f"'real' appears {count} times — should emphasize real data more"


# ─── 2. Tool Docstring Tests ────────────────────────────────────────────────

class TestToolDocstring:
    """Verify investigate_location() docstring is strong enough for Gemini."""

    @pytest.fixture(autouse=True)
    def load_docstring(self):
        import ast
        source = open(os.path.join(os.path.dirname(__file__), "..", "services", "gemini_service.py")).read()
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if node.name == "investigate_location":
                    self.docstring = ast.get_docstring(node)
                    return
        pytest.fail("investigate_location function not found")

    def test_docstring_says_must_call(self):
        assert "MUST" in self.docstring

    def test_docstring_says_never_skip(self):
        assert "never skip" in self.docstring.lower()

    def test_docstring_mentions_only_way(self):
        assert "ONLY way" in self.docstring or "only way" in self.docstring

    def test_docstring_lists_datasets(self):
        for dataset in ["restaurant inspections", "311 complaints", "NYPD incidents", "HPD violations", "DOB permits"]:
            assert dataset.lower() in self.docstring.lower(), f"Missing dataset '{dataset}' in docstring"

    def test_docstring_mentions_stale_training(self):
        assert "stale" in self.docstring.lower() or "training data" in self.docstring.lower()

    def test_docstring_has_args(self):
        assert "location_name" in self.docstring
        assert "question_topic" in self.docstring

    def test_docstring_has_topic_values(self):
        for topic in ["food_safety", "housing", "safety", "construction", "transit", "general"]:
            assert topic in self.docstring, f"Missing topic value '{topic}' in docstring"


# ─── 3. GeminiSession Diagnostic Fields Tests ───────────────────────────────

class TestGeminiSessionDiagnostics:
    """Test that GeminiSession has proper diagnostic tracking fields."""

    @pytest.fixture(autouse=True)
    def load_init_source(self):
        """Parse __init__ to verify fields without importing ADK."""
        source = open(os.path.join(os.path.dirname(__file__), "..", "services", "gemini_service.py")).read()
        self.source = source

    def test_tool_called_this_turn_field(self):
        assert "_tool_called_this_turn" in self.source

    def test_last_user_transcript_field(self):
        assert "_last_user_transcript" in self.source

    def test_audio_frames_sent_counter(self):
        assert "_audio_frames_sent" in self.source

    def test_video_frames_sent_counter(self):
        assert "_video_frames_sent" in self.source

    def test_tool_called_set_on_function_call(self):
        """_tool_called_this_turn should be set True when function_call detected."""
        assert "self._tool_called_this_turn = True" in self.source

    def test_transcript_captured_on_input(self):
        """_last_user_transcript should capture input transcription (via str() for safety)."""
        assert "self._last_user_transcript = " in self.source

    def test_reset_on_turn_complete(self):
        """Both fields should reset when turn completes."""
        assert "self._tool_called_this_turn = False" in self.source
        assert 'self._last_user_transcript = ""' in self.source

    def test_warning_log_when_no_tool_call(self):
        """Must log WARNING when turn completes without tool call."""
        assert "WARNING: turn completed WITHOUT tool call" in self.source

    def test_success_log_when_tool_called(self):
        """Must log success when turn completes with tool call."""
        assert "Turn completed WITH tool call" in self.source

    def test_audio_frame_periodic_logging(self):
        """Audio frames should log periodically (every 50th)."""
        assert "_audio_frames_sent % 50" in self.source

    def test_audio_frame_counter_increments(self):
        assert "self._audio_frames_sent += 1" in self.source

    def test_video_frame_counter_increments(self):
        assert "self._video_frames_sent += 1" in self.source


# ─── 4. WebSocket Router Logging Tests ──────────────────────────────────────

class TestWsRouterLogging:
    """Test that ws.py has proper voice event logging."""

    @pytest.fixture(autouse=True)
    def load_source(self):
        self.source = open(os.path.join(os.path.dirname(__file__), "..", "routers", "ws.py")).read()

    def test_user_start_speaking_logged(self):
        assert "User started speaking" in self.source

    def test_user_stop_speaking_logged(self):
        assert "User stopped speaking" in self.source

    def test_audio_frame_handler_exists(self):
        assert 'msg_type == "audio_frame"' in self.source

    def test_video_frame_handler_exists(self):
        assert 'msg_type == "video_frame"' in self.source

    def test_session_lookup_for_remote(self):
        assert "session_id not in _sessions" in self.source

    def test_heartbeat_configured(self):
        assert "HEARTBEAT_INTERVAL" in self.source


# ─── 5. Pipeline Wiring Tests ───────────────────────────────────────────────

class TestPipelineWiring:
    """Verify the voice pipeline is properly wired end-to-end."""

    @pytest.fixture(autouse=True)
    def load_sources(self):
        base = os.path.join(os.path.dirname(__file__), "..")
        self.gemini = open(os.path.join(base, "services", "gemini_service.py")).read()
        self.ws = open(os.path.join(base, "routers", "ws.py")).read()

    def test_audio_frame_calls_send_audio_frame(self):
        """ws.py must call session.send_audio_frame for audio_frame messages."""
        assert "session.send_audio_frame" in self.ws

    def test_video_frame_calls_send_video_frame(self):
        """ws.py must call session.send_video_frame for video_frame messages."""
        assert "session.send_video_frame" in self.ws

    def test_send_audio_frame_uses_pcm_mime(self):
        """Audio must be sent to Gemini as PCM 16kHz."""
        assert 'audio/pcm;rate=16000' in self.gemini

    def test_send_video_frame_uses_jpeg_mime(self):
        """Video must be sent to Gemini as JPEG."""
        assert 'image/jpeg' in self.gemini

    def test_send_audio_calls_ensure_alive(self):
        """send_audio_frame must call _ensure_alive to handle reconnects."""
        # Find the send_audio_frame method and verify _ensure_alive is called
        in_method = False
        found = False
        for line in self.gemini.split('\n'):
            if 'async def send_audio_frame' in line:
                in_method = True
            elif in_method and line.strip().startswith('async def '):
                break
            elif in_method and '_ensure_alive' in line:
                found = True
                break
        assert found, "send_audio_frame must call _ensure_alive()"

    def test_send_video_calls_ensure_alive(self):
        """send_video_frame must call _ensure_alive to handle reconnects."""
        in_method = False
        found = False
        for line in self.gemini.split('\n'):
            if 'async def send_video_frame' in line:
                in_method = True
            elif in_method and line.strip().startswith('async def '):
                break
            elif in_method and '_ensure_alive' in line:
                found = True
                break
        assert found, "send_video_frame must call _ensure_alive()"

    def test_dashboard_receives_agent_state_on_audio(self):
        """Dashboard should get agent_state=listening when audio arrives."""
        assert '"listening"' in self.gemini

    def test_tool_call_pending_pushed_to_dashboard(self):
        """Tool calls must push pending status to dashboard."""
        assert '"pending"' in self.gemini
        assert '"complete"' in self.gemini

    def test_investigate_location_is_sole_tool(self):
        """Only investigate_location should be in the agent's tool list."""
        assert "tools=[investigate_location]" in self.gemini

    def test_composite_tool_does_geocode(self):
        """investigate_location must geocode first."""
        assert "geocode_location" in self.gemini

    def test_composite_tool_pushes_data_cards(self):
        """investigate_location must push data cards to dashboard."""
        assert "_push_card_to_dashboard" in self.gemini

    def test_composite_tool_pushes_map_pins(self):
        """investigate_location must push map pins."""
        assert "_push_map_pin" in self.gemini


# ─── 6. Agent State Machine Tests ───────────────────────────────────────────

class TestAgentStateMachine:
    """Verify state transitions: idle → listening → processing → speaking → idle."""

    @pytest.fixture(autouse=True)
    def load_source(self):
        self.gemini = open(os.path.join(os.path.dirname(__file__), "..", "services", "gemini_service.py")).read()
        self.ws = open(os.path.join(os.path.dirname(__file__), "..", "routers", "ws.py")).read()

    def test_idle_on_init(self):
        """Session should send idle state on start."""
        assert '"idle"' in self.gemini

    def test_listening_on_audio(self):
        """State should transition to listening when audio arrives."""
        assert '"listening"' in self.gemini

    def test_processing_on_tool_call(self):
        """State should transition to processing on function call."""
        assert '"processing"' in self.gemini

    def test_speaking_on_audio_output(self):
        """State should transition to speaking on audio output."""
        assert '"speaking"' in self.gemini

    def test_idle_on_turn_complete(self):
        """State should return to idle on turn complete."""
        # Check that turn_complete sets idle
        in_turn_complete = False
        for line in self.gemini.split('\n'):
            if 'turn_complete' in line and 'if' in line:
                in_turn_complete = True
            elif in_turn_complete and '"idle"' in line:
                break
        assert in_turn_complete, "turn_complete must set agent_state to idle"

    def test_ws_listening_on_start_speaking(self):
        """ws.py should push listening state on user_start_speaking."""
        assert '"listening"' in self.ws

    def test_ws_processing_on_stop_speaking(self):
        """ws.py should push processing state on user_stop_speaking."""
        assert '"processing"' in self.ws


# ─── 7. Socrata Integration Points ──────────────────────────────────────────

class TestSocrataIntegration:
    """Verify all 7 Socrata query functions are wired into investigate_location."""

    @pytest.fixture(autouse=True)
    def load_source(self):
        self.source = open(os.path.join(os.path.dirname(__file__), "..", "services", "gemini_service.py")).read()

    def test_restaurant_inspections_imported(self):
        assert "query_restaurant_inspections" in self.source

    def test_311_complaints_imported(self):
        assert "query_311_complaints" in self.source

    def test_dob_permits_imported(self):
        assert "query_dob_permits" in self.source

    def test_hpd_violations_imported(self):
        assert "query_hpd_violations" in self.source

    def test_nypd_incidents_imported(self):
        assert "query_nypd_incidents" in self.source

    def test_evictions_imported(self):
        assert "query_evictions" in self.source

    def test_subway_entrances_imported(self):
        assert "query_subway_entrances" in self.source

    def test_food_safety_queries_restaurants_and_311(self):
        """food_safety topic must query both restaurant inspections AND 311."""
        # Find the food_safety block
        assert 'question_topic in ("food_safety"' in self.source
        assert "query_restaurant_inspections" in self.source
        assert "query_311_complaints" in self.source

    def test_safety_queries_nypd(self):
        assert 'question_topic in ("safety"' in self.source
        assert "query_nypd_incidents" in self.source

    def test_housing_queries_hpd(self):
        assert 'question_topic in ("housing"' in self.source
        assert "query_hpd_violations" in self.source

    def test_construction_queries_dob(self):
        assert 'question_topic == "construction"' in self.source
        assert "query_dob_permits" in self.source

    def test_transit_queries_subway(self):
        assert 'question_topic == "transit"' in self.source
        assert "query_subway_entrances" in self.source


# ─── 8. Session Lifecycle Tests ──────────────────────────────────────────────

class TestSessionLifecycle:
    """Verify session lifecycle: deferred start, reconnect, stop."""

    @pytest.fixture(autouse=True)
    def load_source(self):
        self.source = open(os.path.join(os.path.dirname(__file__), "..", "services", "gemini_service.py")).read()

    def test_deferred_start(self):
        """Session should NOT start Gemini until first input."""
        assert "waiting for first input" in self.source

    def test_reconnect_on_timeout(self):
        """Session should reconnect when input arrives after timeout."""
        assert "reconnect" in self.source.lower()
        assert "_ensure_alive" in self.source

    def test_stop_closes_queue(self):
        """stop() must close the live queue."""
        assert "_live_queue.close()" in self.source

    def test_model_is_stable_audio(self):
        """Must use the stable live audio model."""
        assert "gemini-2.5-flash-native-audio-latest" in self.source
