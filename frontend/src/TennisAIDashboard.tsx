// src/TennisAIDashboard.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// v5: landing page + backend status in header

import React, { useState, useRef, useCallback, useEffect } from "react";
import { LiveMatchPage } from "./pages/LiveMatchPage";
import { LiveArchivePage } from "./pages/LiveArchivePage";
import { InfosysDemoPage } from "./pages/InfosysDemoPage";
import SpectatorPage from "./pages/SpectatorPage";
import LandingPage from "./pages/LandingPage";
import Logo from "./components/ui/Logo";
import { TacticsIcon, LayersIcon, AIIcon } from "./components/ui/icons";
import SpinnerFAB from "./components/spinner/SpinnerFAB";
import SpinnerPanel from "./components/spinner/SpinnerPanel";
import { useBackendStatus, type BackendStatus } from "./hooks/useBackendStatus";
import { useT } from "./i18n/LanguageContext";
import { useAuth } from "./contexts/AuthContext";

type Mode = "live" | "liveArchive" | "infosysDemo";

// ── Backend status badge — shown in the dashboard header ─────────────────────
function BackendBadge({
  status,
  onCheck,
}: {
  status: BackendStatus;
  onCheck: () => void;
}) {
  const dotClass: Record<BackendStatus, string> = {
    unknown: "bg-white/30",
    checking: "bg-clay-amber animate-pulse",
    online: "bg-ace-lime",
    offline: "bg-red-400",
  };
  const labelClass: Record<BackendStatus, string> = {
    unknown: "text-fog/40",
    checking: "text-clay-amber",
    online: "text-ace-lime",
    offline: "text-red-400",
  };
  const label: Record<BackendStatus, string> = {
    unknown: "Backend",
    checking: "…",
    online: "Online",
    offline: "Offline",
  };

  return (
    <button
      onClick={onCheck}
      title={
        status === "offline"
          ? "Backend non raggiungibile — clicca per riprovare"
          : status === "online"
          ? "Backend online"
          : "Controlla stato backend"
      }
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass[status]}`} />
      <span className={`text-[11px] font-semibold leading-none ${labelClass[status]}`}>
        {label[status]}
      </span>
    </button>
  );
}

export const TennisAIDashboard: React.FC = () => {
  const [mode, setMode] = useState<Mode>("live");
  const [spinnerOpen, setSpinnerOpen] = useState(false);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const { lang, setLang, t } = useT();
  const { user, logout } = useAuth();

  const { status: backendStatus, check: checkBackend } = useBackendStatus();

  // ── Spectator mode — se ?spectate=ID nell'URL, mostra la vista sola lettura ──
  const spectateId = new URLSearchParams(window.location.search).get("spectate");
  if (spectateId) {
    return <SpectatorPage sessionId={spectateId} />;
  }

  // ── Outdoor Mode — alta visibilità per uso in campo con luce solare ──────────
  const [outdoorMode, setOutdoorMode] = useState<boolean>(
    () => localStorage.getItem("tennisai_outdoor") === "1"
  );

  useEffect(() => {
    if (outdoorMode) {
      document.documentElement.classList.add("outdoor-mode");
      localStorage.setItem("tennisai_outdoor", "1");
    } else {
      document.documentElement.classList.remove("outdoor-mode");
      localStorage.setItem("tennisai_outdoor", "0");
    }
  }, [outdoorMode]);

  // ── Swipe orizzontale per cambiare tab (su bottom nav) ────────────────────
  const TAB_ORDER: Mode[] = ["live", "liveArchive", "infosysDemo"];
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const dy = e.changedTouches[0].clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setMode(prev => {
      const idx = TAB_ORDER.indexOf(prev);
      if (dx < 0) return TAB_ORDER[Math.min(idx + 1, TAB_ORDER.length - 1)];
      return TAB_ORDER[Math.max(idx - 1, 0)];
    });
  }, []);

  // ── Landing page ─────────────────────────────────────────────────────────────
  if (showLanding) {
    return (
      <LandingPage
        onEnter={(selectedMode) => {
          setMode(selectedMode);
          setShowLanding(false);
        }}
      />
    );
  }

  return (
    <>
      {/* ── Main content — pb-20 su mobile/tablet per non essere nascosto dal bottom nav ── */}
      <div className="outdoor-main min-h-screen bg-court-night text-baseline px-3 py-3 md:px-4 md:py-4 pb-20 lg:pb-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 md:gap-4">

          {/* ── Header ── */}
          <header className="sticky top-0 z-50 bg-court-night/90 backdrop-blur-md -mx-3 px-3 md:-mx-4 md:px-4 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2">

            {/* Logo / titolo — cliccabile per tornare alla landing */}
            <h1 className="flex items-baseline gap-2">
              <button
                onClick={() => setShowLanding(true)}
                className="flex items-baseline gap-2 hover:opacity-80 transition-opacity"
                title="Torna alla schermata iniziale"
              >
                <Logo variant="wordmark" size="lg" />
                <span className="hidden md:inline font-head text-[28px] text-fog/80 font-normal tracking-tight leading-none">
                  Dashboard
                </span>
              </button>
            </h1>

            {/* Nav pills — visibili solo su desktop lg+ */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setMode("live")}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--r-pill)] border text-[13px] font-semibold transition-all duration-[var(--dur-fast)] ${
                  mode === "live"
                    ? "bg-ace-lime border-ace-lime text-court-night"
                    : "border-white/10 bg-white/[0.03] text-fog hover:border-ace-lime/30 hover:text-baseline"
                }`}
              >
                <TacticsIcon size={16} />
                {t.liveMatch}
              </button>
              <button
                onClick={() => setMode("liveArchive")}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--r-pill)] border text-[13px] font-semibold transition-all duration-[var(--dur-fast)] ${
                  mode === "liveArchive"
                    ? "bg-ace-lime border-ace-lime text-court-night"
                    : "border-white/10 bg-white/[0.03] text-fog hover:border-ace-lime/30 hover:text-baseline"
                }`}
              >
                <LayersIcon size={16} />
                {t.archive}
              </button>
              <button
                onClick={() => setMode("infosysDemo")}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--r-pill)] border text-[13px] font-semibold transition-all duration-[var(--dur-fast)] ${
                  mode === "infosysDemo"
                    ? "bg-ace-lime border-ace-lime text-court-night"
                    : "border-[#D4FF3A]/20 bg-[#D4FF3A]/[0.03] text-fog hover:border-[#D4FF3A]/40 hover:text-baseline"
                }`}
              >
                <AIIcon size={16} />
                {t.demo}
              </button>
            </div>

            {/* Header right: user info + lang toggle + backend badge + tab indicator + outdoor toggle */}
            <div className="flex items-center gap-2">
              {/* Backend status badge */}
              <BackendBadge status={backendStatus} onCheck={checkBackend} />

              {/* User name + logout */}
              {user && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-fog/50 max-w-[100px] truncate">{user.name}</span>
                  <button
                    onClick={logout}
                    title={t.logout}
                    className="text-[11px] font-semibold text-fog/40 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-400/10"
                  >
                    {t.logout}
                  </button>
                </div>
              )}

              {/* Language toggle IT/EN */}
              <button
                onClick={() => setLang(lang === "it" ? "en" : "it")}
                title={t.language}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all text-[11px] font-bold text-fog/60 hover:text-baseline"
              >
                {lang === "it" ? "IT" : "EN"}
              </button>

              {/* Tab indicator — mobile only */}
              <div className="flex lg:hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                {mode === "live" && (
                  <><TacticsIcon size={14} /><span className="text-[12px] font-semibold text-ace-lime">{t.liveMatch}</span></>
                )}
                {mode === "liveArchive" && (
                  <><LayersIcon size={14} /><span className="text-[12px] font-semibold text-ace-lime">{t.archive}</span></>
                )}
                {mode === "infosysDemo" && (
                  <><AIIcon size={14} /><span className="text-[12px] font-semibold text-ace-lime">{t.demo}</span></>
                )}
              </div>

              {/* Outdoor Mode toggle — visibile sempre */}
              <button
                onClick={() => setOutdoorMode(v => !v)}
                title={outdoorMode ? "Disattiva Outdoor Mode" : "Attiva Outdoor Mode (alta visibilità al sole)"}
                className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${
                  outdoorMode
                    ? "border-clay-amber/60 bg-clay-amber/20 text-clay-amber shadow-[0_0_12px_rgba(233,162,59,0.30)]"
                    : "border-white/[0.08] bg-white/[0.03] text-fog/40 hover:text-fog hover:border-white/20"
                }`}
                aria-label="Toggle Outdoor Mode"
              >
                {/* Sole SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </button>
            </div>
          </header>

          {/* ── Contenuto ── */}
          {mode === "live" ? (
            <LiveMatchPage onOpenSpinner={() => setSpinnerOpen(true)} backendStatus={backendStatus} />
          ) : mode === "liveArchive" ? (
            <LiveArchivePage onOpenLiveSession={() => setMode("live")} />
          ) : (
            <InfosysDemoPage />
          )}

        </div>
      </div>

      {/* ── Spinner AI Coach — FAB solo su tab non-live (su live è nel gruppo COURT/SHARE) ── */}
      {mode !== "live" && (
        <SpinnerFAB onClick={() => setSpinnerOpen(v => !v)} />
      )}
      <SpinnerPanel isOpen={spinnerOpen} onClose={() => setSpinnerOpen(false)} mode={mode} />

      {/* ── Bottom Navigation Bar — mobile/tablet (lg:hidden) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-court-night/97 backdrop-blur-md border-t border-white/[0.08]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-stretch h-16 max-w-7xl mx-auto">

          <button
            onClick={() => setMode("live")}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 text-[10px] font-semibold transition-colors ${
              mode === "live" ? "text-ace-lime" : "text-fog/40 hover:text-fog/70"
            }`}
          >
            {mode === "live" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-ace-lime" />
            )}
            <TacticsIcon size={22} />
            {t.liveMatch}
          </button>

          <button
            onClick={() => setMode("liveArchive")}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 text-[10px] font-semibold transition-colors ${
              mode === "liveArchive" ? "text-ace-lime" : "text-fog/40 hover:text-fog/70"
            }`}
          >
            {mode === "liveArchive" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-ace-lime" />
            )}
            <LayersIcon size={22} />
            {t.archive}
          </button>

          <button
            onClick={() => setMode("infosysDemo")}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 text-[10px] font-semibold transition-colors ${
              mode === "infosysDemo" ? "text-ace-lime" : "text-fog/40 hover:text-fog/70"
            }`}
          >
            {mode === "infosysDemo" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-ace-lime" />
            )}
            <AIIcon size={22} />
            {t.demo}
          </button>

        </div>
      </nav>
    </>
  );
};

export default TennisAIDashboard;
