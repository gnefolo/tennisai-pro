from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os

from app.schemas import LiveTaggedPointRequest, LiveTaggedPointResponse
from app.services.live_service import analyze_live_point
from app.services.report_service import generate_match_report
from app.services.win_model import load_win_bundle
from app.services.pattern_engine import load_pattern_bundle

app = FastAPI(
    title="TennisAI Pro Backend",
    version="3.0.0",
)

origins = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── WebSocket Manager ──────────────────────────────────────────────────────

class ConnectionManager:
    """Manages WebSocket connections for live match broadcasting."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        """Send data to all connected WebSocket clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    @property
    def client_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()

# ─── Session-based WebSocket Manager ────────────────────────────────────────

class SessionManager:
    """WebSocket manager per sessioni live isolate (spectator mode)."""

    def __init__(self):
        self.sessions: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.sessions.setdefault(session_id, []).append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.sessions:
            try:
                self.sessions[session_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast_to_session(self, session_id: str, data: dict):
        dead = []
        for ws in self.sessions.get(session_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)

    def viewer_count(self, session_id: str) -> int:
        return len(self.sessions.get(session_id, []))


session_manager = SessionManager()

# ─── In-memory player store ──────────────────────────────────────────────────
_player_store: Dict[str, dict] = {}

# ─── REST Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "3.0.0",
        "ws_clients": manager.client_count,
    }

@app.get("/api/warmup")
def warmup():
    """Pre-load all ML models so the first tagged_point call has no lag."""
    load_win_bundle()
    load_pattern_bundle()
    return {"status": "ready"}

@app.post("/api/live/tagged_point", response_model=LiveTaggedPointResponse)
def live_tagged_point(payload: LiveTaggedPointRequest):
    return analyze_live_point(payload.model_dump())

# ─── WebSocket: Live match broadcast ────────────────────────────────────────

@app.post("/api/live/broadcast")
async def broadcast_state(data: dict):
    """
    Receives match state from the coach frontend and broadcasts
    to all connected WebSocket clients (fan tabs, media overlays, etc.)
    """
    await manager.broadcast(data)
    return {
        "status": "broadcasted",
        "clients": manager.client_count,
    }

# ─── Report PDF ──────────────────────────────────────────────────────────────

@app.post("/api/session/report")
async def session_report(data: Dict[str, Any]):
    """Genera il report PDF della sessione e lo restituisce come file scaricabile."""
    pdf_bytes = generate_match_report(data)
    player  = data.get("player_name", "Player").replace(" ", "_")
    opp     = data.get("opponent_name", "Opponent").replace(" ", "_")
    filename = f"report_{player}_vs_{opp}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ─── Player profiles ──────────────────────────────────────────────────────────

class PlayerIn(BaseModel):
    id: str
    name: str
    handedness: Optional[str] = "R"
    playStyle: Optional[str] = "baseliner"
    notes: Optional[str] = None

@app.get("/api/players")
def list_players():
    return list(_player_store.values())

@app.post("/api/players")
def save_player(player: PlayerIn):
    _player_store[player.id] = player.model_dump()
    return {"status": "saved", "id": player.id}

@app.delete("/api/players/{player_id}")
def delete_player(player_id: str):
    _player_store.pop(player_id, None)
    return {"status": "deleted"}

# ─── Spectator WebSocket (session-based) ─────────────────────────────────────

@app.post("/api/live/broadcast/{session_id}")
async def broadcast_to_session(session_id: str, data: Dict[str, Any]):
    """Broadcast di un punto a tutti gli spettatori della sessione."""
    await session_manager.broadcast_to_session(session_id, data)
    return {
        "status": "broadcasted",
        "session_id": session_id,
        "viewers": session_manager.viewer_count(session_id),
    }

@app.websocket("/ws/live/{session_id}")
async def websocket_live_session(websocket: WebSocket, session_id: str):
    """WebSocket per spectator mode — isolato per sessione."""
    await session_manager.connect(session_id, websocket)
    try:
        await websocket.send_json({
            "type": "CONNECTED",
            "session_id": session_id,
            "message": "TennisAI Pro live feed — spectator mode",
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        session_manager.disconnect(session_id, websocket)

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    """
    WebSocket endpoint for live match updates.
    Clients connect here to receive real-time match state.

    Protocol:
      - Server → Client: JSON with match state on every point
      - Client → Server: ping/pong (keepalive)
    """
    await manager.connect(websocket)
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "CONNECTED",
            "message": "Connected to TennisAI Pro live feed",
            "clients": manager.client_count,
        })
        # Keep connection alive — listen for pings or close
        while True:
            data = await websocket.receive_text()
            # Echo back pings
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ─── Spinner AI Chat ──────────────────────────────────────────────────────────

class SpinnerMessage(BaseModel):
    role: str
    content: str

class SpinnerChatRequest(BaseModel):
    messages: List[SpinnerMessage]
    match_context: Optional[str] = None

SPINNER_SYSTEM = """Sei Spinner, un coach AI di tennis integrato in TennisAI Pro.
Sei esperto, diretto e concreto. Parla sempre in italiano.
Fornisci analisi tattiche, letture del gioco e consigli basati sui dati del match.
Sii conciso: massimo 3 frasi per risposta. Usa terminologia tennistica professionale.
Se hai dati del match, fai riferimento a numeri e pattern specifici."""

@app.post("/api/spinner/chat")
async def spinner_chat(request: SpinnerChatRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        async def no_key():
            yield f"data: {json.dumps({'text': 'Configura ANTHROPIC_API_KEY per attivare Spinner.'})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(no_key(), media_type="text/event-stream")

    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=api_key)

        system = SPINNER_SYSTEM
        if request.match_context:
            system += f"\n\nContesto match corrente:\n{request.match_context}"

        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        async def generate():
            async with client.messages.stream(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                system=system,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    except Exception as e:
        async def err():
            yield f"data: {json.dumps({'text': f'Errore: {str(e)}'})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(err(), media_type="text/event-stream")