// src/TennisAIDashboard.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// v3: aggiunta tab "Infosys Demo" (non rompe LiveMatchPage né LiveArchivePage)

import React, { useState } from "react";
import { LiveMatchPage } from "./pages/LiveMatchPage";
import { LiveArchivePage } from "./pages/LiveArchivePage";
import { InfosysDemoPage } from "./pages/InfosysDemoPage";
import Logo from "./components/ui/Logo";
import { TacticsIcon, LayersIcon, AIIcon } from "./components/ui/icons";

type Mode = "live" | "liveArchive" | "infosysDemo";

export const TennisAIDashboard: React.FC = () => {
  const [mode, setMode] = useState<Mode>("live");

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
            <button
              onClick={() => setMode("infosysDemo")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-pill)] border text-[13px] font-semibold transition-all duration-[var(--dur-fast)] ${mode === "infosysDemo"
                ? "bg-ace-lime border-ace-lime text-court-night"
                : "border-[#D4FF3A]/20 bg-[#D4FF3A]/[0.03] text-fog hover:border-[#D4FF3A]/40 hover:text-baseline"
                }`}
            >
              <AIIcon size={16} />
              <span className="hidden sm:inline">Infosys Demo</span>
              <span className="sm:hidden">Demo</span>
            </button>
          </div>
        </header>

        {/* ── Contenuto ── */}
        {mode === "live" ? (
          <LiveMatchPage />
        ) : mode === "liveArchive" ? (
          <LiveArchivePage onOpenLiveSession={() => setMode("live")} />
        ) : (
          <InfosysDemoPage />
        )}

      </div>
    </div>
  );
};

export default TennisAIDashboard;
