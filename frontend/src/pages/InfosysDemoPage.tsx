// src/pages/InfosysDemoPage.tsx
// ATP Tactical Intelligence Demo — Infosys/ATP integration showcase
// Layout: Header → WorkflowStepper → [Left rail | Center stage | Right rail] → Collapsible bottom

import React, { useState } from "react";
import {
  useInfosysDemoState,
  DEMO_SCENARIOS,
  type DemoStep,
  type PatternAlternative,
  type RegisteredOutcome,
  type OutputMode,
} from "../hooks/useInfosysDemoState";
import {
  TacticsIcon,
  ChartIcon,
  CheckIcon,
  RefreshIcon,
  DownloadIcon,
  ArrowRightIcon,
  AIIcon,
  ShareIcon,
  LayersIcon,
  CloseIcon,
} from "../components/ui/icons";

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

function pressureLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── STEP DEFINITIONS ────────────────────────────────────────────────────────

const STEPS: { id: DemoStep; label: string; short: string }[] = [
  { id: "scenario", label: "Scenario", short: "1" },
  { id: "predict", label: "Predict", short: "2" },
  { id: "simulate", label: "Simulate", short: "3" },
  { id: "register", label: "Register", short: "4" },
  { id: "explain", label: "Explain", short: "5" },
  { id: "export", label: "Export", short: "6" },
];

const STEP_INDEX: Record<DemoStep, number> = {
  scenario: 0,
  predict: 1,
  simulate: 2,
  register: 3,
  explain: 4,
  export: 5,
};

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/* WorkflowStepper */
function WorkflowStepper({
  currentStep,
  onStepClick,
}: {
  currentStep: DemoStep;
  onStepClick: (s: DemoStep) => void;
}) {
  const current = STEP_INDEX[currentStep];
  return (
    <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => done && onStepClick(step.id)}
              disabled={!done && !active}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-semibold transition-all shrink-0
                ${active
                  ? "bg-[#D4FF3A] text-[#0B1220]"
                  : done
                  ? "bg-white/[0.06] text-[#F7F8FA] hover:bg-white/[0.10] cursor-pointer"
                  : "bg-white/[0.02] text-[#C9CFDA]/30 cursor-not-allowed"
                }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                  ${active ? "bg-[#0B1220]/20" : done ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-white/[0.06]"}`}
              >
                {done ? <CheckIcon size={11} /> : step.short}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`w-6 h-px shrink-0 ${i < current ? "bg-[#22C55E]/40" : "bg-white/[0.08]"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* BackendStatusBadge */
function BackendStatusBadge({
  status,
}: {
  status: "unknown" | "online" | "offline";
}) {
  if (status === "online")
    return (
      <span className={`${pill} border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
        Backend online
      </span>
    );
  if (status === "offline")
    return (
      <span className={`${pill} border-[#E9A23B]/30 bg-[#E9A23B]/10 text-[#E9A23B]`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#E9A23B]" />
        Demo fallback
      </span>
    );
  return (
    <span className={`${pill} border-white/10 bg-white/[0.04] text-[#C9CFDA]/50`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#C9CFDA]/30" />
      Connecting…
    </span>
  );
}

/* CollapsiblePanel */
function CollapsiblePanel({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
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
        <span
          className={`text-[#C9CFDA]/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && <div className="p-4 border-t border-white/[0.06]">{children}</div>}
    </div>
  );
}

/* OutputModeSwitch */
function OutputModeSwitch({
  mode,
  onChange,
}: {
  mode: OutputMode;
  onChange: (m: OutputMode) => void;
}) {
  const modes: { id: OutputMode; label: string }[] = [
    { id: "fan", label: "Fan" },
    { id: "coach", label: "Coach" },
    { id: "media", label: "Media" },
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

/* ProbabilityHero */
function ProbabilityHero({
  probability,
  confidence,
  pressureState,
  momentumState,
  isDemoFallback,
}: {
  probability: number;
  confidence: string;
  pressureState: string;
  momentumState: string;
  isDemoFallback: boolean;
}) {
  const pct = Math.round(probability * 100);
  const delta = pct - 50;
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {isDemoFallback && (
        <span className={`${pill} border-[#E9A23B]/30 bg-[#E9A23B]/08 text-[#E9A23B]/80 text-[10px]`}>
          Demo fallback — backend unavailable
        </span>
      )}
      {/* Big number */}
      <div className="relative flex flex-col items-center">
        <span className="font-head text-[72px] leading-none font-bold text-[#F7F8FA] tracking-tight">
          {pct}
          <span className="text-[32px] text-[#C9CFDA]/50">%</span>
        </span>
        <span className="text-[11px] font-semibold text-[#D4FF3A]/80 tracking-wide -mt-1">
          Calibrated win probability
        </span>
      </div>

      {/* Delta */}
      <div
        className={`font-head text-[14px] font-semibold ${delta >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}
      >
        {delta >= 0 ? "+" : ""}
        {delta}pp vs baseline
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap justify-center gap-2">
        <span className={`${pill} ${confidenceColor(confidence)}`}>
          {confidence} confidence
        </span>
        <span
          className={`${pill} ${
            momentumState === "HOT"
              ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
              : momentumState === "COLD"
              ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
              : "border-white/10 bg-white/[0.04] text-[#C9CFDA]/60"
          }`}
        >
          {momentumState === "HOT" ? "🔥 " : momentumState === "COLD" ? "❄ " : ""}
          {momentumState} momentum
        </span>
        <span
          className={`${pill} ${
            pressureState.includes("AGAINST")
              ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
              : pressureState.includes("FOR")
              ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
              : "border-white/10 bg-white/[0.04] text-[#C9CFDA]/60"
          }`}
        >
          {pressureLabel(pressureState)}
        </span>
      </div>
    </div>
  );
}

/* TacticalRecommendationCard */
function TacticalRecommendationCard({
  patternName,
  uplift,
  riskLevel,
  confidence,
  explanation,
  strategicPriority,
}: {
  patternName: string;
  uplift: number;
  riskLevel: string;
  confidence: string;
  explanation: string;
  strategicPriority?: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#D4FF3A]/20 bg-[#D4FF3A]/[0.04] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={label}>Recommended pattern</div>
          <div className="font-head text-[15px] font-bold text-[#F7F8FA] mt-1 leading-snug">
            {patternName}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`font-head text-[18px] font-bold ${upliftColor(uplift)}`}
          >
            {uplift > 0 ? "+" : ""}
            {uplift}%
          </span>
          <span className="text-[9px] text-[#C9CFDA]/40 uppercase tracking-wide">
            expected uplift
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`${pill} ${riskColor(riskLevel)}`}>
          {riskLevel} risk
        </span>
        <span className={`${pill} ${confidenceColor(confidence)}`}>
          {confidence} confidence
        </span>
        {strategicPriority && (
          <span
            className={`${pill} ${
              strategicPriority === "EXPLOIT"
                ? "border-[#22C55E]/30 bg-[#22C55E]/08 text-[#22C55E]/80"
                : strategicPriority === "PROTECT"
                ? "border-[#E9A23B]/30 bg-[#E9A23B]/08 text-[#E9A23B]/80"
                : "border-[#3B82F6]/30 bg-[#3B82F6]/08 text-[#3B82F6]/80"
            }`}
          >
            {strategicPriority}
          </span>
        )}
      </div>

      <p className="text-[12px] text-[#C9CFDA]/70 leading-relaxed">
        {explanation}
      </p>
    </div>
  );
}

/* PatternAlternativesCard */
function PatternAlternativesCard({
  patterns,
  selectedPatternId,
  onSelect,
}: {
  patterns: PatternAlternative[];
  selectedPatternId: string | null;
  onSelect: (p: PatternAlternative) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={label}>Compare tactical options</div>
      {patterns.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={`w-full text-left rounded-[12px] border p-3 transition-all
            ${selectedPatternId === p.id
              ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/[0.06]"
              : i === 0
              ? "border-[#D4FF3A]/20 bg-white/[0.02] hover:border-[#D4FF3A]/30"
              : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.10]"
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[12px] font-semibold ${
                selectedPatternId === p.id
                  ? "text-[#F7F8FA]"
                  : "text-[#C9CFDA]/80"
              }`}
            >
              {i === 0 && (
                <span className="text-[#D4FF3A] mr-1.5">★</span>
              )}
              {p.name}
            </span>
            <span
              className={`font-head text-[13px] font-bold shrink-0 ${upliftColor(p.uplift)}`}
            >
              {p.uplift > 0 ? "+" : ""}
              {p.uplift}%
            </span>
          </div>
          <div className="flex gap-1.5 mt-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${riskColor(p.risk)}`}>
              {p.risk} risk
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${confidenceColor(p.confidence)}`}>
              {p.confidence}
            </span>
          </div>
          <p className="text-[11px] text-[#C9CFDA]/50 mt-1.5 leading-snug">
            {p.description}
          </p>
        </button>
      ))}
    </div>
  );
}

/* RegisterOutcomePanel */
function RegisterOutcomePanel({
  onRegister,
}: {
  onRegister: (o: RegisteredOutcome) => void;
}) {
  const [winner, setWinner] = useState<"player" | "opponent">("player");
  const [rallyLength, setRallyLength] = useState<"SHORT" | "MEDIUM" | "LONG">("SHORT");
  const [finishType, setFinishType] = useState<"WINNER" | "FORCED_ERROR" | "UNFORCED_ERROR">("WINNER");
  const [serveDir, setServeDir] = useState<"T" | "BODY" | "WIDE">("T");
  const [pattern, setPattern] = useState("Flat T-Serve + Inside-Out FH");

  return (
    <div className="flex flex-col gap-4">
      <div className={label}>Register actual outcome</div>

      {/* Pattern played */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60">Pattern executed</span>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-3 py-2 text-[13px] text-[#F7F8FA] placeholder-[#C9CFDA]/30 focus:outline-none focus:border-[#D4FF3A]/40 transition-colors"
        />
      </div>

      {/* Winner */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60">Point won by</span>
        <div className="grid grid-cols-2 gap-2">
          {(["player", "opponent"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWinner(w)}
              className={`py-2 rounded-[10px] text-[12px] font-semibold border transition-all
                ${winner === w
                  ? w === "player"
                    ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]"
                    : "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]"
                  : "border-white/[0.07] bg-white/[0.02] text-[#C9CFDA]/60 hover:border-white/[0.12]"
                }`}
            >
              {w === "player" ? "Player won" : "Opponent won"}
            </button>
          ))}
        </div>
      </div>

      {/* Rally length */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60">Rally length</span>
        <div className="grid grid-cols-3 gap-2">
          {(["SHORT", "MEDIUM", "LONG"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRallyLength(r)}
              className={`py-2 rounded-[10px] text-[11px] font-semibold border transition-all
                ${rallyLength === r
                  ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/08 text-[#D4FF3A]"
                  : "border-white/[0.07] bg-white/[0.02] text-[#C9CFDA]/60 hover:border-white/[0.12]"
                }`}
            >
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Finish type */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60">Finish type</span>
        <div className="grid grid-cols-3 gap-2">
          {(["WINNER", "FORCED_ERROR", "UNFORCED_ERROR"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFinishType(f)}
              className={`py-2 rounded-[10px] text-[10px] font-semibold border transition-all
                ${finishType === f
                  ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/08 text-[#D4FF3A]"
                  : "border-white/[0.07] bg-white/[0.02] text-[#C9CFDA]/60 hover:border-white/[0.12]"
                }`}
            >
              {f.replace(/_/g, " ").charAt(0) +
                f.replace(/_/g, " ").slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Serve direction */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60">Serve direction</span>
        <div className="grid grid-cols-3 gap-2">
          {(["T", "BODY", "WIDE"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setServeDir(d)}
              className={`py-2 rounded-[10px] text-[11px] font-semibold border transition-all
                ${serveDir === d
                  ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/08 text-[#D4FF3A]"
                  : "border-white/[0.07] bg-white/[0.02] text-[#C9CFDA]/60 hover:border-white/[0.12]"
                }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() =>
          onRegister({
            actualPattern: pattern,
            winner,
            rallyLength,
            finishType,
            serveDirection: serveDir,
          })
        }
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] bg-[#D4FF3A] text-[#0B1220] text-[13px] font-bold hover:bg-[#C4EF2A] hover:scale-[1.01] transition-all shadow-[0_4px_16px_rgba(212,255,58,0.25)]"
      >
        <CheckIcon size={15} />
        Register point outcome
      </button>
    </div>
  );
}

/* PostPointExplanationPanel */
function PostPointExplanationPanel({
  probabilityBefore,
  actualOutcome,
  probabilitySwing,
  explanation,
  nextPointAdjustment,
  isDemoFallback,
}: {
  probabilityBefore: number;
  actualOutcome: "WON" | "LOST";
  probabilitySwing: number;
  explanation: string;
  nextPointAdjustment: string;
  isDemoFallback: boolean;
}) {
  const probPct = Math.round(probabilityBefore * 100);
  const swingPct = Math.round(Math.abs(probabilitySwing) * 100);

  return (
    <div className="flex flex-col gap-3">
      {isDemoFallback && (
        <span className={`self-start ${pill} border-[#E9A23B]/30 bg-[#E9A23B]/08 text-[#E9A23B]/80 text-[10px]`}>
          Demo fallback data
        </span>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[12px] bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <div className="font-head text-[18px] font-bold text-[#F7F8FA]">{probPct}%</div>
          <div className={`${label} mt-0.5`}>Pre-point</div>
        </div>
        <div
          className={`rounded-[12px] border p-3 text-center ${
            actualOutcome === "WON"
              ? "border-[#22C55E]/30 bg-[#22C55E]/08"
              : "border-[#EF4444]/30 bg-[#EF4444]/08"
          }`}
        >
          <div
            className={`font-head text-[14px] font-bold ${actualOutcome === "WON" ? "text-[#22C55E]" : "text-[#EF4444]"}`}
          >
            {actualOutcome}
          </div>
          <div className={`${label} mt-0.5`}>Outcome</div>
        </div>
        <div
          className={`rounded-[12px] border p-3 text-center ${
            probabilitySwing >= 0
              ? "border-[#22C55E]/30 bg-[#22C55E]/08"
              : "border-[#EF4444]/30 bg-[#EF4444]/08"
          }`}
        >
          <div
            className={`font-head text-[18px] font-bold ${probabilitySwing >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}
          >
            {probabilitySwing >= 0 ? "+" : "-"}
            {swingPct}pp
          </div>
          <div className={`${label} mt-0.5`}>Swing</div>
        </div>
      </div>

      <div className="rounded-[12px] bg-white/[0.02] border border-white/[0.06] p-3">
        <div className={`${label} mb-2`}>Explanation</div>
        <p className="text-[12px] text-[#C9CFDA]/80 leading-relaxed">{explanation}</p>
      </div>

      <div className="rounded-[12px] bg-white/[0.02] border border-[#D4FF3A]/10 p-3">
        <div className={`${label} mb-2`}>Next-point adjustment</div>
        <p className="text-[12px] text-[#C9CFDA]/70 leading-relaxed">{nextPointAdjustment}</p>
      </div>
    </div>
  );
}

/* InsightDisplay */
function InsightDisplay({
  mode,
  insights,
}: {
  mode: OutputMode;
  insights: {
    fan: string;
    coach: string;
    media: string;
    apiPayload: object;
  } | null;
}) {
  if (!insights) {
    return (
      <div className="rounded-[12px] border border-dashed border-white/[0.08] p-4 text-center">
        <p className="text-[12px] text-[#C9CFDA]/40">
          Complete the workflow to generate insights
        </p>
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

  const text =
    mode === "fan"
      ? insights.fan
      : mode === "coach"
      ? insights.coach
      : insights.media;

  const modeLabel =
    mode === "fan"
      ? "Fan Insight"
      : mode === "coach"
      ? "Coach Insight"
      : "Media Insight";

  return (
    <div className="rounded-[12px] bg-white/[0.02] border border-white/[0.06] p-3">
      <div className={`${label} mb-2`}>{modeLabel}</div>
      <p className="text-[12px] text-[#C9CFDA]/80 leading-relaxed">{text}</p>
    </div>
  );
}

/* IntegrationBrief */
function IntegrationBrief({
  insights,
  scenario,
  prediction,
  postPoint,
  onCopy,
  copied,
}: {
  insights: ReturnType<typeof useInfosysDemoState>["insights"];
  scenario: ReturnType<typeof useInfosysDemoState>["selectedScenario"];
  prediction: ReturnType<typeof useInfosysDemoState>["prediction"];
  postPoint: ReturnType<typeof useInfosysDemoState>["postPointExplanation"];
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  if (!insights || !scenario || !prediction) return null;

  const prob = Math.round(prediction.probability * 100);

  const briefText = [
    "═══════════════════════════════════",
    "ATP TACTICAL INTELLIGENCE BRIEF",
    "TennisAI Pro · Pre-point safe · Calibrated model",
    "═══════════════════════════════════",
    "",
    "MATCH CONTEXT",
    `${scenario.player1} vs ${scenario.player2}`,
    `${scenario.surface} · ${scenario.round} · ${scenario.score}`,
    `Score: ${scenario.pointScore} · ${pressureLabel(scenario.pressureState)}`,
    "",
    "PRE-POINT PREDICTION",
    `Calibrated probability: ${prob}%`,
    `Tactical call: ${prediction.tacticalCall}`,
    `Confidence: ${prediction.tacticalConfidence} · Risk: ${prediction.riskLevel}`,
    "",
    "TACTICAL RATIONALE",
    prediction.tacticalExplanation || prediction.tacticalV3?.tacticalRationaleV3 || "—",
    "",
    "POST-POINT EXPLANATION",
    postPoint
      ? `Outcome: ${postPoint.actualOutcome} · Swing: ${Math.round(postPoint.probabilitySwing * 100)}pp\n${postPoint.explanation}`
      : "—",
    "",
    "─── FAN ───",
    insights.fan,
    "",
    "─── COACH ───",
    insights.coach,
    "",
    "─── MEDIA ───",
    insights.media,
    "",
    "─── ALLY/API PAYLOAD ───",
    JSON.stringify(insights.apiPayload, null, 2),
    "",
    "─── POTENTIAL INFOSYS INTEGRATIONS ───",
    "· Second Screen: pre-point probability overlay + tactical recommendation",
    "· Ally chatbot: 'Why did Sinner go T?' → natural language explanation",
    "· Player Portal: tactical pattern success rate + post-match trend",
    "· Stats Centre: win probability timeline + pattern distribution",
    "",
    "Generated by TennisAI Pro · tennisai-pro-green.vercel.app",
  ].join("\n");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={label}>Integration brief</div>
        <button
          onClick={() => onCopy(briefText)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border transition-all
            ${copied
              ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]"
              : "border-white/[0.10] bg-white/[0.03] text-[#C9CFDA]/70 hover:border-[#D4FF3A]/30 hover:text-[#F7F8FA]"
            }`}
        >
          {copied ? <CheckIcon size={12} /> : <DownloadIcon size={12} />}
          {copied ? "Copied!" : "Copy brief"}
        </button>
      </div>

      {/* Integrations grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            name: "Second Screen",
            desc: "Pre-point overlay + tactical context",
            icon: "📺",
          },
          {
            name: "Ally Chatbot",
            desc: "Natural language tactical Q&A",
            icon: "💬",
          },
          {
            name: "Player Portal",
            desc: "Pattern success rates + trends",
            icon: "👤",
          },
          {
            name: "Stats Centre",
            desc: "Win probability timeline",
            icon: "📊",
          },
        ].map((intg) => (
          <div
            key={intg.name}
            className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px]">{intg.icon}</span>
              <span className="text-[11px] font-semibold text-[#F7F8FA]">
                {intg.name}
              </span>
            </div>
            <p className="text-[10px] text-[#C9CFDA]/50 leading-snug">{intg.desc}</p>
          </div>
        ))}
      </div>

      {/* Preview */}
      <CollapsiblePanel title="Full brief text (copy-ready)">
        <pre className="text-[10px] text-[#C9CFDA]/60 leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-auto">
          {briefText.substring(0, 800)}
          {briefText.length > 800 ? "\n…(truncated)" : ""}
        </pre>
      </CollapsiblePanel>
    </div>
  );
}

// ─── PAGINA PRINCIPALE ───────────────────────────────────────────────────────

export const InfosysDemoPage: React.FC = () => {
  const state = useInfosysDemoState();
  const {
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
    briefCopied,
    selectScenario,
    calculatePrediction,
    selectPattern,
    registerOutcome,
    generateExplanation,
    generateBrief,
    copyBrief,
    setOutputMode,
    resetDemo,
  } = state;

  const stepIndex = STEP_INDEX[currentStep];

  // CTA primaria per step
  const renderPrimaryCTA = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-[12px] bg-white/[0.04] border border-white/[0.08] text-[#C9CFDA]/60 text-[13px] font-semibold">
          <span className="w-4 h-4 border-2 border-[#D4FF3A]/30 border-t-[#D4FF3A] rounded-full animate-spin" />
          Calculating…
        </div>
      );
    }
    if (currentStep === "scenario" && selectedScenario) {
      return (
        <button
          onClick={() => {
            setCurrentStep("predict");
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] bg-[#D4FF3A] text-[#0B1220] text-[13px] font-bold hover:bg-[#C4EF2A] hover:scale-[1.01] transition-all shadow-[0_4px_16px_rgba(212,255,58,0.25)]"
        >
          <ArrowRightIcon size={15} />
          Calculate next-point probability
        </button>
      );
    }
    if (currentStep === "predict") {
      return (
        <button
          onClick={calculatePrediction}
          disabled={!selectedScenario}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] bg-[#D4FF3A] text-[#0B1220] text-[13px] font-bold hover:bg-[#C4EF2A] hover:scale-[1.01] transition-all shadow-[0_4px_16px_rgba(212,255,58,0.25)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <AIIcon size={15} />
          Calculate next-point probability
        </button>
      );
    }
    if (currentStep === "explain" && !postPointExplanation) {
      return (
        <button
          onClick={generateExplanation}
          disabled={!registeredOutcome}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] bg-[#D4FF3A] text-[#0B1220] text-[13px] font-bold hover:bg-[#C4EF2A] hover:scale-[1.01] transition-all shadow-[0_4px_16px_rgba(212,255,58,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChartIcon size={15} />
          Generate post-point explanation
        </button>
      );
    }
    if (currentStep === "export" && !insights) {
      return (
        <button
          onClick={generateBrief}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] bg-[#D4FF3A] text-[#0B1220] text-[13px] font-bold hover:bg-[#C4EF2A] hover:scale-[1.01] transition-all shadow-[0_4px_16px_rgba(212,255,58,0.25)]"
        >
          <ShareIcon size={15} />
          Create integration brief
        </button>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: title + badges */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[#D4FF3A]/70 font-head">
                Infosys · ATP Tour
              </span>
              <BackendStatusBadge status={backendStatus} />
            </div>
            <h2 className="font-head text-[20px] sm:text-[24px] font-bold text-[#F7F8FA] leading-tight tracking-tight">
              ATP Tactical Intelligence Demo
            </h2>
            <p className="text-[12px] text-[#C9CFDA]/60 max-w-lg leading-relaxed">
              Pre-point probability, tactical simulation and post-point explainability
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                "Pre-point safe",
                "Calibrated model",
                "API-first",
                "Explainable AI",
              ].map((b) => (
                <span
                  key={b}
                  className={`${pill} border-white/[0.10] bg-white/[0.03] text-[#C9CFDA]/60 text-[10px]`}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
          {/* Right: reset */}
          <button
            onClick={resetDemo}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-white/[0.08] bg-white/[0.02] text-[11px] text-[#C9CFDA]/60 hover:border-white/[0.15] hover:text-[#F7F8FA] transition-all"
          >
            <RefreshIcon size={12} />
            Reset Demo
          </button>
        </div>

        {/* Workflow stepper */}
        <div className="pt-1">
          <WorkflowStepper
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>
      </div>

      {/* ── MAIN LAYOUT ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[300px_1fr_300px] gap-4">

        {/* ── LEFT RAIL ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Scenario selector */}
          <div className={card}>
            <div className={label}>Scenario</div>
            <div className="flex flex-col gap-2">
              {DEMO_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectScenario(s)}
                  className={`w-full text-left rounded-[12px] border p-3 transition-all
                    ${selectedScenario?.id === s.id
                      ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/[0.05]"
                      : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]"
                    }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className={`text-[12px] font-semibold ${selectedScenario?.id === s.id ? "text-[#F7F8FA]" : "text-[#C9CFDA]/80"}`}>
                      {s.label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                      s.pressureState.includes("AGAINST")
                        ? "border-[#EF4444]/30 text-[#EF4444]/70"
                        : s.pressureState.includes("FOR")
                        ? "border-[#22C55E]/30 text-[#22C55E]/70"
                        : "border-white/10 text-[#C9CFDA]/40"
                    }`}>
                      {s.surface}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#C9CFDA]/50 mt-1 leading-snug">
                    {s.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Match context (visible when scenario selected) */}
          {selectedScenario && (
            <div className={cardSm}>
              <div className={label}>Match context</div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-semibold text-[#F7F8FA]">
                    {selectedScenario.player1}
                  </span>
                  <span className="font-head text-[13px] font-bold text-[#D4FF3A]">
                    {selectedScenario.score.split(",")[0]?.trim()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] text-[#C9CFDA]/70">
                    vs {selectedScenario.player2}
                  </span>
                  <span className="font-head text-[12px] font-bold text-[#C9CFDA]/60">
                    {selectedScenario.score.split(",").slice(1).join(",").trim()}
                  </span>
                </div>
                <div className="mt-1 pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                  <span className={`${pill} border-white/[0.08] bg-white/[0.03] text-[#C9CFDA]/60 text-[10px]`}>
                    {selectedScenario.surface}
                  </span>
                  <span className={`${pill} border-white/[0.08] bg-white/[0.03] text-[#C9CFDA]/60 text-[10px]`}>
                    {selectedScenario.round}
                  </span>
                  <span
                    className={`${pill} text-[10px] ${
                      selectedScenario.pressureState.includes("AGAINST")
                        ? "border-[#EF4444]/30 bg-[#EF4444]/08 text-[#EF4444]/80"
                        : selectedScenario.pressureState.includes("FOR")
                        ? "border-[#22C55E]/30 bg-[#22C55E]/08 text-[#22C55E]/80"
                        : "border-white/[0.08] bg-white/[0.03] text-[#C9CFDA]/60"
                    }`}
                  >
                    {selectedScenario.pointScore}
                  </span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { l: "1st srv", v: Math.round(selectedScenario.firstSvcPct * 100) + "%" },
                  { l: "2nd srv", v: Math.round(selectedScenario.secondSvcPct * 100) + "%" },
                  { l: "Svc pts", v: Math.round(selectedScenario.svcPct * 100) + "%" },
                  { l: "Rtn pts", v: Math.round(selectedScenario.rtnPct * 100) + "%" },
                ].map((s) => (
                  <div key={s.l} className="rounded-[8px] bg-white/[0.03] p-2 text-center">
                    <div className="font-head text-[13px] font-bold text-[#F7F8FA]">{s.v}</div>
                    <div className={`${label} mt-0.5`}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER STAGE ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Empty state */}
          {!selectedScenario && currentStep === "scenario" && (
            <div className={`${card} items-center justify-center min-h-[300px]`}>
              <TacticsIcon size={32} className="text-[#C9CFDA]/20" />
              <div className="text-center">
                <p className="font-head text-[15px] font-semibold text-[#C9CFDA]/50">
                  Select a scenario to begin
                </p>
                <p className="text-[12px] text-[#C9CFDA]/30 mt-1">
                  Choose one of the match situations from the left panel
                </p>
              </div>
            </div>
          )}

          {/* Prediction step */}
          {currentStep === "predict" && selectedScenario && !prediction && (
            <div className={card}>
              <div className={label}>Step 2 — Calculate probability</div>
              <div className="flex flex-col items-center gap-4 py-6">
                <AIIcon size={40} className="text-[#D4FF3A]/40" />
                <div className="text-center">
                  <p className="font-head text-[16px] font-semibold text-[#F7F8FA]">
                    Ready to predict
                  </p>
                  <p className="text-[12px] text-[#C9CFDA]/50 mt-1 max-w-xs">
                    Model will compute calibrated next-point win probability using
                    match state, stats and pressure context
                  </p>
                </div>
              </div>
              <div className="mt-auto">{renderPrimaryCTA()}</div>
            </div>
          )}

          {/* Probability hero — visible from simulate onwards */}
          {prediction && stepIndex >= STEP_INDEX["simulate"] && (
            <div className={card}>
              <ProbabilityHero
                probability={prediction.probability}
                confidence={prediction.tacticalConfidence}
                pressureState={prediction.pressureState}
                momentumState={prediction.momentumState}
                isDemoFallback={prediction.isDemoFallback}
              />
            </div>
          )}

          {/* Tactical recommendation — simulate step */}
          {prediction && stepIndex >= STEP_INDEX["simulate"] && (
            <div className={card}>
              <TacticalRecommendationCard
                patternName={prediction.patternName}
                uplift={14}
                riskLevel={prediction.riskLevel}
                confidence={prediction.tacticalConfidence}
                explanation={prediction.tacticalExplanation || prediction.tacticalV3?.tacticalRationaleV3 || "Tactical explanation not available."}
                strategicPriority={prediction.tacticalV3?.strategicPriority}
              />
            </div>
          )}

          {/* Pattern alternatives — simulate step */}
          {prediction && (currentStep === "simulate" || stepIndex > STEP_INDEX["simulate"]) && (
            <div className={card}>
              <PatternAlternativesCard
                patterns={patterns}
                selectedPatternId={selectedPattern?.id || null}
                onSelect={(p) => {
                  selectPattern(p);
                }}
              />
            </div>
          )}

          {/* Register outcome — register step */}
          {(currentStep === "register" || stepIndex > STEP_INDEX["register"]) && !registeredOutcome && (
            <div className={card}>
              <RegisterOutcomePanel onRegister={registerOutcome} />
            </div>
          )}

          {/* Outcome registered confirmation */}
          {registeredOutcome && stepIndex >= STEP_INDEX["explain"] && (
            <div className="rounded-[16px] border border-[#22C55E]/20 bg-[#22C55E]/[0.04] p-4 flex items-center gap-3">
              <CheckIcon size={20} className="text-[#22C55E] shrink-0" />
              <div>
                <div className="text-[12px] font-semibold text-[#22C55E]">
                  Outcome registered
                </div>
                <div className="text-[11px] text-[#C9CFDA]/60 mt-0.5">
                  {registeredOutcome.actualPattern} · {registeredOutcome.winner === "player" ? "WON" : "LOST"} ·{" "}
                  {registeredOutcome.rallyLength} rally · {registeredOutcome.finishType.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          )}

          {/* Explain step CTA */}
          {currentStep === "explain" && !postPointExplanation && (
            <div className={card}>
              <div className={label}>Step 5 — Post-point explanation</div>
              <p className="text-[12px] text-[#C9CFDA]/60">
                The model will compare pre-point prediction vs actual outcome and
                compute the probability swing.
              </p>
              {renderPrimaryCTA()}
            </div>
          )}

          {/* Post-point explanation */}
          {postPointExplanation && stepIndex >= STEP_INDEX["explain"] && (
            <div className={card}>
              <div className={label}>Post-point explanation</div>
              <PostPointExplanationPanel {...postPointExplanation} />
            </div>
          )}

          {/* Export step CTA */}
          {currentStep === "export" && !insights && (
            <div className={card}>
              <div className={label}>Step 6 — Integration brief</div>
              <p className="text-[12px] text-[#C9CFDA]/60">
                Generate the complete Ally-ready payload with Fan, Coach, Media and
                API insights — ready to copy or integrate.
              </p>
              {renderPrimaryCTA()}
            </div>
          )}

          {/* Integration brief */}
          {insights && (
            <div className={card}>
              <IntegrationBrief
                insights={insights}
                scenario={selectedScenario}
                prediction={prediction}
                postPoint={postPointExplanation}
                onCopy={copyBrief}
                copied={briefCopied}
              />
            </div>
          )}

          {/* Step CTA for scenario/simulate/register when not yet in that sub-form */}
          {(currentStep === "scenario" && selectedScenario) && (
            <div className={card}>
              {renderPrimaryCTA()}
            </div>
          )}
        </div>

        {/* ── RIGHT RAIL ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Output mode switch */}
          <div className={cardSm}>
            <div className={label}>Output mode</div>
            <OutputModeSwitch mode={outputMode} onChange={setOutputMode} />
            <InsightDisplay mode={outputMode} insights={insights} />
          </div>

          {/* API payload preview */}
          {prediction && (
            <CollapsiblePanel title="Ally/API payload preview">
              <pre className="text-[10px] text-[#D4FF3A]/70 leading-relaxed font-mono overflow-auto max-h-48">
                {JSON.stringify(
                  {
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
                  },
                  null,
                  2
                )}
              </pre>
            </CollapsiblePanel>
          )}

          {/* Model metadata */}
          {prediction && (
            <CollapsiblePanel title="Model metadata">
              <div className="flex flex-col gap-2">
                {[
                  { k: "Model", v: "XGBoost calibrated v3" },
                  { k: "Training data", v: "ATP matches 2017–2024" },
                  {
                    k: "Calibration",
                    v: "Platt scaling · isotonic regression",
                  },
                  { k: "Pre-point safe", v: "✓ No post-point leakage" },
                  { k: "Features", v: "Stats · momentum · flags · tags" },
                ].map((m) => (
                  <div key={m.k} className="flex justify-between items-start gap-2">
                    <span className="text-[10px] text-[#C9CFDA]/40">{m.k}</span>
                    <span className="text-[10px] text-[#C9CFDA]/70 text-right">{m.v}</span>
                  </div>
                ))}
              </div>
            </CollapsiblePanel>
          )}

          {/* Feature completeness */}
          <div className={cardSm}>
            <div className={label}>Feature completeness</div>
            <div className="flex flex-col gap-2">
              {[
                { f: "Pre-point probability", done: true },
                { f: "Tactical recommendation", done: true },
                { f: "Pattern alternatives", done: true },
                { f: "Expected uplift", done: true },
                { f: "Post-point explanation", done: stepIndex >= STEP_INDEX["explain"] },
                { f: "Insight feed (4 modes)", done: !!insights },
                { f: "Integration brief", done: !!insights },
                { f: "Ally/API payload", done: !!insights },
              ].map((item) => (
                <div key={item.f} className="flex items-center gap-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                      item.done
                        ? "bg-[#22C55E]/20 text-[#22C55E]"
                        : "bg-white/[0.04] text-[#C9CFDA]/20"
                    }`}
                  >
                    {item.done ? <CheckIcon size={9} /> : null}
                  </span>
                  <span
                    className={`text-[11px] ${
                      item.done ? "text-[#C9CFDA]/70" : "text-[#C9CFDA]/30"
                    }`}
                  >
                    {item.f}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InfosysDemoPage;
