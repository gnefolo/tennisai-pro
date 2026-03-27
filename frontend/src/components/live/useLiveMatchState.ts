import { useEffect, useMemo, useState } from "react";
import type {
    FastMacroPattern,
    FinishShot,
    FinishType,
    Handedness,
    KeyEvent,
    LiveMatchSession,
    LivePlayer,
    LiveTaggedPointResponse,
    MatchType,
    PersistedLiveState,
    PersistedMatchRecordMap,
    PlayStyle,
    PointScore,
    PredictionResponse,
    RallyPhase,
    RecordedPoint,
    ReturnType,
    ServeDirection,
    ServeQuality,
    Surface,
    TacticalPointTag,
} from "./liveTypes";
import {
    buildImmediateTacticalCall,
    buildRecentSequenceInsight,
    labelPlayStyle,
    mapMacroPatternToTag,
    scoreWon,
} from "./liveHelpers";

const API_BASE = "http://127.0.0.1:8000";

const PLAYERS_KEY = "tennisai_live_players";
const SESSIONS_KEY = "tennisai_live_sessions";
const LIVE_STATE_KEY = "tennisai_live_active_state";
const LIVE_MATCH_RECORDS_KEY = "tennisai_live_match_records";

async function postJSON<T>(url: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status} su ${url} - ${text}`);
        }

        return (await res.json()) as T;
    } finally {
        clearTimeout(timeout);
    }
}

export function useLiveMatchState() {
    const [players, setPlayers] = useState<LivePlayer[]>([]);
    const [sessions, setSessions] = useState<LiveMatchSession[]>([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

    const [newPlayerName, setNewPlayerName] = useState<string>("");
    const [newPlayerHandedness, setNewPlayerHandedness] =
        useState<Handedness>("R");
    const [newPlayerPlayStyle, setNewPlayerPlayStyle] =
        useState<PlayStyle>("baseliner");
    const [newPlayerNotes, setNewPlayerNotes] = useState<string>("");

    const [opponentName, setOpponentName] = useState<string>("");
    const [tournamentName, setTournamentName] = useState<string>("");
    const [surface, setSurface] = useState<Surface>("Hard");
    const [matchType, setMatchType] = useState<MatchType>("BO3");
    const [firstServer, setFirstServer] = useState<"me" | "opponent">("me");
    const [round, setRound] = useState<string>("");

    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isSettingUp, setIsSettingUp] = useState<boolean>(true);

    const [setNumber, setSetNumber] = useState<number>(1);
    const [gameNumber, setGameNumber] = useState<number>(1);
    const [pointNumber, setPointNumber] = useState<number>(1);

    const [setsMe, setSetsMe] = useState<number>(0);
    const [setsOpp, setSetsOpp] = useState<number>(0);
    const [gamesMe, setGamesMe] = useState<number>(0);
    const [gamesOpp, setGamesOpp] = useState<number>(0);
    const [pointScoreMe, setPointScoreMe] = useState<PointScore>("0");
    const [pointScoreOpp, setPointScoreOpp] = useState<PointScore>("0");

    const [pendingWinner, setPendingWinner] = useState<"me" | "opponent" | null>(
        null
    );
    const [macroPattern, setMacroPattern] = useState<FastMacroPattern | null>(
        null
    );
    const [finishType, setFinishType] = useState<FinishType | null>(null);

    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [serveNumber, setServeNumber] = useState<1 | 2 | "ACE">(1);
    const [serveDirection, setServeDirection] = useState<ServeDirection | null>(
        null
    );
    const [serveQuality, setServeQuality] = useState<ServeQuality | null>(null);
    const [returnType, setReturnType] = useState<ReturnType | null>(null);
    const [rallyPhase, setRallyPhase] = useState<RallyPhase | null>(null);
    const [keyEvent, setKeyEvent] = useState<KeyEvent>("NONE");
    const [finishShot, setFinishShot] = useState<FinishShot | null>(null);

    const [svcPct, setSvcPct] = useState<number>(65);
    const [rtnPct, setRtnPct] = useState<number>(32);
    const [firstPct, setFirstPct] = useState<number>(62);
    const [secondPct, setSecondPct] = useState<number>(48);
    const [momentumLast5, setMomentumLast5] = useState<number>(50);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
    const [taggedPrediction, setTaggedPrediction] =
        useState<LiveTaggedPointResponse | null>(null);
    const [recordedPoints, setRecordedPoints] = useState<RecordedPoint[]>([]);

    const [scorePulseKey, setScorePulseKey] = useState<number>(0);

    const activePlayer = players.find((p) => p.id === selectedPlayerId) || null;
    const currentSession =
        sessions.find((s) => s.id === currentSessionId) || null;

    const totalGamesInSet = gamesMe + gamesOpp;
    const isServerSwapped = totalGamesInSet % 2 !== 0;

    const onServe: "me" | "opponent" = useMemo(() => {
        if (firstServer === "me") {
            return isServerSwapped ? "opponent" : "me";
        }
        return isServerSwapped ? "me" : "opponent";
    }, [firstServer, isServerSwapped]);

    const isAdvantageSituation = (scoreA: PointScore, scoreB: PointScore) => {
        if (scoreA === "Ad") return true;
        if (scoreA === "40" && scoreB !== "40" && scoreB !== "Ad") return true;
        return false;
    };

    let isBreakPoint = false;
    let isGamePoint = false;
    let isGamePointAgainst = false;

    if (onServe === "me") {
        isGamePoint = isAdvantageSituation(pointScoreMe, pointScoreOpp);
        isBreakPoint = isAdvantageSituation(pointScoreOpp, pointScoreMe);
        isGamePointAgainst = isBreakPoint;
    } else {
        isGamePoint = isAdvantageSituation(pointScoreOpp, pointScoreMe);
        isBreakPoint = isAdvantageSituation(pointScoreMe, pointScoreOpp);
        isGamePointAgainst = isBreakPoint;
    }

    const persistPlayers = (list: LivePlayer[]) => {
        setPlayers(list);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(PLAYERS_KEY, JSON.stringify(list));
        }
    };

    const persistSessions = (list: LiveMatchSession[]) => {
        setSessions(list);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
        }
    };

    const persistLiveState = (state: PersistedLiveState) => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(LIVE_STATE_KEY, JSON.stringify(state));
        }
    };

    const readMatchRecordMap = (): PersistedMatchRecordMap => {
        if (typeof window === "undefined") return {};
        try {
            const raw = window.localStorage.getItem(LIVE_MATCH_RECORDS_KEY);
            if (!raw) return {};
            return JSON.parse(raw) as PersistedMatchRecordMap;
        } catch (e) {
            console.warn("Impossibile leggere archivio match live", e);
            return {};
        }
    };

    const persistMatchRecordMap = (map: PersistedMatchRecordMap) => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(LIVE_MATCH_RECORDS_KEY, JSON.stringify(map));
        }
    };

    useEffect(() => {
        setScorePulseKey((k) => k + 1);
    }, [setsMe, setsOpp, gamesMe, gamesOpp, pointScoreMe, pointScoreOpp]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const rawPlayers = window.localStorage.getItem(PLAYERS_KEY);
            if (rawPlayers) {
                const parsed = JSON.parse(rawPlayers) as LivePlayer[];
                setPlayers(parsed);
                if (parsed.length > 0) setSelectedPlayerId(parsed[0].id);
            }
        } catch (e) {
            console.warn("Impossibile leggere i giocatori live da localStorage", e);
        }

        try {
            const rawSessions = window.localStorage.getItem(SESSIONS_KEY);
            if (rawSessions) {
                const parsed = JSON.parse(rawSessions) as LiveMatchSession[];
                setSessions(parsed);
                if (parsed.length > 0) {
                    const last = parsed[parsed.length - 1];
                    setCurrentSessionId(last.id);
                    setOpponentName(last.opponentName);
                    setTournamentName(last.tournament);
                    setSurface(last.surface);
                    setMatchType(last.matchType);
                    setFirstServer(last.firstServer || "me");
                    setRound(last.round || "");
                    setSelectedPlayerId(last.playerId);
                    setIsSettingUp(false);
                }
            }
        } catch (e) {
            console.warn("Impossibile leggere le sessioni live da localStorage", e);
        }

        try {
            const rawLiveState = window.localStorage.getItem(LIVE_STATE_KEY);
            if (rawLiveState) {
                const parsed = JSON.parse(rawLiveState) as PersistedLiveState;

                setCurrentSessionId(parsed.currentSessionId);
                setSetNumber(parsed.setNumber);
                setGameNumber(parsed.gameNumber);
                setPointNumber(parsed.pointNumber);
                setSetsMe(parsed.setsMe);
                setSetsOpp(parsed.setsOpp);
                setGamesMe(parsed.gamesMe);
                setGamesOpp(parsed.gamesOpp);
                setPointScoreMe(parsed.pointScoreMe);
                setPointScoreOpp(parsed.pointScoreOpp);
                setRecordedPoints(parsed.recordedPoints || []);

                if (parsed.currentSessionId) {
                    setIsSettingUp(false);
                }
            }
        } catch (e) {
            console.warn("Impossibile leggere lo stato live persistito", e);
        }
    }, []);

    useEffect(() => {
        const validPoints = recordedPoints.filter(
            (pt) => pt.isPointWon !== undefined
        );
        if (validPoints.length === 0) return;

        const servicePoints = validPoints.filter((pt) => pt.isOnServe === 1);
        if (servicePoints.length > 0) {
            const won = servicePoints.filter((pt) => pt.isPointWon === 1).length;
            setSvcPct(Math.round((won / servicePoints.length) * 100));
        }

        const returnPoints = validPoints.filter((pt) => pt.isOnServe === 0);
        if (returnPoints.length > 0) {
            const won = returnPoints.filter((pt) => pt.isPointWon === 1).length;
            setRtnPct(Math.round((won / returnPoints.length) * 100));
        }

        const firstServePoints = servicePoints.filter(
            (pt) => pt.serveNumber === 1 || pt.serveNumber === "ACE"
        );
        if (firstServePoints.length > 0) {
            const won = firstServePoints.filter((pt) => pt.isPointWon === 1).length;
            setFirstPct(Math.round((won / firstServePoints.length) * 100));
        }

        const secondServePoints = servicePoints.filter((pt) => pt.serveNumber === 2);
        if (secondServePoints.length > 0) {
            const won = secondServePoints.filter((pt) => pt.isPointWon === 1).length;
            setSecondPct(Math.round((won / secondServePoints.length) * 100));
        }

        const last5 = validPoints.slice(-5);
        if (last5.length > 0) {
            const won = last5.filter((pt) => pt.isPointWon === 1).length;
            setMomentumLast5(Math.round((won / last5.length) * 100));
        }
    }, [recordedPoints]);

    useEffect(() => {
        persistLiveState({
            currentSessionId,
            setNumber,
            gameNumber,
            pointNumber,
            setsMe,
            setsOpp,
            gamesMe,
            gamesOpp,
            pointScoreMe,
            pointScoreOpp,
            recordedPoints,
        });

        if (currentSessionId) {
            const map = readMatchRecordMap();
            map[currentSessionId] = {
                sessionId: currentSessionId,
                updatedAt: new Date().toISOString(),
                setNumber,
                gameNumber,
                pointNumber,
                setsMe,
                setsOpp,
                gamesMe,
                gamesOpp,
                pointScoreMe,
                pointScoreOpp,
                recordedPoints,
            };
            persistMatchRecordMap(map);
        }
    }, [
        currentSessionId,
        setNumber,
        gameNumber,
        pointNumber,
        setsMe,
        setsOpp,
        gamesMe,
        gamesOpp,
        pointScoreMe,
        pointScoreOpp,
        recordedPoints,
    ]);

    const handleSaveNewPlayer = () => {
        const name = newPlayerName.trim();
        if (!name) {
            setError("Inserisci almeno il nome del giocatore prima di salvarlo.");
            return;
        }

        setError(null);

        const id = `pl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const player: LivePlayer = {
            id,
            name,
            handedness: newPlayerHandedness,
            playStyle: newPlayerPlayStyle,
            notes: newPlayerNotes.trim() || undefined,
        };

        const updated = [...players, player];
        persistPlayers(updated);
        setSelectedPlayerId(id);
        setNewPlayerName("");
        setNewPlayerNotes("");
    };

    const handleRegisterSession = () => {
        if (!activePlayer) {
            setError("Seleziona o crea un giocatore prima di registrare il match.");
            return;
        }
        if (!opponentName.trim()) {
            setError("Inserisci il nome dell'avversario prima di registrare il match.");
            return;
        }

        setError(null);

        const id = `sess_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const session: LiveMatchSession = {
            id,
            playerId: activePlayer.id,
            opponentName: opponentName.trim(),
            tournament: tournamentName.trim() || "Match non etichettato",
            surface,
            matchType,
            firstServer,
            round: round.trim() || undefined,
            createdAt: new Date().toISOString(),
        };

        const updated = [...sessions, session];
        persistSessions(updated);
        setCurrentSessionId(id);
        setRecordedPoints([]);
        setIsSettingUp(false);
        setSetNumber(1);
        setGameNumber(1);
        setPointNumber(1);
        setSetsMe(0);
        setSetsOpp(0);
        setGamesMe(0);
        setGamesOpp(0);
        setPointScoreMe("0");
        setPointScoreOpp("0");

        const map = readMatchRecordMap();
        map[id] = {
            sessionId: id,
            updatedAt: new Date().toISOString(),
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
        persistMatchRecordMap(map);
    };

    const buildTagPayload = (): TacticalPointTag => {
        const macroTag = mapMacroPatternToTag(
            macroPattern,
            serveDirection,
            finishType
        );

        return {
            serve_direction: serveDirection ?? macroTag.serve_direction ?? null,
            serve_quality: serveQuality ?? macroTag.serve_quality ?? null,
            return_type: returnType ?? macroTag.return_type ?? null,
            rally_bucket: macroTag.rally_bucket ?? null,
            rally_phase: rallyPhase ?? macroTag.rally_phase ?? null,
            key_event: keyEvent !== "NONE" ? keyEvent : macroTag.key_event ?? "NONE",
            finish_type: finishType ?? macroTag.finish_type ?? null,
            finish_shot: finishShot ?? macroTag.finish_shot ?? null,
            point_outcome:
                pendingWinner === "me"
                    ? "WON"
                    : pendingWinner === "opponent"
                        ? "LOST"
                        : null,
        };
    };

    const macroToRallyCount = (macro: FastMacroPattern | null): number => {
        switch (macro) {
            case "SERVE_DOMINANT":
            case "AGGRESSIVE_RETURN":
            case "SHORT_RALLY":
            case "NET_PLAY":
                return 2;
            case "MEDIUM_RALLY":
            case "SHORT_BALL_ATTACK":
            case "PASSING_LOB":
                return 6;
            case "LONG_RALLY":
            case "DEFENSE_RECOVERY":
                return 10;
            default:
                return 4;
        }
    };

    const handlePointWonInternal = (winner: "me" | "opponent") => {
        let myP = pointScoreMe;
        let opP = pointScoreOpp;
        let myG = gamesMe;
        let opG = gamesOpp;
        let myS = setsMe;
        let opS = setsOpp;

        const winGame = (who: "me" | "opponent") => {
            myP = "0";
            opP = "0";

            if (who === "me") myG += 1;
            else opG += 1;

            if (myG >= 6 && myG >= opG + 2) {
                myS += 1;
                myG = 0;
                opG = 0;
            } else if (opG >= 6 && opG >= myG + 2) {
                opS += 1;
                myG = 0;
                opG = 0;
            }
        };

        if (winner === "me") {
            if (myP === "40" && opP === "Ad") opP = "40";
            else if (myP === "40" && opP === "40") myP = "Ad";
            else if (myP === "Ad") winGame("me");
            else if (myP === "40" && opP !== "40") winGame("me");
            else myP = scoreWon(myP);
        } else {
            if (opP === "40" && myP === "Ad") myP = "40";
            else if (opP === "40" && myP === "40") opP = "Ad";
            else if (opP === "Ad") winGame("opponent");
            else if (opP === "40" && myP !== "40") winGame("opponent");
            else opP = scoreWon(opP);
        }

        setPointScoreMe(myP);
        setPointScoreOpp(opP);
        setGamesMe(myG);
        setGamesOpp(opG);
        setSetsMe(myS);
        setSetsOpp(opS);
        setPointNumber((p) => p + 1);
    };

    const handleRegisterAndAnalyze = async () => {
        if (!activePlayer) {
            setError("Seleziona o crea un giocatore prima.");
            return;
        }
        if (!opponentName.trim()) {
            setError("Inserisci il nome dell'avversario prima.");
            return;
        }
        if (!pendingWinner) {
            setError("Seleziona chi ha vinto il punto.");
            return;
        }
        if (!macroPattern) {
            setError("Seleziona il tipo di punto.");
            return;
        }
        if (!finishType) {
            setError("Seleziona come è finito il punto.");
            return;
        }

        setError(null);
        setLoading(true);
        setPrediction(null);
        setTaggedPrediction(null);

        try {
            const tag = buildTagPayload();
            const rallyCount = macroToRallyCount(macroPattern);

            const body = {
                set: setNumber,
                game: gameNumber,
                point_number: pointNumber,
                is_on_serve: onServe === "me" ? 1 : 0,
                serve_number: serveNumber === "ACE" ? 1 : serveNumber,
                rally_count: rallyCount,
                stats: {
                    pctServicePointsWon: Math.max(0, Math.min(1, svcPct / 100)),
                    pctReturnPointsWon: Math.max(0, Math.min(1, rtnPct / 100)),
                    pctFirstServePointsWon: Math.max(0, Math.min(1, firstPct / 100)),
                    pctSecondServePointsWon: Math.max(0, Math.min(1, secondPct / 100)),
                    momentumLast5: Math.max(0, Math.min(1, momentumLast5 / 100)),
                },
                flags: {
                    isBreakPoint,
                    isGamePoint,
                    isGamePointAgainst,
                },
                tag,
            };

            const data = await postJSON<LiveTaggedPointResponse>(
                `${API_BASE}/api/live/tagged_point`,
                body
            );

            setPrediction(data);
            setTaggedPrediction(data);

            const isPointWonVal = pendingWinner === "me" ? 1 : 0;

            const rec: RecordedPoint = {
                id: `pt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                set: setNumber,
                game: gameNumber,
                pointNumber,
                isOnServe: onServe === "me" ? 1 : 0,
                serveNumber,
                serveDirection,
                serveQuality: tag.serve_quality ?? null,
                returnType: tag.return_type ?? null,
                rallyBucket: tag.rally_bucket ?? null,
                rallyPhase: tag.rally_phase ?? null,
                keyEvent: tag.key_event ?? null,
                finishType: tag.finish_type ?? null,
                finishShot: tag.finish_shot ?? null,
                macroPattern,
                rallyCount,
                pctServicePointsWon: Math.max(0, Math.min(1, svcPct / 100)),
                pctReturnPointsWon: Math.max(0, Math.min(1, rtnPct / 100)),
                pctFirstServePointsWon: Math.max(0, Math.min(1, firstPct / 100)),
                pctSecondServePointsWon: Math.max(0, Math.min(1, secondPct / 100)),
                momentumLast5: Math.max(0, Math.min(1, momentumLast5 / 100)),
                isBreakPoint: isBreakPoint ? 1 : 0,
                isGamePoint: isGamePoint ? 1 : 0,
                isGamePointAgainst: isGamePointAgainst ? 1 : 0,
                isPointWon: isPointWonVal,
                modelPointWinProbability: data.point_win_probability,
                modelPatternId: data.pattern_fused.pattern_id,
                modelPatternName: data.pattern_fused.pattern_name,
                taggedPattern: data.tagged_pattern,
                pointDescription: data.point_description,
                nextPointPatternHint: data.next_point_pattern_hint,
                setScoreMe: setsMe,
                setScoreOpp: setsOpp,
                gameScoreMe: gamesMe,
                gameScoreOpp: gamesOpp,
                pointScoreMe,
                pointScoreOpp,
                timestamp: new Date().toISOString(),
            };

            setRecordedPoints((prev) => [...prev, rec]);
            handlePointWonInternal(pendingWinner);

            setPendingWinner(null);
            setMacroPattern(null);
            setFinishType(null);
            setServeNumber(1);
            setServeDirection(null);
            setServeQuality(null);
            setReturnType(null);
            setRallyPhase(null);
            setKeyEvent("NONE");
            setFinishShot(null);
        } catch (err) {
            console.error("Errore handleRegisterAndAnalyze:", err);
            if (err instanceof Error && err.name === "AbortError") {
                setError(
                    "Timeout del motore tattico live: il backend non ha risposto entro 10 secondi."
                );
            } else {
                setError("Errore nel motore tattico live.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUndoLastPoint = () => {
        if (recordedPoints.length === 0) {
            setError("Non ci sono punti da correggere.");
            return;
        }

        setError(null);

        const lastPoint = recordedPoints[recordedPoints.length - 1];
        setRecordedPoints((prev) => prev.slice(0, -1));

        setSetNumber(lastPoint.set);
        setGameNumber(lastPoint.game);
        setPointNumber(lastPoint.pointNumber);
        setSetsMe(lastPoint.setScoreMe);
        setSetsOpp(lastPoint.setScoreOpp);
        setGamesMe(lastPoint.gameScoreMe);
        setGamesOpp(lastPoint.gameScoreOpp);
        setPointScoreMe(lastPoint.pointScoreMe);
        setPointScoreOpp(lastPoint.pointScoreOpp);

        setPendingWinner(
            lastPoint.isPointWon === 1
                ? "me"
                : lastPoint.isPointWon === 0
                    ? "opponent"
                    : null
        );
        setMacroPattern(lastPoint.macroPattern ?? null);
        setFinishType(lastPoint.finishType ?? null);
        setServeNumber(lastPoint.serveNumber);
        setServeDirection(lastPoint.serveDirection ?? null);
        setServeQuality(lastPoint.serveQuality ?? null);
        setReturnType(lastPoint.returnType ?? null);
        setRallyPhase(lastPoint.rallyPhase ?? null);
        setKeyEvent(lastPoint.keyEvent ?? "NONE");
        setFinishShot(lastPoint.finishShot ?? null);
        setPrediction(null);
        setTaggedPrediction(null);
    };

    const handleExportCsv = () => {
        if (recordedPoints.length === 0) {
            setError("Non ci sono punti registrati da esportare.");
            return;
        }
        setError(null);

        const matchIdForExport = currentSessionId || "live_match";

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

        const csvEscape = (val: unknown): string => {
            const s =
                val === null || val === undefined
                    ? ""
                    : typeof val === "number"
                        ? String(val)
                        : String(val);
            return `"${s.replace(/"/g, '""')}"`;
        };

        const rows = recordedPoints.map((pt) => {
            const row = [
                matchIdForExport,
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
                pt.isPointWon !== undefined ? pt.isPointWon : "",
                pt.modelPointWinProbability ?? "",
                pt.modelPatternId ?? "",
                pt.modelPatternName ?? "",
                pt.taggedPattern ?? "",
                pt.pointDescription ?? "",
                pt.nextPointPatternHint ?? "",
                activePlayer?.name ?? "",
                opponentName.trim(),
                currentSession?.tournament || tournamentName || "",
                surface,
                matchType,
                round.trim(),
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
        a.download = `live_match_${matchIdForExport}_${ts}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleResetMatch = () => {
        const sessionIdToReset = currentSessionId;

        setCurrentSessionId(null);
        setSetNumber(1);
        setGameNumber(1);
        setPointNumber(1);
        setSetsMe(0);
        setSetsOpp(0);
        setGamesMe(0);
        setGamesOpp(0);
        setPointScoreMe("0");
        setPointScoreOpp("0");
        setRecordedPoints([]);
        setPrediction(null);
        setTaggedPrediction(null);
        setPendingWinner(null);
        setMacroPattern(null);
        setFinishType(null);
        setServeNumber(1);
        setServeDirection(null);
        setServeQuality(null);
        setReturnType(null);
        setRallyPhase(null);
        setKeyEvent("NONE");
        setFinishShot(null);

        if (typeof window !== "undefined") {
            window.localStorage.removeItem(LIVE_STATE_KEY);

            if (sessionIdToReset) {
                const map = readMatchRecordMap();
                delete map[sessionIdToReset];
                persistMatchRecordMap(map);
            }
        }

        setIsSettingUp(true);
    };

    const probText =
        prediction != null
            ? `${(prediction.point_win_probability * 100).toFixed(1)}%`
            : "-";

    const headerTournament =
        currentSession?.tournament || tournamentName || "Match live non etichettato";
    const headerMatchType = matchType === "BO3" ? "Best of 3" : "Best of 5";

    const recentFivePoints = recordedPoints.slice(-5).reverse();
    const recentMomentumPoints = recordedPoints.slice(-8);
    const recentSequenceInsight = buildRecentSequenceInsight(recentMomentumPoints);
    const immediateTacticalCall = buildImmediateTacticalCall({
        prediction,
        taggedPrediction,
        recentSequenceInsight,
        onServe,
        isBreakPoint,
        isGamePoint,
        isGamePointAgainst,
    });

    return {
        players,
        sessions,
        selectedPlayerId,
        setSelectedPlayerId,
        newPlayerName,
        setNewPlayerName,
        newPlayerHandedness,
        setNewPlayerHandedness,
        newPlayerPlayStyle,
        setNewPlayerPlayStyle,
        newPlayerNotes,
        setNewPlayerNotes,
        opponentName,
        setOpponentName,
        tournamentName,
        setTournamentName,
        surface,
        setSurface,
        matchType,
        setMatchType,
        firstServer,
        setFirstServer,
        round,
        setRound,
        currentSessionId,
        isSettingUp,
        setIsSettingUp,
        activePlayer,
        currentSession,
        setNumber,
        gameNumber,
        pointNumber,
        setsMe,
        setsOpp,
        gamesMe,
        gamesOpp,
        pointScoreMe,
        pointScoreOpp,
        pendingWinner,
        setPendingWinner,
        macroPattern,
        setMacroPattern,
        finishType,
        setFinishType,
        showAdvanced,
        setShowAdvanced,
        serveNumber,
        setServeNumber,
        serveDirection,
        setServeDirection,
        serveQuality,
        setServeQuality,
        returnType,
        setReturnType,
        rallyPhase,
        setRallyPhase,
        keyEvent,
        setKeyEvent,
        finishShot,
        setFinishShot,
        svcPct,
        setSvcPct,
        rtnPct,
        setRtnPct,
        firstPct,
        setFirstPct,
        secondPct,
        setSecondPct,
        momentumLast5,
        setMomentumLast5,
        loading,
        error,
        prediction,
        taggedPrediction,
        recordedPoints,
        onServe,
        isBreakPoint,
        isGamePoint,
        isGamePointAgainst,
        scorePulseKey,
        probText,
        headerTournament,
        headerMatchType,
        recentFivePoints,
        recentMomentumPoints,
        recentSequenceInsight,
        immediateTacticalCall,
        handleSaveNewPlayer,
        handleRegisterSession,
        handleRegisterAndAnalyze,
        handleUndoLastPoint,
        handleExportCsv,
        handleResetMatch,
        labelPlayStyle,
    };
}