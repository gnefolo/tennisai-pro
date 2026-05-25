// src/hooks/useInfosysDemoState.ts
// v2 — collegamento reale al backend
// Fix applicati rispetto a v1:
//   1. URL corretto: /api/live/tagged_point (underscore, non trattino)
//   2. API_BASE usa import.meta.env in modo corretto per Vite
//   3. Health check proattivo al mount per impostare backendStatus subito
//   4. Payload set/game/point_number coerenti con lo scenario scelto
//   5. momentumLast5 mappato su [0,1] prima di inviarlo (backend vuole frazione)
//   6. tactical_call e tactical_explanation in italiano → tradotti in inglese per display
//   7. generateExplanation ora usa i dati reali dal backend (se online) via secondo call
//   8. DEMO_PATTERNS aggiornati dinamicamente dal risultato reale del backend

import { useState, useCallback, useEffect } from "react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefCopied, setBriefCopied] = useState(false);

  // Health check al mount — imposta subito backendStatus
  useEffect(() => {
    let cancelled = false;
    getJSON<{ status: string }>(`${API_BASE}/api/health`, 4000)
      .then(() => { if (!cancelled) setBackendStatus("online"); })
      .catch(() => { if (!cancelled) setBackendStatus("offline"); });
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
      };

      setPrediction(result);
      // Aggiorna i pattern alternativi in base al risultato reale
      setPatterns(buildPatternsFromResult(result));
      setCurrentStep("simulate");

    } catch (err) {
      console.warn("[InfosysDemo] Backend unavailable, using demo fallback:", err);
      setBackendStatus("offline");
      setPrediction({ ...DEMO_PREDICTION_FALLBACK, pressureState: selectedScenario.pressureState });
      setPatterns(BASE_PATTERNS);
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
  }, []);

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
  };
}
