// src/components/infosys/WizardStepExplain.tsx
// Wizard Step 4: Post-point explanation + Integration brief generation
// Shows explanation results, output mode switch, and export controls

import React from "react";
import type {
  PostPointExplanation,
  OutputMode,
  InsightSet,
  PredictionResult,
  DemoScenario,
} from "../../hooks/useInfosysDemoState";
import {
  CheckIcon,
  DownloadIcon,
  ChartIcon,
  ShareIcon,
} from "../ui/icons";

// ─── Helpers ────────────────────────────────────────────────────────────────

const pill =
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border";

const label =
  "text-[10px] uppercase tracking-[0.22em] text-[#C9CFDA]/50 font-semibold font-head";

function pressureLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Post-Point Explanation Panel ───────────────────────────────────────────

function PostPointPanel({
  data,
}: {
  data: PostPointExplanation;
}) {
  const probPct = Math.round(data.probabilityBefore * 100);
  const swingPct = Math.round(Math.abs(data.probabilitySwing) * 100);

  return (
    <div className="flex flex-col gap-3">
      {data.isDemoFallback && (
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
            data.actualOutcome === "WON"
              ? "border-[#22C55E]/30 bg-[#22C55E]/08"
              : "border-[#EF4444]/30 bg-[#EF4444]/08"
          }`}
        >
          <div
            className={`font-head text-[14px] font-bold ${data.actualOutcome === "WON" ? "text-[#22C55E]" : "text-[#EF4444]"}`}
          >
            {data.actualOutcome}
          </div>
          <div className={`${label} mt-0.5`}>Outcome</div>
        </div>
        <div
          className={`rounded-[12px] border p-3 text-center ${
            data.probabilitySwing >= 0
              ? "border-[#22C55E]/30 bg-[#22C55E]/08"
              : "border-[#EF4444]/30 bg-[#EF4444]/08"
          }`}
        >
          <div
            className={`font-head text-[18px] font-bold ${data.probabilitySwing >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}
          >
            {data.probabilitySwing >= 0 ? "+" : "-"}{swingPct}pp
          </div>
          <div className={`${label} mt-0.5`}>Swing</div>
        </div>
      </div>

      <div className="rounded-[12px] bg-white/[0.02] border border-white/[0.06] p-3">
        <div className={`${label} mb-2`}>Explanation</div>
        <p className="text-[12px] text-[#C9CFDA]/80 leading-relaxed">{data.explanation}</p>
      </div>

      <div className="rounded-[12px] bg-white/[0.02] border border-[#D4FF3A]/10 p-3">
        <div className={`${label} mb-2`}>Next-point adjustment</div>
        <p className="text-[12px] text-[#C9CFDA]/70 leading-relaxed">{data.nextPointAdjustment}</p>
      </div>
    </div>
  );
}

// ─── Output Mode Switch ─────────────────────────────────────────────────────

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

// ─── Insight Display ────────────────────────────────────────────────────────

function InsightDisplay({ mode, insights }: { mode: OutputMode; insights: InsightSet }) {
  if (mode === "api") {
    return (
      <pre className="text-[11px] text-[#D4FF3A]/80 bg-black/30 rounded-[12px] p-3 overflow-auto max-h-48 leading-relaxed font-mono">
        {JSON.stringify(insights.apiPayload, null, 2)}
      </pre>
    );
  }

  const text =
    mode === "fan" ? insights.fan : mode === "coach" ? insights.coach : insights.media;
  const modeLabel =
    mode === "fan" ? "Fan Insight" : mode === "coach" ? "Coach Insight" : "Media Insight";

  return (
    <div className="rounded-[12px] bg-white/[0.02] border border-white/[0.06] p-3">
      <div className={`${label} mb-2`}>{modeLabel}</div>
      <p className="text-[12px] text-[#C9CFDA]/80 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Integration Brief Preview ──────────────────────────────────────────────

function IntegrationGrid() {
  const integrations = [
    { name: "Second Screen", desc: "Pre-point overlay + tactical context", icon: "📺" },
    { name: "Ally Chatbot", desc: "Natural language tactical Q&A", icon: "💬" },
    { name: "Player Portal", desc: "Pattern success rates + trends", icon: "👤" },
    { name: "Stats Centre", desc: "Win probability timeline", icon: "📊" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {integrations.map((intg) => (
        <div key={intg.name} className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">{intg.icon}</span>
            <span className="text-[11px] font-semibold text-[#F7F8FA]">{intg.name}</span>
          </div>
          <p className="text-[10px] text-[#C9CFDA]/50 leading-snug">{intg.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface WizardStepExplainProps {
  // Post-point data
  postPointExplanation: PostPointExplanation | null;
  loadingExplanation: boolean;
  onGenerateExplanation: () => void;
  // Brief data
  insights: InsightSet | null;
  onGenerateBrief: () => void;
  // Output mode
  outputMode: OutputMode;
  onSetOutputMode: (m: OutputMode) => void;
  // Copy
  onCopyBrief: (text: string) => void;
  briefCopied: boolean;
  // For brief text generation
  scenario: DemoScenario | null;
  prediction: PredictionResult | null;
}

export const WizardStepExplain: React.FC<WizardStepExplainProps> = ({
  postPointExplanation,
  loadingExplanation,
  onGenerateExplanation,
  insights,
  onGenerateBrief,
  outputMode,
  onSetOutputMode,
  onCopyBrief,
  briefCopied,
  scenario,
  prediction,
}) => {

  // Build the full brief text for copy
  const buildBriefText = () => {
    if (!insights || !scenario || !prediction) return "";
    const prob = Math.round(prediction.probability * 100);
    return [
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
      postPointExplanation
        ? `Outcome: ${postPointExplanation.actualOutcome} · Swing: ${Math.round(postPointExplanation.probabilitySwing * 100)}pp\n${postPointExplanation.explanation}`
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
      "Generated by TennisAI Pro · tennisai-pro-green.vercel.app",
    ].join("\n");
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Phase 1: Post-point explanation ────────── */}
      {!postPointExplanation && !loadingExplanation && (
        <div className="flex flex-col items-center gap-4 py-4">
          <ChartIcon size={36} className="text-[#D4FF3A]/40" />
          <div className="text-center">
            <p className="font-head text-[15px] font-semibold text-[#F7F8FA]">
              Generate post-point analysis
            </p>
            <p className="text-[12px] text-[#C9CFDA]/50 mt-1 max-w-sm mx-auto">
              The model will compare the pre-point prediction vs actual outcome
              and compute the probability swing
            </p>
          </div>
          <button
            onClick={onGenerateExplanation}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#D4FF3A] text-[#0B1220] text-[13px] font-bold hover:bg-[#C4EF2A] transition-all shadow-[0_4px_16px_rgba(212,255,58,0.25)]"
          >
            <ChartIcon size={15} />
            Generate explanation
          </button>
        </div>
      )}

      {loadingExplanation && (
        <div className="flex items-center justify-center gap-3 py-10">
          <span className="w-5 h-5 border-2 border-[#D4FF3A]/30 border-t-[#D4FF3A] rounded-full animate-spin" />
          <span className="text-[13px] text-[#C9CFDA]/60">Computing post-point analysis…</span>
        </div>
      )}

      {postPointExplanation && (
        <PostPointPanel data={postPointExplanation} />
      )}

      {/* ── Phase 2: Integration brief ────────────── */}
      {postPointExplanation && !insights && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="h-px bg-white/[0.06]" />
          <div className="flex flex-col items-center gap-3 py-3">
            <p className="text-[12px] text-[#C9CFDA]/60 text-center">
              Ready to generate the full Ally-ready payload with Fan, Coach, Media and API insights
            </p>
            <button
              onClick={onGenerateBrief}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#D4FF3A] text-[#0B1220] text-[13px] font-bold hover:bg-[#C4EF2A] transition-all shadow-[0_4px_16px_rgba(212,255,58,0.25)]"
            >
              <ShareIcon size={15} />
              Create integration brief
            </button>
          </div>
        </div>
      )}

      {insights && (
        <>
          <div className="h-px bg-white/[0.06]" />

          {/* Output mode + insight display */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className={label}>Output mode</span>
              <button
                onClick={() => onCopyBrief(buildBriefText())}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border transition-all
                  ${briefCopied
                    ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]"
                    : "border-white/[0.10] bg-white/[0.03] text-[#C9CFDA]/70 hover:border-[#D4FF3A]/30 hover:text-[#F7F8FA]"
                  }`}
              >
                {briefCopied ? <CheckIcon size={12} /> : <DownloadIcon size={12} />}
                {briefCopied ? "Copied!" : "Copy full brief"}
              </button>
            </div>
            <OutputModeSwitch mode={outputMode} onChange={onSetOutputMode} />
            <InsightDisplay mode={outputMode} insights={insights} />
          </div>

          {/* Integration targets grid */}
          <div className="flex flex-col gap-2">
            <span className={label}>Potential integrations</span>
            <IntegrationGrid />
          </div>
        </>
      )}
    </div>
  );
};

export default WizardStepExplain;
