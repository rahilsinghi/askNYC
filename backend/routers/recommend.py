"""
Ask NYC — Recommend Router (SSE Endpoint)

POST /api/recommend — streams SSE events as the recommendation pipeline runs.
"""

import asyncio
import json
import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from services.recommend_service import run_pipeline

logger = logging.getLogger(__name__)

router = APIRouter()


async def _sse_generator(event_queue: asyncio.Queue):
    """Yield SSE lines from the event queue until sentinel (None)."""
    while True:
        item = await event_queue.get()
        if item is None:
            break
        event_type = item.get("event", "message")
        data = json.dumps(item.get("data", {}))
        yield f"event: {event_type}\ndata: {data}\n\n"


@router.post("/api/recommend")
async def recommend(request: Request):
    """Stream recommendation pipeline progress as SSE events."""
    body = await request.json()
    query = body.get("query", "").strip()

    if not query:
        return StreamingResponse(
            iter([f"event: error\ndata: {json.dumps({'message': 'Empty query'})}\n\n"]),
            media_type="text/event-stream",
        )

    logger.info("Recommend request: %s", query[:120])

    event_queue: asyncio.Queue = asyncio.Queue()

    # Launch pipeline in background
    asyncio.create_task(run_pipeline(query, event_queue))

    return StreamingResponse(
        _sse_generator(event_queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
