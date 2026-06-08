from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import json
import os

import joblib
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.schemas import LiveTaggedPointRequest, LiveTaggedPointResponse
from app.services.live_service import analyze_live_point
from app.services.report_service import generate_match_report
from app.services.win_model import load_win_bundle
from app.services.pattern_engine import load_pattern_bundle
from app.settings import TACTICAL_MODEL_PATH, PATTERN_MODEL_PATH
from app.database import engine, get_db, Base
from app.user_model import User
from app.invite_model import InviteKey, _gen_code
from app.auth_utils import hash_password, verify_password, create_token, decode_token

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "giovanni.graziano@openeconomics.eu").lower()

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

# ─── Startup ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Migrate existing users table: add columns if not present
    with engine.begin() as conn:
        for sql in [
            "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE",
        ]:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
    # Re-pickle ML models to silence sklearn version warnings
    try:
        joblib.dump(joblib.load(TACTICAL_MODEL_PATH), TACTICAL_MODEL_PATH)
        joblib.dump(joblib.load(PATTERN_MODEL_PATH), PATTERN_MODEL_PATH)
        load_win_bundle.cache_clear()
        load_pattern_bundle.cache_clear()
    except Exception:
        pass

# ─── Auth helpers ─────────────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(status_code=401, detail="Token mancante")
    payload = decode_token(creds.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user

# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    invite_key: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    user_email: str
    is_admin: bool = False
    is_approved: bool = False

# ─── Auth Endpoints ───────────────────────────────────────────────────────────

def _ensure_admin(user: User, db: Session):
    """Promote user to admin+approved if email matches ADMIN_EMAIL."""
    if user.email == ADMIN_EMAIL and (not user.is_admin or not user.is_approved):
        user.is_admin = True
        user.is_approved = True
        db.commit()
        db.refresh(user)

def _token_response(user: User) -> TokenResponse:
    token = create_token(user.id, user.email, user.name)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        is_admin=user.is_admin,
        is_approved=user.is_approved,
    )

@app.post("/api/auth/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(422, "Email non valida")
    if not body.name.strip():
        raise HTTPException(422, "Il nome non può essere vuoto")
    if len(body.password) < 6:
        raise HTTPException(422, "La password deve avere almeno 6 caratteri")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "Email già registrata")

    # Validate invite key if provided
    key_obj = None
    if body.invite_key:
        key_obj = db.query(InviteKey).filter(
            InviteKey.code == body.invite_key.strip().upper(),
            InviteKey.is_used == False,
        ).first()
        if not key_obj:
            raise HTTPException(400, "Chiave invito non valida o già usata")

    # Admin email always gets immediate access
    is_admin = email == ADMIN_EMAIL
    is_approved = is_admin or (key_obj is not None)

    user = User(
        email=email,
        name=body.name.strip(),
        hashed_password=hash_password(body.password),
        is_admin=is_admin,
        is_approved=is_approved,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if key_obj:
        key_obj.is_used = True
        key_obj.used_by_id = user.id
        key_obj.used_at = __import__("datetime").datetime.utcnow()
        db.commit()

    return _token_response(user)

@app.post("/api/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Credenziali non corrette")
    _ensure_admin(user, db)
    if not user.is_approved:
        raise HTTPException(403, "Account in attesa di approvazione")
    return _token_response(user)

@app.get("/api/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "is_approved": current_user.is_approved,
    }

# ─── Admin dependency ──────────────────────────────────────────────────────────

def get_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(403, "Accesso riservato agli amministratori")
    return current_user

# ─── Admin endpoints ──────────────────────────────────────────────────────────

@app.get("/api/admin/requests")
def admin_requests(db: Session = Depends(get_db), _: User = Depends(get_admin)):
    users = db.query(User).filter(User.is_approved == False, User.is_admin == False).order_by(User.created_at.desc()).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "created_at": u.created_at.isoformat()} for u in users]

@app.post("/api/admin/approve/{user_id}")
def admin_approve(user_id: int, db: Session = Depends(get_db), _: User = Depends(get_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Utente non trovato")
    user.is_approved = True
    db.commit()
    return {"status": "approved", "user_id": user_id}

@app.get("/api/admin/users")
def admin_users(db: Session = Depends(get_db), _: User = Depends(get_admin)):
    users = db.query(User).filter(User.is_approved == True).order_by(User.created_at.desc()).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "is_admin": u.is_admin, "created_at": u.created_at.isoformat()} for u in users]

class CreateKeyRequest(BaseModel):
    note: Optional[str] = None

@app.post("/api/admin/keys", status_code=201)
def admin_create_key(body: CreateKeyRequest, db: Session = Depends(get_db), _: User = Depends(get_admin)):
    key = InviteKey(code=_gen_code(), note=body.note)
    db.add(key)
    db.commit()
    db.refresh(key)
    return {"id": key.id, "code": key.code, "note": key.note, "created_at": key.created_at.isoformat()}

@app.get("/api/admin/keys")
def admin_list_keys(db: Session = Depends(get_db), _: User = Depends(get_admin)):
    keys = db.query(InviteKey).order_by(InviteKey.created_at.desc()).all()
    return [{
        "id": k.id, "code": k.code, "note": k.note,
        "is_used": k.is_used, "used_by_id": k.used_by_id,
        "used_at": k.used_at.isoformat() if k.used_at else None,
        "created_at": k.created_at.isoformat(),
    } for k in keys]

@app.delete("/api/admin/keys/{key_id}")
def admin_revoke_key(key_id: int, db: Session = Depends(get_db), _: User = Depends(get_admin)):
    key = db.query(InviteKey).filter(InviteKey.id == key_id).first()
    if not key:
        raise HTTPException(404, "Chiave non trovata")
    db.delete(key)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/auth/change-password")
def change_password(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    old_pw = body.get("old_password", "")
    new_pw = body.get("new_password", "")
    if not verify_password(old_pw, current_user.hashed_password):
        raise HTTPException(401, "Password attuale non corretta")
    if len(new_pw) < 6:
        raise HTTPException(422, "La nuova password deve avere almeno 6 caratteri")
    current_user.hashed_password = hash_password(new_pw)
    db.commit()
    return {"status": "ok"}

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