"""
Ask NYC — WebSocket Router

Two WebSocket endpoints:
  /ws/dashboard  — The main screen connects here. Receives all events.
  /ws/remote     — The phone connects here. Sends audio + video.

One GeminiSession per dashboard connection.
Remote and dashboard share a session_id to link them.
"""

import asyncio
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
from services.gemini_service import GeminiSession
from services.session_service import SessionService

router = APIRouter()

# Active sessions: session_id → GeminiSession
_sessions: dict[str, GeminiSession] = {}

# Active dashboard WebSockets: session_id → WebSocket
_dashboards: dict[str, WebSocket] = {}


# ─── Dashboard WebSocket ──────────────────────────────────────────────────────

@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket, request: Request):
    """
    The main Ask NYC dashboard connects here.

    On connect: creates a new GeminiSession, returns session_id + QR URL.
    Receives: nothing (dashboard is output-only for now)
    Sends: all event types (audio_chunk, data_card, map_event, etc.)
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())[:8]  # short ID for QR URL
    _dashboards[session_id] = websocket

    # Dashboard-to-Gemini callback
    async def send_to_dashboard(message: dict):
        try:
            await websocket.send_json(message)
        except Exception:
            pass  # Dashboard disconnected — suppress

    # Create and start Gemini session
    session = GeminiSession(
        session_id=session_id,
        dashboard_send=send_to_dashboard,
    )
    await session.start()
    _sessions[session_id] = session

    # Tell dashboard its session_id and the remote URL
    await websocket.send_json({
        "type": "session_ready",
        "session_id": session_id,
        "remote_url": f"/remote?session={session_id}",
    })

    # Start Gemini session loop in background
    gemini_task = asyncio.create_task(session.run())

    try:
        while True:
            # Keep connection alive — dashboard sends pings only
            data = await websocket.receive_text()
            msg = json.loads(data)

            # Handle dashboard-initiated requests (e.g. manual query)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    finally:
        gemini_task.cancel()
        state = await session.stop()

        # Save to session store
        session_service: SessionService = request.app.state.session_service
        session_service.save(state)

        _sessions.pop(session_id, None)
        _dashboards.pop(session_id, None)
        print(f"Dashboard disconnected: session {session_id}")


# ─── Remote WebSocket ─────────────────────────────────────────────────────────

@router.websocket("/ws/remote")
async def remote_ws(websocket: WebSocket, session_id: str = None):
    """
    The phone remote connects here with ?session_id=XXXX from the QR code.

    Receives: video_frame, audio_frame, user_start_speaking, user_stop_speaking
    Sends: connection status only
    """
    await websocket.accept()

    if not session_id or session_id not in _sessions:
        await websocket.send_json({
            "type": "error",
            "message": f"Session '{session_id}' not found. Scan the QR code from the main dashboard.",
        })
        await websocket.close()
        return

    session = _sessions[session_id]

    await websocket.send_json({
        "type": "remote_connected",
        "session_id": session_id,
        "message": "Connected to Ask NYC. Hold the button and speak.",
    })

    # Also tell the dashboard the remote connected
    dashboard = _dashboards.get(session_id)
    if dashboard:
        try:
            await dashboard.send_json({"type": "remote_connected"})
        except Exception:
            pass

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "audio_frame":
                await session.send_audio_frame(msg["data"])

            elif msg_type == "video_frame":
                await session.send_video_frame(msg["data"])

            elif msg_type == "user_start_speaking":
                dashboard = _dashboards.get(session_id)
                if dashboard:
                    try:
                        await dashboard.send_json({"type": "agent_state", "state": "listening"})
                    except Exception:
                        pass

            elif msg_type == "user_stop_speaking":
                dashboard = _dashboards.get(session_id)
                if dashboard:
                    try:
                        await dashboard.send_json({"type": "agent_state", "state": "processing"})
                    except Exception:
                        pass

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    finally:
        print(f"Remote disconnected: session {session_id}")
        dashboard = _dashboards.get(session_id)
        if dashboard:
            try:
                await dashboard.send_json({"type": "remote_disconnected"})
            except Exception:
                pass
