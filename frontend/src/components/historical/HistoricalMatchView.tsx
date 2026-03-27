// src/components/historical/HistoricalMatchView.tsx
import React, { useState } from "react";

type PlayerSide = "P1" | "P2";

interface HistoricalMatchViewProps {
  matchMeta: {
    slam: string;
    year: string;
    round: string;
    typeMatch: string; // "Men's Singles" / "Women's Singles"
    player1: string;
    player2: string;
  };
  statsByPlayer: Record<
    PlayerSide,
    {
      service: {
        firstInPct: number;
        firstWonPct: number;
        secondWonPct: number;
        servicePointsWonPct: number;
      };
      returns: {
        returnPointsWonPct: number;
        breakPointsConverted: number;
        breakPointsTotal: number;
      };
      clutch: {
        breakPointsSaved: number;
        breakPointsFaced: number;
        gamePointsConverted: number;
      };
    }
  >;
  tacticalSummaryByPlayer: Record<
    PlayerSide,
    {
      patternId: number;
      patternName: string;
      frequencyPct: number;
      keyBullets: string[];
    }[]
  >;
}

export const HistoricalMatchView: React.FC<HistoricalMatchViewProps> = ({
  matchMeta,
  statsByPlayer,
  tacticalSummaryByPlayer,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSide>("P1");
  const [activeTab, setActiveTab] = useState<"overview" | "tactics">("overview");

  const playerLabel =
    selectedPlayer === "P1" ? matchMeta.player1 : matchMeta.player2;

  const currentStats = statsByPlayer[selectedPlayer];
  const currentTactics = tacticalSummaryByPlayer[selectedPlayer];

  return (
    <div className="flex flex-col gap-6">
      {/* HERO HEADER STILE ATP */}
      <header className="bg-slate-900 text-white rounded-2xl p-4 md:p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-300">
            {matchMeta.slam} · {matchMeta.year}
          </div>
          <div className="text-[11px] md:text-xs text-slate-300">
            {matchMeta.round} · {matchMeta.typeMatch}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 md:gap-10">
          {/* Player 1 Card */}
          <button
            onClick={() => setSelectedPlayer("P1")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${
              selectedPlayer === "P1"
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-slate-600 bg-slate-800/60"
            } transition`}
          >
            <div className="text-[9px] uppercase tracking-widest text-slate-300">
              Player 1
            </div>
            <div className="text-lg md:text-2xl font-semibold">
              {matchMeta.player1}
            </div>
          </button>

          <div className="text-xs md:text-sm font-semibold text-slate-300">
            VS
          </div>

          {/* Player 2 Card */}
          <button
            onClick={() => setSelectedPlayer("P2")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${
              selectedPlayer === "P2"
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-slate-600 bg-slate-800/60"
            } transition`}
          >
            <div className="text-[9px] uppercase tracking-widest text-slate-300">
              Player 2
            </div>
            <div className="text-lg md:text-2xl font-semibold">
              {matchMeta.player2}
            </div>
          </button>
        </div>
      </header>

      {/* TABS STILE ATP */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4 text-sm md:text-base">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 border-b-2 ${
              activeTab === "overview"
                ? "border-emerald-500 text-emerald-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("tactics")}
            className={`py-2 border-b-2 ${
              activeTab === "tactics"
                ? "border-emerald-500 text-emerald-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Tactics
          </button>
        </nav>
      </div>

      {/* CONTENUTO TAB */}
      {activeTab === "overview" && (
        <OverviewTab playerName={playerLabel} stats={currentStats} />
      )}

      {activeTab === "tactics" && (
        <TacticsTab playerName={playerLabel} summaries={currentTactics} />
      )}
    </div>
  );
};

// --- OVERVIEW TAB ---
interface OverviewProps {
  playerName: string;
  stats: HistoricalMatchViewProps["statsByPlayer"]["P1"];
}

const OverviewTab: React.FC<OverviewProps> = ({ playerName, stats }) => {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-800">
        Overview · {playerName}
      </h2>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Service box */}
        <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
          <div className="text-[10px] font-semibold uppercase text-sky-700 mb-2">
            Service performance
          </div>
          <StatLine label="1st serve in" value={stats.service.firstInPct} />
          <StatLine label="1st pts won" value={stats.service.firstWonPct} />
          <StatLine label="2nd pts won" value={stats.service.secondWonPct} />
          <StatLine
            label="Service pts won"
            value={stats.service.servicePointsWonPct}
          />
        </div>

        {/* Return box */}
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <div className="text-[10px] font-semibold uppercase text-emerald-700 mb-2">
            Return performance
          </div>
          <StatLine
            label="Return pts won"
            value={stats.returns.returnPointsWonPct}
          />
          <div className="mt-3 text-xs text-emerald-900">
            Break points converted:{" "}
            <span className="font-semibold">
              {stats.returns.breakPointsConverted}/{stats.returns.breakPointsTotal}
            </span>
          </div>
        </div>

        {/* Clutch box */}
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <div className="text-[10px] font-semibold uppercase text-amber-700 mb-2">
            Clutch points
          </div>
          <div className="text-xs text-amber-900 space-y-1">
            <div>
              Break points saved:{" "}
              <span className="font-semibold">
                {stats.clutch.breakPointsSaved}/{stats.clutch.breakPointsFaced}
              </span>
            </div>
            <div>
              Game points converted:{" "}
              <span className="font-semibold">
                {stats.clutch.gamePointsConverted}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Qui più avanti aggiungiamo il grafico win prob / momentum */}
    </section>
  );
};

const StatLine: React.FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between text-xs text-slate-800 mb-1">
    <span>{label}</span>
    <span className="font-semibold">{value.toFixed(1)}%</span>
  </div>
);

// --- TACTICS TAB ---
interface TacticsProps {
  playerName: string;
  summaries: HistoricalMatchViewProps["tacticalSummaryByPlayer"]["P1"];
}

const TacticsTab: React.FC<TacticsProps> = ({ playerName, summaries }) => {
  const patternColors: Record<number, string> = {
    1: "bg-sky-50 border-sky-100",
    2: "bg-emerald-50 border-emerald-100",
    3: "bg-slate-50 border-slate-200",
    4: "bg-amber-50 border-amber-100",
    5: "bg-rose-50 border-rose-100",
    6: "bg-indigo-50 border-indigo-100",
    7: "bg-teal-50 border-teal-100",
    8: "bg-violet-50 border-violet-100",
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-800">
        Tactical insight · {playerName}
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {summaries.map((p) => (
          <div
            key={p.patternId}
            className={`rounded-2xl p-4 border ${
              patternColors[p.patternId] || "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold uppercase text-slate-700">
                Pattern {p.patternId}
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full bg-white/60 text-slate-700">
                {p.frequencyPct.toFixed(1)}% dei punti
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-900 mb-2">
              {p.patternName}
            </div>
            <ul className="text-xs text-slate-800 space-y-1">
              {p.keyBullets.map((b, idx) => (
                <li key={idx}>• {b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};