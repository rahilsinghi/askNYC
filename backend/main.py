"""
Ask NYC — FastAPI Backend
Entry point. Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from routers import ws as ws_module
from routers.ws import router as ws_router
from routers.recommend import router as recommend_router
from services.session_service import SessionService

load_dotenv()

# ADK expects GOOGLE_API_KEY — alias from GOOGLE_GEMINI_API_KEY if needed
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GOOGLE_GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_GEMINI_API_KEY")

session_service = SessionService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.session_service = session_service
    ws_module._session_service = session_service
    print("✅ Ask NYC backend started")
    yield
    print("👋 Ask NYC backend shutting down")


app = FastAPI(
    title="Ask NYC",
    description="Voice + camera AI agent for NYC Open Data",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router, prefix="/ws")
app.include_router(recommend_router)


@app.get("/sessions")
async def list_sessions():
    """Return all completed sessions (for archive + insights pages)."""
    return {"sessions": session_service.get_all()}
