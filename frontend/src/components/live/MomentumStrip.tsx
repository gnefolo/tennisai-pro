// src/components/live/MomentumStrip.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: imports da liveTypes/liveHelpers, calcoli wins/losses/pressure/longRallies,
//     funzione pointTone, struttura JSX — tutto identico all'originale.
//     Modificati esclusivamente: className e palette cromatica.

import React from "react";
import type { RecordedPoint } from "./liveTypes";
import { shortMacroLabel } from "./liveHelpers";

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
interface MomentumStripProps {
    recentMomentumPoints: RecordedPoint[];
    recentSequenceInsight: string;
}

// ─── FUNZIONE HELPER (invariata — logica colore punto) ────────────────────────
// Rimappa: won=ace-lime, lost=error. isLast aggiunge il ring highlight.
function pointTone(won: boolean, isLast: boolean): string {
    if (won) {
        return isLast
            ? "bg-ace-lime ring-2 ring-ace-lime/30"
            : "bg-ace-lime/70";
    }
    return isLast
        ? "bg-error ring-2 ring-error/20"
        : "bg-error/60";
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
const MomentumStrip: React.FC<MomentumStripProps> = ({
    recentMomentumPoints,
    recentSequenceInsight,
}) => {
    // ── Calcoli derivati (invariati) ──────────────────────────────────────────
    const wins = recentMomentumPoints.filter((p) => p.isPointWon === 1).length;
    const losses = recentMomentumPoints.filter((p) => p.isPointWon === 0).length;
    const pressure = recentMomentumPoints.filter(
        (p) => p.isBreakPoint === 1 || p.isGamePoint === 1 || p.isGamePointAgainst === 1
    ).length;
    const longRallies = recentMomentumPoints.filter(
        (p) => p.rallyBucket === "LONG"
    ).length;

    return (
        <div className="rounded-[24px] border border-white/[0.07] bg-court-night shadow-[var(--e-3)]">

            {/* ── Header ── */}
            <div className="border-b border-white/[0.06] px-5 py-4 md:px-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold">
                                Match Beats
                            </div>
                            <div className="mt-1 font-head text-lg font-semibold text-baseline">
                                Momentum Strip
                            </div>
                        </div>
                        <div className="hidden md:block h-8 w-px bg-white/[0.06]" />
                        <div className="hidden md:block text-sm text-fog/60 max-w-xl">
                            Sequenza visuale degli ultimi punti con lettura rapida di inerzia,
                            pressione e sviluppo recente del match.
                        </div>
                    </div>

                    {/* Counter pills — success/error/neutral dal DS */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-fog font-semibold">
                            Ultimi {Math.min(recentMomentumPoints.length, 8)} punti
                        </span>
                        <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-success font-semibold">
                            Vinti {wins}
                        </span>
                        <span className="rounded-full border border-error/30 bg-error/10 px-3 py-1 text-error font-semibold">
                            Persi {losses}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="px-5 py-5 md:px-6 md:py-6 flex flex-col gap-5">

                {recentMomentumPoints.length === 0 ? (
                    /* Empty state */
                    <div className="rounded-[var(--r-md)] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
                        <div className="text-sm font-medium text-fog">
                            Nessun punto registrato finora
                        </div>
                        <div className="mt-2 text-[12px] text-fog/40">
                            La momentum strip apparirà qui appena registri i primi punti.
                        </div>
                    </div>
                ) : (
                    /* Point-by-point bars */
                    <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fog/60">
                                Point-by-point flow
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-fog/40">
                                Ultimo punto evidenziato
                            </div>
                        </div>
                        <div className="flex items-stretch gap-1.5 md:gap-2">
                            {recentMomentumPoints.map((pt, idx) => {
                                const won = pt.isPointWon === 1;
                                const isLast = idx === recentMomentumPoints.length - 1;
                                const isPressure =
                                    pt.isBreakPoint === 1 ||
                                    pt.isGamePoint === 1 ||
                                    pt.isGamePointAgainst === 1;

                                return (
                                    <div
                                        key={pt.id}
                                        className="flex-1 min-w-0"
                                        title={`${won ? "Punto mio" : "Punto avversario"} · ${shortMacroLabel(pt.macroPattern)}`}
                                    >
                                        {/* Barra colorata — usa pointTone rimappato sul DS */}
                                        <div
                                            className={`h-12 md:h-14 rounded-md transition-all duration-[var(--dur-med)] ${pointTone(won, isLast)}`}
                                        />
                                        <div className="mt-2 text-center text-[9px] md:text-[10px] text-fog/50 truncate font-medium">
                                            {shortMacroLabel(pt.macroPattern)}
                                        </div>
                                        <div className="mt-1 flex justify-center">
                                            {isPressure ? (
                                                /* Pressure badge: clay-amber — secondo accent DS */
                                                <span className="rounded-full border border-clay-amber/30 bg-clay-amber/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-clay-amber">
                                                    Pressure
                                                </span>
                                            ) : (
                                                <span className="text-[8px] uppercase tracking-[0.12em] text-fog/20">
                                                    Point
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Mini stat cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.20em] text-fog/50 font-semibold">Won</div>
                        <div className="mt-2 font-head text-2xl font-bold text-success">{wins}</div>
                        <div className="mt-1 text-[11px] text-fog/40">Punti recenti vinti</div>
                    </div>
                    <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.20em] text-fog/50 font-semibold">Lost</div>
                        <div className="mt-2 font-head text-2xl font-bold text-error">{losses}</div>
                        <div className="mt-1 text-[11px] text-fog/40">Punti recenti persi</div>
                    </div>
                    {/* Pressure: clay-amber */}
                    <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.20em] text-fog/50 font-semibold">Pressure</div>
                        <div className="mt-2 font-head text-2xl font-bold text-clay-amber">{pressure}</div>
                        <div className="mt-1 text-[11px] text-fog/40">Punti ad alta pressione</div>
                    </div>
                    {/* Long rallies: info blue */}
                    <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.20em] text-fog/50 font-semibold">Long rallies</div>
                        <div className="mt-2 font-head text-2xl font-bold text-info">{longRallies}</div>
                        <div className="mt-1 text-[11px] text-fog/40">Scambi lunghi recenti</div>
                    </div>
                </div>

                {/* ── Momentum Insight card ── */}
                {/* Rimappa: sky-border → ace-lime/20, gradient → court-night con lime hint */}
                <div className="rounded-[var(--r-md)] border border-ace-lime/20 bg-[linear-gradient(135deg,rgba(11,18,32,0.60),rgba(11,18,32,0.97),rgba(212,255,58,0.04))] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-ace-lime font-bold">
                        Momentum Insight
                    </div>
                    <div className="mt-2 font-body text-sm font-semibold leading-relaxed text-baseline">
                        {recentSequenceInsight}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MomentumStrip;
