// src/components/infosys/QuickTagBar.tsx
// Sticky bottom bar for courtside live point tagging
// Designed for speed: 2-3 taps to register a point outcome
// Winner (1 tap) + Finish type (1 tap) + TAG (1 tap) = done

import React, { useState, useCallback } from "react";
import type { RegisteredOutcome, TaggedPoint } from "../../hooks/useInfosysDemoState";
import { CheckIcon } from "../ui/icons";

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuickTagBarProps {
  onTag: (outcome: RegisteredOutcome) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  loading: boolean;
  pointNumber: number;
  patternName?: string;
  lastSwing: TaggedPoint | null;
  isServing?: boolean;
  serverName?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const QuickTagBar: React.FC<QuickTagBarProps> = ({
  onTag,
  onUndo,
  canUndo = false,
  loading,
  pointNumber,
  patternName,
  lastSwing,
  isServing,
  serverName,
}) => {
  const [winner, setWinner] = useState<"player" | "opponent">("player");
  const [finishType, setFinishType] = useState<"WINNER" | "FORCED_ERROR" | "UNFORCED_ERROR">("WINNER");
  const [rallyLength, setRallyLength] = useState<"SHORT" | "MEDIUM" | "LONG">("SHORT");
  const [serveDir, setServeDir] = useState<"T" | "BODY" | "WIDE">("T");
  const [serveNum, setServeNum] = useState<1 | 2>(1);
  const [showServe, setShowServe] = useState(false);
  const [flashConfirm, setFlashConfirm] = useState(false);

  const handleTag = useCallback(() => {
    if (loading) return;

    // Flash confirmation
    setFlashConfirm(true);
    setTimeout(() => setFlashConfirm(false), 600);

    onTag({
      actualPattern: patternName || "Unclassified",
      winner,
      rallyLength,
      finishType,
      serveDirection: serveDir,
    });

    // Reset to defaults for next point
    setWinner("player");
    setFinishType("WINNER");
    setRallyLength("SHORT");
    setServeDir("T");
    setServeNum(1);
  }, [loading, onTag, patternName, winner, rallyLength, finishType, serveDir]);

  return (
    <>
      {/* ── Swing Toast ────────────────────────────────────────── */}
      {lastSwing && (
        <div className="fixed bottom-[140px] left-1/2 -translate-x-1/2 z-[90] swing-toast">
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-[14px] border shadow-lg ${
            lastSwing.won
              ? "bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]"
              : "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]"
          }`}
          style={{ backdropFilter: "blur(12px)" }}
          >
            <CheckIcon size={14} />
            <span className="text-[12px] font-semibold">Point #{lastSwing.pointNumber}</span>
            <span className="text-[12px] font-bold font-head">
              {lastSwing.won ? "+" : ""}{lastSwing.swing}pp
            </span>
            <span className="text-[11px] opacity-70">
              {lastSwing.won ? "WON" : "LOST"} · {lastSwing.outcome.finishType.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      )}

      {/* ── Quick Tag Bar — 2-row layout for tablet ────────────── */}
      <div className={`quick-tag-bar ${flashConfirm ? "tag-confirm-flash" : ""}`}>
        <div className="max-w-4xl mx-auto flex flex-col gap-2 pr-20 lg:pr-24">

          {/* ── Row 1: Outcome + Finish + Rally + [TAG + Undo] ── */}
          <div className="flex items-center gap-2">

            {/* Won / Lost */}
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => setWinner("player")}
                className={`px-3 py-2.5 rounded-[10px] text-[12px] font-bold border-2 transition-all min-w-[68px]
                  ${winner === "player"
                    ? "border-[#22C55E] bg-[#22C55E]/15 text-[#22C55E]"
                    : "border-white/[0.08] bg-white/[0.03] text-[#C9CFDA]/40 hover:border-white/[0.15]"
                  }`}
              >
                ✓ Won
              </button>
              <button
                onClick={() => setWinner("opponent")}
                className={`px-3 py-2.5 rounded-[10px] text-[12px] font-bold border-2 transition-all min-w-[68px]
                  ${winner === "opponent"
                    ? "border-[#EF4444] bg-[#EF4444]/15 text-[#EF4444]"
                    : "border-white/[0.08] bg-white/[0.03] text-[#C9CFDA]/40 hover:border-white/[0.15]"
                  }`}
              >
                ✗ Lost
              </button>
            </div>

            <div className="w-px h-8 bg-white/[0.08] shrink-0" />

            {/* Finish type */}
            <div className="flex gap-1 shrink-0">
              {([
                { v: "WINNER" as const, l: "W", tip: "Winner" },
                { v: "FORCED_ERROR" as const, l: "FE", tip: "Forced Err" },
                { v: "UNFORCED_ERROR" as const, l: "UE", tip: "Unforced" },
              ]).map(({ v, l, tip }) => (
                <button
                  key={v}
                  onClick={() => setFinishType(v)}
                  title={tip}
                  className={`w-9 h-9 rounded-[8px] text-[11px] font-bold border transition-all flex items-center justify-center
                    ${finishType === v
                      ? "border-[#D4FF3A]/50 bg-[#D4FF3A]/10 text-[#D4FF3A]"
                      : "border-white/[0.06] bg-white/[0.02] text-[#C9CFDA]/35 hover:border-white/[0.12]"
                    }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-white/[0.08] shrink-0" />

            {/* Rally length */}
            <div className="flex gap-1 shrink-0">
              {([
                { v: "SHORT" as const, l: "S" },
                { v: "MEDIUM" as const, l: "M" },
                { v: "LONG" as const, l: "L" },
              ]).map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setRallyLength(v)}
                  title={v}
                  className={`w-8 h-9 rounded-[8px] text-[11px] font-bold border transition-all flex items-center justify-center
                    ${rallyLength === v
                      ? "border-[#D4FF3A]/50 bg-[#D4FF3A]/10 text-[#D4FF3A]"
                      : "border-white/[0.06] bg-white/[0.02] text-[#C9CFDA]/35 hover:border-white/[0.12]"
                    }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Point counter */}
            <div className="hidden sm:flex flex-col items-end shrink-0 mr-1">
              <span className="text-[9px] text-[#C9CFDA]/30 uppercase tracking-wider">
                {isServing ? "Serving" : "Returning"}
              </span>
              <span className="font-head text-[13px] font-bold text-[#C9CFDA]/50">Pt #{pointNumber}</span>
            </div>

            {/* Undo */}
            {canUndo && onUndo && (
              <button
                onClick={onUndo}
                className="px-2 py-1.5 rounded-[8px] border border-white/[0.08] bg-white/[0.02] text-[10px] font-bold text-[#C9CFDA]/40 hover:border-[#E9A23B]/30 hover:text-[#E9A23B] transition-all shrink-0"
                title="Undo last point"
              >
                ↩
              </button>
            )}

            {/* TAG */}
            <button
              onClick={handleTag}
              disabled={loading}
              className="tag-btn-primary shrink-0"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0B1220]/30 border-t-[#0B1220] rounded-full animate-spin" />
                  <span className="hidden sm:inline">Calc…</span>
                </>
              ) : (
                <>
                  <span className="text-[16px]">▶</span>
                  <span>TAG</span>
                </>
              )}
            </button>
          </div>

          {/* ── Row 2: Serve details (only when serving — no overflow risk) ── */}
          {isServing && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#C9CFDA]/30 uppercase tracking-wider shrink-0">Serve</span>

              {/* 1st / 2nd */}
              <div className="flex gap-1 shrink-0">
                {([1, 2] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setServeNum(n)}
                    className={`px-2.5 h-8 rounded-[8px] text-[10px] font-bold border transition-all
                      ${serveNum === n
                        ? n === 2
                          ? "border-[#E9A23B]/50 bg-[#E9A23B]/10 text-[#E9A23B]"
                          : "border-[#D4FF3A]/50 bg-[#D4FF3A]/10 text-[#D4FF3A]"
                        : "border-white/[0.06] bg-white/[0.02] text-[#C9CFDA]/35 hover:border-white/[0.12]"
                      }`}
                  >
                    {n === 1 ? "1st" : "2nd"}
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-white/[0.06] shrink-0" />

              {/* Direction */}
              <div className="flex gap-1 shrink-0">
                {(["T", "BODY", "WIDE"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setServeDir(d)}
                    className={`px-2.5 h-8 rounded-[8px] text-[10px] font-bold border transition-all
                      ${serveDir === d
                        ? "border-[#D4FF3A]/50 bg-[#D4FF3A]/10 text-[#D4FF3A]"
                        : "border-white/[0.06] bg-white/[0.02] text-[#C9CFDA]/35 hover:border-white/[0.12]"
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default QuickTagBar;
