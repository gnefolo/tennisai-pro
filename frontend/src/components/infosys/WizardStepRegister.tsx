// src/components/infosys/WizardStepRegister.tsx
// Wizard Step 3: Register the actual point outcome
// Clean, centered card layout with large touch-friendly toggles

import React, { useState } from "react";
import type { RegisteredOutcome } from "../../hooks/useInfosysDemoState";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WizardStepRegisterProps {
  onRegister: (outcome: RegisteredOutcome) => void;
  defaultPattern?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const WizardStepRegister: React.FC<WizardStepRegisterProps> = ({
  onRegister,
  defaultPattern = "Flat T-Serve + Inside-Out FH",
}) => {
  const [winner, setWinner] = useState<"player" | "opponent">("player");
  const [rallyLength, setRallyLength] = useState<"SHORT" | "MEDIUM" | "LONG">("SHORT");
  const [finishType, setFinishType] = useState<"WINNER" | "FORCED_ERROR" | "UNFORCED_ERROR">("WINNER");
  const [serveDir, setServeDir] = useState<"T" | "BODY" | "WIDE">("T");
  const [pattern, setPattern] = useState(defaultPattern);

  const handleSubmit = () => {
    onRegister({
      actualPattern: pattern,
      winner,
      rallyLength,
      finishType,
      serveDirection: serveDir,
    });
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Intro */}
      <div className="text-center">
        <p className="text-[13px] text-[#C9CFDA]/70 leading-relaxed max-w-md mx-auto">
          The point has been played. Tag how it actually went — the model will
          compare prediction vs reality and compute the probability swing.
        </p>
      </div>

      {/* ── Pattern played ──────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60 font-semibold">Pattern executed</span>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[12px] px-4 py-2.5 text-[13px] text-[#F7F8FA] placeholder-[#C9CFDA]/30 focus:outline-none focus:border-[#D4FF3A]/40 transition-colors"
        />
      </div>

      {/* ── Winner — large toggle ────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60 font-semibold">Point won by</span>
        <div className="grid grid-cols-2 gap-3">
          {(["player", "opponent"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWinner(w)}
              className={`py-3.5 rounded-[14px] text-[13px] font-bold border-2 transition-all
                ${winner === w
                  ? w === "player"
                    ? "border-[#22C55E] bg-[#22C55E]/12 text-[#22C55E] shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                    : "border-[#EF4444] bg-[#EF4444]/12 text-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                  : "border-white/[0.07] bg-white/[0.02] text-[#C9CFDA]/50 hover:border-white/[0.15]"
                }`}
            >
              {w === "player" ? "✓ Player won" : "✗ Opponent won"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Rally length ─────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60 font-semibold">Rally length</span>
        <div className="grid grid-cols-3 gap-2">
          {(["SHORT", "MEDIUM", "LONG"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRallyLength(r)}
              className={`py-2.5 rounded-[12px] text-[12px] font-semibold border transition-all
                ${rallyLength === r
                  ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/08 text-[#D4FF3A]"
                  : "border-white/[0.07] bg-white/[0.02] text-[#C9CFDA]/50 hover:border-white/[0.12]"
                }`}
            >
              {r === "SHORT" ? "1-3 shots" : r === "MEDIUM" ? "4-8 shots" : "9+ shots"}
              <span className="block text-[9px] mt-0.5 opacity-60">{r.charAt(0) + r.slice(1).toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Finish type ──────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60 font-semibold">Finish type</span>
        <div className="grid grid-cols-3 gap-2">
          {(["WINNER", "FORCED_ERROR", "UNFORCED_ERROR"] as const).map((f) => {
            const labels: Record<string, { emoji: string; text: string }> = {
              WINNER: { emoji: "🎯", text: "Winner" },
              FORCED_ERROR: { emoji: "💪", text: "Forced Error" },
              UNFORCED_ERROR: { emoji: "😬", text: "Unforced Error" },
            };
            const { emoji, text } = labels[f];
            return (
              <button
                key={f}
                onClick={() => setFinishType(f)}
                className={`py-2.5 rounded-[12px] text-[11px] font-semibold border transition-all
                  ${finishType === f
                    ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/08 text-[#D4FF3A]"
                    : "border-white/[0.07] bg-white/[0.02] text-[#C9CFDA]/50 hover:border-white/[0.12]"
                  }`}
              >
                <span className="text-[14px]">{emoji}</span>
                <span className="block mt-0.5">{text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Serve direction ──────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#C9CFDA]/60 font-semibold">Serve direction</span>
        <div className="grid grid-cols-3 gap-2">
          {(["T", "BODY", "WIDE"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setServeDir(d)}
              className={`py-2.5 rounded-[12px] text-[12px] font-semibold border transition-all
                ${serveDir === d
                  ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/08 text-[#D4FF3A]"
                  : "border-white/[0.07] bg-white/[0.02] text-[#C9CFDA]/50 hover:border-white/[0.12]"
                }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Submit CTA ───────────────────────────────── */}
      <button
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] bg-[#D4FF3A] text-[#0B1220] text-[14px] font-bold hover:bg-[#C4EF2A] hover:scale-[1.005] transition-all shadow-[0_4px_20px_rgba(212,255,58,0.25)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Register point outcome
      </button>
    </div>
  );
};

export default WizardStepRegister;
