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
import logging
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.gemini_service import GeminiSession
from services.session_service import SessionService

logger = logging.getLogger(__name__)

router = APIRouter()

# Active sessions: session_id → GeminiSession
_sessions: dict[str, GeminiSession] = {}

# Active dashboard WebSockets: session_id → WebSocket
_dashboards: dict[str, WebSocket] = {}

# Session service reference (set from app lifespan)
_session_service: SessionService | None = None

HEARTBEAT_INTERVAL = 25  # seconds


# ─── Heartbeat ───────────────────────────────────────────────────────────────

async def _heartbeat(ws: WebSocket, label: str):
    """Send periodic pongs to keep the WebSocket alive through proxies/load balancers."""
    try:
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            await ws.send_json({"type": "pong"})
    except Exception:
        logger.debug("Heartbeat stopped for %s", label)


# ─── Dashboard WebSocket ──────────────────────────────────────────────────────

@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    """
    The main Ask NYC dashboard connects here.

    On connect: creates a new GeminiSession, returns session_id + QR URL.
    Receives: ping, dashboard_query (image upload + text)
    Sends: all event types (audio_chunk, data_card, map_event, etc.)
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())[:8]  # short ID for QR URL
    _dashboards[session_id] = websocket
    logger.info("Dashboard connected: session %s", session_id)

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

    # Start Gemini session loop and heartbeat in background
    gemini_task = asyncio.create_task(session.run())
    heartbeat_task = asyncio.create_task(_heartbeat(websocket, f"dashboard:{session_id}"))

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "dashboard_query":
                # Image upload + text query from dashboard
                if msg.get("image"):
                    await session.send_video_frame(msg["image"])
                if msg.get("text"):
                    await session.send_text(msg["text"])

    except WebSocketDisconnect:
        logger.info("Dashboard disconnected normally: session %s", session_id)
    except Exception:
        logger.exception("Dashboard error: session %s", session_id)
    finally:
        heartbeat_task.cancel()
        gemini_task.cancel()
        state = await session.stop()

        # Notify dashboard session is complete (best-effort)
        try:
            await websocket.send_json({
                "type": "session_complete",
                "session_id": session_id,
            })
        except Exception:
            pass

        # Save to session store
        if _session_service:
            _session_service.save(state)

        _sessions.pop(session_id, None)
        _dashboards.pop(session_id, None)
        logger.info("Dashboard cleanup complete: session %s", session_id)


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
    logger.info("Remote connected: session %s", session_id)

    await websocket.send_json({
        "type": "remote_connected",
        "session_id": session_id,
        "message": "Connected to Ask NYC. Hold the button and speak.",
    })

    # Notify dashboard
    dashboard = _dashboards.get(session_id)
    if dashboard:
        try:
            await dashboard.send_json({"type": "remote_connected"})
        except Exception:
            pass

    heartbeat_task = asyncio.create_task(_heartbeat(websocket, f"remote:{session_id}"))

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
        logger.info("Remote disconnected normally: session %s", session_id)
    except Exception:
        logger.exception("Remote error: session %s", session_id)
    finally:
        heartbeat_task.cancel()
        logger.info("Remote cleanup complete: session %s", session_id)
        dashboard = _dashboards.get(session_id)
        if dashboard:
            try:
                await dashboard.send_json({"type": "remote_disconnected"})
            except Exception:
                pass
