// src/pages/MatchCenterPage.tsx
import React, { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export interface MatchCenterPageProps {
  selectedMatchId: string | null;
}

// ---- Tipi allineati al backend ----

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

// ---- helper fetch ----
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} su ${url}`);
  }
  return (await res.json()) as T;
}

type FocusPlayer = "P1" | "P2";

export const MatchCenterPage: React.FC<MatchCenterPageProps> = ({
  selectedMatchId,
}) => {
  const [matchMeta, setMatchMeta] = useState<SlamMatchMeta | null>(null);
  const [focusPlayer, setFocusPlayer] = useState<FocusPlayer>("P1");

  const [currentPointIndex, setCurrentPointIndex] = useState<number>(0);
  const [currentPoint, setCurrentPoint] = useState<SlamPoint | null>(null);
  const [currentPrediction, setCurrentPrediction] =
    useState<PredictionResponse | null>(null);

  const [loadingPoint, setLoadingPoint] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // carica meta match + primo punto quando cambia il match
  useEffect(() => {
    if (!selectedMatchId) {
      setMatchMeta(null);
      setCurrentPoint(null);
      setCurrentPrediction(null);
      setCurrentPointIndex(0);
      setError(null);
      return;
    }

    setError(null);
    setFocusPlayer("P1");
    setCurrentPointIndex(0);
    setCurrentPoint(null);
    setCurrentPrediction(null);

    // meta
    fetchJSON<SlamMatchMeta>(
      `${API_BASE}/api/slam/matches/${encodeURIComponent(selectedMatchId)}`
    )
      .then(setMatchMeta)
      .catch((err) => {
        console.error(err);
        setError("Errore nel caricamento dei dati del match.");
      });

    // primo punto
    loadPointAndPrediction(selectedMatchId, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  const loadPointAndPrediction = async (matchId: string, index: number) => {
    setLoadingPoint(true);
    setError(null);
    try {
      const point = await fetchJSON<SlamPoint>(
        `${API_BASE}/api/slam/matches/${encodeURIComponent(
          matchId
        )}/points/${index}`
      );
      setCurrentPoint(point);

      const pred = await fetchJSON<PredictionResponse>(
        `${API_BASE}/api/slam/matches/${encodeURIComponent(
          matchId
        )}/points/${index}/predict`
      );
      setCurrentPrediction(pred);
    } catch (err) {
      console.error(err);
      setError("Errore nel caricamento del punto o della predizione.");
    } finally {
      setLoadingPoint(false);
    }
  };

  const handleChangePoint = (delta: number) => {
    if (!selectedMatchId || !matchMeta) return;
    const newIndex = currentPointIndex + delta;
    if (newIndex < 0 || newIndex >= matchMeta.num_points) return;
    setCurrentPointIndex(newIndex);
    loadPointAndPrediction(selectedMatchId, newIndex);
  };

  if (!selectedMatchId) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Seleziona un match dal wizard a sinistra per aprire il{" "}
        <span className="font-semibold text-sky-400 ml-1">Match Center</span>.
      </div>
    );
  }

  const p1Name = matchMeta?.player1 || "Player 1";
  const p2Name = matchMeta?.player2 || "Player 2";

  const focusName = focusPlayer === "P1" ? p1Name : p2Name;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* intestazione match */}
      <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
              Match Center
            </div>
            <div className="text-lg font-semibold text-slate-100">
              {p1Name}{" "}
              <span className="text-slate-500 text-base font-normal">vs</span>{" "}
              {p2Name}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {matchMeta?.tournament && (
                <span className="mr-2">{matchMeta.tournament}</span>
              )}
              {matchMeta?.year && (
                <span className="mr-2">· {matchMeta.year}</span>
              )}
              {matchMeta?.round && (
                <span className="mr-2">· {matchMeta.round}</span>
              )}
              {matchMeta?.gender && (
                <span className="mr-2">· {matchMeta.gender}</span>
              )}
              {matchMeta?.num_points && (
                <span className="mr-2">
                  · punti totali: {matchMeta.num_points}
                </span>
              )}
            </div>
          </div>

          {/* selettore giocatore + navigazione punto */}
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="uppercase text-slate-500">Focus giocatore</span>
              <button
                onClick={() => setFocusPlayer("P1")}
                className={`px-3 py-1.5 rounded-full border text-[11px] ${
                  focusPlayer === "P1"
                    ? "border-sky-500 bg-sky-900/60 text-sky-50"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500"
                }`}
              >
                {p1Name}
              </button>
              <button
                onClick={() => setFocusPlayer("P2")}
                className={`px-3 py-1.5 rounded-full border text-[11px] ${
                  focusPlayer === "P2"
                    ? "border-sky-500 bg-sky-900/60 text-sky-50"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500"
                }`}
              >
                {p2Name}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Punto</span>
              <button
                onClick={() => handleChangePoint(-1)}
                disabled={loadingPoint || currentPointIndex <= 0}
                className="px-2 py-1 rounded-md border border-slate-600 disabled:opacity-40"
              >
                ◀
              </button>
              <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">
                #{currentPointIndex}
              </span>
              <button
                onClick={() => handleChangePoint(1)}
                disabled={
                  loadingPoint ||
                  !matchMeta ||
                  currentPointIndex >= matchMeta.num_points - 1
                }
                className="px-2 py-1 rounded-md border border-slate-600 disabled:opacity-40"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Analisi modello riferita al match completo. Il focus giocatore
          evidenzia il tennista su cui stai ragionando (header & box), i numeri
          restano quelli del modello.
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 border border-red-500/60 bg-red-950/40 px-3 py-2 rounded-xl">
          {error}
        </div>
      )}

      {/* griglia box come prima: stato punto + probabilità/pattern */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* CARD stato punto */}
        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-100 mb-1">
            Stato del punto – Focus{" "}
            <span className="text-sky-400">{focusName}</span>
          </h3>
          {loadingPoint && (
            <div className="text-xs text-slate-400">Caricamento punto...</div>
          )}
          {!loadingPoint && currentPoint && (
            <>
              <div className="text-xs text-slate-300">
                Set{" "}
                <span className="font-semibold">{currentPoint.set}</span>, Game{" "}
                <span className="font-semibold">{currentPoint.game}</span>, Punto{" "}
                <span className="font-semibold">
                  {currentPoint.point_label}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Punteggio:{" "}
                <span className="font-semibold text-slate-100">
                  {currentPoint.player_score ?? "-"} ·{" "}
                  {currentPoint.opponent_score ?? "-"}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Servizio:{" "}
                <span className="font-semibold text-slate-100">
                  {currentPoint.is_on_serve ? "al servizio" : "in risposta"}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Rally:{" "}
                <span className="font-semibold text-slate-100">
                  {currentPoint.rally_count ?? "n/d"}
                </span>
              </div>
            </>
          )}
          {!loadingPoint && !currentPoint && (
            <div className="text-xs text-slate-400">
              Nessun punto caricato. Prova a cambiare indice nella navigazione.
            </div>
          )}
        </div>

        {/* CARD predizione & pattern */}
        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-100 mb-1">
            Probabilità & pattern tattico
          </h3>
          {currentPrediction ? (
            <>
              <div className="text-xs text-slate-300">
                Probabilità stimata di vincere il punto:{" "}
                <span className="font-bold text-sky-400">
                  {(currentPrediction.point_win_probability * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-100 border border-slate-600">
                  Regole: {currentPrediction.pattern_rule.pattern_name}
                </span>
                {currentPrediction.pattern_ml && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-100 border border-slate-600">
                    ML: {currentPrediction.pattern_ml.pattern_name}
                    {currentPrediction.pattern_ml.confidence != null && (
                      <>
                        {" "}
                        (
                        {(
                          currentPrediction.pattern_ml.confidence * 100
                        ).toFixed(1)}
                        %)
                      </>
                    )}
                  </span>
                )}
                <span className="text-[11px] px-2 py-1 rounded-full bg-sky-900/50 text-sky-100 border border-sky-500/70">
                  Fusione: {currentPrediction.pattern_fused.pattern_name}
                </span>
              </div>

              {currentPrediction.pattern_fused.explanation && (
                <div className="text-[11px] text-slate-500 mt-1">
                  {currentPrediction.pattern_fused.explanation}
                </div>
              )}

              {/* Suggerimenti tattici come “pillole” */}
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-200 mb-1">
                  Suggerimenti tattici
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentPrediction.tactical_suggestion.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-1 rounded-xl bg-slate-800 text-slate-100 border border-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Statistiche sintetiche in stile box ATP */}
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-200 mb-1">
                  Statistiche sintetiche match
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700">
                    <div className="text-slate-400">Servizio tot</div>
                    <div className="text-slate-50 text-sm font-semibold">
                      {(
                        currentPrediction.quick_stats.pct_service_points_won *
                        100
                      ).toFixed(0)}
                      %
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700">
                    <div className="text-slate-400">Ritorno tot</div>
                    <div className="text-slate-50 text-sm font-semibold">
                      {(
                        currentPrediction.quick_stats.pct_return_points_won *
                        100
                      ).toFixed(0)}
                      %
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700">
                    <div className="text-slate-400">1ª vinta</div>
                    <div className="text-slate-50 text-sm font-semibold">
                      {(
                        currentPrediction.quick_stats.pct_first_serve_points_won *
                        100
                      ).toFixed(0)}
                      %
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700">
                    <div className="text-slate-400">2ª vinta</div>
                    <div className="text-slate-50 text-sm font-semibold">
                      {(
                        currentPrediction.quick_stats.pct_second_serve_points_won *
                        100
                      ).toFixed(0)}
                      %
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">
              Seleziona un punto per visualizzare probabilità e pattern
              tattico.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchCenterPage;