// src/pages/LiveArchivePage.tsx
import React, { useEffect, useMemo, useState } from "react";

type Surface = "Hard" | "Clay" | "Grass" | "Other";
type MatchType = "BO3" | "BO5";
type PointScore = "0" | "15" | "30" | "40" | "Ad";
type ServeDirection = "T" | "BODY" | "WIDE";
type ServeQuality = "SAFE" | "AGGRESSIVE" | "WEAK";
type ReturnType =
    | "DEEP"
    | "SHORT"
    | "ANGLED"
    | "CENTRAL"
    | "BLOCKED"
    | "AGGRESSIVE";
type RallyBucket = "SHORT" | "MEDIUM" | "LONG";
type RallyPhase =
    | "NEUTRAL"
    | "ATTACK_ME"
    | "ATTACK_OPP"
    | "DEFENSE_ME"
    | "DEFENSE_OPP";
type KeyEvent =
    | "NONE"
    | "DROP_SHOT"
    | "NET_APPROACH"
    | "LOB"
    | "PASSING"
    | "LINE_CHANGE"
    | "INSIDE_OUT"
    | "INSIDE_IN";
type FinishType = "WINNER" | "FORCED_ERROR" | "UNFORCED_ERROR";
type FinishShot =
    | "SERVE"
    | "FOREHAND"
    | "BACKHAND"
    | "VOLLEY"
    | "SMASH"
    | "PASSING"
    | "OTHER";

type FastMacroPattern =
    | "SERVE_DOMINANT"
    | "AGGRESSIVE_RETURN"
    | "SHORT_RALLY"
    | "MEDIUM_RALLY"
    | "LONG_RALLY"
    | "SHORT_BALL_ATTACK"
    | "NET_PLAY"
    | "DEFENSE_RECOVERY"
    | "PASSING_LOB";

interface LivePlayer {
    id: string;
    name: string;
    handedness: "R" | "L" | "A";
    playStyle:
    | "baseliner"
    | "all_court"
    | "serve_volley"
    | "counterpuncher"
    | "other";
    notes?: string;
}

interface LiveMatchSession {
    id: string;
    playerId: string;
    opponentName: string;
    tournament: string;
    surface: Surface;
    matchType: MatchType;
    firstServer: "me" | "opponent";
    round?: string;
    createdAt: string;
}

interface RecordedPoint {
    id: string;
    set: number;
    game: number;
    pointNumber: number;
    isOnServe: 0 | 1;
    serveNumber: 1 | 2 | "ACE";
    serveDirection?: ServeDirection | null;
    serveQuality?: ServeQuality | null;
    returnType?: ReturnType | null;
    rallyBucket?: RallyBucket | null;
    rallyPhase?: RallyPhase | null;
    keyEvent?: KeyEvent | null;
    finishType?: FinishType | null;
    finishShot?: FinishShot | null;
    macroPattern?: FastMacroPattern | null;
    rallyCount: number;
    pctServicePointsWon: number;
    pctReturnPointsWon: number;
    pctFirstServePointsWon: number;
    pctSecondServePointsWon: number;
    momentumLast5: number;
    isBreakPoint: 0 | 1;
    isGamePoint: 0 | 1;
    isGamePointAgainst: 0 | 1;
    isPointWon?: number;
    modelPointWinProbability?: number;
    modelPatternId?: number;
    modelPatternName?: string;
    taggedPattern?: string;
    pointDescription?: string;
    nextPointPatternHint?: string;
    setScoreMe: number;
    setScoreOpp: number;
    gameScoreMe: number;
    gameScoreOpp: number;
    pointScoreMe: PointScore;
    pointScoreOpp: PointScore;
    timestamp: string;
}

interface PersistedLiveState {
    currentSessionId: string | null;
    setNumber: number;
    gameNumber: number;
    pointNumber: number;
    setsMe: number;
    setsOpp: number;
    gamesMe: number;
    gamesOpp: number;
    pointScoreMe: PointScore;
    pointScoreOpp: PointScore;
    recordedPoints: RecordedPoint[];
}

interface PersistedMatchRecord {
    sessionId: string;
    updatedAt: string;
    setNumber: number;
    gameNumber: number;
    pointNumber: number;
    setsMe: number;
    setsOpp: number;
    gamesMe: number;
    gamesOpp: number;
    pointScoreMe: PointScore;
    pointScoreOpp: PointScore;
    recordedPoints: RecordedPoint[];
}

type PersistedMatchRecordMap = Record<string, PersistedMatchRecord>;

const PLAYERS_KEY = "tennisai_live_players";
const SESSIONS_KEY = "tennisai_live_sessions";
const LIVE_STATE_KEY = "tennisai_live_active_state";
const LIVE_MATCH_RECORDS_KEY = "tennisai_live_match_records";

const cardClass =
    "bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4";

function macroLabel(value: FastMacroPattern | null | undefined): string {
    switch (value) {
        case "SERVE_DOMINANT":
            return "Servizio dominante";
        case "AGGRESSIVE_RETURN":
            return "Risposta aggressiva";
        case "SHORT_RALLY":
            return "Rally breve";
        case "MEDIUM_RALLY":
            return "Rally medio";
        case "LONG_RALLY":
            return "Rally lungo";
        case "SHORT_BALL_ATTACK":
            return "Attacco su palla corta";
        case "NET_PLAY":
            return "Gioco a rete";
        case "DEFENSE_RECOVERY":
            return "Difesa / recupero";
        case "PASSING_LOB":
            return "Passante / lob";
        default:
            return "n/d";
    }
}

function csvEscape(val: unknown): string {
    const s =
        val === null || val === undefined
            ? ""
            : typeof val === "number"
                ? String(val)
                : String(val);
    return `"${s.replace(/"/g, '""')}"`;
}

interface LiveArchivePageProps {
    onOpenLiveSession?: (sessionId: string) => void;
}

export const LiveArchivePage: React.FC<LiveArchivePageProps> = ({
    onOpenLiveSession,
}) => {
    const [players, setPlayers] = useState<LivePlayer[]>([]);
    const [sessions, setSessions] = useState<LiveMatchSession[]>([]);
    const [persistedState, setPersistedState] =
        useState<PersistedLiveState | null>(null);
    const [matchRecordMap, setMatchRecordMap] = useState<PersistedMatchRecordMap>(
        {}
    );
    const [query, setQuery] = useState<string>("");

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const rawPlayers = window.localStorage.getItem(PLAYERS_KEY);
            if (rawPlayers) {
                setPlayers(JSON.parse(rawPlayers) as LivePlayer[]);
            }
        } catch (e) {
            console.warn("Errore lettura players archive", e);
        }

        try {
            const rawSessions = window.localStorage.getItem(SESSIONS_KEY);
            if (rawSessions) {
                setSessions(JSON.parse(rawSessions) as LiveMatchSession[]);
            }
        } catch (e) {
            console.warn("Errore lettura sessions archive", e);
        }

        try {
            const rawLiveState = window.localStorage.getItem(LIVE_STATE_KEY);
            if (rawLiveState) {
                setPersistedState(JSON.parse(rawLiveState) as PersistedLiveState);
            }
        } catch (e) {
            console.warn("Errore lettura persisted live state", e);
        }

        try {
            const rawMatchRecords = window.localStorage.getItem(
                LIVE_MATCH_RECORDS_KEY
            );
            if (rawMatchRecords) {
                setMatchRecordMap(
                    JSON.parse(rawMatchRecords) as PersistedMatchRecordMap
                );
            }
        } catch (e) {
            console.warn("Errore lettura archivio records live", e);
        }
    }, []);

    const playerMap = useMemo(() => {
        return new Map(players.map((p) => [p.id, p]));
    }, [players]);

    const sessionPointCountMap = useMemo(() => {
        const map = new Map<string, number>();

        Object.values(matchRecordMap).forEach((record) => {
            map.set(record.sessionId, record.recordedPoints?.length ?? 0);
        });

        if (
            persistedState?.currentSessionId &&
            !map.has(persistedState.currentSessionId)
        ) {
            map.set(
                persistedState.currentSessionId,
                persistedState.recordedPoints?.length ?? 0
            );
        }

        return map;
    }, [matchRecordMap, persistedState]);

    const filteredSessions = useMemo(() => {
        const q = query.trim().toLowerCase();

        const ordered = [...sessions].sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        if (!q) return ordered;

        return ordered.filter((s) => {
            const playerName = playerMap.get(s.playerId)?.name ?? "";
            return (
                s.opponentName.toLowerCase().includes(q) ||
                s.tournament.toLowerCase().includes(q) ||
                (s.round ?? "").toLowerCase().includes(q) ||
                playerName.toLowerCase().includes(q)
            );
        });
    }, [sessions, playerMap, query]);

    const handleOpenSession = (session: LiveMatchSession) => {
        if (typeof window === "undefined") return;

        const record = matchRecordMap[session.id];

        const liveStateToPersist: PersistedLiveState = record
            ? {
                currentSessionId: session.id,
                setNumber: record.setNumber,
                gameNumber: record.gameNumber,
                pointNumber: record.pointNumber,
                setsMe: record.setsMe,
                setsOpp: record.setsOpp,
                gamesMe: record.gamesMe,
                gamesOpp: record.gamesOpp,
                pointScoreMe: record.pointScoreMe,
                pointScoreOpp: record.pointScoreOpp,
                recordedPoints: record.recordedPoints ?? [],
            }
            : {
                currentSessionId: session.id,
                setNumber: 1,
                gameNumber: 1,
                pointNumber: 1,
                setsMe: 0,
                setsOpp: 0,
                gamesMe: 0,
                gamesOpp: 0,
                pointScoreMe: "0",
                pointScoreOpp: "0",
                recordedPoints: [],
            };

        window.localStorage.setItem(
            LIVE_STATE_KEY,
            JSON.stringify(liveStateToPersist)
        );
        setPersistedState(liveStateToPersist);

        if (onOpenLiveSession) {
            onOpenLiveSession(session.id);
        }
    };

    const handleDeleteSession = (sessionId: string) => {
        const updatedSessions = sessions.filter((s) => s.id !== sessionId);
        setSessions(updatedSessions);

        if (typeof window !== "undefined") {
            window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));

            const updatedMap = { ...matchRecordMap };
            delete updatedMap[sessionId];
            setMatchRecordMap(updatedMap);
            window.localStorage.setItem(
                LIVE_MATCH_RECORDS_KEY,
                JSON.stringify(updatedMap)
            );

            if (persistedState?.currentSessionId === sessionId) {
                window.localStorage.removeItem(LIVE_STATE_KEY);
                setPersistedState(null);
            }
        }
    };

    const handleExportSessionCsv = (session: LiveMatchSession) => {
        const record =
            matchRecordMap[session.id] ??
            (persistedState?.currentSessionId === session.id ? persistedState : null);

        if (!record) {
            alert("Nessun record punti disponibile per questa sessione.");
            return;
        }

        const points = record.recordedPoints ?? [];
        if (points.length === 0) {
            alert("Questa sessione non contiene ancora punti registrati.");
            return;
        }

        const playerName = playerMap.get(session.playerId)?.name ?? "";

        const headers = [
            "match_id",
            "SetNo",
            "GameNo",
            "PointNumber",
            "is_player_on_serve",
            "ServeNumber",
            "serve_direction",
            "serve_quality",
            "return_type",
            "rally_bucket",
            "rally_phase",
            "key_event",
            "finish_type",
            "finish_shot",
            "macro_pattern",
            "RallyCount",
            "pct_service_points_won",
            "pct_return_points_won",
            "pct_first_serve_points_won",
            "pct_second_serve_points_won",
            "last_n_points_won_5",
            "is_game_point",
            "is_break_point",
            "is_game_point_against",
            "is_point_won",
            "predicted_point_win_probability",
            "pattern_fused_id",
            "pattern_fused_name",
            "tagged_pattern",
            "point_description",
            "next_point_pattern_hint",
            "player_name",
            "opponent_name",
            "tournament",
            "surface",
            "match_type",
            "round",
            "set_score_me",
            "set_score_opp",
            "game_score_me",
            "game_score_opp",
            "point_score_me",
            "point_score_opp",
            "timestamp",
        ];

        const rows = points.map((pt) => {
            const row = [
                session.id,
                pt.set,
                pt.game,
                pt.pointNumber,
                pt.isOnServe,
                pt.serveNumber,
                pt.serveDirection ?? "",
                pt.serveQuality ?? "",
                pt.returnType ?? "",
                pt.rallyBucket ?? "",
                pt.rallyPhase ?? "",
                pt.keyEvent ?? "",
                pt.finishType ?? "",
                pt.finishShot ?? "",
                pt.macroPattern ?? "",
                pt.rallyCount,
                pt.pctServicePointsWon,
                pt.pctReturnPointsWon,
                pt.pctFirstServePointsWon,
                pt.pctSecondServePointsWon,
                pt.momentumLast5,
                pt.isGamePoint,
                pt.isBreakPoint,
                pt.isGamePointAgainst,
                pt.isPointWon ?? "",
                pt.modelPointWinProbability ?? "",
                pt.modelPatternId ?? "",
                pt.modelPatternName ?? "",
                pt.taggedPattern ?? "",
                pt.pointDescription ?? "",
                pt.nextPointPatternHint ?? "",
                playerName,
                session.opponentName,
                session.tournament,
                session.surface,
                session.matchType,
                session.round ?? "",
                pt.setScoreMe,
                pt.setScoreOpp,
                pt.gameScoreMe,
                pt.gameScoreOpp,
                pt.pointScoreMe,
                pt.pointScoreOpp,
                pt.timestamp,
            ];
            return row.map(csvEscape).join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);

        a.href = url;
        a.download = `live_archive_${session.id}_${ts}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col gap-4 md:h-[calc(100vh-120px)] md:overflow-y-auto">
            <div className={cardClass}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h2 className="text-lg md:text-xl font-semibold text-slate-50">
                            Archivio match live
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Qui puoi consultare le sessioni live salvate, riaprirle e
                            scaricarne l’esportazione.
                        </p>
                    </div>

                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cerca per giocatore, avversario, torneo, round..."
                        className="w-full md:w-96 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                    />
                </div>
            </div>

            {filteredSessions.length === 0 ? (
                <div className={cardClass}>
                    <div className="text-sm text-slate-400">
                        Nessuna sessione live trovata.
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredSessions.map((session) => {
                        const player = playerMap.get(session.playerId);
                        const pointCount = sessionPointCountMap.get(session.id) ?? 0;
                        const isPersistedCurrent =
                            persistedState?.currentSessionId === session.id;

                        const record =
                            matchRecordMap[session.id] ??
                            (isPersistedCurrent ? persistedState : null);

                        const lastPoint =
                            record && record.recordedPoints?.length
                                ? record.recordedPoints[record.recordedPoints.length - 1]
                                : null;

                        return (
                            <div key={session.id} className={cardClass}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-lg font-semibold text-slate-50">
                                            {player?.name ?? "Giocatore"} vs {session.opponentName}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-1">
                                            {session.tournament} · {session.surface} ·{" "}
                                            {session.matchType === "BO3" ? "Best of 3" : "Best of 5"}
                                            {session.round ? ` · ${session.round}` : ""}
                                        </div>
                                    </div>

                                    {isPersistedCurrent && (
                                        <span className="text-[10px] px-2 py-1 rounded-full border border-emerald-600 bg-emerald-950/40 text-emerald-300">
                                            Sessione attiva
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                            Data
                                        </div>
                                        <div className="text-sm font-semibold text-slate-100">
                                            {new Date(session.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                            Punti
                                        </div>
                                        <div className="text-sm font-semibold text-sky-300">
                                            {pointCount}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                            Primo server
                                        </div>
                                        <div className="text-sm font-semibold text-slate-100">
                                            {session.firstServer === "me"
                                                ? "Giocatore"
                                                : "Avversario"}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2">
                                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                            Ultimo pattern
                                        </div>
                                        <div className="text-sm font-semibold text-amber-300 truncate">
                                            {macroLabel(lastPoint?.macroPattern)}
                                        </div>
                                    </div>
                                </div>

                                {lastPoint && (
                                    <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-3">
                                        <div className="text-[11px] text-slate-400 mb-1">
                                            Ultimo stato disponibile
                                        </div>
                                        <div className="text-[12px] text-slate-200">
                                            Score: {lastPoint.setScoreMe}-{lastPoint.setScoreOpp} set
                                            · {lastPoint.gameScoreMe}-{lastPoint.gameScoreOpp} game ·{" "}
                                            {lastPoint.pointScoreMe}-{lastPoint.pointScoreOpp}
                                        </div>
                                        {lastPoint.nextPointPatternHint && (
                                            <div className="text-[11px] text-emerald-300 mt-2">
                                                Next hint: {lastPoint.nextPointPatternHint}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleOpenSession(session)}
                                        className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold"
                                    >
                                        Apri sessione
                                    </button>

                                    <button
                                        onClick={() => handleExportSessionCsv(session)}
                                        className="px-3 py-2 rounded-xl border border-slate-600 bg-slate-900 text-slate-100 text-[11px] font-semibold hover:border-sky-500"
                                    >
                                        Esporta CSV
                                    </button>

                                    <button
                                        onClick={() => handleDeleteSession(session.id)}
                                        className="px-3 py-2 rounded-xl border border-rose-700 bg-rose-950/30 text-rose-300 text-[11px] font-semibold hover:border-rose-500"
                                    >
                                        Elimina
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LiveArchivePage;