// src/components/infosys/WizardStepPredict.tsx
// Wizard Step 2: Prediction results + tactical simulation + pattern selection
// Shows after backend call: probability hero → tactical card → pattern alternatives

import React from "react";
import type {
  PredictionResult,
  PatternAlternative,
} from "../../hooks/useInfosysDemoState";
import { AIIcon } from "../ui/icons";

// ─── Helpers ────────────────────────────────────────────────────────────────

const pill =
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border";

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

const label =
  "text-[10px] uppercase tracking-[0.22em] text-[#C9CFDA]/50 font-semibold font-head";

// ─── Loading state ──────────────────────────────────────────────────────────

function PredictionLoading() {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-[3px] border-[#D4FF3A]/10 border-t-[#D4FF3A] animate-spin" />
        <AIIcon size={28} className="absolute inset-0 m-auto text-[#D4FF3A]/60" />
      </div>
      <div className="text-center">
        <p className="font-head text-[15px] font-semibold text-[#F7F8FA]">
          Calculating probability…
        </p>
        <p className="text-[12px] text-[#C9CFDA]/50 mt-1">
          Calibrated model processing match state & tactical context
        </p>
      </div>
      {/* Animated feature labels */}
      <div className="flex flex-wrap justify-center gap-2">
        {["Stats", "Momentum", "Pressure", "Pattern history", "Calibration"].map((f, i) => (
          <span
            key={f}
            className="text-[10px] px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-[#C9CFDA]/40"
            style={{ animation: `wizard-pulse 2s ease-in-out ${i * 0.3}s infinite` }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Probability Hero ───────────────────────────────────────────────────────

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
      <div className="relative flex flex-col items-center">
        <span className="font-head text-[64px] leading-none font-bold text-[#F7F8FA] tracking-tight">
          {pct}
          <span className="text-[28px] text-[#C9CFDA]/50">%</span>
        </span>
        <span className="text-[11px] font-semibold text-[#D4FF3A]/80 tracking-wide -mt-1">
          Calibrated win probability
        </span>
      </div>
      <div
        className={`font-head text-[14px] font-semibold ${delta >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}
      >
        {delta >= 0 ? "+" : ""}{delta}pp vs baseline
      </div>
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

// ─── Tactical Card ──────────────────────────────────────────────────────────

function TacticalCard({ prediction }: { prediction: PredictionResult }) {
  return (
    <div className="rounded-[16px] border border-[#D4FF3A]/20 bg-[#D4FF3A]/[0.04] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={label}>Recommended pattern</div>
          <div className="font-head text-[15px] font-bold text-[#F7F8FA] mt-1 leading-snug">
            {prediction.patternName}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`font-head text-[18px] font-bold ${upliftColor(14)}`}>
            +14%
          </span>
          <span className="text-[9px] text-[#C9CFDA]/40 uppercase tracking-wide">
            expected uplift
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className={`${pill} ${riskColor(prediction.riskLevel)}`}>
          {prediction.riskLevel} risk
        </span>
        <span className={`${pill} ${confidenceColor(prediction.tacticalConfidence)}`}>
          {prediction.tacticalConfidence} confidence
        </span>
        {prediction.tacticalV3?.strategicPriority && (
          <span
            className={`${pill} ${
              prediction.tacticalV3.strategicPriority === "EXPLOIT"
                ? "border-[#22C55E]/30 bg-[#22C55E]/08 text-[#22C55E]/80"
                : prediction.tacticalV3.strategicPriority === "PROTECT"
                ? "border-[#E9A23B]/30 bg-[#E9A23B]/08 text-[#E9A23B]/80"
                : "border-[#3B82F6]/30 bg-[#3B82F6]/08 text-[#3B82F6]/80"
            }`}
          >
            {prediction.tacticalV3.strategicPriority}
          </span>
        )}
      </div>
      <p className="text-[12px] text-[#C9CFDA]/70 leading-relaxed">
        {prediction.tacticalExplanation || prediction.tacticalV3?.tacticalRationaleV3 || "Tactical explanation not available."}
      </p>
    </div>
  );
}

// ─── Pattern Alternatives ───────────────────────────────────────────────────

function PatternAlternatives({
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
      <div className="flex items-center gap-2">
        <span className={label}>Select tactical option</span>
        <span className="text-[10px] text-[#C9CFDA]/30">— choose to continue</span>
      </div>
      {patterns.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={`w-full text-left rounded-[12px] border p-3.5 transition-all
            ${selectedPatternId === p.id
              ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/[0.06] ring-1 ring-[#D4FF3A]/20"
              : i === 0
              ? "border-[#D4FF3A]/20 bg-white/[0.02] hover:border-[#D4FF3A]/30"
              : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.10]"
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[12px] font-semibold ${
                selectedPatternId === p.id ? "text-[#F7F8FA]" : "text-[#C9CFDA]/80"
              }`}
            >
              {i === 0 && <span className="text-[#D4FF3A] mr-1.5">★</span>}
              {p.name}
            </span>
            <span className={`font-head text-[13px] font-bold shrink-0 ${upliftColor(p.uplift)}`}>
              {p.uplift > 0 ? "+" : ""}{p.uplift}%
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
          <p className="text-[11px] text-[#C9CFDA]/50 mt-1.5 leading-snug">{p.description}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface WizardStepPredictProps {
  loading: boolean;
  prediction: PredictionResult | null;
  patterns: PatternAlternative[];
  selectedPatternId: string | null;
  onSelectPattern: (p: PatternAlternative) => void;
  demoSimulationMode?: boolean;
  setDemoSimulationMode?: (mode: boolean) => void;
  onRecalculate?: () => void;
}

export const WizardStepPredict: React.FC<WizardStepPredictProps> = ({
  loading,
  prediction,
  patterns,
  selectedPatternId,
  onSelectPattern,
  demoSimulationMode,
  setDemoSimulationMode,
  onRecalculate,
}) => {
  if (loading || !prediction) {
    return <PredictionLoading />;
  }

  if (prediction.predictionUnavailable) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-8 px-4 border border-[#E9A23B]/20 bg-[#E9A23B]/[0.02] rounded-2xl w-full">
        <div className="flex items-center justify-center w-14 h-14 rounded-full border border-[#E9A23B]/30 bg-[#E9A23B]/05 text-[#E9A23B] text-[24px] animate-pulse">
          ⚠️
        </div>
        <div>
          <h4 className="font-head text-[16px] font-bold text-[#F7F8FA]">
            AI Prediction Offline
          </h4>
          <p className="text-[12px] text-[#C9CFDA]/60 mt-1.5 max-w-[360px] leading-relaxed">
            Il backend non è raggiungibile. La calibrazione della probabilità di vittoria e i suggerimenti tattici basati su AI reale richiedono una connessione attiva.
          </p>
        </div>
        <div className="text-[11px] text-[#22C55E]/90 bg-[#22C55E]/05 border border-[#22C55E]/10 rounded-xl py-2 px-3 max-w-[380px] leading-relaxed">
          🟢 <strong>Scoring Engine Attivo</strong>: Puoi comunque procedere al tracciamento della partita. L'albero del punteggio ATP e le statistiche locali funzionano interamente offline.
        </div>
        <div className="flex flex-col items-center gap-2.5 mt-3 pt-3 border-t border-white/[0.04] w-full">
          <span className="text-[11px] text-[#C9CFDA]/50">Desideri attivare la simulazione demo?</span>
          <button
            onClick={() => {
              if (setDemoSimulationMode && onRecalculate) {
                setDemoSimulationMode(true);
                setTimeout(() => onRecalculate(), 50);
              }
            }}
            className="px-4 py-1.5 text-[11px] font-semibold rounded-lg border border-[#D4FF3A]/20 bg-[#D4FF3A]/05 text-[#D4FF3A] hover:bg-[#D4FF3A]/10 transition-all font-head tracking-wide uppercase"
          >
            Abilita Simulazione Demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Probability hero */}
      <ProbabilityHero
        probability={prediction.probability}
        confidence={prediction.tacticalConfidence}
        pressureState={prediction.pressureState}
        momentumState={prediction.momentumState}
        isDemoFallback={prediction.isDemoFallback}
      />

      {/* Tactical recommendation */}
      <TacticalCard prediction={prediction} />

      {/* Pattern alternatives — user must select to proceed */}
      <PatternAlternatives
        patterns={patterns}
        selectedPatternId={selectedPatternId}
        onSelect={onSelectPattern}
      />
    </div>
  );
};

export default WizardStepPredict;
