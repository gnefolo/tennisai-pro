// src/TennisAIDashboard.tsx
import React, { useState } from "react";
import { HistoricalMatchPage } from "./pages/HistoricalMatchPage";
import { SlamWizard } from "./components/SlamWizard";
import { LiveMatchPage } from "./pages/LiveMatchPage";
import { LiveArchivePage } from "./pages/LiveArchivePage";

export const TennisAIDashboard: React.FC = () => {
  const [mode, setMode] = useState<"historical" | "live" | "liveArchive">(
    "live"
  );
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // mostra/nasconde il wizard (solo per modalità storico)
  const [wizardOpen, setWizardOpen] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-3 py-3 md:px-4 md:py-4">
      {/* più ampia su desktop */}
      <div className="max-w-7xl mx-auto flex flex-col gap-3 md:gap-4">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-xl md:text-2xl font-bold">
            TennisAI Pro <span className="text-sky-400">Dashboard</span>
          </h1>

          <div className="flex items-center gap-2 text-xs md:text-sm flex-wrap justify-end">
            {/* 
            <button
              onClick={() => setMode("historical")}
              className={`px-3 py-1.5 rounded-xl border ${mode === "historical"
                  ? "border-sky-500 bg-sky-900/40 text-sky-50"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500"
                }`}
            >
              Storico Slam
            </button>
            */}

            <button
              onClick={() => setMode("live")}
              className={`px-3 py-1.5 rounded-xl border ${mode === "live"
                  ? "border-sky-500 bg-sky-900/40 text-sky-50"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500"
                }`}
            >
              Modalità live
            </button>

            <button
              onClick={() => setMode("liveArchive")}
              className={`px-3 py-1.5 rounded-xl border ${mode === "liveArchive"
                  ? "border-sky-500 bg-sky-900/40 text-sky-50"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500"
                }`}
            >
              Archivio match live
            </button>
          </div>
        </header>

        {mode === "historical" ? (
          // LAYOUT con mini-sidebar sinistra + contenuto
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:h-[calc(100vh-120px)]">
            {/* MINI SIDEBAR SINISTRA – Toggle Wizard */}
            <div className="flex md:flex-col items-start md:items-stretch gap-2 md:gap-3 md:w-14">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex md:flex-col items-center md:items-center justify-center gap-1 md:gap-2">
                {/* Icona filtri / wizard */}
                <button
                  onClick={() => setWizardOpen((prev) => !prev)}
                  title={
                    wizardOpen
                      ? "Nascondi wizard filtri slam"
                      : "Mostra wizard filtri slam"
                  }
                  className={`flex items-center justify-center rounded-full border transition-colors w-9 h-9 md:w-10 md:h-10 ${wizardOpen
                      ? "border-sky-500 bg-sky-900/60 text-sky-50"
                      : "border-slate-600 bg-slate-950 text-slate-300 hover:border-sky-500"
                    }`}
                >
                  {/* semplice icona slider/filter inline */}
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 md:w-5 md:h-5"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 7H19M7 12H17M9 17H15"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="9" cy="7" r="1.2" fill="currentColor" />
                    <circle cx="15" cy="12" r="1.2" fill="currentColor" />
                    <circle cx="11" cy="17" r="1.2" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>

            {/* AREA PRINCIPALE: Wizard (opzionale) + Match Center */}
            <div
              className={
                wizardOpen
                  ? "flex-1 flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-4"
                  : "flex-1"
              }
            >
              {wizardOpen && (
                <div className="md:h-full md:overflow-y-auto mb-3 md:mb-0">
                  <SlamWizard onMatchSelect={setSelectedMatchId} />
                </div>
              )}

              <div className="md:h-full md:overflow-y-auto">
                <HistoricalMatchPage selectedMatchId={selectedMatchId} />
              </div>
            </div>
          </div>
        ) : mode === "live" ? (
          <div className="md:h-[calc(100vh-120px)] md:overflow-y-auto">
            <LiveMatchPage />
          </div>
        ) : (
          <LiveArchivePage onOpenLiveSession={() => setMode("live")} />
        )}
      </div>
    </div>
  );
};

export default TennisAIDashboard;