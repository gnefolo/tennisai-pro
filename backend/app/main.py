from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import LiveTaggedPointRequest, LiveTaggedPointResponse
from app.services.live_service import analyze_live_point

app = FastAPI(
    title="TennisAI Pro Backend",
    version="2.0.0",
)

origins = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

@app.post("/api/live/tagged_point", response_model=LiveTaggedPointResponse)
def live_tagged_point(payload: LiveTaggedPointRequest):
    return analyze_live_point(payload.model_dump())