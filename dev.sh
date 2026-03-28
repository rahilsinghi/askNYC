#!/bin/bash
# Ask NYC — Quick Start
# Run both backend and frontend with one command
# Usage: ./dev.sh

set -e

echo "🗽 Starting Ask NYC..."
echo ""

# Check .env exists
if [ ! -f backend/.env ]; then
  echo "⚠️  backend/.env not found — copying from .env.example"
  cp backend/.env.example backend/.env
  echo "→ Fill in GOOGLE_API_KEY and GOOGLE_MAPS_API_KEY in backend/.env"
  echo ""
fi

# Check frontend .env.local exists
if [ ! -f frontend/.env.local ]; then
  echo "⚠️  frontend/.env.local not found — copying from .env.example"
  cp frontend/.env.example frontend/.env.local
fi

# Backend
echo "📡 Starting backend on :8000..."
cd backend
if [ ! -d venv ]; then
  echo "  Creating virtualenv..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 2
echo "  ✅ Backend running (PID $BACKEND_PID)"

# Frontend
echo "🖥️  Starting frontend on :3000..."
cd frontend
if [ ! -d node_modules ]; then
  echo "  Installing dependencies..."
  npm install -q
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Ask NYC is running:"
echo "   Dashboard: http://localhost:3000/dashboard"
echo "   Remote:    http://localhost:3000/remote?session=<id>"
echo "   Archive:   http://localhost:3000/archive"
echo "   Backend:   http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop both servers."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '👋 Stopped.'" EXIT
wait
