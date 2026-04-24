// src/TennisAIDashboard.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// MODIFICHE RISPETTO ALL'ORIGINALE:
// 1. Rimossi import di HistoricalMatchPage, SlamWizard, MatchCenterPage
//    (sezione storico esclusa dal prodotto finale)
// 2. Rimossa la modalità "historical" e tutto il relativo JSX (sidebar wizard,
//    layout historical, pulsante "Storico Slam" — era già commentato)
// 3. type mode semplificato: "live" | "liveArchive"
// 4. Header aggiornato al design system: bg-court-night, font-head, ace-lime
// 5. Pulsanti nav aggiornati: ace-lime attivo invece di sky-500
// ⚠️  LOGICA INVARIATA: useState per mode, onOpenLiveSession callback

import React, { useState } from "react";
import { LiveMatchPage } from "./pages/LiveMatchPage";
import { LiveArchivePage } from "./pages/LiveArchivePage";
import Logo from "./components/ui/Logo";
import { TacticsIcon, LayersIcon } from "./components/ui/icons";

export const TennisAIDashboard: React.FC = () => {
  const [mode, setMode] = useState<"live" | "liveArchive">("live");

  return (
    <div className="min-h-screen bg-court-night text-baseline px-3 py-3 md:px-4 md:py-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 md:gap-4">

        {/* ── Header ── */}
        <header className="sticky top-0 z-50 bg-court-night/90 backdrop-blur-md -mx-3 px-3 md:-mx-4 md:px-4 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2">
          {/* Logo / titolo */}
          <h1 className="flex items-baseline gap-2">
            <Logo variant="wordmark" size="lg" />
            <span className="font-head text-[28px] text-fog/80 font-normal tracking-tight leading-none">Dashboard</span>
          </h1>

          {/* Nav pills */}
          <div className="flex items-center gap-2 text-xs md:text-sm flex-wrap justify-end">
            <button
              onClick={() => setMode("live")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-pill)] border text-[13px] font-semibold transition-all duration-[var(--dur-fast)] ${mode === "live"
                ? "bg-ace-lime border-ace-lime text-court-night"
                : "border-white/10 bg-white/[0.03] text-fog hover:border-ace-lime/30 hover:text-baseline"
                }`}
            >
              <TacticsIcon size={16} />
              Live Match
            </button>
            <button
              onClick={() => setMode("liveArchive")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-pill)] border text-[13px] font-semibold transition-all duration-[var(--dur-fast)] ${mode === "liveArchive"
                ? "bg-ace-lime border-ace-lime text-court-night"
                : "border-white/10 bg-white/[0.03] text-fog hover:border-ace-lime/30 hover:text-baseline"
                }`}
            >
              <LayersIcon size={16} />
              Archivio Match
            </button>
          </div>
        </header>

        {/* ── Contenuto ── */}
        {mode === "live" ? (
          <LiveMatchPage />
        ) : (
          <LiveArchivePage onOpenLiveSession={() => setMode("live")} />
        )}

      </div>
    </div>
  );
};

export default TennisAIDashboard;
