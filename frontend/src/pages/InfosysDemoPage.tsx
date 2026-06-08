// src/pages/InfosysDemoPage.tsx
// ATP Tactical Intelligence Demo — Infosys/ATP integration showcase
// v3: Live Loop mode — wizard for setup, inline Quick Tag Bar for courtside tagging
// Layout: Header → [Live: Hero + Tag Bar] or [Setup: Wizard modal]

import React, { useState, useCallback, useEffect } from "react";
import { useT } from "../i18n/LanguageContext";
import {
  useInfosysDemoState,
  type DemoStep,
  type PatternAlternative,
  type OutputMode,
  type TaggedPoint,
} from "../hooks/useInfosysDemoState";
import {
  TacticsIcon,
  ChartIcon,
  CheckIcon,
  RefreshIcon,
  ArrowRightIcon,
  AIIcon,
} from "../components/ui/icons";
import { WizardModal } from "../components/ui/WizardModal";
import {
  WizardStepScenario,
  DEFAULT_FORM,
  formToScenario,
  scenarioToForm,
  type ScenarioFormState,
} from "../components/infosys/WizardStepScenario";
import { QuickTagBar } from "../components/infosys/QuickTagBar";
import InfosysMomentumStrip from "../components/infosys/InfosysMomentumStrip";

// ─── COSTANTI DESIGN ─────────────────────────────────────────────────────────

const card =
  "bg-[#0f1929] border border-white/[0.07] rounded-[20px] p-5 flex flex-col gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.25)]";

const cardSm =
  "bg-[#0f1929] border border-white/[0.07] rounded-[16px] p-4 flex flex-col gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.2)]";

const label =
  "text-[10px] uppercase tracking-[0.22em] text-[#C9CFDA]/50 font-semibold font-head";

const pill =
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border";

// ─── UTILITY ─────────────────────────────────────────────────────────────────

function confidenceColor(c?: string) {
  if (c === "HIGH") return "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]";
  if (c === "LOW") return "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]";
  return "border-[#E9A23B]/40 bg-[#E9A23B]/10 text-[#E9A23B]";
}

function riskColor(r?: string) {
  if (r === "LOW") return "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]";
  if (r === "HIGH") return "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]";
  return "border-[#E9A23B]/40 bg-[#E9A23B]/10 text-[#E9A23B]";
}

function upliftColor(u: number) {
  if (u > 0) return "text-[#22C55E]";
  if (u < 0) return "text-[#EF4444]";
  return "text-[#C9CFDA]/60";
}

function probColor(p: number): string {
  if (p >= 0.65) return "#D4FF3A";
  if (p >= 0.45) return "#E9A23B";
  return "#EF4444";
}

function probGlowBorder(p: number): React.CSSProperties {
  if (p >= 0.65) return { borderColor: "rgba(212,255,58,0.20)", boxShadow: "0 4px 24px rgba(212,255,58,0.07)" };
  if (p <= 0.35) return { borderColor: "rgba(239,68,68,0.20)", boxShadow: "0 4px 24px rgba(239,68,68,0.07)" };
  return {};
}

function pressureLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── WIZARD (setup only) ─────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { id: "scenario", label: "Match Setup", short: "Setup" },
];

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/* BackendStatusBadge */
function BackendStatusBadge({ status }: { status: "unknown" | "online" | "offline" }) {
  const { t } = useT();
  if (status === "online")
    return (
      <span className={`${pill} border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
        {t.backendOnline}
      </span>
    );
  if (status === "offline")
    return (
      <span className={`${pill} border-[#E9A23B]/30 bg-[#E9A23B]/10 text-[#E9A23B]`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#E9A23B]" />
        {t.demoFallbackBadge}
      </span>
    );
  return (
    <span className={`${pill} border-white/10 bg-white/[0.04] text-[#C9CFDA]/50`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#C9CFDA]/30" />
      {t.connectingLabel}
    </span>
  );
}

/* OutputModeSwitch */
function OutputModeSwitch({ mode, onChange }: { mode: OutputMode; onChange: (m: OutputMode) => void }) {
  const { t } = useT();
  const modes: { id: OutputMode; label: string }[] = [
    { id: "fan", label: t.fan },
    { id: "coach", label: t.coach },
    { id: "media", label: t.media },
    { id: "api", label: "Ally/API" },
  ];
  return (
    <div className="flex gap-1 p-1 bg-white/[0.04] rounded-[10px]">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex-1 px-2 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all
            ${mode === m.id
              ? "bg-[#D4FF3A] text-[#0B1220]"
              : "text-[#C9CFDA]/60 hover:text-[#F7F8FA] hover:bg-white/[0.04]"
            }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* InsightDisplay */
function InsightDisplay({ mode, insights }: {
  mode: OutputMode;
  insights: { fan: string; coach: string; media: string; apiPayload: object } | null;
}) {
  const { t } = useT();
  if (!insights) {
    return (
      <div className="rounded-[12px] border border-dashed border-white/[0.08] p-4 text-center">
        <p className="text-[12px] text-[#C9CFDA]/40">{t.completeWorkflow}</p>
      </div>
    );
  }
  if (mode === "api") {
    return (
      <pre className="text-[11px] text-[#D4FF3A]/80 bg-black/30 rounded-[12px] p-3 overflow-auto max-h-60 leading-relaxed font-mono">
        {JSON.stringify(insights.apiPayload, null, 2)}
      </pre>
    );
  }
  const text = mode === "fan" ? insights.fan : mode === "coach" ? insights.coach : insights.media;
  const modeLabel = mode === "fan" ? t.fanInsight : mode === "coach" ? t.coachInsight : t.mediaInsight;
  return (
    <div className="rounded-[12px] bg-white/[0.02] border border-white/[0.06] p-3">
      <div className={`${label} mb-2`}>{modeLabel}</div>
      <p className="text-[12px] text-[#C9CFDA]/80 leading-relaxed">{text}</p>
    </div>
  );
}

/* StatBar — riga singola stile ATP/Infosys con barra proporzionale bicolore */
function StatBar({ label, p1, p2, fmt }: {
  label: string;
  p1: number;
  p2: number;
  fmt?: (v: number) => string;
}) {
  const total = p1 + p2;
  const p1W = total > 0 ? Math.round((p1 / total) * 100) : 50;
  const p1Lead = p1 >= p2;
  const display = fmt ?? ((v: number) => String(v));
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex items-center gap-1">
        <span className={`font-head text-[18px] font-bold tabular-nums leading-none w-14 ${p1Lead ? "text-[#D4FF3A]" : "text-[#F7F8FA]"}`}>
          {display(p1)}
        </span>
        <span className="flex-1 text-center text-[7.5px] uppercase tracking-[0.22em] font-semibold shrink" style={{ color: "rgba(201,207,218,0.35)" }}>
          {label}
        </span>
        <span className={`font-head text-[18px] font-bold tabular-nums leading-none w-14 text-right ${!p1Lead ? "text-[#D4FF3A]" : "text-[#C9CFDA]/50"}`}>
          {display(p2)}
        </span>
      </div>
      <div className="h-[4px] rounded-full overflow-hidden flex">
        <div
          className="transition-all duration-700 ease-out"
          style={{
            width: `${p1W}%`,
            background: p1Lead ? "#D4FF3A" : "rgba(247,248,250,0.45)",
            borderRadius: "999px 0 0 999px",
          }}
        />
        <div
          className="transition-all duration-700 ease-out"
          style={{
            width: `${100 - p1W}%`,
            background: !p1Lead ? "#D4FF3A" : "rgba(201,207,218,0.12)",
            borderRadius: "0 999px 999px 0",
          }}
        />
      </div>
    </div>
  );
}

/* CollapsiblePanel */
function CollapsiblePanel({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/[0.07] rounded-[16px] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={label}>{title}</span>
        <span className={`text-[#C9CFDA]/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && <div className="p-4 border-t border-white/[0.06]">{children}</div>}
    </div>
  );
}

// ─── PAGINA PRINCIPALE ───────────────────────────────────────────────────────

export const InfosysDemoPage: React.FC = () => {
  const { t } = useT();
  const state = useInfosysDemoState();
  const {
    currentStep,
    selectedScenario,
    prediction,
    patterns,
    insights,
    outputMode,
    backendStatus,
    loading,
    briefCopied,
    scenarios,
    selectScenario,
    calculatePrediction,
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
    scoringFlags,
    lastScoringResult,
    initScoring,
    scoringDisplay,
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
  } = state;

  // ── Wizard modal (setup only) ─────────────────────────────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const [form, setForm] = useState<ScenarioFormState>(DEFAULT_FORM);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [modelStatsOpen, setModelStatsOpen] = useState(false);

  const handleFormChange = useCallback((patch: Partial<ScenarioFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setActivePresetId(null);
  }, []);

  const handlePreset = useCallback((s: typeof scenarios[0]) => {
    setForm(scenarioToForm(s));
    setActivePresetId(s.id);
  }, []);

  const handleReset = useCallback(() => {
    resetDemo();
    setForm(DEFAULT_FORM);
    setActivePresetId(null);
    setWizardOpen(false);
  }, [resetDemo]);

  // ── Open wizard for setup ─────────────────────────────────────────────────
  const openWizard = useCallback(() => {
    setWizardOpen(true);
  }, []);

  // ── Confirm scenario → init scoring → auto-predict → enter live mode ─────
  const handleConfirmScenario = useCallback(() => {
    const scenario = formToScenario(form);
    selectScenario(scenario);
    // Initialize scoring engine with setup config
    initScoring(scenario.isOnServe, 3);
    setWizardOpen(false);
  }, [form, selectScenario, initScoring]);

  // ── Auto-predict when scenario is set but no prediction exists ─────────────
  useEffect(() => {
    if (selectedScenario && !prediction && !loading) {
      calculatePrediction();
    }
  }, [selectedScenario, prediction, loading, calculatePrediction]);

  // ── Sync demo context to localStorage for Spinner AI coach ────────────────
  useEffect(() => {
    if (!selectedScenario) return;
    const ctx = {
      player1: selectedScenario.player1,
      player2: selectedScenario.player2,
      surface: selectedScenario.surface,
      score: scoringDisplay.fullScore,
      totalPoints: matchState.totalPoints,
      winRate: matchState.totalPoints > 0 ? Math.round((pointHistory.filter(p => p.won).length / matchState.totalPoints) * 100) : undefined,
      prediction: prediction?.probability,
      momentum: prediction?.momentumState,
      patternName: prediction?.patternName,
    };
    localStorage.setItem("tennisai_infosys_context", JSON.stringify(ctx));
  }, [selectedScenario, prediction, matchState.totalPoints, scoringDisplay.fullScore, pointHistory]);

  // ── Live mode: auto-recalculate after tagAndAdvance clears prediction ─────
  // (tagAndAdvance sets prediction=null → selectedScenario is updated → effect above fires)

  const canConfirm = form.player1.trim().length > 0 && form.player2.trim().length > 0;

  // ── Point stats ───────────────────────────────────────────────────────────
  const totalPoints = pointHistory.length;
  const wonPoints = pointHistory.filter((p) => p.won).length;
  const winRate = totalPoints > 0 ? Math.round((wonPoints / totalPoints) * 100) : 0;

  // ── ATP-style match stats (computed from pointHistory + runningStats) ─────
  const atpStats = React.useMemo(() => {
    const p1Won  = pointHistory.filter((p: TaggedPoint) => p.won).length;
    const p2Won  = pointHistory.length - p1Won;
    const p1Win  = pointHistory.filter((p: TaggedPoint) => p.won && p.outcome.finishType === "WINNER").length;
    const p2Win  = pointHistory.filter((p: TaggedPoint) => !p.won && p.outcome.finishType === "WINNER").length;
    const p1UE   = pointHistory.filter((p: TaggedPoint) => !p.won && p.outcome.finishType === "UNFORCED_ERROR").length;
    const p2UE   = pointHistory.filter((p: TaggedPoint) => p.won && p.outcome.finishType === "UNFORCED_ERROR").length;
    const p1Long = pointHistory.filter((p: TaggedPoint) => p.won && p.outcome.rallyLength === "LONG").length;
    const p2Long = pointHistory.filter((p: TaggedPoint) => !p.won && p.outcome.rallyLength === "LONG").length;
    const p1SvcPct = runningStats.svcPointsPlayed > 0 ? Math.round(runningStats.svcPct * 100) : null;
    const p2SvcPct = runningStats.rtnPointsPlayed > 0 ? Math.round((1 - runningStats.rtnPct) * 100) : null;
    return { p1Won, p2Won, p1Win, p2Win, p1UE, p2UE, p1Long, p2Long, p1SvcPct, p2SvcPct };
  }, [pointHistory, runningStats]);

  // ── Game/Set event toast ───────────────────────────────────────────────────
  const [gameEvent, setGameEvent] = useState<string | null>(null);
  useEffect(() => {
    if (!lastScoringResult) return;
    let msg: string | null = null;
    if (lastScoringResult.matchJustEnded) {
      // Handled by match over bar
      return;
    } else if (lastScoringResult.setJustEnded) {
      const lastSet = matchState.completedSets[matchState.completedSets.length - 1];
      if (lastSet) {
        const setWinnerName = lastSet[0] > lastSet[1] ? selectedScenario?.player1 : selectedScenario?.player2;
        msg = `🎯 SET ${setWinnerName}! ${lastSet[0]}-${lastSet[1]}`;
      }
    } else if (lastScoringResult.gameJustEnded) {
      msg = `✅ GAME · ${scoringDisplay.gameScore}`;
    }
    if (msg) {
      setGameEvent(msg);
      const t = setTimeout(() => setGameEvent(null), 3000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastScoringResult]);

  return (
    <div className="flex flex-col h-full">

      {/* ── HEADER (compact in live mode) ─────────────────────── */}
      <div className={`${liveMode ? cardSm : card} rounded-b-none lg:rounded-b-[20px]`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[#D4FF3A]/70 font-head">
                  Infosys · ATP Tour
                </span>
                <BackendStatusBadge status={backendStatus} />
                {liveMode && (
                  <span className={`${pill} border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] text-[10px]`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    Live Mode
                  </span>
                )}
                {liveMode && hasSavedMatch && (
                  <span className={`${pill} border-white/[0.06] bg-white/[0.02] text-[#C9CFDA]/30 text-[9px]`}>
                    💾 auto-saved
                  </span>
                )}
              </div>
              {!liveMode && (
                <>
                  <h2 className="font-head text-[20px] sm:text-[24px] font-bold text-[#F7F8FA] leading-tight tracking-tight">
                    ATP Tactical Intelligence Demo
                  </h2>
                  <p className="text-[12px] text-[#C9CFDA]/60 max-w-lg leading-relaxed">
                    Pre-point probability, tactical simulation and post-point explainability
                  </p>
                </>
              )}
              {liveMode && selectedScenario && (
                <div className="flex flex-col gap-2">
                  {/* ScoreBoard — TV broadcast style */}
                  <div className="flex flex-col gap-0">
                    {/* Player 1 row */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-head font-bold min-w-[100px] truncate ${
                        matchState.server === 1 ? "text-[#D4FF3A]" : "text-[#F7F8FA]"
                      }`}>
                        {matchState.server === 1 && "● "}{selectedScenario.player1}
                      </span>
                      {scoringDisplay.setScoresArray.map(([g1], i) => (
                        <span key={i} className={`font-head text-[13px] font-bold w-5 text-center ${
                          i < matchState.completedSets.length
                            ? matchState.completedSets[i][0] > matchState.completedSets[i][1]
                              ? "text-[#F7F8FA]"
                              : "text-[#C9CFDA]/40"
                            : "text-[#F7F8FA]"
                        }`}>
                          {g1}
                        </span>
                      ))}
                      {!matchState.matchOver && (
                        <span className="font-head text-[13px] font-bold text-[#D4FF3A] ml-1 w-5 text-center">
                          {matchState.points[0] <= 3 && !matchState.isTiebreak
                            ? ["0","15","30","40"][matchState.points[0]]
                            : matchState.points[0]}
                        </span>
                      )}
                    </div>
                    {/* Player 2 row */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-head font-bold min-w-[100px] truncate ${
                        matchState.server === 2 ? "text-[#D4FF3A]" : "text-[#F7F8FA]"
                      }`}>
                        {matchState.server === 2 && "● "}{selectedScenario.player2}
                      </span>
                      {scoringDisplay.setScoresArray.map(([, g2], i) => (
                        <span key={i} className={`font-head text-[13px] font-bold w-5 text-center ${
                          i < matchState.completedSets.length
                            ? matchState.completedSets[i][1] > matchState.completedSets[i][0]
                              ? "text-[#F7F8FA]"
                              : "text-[#C9CFDA]/40"
                            : "text-[#F7F8FA]"
                        }`}>
                          {g2}
                        </span>
                      ))}
                      {!matchState.matchOver && (
                        <span className="font-head text-[13px] font-bold text-[#D4FF3A] ml-1 w-5 text-center">
                          {matchState.points[1] <= 3 && !matchState.isTiebreak
                            ? ["0","15","30","40"][matchState.points[1]]
                            : matchState.points[1]}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Context row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`${pill} border-white/[0.08] bg-white/[0.03] text-[#C9CFDA]/50 text-[10px]`}>
                      {selectedScenario.surface}
                    </span>
                    <span className={`${pill} border-white/[0.08] bg-white/[0.03] text-[#C9CFDA]/50 text-[10px]`}>
                      {selectedScenario.round}
                    </span>
                    <span className="text-[10px] text-[#C9CFDA]/30">
                      Set {matchState.setNumber} · Pt {matchState.totalPoints + 1}
                    </span>
                    {scoringFlags.pressureState !== "NEUTRAL" && scoringFlags.pressureState !== "MATCH_OVER" && (
                      <span className={`${pill} text-[10px] ${
                        scoringFlags.pressureState.includes("AGAINST")
                          ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
                          : scoringFlags.pressureState.includes("MATCH_POINT")
                          ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/10 text-[#D4FF3A]"
                          : "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
                      }`}>
                        {scoringFlags.pressureState.replace(/_/g, " ")}
                      </span>
                    )}
                    {totalPoints > 0 && (
                      <span className="text-[10px] text-[#C9CFDA]/30">
                        {wonPoints}W-{totalPoints - wonPoints}L ({winRate}%)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {liveMode && (
              <button
                onClick={openWizard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-white/[0.08] bg-white/[0.02] text-[11px] text-[#C9CFDA]/60 hover:border-white/[0.15] hover:text-[#F7F8FA] transition-all"
              >
                {t.editSetup}
              </button>
            )}
            {/* Fan mode toggle */}
            {liveMode && (
              <button
                onClick={() => setFanMode(!fanMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border text-[11px] transition-all ${
                  fanMode
                    ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#8B5CF6]"
                    : "border-white/[0.08] bg-white/[0.02] text-[#C9CFDA]/60 hover:border-white/[0.15] hover:text-[#F7F8FA]"
                }`}
                title={fanMode ? "Switch to Coach mode (tagging)" : "Switch to Fan mode (view-only, receives updates)"}
              >
                {fanMode ? "📺 Fan" : "🎾 Coach"}
              </button>
            )}
            {/* Export buttons (live mode with data) */}
            {liveMode && pointHistory.length > 0 && (
              <>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-white/[0.08] bg-white/[0.02] text-[11px] text-[#C9CFDA]/60 hover:border-[#D4FF3A]/30 hover:text-[#D4FF3A] transition-all"
                  title="Export match data as CSV"
                >
                  ⬇ CSV
                </button>
                <button
                  onClick={exportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-white/[0.08] bg-white/[0.02] text-[11px] text-[#C9CFDA]/60 hover:border-[#D4FF3A]/30 hover:text-[#D4FF3A] transition-all"
                  title="Export match data as JSON"
                >
                  ⬇ JSON
                </button>
              </>
            )}
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-white/[0.08] bg-white/[0.02] text-[11px] text-[#C9CFDA]/60 hover:border-white/[0.15] hover:text-[#F7F8FA] transition-all"
            >
              <RefreshIcon size={12} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 mt-4">

        {/* ────── SETUP MODE (before live) ──────────────────── */}
        {!liveMode && !selectedScenario && (
          <div className={`${card} items-center justify-center min-h-[400px]`}>
            <div className="flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-[#D4FF3A]/[0.08] flex items-center justify-center">
                <AIIcon size={36} className="text-[#D4FF3A]/60" />
              </div>
              <div className="text-center">
                <h3 className="font-head text-[18px] font-bold text-[#F7F8FA]">
                  {t.startAnalysis}
                </h3>
                <p className="text-[13px] text-[#C9CFDA]/50 mt-2 max-w-sm leading-relaxed">
                  {t.startAnalysisDesc}
                </p>
              </div>
              <button
                onClick={openWizard}
                className="flex items-center gap-2.5 px-6 py-3 rounded-[14px] bg-[#D4FF3A] text-[#0B1220] text-[14px] font-bold hover:bg-[#C4EF2A] hover:scale-[1.02] transition-all shadow-[0_6px_24px_rgba(212,255,58,0.3)]"
              >
                <TacticsIcon size={18} />
                {t.setup}
              </button>
              <div className="flex flex-col items-center gap-2 mt-2">
                <span className="text-[10px] text-[#C9CFDA]/30 uppercase tracking-widest">{t.jumpPreset}</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {scenarios.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setForm(scenarioToForm(s));
                        setActivePresetId(s.id);
                        openWizard();
                      }}
                      className="px-3 py-1.5 rounded-[8px] border border-white/[0.08] bg-white/[0.02] text-[11px] text-[#C9CFDA]/60 hover:border-[#D4FF3A]/30 hover:text-[#F7F8FA] transition-all"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading state (predicting) ────────────────────── */}
        {selectedScenario && !prediction && loading && (
          <div className={`${card} items-center justify-center min-h-[200px]`}>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-[3px] border-[#D4FF3A]/10 border-t-[#D4FF3A] animate-spin" />
                <AIIcon size={24} className="absolute inset-0 m-auto text-[#D4FF3A]/60" />
              </div>
              <p className="text-[13px] text-[#C9CFDA]/60">{t.calculating}</p>
            </div>
          </div>
        )}

        {/* ────── LIVE MODE ────────────────────────────────── */}
        {liveMode && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">

            {/* ── LEFT: Prediction + Tactical ────────────── */}
            <div className="flex flex-col gap-4">

               {/* Prediction hero */}
              {prediction && (
                <div className={card} style={!prediction.predictionUnavailable ? probGlowBorder(prediction.probability) : {}}>
                  {prediction.predictionUnavailable ? (
                    <div className="flex flex-col items-center text-center gap-3 py-4 px-2 w-full">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full border border-[#E9A23B]/30 bg-[#E9A23B]/05 text-[#E9A23B] animate-pulse text-[20px]">
                        ⚠️
                      </div>
                      <div>
                        <h4 className="font-head text-[15px] font-bold text-[#F7F8FA]">
                          {t.aiPredOffline}
                        </h4>
                        <p className="text-[12px] text-[#C9CFDA]/60 mt-1 max-w-[340px]">
                          {t.aiPredOfflineDesc}
                        </p>
                      </div>
                      <div className="text-[11px] text-[#22C55E]/90 bg-[#22C55E]/05 border border-[#22C55E]/10 rounded-lg py-1.5 px-3 max-w-[360px] leading-relaxed">
                        🟢 <strong>{t.localEngineActive}</strong>: {t.localEngineDesc}
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2.5 border-t border-white/[0.04] w-full justify-center">
                        <span className="text-[11px] text-[#C9CFDA]/50">Abilita simulazione offline:</span>
                        <button
                          onClick={() => {
                            setDemoSimulationMode(true);
                            setTimeout(() => calculatePrediction(), 50);
                          }}
                          className="px-2.5 py-1 text-[10px] font-semibold rounded-md border border-[#D4FF3A]/20 bg-[#D4FF3A]/05 text-[#D4FF3A] hover:bg-[#D4FF3A]/10 transition-all"
                        >
                          {t.enableDemo}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={Math.round(prediction.probability * 100)}
                      className="prob-hero-enter flex flex-col items-center gap-2 py-1 w-full"
                    >
                      {prediction.isDemoFallback && (
                        <div className="flex items-center gap-2">
                          <span className={`${pill} border-[#E9A23B]/30 bg-[#E9A23B]/08 text-[#E9A23B]/80 text-[10px]`}>
                            Demo fallback
                          </span>
                          <button
                            onClick={() => {
                              setDemoSimulationMode(false);
                              setTimeout(() => calculatePrediction(), 50);
                            }}
                            className="text-[9px] underline text-[#C9CFDA]/40 hover:text-[#C9CFDA]/60 transition-all"
                          >
                            {t.disableDemo}
                          </button>
                        </div>
                      )}
                      {/* Big probability number */}
                      <div className="flex items-baseline gap-1">
                        <span
                          className="font-head text-[72px] leading-none font-bold tracking-tight transition-colors duration-500"
                          style={{ color: probColor(prediction.probability) }}
                        >
                          {Math.round(prediction.probability * 100)}
                        </span>
                        <span className="font-head text-[30px] text-[#C9CFDA]/35">%</span>
                      </div>
                      <span
                        className="text-[11px] font-semibold tracking-[0.18em] uppercase -mt-1 transition-colors duration-500"
                        style={{ color: probColor(prediction.probability), opacity: 0.65 }}
                      >
                        {t.nextPointProb}
                      </span>
                      {/* Probability gauge bar */}
                      <div className="w-full max-w-[280px] mx-auto mt-1.5">
                        <div className="relative h-[7px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          {/* Zone backgrounds */}
                          <div className="absolute inset-0" style={{
                            background: "linear-gradient(to right, rgba(239,68,68,0.18) 35%, rgba(233,162,59,0.18) 35% 65%, rgba(212,255,58,0.18) 65%)"
                          }} />
                          {/* Active fill */}
                          <div
                            className="absolute left-0 top-0 h-full rounded-full prob-bar-fill"
                            style={{
                              width: `${Math.round(prediction.probability * 100)}%`,
                              background: probColor(prediction.probability),
                              boxShadow: `0 0 8px ${probColor(prediction.probability)}50`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[8px] tabular-nums" style={{ color: "rgba(201,207,218,0.22)" }}>
                          <span>0</span>
                          <span>Neutral 50</span>
                          <span>100</span>
                        </div>
                      </div>
                      {/* Status pills */}
                      <div className="flex flex-wrap justify-center gap-2 mt-0.5">
                        <span className={`${pill} ${confidenceColor(prediction.tacticalConfidence)}`}>
                          {prediction.tacticalConfidence}
                        </span>
                        <span className={`${pill} ${
                          prediction.momentumState === "HOT"
                            ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
                            : prediction.momentumState === "COLD"
                            ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
                            : "border-white/10 bg-white/[0.04] text-[#C9CFDA]/60"
                        }`}>
                          {prediction.momentumState === "HOT" ? "🔥 " : prediction.momentumState === "COLD" ? "❄ " : ""}
                          {prediction.momentumState}
                        </span>
                        <span className={`${pill} ${
                          prediction.pressureState.includes("AGAINST")
                            ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
                            : prediction.pressureState.includes("FOR")
                            ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
                            : "border-white/10 bg-white/[0.04] text-[#C9CFDA]/60"
                        }`}>
                          {pressureLabel(prediction.pressureState)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tactical recommendation */}
              {prediction && (
                <div className="rounded-[16px] border border-[#D4FF3A]/20 bg-[#D4FF3A]/[0.04] flex flex-col gap-2 relative overflow-hidden" style={{ padding: "16px 16px 16px 22px" }}>
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: "rgba(212,255,58,0.65)" }} />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={label}>{t.recommendedPattern}</div>
                      <div className="font-head text-[15px] font-bold text-[#F7F8FA] mt-0.5 leading-snug">
                        {prediction.patternName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`${pill} ${riskColor(prediction.riskLevel)}`}>
                        {prediction.riskLevel}
                      </span>
                      {prediction.tacticalV3?.strategicPriority && (
                        <span className={`${pill} ${
                          prediction.tacticalV3.strategicPriority === "EXPLOIT"
                            ? "border-[#22C55E]/30 bg-[#22C55E]/08 text-[#22C55E]/80"
                            : prediction.tacticalV3.strategicPriority === "PROTECT"
                            ? "border-[#E9A23B]/30 bg-[#E9A23B]/08 text-[#E9A23B]/80"
                            : "border-[#3B82F6]/30 bg-[#3B82F6]/08 text-[#3B82F6]/80"
                        }`}>
                          {prediction.tacticalV3.strategicPriority}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[12px] text-[#C9CFDA]/65 leading-relaxed">
                    {prediction.tacticalExplanation || prediction.tacticalV3?.tacticalRationaleV3 || "—"}
                  </p>
                </div>
              )}

              {/* Pattern alternatives */}
              {prediction && !prediction.predictionUnavailable && patterns && patterns.length > 0 && (
                <div className={cardSm}>
                  <div className={label}>{t.alternatives}</div>
                  <div className="flex flex-col gap-1.5">
                    {patterns.map((p, i) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition-all ${
                          i === 0
                            ? "border-[#D4FF3A]/10 bg-[#D4FF3A]/[0.025]"
                            : "border-white/[0.04] bg-white/[0.01]"
                        }`}
                      >
                        <span className="text-[10px] font-bold font-head tabular-nums shrink-0" style={{ color: "rgba(201,207,218,0.25)" }}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-[#C9CFDA]/75 truncate leading-tight">{p.name}</div>
                          <div className="text-[9px] text-[#C9CFDA]/35 mt-0.5 truncate">{p.description}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`font-head text-[12px] font-bold tabular-nums ${upliftColor(p.uplift)}`}>
                            {p.uplift > 0 ? "+" : ""}{p.uplift}pp
                          </span>
                          <span className={`${pill} text-[9px] ${riskColor(p.risk)}`}>{p.risk}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Transparency Info */}
              {prediction && prediction.modelMetadata && !prediction.predictionUnavailable && (
                <div className="rounded-[12px] border border-white/[0.04] bg-white/[0.01] p-3 flex flex-col gap-1.5 transition-all">
                  <div className="flex items-center justify-between text-[#C9CFDA]/40 text-[10px] font-head uppercase tracking-wider font-semibold">
                    <div className="flex items-center gap-1">
                      <span>🤖 MODEL STATS</span>
                    </div>
                    <span className="text-[#D4FF3A]/80 font-bold">XGBoost v{prediction.modelMetadata.version}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white/[0.02] border border-white/[0.03] p-1.5 rounded-lg flex flex-col">
                      <span className="text-[#C9CFDA]/40 text-[9px] uppercase tracking-wide">Calibrazione</span>
                      <span className="text-[#C9CFDA]/80 font-semibold mt-0.5 capitalize">
                        {prediction.modelMetadata.calibration_method} Regression
                      </span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.03] p-1.5 rounded-lg flex flex-col">
                      <span className="text-[#C9CFDA]/40 text-[9px] uppercase tracking-wide">Validazione</span>
                      <span className="text-[#C9CFDA]/80 font-semibold mt-0.5">
                        Temporal Match Split
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-[#C9CFDA]/50 mt-1 border-t border-white/[0.03] pt-1.5 justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Brier: <strong className="text-[#F7F8FA]">{prediction.modelMetadata.brier_score?.toFixed(3)}</strong></span>
                      <span className="text-white/[0.15]">|</span>
                      <span>AUC: <strong className="text-[#F7F8FA]">{prediction.modelMetadata.roc_auc?.toFixed(3)}</strong></span>
                      <span className="text-white/[0.15]">|</span>
                      <span>Acc: <strong className="text-[#F7F8FA]">{((prediction.modelMetadata.accuracy ?? 0) * 100).toFixed(1)}%</strong></span>
                    </div>
                    {/* Click-to-expand info — works on tablet (no hover needed) */}
                    <button
                      onClick={() => setModelStatsOpen(v => !v)}
                      className={`flex items-center justify-center w-5 h-5 rounded-full border transition-all text-[9px] shrink-0 ${
                        modelStatsOpen
                          ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/10 text-[#D4FF3A]"
                          : "border-white/[0.12] bg-white/[0.04] text-[#C9CFDA]/50 hover:bg-white/[0.08]"
                      }`}
                      aria-label="Mostra info metriche"
                    >
                      ℹ
                    </button>
                  </div>
                  {/* Expandable info panel */}
                  {modelStatsOpen && (
                    <div className="mt-2 rounded-[10px] border border-white/[0.06] bg-black/20 p-3 text-[11px] text-[#C9CFDA]/75 leading-relaxed">
                      <div className="font-head font-bold text-[#F7F8FA] text-[12px] mb-2">Metriche di Credibilità AI</div>
                      <p className="mb-2">
                        <strong className="text-[#C9CFDA]/90">Brier Score {prediction.modelMetadata.brier_score?.toFixed(3)}</strong> — Scala 0–0.25 (0 = perfetto, 0.25 = previsione casuale su eventi bilanciati). Il modello supera del {Math.round(((0.25 - (prediction.modelMetadata.brier_score ?? 0.25)) / 0.25) * 100)}% la soglia casuale.
                      </p>
                      <p className="mb-2">
                        <strong className="text-[#C9CFDA]/90">ROC AUC {prediction.modelMetadata.roc_auc?.toFixed(3)}</strong> — Misura la capacità discriminativa. 0.5 = casuale, 1.0 = perfetto. Il valore attuale indica un modello significativamente predittivo.
                      </p>
                      <p>
                        <strong className="text-[#C9CFDA]/90">Temporal Match Split</strong> — Il test set contiene partite intere mai viste in training. Elimina il data leakage punto-per-punto e simula un utilizzo reale in campo.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Loading next prediction */}
              {!prediction && selectedScenario && (
                <div className={`${card} items-center justify-center py-10`}>
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 border-2 border-[#D4FF3A]/30 border-t-[#D4FF3A] rounded-full animate-spin" />
                    <span className="text-[13px] text-[#C9CFDA]/50">{t.calculating}</span>
                  </div>
                </div>
              )}

              {/* ── Infosys Momentum Strip ── */}
              {selectedScenario && (
                <InfosysMomentumStrip
                  beats={[...pointHistory].reverse().map(pt => ({
                    id: pt.id,
                    pointNumber: pt.pointNumber,
                    won: pt.won,
                    rallyLength: pt.outcome.rallyLength,
                    probability: pt.prediction.probability,
                    hasPressure: pt.prediction.pressureState !== "NEUTRAL",
                    swing: pt.swing,
                    pointScore: pt.pointScore,
                    finishType: pt.outcome.finishType,
                  }))}
                  player1={selectedScenario.player1}
                  player2={selectedScenario.player2}
                />
              )}

              {/* ── ATP Match Statistics ── */}
              {totalPoints > 0 && selectedScenario && (
                <div className={card} style={{ gap: "16px" }}>
                  {/* Header player names */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-head text-[13px] font-bold text-[#D4FF3A] truncate max-w-[38%] uppercase tracking-wide">
                      {selectedScenario.player1.split(" ").slice(-1)[0]}
                    </span>
                    <span className="text-[8px] uppercase tracking-[0.28em] font-bold shrink-0" style={{ color: "rgba(201,207,218,0.35)" }}>
                      {t.matchStats}
                    </span>
                    <span className="font-head text-[13px] font-bold text-[#C9CFDA]/50 truncate max-w-[38%] uppercase tracking-wide text-right">
                      {selectedScenario.player2.split(" ").slice(-1)[0]}
                    </span>
                  </div>

                  <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

                  {/* Stat rows */}
                  <div className="flex flex-col gap-3.5">
                    <StatBar label={t.pointsWon} p1={atpStats.p1Won} p2={atpStats.p2Won} />
                    {(atpStats.p1Win + atpStats.p2Win) > 0 && (
                      <StatBar label="Winners" p1={atpStats.p1Win} p2={atpStats.p2Win} />
                    )}
                    {(atpStats.p1UE + atpStats.p2UE) > 0 && (
                      <StatBar label="Unforced Errors" p1={atpStats.p1UE} p2={atpStats.p2UE} />
                    )}
                    {atpStats.p1SvcPct !== null && atpStats.p2SvcPct !== null && (
                      <StatBar
                        label={t.serveWon}
                        p1={atpStats.p1SvcPct}
                        p2={atpStats.p2SvcPct}
                        fmt={(v) => `${v}%`}
                      />
                    )}
                    {(atpStats.p1Long + atpStats.p2Long) > 0 && (
                      <StatBar label="Long Rally Pts" p1={atpStats.p1Long} p2={atpStats.p2Long} />
                    )}
                  </div>

                  {/* Points total footer */}
                  <div className="flex items-center justify-center gap-2 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(201,207,218,0.25)" }}>
                      {totalPoints} {t.pointsPlayed}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Point History + Sidebar ─────────── */}
            <div className="flex flex-col gap-4">

              {/* Point history feed */}
              {pointHistory.length > 0 && (
                <div className={cardSm}>
                  <div className="flex items-center justify-between">
                    <span className={label}>{t.pointHistory}</span>
                    <span className="text-[10px] text-[#C9CFDA]/30">{totalPoints} pts</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto scrollbar-hide">
                    {pointHistory.slice(0, 30).map((pt) => (
                      <div
                        key={pt.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] border transition-all ${
                          pt.won
                            ? "border-[#22C55E]/15 bg-[#22C55E]/[0.04]"
                            : "border-[#EF4444]/15 bg-[#EF4444]/[0.04]"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          pt.won ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-[#EF4444]/20 text-[#EF4444]"
                        }`}>
                          {pt.won ? "W" : "L"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-[#C9CFDA]/70">
                                #{pt.pointNumber}
                              </span>
                              {pt.pointScore && (
                                <span className="text-[9px] font-mono text-[#C9CFDA]/30">
                                  {pt.pointScore}
                                </span>
                              )}
                            </div>
                            <span className={`font-head text-[11px] font-bold ${
                              pt.swing >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                            }`}>
                              {pt.swing >= 0 ? "+" : ""}{pt.swing}pp
                            </span>
                          </div>
                          <div className="text-[9px] text-[#C9CFDA]/35 truncate">
                            {pt.outcome.finishType.replace(/_/g, " ")} · {pt.outcome.rallyLength}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Output mode */}
              <div className={cardSm}>
                <div className={label}>{t.outputMode}</div>
                <OutputModeSwitch mode={outputMode} onChange={setOutputMode} />
                <InsightDisplay mode={outputMode} insights={insights} />
              </div>

              {/* API payload */}
              {prediction && (
                <CollapsiblePanel title="Ally/API payload">
                  <pre className="text-[10px] text-[#D4FF3A]/70 leading-relaxed font-mono overflow-auto max-h-48">
                    {JSON.stringify({
                      point_win_probability: prediction.probability,
                      calibrated: true,
                      pre_point_safe: true,
                      tactical_call: prediction.tacticalCall,
                      tactical_confidence: prediction.tacticalConfidence,
                      risk_level: prediction.riskLevel,
                      momentum_state: prediction.momentumState,
                      pressure_state: prediction.pressureState,
                      pattern_name: prediction.patternName,
                      is_demo_fallback: prediction.isDemoFallback,
                      points_tagged: totalPoints,
                    }, null, 2)}
                  </pre>
                </CollapsiblePanel>
              )}
            </div>
          </div>
        )}
      </div>
      {/* ── GAME/SET EVENT TOAST ────────────────────────── */}
      {gameEvent && (
        <div className="fixed bottom-[140px] left-1/2 -translate-x-1/2 z-[95] swing-toast">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] border border-[#8B5CF6]/30 bg-[#8B5CF6]/15 text-[#D4FF3A] shadow-lg"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <span className="font-head text-[13px] font-bold tracking-wide">
              {gameEvent}
            </span>
          </div>
        </div>
      )}

      {/* ── QUICK TAG BAR (sticky bottom, live+coach mode only) ──── */}
      {liveMode && prediction && !matchState.matchOver && !fanMode && (
        <QuickTagBar
          onTag={tagAndAdvance}
          onUndo={undoLastPoint}
          canUndo={canUndo}
          loading={loading}
          pointNumber={matchState.totalPoints + 1}
          patternName={prediction.patternName}
          lastSwing={lastSwing}
          isServing={matchState.server === 1}
          serverName={matchState.server === 1 ? selectedScenario?.player1 : selectedScenario?.player2}
        />
      )}

      {/* ── FAN MODE BAR (view only) ────────────────────────── */}
      {liveMode && fanMode && !matchState.matchOver && (
        <div className="quick-tag-bar">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 py-2">
            <span className="text-[14px]">📺</span>
            <span className="text-[12px] text-[#8B5CF6] font-semibold">Fan Mode</span>
            <span className="text-[11px] text-[#C9CFDA]/40">
              Viewing live updates from coach tab
            </span>
          </div>
        </div>
      )}

      {/* ── MATCH OVER ───────────────────────────────────── */}
      {liveMode && matchState.matchOver && (
        <div className="quick-tag-bar">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 py-2">
            <span className="text-[16px]">🏆</span>
            <span className="font-head text-[14px] font-bold text-[#D4FF3A]">
              {matchState.winner === 1 ? selectedScenario?.player1 : selectedScenario?.player2} {t.matchWins}!
            </span>
            <span className="text-[12px] text-[#C9CFDA]/50">{scoringDisplay.fullScore}</span>
            <button
              onClick={handleReset}
              className="ml-3 px-3 py-1.5 rounded-[8px] border border-[#D4FF3A]/30 text-[#D4FF3A] text-[11px] font-bold hover:bg-[#D4FF3A]/10 transition-all"
            >
              {t.newMatch}
            </button>
          </div>
        </div>
      )}

      {/* ── WIZARD MODAL (setup only) ─────────────────────── */}
      <WizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        steps={WIZARD_STEPS}
        currentStep={0}
        stepTitle="Set up match scenario"
        stepSubtitle="Choose a preset or configure a custom match situation"
        onNext={canConfirm ? handleConfirmScenario : null}
        nextLabel={canConfirm ? t.confirmStart : t.startAnalysis}
        nextDisabled={!canConfirm}
        direction="forward"
      >
        <WizardStepScenario
          form={form}
          onChange={handleFormChange}
          presets={scenarios}
          activePresetId={activePresetId}
          onPreset={handlePreset}
        />
      </WizardModal>
    </div>
  );
};

export default InfosysDemoPage;
