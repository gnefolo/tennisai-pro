// src/components/live/RecentPointsTimeline.tsx
import React from "react";
import type { RecordedPoint } from "./liveTypes";
import { shortMacroLabel } from "./liveHelpers";

interface RecentPointsTimelineProps {
    recentFivePoints: RecordedPoint[];
}

const shellCard =
    "rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] shadow-[0_20px_45px_rgba(0,0,0,0.30)]";

const sectionLabel =
    "text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold";

function finishLabel(value?: string | null): string {
    if (value === "WINNER") return "Vincente";
    if (value === "FORCED_ERROR") return "Errore forzato";
    if (value === "UNFORCED_ERROR") return "Errore non forzato";
    return "n/d";
}

function outcomeTone(won: boolean): string {
    return won
        ? "border-emerald-500/20 bg-emerald-500/8"
        : "border-rose-500/20 bg-rose-500/8";
}

function outcomeDot(won: boolean): string {
    return won ? "bg-emerald-400" : "bg-rose-400";
}

const RecentPointsTimeline: React.FC<RecentPointsTimelineProps> = ({
    recentFivePoints,
}) => {
    return (
        <div className={`${shellCard} overflow-hidden`}>
            <div className="px-5 py-5 md:px-6 md:py-6 border-b border-slate-800/80">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className={sectionLabel}>Recent Sequence</div>
                        <div className="mt-1 text-lg font-semibold tracking-tight text-slate-50">
                            Timeline ultimi 5 punti
                        </div>
                    </div>

                    <div className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-300">
                        Lettura rapida
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 md:px-6 md:py-6">
                {recentFivePoints.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-500">
                        Nessun punto registrato finora.
                    </div>
                ) : (
                    <div className="relative flex flex-col gap-3">
                        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-800/90" />

                        {recentFivePoints.map((pt, idx) => {
                            const won = pt.isPointWon === 1;

                            return (
                                <div key={pt.id} className="relative flex gap-3">
                                    <div className="relative z-10 flex w-8 shrink-0 justify-center pt-3">
                                        <span
                                            className={`h-3 w-3 rounded-full ring-4 ring-slate-950 ${outcomeDot(
                                                won
                                            )}`}
                                        />
                                    </div>

                                    <div
                                        className={`flex-1 rounded-[20px] border px-4 py-4 ${outcomeTone(
                                            won
                                        )}`}
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[12px] font-semibold text-slate-100">
                                                        {won ? "Punto mio" : "Punto avversario"}
                                                    </span>
                                                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                        #{pt.pointNumber}
                                                    </span>
                                                </div>

                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                                                    <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-semibold text-slate-200">
                                                        {shortMacroLabel(pt.macroPattern)}
                                                    </span>

                                                    {pt.finishType && (
                                                        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-semibold text-slate-300">
                                                            {finishLabel(pt.finishType)}
                                                        </span>
                                                    )}

                                                    <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-semibold text-slate-400">
                                                        {pt.setScoreMe}-{pt.setScoreOpp} set · {pt.gameScoreMe}-
                                                        {pt.gameScoreOpp} game · {pt.pointScoreMe}-
                                                        {pt.pointScoreOpp}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                {idx === 0 ? "Most recent" : "Sequence"}
                                            </div>
                                        </div>

                                        {(pt.nextPointPatternHint || pt.taggedPattern) && (
                                            <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                                                {pt.nextPointPatternHint && (
                                                    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/8 px-3 py-2">
                                                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
                                                            Next Hint
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-emerald-200">
                                                            {pt.nextPointPatternHint}
                                                        </div>
                                                    </div>
                                                )}

                                                {pt.taggedPattern && (
                                                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/8 px-3 py-2">
                                                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/90">
                                                            Tagged Pattern
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-amber-200">
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