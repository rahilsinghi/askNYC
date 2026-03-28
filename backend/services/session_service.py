"""
Ask NYC — Session Service
JSON-file-backed session store. Persists within a Cloud Run instance lifetime.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from models.schemas import SessionState

logger = logging.getLogger(__name__)

SESSIONS_FILE = Path("/tmp/asknyc_sessions.json")
MAX_SESSIONS = 50


class SessionService:
    def __init__(self):
        self._sessions: list[dict] = []
        self._load()

    def _load(self):
        if SESSIONS_FILE.exists():
            try:
                self._sessions = json.loads(SESSIONS_FILE.read_text())
                logger.info("Loaded %d sessions from disk", len(self._sessions))
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Could not load sessions file: %s", exc)
                self._sessions = []

    def _save(self):
        try:
            SESSIONS_FILE.write_text(json.dumps(self._sessions, default=str))
        except OSError as exc:
            logger.warning("Could not save sessions file: %s", exc)

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
        self._sessions = self._sessions[:MAX_SESSIONS]
        self._save()

    def get_all(self) -> list[dict]:
        return self._sessions

    def get(self, session_id: str) -> dict | None:
        return next((s for s in self._sessions if s["session_id"] == session_id), None)
