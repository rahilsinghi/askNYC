"""
Ask NYC — Session Service
In-memory session store. No persistence — this is a hackathon.
Survives until server restart.
"""

from datetime import datetime
from models.schemas import SessionState


class SessionService:
    def __init__(self):
        self._sessions: list[dict] = []

    def save(self, state: SessionState):
        self._sessions.insert(0, {  # newest first
            "session_id": state.session_id,
            "location_name": state.location_name or "Unknown location",
            "lat": state.lat,
            "lng": state.lng,
            "started_at": state.started_at.isoformat(),
            "ended_at": datetime.now().isoformat(),
            "cards": [c.model_dump() for c in state.cards],
            "datasets_queried": state.datasets_queried,
            "anomaly_found": state.anomaly_found,
        })
        # Keep last 50 sessions
        self._sessions = self._sessions[:50]

    def get_all(self) -> list[dict]:
        return self._sessions

    def get(self, session_id: str) -> dict | None:
        return next((s for s in self._sessions if s["session_id"] == session_id), None)
