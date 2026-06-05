// src/components/infosys/InfosysMomentumStrip.tsx
// Infosys ATP-style "Match Beats" momentum strip
// Normalized MomentumBeat[] type — works with both TaggedPoint and RecordedPoint callers
// Center-line layout: won bars go UP, lost bars go DOWN from the dividing line

import React, { useMemo, useRef, useEffect, useState } from "react";

// ─── PUBLIC TYPE (exported so callers can build their own adapter) ────────────

export interface MomentumBeat {
  id: string | number;
  pointNumber: number;
  won: boolean;
  rallyLength: "SHORT" | "MEDIUM" | "LONG";
  probability?: number;   // pre-point win probability [0,1]
  hasPressure?: boolean;  // break/game point situation
  swing?: number;         // probability swing in pp after point
  pointScore?: string;    // e.g. "40-30"
  finishType?: string;    // "WINNER" | "FORCED_ERROR" | "UNFORCED_ERROR"
}

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface InfosysMomentumStripProps {
  beats: MomentumBeat[];  // chronological, oldest first — caller handles order
  player1: string;
  player2: string;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STRIP_H  = 120;
const CENTER_Y = 60;
const MAX_HALF = 52;
const BAR_W    = 18;
const BAR_GAP  = 4;

const RALLY_HALF: Record<string, number> = { SHORT: 22, MEDIUM: 36, LONG: 52 };

function getHalfH(rallyLength: string): number {
  return Math.min(MAX_HALF, RALLY_HALF[rallyLength] ?? RALLY_HALF.MEDIUM);
}

const FINISH_LABEL: Record<string, string> = {
  WINNER: "Winner",
  FORCED_ERROR: "Forced Err.",
  UNFORCED_ERROR: "Unforced Err.",
};

function probColor(p: number): string {
  if (p >= 0.65) return "#D4FF3A";
  if (p <= 0.35) return "#EF4444";
  return "#E9A23B";
}

function wonFill(idx: number, total: number, isLast: boolean): string {
  if (isLast) return "#D4FF3A";
  const age   = 1 - idx / Math.max(1, total - 1);
  const alpha = 0.4 + age * 0.5;
  return `rgba(212,255,58,${alpha.toFixed(2)})`;
}

function lostFill(idx: number, total: number, isLast: boolean): string {
  if (isLast) return "#EF4444";
  const age   = 1 - idx / Math.max(1, total - 1);
  const alpha = 0.35 + age * 0.45;
  return `rgba(239,68,68,${alpha.toFixed(2)})`;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const InfosysMomentumStrip: React.FC<InfosysMomentumStripProps> = ({
  beats,
  player1,
  player2,
}) => {
  // Momentum gauge: last 5
  const last5  = useMemo(() => beats.slice(-5), [beats]);
  const won5   = last5.filter((b) => b.won).length;
  const momPct = last5.length > 0 ? won5 / last5.length : 0.5;

  // Current streak
  const streak = useMemo(() => {
    if (beats.length === 0) return { count: 0, won: true };
    const dir = beats[beats.length - 1].won;
    let n = 0;
    for (let i = beats.length - 1; i >= 0; i--) {
      if (beats[i].won === dir) n++;
      else break;
    }
    return { count: n, won: dir };
  }, [beats]);

  const totalPts = beats.length;
  const wonPts   = beats.filter((b) => b.won).length;
  const winRate  = totalPts > 0 ? Math.round((wonPts / totalPts) * 100) : 0;

  // Selected beat for detail card (null = show latest)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const prevLen = useRef(beats.length);
  useEffect(() => {
    if (beats.length !== prevLen.current) {
      prevLen.current = beats.length;
      setSelectedIdx(null);
    }
  }, [beats.length]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" });
    }
  }, [beats.length]);

  const detailIdx = selectedIdx ?? (beats.length > 0 ? beats.length - 1 : null);
  const detail    = detailIdx !== null ? beats[detailIdx] : null;

  const p1Short = player1.split(" ").slice(-1)[0];
  const p2Short = player2.split(" ").slice(-1)[0];

  // ── Empty state ──────────────────────────────────────────────────────────
  if (beats.length === 0) {
    return (
      <div className="rounded-[20px] border border-white/[0.07] bg-[#0f1929] p-5 flex flex-col items-center justify-center gap-3 min-h-[160px]">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#C9CFDA]/30 font-semibold font-head">
          Infosys · Match Beats
        </div>
        <div className="font-head text-[15px] font-bold text-[#F7F8FA]/50">Momentum Strip</div>
        <div className="text-[11px] text-[#C9CFDA]/30 text-center max-w-[240px] leading-relaxed">
          Registra il primo punto per avviare la visualizzazione live.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-white/[0.07] bg-[#0f1929] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.28)]">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-[0.26em] text-[#D4FF3A]/60 font-semibold font-head">
            Infosys · Match Beats
          </span>
          <span className="font-head text-[15px] font-bold text-[#F7F8FA] leading-tight">
            Momentum Strip
          </span>
        </div>

        {streak.count >= 2 && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border momentum-streak-badge ${
              streak.won
                ? "border-[#D4FF3A]/30 bg-[#D4FF3A]/10 text-[#D4FF3A]"
                : "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: streak.won ? "#D4FF3A" : "#EF4444" }}
            />
            {streak.count}× {streak.won ? "in a row" : "opponent run"}
          </div>
        )}

        <div className="text-right shrink-0">
          <div className="font-head text-[14px] font-bold tabular-nums text-[#F7F8FA]">
            {wonPts}<span className="text-[#C9CFDA]/30 font-normal">/{totalPts}</span>
          </div>
          <div className="text-[9px] text-[#C9CFDA]/40 tabular-nums mt-0.5">{winRate}% win rate</div>
        </div>
      </div>

      {/* ── Momentum Gauge ─────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span
            className="font-head text-[11px] font-bold truncate max-w-[38%]"
            style={{ color: momPct >= 0.5 ? "#D4FF3A" : "rgba(201,207,218,0.45)" }}
          >
            {p1Short}
          </span>
          <span className="text-[8px] uppercase tracking-[0.20em] text-[#C9CFDA]/25 font-semibold shrink-0 px-2">
            Last {last5.length} pts
          </span>
          <span
            className="font-head text-[11px] font-bold truncate max-w-[38%] text-right"
            style={{ color: momPct < 0.5 ? "#EF4444" : "rgba(201,207,218,0.45)" }}
          >
            {p2Short}
          </span>
        </div>

        <div
          className="relative h-[5px] rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to right, rgba(212,255,58,0.06) 50%, rgba(239,68,68,0.06) 50%)",
          }} />
          <div
            className="absolute left-0 top-0 h-full momentum-gauge-fill"
            style={{
              width: `${Math.round(momPct * 100)}%`,
              background: momPct >= 0.5 ? "#D4FF3A" : "rgba(201,207,218,0.3)",
              borderRadius: "999px 0 0 999px",
              boxShadow: momPct >= 0.65 ? "0 0 10px rgba(212,255,58,0.5)" : undefined,
              transition: "width 0.6s cubic-bezier(0.2,0.8,0.2,1), background 0.4s ease",
            }}
          />
          <div
            className="absolute right-0 top-0 h-full"
            style={{
              width: `${100 - Math.round(momPct * 100)}%`,
              background: momPct < 0.5 ? "#EF4444" : "rgba(201,207,218,0.1)",
              borderRadius: "0 999px 999px 0",
              boxShadow: momPct <= 0.35 ? "0 0 10px rgba(239,68,68,0.4)" : undefined,
              transition: "width 0.6s cubic-bezier(0.2,0.8,0.2,1), background 0.4s ease",
            }}
          />
          <div className="absolute top-0 bottom-0 w-px bg-white/[0.15]" style={{ left: "50%" }} />
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[#C9CFDA]/30 tabular-nums">{won5}/{last5.length}</span>
          <span className="text-[9px] text-[#C9CFDA]/30 tabular-nums">{last5.length - won5}/{last5.length}</span>
        </div>
      </div>

      {/* ── Zone labels ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 mb-1">
        <span className="text-[8px] uppercase tracking-[0.18em] text-[#D4FF3A]/40 font-semibold font-head">↑ {p1Short}</span>
        <span className="text-[8px] uppercase tracking-[0.18em] text-[#EF4444]/40 font-semibold font-head">{p2Short} ↓</span>
      </div>

      {/* ── Center-line strip ──────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="relative overflow-x-auto px-4 pb-1"
        style={{ height: `${STRIP_H + 8}px`, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}
      >
        <div
          className="relative"
          style={{ height: `${STRIP_H}px`, minWidth: `${beats.length * (BAR_W + BAR_GAP)}px` }}
        >
          {/* Center line */}
          <div
            className="absolute left-0 right-0 h-px"
            style={{ top: `${CENTER_Y}px`, background: "rgba(255,255,255,0.08)", zIndex: 0 }}
          />

          {beats.map((beat, idx) => {
            const isLast     = idx === beats.length - 1;
            const isSelected = selectedIdx === idx;
            const h          = getHalfH(beat.rallyLength);
            const bw         = isLast || isSelected ? BAR_W + 2 : BAR_W - 2;

            return (
              <div
                key={beat.id}
                className="absolute"
                style={{
                  left: `${idx * (BAR_W + BAR_GAP)}px`,
                  top: 0,
                  width: `${BAR_W}px`,
                  height: `${STRIP_H}px`,
                  zIndex: isLast ? 3 : isSelected ? 2 : 1,
                  cursor: "pointer",
                }}
                onClick={() => setSelectedIdx(isSelected ? null : idx)}
                aria-label={`Punto ${beat.pointNumber} — ${beat.won ? "Vinto" : "Perso"}`}
              >
                {/* Pressure dot */}
                {beat.hasPressure && (
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: "5px", height: "5px",
                      left: "50%", transform: "translateX(-50%)",
                      top: beat.won ? `${CENTER_Y - h - 8}px` : undefined,
                      bottom: beat.won ? undefined : `${STRIP_H - CENTER_Y - h - 8}px`,
                      background: "#E9A23B",
                      boxShadow: "0 0 6px rgba(233,162,59,0.5)",
                    }}
                  />
                )}

                {/* Won bar — wrapper positions X, inner animates scaleY from bottom */}
                {beat.won && (
                  <div style={{
                    position: "absolute",
                    bottom: `${STRIP_H - CENTER_Y}px`,
                    left: "50%", transform: "translateX(-50%)",
                    width: `${bw}px`, transition: "width 0.2s",
                  }}>
                    <div style={{
                      width: "100%", height: `${h}px`,
                      background: wonFill(idx, beats.length, isLast),
                      borderRadius: "3px 3px 1px 1px",
                      transformOrigin: "center bottom",
                      boxShadow: isLast
                        ? "0 0 14px rgba(212,255,58,0.55), 0 0 4px rgba(212,255,58,0.9)"
                        : isSelected ? "0 0 8px rgba(212,255,58,0.35)" : undefined,
                      opacity: isSelected ? 1 : 0.82 + 0.18 * (idx / Math.max(1, beats.length - 1)),
                      transition: "box-shadow 0.3s, opacity 0.2s",
                      animation: isLast ? "momentum-bar-scale-up 0.38s cubic-bezier(0.2,0.8,0.2,1) both" : undefined,
                    }} />
                  </div>
                )}

                {/* Lost bar — wrapper positions X, inner animates scaleY from top */}
                {!beat.won && (
                  <div style={{
                    position: "absolute",
                    top: `${CENTER_Y}px`,
                    left: "50%", transform: "translateX(-50%)",
                    width: `${bw}px`, transition: "width 0.2s",
                  }}>
                    <div style={{
                      width: "100%", height: `${h}px`,
                      background: lostFill(idx, beats.length, isLast),
                      borderRadius: "1px 1px 3px 3px",
                      transformOrigin: "center top",
                      boxShadow: isLast
                        ? "0 0 14px rgba(239,68,68,0.5), 0 0 4px rgba(239,68,68,0.8)"
                        : isSelected ? "0 0 8px rgba(239,68,68,0.3)" : undefined,
                      opacity: isSelected ? 1 : 0.82 + 0.18 * (idx / Math.max(1, beats.length - 1)),
                      transition: "box-shadow 0.3s, opacity 0.2s",
                      animation: isLast ? "momentum-bar-scale-down 0.38s cubic-bezier(0.2,0.8,0.2,1) both" : undefined,
                    }} />
                  </div>
                )}

                {/* Selection dot on center line */}
                {isSelected && (
                  <div style={{
                    position: "absolute", top: `${CENTER_Y - 3}px`,
                    left: "50%", transform: "translateX(-50%)",
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: beat.won ? "#D4FF3A" : "#EF4444",
                    boxShadow: `0 0 8px ${beat.won ? "rgba(212,255,58,0.6)" : "rgba(239,68,68,0.6)"}`,
                    zIndex: 4,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail card ────────────────────────────────────────── */}
      {detail && (
        <div
          className="mx-4 mb-3 mt-1 rounded-[12px] border px-3 py-2.5 flex items-start justify-between gap-3"
          style={{
            borderColor: detail.won ? "rgba(212,255,58,0.18)" : "rgba(239,68,68,0.18)",
            background: detail.won ? "rgba(212,255,58,0.04)" : "rgba(239,68,68,0.04)",
            animation: "momentum-detail-in 0.25s cubic-bezier(0.2,0.8,0.2,1) both",
          }}
          key={detail.id}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: detail.won ? "rgba(212,255,58,0.15)" : "rgba(239,68,68,0.15)",
                color: detail.won ? "#D4FF3A" : "#EF4444",
              }}
            >
              {detail.won ? "W" : "L"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-head text-[13px] font-bold text-[#F7F8FA] tabular-nums">
                  #{detail.pointNumber}
                </span>
                {detail.pointScore && (
                  <span className="text-[10px] font-mono text-[#C9CFDA]/40">{detail.pointScore}</span>
                )}
                {detail.hasPressure && (
                  <span
                    className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border"
                    style={{ borderColor: "rgba(233,162,59,0.35)", background: "rgba(233,162,59,0.12)", color: "#E9A23B" }}
                  >
                    Pressure
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#C9CFDA]/50 mt-0.5 truncate">
                {detail.finishType ? (FINISH_LABEL[detail.finishType] ?? detail.finishType) : "—"}
                {" · "}
                {detail.rallyLength.charAt(0) + detail.rallyLength.slice(1).toLowerCase()} rally
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            {detail.probability !== undefined && (
              <div
                className="font-head text-[14px] font-bold tabular-nums"
                style={{ color: probColor(detail.probability) }}
              >
                {Math.round(detail.probability * 100)}%
              </div>
            )}
            {detail.swing !== undefined && (
              <div
                className="text-[10px] font-semibold tabular-nums mt-0.5"
                style={{ color: detail.swing >= 0 ? "#22C55E" : "#EF4444" }}
              >
                {detail.swing >= 0 ? "+" : ""}{detail.swing}pp
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-t"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[10px] text-[#C9CFDA]/50">
            <span className="w-2 h-2 rounded-full bg-[#D4FF3A]" />Won {wonPts}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-[#C9CFDA]/50">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />Lost {totalPts - wonPts}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-[#C9CFDA]/50">
            <span className="w-2 h-2 rounded-full bg-[#E9A23B]" />Pressure
          </span>
        </div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#C9CFDA]/25 font-semibold">
          {totalPts} {totalPts === 1 ? "punto" : "punti"}
        </div>
      </div>
    </div>
  );
};

export default InfosysMomentumStrip;
