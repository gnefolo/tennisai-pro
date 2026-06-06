// src/pages/LiveMatchPage.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA AL 100%: tutti gli useState, useEffect, useMemo,
//     postJSON, persist*, handleSaveNewPlayer, handleRegisterSession,
//     buildTagPayload, macroToRallyCount, handleRegisterAndAnalyze,
//     handlePointWonInternal (scoring engine completo), handleUndoLastPoint,
//     handleExportCsv, handleResetMatch — IDENTICI all'originale.
//     Modificati: className del wrapper di pagina, card contenitore principale,
//     banner "Match Terminato", bottoni finali. Tutto il resto delegato
//     ai componenti già riscritti.

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type {
  FastMacroPattern, FinishShot, FinishType, Handedness,
  KeyEvent, LiveMatchSession, LivePlayer, LiveTaggedPointResponse,
  MatchType, PersistedLiveState, PersistedMatchRecordMap, PlayStyle,
  PointScore, PredictionResponse, RallyPhase, RecordedPoint,
  ReturnType, ServeDirection, ServeQuality, Surface,
  TacticalPointTag,
} from "../components/live/liveTypes";
import {
  buildImmediateTacticalCall, buildRecentSequenceInsight,
  mapMacroPatternToTag, scoreWon,
} from "../components/live/liveHelpers";
import LiveMatchSetup from "../components/live/LiveMatchSetup";
import LiveMatchHero from "../components/live/LiveMatchHero";
import FastTagPanel from "../components/live/FastTagPanel";
import InfosysMomentumStrip, { type MomentumBeat } from "../components/infosys/InfosysMomentumStrip";
import LiveAnalyticsPanel from "../components/live/LiveAnalyticsPanel";
import PatternDistributionPanel from "../components/live/PatternDistributionPanel";
import { DownloadIcon, ArrowRightIcon } from "../components/ui/icons";
import type { BackendStatus } from "../hooks/useBackendStatus";
// Keep-awake: mantiene lo schermo acceso durante il match (solo su Android/iOS)
let keepAwakePlugin: { keepAwake: () => Promise<void>; allowSleep: () => Promise<void> } | null = null;
import("@capacitor-community/keep-awake").then(m => { keepAwakePlugin = m.KeepAwake; }).catch(() => {});
import CourtModeOverlay from "../components/live/CourtModeOverlay";
import ScoreEditModal from "../components/live/ScoreEditModal";
import ShareModal from "../components/live/ShareModal";

// ── Costanti API e localStorage (invariate) ──────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const PLAYERS_KEY = "tennisai_live_players";
const SESSIONS_KEY = "tennisai_live_sessions";
const LIVE_STATE_KEY = "tennisai_live_active_state";
const LIVE_MATCH_RECORDS_KEY = "tennisai_live_match_records";

// ── postJSON helper (invariato) ───────────────────────────────────────────────
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
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


// ── COMPONENTE ────────────────────────────────────────────────────────────────
interface LiveMatchPageProps {
  onOpenSpinner?: () => void;
  backendStatus?: BackendStatus;
}

export const LiveMatchPage: React.FC<LiveMatchPageProps> = ({ onOpenSpinner, backendStatus }) => {
  // ── Tutto lo state e i handler sono identici all'originale ────────────────
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [sessions, setSessions] = useState<LiveMatchSession[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [newPlayerName, setNewPlayerName] = useState<string>("");
  const [newPlayerHandedness, setNewPlayerHandedness] = useState<Handedness>("R");
  const [newPlayerPlayStyle, setNewPlayerPlayStyle] = useState<PlayStyle>("baseliner");
  const [newPlayerNotes, setNewPlayerNotes] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [tournamentName, setTournamentName] = useState<string>("");
  const [surface, setSurface] = useState<Surface>("Hard");
  const [matchType, setMatchType] = useState<MatchType>("BO3");
  const [firstServer, setFirstServer] = useState<"me" | "opponent">("me");
  const [round, setRound] = useState<string>("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(true);

  const activePlayer = players.find((p) => p.id === selectedPlayerId) || null;
  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  const [setNumber, setSetNumber] = useState<number>(1);
  const [gameNumber, setGameNumber] = useState<number>(1);
  const [pointNumber, setPointNumber] = useState<number>(1);
  const [setsMe, setSetsMe] = useState<number>(0);
  const [setsOpp, setSetsOpp] = useState<number>(0);
  const [gamesMe, setGamesMe] = useState<number>(0);
  const [gamesOpp, setGamesOpp] = useState<number>(0);
  const [pointScoreMe, setPointScoreMe] = useState<PointScore>("0");
  const [pointScoreOpp, setPointScoreOpp] = useState<PointScore>("0");

  const [pendingWinner, setPendingWinner] = useState<"me" | "opponent" | null>(null);
  const [macroPattern, setMacroPattern] = useState<FastMacroPattern | null>(null);
  const [finishType, setFinishType] = useState<FinishType | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [serveNumber, setServeNumber] = useState<1 | 2 | "ACE">(1);
  const [serveDirection, setServeDirection] = useState<ServeDirection | null>(null);
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
  const [taggedPrediction, setTaggedPrediction] = useState<LiveTaggedPointResponse | null>(null);
  const [recordedPoints, setRecordedPoints] = useState<RecordedPoint[]>([]);
  const [isMatchOver, setIsMatchOver] = useState<boolean>(false);
  const [matchWinner, setMatchWinner] = useState<"me" | "opponent" | null>(null);
  const [isCourtMode, setIsCourtMode] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isScoreEditOpen, setIsScoreEditOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  const totalGamesInSet = gamesMe + gamesOpp;
  const isServerSwapped = totalGamesInSet % 2 !== 0;
  const onServe: "me" | "opponent" = useMemo(() => {
    if (firstServer === "me") return isServerSwapped ? "opponent" : "me";
    return isServerSwapped ? "me" : "opponent";
  }, [firstServer, isServerSwapped]);

  const isAdvantageSituation = (scoreA: PointScore, scoreB: PointScore) => {
    if (scoreA === "Ad") return true;
    if (scoreA === "40" && scoreB !== "40" && scoreB !== "Ad") return true;
    return false;
  };
  let isBreakPoint = false, isGamePoint = false, isGamePointAgainst = false;
  if (onServe === "me") {
    isGamePoint = isAdvantageSituation(pointScoreMe, pointScoreOpp);
    isBreakPoint = isAdvantageSituation(pointScoreOpp, pointScoreMe);
    isGamePointAgainst = isBreakPoint;
  } else {
    isGamePoint = isAdvantageSituation(pointScoreOpp, pointScoreMe);
    isBreakPoint = isAdvantageSituation(pointScoreMe, pointScoreOpp);
    isGamePointAgainst = isBreakPoint;
  }

  const [scorePulseKey, setScorePulseKey] = useState<number>(0);
  useEffect(() => { setScorePulseKey((k) => k + 1); },
    [setsMe, setsOpp, gamesMe, gamesOpp, pointScoreMe, pointScoreOpp]);

  // ── Keep-awake: attivo quando il match è in corso ────────────────────────
  useEffect(() => {
    if (!isSettingUp && !isMatchOver) {
      keepAwakePlugin?.keepAwake().catch(() => {});
    } else {
      keepAwakePlugin?.allowSleep().catch(() => {});
    }
    return () => { keepAwakePlugin?.allowSleep().catch(() => {}); };
  }, [isSettingUp, isMatchOver]);

  // ── Network status — graceful offline degradation ────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // ── localStorage load (invariato) ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawPlayers = window.localStorage.getItem(PLAYERS_KEY);
      if (rawPlayers) {
        const parsed = JSON.parse(rawPlayers) as LivePlayer[];
        setPlayers(parsed);
        if (parsed.length > 0) setSelectedPlayerId(parsed[0].id);
      }
    } catch (e) { console.warn("Impossibile leggere i giocatori live da localStorage", e); }
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
    } catch (e) { console.warn("Impossibile leggere le sessioni live da localStorage", e); }
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
        setIsMatchOver(parsed.isMatchOver || false);
        setMatchWinner(parsed.matchWinner || null);
        if (parsed.currentSessionId) setIsSettingUp(false);
      }
    } catch (e) { console.warn("Impossibile leggere lo stato live persistito", e); }
  }, []);

  const persistPlayers = (list: LivePlayer[]) => {
    setPlayers(list);
    if (typeof window !== "undefined") window.localStorage.setItem(PLAYERS_KEY, JSON.stringify(list));
  };
  const persistSessions = (list: LiveMatchSession[]) => {
    setSessions(list);
    if (typeof window !== "undefined") window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  };
  const persistLiveState = (state: PersistedLiveState) => {
    if (typeof window !== "undefined") window.localStorage.setItem(LIVE_STATE_KEY, JSON.stringify(state));
  };
  const readMatchRecordMap = (): PersistedMatchRecordMap => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(LIVE_MATCH_RECORDS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as PersistedMatchRecordMap;
    } catch (e) { console.warn("Impossibile leggere archivio match live", e); return {}; }
  };
  const persistMatchRecordMap = (map: PersistedMatchRecordMap) => {
    if (typeof window !== "undefined") window.localStorage.setItem(LIVE_MATCH_RECORDS_KEY, JSON.stringify(map));
  };

  // ── auto stats from log (invariato) ──────────────────────────────────────
  useEffect(() => {
    const validPoints = recordedPoints.filter((pt) => pt.isPointWon !== undefined);
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
    const firstServePoints = servicePoints.filter((pt) => pt.serveNumber === 1 || pt.serveNumber === "ACE");
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

  // ── persist live state (invariato) ───────────────────────────────────────
  useEffect(() => {
    if (!currentSessionId) return;
    persistLiveState({ currentSessionId, setNumber, gameNumber, pointNumber, setsMe, setsOpp, gamesMe, gamesOpp, pointScoreMe, pointScoreOpp, recordedPoints, isMatchOver, matchWinner });
    if (currentSessionId) {
      const map = readMatchRecordMap();
      map[currentSessionId] = { sessionId: currentSessionId, updatedAt: new Date().toISOString(), setNumber, gameNumber, pointNumber, setsMe, setsOpp, gamesMe, gamesOpp, pointScoreMe, pointScoreOpp, recordedPoints, isMatchOver, matchWinner };
      persistMatchRecordMap(map);
    }
  }, [currentSessionId, setNumber, gameNumber, pointNumber, setsMe, setsOpp, gamesMe, gamesOpp, pointScoreMe, pointScoreOpp, recordedPoints, isMatchOver, matchWinner]);

  // ── Handlers (invariati) ─────────────────────────────────────────────────
  const handleSaveNewPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) { setError("Inserisci almeno il nome del giocatore prima di salvarlo."); return; }
    setError(null);
    const id = `pl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const player: LivePlayer = { id, name, handedness: newPlayerHandedness, playStyle: newPlayerPlayStyle, notes: newPlayerNotes.trim() || undefined };
    const updated = [...players, player];
    persistPlayers(updated);
    setSelectedPlayerId(id);
    setNewPlayerName("");
    setNewPlayerNotes("");
  };

  const handleRegisterSession = () => {
    if (!activePlayer) { setError("Seleziona o crea un giocatore prima di registrare il match."); return; }
    if (!opponentName.trim()) { setError("Inserisci il nome dell'avversario prima di registrare il match."); return; }
    setError(null);
    const id = `sess_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const session: LiveMatchSession = { id, playerId: activePlayer.id, opponentName: opponentName.trim(), tournament: tournamentName.trim() || "Match non etichettato", surface, matchType, firstServer, round: round.trim() || undefined, createdAt: new Date().toISOString() };
    const updated = [...sessions, session];
    persistSessions(updated);
    setCurrentSessionId(id);
    setRecordedPoints([]);
    setIsSettingUp(false);
    setSetNumber(1); setGameNumber(1); setPointNumber(1);
    setSetsMe(0); setSetsOpp(0); setGamesMe(0); setGamesOpp(0);
    setPointScoreMe("0"); setPointScoreOpp("0");
    const map = readMatchRecordMap();
    map[id] = { sessionId: id, updatedAt: new Date().toISOString(), setNumber: 1, gameNumber: 1, pointNumber: 1, setsMe: 0, setsOpp: 0, gamesMe: 0, gamesOpp: 0, pointScoreMe: "0", pointScoreOpp: "0", recordedPoints: [] };
    persistMatchRecordMap(map);
  };

  const buildTagPayload = (): TacticalPointTag => {
    const macroTag = mapMacroPatternToTag(macroPattern, serveDirection, finishType);
    return {
      serve_direction: serveDirection ?? macroTag.serve_direction ?? null,
      serve_quality: serveQuality ?? macroTag.serve_quality ?? null,
      return_type: returnType ?? macroTag.return_type ?? null,
      rally_bucket: macroTag.rally_bucket ?? null,
      rally_phase: rallyPhase ?? macroTag.rally_phase ?? null,
      key_event: keyEvent !== "NONE" ? keyEvent : macroTag.key_event ?? "NONE",
      finish_type: finishType ?? macroTag.finish_type ?? null,
      finish_shot: finishShot ?? macroTag.finish_shot ?? null,
      point_outcome: pendingWinner === "me" ? "WON" : pendingWinner === "opponent" ? "LOST" : null,
    };
  };

  const macroToRallyCount = (macro: FastMacroPattern | null): number => {
    switch (macro) {
      case "SERVE_DOMINANT": case "AGGRESSIVE_RETURN": case "SHORT_RALLY": case "NET_PLAY": return 2;
      case "MEDIUM_RALLY": case "SHORT_BALL_ATTACK": case "PASSING_LOB": return 6;
      case "LONG_RALLY": case "DEFENSE_RECOVERY": return 10;
      default: return 4;
    }
  };

  const handleRegisterAndAnalyze = async () => {
    if (!activePlayer) { setError("Seleziona o crea un giocatore prima."); return; }
    if (!opponentName.trim()) { setError("Inserisci il nome dell'avversario prima."); return; }
    if (!pendingWinner) { setError("Seleziona chi ha vinto il punto."); return; }
    if (!macroPattern) { setError("Seleziona il tipo di punto."); return; }
    if (!finishType) { setError("Seleziona come è finito il punto."); return; }
    setError(null); setLoading(true); setPrediction(null); setTaggedPrediction(null);

    // ── Offline: registra punto localmente senza AI ───────────────────────────
    if (!navigator.onLine) {
      const tag = buildTagPayload();
      const rallyCount = macroToRallyCount(macroPattern);
      const isPointWonVal = pendingWinner === "me" ? 1 : 0;
      const rec: RecordedPoint = {
        id: `pt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        set: setNumber, game: gameNumber, pointNumber,
        isOnServe: onServe === "me" ? 1 : 0, serveNumber,
        serveDirection, serveQuality: tag.serve_quality ?? null,
        returnType: tag.return_type ?? null, rallyBucket: tag.rally_bucket ?? null,
        rallyPhase: tag.rally_phase ?? null, keyEvent: tag.key_event ?? null,
        finishType: tag.finish_type ?? null, finishShot: tag.finish_shot ?? null,
        macroPattern, rallyCount,
        pctServicePointsWon: Math.max(0, Math.min(1, svcPct / 100)),
        pctReturnPointsWon: Math.max(0, Math.min(1, rtnPct / 100)),
        pctFirstServePointsWon: Math.max(0, Math.min(1, firstPct / 100)),
        pctSecondServePointsWon: Math.max(0, Math.min(1, secondPct / 100)),
        momentumLast5: Math.max(0, Math.min(1, momentumLast5 / 100)),
        isBreakPoint: isBreakPoint ? 1 : 0, isGamePoint: isGamePoint ? 1 : 0, isGamePointAgainst: isGamePointAgainst ? 1 : 0,
        isPointWon: isPointWonVal,
        setScoreMe: setsMe, setScoreOpp: setsOpp, gameScoreMe: gamesMe, gameScoreOpp: gamesOpp,
        pointScoreMe, pointScoreOpp, timestamp: new Date().toISOString(),
      };
      setRecordedPoints((prev) => [...prev, rec]);
      handlePointWonInternal(pendingWinner);
      setPendingWinner(null); setMacroPattern(null); setFinishType(null);
      setServeNumber(1); setServeDirection(null); setServeQuality(null);
      setReturnType(null); setRallyPhase(null); setKeyEvent("NONE"); setFinishShot(null);
      setLoading(false);
      return;
    }

    try {
      const tag = buildTagPayload();
      const rallyCount = macroToRallyCount(macroPattern);
      const body = {
        set: setNumber, game: gameNumber, point_number: pointNumber,
        is_on_serve: onServe === "me" ? 1 : 0,
        serve_number: serveNumber === "ACE" ? 1 : serveNumber,
        rally_count: rallyCount,
        stats: { pctServicePointsWon: Math.max(0, Math.min(1, svcPct / 100)), pctReturnPointsWon: Math.max(0, Math.min(1, rtnPct / 100)), pctFirstServePointsWon: Math.max(0, Math.min(1, firstPct / 100)), pctSecondServePointsWon: Math.max(0, Math.min(1, secondPct / 100)), momentumLast5: Math.max(0, Math.min(1, momentumLast5 / 100)) },
        flags: { isBreakPoint, isGamePoint, isGamePointAgainst },
        tag,
        recent_points: recordedPoints.slice(-15).map(pt => ({ isPointWon: pt.isPointWon, macroPattern: pt.macroPattern, rallyCount: pt.rallyCount, isOnServe: pt.isOnServe, serveNumber: pt.serveNumber === "ACE" ? 1 : pt.serveNumber })),
      };
      const data = await postJSON<LiveTaggedPointResponse>(`${API_BASE}/api/live/tagged_point`, body);
      setPrediction(data); setTaggedPrediction(data);
      const isPointWonVal = pendingWinner === "me" ? 1 : 0;
      const rec: RecordedPoint = {
        id: `pt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        set: setNumber, game: gameNumber, pointNumber,
        isOnServe: onServe === "me" ? 1 : 0, serveNumber,
        serveDirection, serveQuality: tag.serve_quality ?? null,
        returnType: tag.return_type ?? null, rallyBucket: tag.rally_bucket ?? null,
        rallyPhase: tag.rally_phase ?? null, keyEvent: tag.key_event ?? null,
        finishType: tag.finish_type ?? null, finishShot: tag.finish_shot ?? null,
        macroPattern, rallyCount,
        pctServicePointsWon: Math.max(0, Math.min(1, svcPct / 100)),
        pctReturnPointsWon: Math.max(0, Math.min(1, rtnPct / 100)),
        pctFirstServePointsWon: Math.max(0, Math.min(1, firstPct / 100)),
        pctSecondServePointsWon: Math.max(0, Math.min(1, secondPct / 100)),
        momentumLast5: Math.max(0, Math.min(1, momentumLast5 / 100)),
        isBreakPoint: isBreakPoint ? 1 : 0, isGamePoint: isGamePoint ? 1 : 0, isGamePointAgainst: isGamePointAgainst ? 1 : 0,
        isPointWon: isPointWonVal,
        modelPointWinProbability: data.point_win_probability,
        modelPatternId: data.pattern_fused.pattern_id, modelPatternName: data.pattern_fused.pattern_name,
        taggedPattern: data.tagged_pattern, pointDescription: data.point_description,
        nextPointPatternHint: data.next_point_pattern_hint,
        tacticalCall: data.tactical_v3?.tactical_call_v3 ?? data.tactical_call,
        tacticalExplanation: data.tactical_v3?.tactical_rationale_v3 ?? data.tactical_explanation,
        riskLevel: data.risk_level, strategicPriority: data.tactical_v3?.strategic_priority,
        matchPlan: data.tactical_v3?.match_plan, dominantZone: data.tactical_v3?.dominant_zone,
        vulnerabilityZone: data.tactical_v3?.vulnerability_zone, recommendedIntent: data.tactical_v3?.recommended_intent,
        setScoreMe: setsMe, setScoreOpp: setsOpp, gameScoreMe: gamesMe, gameScoreOpp: gamesOpp,
        pointScoreMe, pointScoreOpp, timestamp: new Date().toISOString(),
      };
      setRecordedPoints((prev) => [...prev, rec]);
      handlePointWonInternal(pendingWinner);

      // ── Broadcast live agli spettatori via WebSocket ────────────────────────
      if (currentSessionId) {
        fetch(`${API_BASE}/api/live/broadcast/${currentSessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "POINT",
            state: {
              playerName: activePlayer?.name || "Player",
              opponentName: opponentName.trim() || "Opponent",
              setsMe, setsOpp, gamesMe, gamesOpp,
              pointScoreMe, pointScoreOpp, setNumber,
              isPlayerOnServe: onServe === "me",
              tacticalCall: data.tactical_v3?.tactical_call_v3 ?? data.tactical_call ?? "",
              momentumState: data.momentum_state ?? "",
              winProbability: data.point_win_probability,
              patternName: data.pattern_fused?.pattern_name ?? "",
              pointNumber,
            },
          }),
        }).catch(() => { /* non-blocking */ });
      }

      setPendingWinner(null); setMacroPattern(null); setFinishType(null);
      setServeNumber(1); setServeDirection(null); setServeQuality(null);
      setReturnType(null); setRallyPhase(null); setKeyEvent("NONE"); setFinishShot(null);
    } catch (err) {
      console.error("Errore handleRegisterAndAnalyze:", err);
      if (err instanceof Error && err.name === "AbortError") {
        setError("Timeout del motore tattico: il backend (su Render) non ha risposto entro 90 secondi. Il primo avvio può richiedere fino a un minuto, ritenta subito tra poco!");
      } else { setError("Errore nel motore tattico live."); }
    } finally { setLoading(false); }
  };

  const handlePointWonInternal = (winner: "me" | "opponent") => {
    let myP = pointScoreMe, opP = pointScoreOpp;
    let myG = gamesMe, opG = gamesOpp, myS = setsMe, opS = setsOpp;
    let currSetNum = setNumber, currGameNum = gameNumber;
    const setsToWin = matchType === "BO5" ? 3 : 2;
    const winSet = (who: "me" | "opponent") => {
      if (who === "me") myS += 1; else opS += 1;
      myG = 0; opG = 0; currSetNum += 1; currGameNum = 1;
    };
    const winGame = (who: "me" | "opponent") => {
      myP = "0"; opP = "0";
      if (who === "me") myG += 1; else opG += 1;
      currGameNum += 1;
      const isTiebreakResult = (myG === 7 && opG === 6) || (opG === 7 && myG === 6);
      const isNormalSetWin = (myG >= 6 && myG >= opG + 2) || (opG >= 6 && opG >= myG + 2);
      if (isTiebreakResult || isNormalSetWin) winSet(myG > opG ? "me" : "opponent");
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
    setPointScoreMe(myP); setPointScoreOpp(opP);
    setGamesMe(myG); setGamesOpp(opG);
    setSetsMe(myS); setSetsOpp(opS);
    const matchJustOver = myS >= setsToWin || opS >= setsToWin;
    if (!matchJustOver) {
      setSetNumber(currSetNum); setGameNumber(currGameNum);
      setPointNumber((p) => p + 1);
    }
    if (myS >= setsToWin) { setIsMatchOver(true); setMatchWinner("me"); }
    else if (opS >= setsToWin) { setIsMatchOver(true); setMatchWinner("opponent"); }
  };

  const handleUndoLastPoint = () => {
    if (recordedPoints.length === 0) { setError("Non ci sono punti da correggere."); return; }
    setError(null);
    const lastPoint = recordedPoints[recordedPoints.length - 1];
    setRecordedPoints((prev) => prev.slice(0, -1));
    setSetNumber(lastPoint.set); setGameNumber(lastPoint.game); setPointNumber(lastPoint.pointNumber);
    setSetsMe(lastPoint.setScoreMe); setSetsOpp(lastPoint.setScoreOpp);
    setGamesMe(lastPoint.gameScoreMe); setGamesOpp(lastPoint.gameScoreOpp);
    setPointScoreMe(lastPoint.pointScoreMe); setPointScoreOpp(lastPoint.pointScoreOpp);
    setPendingWinner(lastPoint.isPointWon === 1 ? "me" : lastPoint.isPointWon === 0 ? "opponent" : null);
    setMacroPattern(lastPoint.macroPattern ?? null); setFinishType(lastPoint.finishType ?? null);
    setServeNumber(lastPoint.serveNumber); setServeDirection(lastPoint.serveDirection ?? null);
    setServeQuality(lastPoint.serveQuality ?? null); setReturnType(lastPoint.returnType ?? null);
    setRallyPhase(lastPoint.rallyPhase ?? null); setKeyEvent(lastPoint.keyEvent ?? "NONE");
    setFinishShot(lastPoint.finishShot ?? null);
    setPrediction(null); setTaggedPrediction(null);
  };

  const handleExportCsv = () => {
    if (recordedPoints.length === 0) { setError("Non ci sono punti registrati da esportare."); return; }
    setError(null);
    const matchIdForExport = currentSessionId || "live_match";
    const headers = ["match_id", "SetNo", "GameNo", "PointNumber", "is_player_on_serve", "ServeNumber", "serve_direction", "serve_quality", "return_type", "rally_bucket", "rally_phase", "key_event", "finish_type", "finish_shot", "macro_pattern", "RallyCount", "pct_service_points_won", "pct_return_points_won", "pct_first_serve_points_won", "pct_second_serve_points_won", "last_n_points_won_5", "is_game_point", "is_break_point", "is_game_point_against", "is_point_won", "predicted_point_win_probability", "pattern_fused_id", "pattern_fused_name", "tagged_pattern", "point_description", "next_point_pattern_hint", "tactical_call", "tactical_explanation", "risk_level", "strategic_priority", "match_plan", "dominant_zone", "vulnerability_zone", "recommended_intent", "player_name", "opponent_name", "tournament", "surface", "match_type", "round", "set_score_me", "set_score_opp", "game_score_me", "game_score_opp", "point_score_me", "point_score_opp", "timestamp"];
    const csvEscape = (val: unknown): string => { const s = val === null || val === undefined ? "" : typeof val === "number" ? String(val) : String(val); return `"${s.replace(/"/g, '""')}"`; };
    const rows = recordedPoints.map((pt) => {
      const row = [matchIdForExport, pt.set, pt.game, pt.pointNumber, pt.isOnServe, pt.serveNumber, pt.serveDirection ?? "", pt.serveQuality ?? "", pt.returnType ?? "", pt.rallyBucket ?? "", pt.rallyPhase ?? "", pt.keyEvent ?? "", pt.finishType ?? "", pt.finishShot ?? "", pt.macroPattern ?? "", pt.rallyCount, pt.pctServicePointsWon, pt.pctReturnPointsWon, pt.pctFirstServePointsWon, pt.pctSecondServePointsWon, pt.momentumLast5, pt.isGamePoint, pt.isBreakPoint, pt.isGamePointAgainst, pt.isPointWon !== undefined ? pt.isPointWon : "", pt.modelPointWinProbability ?? "", pt.modelPatternId ?? "", pt.modelPatternName ?? "", pt.taggedPattern ?? "", pt.pointDescription ?? "", pt.nextPointPatternHint ?? "", pt.tacticalCall ?? "", pt.tacticalExplanation ?? "", pt.riskLevel ?? "", pt.strategicPriority ?? "", pt.matchPlan ?? "", pt.dominantZone ?? "", pt.vulnerabilityZone ?? "", pt.recommendedIntent ?? "", activePlayer?.name ?? "", opponentName.trim(), currentSession?.tournament || tournamentName || "", surface, matchType, round.trim(), pt.setScoreMe, pt.setScoreOpp, pt.gameScoreMe, pt.gameScoreOpp, pt.pointScoreMe, pt.pointScoreOpp, pt.timestamp];
      return row.map(csvEscape).join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
    a.href = url; a.download = `live_match_${matchIdForExport}_${ts}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = async () => {
    if (recordedPoints.length === 0) { setError("Non ci sono punti registrati da esportare."); return; }
    setError(null); setIsExportingPDF(true);
    try {
      const payload = {
        player_name: activePlayer?.name || "Player",
        opponent_name: opponentName.trim() || "Opponent",
        tournament: currentSession?.tournament || tournamentName || "Match",
        surface, match_type: matchType,
        date: new Date().toISOString().split("T")[0],
        sets_me: setsMe, sets_opp: setsOpp,
        games_me: gamesMe, games_opp: gamesOpp,
        total_points: recordedPoints.length,
        svc_pct: svcPct, rtn_pct: rtnPct,
        first_pct: firstPct, second_pct: secondPct,
        recorded_points: recordedPoints.map(pt => ({
          set: pt.set, game: pt.game, pointNumber: pt.pointNumber,
          isPointWon: pt.isPointWon, macroPattern: pt.macroPattern ?? null,
          finishType: pt.finishType ?? null, serveDirection: pt.serveDirection ?? null,
          serveQuality: pt.serveQuality ?? null, isOnServe: pt.isOnServe,
          modelPointWinProbability: pt.modelPointWinProbability ?? null,
          tacticalCall: pt.tacticalCall ?? null,
        })),
      };
      const res = await fetch(`${API_BASE}/api/session/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
      const pname = (activePlayer?.name || "Player").replace(/\s+/g, "_");
      const oname = opponentName.trim().replace(/\s+/g, "_") || "Opponent";
      a.href = url; a.download = `report_${pname}_vs_${oname}_${ts}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Errore nella generazione del PDF. Verifica la connessione al backend.");
    } finally { setIsExportingPDF(false); }
  };

  const handleResetMatch = () => {
    const sessionIdToReset = currentSessionId;
    setCurrentSessionId(null);
    setSetNumber(1); setGameNumber(1); setPointNumber(1);
    setSetsMe(0); setSetsOpp(0); setGamesMe(0); setGamesOpp(0);
    setPointScoreMe("0"); setPointScoreOpp("0");
    setRecordedPoints([]); setPrediction(null); setTaggedPrediction(null);
    setPendingWinner(null); setMacroPattern(null); setFinishType(null);
    setServeNumber(1); setServeDirection(null); setServeQuality(null);
    setReturnType(null); setRallyPhase(null); setKeyEvent("NONE"); setFinishShot(null);
    setIsMatchOver(false); setMatchWinner(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LIVE_STATE_KEY);
      if (sessionIdToReset) { const map = readMatchRecordMap(); delete map[sessionIdToReset]; persistMatchRecordMap(map); }
    }
    setIsSettingUp(true);
  };

  // ── Valori derivati per i componenti (invariati) ──────────────────────────
  const probText = prediction != null ? `${(prediction.point_win_probability * 100).toFixed(1)}%` : "-";

  // ── Momentum beats: RecordedPoint[] → MomentumBeat[] (chronological) ───────
  const momentumBeats = useMemo<MomentumBeat[]>(() =>
    recordedPoints.map((pt) => ({
      id: pt.id,
      pointNumber: pt.pointNumber,
      won: pt.isPointWon === 1,
      rallyLength: (pt.rallyBucket ?? "MEDIUM") as "SHORT" | "MEDIUM" | "LONG",
      probability: pt.modelPointWinProbability,
      hasPressure: pt.isBreakPoint === 1 || pt.isGamePoint === 1 || pt.isGamePointAgainst === 1,
      pointScore: `${pt.pointScoreMe}-${pt.pointScoreOpp}`,
      finishType: pt.finishType ?? undefined,
    })),
    [recordedPoints]
  );
  const headerTournament = currentSession?.tournament || tournamentName || "Match live non etichettato";
  const headerMatchType = matchType === "BO3" ? "Best of 3" : "Best of 5";
  const recentFivePoints = recordedPoints.slice(-5).reverse();
  const recentMomentumPoints = recordedPoints.slice(-8);
  const recentSequenceInsight = buildRecentSequenceInsight(recentMomentumPoints);
  const fallbackImmediateTacticalCall = buildImmediateTacticalCall({ prediction, taggedPrediction, recentSequenceInsight, onServe, isBreakPoint, isGamePoint, isGamePointAgainst });
  const immediateTacticalCall = prediction?.tactical_call?.trim() || fallbackImmediateTacticalCall;

  // ── Setup screen (invariato, usa componente già riscritto) ────────────────
  if (isSettingUp) {
    return (
      <LiveMatchSetup
        players={players} selectedPlayerId={selectedPlayerId} activePlayer={activePlayer}
        newPlayerName={newPlayerName} newPlayerHandedness={newPlayerHandedness}
        newPlayerPlayStyle={newPlayerPlayStyle} newPlayerNotes={newPlayerNotes}
        opponentName={opponentName} tournamentName={tournamentName}
        surface={surface} matchType={matchType} firstServer={firstServer} round={round}
        error={error}
        onSelectedPlayerChange={setSelectedPlayerId}
        onNewPlayerNameChange={setNewPlayerName}
        onNewPlayerHandednessChange={setNewPlayerHandedness}
        onNewPlayerPlayStyleChange={setNewPlayerPlayStyle}
        onNewPlayerNotesChange={setNewPlayerNotes}
        onOpponentNameChange={setOpponentName}
        onTournamentNameChange={setTournamentName}
        onSurfaceChange={setSurface} onMatchTypeChange={setMatchType}
        onFirstServerChange={setFirstServer} onRoundChange={setRound}
        onSaveNewPlayer={handleSaveNewPlayer} onRegisterSession={handleRegisterSession}
      />
    );
  }

  // ── Live match screen ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Banner Offline — portal per evitare il containing-block del filter outdoor ── */}
      {!isOnline && createPortal(
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2.5 bg-clay-amber/95 backdrop-blur-sm px-4 py-2.5 text-court-night text-[12px] font-bold"
             style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}>
          <span className="w-2 h-2 rounded-full bg-court-night/50 animate-pulse" />
          Modalità offline — punti registrati localmente, analisi AI non disponibile
        </div>,
        document.body
      )}

      {/* ── Banner Backend — mostrato quando il backend non è raggiungibile ── */}
      {backendStatus && backendStatus !== "online" && backendStatus !== "unknown" && createPortal(
        <div
          className={`fixed left-0 right-0 z-[49] flex items-center justify-center gap-2.5 px-4 py-2 text-[11px] font-semibold backdrop-blur-sm ${
            !isOnline ? "top-10" : "top-0"
          } ${
            backendStatus === "checking"
              ? "bg-white/[0.06] text-fog/60"
              : "bg-red-500/20 text-red-300"
          }`}
          style={{ paddingTop: !isOnline ? "0.5rem" : "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === "checking" ? "bg-fog/40 animate-pulse" : "bg-red-400"}`} />
          {backendStatus === "checking"
            ? "Verifica connessione backend…"
            : "Backend non raggiungibile — le analisi AI potrebbero non essere disponibili"}
        </div>,
        document.body
      )}

      {/* ── Share Modal (Spectator) ── */}
      {isShareOpen && currentSessionId && (
        <ShareModal sessionId={currentSessionId} onClose={() => setIsShareOpen(false)} />
      )}

      {/* ── Score Quick-Edit Modal ── */}
      {isScoreEditOpen && (
        <ScoreEditModal
          setsMe={setsMe} setsOpp={setsOpp}
          gamesMe={gamesMe} gamesOpp={gamesOpp}
          pointScoreMe={pointScoreMe} pointScoreOpp={pointScoreOpp}
          playerName={activePlayer?.name}
          opponentName={opponentName || "Avversario"}
          onSave={({ setsMe: sm, setsOpp: so, gamesMe: gm, gamesOpp: go, pointScoreMe: pm, pointScoreOpp: po }) => {
            setSetsMe(sm); setSetsOpp(so);
            setGamesMe(gm); setGamesOpp(go);
            setPointScoreMe(pm); setPointScoreOpp(po);
            setIsScoreEditOpen(false);
          }}
          onClose={() => setIsScoreEditOpen(false)}
        />
      )}

      {/* ── Court Mode Overlay — portal: esce dal containing-block del filter outdoor ── */}
      {isCourtMode && createPortal(
        <CourtModeOverlay
          playerName={activePlayer?.name}
          opponentName={opponentName || "Avversario"}
          setsMe={setsMe} setsOpp={setsOpp}
          gamesMe={gamesMe} gamesOpp={gamesOpp}
          pointScoreMe={pointScoreMe} pointScoreOpp={pointScoreOpp}
          setNumber={setNumber}
          isPlayerOnServe={onServe === "me"}
          pendingWinner={pendingWinner}
          serveNumber={serveNumber}
          serveDirection={serveDirection}
          serveQuality={serveQuality}
          macroPattern={macroPattern}
          returnType={returnType}
          rallyPhase={rallyPhase}
          keyEvent={keyEvent}
          finishType={finishType}
          finishShot={finishShot}
          loading={loading}
          canUndo={recordedPoints.length > 0}
          onPendingWinnerChange={setPendingWinner}
          onServeNumberChange={setServeNumber}
          onServeDirectionChange={setServeDirection}
          onServeQualityChange={setServeQuality}
          onMacroPatternChange={setMacroPattern}
          onReturnTypeChange={setReturnType}
          onRallyPhaseChange={setRallyPhase}
          onKeyEventChange={setKeyEvent}
          onFinishTypeChange={setFinishType}
          onFinishShotChange={setFinishShot}
          onRegister={handleRegisterAndAnalyze}
          onUndo={handleUndoLastPoint}
          onClose={() => setIsCourtMode(false)}
          probText={probText !== "-" ? probText : undefined}
          tacticalCall={immediateTacticalCall || undefined}
          momentumState={prediction?.momentum_state}
        />,
        document.body
      )}

      {/* ── Wrapper hero card — court-night con elevation */}
      <div className="bg-court-night/95 border border-white/[0.07] rounded-[24px] p-6 lg:p-8 flex flex-col gap-6 relative shadow-[var(--e-3)]">
        <LiveMatchHero
          playerName={activePlayer?.name}
          opponentName={opponentName || "Avversario"}
          tournament={headerTournament}
          surface={surface}
          matchType={headerMatchType}
          round={round}
          setNumber={setNumber} gameNumber={gameNumber} pointNumber={pointNumber}
          setsMe={setsMe} gamesMe={gamesMe} pointScoreMe={pointScoreMe}
          setsOpp={setsOpp} gamesOpp={gamesOpp} pointScoreOpp={pointScoreOpp}
          onServe={onServe}
          pointProbability={probText}
          recordedPoints={recordedPoints.length}
          tacticalCall={immediateTacticalCall}
          tacticalConfidence={prediction?.tactical_confidence}
          momentumState={prediction?.momentum_state}
          pressureState={prediction?.pressure_state}
          scorePulseKey={scorePulseKey}
          onOpenSettings={() => setIsSettingUp(true)}
          onResetMatch={handleResetMatch}
          onOpenScoreEdit={() => setIsScoreEditOpen(true)}
          isMatchOver={isMatchOver}
        />
      </div>

      <InfosysMomentumStrip
        beats={momentumBeats}
        player1={activePlayer?.name || "Player"}
        player2={opponentName || "Avversario"}
      />

      <div className="flex flex-col gap-4">

        {/* ── Tag panel ── */}
        <div className="flex flex-col gap-4">

          {isMatchOver ? (
            /* ── Banner "Match Terminato" — design system v2 */
            <div className="rounded-[24px] border border-success/25 bg-[linear-gradient(135deg,rgba(34,197,94,0.12),rgba(11,18,32,0.98))] p-6 md:p-8 shadow-[var(--e-2)]">
              <div className="text-center">
                {/* Badge */}
                <div className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.20em] text-success mb-4">
                  Match Terminato
                </div>
                {/* Vincitore */}
                <div className="font-head text-2xl md:text-3xl font-bold text-baseline mt-2">
                  {matchWinner === "me"
                    ? `${activePlayer?.name || "Player"} vince!`
                    : `${opponentName || "Opponent"} vince!`}
                </div>
                {/* Score finale */}
                <div className="font-head text-lg text-fog/70 mt-2 font-semibold">
                  {setsMe} – {setsOpp}
                </div>
                <div className="text-sm text-fog/40 mt-1">
                  {recordedPoints.length} punti registrati
                </div>
                {/* CTA */}
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <button
                    onClick={handleGeneratePDF}
                    disabled={isExportingPDF}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r-pill)] bg-ace-lime text-court-night text-sm font-bold tracking-wide hover:bg-ace-lime-hover hover:scale-[1.02] transition-all shadow-[var(--lime-glow)] disabled:opacity-50"
                  >
                    <DownloadIcon size={16} />
                    {isExportingPDF ? "Generazione..." : "Report PDF"}
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r-pill)] border border-white/10 bg-white/[0.04] text-fog text-sm font-semibold hover:border-white/20 transition-all"
                  >
                    <DownloadIcon size={16} />
                    CSV Raw
                  </button>
                  <button
                    onClick={handleResetMatch}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r-pill)] border border-white/10 bg-white/[0.04] text-fog text-sm font-semibold hover:border-white/20 transition-all"
                  >
                    Nuovo Match
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <FastTagPanel
              pendingWinner={pendingWinner} macroPattern={macroPattern} finishType={finishType}
              showAdvanced={showAdvanced} serveNumber={serveNumber}
              serveDirection={serveDirection} serveQuality={serveQuality}
              returnType={returnType} rallyPhase={rallyPhase} keyEvent={keyEvent}
              finishShot={finishShot} loading={loading}
              canUndo={recordedPoints.length > 0}
              isPlayerOnServe={onServe === "me"}
              onPendingWinnerChange={setPendingWinner}
              onMacroPatternChange={setMacroPattern}
              onFinishTypeChange={setFinishType}
              onToggleAdvanced={() => setShowAdvanced((v) => !v)}
              onServeNumberChange={setServeNumber}
              onServeDirectionChange={setServeDirection}
              onServeQualityChange={setServeQuality}
              onReturnTypeChange={setReturnType}
              onRallyPhaseChange={setRallyPhase}
              onKeyEventChange={setKeyEvent}
              onFinishShotChange={setFinishShot}
              onUndo={handleUndoLastPoint}
              onRegister={handleRegisterAndAnalyze}
            />
          )}

        </div>

        {/* ── Analytics hub — sotto il tag panel ── */}
        <div className="flex flex-col gap-4">
          <LiveAnalyticsPanel
            svcPct={svcPct} rtnPct={rtnPct} firstPct={firstPct}
            secondPct={secondPct} momentumLast5={momentumLast5}
            prediction={prediction}
            taggedPrediction={taggedPrediction}
            probText={probText}
            recordedPoints={recordedPoints}
            recentFivePoints={recentFivePoints}
            onExportCsv={handleExportCsv}
            error={error}
          />
        </div>

      </div>
      {/* ── FAB cluster — portal per viewport-fixed corretto con outdoor mode ── */}
      {!isMatchOver && createPortal(
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-30 flex flex-col gap-2 items-end">
          {/* Spinner AI Coach */}
          {onOpenSpinner && (
            <button
              onClick={onOpenSpinner}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-yellow-400 shadow-[0_4px_20px_rgba(250,204,21,0.15)] hover:bg-yellow-400/20 hover:border-yellow-400/60 active:scale-95 transition-all backdrop-blur-sm"
              aria-label="Apri Spinner AI Coach"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M3.5 8.5 Q8 12 3.5 15.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M20.5 8.5 Q16 12 20.5 15.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider">Spinner</span>
            </button>
          )}
          {/* Condividi / Spectator */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-info/40 bg-info/10 px-4 py-3 text-info shadow-[0_4px_20px_rgba(59,130,246,0.15)] hover:bg-info/20 hover:border-info/60 active:scale-95 transition-all backdrop-blur-sm"
            aria-label="Condividi match"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Share</span>
          </button>
          {/* Court Mode */}
          <button
            onClick={() => setIsCourtMode(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-orange-400 shadow-[0_4px_24px_rgba(249,115,22,0.20)] hover:bg-orange-500/20 hover:border-orange-500/60 active:scale-95 transition-all backdrop-blur-sm"
            aria-label="Attiva Court Mode"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Court</span>
          </button>
        </div>,
        document.body
      )}

    </div >
  );
};

export default LiveMatchPage;
