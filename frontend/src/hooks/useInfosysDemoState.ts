// src/hooks/useInfosysDemoState.ts
// Hook centrale per la logica della pagina Infosys Demo
// Gestisce il workflow a 6 step: Scenario → Predict → Simulate → Register → Explain → Export

import { useState, useCallback } from "react";

// ─── TIPI ────────────────────────────────────────────────────────────────────

export type DemoStep =
  | "scenario"    // 1 — Scegli scenario
  | "predict"     // 2 — Calcola probabilità
  | "simulate"    // 3 — Confronta pattern
  | "register"    // 4 — Registra esito
  | "explain"     // 5 — Spiega il punto
  | "export";     // 6 — Integration brief

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
  score: string;         // e.g. "6-4, 3-5"
  pointScore: string;    // e.g. "30-40"
  pressureState: string;
  isOnServe: boolean;
  serveNumber: 1 | 2;
  momentum: "HOT" | "NEUTRAL" | "COLD";
  svcPct: number;
  rtnPct: number;
  firstSvcPct: number;
  secondSvcPct: number;
  momentumLast5: number;
  isBreakPoint: boolean;
  isGamePoint: boolean;
  isGamePointAgainst: boolean;
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
}

export interface PatternAlternative {
  id: string;
  name: string;
  uplift: number;  // delta probability in %
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
  probabilitySwing: number; // positivo = swing favorevole
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

// ─── DATI DEMO ───────────────────────────────────────────────────────────────

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
    momentumLast5: -1,
    isBreakPoint: true,
    isGamePoint: false,
    isGamePointAgainst: true,
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
    momentumLast5: 2,
    isBreakPoint: false,
    isGamePoint: true,
    isGamePointAgainst: false,
  },
  {
    id: "scenario_neutral_deuce",
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
    momentumLast5: 0,
    isBreakPoint: false,
    isGamePoint: false,
    isGamePointAgainst: false,
  },
];

const DEMO_PREDICTION: PredictionResult = {
  probability: 0.58,
  prediction: 1,
  patternName: "Serve T + Inside-Out Forehand",
  patternId: 3,
  tacticalCall: "Attack the T, open court with FH",
  tacticalConfidence: "HIGH",
  momentumState: "COLD",
  pressureState: "BREAK_POINT_AGAINST",
  riskLevel: "MEDIUM",
  tacticalExplanation:
    "On 2nd serve, opponent tends to drive return cross-court. Moving weight forward with a T serve (flat) and following immediately with an inside-out forehand exploits the open court before opponent recovers. Success rate +14% vs baseline in similar pressure states.",
  tacticalV3: {
    tacticalCallV3: "Flat T-serve + Inside-Out FH",
    tacticalSummaryV3: "Serve flat to T, take control at net T zone, close with inside-out FH",
    tacticalRationaleV3:
      "Opponent return is most vulnerable when forced wide after a body serve sequence. The T serve disrupts positioning and creates the angle for a decisive forehand.",
    strategicPriority: "EXPLOIT",
    matchPlan: "Control the T zone, minimize baseline rallies beyond 5 shots",
    dominantZone: "Deuce side T",
    vulnerabilityZone: "Opponent backhand under pace",
    recommendedIntent: "ATTACK",
  },
  isDemoFallback: false,
};

const DEMO_PREDICTION_FALLBACK: PredictionResult = {
  ...DEMO_PREDICTION,
  isDemoFallback: true,
  probability: 0.54,
  tacticalConfidence: "MEDIUM",
};

const DEMO_PATTERNS: PatternAlternative[] = [
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
    name: "Body Serve + Aggressive Return",
    uplift: +7,
    risk: "LOW",
    confidence: "HIGH",
    description: "Safe baseline option. Limits errors under pressure.",
  },
  {
    id: "p3",
    name: "Wide Kicker + Rally",
    uplift: -3,
    risk: "HIGH",
    confidence: "LOW",
    description: "Opponent strong from the deuce side on clay. Not recommended.",
  },
];

function buildDemoInsights(
  scenario: DemoScenario,
  prediction: PredictionResult,
  outcome: RegisteredOutcome
): InsightSet {
  const prob = Math.round(prediction.probability * 100);
  const swing =
    outcome.winner === "player"
      ? `+${prob - 50}%`
      : `-${prob - 50}%`;

  return {
    fan: `${scenario.player1} was facing ${scenario.pressureState.replace(/_/g, " ").toLowerCase()} at ${scenario.pointScore}. With a ${prob}% predicted win probability, the tactical choice paid off — the ${outcome.finishType === "WINNER" ? "winner" : "decisive pressure"} shifted momentum on a critical point.`,

    coach: `Pre-point calibrated probability: ${prob}% (${prediction.tacticalConfidence} confidence). Recommended pattern: "${prediction.patternName}" — expected uplift +${DEMO_PATTERNS[0].uplift}% vs baseline. Executed: ${outcome.actualPattern}. Outcome: ${outcome.winner === "player" ? "WON" : "LOST"}. Risk level: ${prediction.riskLevel}. Next-point adjustment: maintain T-zone dominance, opponent defense deteriorates after 3+ consecutive pressure points.`,

    media: `${scenario.player1} at ${scenario.score}, ${scenario.pointScore} (${scenario.pressureState.replace(/_/g, " ")}). Model assigned ${prob}% win probability pre-point. The ${outcome.finishType.toLowerCase().replace(/_/g, " ")} ended a ${outcome.rallyLength.toLowerCase()}-rally exchange — ${swing} probability swing for ${outcome.winner === "player" ? scenario.player1 : scenario.player2}. TennisAI tactical engine rated this a high-value pattern selection under pressure.`,

    apiPayload: {
      match_context: {
        player: scenario.player1,
        opponent: scenario.player2,
        surface: scenario.surface,
        round: scenario.round,
        score: scenario.score,
        point_score: scenario.pointScore,
        pressure_state: scenario.pressureState,
        is_on_serve: scenario.isOnServe,
        serve_number: scenario.serveNumber,
        momentum_state: prediction.momentumState,
      },
      prediction: {
        point_win_probability: prediction.probability,
        calibrated: true,
        tactical_call: prediction.tacticalCall,
        tactical_confidence: prediction.tacticalConfidence,
        risk_level: prediction.riskLevel,
        expected_uplift_pct: DEMO_PATTERNS[0].uplift,
        pattern_name: prediction.patternName,
        is_demo_fallback: prediction.isDemoFallback,
      },
      outcome: {
        actual_pattern: outcome.actualPattern,
        winner: outcome.winner,
        rally_length: outcome.rallyLength,
        finish_type: outcome.finishType,
      },
      explanation: prediction.tacticalExplanation,
      model_version: "xgb_calibrated_v3",
      pre_point_safe: true,
    },
  };
}

const DEMO_POST_POINT: PostPointExplanation = {
  probabilityBefore: 0.58,
  actualOutcome: "WON",
  probabilitySwing: +0.14,
  explanation:
    "Model predicted 58% win probability. The flat T-serve forced the opponent off-balance, and the inside-out forehand winner closed the angle before recovery. Pattern execution matched tactical recommendation.",
  nextPointAdjustment:
    "Opponent return positioning will shift toward T after this sequence. Consider a body serve on next 1st serve to disrupt the adjustment.",
  isDemoFallback: false,
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE) ||
  "http://127.0.0.1:8000";

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function useInfosysDemoState() {
  const [currentStep, setCurrentStep] = useState<DemoStep>("scenario");
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<PatternAlternative | null>(null);
  const [registeredOutcome, setRegisteredOutcome] = useState<RegisteredOutcome | null>(null);
  const [postPointExplanation, setPostPointExplanation] = useState<PostPointExplanation | null>(null);
  const [insights, setInsights] = useState<InsightSet | null>(null);
  const [outputMode, setOutputMode] = useState<OutputMode>("coach");
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("unknown");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefCopied, setBriefCopied] = useState(false);

  // Seleziona scenario
  const selectScenario = useCallback((s: DemoScenario) => {
    setSelectedScenario(s);
    setPrediction(null);
    setSelectedPattern(null);
    setRegisteredOutcome(null);
    setPostPointExplanation(null);
    setInsights(null);
    setError(null);
  }, []);

  // Step 2: Calcola probabilità
  const calculatePrediction = useCallback(async () => {
    if (!selectedScenario) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        set: 3,
        game: 6,
        point_number: 1,
        is_on_serve: selectedScenario.isOnServe ? 1 : 0,
        serve_number: selectedScenario.serveNumber,
        rally_count: 0,
        stats: {
          pctServicePointsWon: selectedScenario.svcPct,
          pctReturnPointsWon: selectedScenario.rtnPct,
          pctFirstServePointsWon: selectedScenario.firstSvcPct,
          pctSecondServePointsWon: selectedScenario.secondSvcPct,
          momentumLast5: selectedScenario.momentumLast5,
        },
        flags: {
          isBreakPoint: selectedScenario.isBreakPoint,
          isGamePoint: selectedScenario.isGamePoint,
          isGamePointAgainst: selectedScenario.isGamePointAgainst,
        },
        tag: { point_outcome: null },
        recent_points: [],
      };

      const res = await postJSON<{
        point_win_probability: number;
        prediction: number;
        pattern_fused: { pattern_id: number; pattern_name: string; confidence?: number };
        tactical_call?: string;
        tactical_confidence?: string;
        momentum_state?: string;
        pressure_state?: string;
        risk_level?: string;
        tactical_explanation?: string;
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
      }>(`${API_BASE}/api/live/tagged-point`, payload);

      setBackendStatus("online");
      setPrediction({
        probability: res.point_win_probability,
        prediction: res.prediction as 1 | 0,
        patternName: res.pattern_fused?.pattern_name || "Unknown Pattern",
        patternId: res.pattern_fused?.pattern_id || 0,
        tacticalCall: res.tactical_call || "No call available",
        tacticalConfidence: (res.tactical_confidence as "HIGH" | "MEDIUM" | "LOW") || "MEDIUM",
        momentumState: (res.momentum_state as "HOT" | "NEUTRAL" | "COLD") || "NEUTRAL",
        pressureState: res.pressure_state || selectedScenario.pressureState,
        riskLevel: (res.risk_level as "LOW" | "MEDIUM" | "HIGH") || "MEDIUM",
        tacticalExplanation: res.tactical_explanation || "",
        tacticalV3: res.tactical_v3
          ? {
              tacticalCallV3: res.tactical_v3.tactical_call_v3,
              tacticalSummaryV3: res.tactical_v3.tactical_summary_v3,
              tacticalRationaleV3: res.tactical_v3.tactical_rationale_v3,
              strategicPriority: res.tactical_v3.strategic_priority,
              matchPlan: res.tactical_v3.match_plan,
              dominantZone: res.tactical_v3.dominant_zone,
              vulnerabilityZone: res.tactical_v3.vulnerability_zone,
              recommendedIntent: res.tactical_v3.recommended_intent,
            }
          : undefined,
        isDemoFallback: false,
      });
      setCurrentStep("simulate");
    } catch {
      setBackendStatus("offline");
      setPrediction(DEMO_PREDICTION_FALLBACK);
      setCurrentStep("simulate");
    } finally {
      setLoading(false);
    }
  }, [selectedScenario]);

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

  // Step 5: Genera spiegazione
  const generateExplanation = useCallback(async () => {
    if (!prediction || !registeredOutcome || !selectedScenario) return;
    setLoading(true);
    try {
      // Demo fallback sempre usato per explanation (nessun endpoint dedicato)
      await new Promise((r) => setTimeout(r, 700));
      const explanation: PostPointExplanation = {
        probabilityBefore: prediction.probability,
        actualOutcome: registeredOutcome.winner === "player" ? "WON" : "LOST",
        probabilitySwing:
          registeredOutcome.winner === "player"
            ? prediction.probability - 0.5
            : -(prediction.probability - 0.5),
        explanation: prediction.tacticalV3?.tacticalRationaleV3 || DEMO_POST_POINT.explanation,
        nextPointAdjustment: DEMO_POST_POINT.nextPointAdjustment,
        isDemoFallback: prediction.isDemoFallback,
      };
      setPostPointExplanation(explanation);
      setCurrentStep("export");
    } finally {
      setLoading(false);
    }
  }, [prediction, registeredOutcome, selectedScenario]);

  // Step 6: Genera integration brief
  const generateBrief = useCallback(() => {
    if (!selectedScenario || !prediction || !registeredOutcome) return;
    const ins = buildDemoInsights(selectedScenario, prediction, registeredOutcome);
    setInsights(ins);
  }, [selectedScenario, prediction, registeredOutcome]);

  // Copy brief
  const copyBrief = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 2000);
    } catch {
      // fallback
    }
  }, []);

  // Reset
  const resetDemo = useCallback(() => {
    setCurrentStep("scenario");
    setSelectedScenario(null);
    setPrediction(null);
    setSelectedPattern(null);
    setRegisteredOutcome(null);
    setPostPointExplanation(null);
    setInsights(null);
    setError(null);
    setOutputMode("coach");
  }, []);

  return {
    // State
    currentStep,
    setCurrentStep,
    selectedScenario,
    prediction,
    patterns: DEMO_PATTERNS,
    selectedPattern,
    registeredOutcome,
    postPointExplanation,
    insights,
    outputMode,
    backendStatus,
    loading,
    error,
    briefCopied,
    // Data
    scenarios: DEMO_SCENARIOS,
    // Actions
    selectScenario,
    calculatePrediction,
    selectPattern,
    registerOutcome,
    generateExplanation,
    generateBrief,
    copyBrief,
    setOutputMode,
    resetDemo,
  };
}
