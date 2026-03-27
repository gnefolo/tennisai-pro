#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID
    exit
}

trap cleanup SIGINT

# Start Backend
echo "Starting Backend..."
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Backend running on PID $BACKEND_PID"
echo "Frontend running on PID $FRONTEND_PID"
echo "Press Ctrl+C to stop both servers."

wait
