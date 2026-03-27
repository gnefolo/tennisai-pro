import React from "react";
import type { RecordedPoint } from "./liveTypes";
import { shortMacroLabel } from "./liveHelpers";

interface MomentumStripProps {
    recentMomentumPoints: RecordedPoint[];
    recentSequenceInsight: string;
}

function pointTone(won: boolean, isLast: boolean): string {
    if (won) {
        return isLast
            ? "bg-emerald-300 ring-2 ring-emerald-100/50"
            : "bg-emerald-500";
    }

    return isLast
        ? "bg-rose-300 ring-2 ring-rose-100/50"
        : "bg-rose-500";
}

const MomentumStrip: React.FC<MomentumStripProps> = ({
    recentMomentumPoints,
    recentSequenceInsight,
}) => {
    const wins = recentMomentumPoints.filter((p) => p.isPointWon === 1).length;
    const losses = recentMomentumPoints.filter((p) => p.isPointWon === 0).length;
    const pressure = recentMomentumPoints.filter(
        (p) =>
            p.isBreakPoint === 1 ||
            p.isGamePoint === 1 ||
            p.isGamePointAgainst === 1
    ).length;
    const longRallies = recentMomentumPoints.filter(
        (p) => p.rallyBucket === "LONG"
    ).length;

    return (
        <div className="rounded-[24px] border border-slate-700 bg-slate-950 shadow-lg">
            <div className="border-b border-slate-800 px-5 py-4 md:px-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold">
                                Match Beats
                            </div>
                            <div className="mt-1 text-lg font-semibold text-slate-50">
                                Momentum Strip
                            </div>
                        </div>

                        <div className="hidden md:block h-8 w-px bg-slate-800" />

                        <div className="hidden md:block text-sm text-slate-400 max-w-xl">
                            Sequenza visuale degli ultimi punti con lettura rapida di inerzia,
                            pressione e sviluppo recente del match.
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300 font-semibold">
                            Ultimi {Math.min(recentMomentumPoints.length, 8)} punti
                        </span>
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300 font-semibold">
                            Vinti {wins}
                        </span>
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-rose-300 font-semibold">
                            Persi {losses}
                        </span>
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 md:px-6 md:py-6 flex flex-col gap-5">
                {recentMomentumPoints.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center">
                        <div className="text-sm font-medium text-slate-300">
                            Nessun punto registrato finora
                        </div>
                        <div className="mt-2 text-[12px] text-slate-500">
                            La momentum strip apparirà qui appena registri i primi punti.
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Point-by-point flow
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
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
                                        title={`${won ? "Punto mio" : "Punto avversario"} · ${shortMacroLabel(
                                            pt.macroPattern
                                        )}`}
                                    >
                                        <div
                                            className={`h-12 md:h-14 rounded-md transition-all ${pointTone(
                                                won,
                                                isLast
                                            )}`}
                                        />
                                        <div className="mt-2 text-center text-[9px] md:text-[10px] text-slate-400 truncate font-medium">
                                            {shortMacroLabel(pt.macroPattern)}
                                        </div>

                                        <div className="mt-1 flex justify-center">
                                            {isPressure ? (
                                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-300">
                                                    Pressure
                                                </span>
                                            ) : (
                                                <span className="text-[8px] uppercase tracking-[0.12em] text-slate-600">
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

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.20em] text-slate-500 font-semibold">
                            Won
                        </div>
                        <div className="mt-2 text-2xl font-bold text-emerald-300">{wins}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                            Punti recenti vinti
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.20em] text-slate-500 font-semibold">
                            Lost
                        </div>
                        <div className="mt-2 text-2xl font-bold text-rose-300">{losses}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                            Punti recenti persi
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.20em] text-slate-500 font-semibold">
                            Pressure
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-300">{pressure}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                            Punti ad alta pressione
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.20em] text-slate-500 font-semibold">
                            Long rallies
                        </div>
                        <div className="mt-2 text-2xl font-bold text-sky-300">
                            {longRallies}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                            Scambi lunghi recenti
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-sky-300 font-bold">
                        Momentum Insight
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-100">
                        {recentSequenceInsight}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MomentumStrip;