// src/hooks/useInfosysDemoState.ts
// v6 — Undo + Fan Mode (BroadcastChannel)
// Changes from v5:
//   - Undo last point: stores pre-point snapshot, restores on undo
//   - BroadcastChannel: coach tab pushes state to fan tabs
//   - Fan mode: read-only view that receives updates

import { useState, useCallback, useEffect, useRef } from "react";
import {
  type MatchState,
  type RunningStats,
  type PressureFlags,
  type ScoringResult,
  createMatch,
  createInitialStats,
  scorePoint,
  computeFlags,
  getPointScore,
  getGameScore,
  getSetScores,
  getFullScore,
  getSetScoresArray,
} from "./useTennisScoring";

// ─── TIPI ────────────────────────────────────────────────────────────────────

export type DemoStep =
  | "scenario"
  | "predict"
  | "simulate"
  | "register"
  | "explain"
  | "export";

export type OutputMode = "fan" | "coach" | "media" | "api";

export type BackendStatus = "unknown" | "online" | "offline";

export interface DemoScenario {
  id: string;
  label: string;
  description: string;
  surface: string;
  round: string;
  player1: string;
  player2: string;
  score: string;
  pointScore: string;
  pressureState: string;
  isOnServe: boolean;
  serveNumber: 1 | 2;
  momentum: "HOT" | "NEUTRAL" | "COLD";
  svcPct: number;
  rtnPct: number;
  firstSvcPct: number;
  secondSvcPct: number;
  // momentumLast5: frazione [0,1] che rappresenta quanti degli ultimi 5 punti sono stati vinti
  // 0.0 = 0/5 punti, 0.5 = 2-3/5, 1.0 = 5/5
  momentumLast5: number;
  isBreakPoint: boolean;
  isGamePoint: boolean;
  isGamePointAgainst: boolean;
  // Contesto set/game/point per payload realistico
  set: number;
  game: number;
  pointNumber: number;
}

export interface PredictionResult {
  probability: number;
  prediction: 1 | 0;
  patternName: string;
  patternId: number;
  tacticalCall: string;
  tacticalConfidence: "HIGH" | "MEDIUM" | "LOW";
  momentumState: "HOT" | "NEUTRAL" | "COLD";
  pressureState: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  tacticalExplanation: string;
  serveState?: string;
  rallyProfile?: string;
  nextPointHint?: string;
  pointDescription?: string;
  tacticalV3?: {
    tacticalCallV3: string;
    tacticalSummaryV3: string;
    tacticalRationaleV3: string;
    strategicPriority: string;
    matchPlan: string;
    dominantZone: string;
    vulnerabilityZone: string;
    recommendedIntent: string;
  };
  isDemoFallback: boolean;
  predictionUnavailable?: boolean;
  modelMetadata?: {
    version: string;
    model_type: string;
    calibration_method: string;
    split_type: string;
    brier_score?: number;
    accuracy?: number;
    roc_auc?: number;
  };
}

export interface PatternAlternative {
  id: string;
  name: string;
  uplift: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

export interface RegisteredOutcome {
  actualPattern: string;
  winner: "player" | "opponent";
  rallyLength: "SHORT" | "MEDIUM" | "LONG";
  finishType: "WINNER" | "FORCED_ERROR" | "UNFORCED_ERROR";
  serveDirection?: "T" | "BODY" | "WIDE";
  note?: string;
}

export interface PostPointExplanation {
  probabilityBefore: number;
  actualOutcome: "WON" | "LOST";
  probabilitySwing: number;
  explanation: string;
  nextPointAdjustment: string;
  isDemoFallback: boolean;
}

export interface InsightSet {
  fan: string;
  coach: string;
  media: string;
  apiPayload: object;
}

// ─── LIVE LOOP TYPES ─────────────────────────────────────────────────────────

export interface TaggedPoint {
  id: number;
  pointNumber: number;
  timestamp: number;
  prediction: PredictionResult;
  outcome: RegisteredOutcome;
  swing: number;         // pp swing (positive = good for player)
  won: boolean;
  pointScore: string;    // score at the time of the point
}

// ─── SCENARI DEMO ────────────────────────────────────────────────────────────

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "scenario_bp_break",
    label: "Break Point Crisis",
    description: "Sinner serving at 3-5, facing break point in 3rd set",
    surface: "Hard",
    round: "SF",
    player1: "Sinner J.",
    player2: "Alcaraz C.",
    score: "4-6, 6-3, 3-5",
    pointScore: "30-40",
    pressureState: "BREAK_POINT_AGAINST",
    isOnServe: true,
    serveNumber: 2,
    momentum: "COLD",
    svcPct: 0.64,
    rtnPct: 0.42,
    firstSvcPct: 0.72,
    secondSvcPct: 0.48,
    momentumLast5: 0.2,   // 1/5 ultimi punti vinti → COLD
    isBreakPoint: true,
    isGamePoint: false,
    isGamePointAgainst: true,
    set: 3,
    game: 6,
    pointNumber: 4,
  },
  {
    id: "scenario_gp_close",
    label: "Game Point Opportunity",
    description: "Djokovic leads 40-15, closing out a crucial hold",
    surface: "Clay",
    round: "QF",
    player1: "Djokovic N.",
    player2: "Zverev A.",
    score: "6-3, 2-3",
    pointScore: "40-15",
    pressureState: "GAME_POINT_FOR",
    isOnServe: true,
    serveNumber: 1,
    momentum: "HOT",
    svcPct: 0.71,
    rtnPct: 0.51,
    firstSvcPct: 0.78,
    secondSvcPct: 0.62,
    momentumLast5: 0.8,   // 4/5 ultimi punti vinti → HOT
    isBreakPoint: false,
    isGamePoint: true,
    isGamePointAgainst: false,
    set: 2,
    game: 3,
    pointNumber: 3,
  },
  {
    id: "scenario_neutral_tiebreak",
    label: "Tiebreak Pressure",
    description: "Medvedev at 5-6* in tiebreak, returning on grass",
    surface: "Grass",
    round: "R16",
    player1: "Medvedev D.",
    player2: "Fritz T.",
    score: "6-7(4), 7-5, 6-6*",
    pointScore: "5-6*",
    pressureState: "NEUTRAL",
    isOnServe: false,
    serveNumber: 1,
    momentum: "NEUTRAL",
    svcPct: 0.58,
    rtnPct: 0.47,
    firstSvcPct: 0.66,
    secondSvcPct: 0.50,
    momentumLast5: 0.4,   // 2/5 → NEUTRAL
    isBreakPoint: false,
    isGamePoint: false,
    isGamePointAgainst: false,
    set: 3,
    game: 12,
    pointNumber: 11,
  },
];

// ─── FALLBACK DEMO (usato solo se backend offline) ───────────────────────────

const DEMO_PREDICTION_FALLBACK: PredictionResult = {
  probability: 0.54,
  prediction: 1,
  patternName: "Serve T + Inside-Out Forehand",
  patternId: 3,
  tacticalCall: "Attack the T, open court with FH",
  tacticalConfidence: "MEDIUM",
  momentumState: "COLD",
  pressureState: "BREAK_POINT_AGAINST",
  riskLevel: "MEDIUM",
  tacticalExplanation:
    "On 2nd serve, opponent tends to drive return cross-court. A T serve (flat) followed by inside-out forehand exploits the open court. Success rate +12% vs baseline in similar pressure states.",
  nextPointHint: "serve_neutral_build",
  isDemoFallback: true,
};

const BASE_PATTERNS: PatternAlternative[] = [
  {
    id: "p1",
    name: "Flat T-Serve + Inside-Out FH",
    uplift: +14,
    risk: "MEDIUM",
    confidence: "HIGH",
    description: "Dominant pattern in this pressure state. Forces opponent wide.",
  },
  {
    id: "p2",
    name: "Body Serve + Aggressive Baseline",
    uplift: +7,
    risk: "LOW",
    confidence: "HIGH",
    description: "Safe baseline option. Limits errors under pressure.",
  },
  {
    id: "p3",
    name: "Wide Kicker + Extended Rally",
    uplift: -3,
    risk: "HIGH",
    confidence: "LOW",
    description: "Opponent strong from the deuce side. Not recommended.",
  },
];

// ─── UTILITÀ: traduce campi italiani del backend in inglese per display ───────

function translateTacticalCall(it: string): string {
  const map: Record<string, string> = {
    "Pressione massima e chiusura del punto.": "Maximum pressure — close the point decisively.",
    "Stabilizza lo scambio, riduci il rischio.": "Stabilise the rally, reduce unforced errors.",
    "Seconda palla: costruisci con margine.": "2nd serve: build with margin, avoid free points.",
    "Difendi la seconda scendendo in campo.": "Defend the 2nd serve by moving forward.",
    "Risposta offensiva. Prendi il controllo.": "Aggressive return — take control immediately.",
    "Usa il tuo schema migliore.": "Execute your highest-percentage pattern.",
    "Chiudi pulito, non strafare.": "Close cleanly — no unnecessary risks.",
    "Spezza il ritmo. Evita scambi prolungati.": "Disrupt the rhythm — avoid extended baseline rallies.",
    "Comanda dal primo colpo.": "Dominate from the first shot.",
    "Iniziativa e controllo.": "Take initiative and control the exchange.",
    "Difesa attiva e contrattacco.": "Active defence — wait for the right ball to counter.",
    "Costruisci il punto con pazienza.": "Build the point patiently with high-percentage shots.",
  };
  return map[it] ?? it;
}

function translateTacticalExplanation(it: string): string {
  // Traduzione semplificata: rimuove pattern tipicamente italiani
  // Se il backend restituisce già inglese, la funzione è trasparente
  if (/[àèéìòù]/.test(it)) {
    // Contiene accenti italiani — serve traduzione
    return it
      .replace("al servizio", "on serve")
      .replace("in risposta", "returning")
      .replace("l'avversario", "the opponent")
      .replace("risposta", "return")
      .replace("errori gratuiti", "unforced errors")
      .replace("scambio", "rally")
      .replace("profondità", "depth")
      .replace("Affidati a pattern ad alta percentuale", "Execute high-percentage patterns")
      .replace("niente improvvisazione", "no improvisation")
      .replace("Non subire l'iniziativa sulla seconda", "Don't let opponent dictate on 2nd serve")
      .replace("usa la rotazione per tenerti profondo", "use topspin to stay deep");
  }
  return it;
}

// ─── CALCOLA PATTERN ALTERNATIVI dal risultato del backend ───────────────────

function buildPatternsFromResult(result: PredictionResult): PatternAlternative[] {
  const prob = result.probability;
  const baseUplift = Math.round((prob - 0.5) * 100);
  const positiveUplift = Math.max(3, Math.abs(baseUplift));

  // Pattern 1: quello raccomandato dal backend (uplift massimo)
  const p1: PatternAlternative = {
    id: "p1",
    name: result.patternName,
    uplift: positiveUplift + Math.round(Math.random() * 4), // piccola variazione realistica
    risk: result.riskLevel,
    confidence: result.tacticalConfidence,
    description: result.tacticalExplanation.slice(0, 100) + (result.tacticalExplanation.length > 100 ? "…" : ""),
  };

  // Pattern 2: alternativa sicura (uplift minore, rischio basso)
  const p2: PatternAlternative = {
    id: "p2",
    name: result.serveState === "RETURNING"
      ? "Deep Cross-Court Return + Rally"
      : "Body Serve + Aggressive Baseline",
    uplift: Math.max(2, positiveUplift - 6),
    risk: "LOW",
    confidence: "HIGH",
    description: result.serveState === "RETURNING"
      ? "Safe return option — neutralise opponent's serve and build from baseline."
      : "Conservative but effective. Protects the serve point under pressure.",
  };

  // Pattern 3: alternativa ad alto rischio (uplift negativo se sfavorevole)
  const p3: PatternAlternative = {
    id: "p3",
    name: result.serveState === "RETURNING"
      ? "Chip-and-Charge"
      : "Drop Serve + Net Rush",
    uplift: -(Math.round(Math.random() * 5) + 2),
    risk: "HIGH",
    confidence: "LOW",
    description: "High variance option. Not recommended in this pressure state.",
  };

  return [p1, p2, p3];
}

// ─── GENERA INSIGHTS ──────────────────────────────────────────────────────────

function buildInsights(
  scenario: DemoScenario,
  prediction: PredictionResult,
  outcome: RegisteredOutcome
): InsightSet {
  const prob = Math.round(prediction.probability * 100);
  const won = outcome.winner === "player";
  const swingSign = won ? "+" : "-";
  const swingPp = Math.round(Math.abs(prediction.probability - 0.5) * 100);

  return {
    fan: `${scenario.player1} was facing ${scenario.pressureState.replace(/_/g, " ").toLowerCase()} at ${scenario.pointScore}. With a ${prob}% predicted win probability, ${won ? "the execution paid off" : "the opponent struck back"} — a ${outcome.finishType === "WINNER" ? "clean winner" : outcome.finishType.toLowerCase().replace(/_/g, " ")} on a ${outcome.rallyLength.toLowerCase()}-ball exchange.`,

    coach: `Pre-point calibrated probability: ${prob}% (${prediction.tacticalConfidence} confidence, ${prediction.riskLevel} risk). Recommended: "${prediction.patternName}". Executed: "${outcome.actualPattern}". Outcome: ${won ? "WON" : "LOST"} — ${outcome.finishType.replace(/_/g, " ")} after ${outcome.rallyLength.toLowerCase()} rally. Probability swing: ${swingSign}${swingPp}pp. Next-point adjustment: ${prediction.tacticalV3?.recommendedIntent || prediction.nextPointHint || "maintain pattern discipline"}.`,

    media: `${scenario.player1} at ${scenario.score} (${scenario.pointScore}, ${scenario.pressureState.replace(/_/g, " ")}). TennisAI model: ${prob}% pre-point win probability. Outcome: ${won ? scenario.player1 : scenario.player2} — ${outcome.finishType.toLowerCase().replace(/_/g, " ")} after ${outcome.rallyLength.toLowerCase()} rally. Probability swing ${swingSign}${swingPp}pp. Pattern: "${outcome.actualPattern}".`,

    apiPayload: {
      schema_version: "2.0",
      pre_point_safe: true,
      calibrated: true,
      model_version: "xgb_calibrated_v3",
      is_demo_fallback: prediction.isDemoFallback,
      match_context: {
        player: scenario.player1,
        opponent: scenario.player2,
        surface: scenario.surface,
        round: scenario.round,
        score: scenario.score,
        point_score: scenario.pointScore,
        pressure_state: prediction.pressureState,
        is_on_serve: scenario.isOnServe,
        serve_number: scenario.serveNumber,
        momentum_state: prediction.momentumState,
        serve_state: prediction.serveState,
        rally_profile: prediction.rallyProfile,
      },
      prediction: {
        point_win_probability: prediction.probability,
        tactical_call: prediction.tacticalCall,
        tactical_confidence: prediction.tacticalConfidence,
        risk_level: prediction.riskLevel,
        pattern_name: prediction.patternName,
        pattern_id: prediction.patternId,
        next_point_hint: prediction.nextPointHint,
      },
      tactical_v3: prediction.tacticalV3 ?? null,
      registered_outcome: {
        actual_pattern: outcome.actualPattern,
        winner: outcome.winner,
        rally_length: outcome.rallyLength,
        finish_type: outcome.finishType,
        serve_direction: outcome.serveDirection ?? null,
      },
      insights: {
        fan: null,      // populated client-side
        coach: null,
        media: null,
      },
    },
  };
}

// ─── API_BASE corretto per Vite ───────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

async function getJSON<T>(url: string, timeoutMs = 4000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function postJSON<T>(url: string, body: unknown, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── PERSISTENZA ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "tennisai_live_match";

interface SavedMatch {
  v: number;
  ts: number;
  matchState: MatchState;
  runningStats: RunningStats;
  pointHistory: TaggedPoint[];
  scenario: DemoScenario;
  prediction: PredictionResult | null;
}

function saveMatch(data: SavedMatch): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded or private mode — silent */ }
}

function loadMatch(): SavedMatch | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedMatch;
    if (data.v !== 1 || !data.matchState || !data.scenario) return null;
    return data;
  } catch {
    return null;
  }
}

function clearSavedMatch(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* silent */ }
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCSV(scenario: DemoScenario, history: TaggedPoint[], matchState: MatchState, stats: RunningStats): string {
  const header = [
    "point_number","timestamp","won","finish_type","rally_length",
    "serve_direction","point_score","probability","swing_pp",
    "pattern","is_demo_fallback",
  ].join(",");

  // Points are stored newest-first, reverse for chronological
  const rows = [...history].reverse().map((p) => [
    p.pointNumber,
    new Date(p.timestamp).toISOString(),
    p.won ? 1 : 0,
    p.outcome.finishType,
    p.outcome.rallyLength,
    p.outcome.serveDirection ?? "",
    `"${p.pointScore}"`,
    p.prediction.probability.toFixed(4),
    p.swing,
    `"${p.outcome.actualPattern}"`,
    p.prediction.isDemoFallback ? 1 : 0,
  ].join(","));

  const meta = [
    `# TennisAI Pro — Match Export`,
    `# ${scenario.player1} vs ${scenario.player2}`,
    `# ${scenario.surface} · ${scenario.round}`,
    `# Final score: ${getFullScore(matchState)}`,
    `# Points: ${history.length} · Svc%: ${(stats.svcPct * 100).toFixed(1)} · Rtn%: ${(stats.rtnPct * 100).toFixed(1)}`,
    `# Exported: ${new Date().toISOString()}`,
    `#`,
  ].join("\n");

  return meta + "\n" + header + "\n" + rows.join("\n") + "\n";
}

function buildJSON(scenario: DemoScenario, history: TaggedPoint[], matchState: MatchState, stats: RunningStats): string {
  const data = {
    meta: {
      tool: "TennisAI Pro",
      version: "2.0.0",
      exported: new Date().toISOString(),
    },
    match: {
      player1: scenario.player1,
      player2: scenario.player2,
      surface: scenario.surface,
      round: scenario.round,
      finalScore: getFullScore(matchState),
      winner: matchState.winner === 1 ? scenario.player1
            : matchState.winner === 2 ? scenario.player2
            : null,
      setsCompleted: matchState.completedSets,
      totalPoints: history.length,
    },
    stats: {
      svcPointsPlayed: stats.svcPointsPlayed,
      svcPointsWon: stats.svcPointsWon,
      svcPct: stats.svcPct,
      rtnPointsPlayed: stats.rtnPointsPlayed,
      rtnPointsWon: stats.rtnPointsWon,
      rtnPct: stats.rtnPct,
    },
    points: [...history].reverse().map((p) => ({
      pointNumber: p.pointNumber,
      timestamp: new Date(p.timestamp).toISOString(),
      won: p.won,
      finishType: p.outcome.finishType,
      rallyLength: p.outcome.rallyLength,
      serveDirection: p.outcome.serveDirection,
      pointScore: p.pointScore,
      probability: p.prediction.probability,
      swingPp: p.swing,
      pattern: p.outcome.actualPattern,
      patternName: p.prediction.patternName,
      isDemoFallback: p.prediction.isDemoFallback,
    })),
  };
  return JSON.stringify(data, null, 2);
}

// ─── HOOK PRINCIPALE ──────────────────────────────────────────────────────────

export function useInfosysDemoState() {
  const [currentStep, setCurrentStep] = useState<DemoStep>("scenario");
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [patterns, setPatterns] = useState<PatternAlternative[]>(BASE_PATTERNS);
  const [selectedPattern, setSelectedPattern] = useState<PatternAlternative | null>(null);
  const [registeredOutcome, setRegisteredOutcome] = useState<RegisteredOutcome | null>(null);
  const [postPointExplanation, setPostPointExplanation] = useState<PostPointExplanation | null>(null);
  const [insights, setInsights] = useState<InsightSet | null>(null);
  const [outputMode, setOutputMode] = useState<OutputMode>("coach");
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("unknown");
  const [demoSimulationMode, setDemoSimulationMode] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefCopied, setBriefCopied] = useState(false);

  // ─── LIVE LOOP STATE ──────────────────────────────────────────────────────
  const [liveMode, setLiveMode] = useState(false);
  const [pointHistory, setPointHistory] = useState<TaggedPoint[]>([]);
  const [lastSwing, setLastSwing] = useState<TaggedPoint | null>(null);

  // ─── SCORING ENGINE STATE ─────────────────────────────────────────────────
  const [matchState, setMatchState] = useState<MatchState>(() =>
    createMatch({ bestOf: 3, player1Serves: true })
  );
  const [runningStats, setRunningStats] = useState<RunningStats>(() =>
    createInitialStats()
  );
  const [lastScoringResult, setLastScoringResult] = useState<ScoringResult | null>(null);
  const [hasSavedMatch, setHasSavedMatch] = useState(false);
  const isRestoringRef = useRef(false);

  // ─── UNDO SNAPSHOT ──────────────────────────────────────────────────────
  const undoSnapshotRef = useRef<{
    matchState: MatchState;
    runningStats: RunningStats;
    scenario: DemoScenario;
    prediction: PredictionResult | null;
  } | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  // ─── BROADCAST CHANNEL (Fan Mode) ───────────────────────────────────
  const [fanMode, setFanMode] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Setup BroadcastChannel
  useEffect(() => {
    try {
      const ch = new BroadcastChannel("tennisai_live");
      channelRef.current = ch;

      ch.onmessage = (e) => {
        if (!fanMode) return; // Only receive in fan mode
        const data = e.data;
        if (data.type === "STATE_UPDATE") {
          setMatchState(data.matchState);
          setRunningStats(data.runningStats);
          setPointHistory(data.pointHistory);
          setSelectedScenario(data.scenario);
          setPrediction(data.prediction);
          setLiveMode(true);
          if (data.lastScoringResult) setLastScoringResult(data.lastScoringResult);
        }
      };

      return () => ch.close();
    } catch {
      // BroadcastChannel not supported
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fanMode]);

  // ─── AUTO-RESTORE from localStorage on mount ────────────────────────────
  useEffect(() => {
    const saved = loadMatch();
    if (saved) {
      setHasSavedMatch(true);
      isRestoringRef.current = true;
      setMatchState(saved.matchState);
      setRunningStats(saved.runningStats);
      setPointHistory(saved.pointHistory);
      setSelectedScenario(saved.scenario);
      setPrediction(saved.prediction);
      setLiveMode(true);
      // Small delay to let state settle
      setTimeout(() => { isRestoringRef.current = false; }, 100);
      console.info("[TennisAI] ✅ Match ripristinato da localStorage",
        `(${saved.pointHistory.length} punti, ${new Date(saved.ts).toLocaleTimeString()})`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Health check al mount — imposta subito backendStatus
  // NOTA: se il backend non è attivo, il browser logga un errore di rete in console.
  // È atteso: il sistema passa automaticamente in modalità "demo fallback".
  useEffect(() => {
    let cancelled = false;
    getJSON<{ status: string }>(`${API_BASE}/api/health`, 2000)
      .then(() => {
        if (!cancelled) {
          setBackendStatus("online");
          console.info("[TennisAI] ✅ Backend online:", API_BASE);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendStatus("offline");
          console.info("[TennisAI] ℹ️ Backend non raggiungibile — demo fallback attivo. L'errore di rete sopra è atteso.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Seleziona scenario
  const selectScenario = useCallback((s: DemoScenario) => {
    setSelectedScenario(s);
    setPrediction(null);
    setPatterns(BASE_PATTERNS);
    setSelectedPattern(null);
    setRegisteredOutcome(null);
    setPostPointExplanation(null);
    setInsights(null);
    setError(null);
  }, []);

  // Step 2: Calcola probabilità — chiama il backend reale
  const calculatePrediction = useCallback(async () => {
    if (!selectedScenario) return;
    setLoading(true);
    setError(null);

    // Payload allineato esattamente allo schema LiveTaggedPointRequest del backend
    const payload = {
      set: selectedScenario.set,
      game: selectedScenario.game,
      point_number: selectedScenario.pointNumber,
      is_on_serve: selectedScenario.isOnServe ? 1 : 0,
      serve_number: selectedScenario.serveNumber,
      rally_count: 0,               // pre-point: rally non ancora giocato
      stats: {
        pctServicePointsWon:      selectedScenario.svcPct,
        pctReturnPointsWon:       selectedScenario.rtnPct,
        pctFirstServePointsWon:   selectedScenario.firstSvcPct,
        pctSecondServePointsWon:  selectedScenario.secondSvcPct,
        momentumLast5:            selectedScenario.momentumLast5,  // già in [0,1]
      },
      flags: {
        isBreakPoint:       selectedScenario.isBreakPoint,
        isGamePoint:        selectedScenario.isGamePoint,
        isGamePointAgainst: selectedScenario.isGamePointAgainst,
      },
      tag: {},            // pre-point: nessun tag ancora
      recent_points: [],  // prima chiamata demo: nessun punto precedente
    };

    try {
      type BackendResponse = {
        point_win_probability: number;
        prediction: number;
        pattern_fused: { pattern_id: number; pattern_name: string; confidence?: number };
        pattern_rule: { pattern_id: number; pattern_name: string; confidence?: number };
        tactical_call?: string;
        tactical_confidence?: string;
        momentum_state?: string;
        serve_state?: string;
        rally_profile?: string;
        pressure_state?: string;
        tactical_explanation?: string;
        risk_level?: string;
        next_point_pattern_hint?: string;
        point_description?: string;
        tactical_v3?: {
          tactical_call_v3: string;
          tactical_summary_v3: string;
          tactical_rationale_v3: string;
          strategic_priority: string;
          match_plan: string;
          dominant_zone: string;
          vulnerability_zone: string;
          recommended_intent: string;
        };
        model_metadata?: {
          version: string;
          model_type: string;
          calibration_method: string;
          split_type: string;
          brier_score?: number;
          accuracy?: number;
          roc_auc?: number;
        };
      };

      // URL con underscore — come definito in main.py
      const res = await postJSON<BackendResponse>(
        `${API_BASE}/api/live/tagged_point`,
        payload
      );

      setBackendStatus("online");

      const result: PredictionResult = {
        probability:         res.point_win_probability,
        prediction:          res.prediction as 1 | 0,
        patternName:         res.pattern_fused?.pattern_name || res.pattern_rule?.pattern_name || "Unclassified Pattern",
        patternId:           res.pattern_fused?.pattern_id   || res.pattern_rule?.pattern_id   || 0,
        tacticalCall:        translateTacticalCall(res.tactical_call || "Build the point patiently."),
        tacticalConfidence:  (res.tactical_confidence as "HIGH" | "MEDIUM" | "LOW") || "MEDIUM",
        momentumState:       (res.momentum_state as "HOT" | "NEUTRAL" | "COLD")     || "NEUTRAL",
        pressureState:       res.pressure_state || selectedScenario.pressureState,
        riskLevel:           (res.risk_level as "LOW" | "MEDIUM" | "HIGH")           || "MEDIUM",
        tacticalExplanation: translateTacticalExplanation(res.tactical_explanation || ""),
        serveState:          res.serve_state,
        rallyProfile:        res.rally_profile,
        nextPointHint:       res.next_point_pattern_hint,
        pointDescription:    res.point_description,
        tacticalV3: res.tactical_v3
          ? {
              tacticalCallV3:      translateTacticalCall(res.tactical_v3.tactical_call_v3),
              tacticalSummaryV3:   res.tactical_v3.tactical_summary_v3,
              tacticalRationaleV3: translateTacticalExplanation(res.tactical_v3.tactical_rationale_v3),
              strategicPriority:   res.tactical_v3.strategic_priority,
              matchPlan:           res.tactical_v3.match_plan,
              dominantZone:        res.tactical_v3.dominant_zone,
              vulnerabilityZone:   res.tactical_v3.vulnerability_zone,
              recommendedIntent:   res.tactical_v3.recommended_intent,
            }
          : undefined,
        isDemoFallback: false,
        modelMetadata:       res.model_metadata,
      };

      setPrediction(result);
      // Aggiorna i pattern alternativi in base al risultato reale
      setPatterns(buildPatternsFromResult(result));
      setCurrentStep("simulate");
      setLiveMode(true);

    } catch (err) {
      console.warn("[InfosysDemo] Backend unavailable, using demo fallback:", err);
      setBackendStatus("offline");
      if (demoSimulationMode) {
        setPrediction({
          ...DEMO_PREDICTION_FALLBACK,
          pressureState: selectedScenario.pressureState,
          isDemoFallback: true,
        });
        setPatterns(BASE_PATTERNS);
      } else {
        setPrediction({
          probability: 0.5,
          prediction: 1,
          patternName: "AI Prediction Unavailable",
          patternId: 0,
          tacticalCall: "Connection Lost — AI Offline",
          tacticalConfidence: "LOW",
          momentumState: "NEUTRAL",
          pressureState: selectedScenario.pressureState,
          riskLevel: "MEDIUM",
          tacticalExplanation: "Real-time win probability and tactical predictions are offline. All local ATP scoring rules, stroke tagging, and data exporting tools remain 100% active locally.",
          isDemoFallback: false,
          predictionUnavailable: true,
        });
        setPatterns([]);
      }
      setCurrentStep("simulate");
      setLiveMode(true);
    } finally {
      setLoading(false);
    }
  }, [selectedScenario, demoSimulationMode]);

  // Step 3: Seleziona pattern
  const selectPattern = useCallback((p: PatternAlternative) => {
    setSelectedPattern(p);
    setCurrentStep("register");
  }, []);

  // Step 4: Registra esito
  const registerOutcome = useCallback((outcome: RegisteredOutcome) => {
    setRegisteredOutcome(outcome);
    setCurrentStep("explain");
  }, []);

  // Step 5: Genera spiegazione post-point
  // Se il backend è online, invia il punto registrato e ottiene la probabilità aggiornata
  const generateExplanation = useCallback(async () => {
    if (!prediction || !registeredOutcome || !selectedScenario) return;
    setLoading(true);

    let nextProbability = prediction.probability; // default: stessa prob

    if (backendStatus === "online") {
      try {
        // Invia il punto con il tag dell'esito reale per ottenere la prob aggiornata
        const postPayload = {
          set:          selectedScenario.set,
          game:         selectedScenario.game,
          point_number: selectedScenario.pointNumber,
          is_on_serve:  selectedScenario.isOnServe ? 1 : 0,
          serve_number: selectedScenario.serveNumber,
          rally_count:  registeredOutcome.rallyLength === "SHORT" ? 2
                      : registeredOutcome.rallyLength === "MEDIUM" ? 5 : 9,
          stats: {
            pctServicePointsWon:     selectedScenario.svcPct,
            pctReturnPointsWon:      selectedScenario.rtnPct,
            pctFirstServePointsWon:  selectedScenario.firstSvcPct,
            pctSecondServePointsWon: selectedScenario.secondSvcPct,
            momentumLast5: registeredOutcome.winner === "player"
              ? Math.min(1, selectedScenario.momentumLast5 + 0.2)
              : Math.max(0, selectedScenario.momentumLast5 - 0.2),
          },
          flags: {
            isBreakPoint:       selectedScenario.isBreakPoint,
            isGamePoint:        selectedScenario.isGamePoint,
            isGamePointAgainst: selectedScenario.isGamePointAgainst,
          },
          tag: {
            serve_direction: registeredOutcome.serveDirection ?? null,
            finish_type:     registeredOutcome.finishType,
            point_outcome:   registeredOutcome.winner === "player" ? "WON" : "LOST",
          },
          recent_points: [
            {
              isPointWon:   registeredOutcome.winner === "player" ? 1 : 0,
              macroPattern: null,
              rallyCount:   registeredOutcome.rallyLength === "SHORT" ? 2 : registeredOutcome.rallyLength === "MEDIUM" ? 5 : 9,
              isOnServe:    selectedScenario.isOnServe ? 1 : 0,
              serveNumber:  selectedScenario.serveNumber,
            },
          ],
        };

        type UpdatedResponse = { point_win_probability: number };
        const updated = await postJSON<UpdatedResponse>(
          `${API_BASE}/api/live/tagged_point`,
          postPayload,
          6000
        );
        nextProbability = updated.point_win_probability;
      } catch {
        // fallback silenzioso — usiamo la prob originale
      }
    }

    const actualOutcome: "WON" | "LOST" = registeredOutcome.winner === "player" ? "WON" : "LOST";
    const swing = actualOutcome === "WON"
      ? nextProbability - prediction.probability
      : prediction.probability - nextProbability;

    const explanation: PostPointExplanation = {
      probabilityBefore: prediction.probability,
      actualOutcome,
      probabilitySwing: swing,
      explanation: prediction.tacticalV3?.tacticalRationaleV3 || prediction.tacticalExplanation ||
        `Pre-point model assigned ${Math.round(prediction.probability * 100)}% win probability. The ${registeredOutcome.finishType.toLowerCase().replace(/_/g, " ")} after a ${registeredOutcome.rallyLength.toLowerCase()} rally confirmed the pattern assessment.`,
      nextPointAdjustment: prediction.tacticalV3?.recommendedIntent ||
        (registeredOutcome.winner === "player"
          ? "Maintain pattern — opponent's positioning is compromised after this point."
          : "Adjust: increase depth and vary serve placement on next point."),
      isDemoFallback: prediction.isDemoFallback || backendStatus === "offline",
    };

    setPostPointExplanation(explanation);
    setCurrentStep("export");
    setLoading(false);
  }, [prediction, registeredOutcome, selectedScenario, backendStatus]);

  // Step 6: Genera integration brief
  const generateBrief = useCallback(() => {
    if (!selectedScenario || !prediction || !registeredOutcome) return;
    setInsights(buildInsights(selectedScenario, prediction, registeredOutcome));
  }, [selectedScenario, prediction, registeredOutcome]);

  // Copy
  const copyBrief = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 2000);
    } catch { /* silent */ }
  }, []);

  // ─── LIVE LOOP: TAG & ADVANCE ────────────────────────────────────────────
  // Atomic operation for courtside use: tag outcome → compute swing → advance point → auto-predict
  const tagAndAdvance = useCallback(async (outcome: RegisteredOutcome) => {
    if (!prediction || !selectedScenario) return;
    setLoading(true);
    setError(null);

    const probBefore = prediction.probability;
    let nextProbability = probBefore;

    // 1. Compute post-point swing via backend
    if (backendStatus === "online") {
      try {
        const postPayload = {
          set:          selectedScenario.set,
          game:         selectedScenario.game,
          point_number: selectedScenario.pointNumber,
          is_on_serve:  selectedScenario.isOnServe ? 1 : 0,
          serve_number: selectedScenario.serveNumber,
          rally_count:  outcome.rallyLength === "SHORT" ? 2
                      : outcome.rallyLength === "MEDIUM" ? 5 : 9,
          stats: {
            pctServicePointsWon:     selectedScenario.svcPct,
            pctReturnPointsWon:      selectedScenario.rtnPct,
            pctFirstServePointsWon:  selectedScenario.firstSvcPct,
            pctSecondServePointsWon: selectedScenario.secondSvcPct,
            momentumLast5: outcome.winner === "player"
              ? Math.min(1, selectedScenario.momentumLast5 + 0.2)
              : Math.max(0, selectedScenario.momentumLast5 - 0.2),
          },
          flags: {
            isBreakPoint:       selectedScenario.isBreakPoint,
            isGamePoint:        selectedScenario.isGamePoint,
            isGamePointAgainst: selectedScenario.isGamePointAgainst,
          },
          tag: {
            serve_direction: outcome.serveDirection ?? null,
            finish_type:     outcome.finishType,
            point_outcome:   outcome.winner === "player" ? "WON" : "LOST",
          },
          recent_points: [
            {
              isPointWon:   outcome.winner === "player" ? 1 : 0,
              macroPattern: null,
              rallyCount:   outcome.rallyLength === "SHORT" ? 2 : outcome.rallyLength === "MEDIUM" ? 5 : 9,
              isOnServe:    selectedScenario.isOnServe ? 1 : 0,
              serveNumber:  selectedScenario.serveNumber,
            },
          ],
        };
        type UpdatedResponse = { point_win_probability: number };
        const updated = await postJSON<UpdatedResponse>(
          `${API_BASE}/api/live/tagged_point`,
          postPayload,
          6000
        );
        nextProbability = updated.point_win_probability;
      } catch {
        // fallback — use same probability
      }
    }

    // 2. Save undo snapshot BEFORE changing state
    undoSnapshotRef.current = {
      matchState,
      runningStats,
      scenario: selectedScenario,
      prediction,
    };
    setCanUndo(true);

    // 3. Score the point using the scoring engine
    const won = outcome.winner === "player";
    const scoringResult = scorePoint(matchState, runningStats, won ? 1 : 2);
    setMatchState(scoringResult.match);
    setRunningStats(scoringResult.stats);
    setLastScoringResult(scoringResult);

    // 3. Calculate swing
    const swing = won
      ? nextProbability - probBefore
      : probBefore - nextProbability;
    const swingPp = Math.round(swing * 100);

    // 4. Save to history with real score context
    const taggedPoint: TaggedPoint = {
      id: Date.now(),
      pointNumber: scoringResult.match.totalPoints,
      timestamp: Date.now(),
      prediction,
      outcome,
      swing: swingPp,
      won,
      pointScore: scoringResult.scoreAtPoint,
    };
    setPointHistory(prev => [taggedPoint, ...prev]);
    setLastSwing(taggedPoint);
    setTimeout(() => setLastSwing(prev => prev?.id === taggedPoint.id ? null : prev), 3000);

    // 5. Compute momentum from last 5 tagged points
    const recentPoints = [taggedPoint, ...pointHistory].slice(0, 5);
    const recentWins = recentPoints.filter(p => p.won).length;
    const updatedMomentum = recentPoints.length > 0 ? recentWins / recentPoints.length : 0.5;
    const momLabel: "HOT" | "NEUTRAL" | "COLD" =
      updatedMomentum >= 0.65 ? "HOT" : updatedMomentum <= 0.3 ? "COLD" : "NEUTRAL";

    // 6. Auto-compute pressure flags from real score
    const nextFlags = computeFlags(scoringResult.match);

    // 7. Compute running stats (blend with initial stats if few points)
    const effectiveSvcPct = scoringResult.stats.svcPointsPlayed >= 5
      ? scoringResult.stats.svcPct
      : (selectedScenario.svcPct * 5 + scoringResult.stats.svcPointsWon) / (5 + scoringResult.stats.svcPointsPlayed);
    const effectiveRtnPct = scoringResult.stats.rtnPointsPlayed >= 5
      ? scoringResult.stats.rtnPct
      : (selectedScenario.rtnPct * 5 + scoringResult.stats.rtnPointsWon) / (5 + scoringResult.stats.rtnPointsPlayed);

    // 8. Build next scenario from REAL match state
    const nextScenario: DemoScenario = {
      ...selectedScenario,
      pointNumber: scoringResult.match.totalPoints + 1,
      pointScore: getPointScore(scoringResult.match),
      score: getSetScores(scoringResult.match) || selectedScenario.score,
      set: scoringResult.match.setNumber,
      game: scoringResult.match.games[0] + scoringResult.match.games[1] + 1,
      isOnServe: scoringResult.match.server === 1,
      serveNumber: 1, // default; QuickTagBar doesn't track serve faults yet
      momentumLast5: updatedMomentum,
      momentum: momLabel,
      svcPct: effectiveSvcPct,
      rtnPct: effectiveRtnPct,
      isBreakPoint: nextFlags.isBreakPoint,
      isGamePoint: nextFlags.isGamePoint,
      isGamePointAgainst: nextFlags.isGamePointAgainst,
      pressureState: nextFlags.pressureState,
    };
    setSelectedScenario(nextScenario);

    // 9. Reset outcome state for next point
    setRegisteredOutcome(null);
    setPostPointExplanation(null);
    setSelectedPattern(null);

    // 10. Auto-predict next point (if match not over)
    if (!scoringResult.match.matchOver) {
      setPrediction(null);
    }

    // 11. Persist to localStorage
    const updatedHistory = [taggedPoint, ...pointHistory];
    saveMatch({
      v: 1,
      ts: Date.now(),
      matchState: scoringResult.match,
      runningStats: scoringResult.stats,
      pointHistory: updatedHistory,
      scenario: nextScenario,
      prediction: null,
    });

    // 12. Broadcast to fan tabs (same-browser via BroadcastChannel)
    const broadcastPayload = {
      type: "STATE_UPDATE",
      matchState: scoringResult.match,
      runningStats: scoringResult.stats,
      pointHistory: updatedHistory,
      scenario: nextScenario,
      prediction: null,
      lastScoringResult: scoringResult,
    };

    if (channelRef.current && !fanMode) {
      channelRef.current.postMessage(broadcastPayload);
    }

    // 13. Broadcast to WebSocket clients via backend (fire-and-forget)
    if (backendStatus === "online" && !fanMode) {
      fetch(`${API_BASE}/api/live/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broadcastPayload),
      }).catch(() => { /* silent — WS broadcast is best-effort */ });
    }

    setLoading(false);

  }, [prediction, selectedScenario, backendStatus, matchState, runningStats, pointHistory, fanMode]);

  // Initialize scoring engine from scenario config
  const initScoring = useCallback((player1Serves: boolean, bestOf: 3 | 5 = 3) => {
    setMatchState(createMatch({ bestOf, player1Serves }));
    setRunningStats(createInitialStats());
    setLastScoringResult(null);
  }, []);

  // Reset
  const resetDemo = useCallback(() => {
    setCurrentStep("scenario");
    setSelectedScenario(null);
    setPrediction(null);
    setPatterns(BASE_PATTERNS);
    setSelectedPattern(null);
    setRegisteredOutcome(null);
    setPostPointExplanation(null);
    setInsights(null);
    setError(null);
    setOutputMode("coach");
    setLiveMode(false);
    setPointHistory([]);
    setLastSwing(null);
    setMatchState(createMatch({ bestOf: 3, player1Serves: true }));
    setRunningStats(createInitialStats());
    setLastScoringResult(null);
    setHasSavedMatch(false);
    clearSavedMatch();
    setCanUndo(false);
    undoSnapshotRef.current = null;
  }, []);

  // ─── UNDO LAST POINT ─────────────────────────────────────────────────────
  const undoLastPoint = useCallback(() => {
    const snap = undoSnapshotRef.current;
    if (!snap || pointHistory.length === 0) return;

    // Restore previous state
    setMatchState(snap.matchState);
    setRunningStats(snap.runningStats);
    setSelectedScenario(snap.scenario);
    setPrediction(snap.prediction);
    setLastScoringResult(null);

    // Remove last point from history
    const [, ...rest] = pointHistory;
    setPointHistory(rest);
    setLastSwing(null);

    // Clear undo (only 1 level)
    undoSnapshotRef.current = null;
    setCanUndo(false);

    // Re-save to localStorage
    if (snap.scenario) {
      saveMatch({
        v: 1,
        ts: Date.now(),
        matchState: snap.matchState,
        runningStats: snap.runningStats,
        pointHistory: rest,
        scenario: snap.scenario,
        prediction: snap.prediction,
      });
    }

    // Broadcast undo to fan tabs
    if (channelRef.current && !fanMode) {
      channelRef.current.postMessage({
        type: "STATE_UPDATE",
        matchState: snap.matchState,
        runningStats: snap.runningStats,
        pointHistory: rest,
        scenario: snap.scenario,
        prediction: snap.prediction,
        lastScoringResult: null,
      });
    }

    console.info("[TennisAI] ↩ Undo: punto annullato");
  }, [pointHistory, fanMode]);

  // ─── EXPORT FUNCTIONS ───────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    if (!selectedScenario || pointHistory.length === 0) return;
    const csv = buildCSV(selectedScenario, pointHistory, matchState, runningStats);
    const name = `${selectedScenario.player1}_vs_${selectedScenario.player2}`.replace(/[^a-zA-Z0-9]/g, "_");
    downloadBlob(csv, `tennisai_${name}_${Date.now()}.csv`, "text/csv");
  }, [selectedScenario, pointHistory, matchState, runningStats]);

  const exportJSON = useCallback(() => {
    if (!selectedScenario || pointHistory.length === 0) return;
    const json = buildJSON(selectedScenario, pointHistory, matchState, runningStats);
    const name = `${selectedScenario.player1}_vs_${selectedScenario.player2}`.replace(/[^a-zA-Z0-9]/g, "_");
    downloadBlob(json, `tennisai_${name}_${Date.now()}.json`, "application/json");
  }, [selectedScenario, pointHistory, matchState, runningStats]);

  return {
    currentStep,
    setCurrentStep,
    selectedScenario,
    prediction,
    patterns,
    selectedPattern,
    registeredOutcome,
    postPointExplanation,
    insights,
    outputMode,
    backendStatus,
    loading,
    error,
    briefCopied,
    scenarios: DEMO_SCENARIOS,
    selectScenario,
    calculatePrediction,
    selectPattern,
    registerOutcome,
    generateExplanation,
    generateBrief,
    copyBrief,
    setOutputMode,
    resetDemo,
    // Live loop
    liveMode,
    pointHistory,
    lastSwing,
    tagAndAdvance,
    // Scoring engine
    matchState,
    runningStats,
    scoringFlags: computeFlags(matchState),
    lastScoringResult,
    initScoring,
    scoringDisplay: {
      pointScore: getPointScore(matchState),
      gameScore: getGameScore(matchState),
      setScores: getSetScores(matchState),
      fullScore: getFullScore(matchState),
      setScoresArray: getSetScoresArray(matchState),
    },
    // Persistence & Export
    hasSavedMatch,
    exportCSV,
    exportJSON,
    // Undo
    canUndo,
    undoLastPoint,
    // Fan mode
    fanMode,
    setFanMode,
    // Demo simulation toggle
    demoSimulationMode,
    setDemoSimulationMode,
  };
}
