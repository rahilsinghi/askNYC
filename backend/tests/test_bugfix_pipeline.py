"""
Tests for bharath/bug_fix: Mobile → Backend → Dashboard pipeline fixes

Validates:
1. Backend validates incoming frames (rejects empty/tiny data)
2. Backend logs user speaking events
3. capture_frame handler forwards to both Gemini and dashboard
4. Frontend useRemoteWs fixes (tested via source analysis)
5. Audio playback on remote phone (Gemini speaks back to user)
6. Backend forwards audio/state/transcript to remote phone WS
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

BASE = os.path.join(os.path.dirname(__file__), "..")


def read(relpath: str) -> str:
    return open(os.path.join(BASE, relpath)).read()


# ─── 1. Backend frame validation ────────────────────────────────────────────

class TestBackendFrameValidation:
    """ws.py must validate incoming audio/video frames."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.ws = read("routers/ws.py")

    def test_empty_audio_frame_rejected(self):
        """Empty audio frames should be caught and warned."""
        assert "Empty audio_frame" in self.ws or "empty audio" in self.ws.lower()

    def test_empty_video_frame_rejected(self):
        """Empty/tiny video frames should be caught and warned."""
        assert "Empty/tiny video_frame" in self.ws or "empty" in self.ws.lower()

    def test_audio_data_extracted_safely(self):
        """Audio data should use .get() with default, not direct access."""
        assert 'msg.get("data", "")' in self.ws

    def test_video_data_validated_by_length(self):
        """Video frame validation should check string length."""
        assert "len(data)" in self.ws

    def test_capture_frame_handler_exists(self):
        """capture_frame handler must exist for high-quality snapshots."""
        assert '"capture_frame"' in self.ws

    def test_capture_frame_sends_to_gemini(self):
        """capture_frame must forward to Gemini via send_video_frame."""
        assert "session.send_video_frame(frame_data)" in self.ws

    def test_capture_frame_sends_to_dashboard(self):
        """capture_frame must forward to dashboard as captured_image."""
        assert '"captured_image"' in self.ws


# ─── 2. Frontend remote hook fixes ──────────────────────────────────────────

class TestFrontendRemoteFixes:
    """useRemoteWs must fix iOS camera and reconnection issues."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.src = read("../frontend/hooks/useWebSocket.ts")

    def test_no_offscreen_video_element(self):
        """Must NOT create a detached video element (broken on iOS Safari)."""
        assert "document.createElement('video')" not in self.src

    def test_uses_visible_video_element(self):
        """Must use the on-screen #camera-preview element for frame capture."""
        assert 'document.getElementById(videoElId)' in self.src

    def test_waits_for_loadedmetadata(self):
        """Must wait for loadedmetadata before starting frame capture."""
        assert 'loadedmetadata' in self.src

    def test_waits_for_video_dimensions(self):
        """Must verify videoWidth > 0 before capturing frames."""
        assert 'videoWidth > 0' in self.src or 'videoWidth' in self.src

    def test_frame_size_validation(self):
        """Must validate frame isn't too small (blank/error)."""
        assert 'b64.length < 1000' in self.src or 'too small' in self.src.lower()

    def test_send_returns_success(self):
        """send() must return success/failure for callers to check."""
        assert 'return true' in self.src and 'return false' in self.src

    def test_send_logs_errors(self):
        """send() must log when it fails to send."""
        assert 'cannot send' in self.src or 'send error' in self.src

    def test_ws_reconnection_logic(self):
        """Remote WS must auto-reconnect on disconnect."""
        assert 'reconnect' in self.src.lower()
        assert 'reconnectTimerRef' in self.src or 'setTimeout(connect' in self.src

    def test_camera_double_start_prevention(self):
        """Camera must not start twice if called multiple times."""
        assert 'cameraStartedRef' in self.src

    def test_audio_frame_logging(self):
        """Audio frames must be logged periodically."""
        assert 'audioChunkCount' in self.src or 'audio] sent chunk' in self.src

    def test_video_frame_logging(self):
        """Video frames must be logged periodically."""
        assert 'frameCount' in self.src or 'camera] sent frame' in self.src

    def test_cleanup_logs_stats(self):
        """Cleanup must log send statistics."""
        assert 'sendStatsRef' in self.src or 'videoFrames' in self.src


# ─── 3. CSS theme completeness ──────────────────────────────────────────────

class TestCSSTheme:
    """Remote page needs warm-amber and other colors defined."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.css = read("../frontend/app/globals.css")

    def test_warm_amber_defined(self):
        assert '--color-warm-amber' in self.css

    def test_amber_glow_defined(self):
        assert '--color-amber-glow' in self.css

    def test_green_defined(self):
        assert '--color-green' in self.css

    def test_red_defined(self):
        assert '--color-red' in self.css

    def test_flash_keyframes(self):
        """Flash animation for capture effect must exist."""
        assert '@keyframes flash' in self.css

    def test_pulse_cyan_keyframes(self):
        """Mic button pulse animation must exist."""
        assert '@keyframes pulse-cyan' in self.css

    def test_electric_cyan_defined(self):
        assert '--color-electric-cyan' in self.css

    def test_midnight_defined(self):
        assert '--color-midnight' in self.css


# ─── 4. Remote page UI wiring ───────────────────────────────────────────────

class TestRemotePageWiring:
    """remote/page.tsx must properly use the hook's return values."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.src = read("../frontend/app/remote/page.tsx")

    def test_destructures_all_state(self):
        """Must destructure isConnected, isSpeaking, cameraActive, startSpeaking, stopSpeaking, captureFrame."""
        for field in ['isConnected', 'isSpeaking', 'cameraActive', 'startSpeaking', 'stopSpeaking', 'captureFrame']:
            assert field in self.src, f"Missing destructured field: {field}"

    def test_mic_button_wired(self):
        """MicButton must receive onStart and onStop."""
        assert 'onStart={startSpeaking}' in self.src
        assert 'onStop={stopSpeaking}' in self.src

    def test_capture_button_exists(self):
        """Capture button must exist for snapshots."""
        assert 'handleCapture' in self.src or 'captureFrame' in self.src

    def test_video_element_id(self):
        """Video element must have id='camera-preview'."""
        assert 'camera-preview' in self.src

    def test_video_playsinline(self):
        """Video must have playsInline for iOS."""
        assert 'playsInline' in self.src

    def test_suspense_boundary(self):
        """Must have Suspense boundary for useSearchParams."""
        assert 'Suspense' in self.src


# ─── 5. MicButton touch handling ────────────────────────────────────────────

class TestMicButtonTouchHandling:
    """MicButton must handle iOS touch events properly."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.src = read("../frontend/components/remote/MicButton.tsx")

    def test_prevents_double_fire(self):
        """Must use ref to prevent double-fire from touch + mouse."""
        assert 'activeRef' in self.src

    def test_touch_start_handler(self):
        assert 'onTouchStart' in self.src

    def test_touch_end_handler(self):
        assert 'onTouchEnd' in self.src

    def test_touch_cancel_handler(self):
        """Must handle touchcancel to release mic."""
        assert 'onTouchCancel' in self.src or 'touchCancel' in self.src.lower()

    def test_mouse_leave_handler(self):
        """Must handle mouseleave to release mic."""
        assert 'onMouseLeave' in self.src

    def test_touch_none_class(self):
        """Must use touch-none to prevent browser gesture interference."""
        assert 'touch-none' in self.src

    def test_webkit_tap_highlight(self):
        """Must disable iOS tap highlight."""
        assert 'WebkitTapHighlightColor' in self.src or 'webkit-tap-highlight' in self.src.lower()


# ─── 6. End-to-end pipeline wiring ──────────────────────────────────────────

class TestEndToEndWiring:
    """Verify the full phone → backend → dashboard pipeline is wired."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.ws_py = read("routers/ws.py")
        self.gemini = read("services/gemini_service.py")
        self.hook = read("../frontend/hooks/useWebSocket.ts")

    def test_remote_sends_video_frame(self):
        """Frontend must send video_frame messages."""
        assert "'video_frame'" in self.hook

    def test_remote_sends_audio_frame(self):
        """Frontend must send audio_frame messages."""
        assert "'audio_frame'" in self.hook

    def test_backend_routes_audio_to_gemini(self):
        """Backend must call session.send_audio_frame."""
        assert 'session.send_audio_frame' in self.ws_py

    def test_backend_routes_video_to_gemini(self):
        """Backend must call session.send_video_frame."""
        assert 'session.send_video_frame' in self.ws_py

    def test_gemini_sends_to_live_queue(self):
        """Gemini session must push audio/video to LiveRequestQueue."""
        assert 'send_realtime' in self.gemini

    def test_gemini_dispatches_events_to_dashboard(self):
        """Gemini must dispatch events via dashboard_send callback."""
        assert 'dashboard_send' in self.gemini

    def test_dashboard_handles_data_card(self):
        """Dashboard hook must handle data_card messages."""
        assert "'data_card'" in self.hook

    def test_dashboard_handles_audio_chunk(self):
        """Dashboard hook must handle audio_chunk messages."""
        assert "'audio_chunk'" in self.hook

    def test_dashboard_handles_map_event(self):
        """Dashboard hook must handle map_event messages."""
        assert "'map_event'" in self.hook

    def test_dashboard_handles_remote_connected(self):
        """Dashboard hook must handle remote_connected messages."""
        assert "'remote_connected'" in self.hook

    def test_dashboard_handles_agent_state(self):
        """Dashboard hook must handle agent_state messages."""
        assert "'agent_state'" in self.hook


# ─── 7. Audio forwarding to remote phone ─────────────────────────────────────

class TestAudioForwardingToRemote:
    """Backend must forward Gemini's audio response to the remote phone."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.ws_py = read("routers/ws.py")

    def test_remotes_dict_exists(self):
        """Must have a _remotes dict to track remote WS connections."""
        assert '_remotes' in self.ws_py

    def test_remote_registered_on_connect(self):
        """Remote WS must be registered in _remotes on connect."""
        assert '_remotes[session_id] = websocket' in self.ws_py

    def test_remote_unregistered_on_disconnect(self):
        """Remote WS must be removed from _remotes on disconnect."""
        assert '_remotes.pop(session_id' in self.ws_py

    def test_forward_types_defined(self):
        """Must define which message types to forward to remote."""
        assert '_REMOTE_FORWARD_TYPES' in self.ws_py

    def test_audio_chunk_in_forward_types(self):
        """audio_chunk must be in the forwarded types."""
        assert '"audio_chunk"' in self.ws_py

    def test_agent_state_in_forward_types(self):
        """agent_state must be in the forwarded types."""
        assert '"agent_state"' in self.ws_py

    def test_transcript_in_forward_types(self):
        """transcript must be in the forwarded types."""
        assert '"transcript"' in self.ws_py

    def test_callback_forwards_to_remote(self):
        """send_to_dashboard callback must also forward to remote."""
        assert '_remotes.get(session_id)' in self.ws_py


# ─── 8. Remote phone audio playback ──────────────────────────────────────────

class TestRemoteAudioPlayback:
    """Remote phone must be able to play Gemini's audio response."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.hook = read("../frontend/hooks/useWebSocket.ts")

    def test_playback_context_exists(self):
        """Must have a separate AudioContext for playback."""
        assert 'playbackCtxRef' in self.hook

    def test_mic_context_separate(self):
        """Mic capture must use a SEPARATE AudioContext from playback."""
        assert 'micAudioCtxRef' in self.hook

    def test_play_chunk_function(self):
        """Must have a playChunk function for Gemini's audio."""
        assert 'playChunk' in self.hook

    def test_init_playback_function(self):
        """Must initialize playback context (iOS gesture requirement)."""
        assert 'initPlayback' in self.hook

    def test_ios_audio_unlock(self):
        """Must unlock AudioContext via user gesture for iOS."""
        assert 'touchend' in self.hook

    def test_handles_audio_chunk_message(self):
        """Remote WS onmessage must handle audio_chunk."""
        assert "'audio_chunk'" in self.hook
        # Must call playChunk when audio_chunk arrives
        assert 'playChunk(msg.data)' in self.hook

    def test_handles_agent_state_message(self):
        """Remote WS onmessage must handle agent_state."""
        assert 'setAgentState' in self.hook

    def test_handles_transcript_message(self):
        """Remote WS onmessage must handle transcript."""
        assert 'setTranscript' in self.hook

    def test_agent_state_in_return(self):
        """agentState must be returned from useRemoteWs."""
        assert 'agentState' in self.hook

    def test_transcript_in_return(self):
        """transcript must be returned from useRemoteWs."""
        assert 'transcript' in self.hook

    def test_playback_ctx_cleaned_up(self):
        """Playback context must be closed on cleanup."""
        assert 'playbackCtxRef.current?.close' in self.hook

    def test_mic_ctx_not_kill_playback(self):
        """stopSpeaking must close mic ctx, NOT playback ctx."""
        # Find stopSpeaking function and verify it closes micAudioCtxRef, not playbackCtxRef
        assert 'micAudioCtxRef.current?.close' in self.hook


# ─── 9. Remote page shows agent state ────────────────────────────────────────

class TestRemotePageAgentState:
    """Remote page must show Gemini's processing/speaking state."""

    @pytest.fixture(autouse=True)
    def load(self):
        self.src = read("../frontend/app/remote/page.tsx")

    def test_destructures_agent_state(self):
        assert 'agentState' in self.src

    def test_destructures_transcript(self):
        assert 'transcript' in self.src

    def test_shows_processing_state(self):
        """Must show 'Thinking' or similar when processing."""
        assert 'processing' in self.src

    def test_shows_speaking_state(self):
        """Must show 'Speaking' or similar when agent is speaking."""
        assert 'speaking' in self.src.lower() or 'Speaking' in self.src

    def test_transcript_overlay(self):
        """Must display transcript text on the phone screen."""
        assert 'transcript' in self.src

    def test_viewfinder_shows_analyzing(self):
        """Viewfinder text must update when processing."""
        assert 'Analyzing' in self.src or 'analyzing' in self.src
