"""
Ask NYC — Pydantic Models
All WebSocket message types and data structures.
"""

from pydantic import BaseModel
from typing import Optional, Literal, Any
from datetime import datetime


# ─── Inbound messages (Phone Remote → Backend) ─────────────────────────────

class VideoFrameMessage(BaseModel):
    type: Literal["video_frame"]
    data: str  # base64 JPEG


class AudioFrameMessage(BaseModel):
    type: Literal["audio_frame"]
    data: str  # base64 PCM 16kHz mono


class UserStartSpeaking(BaseModel):
    type: Literal["user_start_speaking"]


class UserStopSpeaking(BaseModel):
    type: Literal["user_stop_speaking"]


class RemoteReady(BaseModel):
    type: Literal["remote_ready"]
    session_id: str


# ─── Outbound messages (Backend → Dashboard) ───────────────────────────────

class AudioChunkMessage(BaseModel):
    type: Literal["audio_chunk"] = "audio_chunk"
    data: str  # base64 PCM 24kHz


class TranscriptMessage(BaseModel):
    type: Literal["transcript"] = "transcript"
    text: str
    speaker: Literal["agent", "user"]
    partial: bool = False


class ToolCallMessage(BaseModel):
    type: Literal["tool_call"] = "tool_call"
    tool: str
    status: Literal["pending", "complete", "error"]
    result_count: Optional[int] = None


class DataCard(BaseModel):
    category: Literal["health", "safety", "permits", "complaints", "nypd", "violations", "evictions", "transit"]
    badge_label: str   # e.g. "HEALTH INSPECTION"
    title: str         # e.g. "Grade A"
    detail: str        # e.g. "Last inspected Jan 12, 2024. Zero violations."
    source_url: Optional[str] = None


class DataCardMessage(BaseModel):
    type: Literal["data_card"] = "data_card"
    card: DataCard


class MapEventMessage(BaseModel):
    type: Literal["map_event"] = "map_event"
    event: Literal["pin", "zoom", "circle", "clear"]
    lat: float
    lng: float
    source: str  # "health" | "permits" | "complaints" | "nypd" | "center"
    label: Optional[str] = None


class DetectionMessage(BaseModel):
    type: Literal["detection"] = "detection"
    label: str
    confidence: float
    box: Optional[list[float]] = None  # [ymin, xmin, ymax, xmax] normalized 0-1000
    address: Optional[str] = None


class AgentStateMessage(BaseModel):
    type: Literal["agent_state"] = "agent_state"
    state: Literal["idle", "listening", "processing", "speaking"]


class SessionSummary(BaseModel):
    session_id: str
    location_name: str
    location_address: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    started_at: datetime
    ended_at: Optional[datetime]
    cards: list[DataCard] = []
    datasets_queried: list[str] = []
    anomaly_found: bool = False


class SessionCompleteMessage(BaseModel):
    type: Literal["session_complete"] = "session_complete"
    session: SessionSummary


# ─── Internal state ─────────────────────────────────────────────────────────

class SessionState(BaseModel):
    session_id: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_name: Optional[str] = None
    location_address: Optional[str] = None
    cards: list[DataCard] = []
    datasets_queried: list[str] = []
    anomaly_found: bool = False
    started_at: datetime = datetime.now()
    ended_at: Optional[datetime] = None


# ─── Recommend pipeline models ─────────────────────────────────────────────

class RecommendRequest(BaseModel):
    query: str


class QueryPlan(BaseModel):
    location: str
    intent: str  # food, housing, safety, construction, transit, general
    search_terms: list[str] = []
    datasets: list[str] = []


class ScoreBreakdown(BaseModel):
    hygiene: Optional[int] = None
    complaints: Optional[int] = None
    safety: Optional[int] = None
    housing: Optional[int] = None
    transit: Optional[int] = None
    construction: Optional[int] = None


class RecommendationCard(BaseModel):
    name: str
    address: str
    score: int  # 0-100
    score_breakdown: dict[str, int] = {}
    badges: list[dict[str, str]] = []
    reasoning: list[str] = []
    lat: Optional[float] = None
    lng: Optional[float] = None
