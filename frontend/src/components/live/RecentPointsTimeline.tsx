// src/components/live/RecentPointsTimeline.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: imports liveTypes/liveHelpers, funzioni helper finishLabel/
//     outcomeTone/outcomeDot, rendering condizionale nextPointPatternHint e
//     taggedPattern, struttura JSX completa — identici all'originale.
//     Modificati esclusivamente: shellCard, sectionLabel, className, palette.

import React from "react";
import type { RecordedPoint } from "./liveTypes";
import { shortMacroLabel } from "./liveHelpers";

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
interface RecentPointsTimelineProps {
    recentFivePoints: RecordedPoint[];
}

// ─── DESIGN TOKEN costanti ───────────────────────────────────────────────────
const shellCard =
    "rounded-[24px] border border-white/[0.06] " +
    "bg-[linear-gradient(180deg,rgba(11,18,32,0.96),rgba(5,9,18,0.99))] " +
    "shadow-[var(--e-3)]";

const sectionLabel =
    "text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold";

// ─── FUNZIONI HELPER (invariate — logica di labeling e tono) ─────────────────
function finishLabel(value?: string | null): string {
    if (value === "WINNER") return "Vincente";
    if (value === "FORCED_ERROR") return "Errore forzato";
    if (value === "UNFORCED_ERROR") return "Errore non forzato";
    return "n/d";
}

// Rimappatura DS: won=ace-lime/success, lost=error
function outcomeTone(won: boolean): string {
    return won
        ? "border-ace-lime/15 bg-ace-lime/[0.05]"
        : "border-error/15 bg-error/[0.04]";
}

function outcomeDot(won: boolean): string {
    return won ? "bg-ace-lime" : "bg-error";
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
const RecentPointsTimeline: React.FC<RecentPointsTimelineProps> = ({
    recentFivePoints,
}) => {
    return (
        <div className={`${shellCard} overflow-hidden`}>

            {/* ── Header ── */}
            <div className="px-5 py-5 md:px-6 md:py-6 border-b border-white/[0.06]">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className={sectionLabel}>Recent Sequence</div>
                        <div className="mt-1 font-head text-lg font-semibold tracking-tight text-baseline">
                            Timeline ultimi 5 punti
                        </div>
                    </div>
                    {/* Pill "Lettura rapida" */}
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-fog">
                        Lettura rapida
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="px-5 py-5 md:px-6 md:py-6">
                {recentFivePoints.length === 0 ? (
                    /* Empty state */
                    <div className="rounded-[var(--r-md)] border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-fog/40">
                        Nessun punto registrato finora.
                    </div>
                ) : (
                    <div className="relative flex flex-col gap-3">

                        {/* Linea verticale connettore — usa token white invece di slate */}
                        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/[0.08]" />

                        {recentFivePoints.map((pt, idx) => {
                            const won = pt.isPointWon === 1;

                            return (
                                <div key={pt.id} className="relative flex gap-3">

                                    {/* ── Dot timeline ── */}
                                    <div className="relative z-10 flex w-8 shrink-0 justify-center pt-3">
                                        <span
                                            className={`h-3 w-3 rounded-full ring-4 ring-[rgba(5,9,18,0.95)] ${outcomeDot(won)}`}
                                        />
                                    </div>

                                    {/* ── Point card ── */}
                                    <div
                                        className={`flex-1 rounded-[var(--r-md)] border px-4 py-4 ${outcomeTone(won)}`}
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

                                            {/* Left: titolo + badge */}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {/* Label punto: ace-lime se vinto, error se perso */}
                                                    <span
                                                        className={`text-[12px] font-semibold ${won ? "text-ace-lime" : "text-error"
                                                            }`}
                                                    >
                                                        {won ? "Punto mio" : "Punto avversario"}
                                                    </span>
                                                    {/* Badge numero punto */}
                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-fog/60">
                                                        #{pt.pointNumber}
                                                    </span>
                                                </div>

                                                {/* Pill info: pattern, finishType, punteggio */}
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-semibold text-fog">
                                                        {shortMacroLabel(pt.macroPattern)}
                                                    </span>
                                                    {pt.finishType && (
                                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-semibold text-fog/80">
                                                            {finishLabel(pt.finishType)}
                                                        </span>
                                                    )}
                                                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-semibold text-fog/60">
                                                        {pt.setScoreMe}-{pt.setScoreOpp} set ·{" "}
                                                        {pt.gameScoreMe}-{pt.gameScoreOpp} game ·{" "}
                                                        {pt.pointScoreMe}-{pt.pointScoreOpp}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: label Most recent / Sequence */}
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fog/40">
                                                {idx === 0 ? "Most recent" : "Sequence"}
                                            </div>

                                        </div>

                                        {/* ── AI hint cards (rendering condizionale invariato) ── */}
                                        {(pt.nextPointPatternHint || pt.taggedPattern) && (
                                            <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">

                                                {/* Next Hint: success — suggerimento positivo del modello */}
                                                {pt.nextPointPatternHint && (
                                                    <div className="rounded-[var(--r-sm)] border border-success/15 bg-success/[0.05] px-3 py-2">
                                                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-success/80">
                                                            Next Hint
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-success/70">
                                                            {pt.nextPointPatternHint}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Tagged Pattern: clay-amber — pattern rilevato */}
                                                {pt.taggedPattern && (
                                                    <div className="rounded-[var(--r-sm)] border border-clay-amber/15 bg-clay-amber/[0.05] px-3 py-2">
                                                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay-amber/80">
                                                            Tagged Pattern
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-clay-amber/70">
                                                            {pt.taggedPattern}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentPointsTimeline;
