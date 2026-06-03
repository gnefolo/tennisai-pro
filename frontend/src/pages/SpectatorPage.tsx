// src/pages/SpectatorPage.tsx
// Spectator view — live score in sola lettura via WebSocket
// Si attiva quando l'URL contiene ?spectate={sessionId}

import React, { useEffect, useRef, useState } from "react";

const WS_BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000")
    .replace(/^http/, "ws");

interface LiveState {
    playerName: string;
    opponentName: string;
    setsMe: number; setsOpp: number;
    gamesMe: number; gamesOpp: number;
    pointScoreMe: string; pointScoreOpp: string;
    setNumber: number;
    isPlayerOnServe: boolean;
    tacticalCall?: string;
    momentumState?: string;
    winProbability?: number;
    patternName?: string;
    pointNumber: number;
}

interface SpectatorPageProps {
    sessionId: string;
}

const SpectatorPage: React.FC<SpectatorPageProps> = ({ sessionId }) => {
    const [live, setLive] = useState<LiveState | null>(null);
    const [connected, setConnected] = useState(false);
    const [pointFlash, setPointFlash] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const url = `${WS_BASE}/ws/live/${sessionId}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => { setConnected(true); };
        ws.onclose = () => { setConnected(false); };

        ws.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data);
                if (msg.type === "CONNECTED") return;
                if (msg.type === "POINT") {
                    setLive(msg.state);
                    setPointFlash(true);
                    setTimeout(() => setPointFlash(false), 800);
                }
            } catch { /* noop */ }
        };

        // Keepalive ping ogni 25s
        pingRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 25000);

        return () => {
            clearInterval(pingRef.current!);
            ws.close();
        };
    }, [sessionId]);

    const probPct = live?.winProbability != null
        ? `${(live.winProbability * 100).toFixed(1)}%`
        : null;

    return (
        <div className="min-h-screen bg-court-night text-baseline flex flex-col items-center justify-start px-4 py-6 gap-6">

            {/* ── Header ── */}
            <div className="w-full max-w-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-head text-lg font-bold text-ace-lime">TennisAI Pro</span>
                    <span className="text-fog/40 text-sm">· Spectator</span>
                </div>
                <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 border text-[11px] font-semibold ${
                    connected
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-error/30 bg-error/10 text-error"
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success animate-pulse" : "bg-error"}`} />
                    {connected ? "Live" : "Connessione in corso..."}
                </div>
            </div>

            {!live ? (
                /* ── Waiting state ── */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full border-2 border-ace-lime/30 border-t-ace-lime animate-spin" />
                    <div className="font-head text-xl font-semibold text-baseline">
                        In attesa del match...
                    </div>
                    <div className="text-[13px] text-fog/50 max-w-xs">
                        Il coach non ha ancora registrato il primo punto. Rimani connesso.
                    </div>
                    <div className="text-[11px] text-fog/30 font-mono">
                        sessione: {sessionId.slice(0, 16)}...
                    </div>
                </div>
            ) : (
                /* ── Live state ── */
                <div className={`w-full max-w-2xl flex flex-col gap-4 transition-all duration-300 ${pointFlash ? "scale-[1.01]" : "scale-100"}`}>

                    {/* Scoreboard */}
                    <div className="rounded-3xl border border-white/[0.06] bg-[linear-gradient(180deg,rgba(11,18,32,0.98),rgba(5,9,18,1))] p-6 shadow-[0_20px_48px_rgba(0,0,0,0.4)]">

                        {/* Players */}
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            {/* Player */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    {live.isPlayerOnServe && (
                                        <span className="w-2 h-2 rounded-full bg-ace-lime animate-pulse" />
                                    )}
                                    <span className="text-[10px] uppercase tracking-[0.20em] text-fog/50 font-semibold">Player</span>
                                </div>
                                <div className="font-head text-xl font-bold text-baseline truncate">{live.playerName}</div>
                            </div>

                            {/* VS */}
                            <div className="text-fog/20 font-head text-sm">vs</div>

                            {/* Opponent */}
                            <div className="flex flex-col gap-1 items-end text-right">
                                <div className="flex items-center gap-2 justify-end">
                                    <span className="text-[10px] uppercase tracking-[0.20em] text-fog/50 font-semibold">Opponent</span>
                                    {!live.isPlayerOnServe && (
                                        <span className="w-2 h-2 rounded-full bg-ace-lime animate-pulse" />
                                    )}
                                </div>
                                <div className="font-head text-xl font-bold text-baseline truncate">{live.opponentName}</div>
                            </div>
                        </div>

                        {/* Score grid */}
                        <div className="mt-6 grid grid-cols-[1fr_1fr_1fr_32px_1fr_1fr_1fr] gap-2 items-center">
                            {/* ME scores */}
                            {[live.setsMe, live.gamesMe].map((v, i) => (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div className="text-[9px] uppercase tracking-[0.18em] text-fog/40 font-semibold">{i === 0 ? "Set" : "Game"}</div>
                                    <div className="font-head text-4xl font-bold text-baseline">{v}</div>
                                </div>
                            ))}
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-[9px] uppercase tracking-[0.18em] text-fog/40 font-semibold">Point</div>
                                <div className="font-head text-5xl font-bold text-ace-lime">{live.pointScoreMe}</div>
                            </div>

                            {/* Divider */}
                            <div className="text-fog/20 text-xl text-center">–</div>

                            {/* OPP scores */}
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-[9px] uppercase tracking-[0.18em] text-fog/40 font-semibold">Point</div>
                                <div className="font-head text-5xl font-bold text-ace-lime">{live.pointScoreOpp}</div>
                            </div>
                            {[live.gamesOpp, live.setsOpp].map((v, i) => (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div className="text-[9px] uppercase tracking-[0.18em] text-fog/40 font-semibold">{i === 0 ? "Game" : "Set"}</div>
                                    <div className="font-head text-4xl font-bold text-baseline">{v}</div>
                                </div>
                            ))}
                        </div>

                        {/* Sub-info */}
                        <div className="mt-4 flex items-center justify-between text-[10px] text-fog/40 font-semibold uppercase tracking-wide">
                            <span>Set {live.setNumber} · Punto {live.pointNumber}</span>
                            {probPct && (
                                <span className="text-success">Win prob: {probPct}</span>
                            )}
                        </div>
                    </div>

                    {/* Tactical call */}
                    {live.tacticalCall && (
                        <div className="rounded-2xl border border-ace-lime/20 bg-ace-lime/[0.05] p-4">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-ace-lime/60 font-semibold mb-1.5">
                                Indicazione tattica AI
                            </div>
                            <div className="font-head text-base font-semibold text-baseline leading-snug">
                                {live.tacticalCall}
                            </div>
                        </div>
                    )}

                    {/* Pattern */}
                    {live.patternName && (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
                            <span className="text-[10px] uppercase tracking-[0.20em] text-fog/40 font-semibold">Schema:</span>
                            <span className="text-[13px] font-semibold text-fog">{live.patternName}</span>
                        </div>
                    )}

                </div>
            )}

            {/* ── Footer ── */}
            <div className="text-[10px] text-fog/20 text-center mt-auto">
                TennisAI Pro · Solo lettura · aggiornato in tempo reale
            </div>

        </div>
    );
};

export default SpectatorPage;
