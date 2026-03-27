// src/pages/HistoricalMatchPage.tsx
import React, { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

// Allineato a SlamMatchOut del backend
interface SlamMatchMeta {
  id: string;
  label: string;
  num_points: number;
  player1?: string | null;
  player2?: string | null;
  round?: string | null;
  tournament?: string | null;
  year?: number | null;
  gender?: string | null;
}

interface MatchSummary {
  match_id: string;
  num_points: number;

  pct_service_points_won_p1: number;
  pct_return_points_won_p1: number;
  pct_first_serve_points_won_p1: number;
  pct_second_serve_points_won_p1: number;

  pct_service_points_won_p2: number;
  pct_return_points_won_p2: number;
  pct_first_serve_points_won_p2: number;
  pct_second_serve_points_won_p2: number;

  momentum_curve_p1: number[];
  momentum_curve_p2: number[];
}

interface SlamPoint {
  index: number;
  set: number;
  game: number;
  point_label: string;
  player_score?: string | null;
  opponent_score?: string | null;
  is_on_serve: boolean;
  rally_count?: number | null;
}

interface PatternInfoOut {
  pattern_id: number;
  pattern_name: string;
  confidence?: number | null;
  explanation?: string | null;
}

interface QuickStats {
  pct_service_points_won: number;
  pct_return_points_won: number;
  pct_first_serve_points_won: number;
  pct_second_serve_points_won: number;
}

interface PredictionResponse {
  point_win_probability: number;
  prediction: number;
  pattern_rule: PatternInfoOut;
  pattern_ml?: PatternInfoOut | null;
  pattern_fused: PatternInfoOut;
  tactical_suggestion: string[];
  quick_stats: QuickStats;
}

interface HistoricalMatchPageProps {
  selectedMatchId: string | null;
}

/** --- TIPI SIMULATORE TATTICO --- */
type ServeDirection = "T" | "BODY" | "WIDE";

interface SimStepConfig {
  label: string;
  on_serve: boolean; // true = servizio, false = risposta
  serve_direction: ServeDirection | null;
  risk_level: number; // 0..1
}

interface SimResultStep {
  step_index: number;
  label: string;
  point_win_probability: number;
  pattern_fused: PatternInfoOut;
  tactical_suggestion: string[];
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} su ${url}`);
  }
  return (await res.json()) as T;
}

/**
 * Vista tipo "ATP Match Center" per un singolo match,
 * con percentuali, momentum, focus tattico reali,
 * simulatore multi-punto e collegamento al report PDF.
 */
export function HistoricalMatchPage({
  selectedMatchId,
}: HistoricalMatchPageProps) {
  const [matchMeta, setMatchMeta] = useState<SlamMatchMeta | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);

  // Snapshot tattico (tipicamente ultimo punto del match)
  const [tacticalSnapshot, setTacticalSnapshot] =
    useState<PredictionResponse | null>(null);
  const [snapshotIndex, setSnapshotIndex] = useState<number | null>(null);

  // Dettaglio punto per punto
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [activePoint, setActivePoint] = useState<SlamPoint | null>(null);
  const [activePrediction, setActivePrediction] =
    useState<PredictionResponse | null>(null);
  const [loadingPoint, setLoadingPoint] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState<"player1" | "player2">(
    "player1"
  );
  const [detailsTab, setDetailsTab] = useState<
    "tactical" | "points" | "simulator"
  >("tactical");

  // Note coach (salvate per match in localStorage)
  const [coachNotes, setCoachNotes] = useState<string>("");
  const [coachNotesSavedAt, setCoachNotesSavedAt] = useState<string | null>(
    null
  );
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  // ---------- STATO SIMULATORE ----------
  // input indice base: stringa o numero, così l'input HTML è contento
  const [simBasePointIndex, setSimBasePointIndex] = useState<number | "">("");

  const [simSteps, setSimSteps] = useState<SimStepConfig[]>([
    {
      label: "Piano 1",
      on_serve: true,
      serve_direction: "T",
      risk_level: 0.5,
    },
  ]);

  const [simResults, setSimResults] = useState<SimResultStep[] | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  // ---------- HANDLER DOWNLOAD PDF ----------
  const handleDownloadPdf = () => {
    if (!selectedMatchId) return;
    const url = `${API_BASE}/api/slam/matches/${encodeURIComponent(
      selectedMatchId
    )}/report/pdf`;
    window.open(url, "_blank");
  };

  // ---------- HELPERS NOTE COACH ----------
  const getNotesStorageKey = (matchId: string) =>
    `tennisai_coach_notes_${matchId}`;

  const loadNotesForMatch = (matchId: string) => {
    if (typeof window === "undefined") return;
    const key = getNotesStorageKey(matchId);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      setCoachNotes("");
      setCoachNotesSavedAt(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        notes: string;
        savedAt?: string;
      };
      setCoachNotes(parsed.notes || "");
      setCoachNotesSavedAt(parsed.savedAt || null);
    } catch {
      setCoachNotes("");
      setCoachNotesSavedAt(null);
    }
  };

  const saveNotesForMatch = (matchId: string, notes: string) => {
    if (typeof window === "undefined") return;
    const key = getNotesStorageKey(matchId);
    const now = new Date().toISOString();
    const payload = JSON.stringify({ notes, savedAt: now });
    window.localStorage.setItem(key, payload);
    setCoachNotesSavedAt(now);
  };

  const handleNotesChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    setCoachNotes(e.target.value);
  };

  const handleNotesBlur = (): void => {
    if (!selectedMatchId) return;
    setIsSavingNotes(true);
    saveNotesForMatch(selectedMatchId, coachNotes);
    setTimeout(() => setIsSavingNotes(false), 300);
  };

  // helper per caricare un punto specifico
  async function loadPoint(
    matchId: string,
    idx: number,
    setAsSnapshot = false
  ): Promise<void> {
    if (!summary) return;
    if (idx < 0 || idx >= summary.num_points) return;

    setLoadingPoint(true);
    setError(null);

    try {
      const [point, pred] = await Promise.all([
        fetchJSON<SlamPoint>(
          `${API_BASE}/api/slam/matches/${encodeURIComponent(
            matchId
          )}/points/${idx}`
        ),
        fetchJSON<PredictionResponse>(
          `${API_BASE}/api/slam/matches/${encodeURIComponent(
            matchId
          )}/points/${idx}/predict`
        ),
      ]);

      setActivePoint(point);
      setActivePrediction(pred);
      setActivePointIndex(idx);

      if (setAsSnapshot) {
        setTacticalSnapshot(pred);
        setSnapshotIndex(idx);
      }
    } catch (err) {
      console.error(err);
      setError("Errore nel caricamento del punto o della predizione.");
    } finally {
      setLoadingPoint(false);
    }
  }

  // carica meta + summary + snapshot quando cambia il match
  useEffect(() => {
    if (!selectedMatchId) {
      setMatchMeta(null);
      setSummary(null);
      setTacticalSnapshot(null);
      setSnapshotIndex(null);
      setActivePoint(null);
      setActivePrediction(null);
      setActivePointIndex(null);
      setError(null);
      setCoachNotes("");
      setCoachNotesSavedAt(null);
      setSimResults(null);
      setSimError(null);
      setSimBasePointIndex("");
      return;
    }

    const matchId = selectedMatchId;

    setLoading(true);
    setError(null);
    setTacticalSnapshot(null);
    setSnapshotIndex(null);
    setActivePoint(null);
    setActivePrediction(null);
    setActivePointIndex(null);
    setDetailsTab("tactical");
    setSimBasePointIndex("");
    setSimResults(null);
    setSimError(null);

    // carica eventuali note esistenti
    loadNotesForMatch(matchId);

    const load = async () => {
      try {
        const [meta, sum] = await Promise.all([
          fetchJSON<SlamMatchMeta>(
            `${API_BASE}/api/slam/matches/${encodeURIComponent(matchId)}`
          ),
          fetchJSON<MatchSummary>(
            `${API_BASE}/api/slam/matches/${encodeURIComponent(
              matchId
            )}/summary`
          ),
        ]);

        setMatchMeta(meta);
        setSummary(sum);
        setSelectedPlayer("player1");

        // Snapshot: ultimo punto del match + dettaglio
        if (sum.num_points > 0) {
          const idx = sum.num_points - 1;
          await loadPoint(matchId, idx, true);
        }
      } catch (err) {
        console.error(err);
        setError("Errore nel caricamento dei dati del match.");
        setMatchMeta(null);
        setSummary(null);
        setTacticalSnapshot(null);
        setSnapshotIndex(null);
        setActivePoint(null);
        setActivePrediction(null);
        setActivePointIndex(null);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  // Nomi giocatori
  const p1Name = matchMeta?.player1 || "Giocatore 1";
  const p2Name = matchMeta?.player2 || "Giocatore 2";

  // Superficie (euristica)
  const surface =
    matchMeta?.tournament &&
      matchMeta.tournament.toLowerCase().includes("roland")
      ? "Clay"
      : matchMeta?.tournament &&
        matchMeta.tournament.toLowerCase().includes("wimbledon")
        ? "Grass"
        : "Hard";

  const genderLabel =
    matchMeta?.gender === "M"
      ? "Singolare Maschile"
      : matchMeta?.gender === "F"
        ? "Singolare Femminile"
        : "Singolare";

  const activePlayerName = selectedPlayer === "player1" ? p1Name : p2Name;
  const isP2Selected = selectedPlayer === "player2";

  const tacticalSubtitle = isP2Selected
    ? `Indicazioni del modello ancora calcolate dal punto di vista di ${p1Name}. Nelle prossime iterazioni estenderemo il modello anche al punto di vista di ${p2Name}.`
    : `Indicazioni sintetiche per ${activePlayerName}, estratte dall'analisi modello su un punto chiave del match.`;

  // ---------- SERVIZIO / RISPOSTA REALI PER ENTRAMBI I PLAYER ----------
  const getStatsForSelectedPlayer = () => {
    if (!summary) {
      return {
        svcPct: 68,
        rtnPct: 32,
        firstPct: 63,
        secondPct: 45,
      };
    }

    if (selectedPlayer === "player1") {
      return {
        svcPct: summary.pct_service_points_won_p1 * 100,
        rtnPct: summary.pct_return_points_won_p1 * 100,
        firstPct: summary.pct_first_serve_points_won_p1 * 100,
        secondPct: summary.pct_second_serve_points_won_p1 * 100,
      };
    } else {
      return {
        svcPct: summary.pct_service_points_won_p2 * 100,
        rtnPct: summary.pct_return_points_won_p2 * 100,
        firstPct: summary.pct_first_serve_points_won_p2 * 100,
        secondPct: summary.pct_second_serve_points_won_p2 * 100,
      };
    }
  };

  const { svcPct, rtnPct, firstPct, secondPct } = getStatsForSelectedPlayer();

  // ---------- MOMENTUM CURVE CON HOVER ----------
  const maxBars = 16;
  const bars: number[] =
    summary &&
      (selectedPlayer === "player1"
        ? summary.momentum_curve_p1
        : summary.momentum_curve_p2)
      ? (selectedPlayer === "player1"
        ? summary!.momentum_curve_p1
        : summary!.momentum_curve_p2
      ).slice(0, maxBars)
      : Array.from({ length: maxBars }).map((_, i) =>
        i % 5 === 0 ? 0.8 : 0.4
      );

  // ---------- FOCUS TATTICO DINAMICO ----------
  const tacticalSuggestions = tacticalSnapshot?.tactical_suggestion ?? [];

  const card1Text =
    tacticalSuggestions[1] ||
    tacticalSuggestions[0] ||
    "Spingi sui tuoi schemi di servizio preferiti nei momenti di fiducia.";

  const card2Text =
    tacticalSuggestions[2] ||
    tacticalSuggestions[1] ||
    "Individua le fasi in cui hai concesso più punti gratuiti e riduci il rischio inutile.";

  const card3Text =
    tacticalSuggestions[3] ||
    tacticalSuggestions[2] ||
    "Gestisci il momentum nei game lunghi: rallenta, respira, ripeti lo schema che funziona.";

  const fusedPatternName =
    tacticalSnapshot?.pattern_fused.pattern_name || undefined;

  // ---------- INSIGHT MATCH DINAMICI PER BOX 4 ----------
  const matchInsights: string[] = [];
  if (summary) {
    const svc1 = summary.pct_service_points_won_p1;
    const svc2 = summary.pct_service_points_won_p2;
    const rt1 = summary.pct_return_points_won_p1;
    const rt2 = summary.pct_return_points_won_p2;

    const avgSvc = (svc1 + svc2) / 2;
    const avgRt = (rt1 + rt2) / 2;

    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    if (avgSvc >= 0.68) {
      matchInsights.push(
        "Match molto orientato al servizio: pochi break complessivi, proteggere il turno di battuta è stato fondamentale."
      );
    } else if (avgSvc <= 0.60 && avgRt >= 0.35) {
      matchInsights.push(
        "Match con molti scambi in risposta: il servizio non è stato così dominante e i game di battuta sono stati spesso in discussione."
      );
    }

    if (svc1 - svc2 >= 0.08) {
      matchInsights.push(
        `${p1Name} ha avuto un chiaro vantaggio al servizio su ${p2Name} (≈ ${(
          (svc1 - svc2) *
          100
        ).toFixed(0)} punti percentuali di differenza).`
      );
    } else if (svc2 - svc1 >= 0.08) {
      matchInsights.push(
        `${p2Name} ha avuto un chiaro vantaggio al servizio su ${p1Name} (≈ ${(
          (svc2 - svc1) *
          100
        ).toFixed(0)} punti percentuali di differenza).`
      );
    }

    if (rt1 >= 0.4 || rt2 >= 0.4) {
      matchInsights.push(
        "Almeno uno dei due giocatori è stato molto efficace in risposta: i game di servizio non erano mai completamente sotto controllo."
      );
    }

    const m1 = summary.momentum_curve_p1 || [];
    const m2 = summary.momentum_curve_p2 || [];
    if (m1.length && m2.length) {
      const max1 = clamp01(Math.max(...m1));
      const min1 = clamp01(Math.min(...m1));
      const max2 = clamp01(Math.max(...m2));
      const min2 = clamp01(Math.min(...m2));
      const range1 = max1 - min1;
      const range2 = max2 - min2;

      if (range1 > 0.5 || range2 > 0.5) {
        matchInsights.push(
          "Momentum molto oscillante: match a strappi, con fasi di dominio alternato tra i due giocatori."
        );
      } else {
        matchInsights.push(
          "Momentum relativamente stabile: il controllo del match è cambiato poche volte nel corso dei set."
        );
      }

      const sliceFrom = Math.floor(m1.length * 0.75);
      const tail1 = m1.slice(sliceFrom);
      const tail2 = m2.slice(sliceFrom);
      const avgEnd1 =
        tail1.reduce((a, b) => a + b, 0) / Math.max(1, tail1.length);
      const avgEnd2 =
        tail2.reduce((a, b) => a + b, 0) / Math.max(1, tail2.length);

      if (avgEnd1 - avgEnd2 >= 0.1) {
        matchInsights.push(
          `${p1Name} ha chiuso il match in crescita di fiducia rispetto a ${p2Name}.`
        );
      } else if (avgEnd2 - avgEnd1 >= 0.1) {
        matchInsights.push(
          `${p2Name} ha chiuso il match in crescita di fiducia rispetto a ${p1Name}.`
        );
      }
    }
  }

  // ---------- NAVIGAZIONE PUNTI ----------
  const handleGoToPoint = (idx: number) => {
    if (!selectedMatchId || !summary) return;
    if (idx < 0 || idx >= summary.num_points) return;
    loadPoint(selectedMatchId, idx, false);
  };

  const handlePrevPoint = () => {
    if (activePointIndex === null || !selectedMatchId) return;
    handleGoToPoint(activePointIndex - 1);
  };

  const handleNextPoint = () => {
    if (activePointIndex === null || !selectedMatchId || !summary) return;
    handleGoToPoint(activePointIndex + 1);
  };

  // per l’input testo tipo "#283"
  const [pointInput, setPointInput] = useState<string>("");

  useEffect(() => {
    if (activePointIndex !== null) {
      setPointInput(`#${activePointIndex}`);
    } else {
      setPointInput("");
    }
  }, [activePointIndex]);

  const handlePointInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setPointInput(e.target.value);
  };

  const handlePointInputSubmit = (): void => {
    if (!summary || !selectedMatchId) return;
    const cleaned = pointInput.trim().replace("#", "");
    if (!cleaned) return;
    const n = Number(cleaned);
    if (Number.isNaN(n)) return;
    handleGoToPoint(n);
  };

  const renderMiniPointWindow = () => {
    if (!summary || activePointIndex === null) return null;
    const windowSize = 5;
    const start = Math.max(0, activePointIndex - windowSize);
    const end = Math.min(summary.num_points - 1, activePointIndex + windowSize);
    const items: number[] = [];
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    return (
      <div className="flex gap-1 overflow-x-auto pt-1">
        {items.map((i) => {
          const isActive = i === activePointIndex;
          return (
            <button
              key={i}
              onClick={() => handleGoToPoint(i)}
              className={`px-2 py-1 rounded-lg border text-[10px] ${isActive
                ? "border-sky-500 bg-sky-900/50 text-sky-50"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500"
                }`}
            >
              #{i}
            </button>
          );
        })}
      </div>
    );
  };

  // ---------- HANDLER SIMULATORE ----------

  const handleAddSimStep = () => {
    setSimSteps((prev) => {
      if (prev.length >= 5) return prev;
      return [
        ...prev,
        {
          label: `Piano ${prev.length + 1}`,
          on_serve: true,
          serve_direction: "T",
          risk_level: 0.5,
        },
      ];
    });
  };

  const handleRemoveSimStep = (index: number) => {
    setSimSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSimStep = (
    index: number,
    partial: Partial<SimStepConfig>
  ) => {
    setSimSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...partial } : step))
    );
  };

  const handleRunSimulation = async () => {
    if (!summary) {
      setSimError("Nessun dato di match disponibile per la simulazione.");
      return;
    }
    if (!selectedMatchId) {
      setSimError("Seleziona prima un match dal wizard.");
      return;
    }
    if (simSteps.length === 0) {
      setSimError(
        "Aggiungi almeno un punto alla sequenza per eseguire la simulazione."
      );
      return;
    }

    // converto l'indice base dal campo input
    let baseIndex: number;
    if (simBasePointIndex !== "") {
      baseIndex = simBasePointIndex as number;
    } else if (activePointIndex !== null) {
      baseIndex = activePointIndex;
    } else {
      baseIndex = 0;
    }

    if (baseIndex < 0 || baseIndex >= summary.num_points) {
      setSimError(
        `Indice di base non valido. Deve essere tra 0 e ${summary.num_points - 1
        }.`
      );
      return;
    }

    setSimError(null);
    setSimLoading(true);
    setSimResults(null);

    // Stats normalizzate 0..1 per il giocatore selezionato
    const { svcPct, rtnPct, firstPct, secondPct } = getStatsForSelectedPlayer();
    const svc = Math.max(0, Math.min(1, svcPct / 100));
    const rtn = Math.max(0, Math.min(1, rtnPct / 100));
    const fst = Math.max(0, Math.min(1, firstPct / 100));
    const snd = Math.max(0, Math.min(1, secondPct / 100));

    // Punto di riferimento per set/game
    const baseSet = activePoint?.set ?? 1;
    const baseGame = activePoint?.game ?? 1;

    try {
      const results: SimResultStep[] = [];

      for (let i = 0; i < simSteps.length; i++) {
        const step = simSteps[i];
        const virtualIndex = baseIndex + i;

        // momentum "teorico": se rischio alto e servizio, assumiamo momentum > 0.5
        let momentum = 0.5;
        if (step.risk_level > 0.7 && step.on_serve) {
          momentum = 0.7;
        } else if (step.risk_level < 0.3 && !step.on_serve) {
          momentum = 0.4;
        }

        // flags dalla combinazione rischio + situazione
        const isHighRisk = step.risk_level >= 0.66;
        const isMediumRisk =
          step.risk_level >= 0.33 && step.risk_level < 0.66;

        const flags = {
          isBreakPoint: !step.on_serve && isMediumRisk,
          isGamePoint: step.on_serve && isHighRisk,
          isGamePointAgainst: !step.on_serve && isHighRisk,
        };

        // ServeNumber: se rischio alto -> 1ª più aggressiva, se basso -> 2ª / sicurezza
        const serveNumber = step.risk_level >= 0.5 ? 1 : 2;

        const body = {
          set: baseSet,
          game: baseGame,
          point_number: virtualIndex,
          is_on_serve: step.on_serve ? 1 : 0,
          serve_number: serveNumber,
          rally_count: step.risk_level >= 0.6 ? 5 : 2,
          stats: {
            pctServicePointsWon: svc,
            pctReturnPointsWon: rtn,
            pctFirstServePointsWon: fst,
            pctSecondServePointsWon: snd,
            momentumLast5: momentum,
          },
          flags,
        };

        const res = await fetch(`${API_BASE}/api/predict_point`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(
            `Errore HTTP ${res.status} durante la simulazione (step ${i + 1
            }).`
          );
        }

        const data = (await res.json()) as PredictionResponse;

        results.push({
          step_index: i,
          label: step.label,
          point_win_probability: data.point_win_probability,
          pattern_fused: data.pattern_fused,
          tactical_suggestion: data.tactical_suggestion,
        });
      }

      setSimResults(results);
    } catch (err) {
      console.error(err);
      setSimError(
        "Errore durante la simulazione. Controlla che il backend sia attivo e riprova."
      );
    } finally {
      setSimLoading(false);
    }
  };

  // ---------- RENDER ----------
  return (
    <div className="flex flex-col gap-4 h-full">
      {!selectedMatchId && (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Seleziona un match dal wizard a sinistra per vedere il Match Center.
        </div>
      )}

      {selectedMatchId && (
        <>
          {/* HEADER MATCH – stile ATP scoreboard */}
          <div className="bg-slate-950/70 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
            {loading && (
              <div className="text-sm text-slate-400">
                Caricamento dati del match...
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 border border-red-500/60 bg-red-950/40 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            {matchMeta && !loading && !error && (
              <>
                <div className="flex items-center justify-between gap-4">
                  {/* info torneo */}
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <div className="font-semibold text-slate-100">
                      {matchMeta.tournament || "Grand Slam"}
                    </div>
                    <div>
                      {matchMeta.year ? `${matchMeta.year} · ` : ""}
                      {surface} · {genderLabel}
                    </div>
                    {matchMeta.round && (
                      <div className="uppercase tracking-wide text-[11px] text-sky-400">
                        {matchMeta.round}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500">
                      Punti tracciati:{" "}
                      {summary?.num_points ?? matchMeta.num_points}
                    </div>
                    {fusedPatternName && (
                      <div className="text-[11px] text-sky-300">
                        Pattern chiave modello:{" "}
                        <span className="font-semibold">
                          {fusedPatternName}
                        </span>
                        {snapshotIndex !== null && (
                          <span className="text-slate-500">
                            {" "}
                            (snapshot punto #{snapshotIndex})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* vs layout, stile ATP */}
                  <div className="flex-1 flex items-center justify-end gap-6 text-right">
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase text-slate-500">
                        Giocatore 1
                      </span>
                      <span className="text-sm font-semibold text-slate-50">
                        {p1Name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">vs</div>
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase text-slate-500">
                        Giocatore 2
                      </span>
                      <span className="text-sm font-semibold text-slate-50">
                        {p2Name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* switch giocatore – pulsanti stile tab + download PDF */}
                <div className="mt-2 flex flex-col gap-2 text-xs md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Focus tattico su:</span>
                    <button
                      onClick={() => setSelectedPlayer("player1")}
                      className={`px-3 py-1.5 rounded-full border ${selectedPlayer === "player1"
                        ? "border-sky-500 bg-sky-900/50 text-sky-50"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500"
                        }`}
                    >
                      {p1Name}
                    </button>
                    <button
                      onClick={() => setSelectedPlayer("player2")}
                      className={`px-3 py-1.5 rounded-full border ${selectedPlayer === "player2"
                        ? "border-sky-500 bg-sky-900/50 text-sky-50"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500"
                        }`}
                    >
                      {p2Name}
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-slate-600 bg-slate-900 text-[11px] md:text-xs text-slate-100 hover:border-sky-500 hover:bg-sky-900/40 transition-colors"
                  >
                    Scarica report PDF
                  </button>
                </div>

                <div className="text-[10px] text-slate-500 mt-1">
                  Le percentuali sono calcolate per ciascun giocatore (P1 dai
                  dati originali, P2 in modo derivato e complementare). I
                  suggerimenti tattici sono estratti da un punto chiave del
                  match.
                </div>
              </>
            )}
          </div>

          {/* GRIGLIA TIPO ATP: 3 box principali + 1 extra */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* BOX 1 – Momentum & andamento match */}
            <div className="bg-slate-950/70 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold uppercase text-slate-300">
                  Momentum Match
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-300 border border-sky-700/60">
                  Overview
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mb-2">
                Curva di pressione e fiducia per{" "}
                <span className="font-semibold text-slate-100">
                  {activePlayerName}
                </span>{" "}
                durante l&apos;intero match.
              </div>

              {/* grafico barre con tooltip nativo (title) */}
              <div className="h-24 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex">
                {bars.map((value, i) => {
                  const clamped = Math.max(0, Math.min(1, value || 0));
                  const height = 20 + 60 * clamped; // 20–80%
                  const tooltipValue = (clamped * 100).toFixed(1);

                  return (
                    <div
                      key={i}
                      className="flex-1 flex items-end justify-center group relative z-0 hover:z-20"
                      title={`Momentum ultimi 5 punti: ${tooltipValue}%`}
                    >
                      <div
                        className="w-2 rounded-t-full bg-sky-400/90 transition-transform duration-200 origin-bottom group-hover:scale-y-125 group-hover:scale-x-125 group-hover:bg-sky-300"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 text-[11px] text-slate-400 space-y-1">
                <div>
                  • Passa il mouse sulle barre per vedere il momentum (ultimi 5
                  punti vinti) in quella fase del match.
                </div>
                <div>
                  • Zone ad alta percentuale indicano momenti in cui il tuo
                  giocatore stava controllando lo scambio.
                </div>
              </div>
            </div>

            {/* BOX 2 – Servizio / risposta – con dati reali */}
            <div className="bg-slate-950/70 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold uppercase text-slate-300">
                  Servizio vs Risposta
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                  Match Stats
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] mt-1">
                <div className="space-y-1">
                  <div className="text-slate-400">
                    Punti vinti al servizio
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-sky-400"
                      style={{
                        width: `${Math.min(100, Math.max(0, svcPct))}%`,
                      }}
                    />
                  </div>
                  <div className="text-slate-300 font-semibold">
                    {svcPct.toFixed(0)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400">
                    Punti vinti in risposta
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{
                        width: `${Math.min(100, Math.max(0, rtnPct))}%`,
                      }}
                    />
                  </div>
                  <div className="text-slate-300 font-semibold">
                    {rtnPct.toFixed(0)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400">% punti vinti con la 1ª</div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-sky-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, firstPct))}%`,
                      }}
                    />
                  </div>
                  <div className="text-slate-300 font-semibold">
                    {firstPct.toFixed(0)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400">% punti vinti con la 2ª</div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-rose-400"
                      style={{
                        width: `${Math.min(100, Math.max(0, secondPct))}%`,
                      }}
                    />
                  </div>
                  <div className="text-slate-300 font-semibold">
                    {secondPct.toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-slate-500">
                Dati riferiti a{" "}
                <span className="font-semibold text-slate-200">
                  {activePlayerName}
                </span>
                : per player2 le metriche sono derivate in modo complementare.
              </div>
            </div>

            {/* BOX 3 – Focus tattico / Dettaglio punto per punto / Simulatore */}
            <div className="bg-slate-950/70 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
              {/* Header + Tabs */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase text-slate-300">
                  Analisi tattica & Dettagli
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[11px] bg-slate-900 rounded-full p-1 border border-slate-700/60">
                <button
                  onClick={() => setDetailsTab("tactical")}
                  className={`px-3 py-1 rounded-full ${detailsTab === "tactical"
                    ? "bg-violet-700 text-white"
                    : "text-slate-300 hover:text-slate-100"
                    }`}
                >
                  Focus tattico
                </button>
                <button
                  onClick={() => setDetailsTab("points")}
                  className={`px-3 py-1 rounded-full ${detailsTab === "points"
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:text-slate-100"
                    }`}
                >
                  Dettagli punto per punto
                </button>
                <button
                  onClick={() => setDetailsTab("simulator")}
                  className={`px-3 py-1 rounded-full ${detailsTab === "simulator"
                    ? "bg-emerald-700 text-white"
                    : "text-slate-300 hover:text-slate-100"
                    }`}
                >
                  Simulatore tattico
                </button>
              </div>


              {/* CONTENUTO DELLA TAB */}
              {detailsTab === "tactical" ? (
                // TAB 1: FOCUS TATTICO
                <div className="flex flex-col gap-2">
                  <div className="text-[11px] text-slate-400 mb-1">
                    {tacticalSubtitle}
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="bg-sky-900/40 border border-sky-700/60 rounded-xl px-3 py-2">
                      <div className="text-[10px] uppercase text-sky-300 mb-0.5">
                        Pattern Preferito
                      </div>
                      <div className="text-slate-100">{card1Text}</div>
                    </div>
                    <div className="bg-amber-900/30 border border-amber-700/60 rounded-xl px-3 py-2">
                      <div className="text-[10px] uppercase text-amber-300 mb-0.5">
                        Zone di Rischio
                      </div>
                      <div className="text-slate-100">{card2Text}</div>
                    </div>
                    <div className="bg-emerald-900/30 border border-emerald-700/60 rounded-xl px-3 py-2">
                      <div className="text-[10px] uppercase text-emerald-300 mb-0.5">
                        Momentum Management
                      </div>
                      <div className="text-slate-100">{card3Text}</div>
                    </div>
                  </div>
                </div>
              ) : detailsTab === "points" ? (
                // TAB 2: DETTAGLIO PUNTO PER PUNTO
                <div className="flex flex-col gap-3 text-[11px]">
                  {!summary ? (
                    <div className="text-slate-400">
                      Dati del match non disponibili.
                    </div>
                  ) : (
                    <>
                      {/* Barra navigazione punti */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePrevPoint}
                            disabled={
                              activePointIndex === null ||
                              activePointIndex <= 0 ||
                              loadingPoint
                            }
                            className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 text-[10px]"
                          >
                            ◀
                          </button>
                          <button
                            onClick={handleNextPoint}
                            disabled={
                              activePointIndex === null ||
                              !summary ||
                              activePointIndex >= summary.num_points - 1 ||
                              loadingPoint
                            }
                            className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 text-[10px]"
                          >
                            ▶
                          </button>

                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[10px]">
                              Vai a:
                            </span>
                            <input
                              type="text"
                              value={pointInput}
                              onChange={handlePointInputChange}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePointInputSubmit();
                                }
                              }}
                              className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-100"
                              placeholder="#0"
                            />
                            <button
                              onClick={handlePointInputSubmit}
                              className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px]"
                            >
                              Vai
                            </button>
                          </div>

                          {summary && (
                            <span className="ml-auto text-[10px] text-slate-500">
                              Totale punti: {summary.num_points}
                            </span>
                          )}
                        </div>

                        {/* mini lista punti vicini */}
                        {renderMiniPointWindow()}
                      </div>

                      {/* Dettaglio del punto o messaggio di attesa */}
                      {!activePoint || !activePrediction ? (
                        <div className="text-slate-400 italic py-4 text-center border border-dashed border-slate-700 rounded-xl">
                          Seleziona un punto (es. usando le frecce o scrivendo #N) per visualizzare i dettagli.
                        </div>
                      ) : (
                        <>
                          {/* Riassunto punto selezionato */}
                          <div className="bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-semibold text-slate-100">
                                Punto #{activePointIndex}
                              </div>
                              <div className="text-[10px] text-sky-300">
                                Prob. vittoria:{" "}
                                <span className="font-bold">
                                  {(
                                    activePrediction.point_win_probability * 100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-y-1 text-slate-300">
                              <div>
                                Set:{" "}
                                <span className="font-semibold">
                                  {activePoint.set}
                                </span>
                              </div>
                              <div>
                                Game:{" "}
                                <span className="font-semibold">
                                  {activePoint.game}
                                </span>
                              </div>
                              <div>
                                Punto:{" "}
                                <span className="font-semibold">
                                  {activePoint.point_label}
                                </span>
                              </div>
                              <div>
                                Punteggio:{" "}
                                <span className="font-semibold">
                                  {activePoint.player_score ?? "-"} ·{" "}
                                  {activePoint.opponent_score ?? "-"}
                                </span>
                              </div>
                              <div>
                                Situazione:{" "}
                                <span className="font-semibold">
                                  {activePoint.is_on_serve
                                    ? "al servizio"
                                    : "in risposta"}
                                </span>
                              </div>
                              <div>
                                Rally:{" "}
                                <span className="font-semibold">
                                  {activePoint.rally_count ?? "n/d"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Pattern del modello per questo punto */}
                          <div className="bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2 space-y-1">
                            <div className="text-[10px] uppercase text-slate-400">
                              Pattern riconosciuti
                            </div>
                            <div className="text-slate-300">
                              <span className="text-[10px] text-slate-500">
                                Regole:
                              </span>{" "}
                              <span className="font-semibold">
                                {activePrediction.pattern_rule.pattern_name}
                              </span>
                            </div>
                            {activePrediction.pattern_ml && (
                              <div className="text-slate-300">
                                <span className="text-[10px] text-slate-500">
                                  ML:
                                </span>{" "}
                                <span className="font-semibold">
                                  {activePrediction.pattern_ml.pattern_name}
                                </span>{" "}
                                {activePrediction.pattern_ml.confidence !==
                                  undefined &&
                                  activePrediction.pattern_ml.confidence !==
                                  null && (
                                    <span className="text-[10px] text-slate-500">
                                      (
                                      {(
                                        activePrediction.pattern_ml.confidence *
                                        100
                                      ).toFixed(1)}
                                      %)
                                    </span>
                                  )}
                              </div>
                            )}
                            <div className="text-slate-300">
                              <span className="text-[10px] text-slate-500">
                                Fusione:
                              </span>{" "}
                              <span className="font-semibold text-sky-300">
                                {activePrediction.pattern_fused.pattern_name}
                              </span>
                            </div>
                            {activePrediction.pattern_fused.explanation && (
                              <div className="text-[10px] text-slate-400">
                                {activePrediction.pattern_fused.explanation}
                              </div>
                            )}
                          </div>

                          {/* Statistiche sintetiche su quel punto */}
                          <div className="bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2">
                            <div className="text-[10px] uppercase text-slate-400 mb-1">
                              Statistiche su questo punto
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-slate-300">
                              <div>
                                Servizio tot:{" "}
                                <span className="font-semibold">
                                  {(
                                    activePrediction.quick_stats
                                      .pct_service_points_won * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </div>
                              <div>
                                Ritorno tot:{" "}
                                <span className="font-semibold">
                                  {(
                                    activePrediction.quick_stats
                                      .pct_return_points_won * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </div>
                              <div>
                                1ª vinta:{" "}
                                <span className="font-semibold">
                                  {(
                                    activePrediction.quick_stats
                                      .pct_first_serve_points_won * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </div>
                              <div>
                                2ª vinta:{" "}
                                <span className="font-semibold">
                                  {(
                                    activePrediction.quick_stats
                                      .pct_second_serve_points_won * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {loadingPoint && (
                        <div className="text-[10px] text-slate-500">
                          Caricamento punto...
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                // TAB 3: SIMULATORE MULTI-PUNTO
                <div className="flex flex-col gap-3 text-[11px]">
                  {/* Punto di riferimento */}
                  <div className="bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-slate-100">
                        Punto di riferimento
                      </div>
                      {summary && (
                        <div className="text-[10px] text-slate-400">
                          Totale punti match: {summary.num_points}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Index:</span>
                      <input
                        type="number"
                        className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px]"
                        value={
                          simBasePointIndex !== ""
                            ? simBasePointIndex
                            : activePointIndex ?? ""
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setSimBasePointIndex("");
                            return;
                          }
                          const v = parseInt(raw, 10);
                          if (Number.isNaN(v)) {
                            setSimBasePointIndex("");
                          } else {
                            setSimBasePointIndex(v);
                          }
                        }}
                        min={0}
                        max={summary ? summary.num_points - 1 : undefined}
                      />
                      <span className="text-slate-400">
                        (puoi impostare un indice specifico, es. 0 per il primo
                        punto)
                      </span>
                    </div>
                  </div>

                  {/* Builder sequenza piani tattici */}
                  <div className="bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-100">
                        Sequenza piani tattici (1–5 punti)
                      </div>
                      <button
                        onClick={handleAddSimStep}
                        disabled={simSteps.length >= 5}
                        className="text-[10px] px-2 py-1 rounded-lg border border-emerald-600 text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        + Aggiungi punto
                      </button>
                    </div>

                    <div className="space-y-2">
                      {simSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="border border-slate-700 rounded-xl px-3 py-2 flex flex-col gap-2"
                        >
                          {/* HEADER STEP */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase text-slate-500">
                                Punto {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={step.label}
                                onChange={(e) =>
                                  handleUpdateSimStep(idx, {
                                    label: e.target.value,
                                  })
                                }
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] w-32"
                                placeholder="Nome piano"
                              />
                            </div>

                            {simSteps.length > 1 && (
                              <button
                                onClick={() => handleRemoveSimStep(idx)}
                                className="text-[10px] text-slate-400 hover:text-red-400"
                              >
                                Rimuovi
                              </button>
                            )}
                          </div>

                          {/* GRID RESPONSIVA */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* SERVIZIO / RISPOSTA */}
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-400">
                                Situazione
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    handleUpdateSimStep(idx, {
                                      on_serve: true,
                                    })
                                  }
                                  className={`flex-1 px-2 py-1 rounded-full border text-[10px] leading-tight ${step.on_serve
                                    ? "border-sky-500 bg-sky-900/40 text-sky-50"
                                    : "border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-500"
                                    }`}
                                >
                                  Servizio
                                </button>

                                <button
                                  onClick={() =>
                                    handleUpdateSimStep(idx, {
                                      on_serve: false,
                                    })
                                  }
                                  className={`flex-1 px-2 py-1 rounded-full border text-[10px] leading-tight ${!step.on_serve
                                    ? "border-sky-500 bg-sky-900/40 text-sky-50"
                                    : "border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-500"
                                    }`}
                                >
                                  Risposta
                                </button>
                              </div>
                            </div>

                            {/* DIREZIONE SERVIZIO */}
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-400">
                                Direzione servizio
                              </span>
                              <div className="grid grid-cols-3 gap-1">
                                {(["T", "BODY", "WIDE"] as const).map(
                                  (dir) => (
                                    <button
                                      key={dir}
                                      onClick={() =>
                                        handleUpdateSimStep(idx, {
                                          serve_direction: dir,
                                        })
                                      }
                                      className={`px-2 py-1 rounded-full border text-[10px] leading-tight text-center ${step.serve_direction === dir
                                        ? "border-emerald-500 bg-emerald-900/40 text-emerald-50"
                                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-500"
                                        }`}
                                    >
                                      {dir}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            {/* LIVELLO DI RISCHIO */}
                            <div className="flex flex-col gap-1 col-span-1 sm:col-span-2">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">
                                  Livello di rischio
                                </span>
                                <span className="text-slate-300">
                                  {(step.risk_level * 100).toFixed(0)}%
                                </span>
                              </div>

                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={Math.round(step.risk_level * 100)}
                                onChange={(e) =>
                                  handleUpdateSimStep(idx, {
                                    risk_level:
                                      parseInt(e.target.value, 10) / 100,
                                  })
                                }
                              />

                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Conservativo</span>
                                <span>Aggressivo</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pulsante simula */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-slate-500">
                      Il modello simulerà la probabilità di vincere i prossimi
                      punti secondo i piani definiti qui sopra, partendo
                      dall&apos;indice scelto.
                    </div>
                    <button
                      onClick={handleRunSimulation}
                      disabled={simLoading || !summary}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold disabled:opacity-40"
                    >
                      {simLoading
                        ? "Calcolo in corso..."
                        : "Simula i prossimi punti"}
                    </button>
                  </div>

                  {/* Risultati simulazione */}
                  {simError && (
                    <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-500/60 rounded-xl px-3 py-2">
                      {simError}
                    </div>
                  )}

                  {simResults && simResults.length > 0 && (
                    <div className="bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-slate-100">
                          Risultato simulazione (base index:{" "}
                          {simBasePointIndex !== ""
                            ? simBasePointIndex
                            : activePointIndex ?? "-"}
                          )
                        </div>
                      </div>
                      <div className="space-y-1">
                        {simResults.map((step) => (
                          <div
                            key={step.step_index}
                            className="border border-slate-700 rounded-lg px-3 py-2 flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-slate-200 font-semibold">
                                Punto {step.step_index + 1} –{" "}
                                {step.label || "Piano tattico"}
                              </div>
                              <div className="text-[11px] text-emerald-300">
                                Prob. vittoria:{" "}
                                <span className="font-bold">
                                  {(
                                    step.point_win_probability * 100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              Pattern atteso:{" "}
                              <span className="font-semibold text-sky-300">
                                {step.pattern_fused.pattern_name}
                              </span>
                            </div>
                            {step.tactical_suggestion &&
                              step.tactical_suggestion.length > 0 && (
                                <div className="text-[11px] text-slate-400">
                                  {step.tactical_suggestion[0]}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BOX 4 – Info match / note coach (dinamico) */}
            <div className="bg-slate-950/70 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3 md:col-span-2 xl:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold uppercase text-slate-300">
                  Match Info & Note Coach
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600/80">
                  Extra
                </span>
              </div>

              {/* Info base */}
              <div className="text-[11px] text-slate-400 space-y-1">
                <div>
                  Superficie:{" "}
                  <span className="text-slate-100">{surface}</span>
                </div>
                {matchMeta?.round && (
                  <div>
                    Round:{" "}
                    <span className="text-slate-100">{matchMeta.round}</span>
                  </div>
                )}
                {matchMeta?.tournament && (
                  <div>
                    Torneo:{" "}
                    <span className="text-slate-100">
                      {matchMeta.tournament}{" "}
                      {matchMeta.year ? `(${matchMeta.year})` : ""}
                    </span>
                  </div>
                )}
                {matchMeta?.gender && (
                  <div>
                    Categoria:{" "}
                    <span className="text-slate-100">{genderLabel}</span>
                  </div>
                )}
              </div>

              {/* Insight dinamici */}
              {matchInsights.length > 0 && (
                <div className="text-[11px] text-slate-400 space-y-1">
                  {matchInsights.map((txt, idx) => (
                    <div key={idx} className="flex gap-1">
                      <span className="mt-[2px] text-slate-500">•</span>
                      <span>{txt}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Note coach con salvataggio locale */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-semibold">
                    Note coach (salvate sul tuo dispositivo)
                  </span>
                  {coachNotesSavedAt && (
                    <span className="text-[10px] text-slate-500">
                      Ultimo salvataggio:{" "}
                      {new Date(coachNotesSavedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <textarea
                  className="w-full min-h-[80px] md:min-h-[100px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[11px] text-slate-100 resize-y"
                  placeholder="Usa questa sezione come blocco note per chi sta in panchina o in tribuna: schemi che funzionano, pattern da enfatizzare al prossimo cambio campo, zone da colpire nei momenti chiave..."
                  value={coachNotes}
                  onChange={handleNotesChange}
                  onBlur={handleNotesBlur}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Le note restano salvate in locale per questo match.
                  </span>
                  {isSavingNotes && (
                    <span className="text-[10px] text-sky-400">
                      Salvataggio...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default HistoricalMatchPage;