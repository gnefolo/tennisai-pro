import React, { useMemo } from "react";
import type { RecordedPoint } from "./liveTypes";
import { shortMacroLabel } from "./liveHelpers";

interface MomentumStripMatchBeatsProps {
    recordedPoints: RecordedPoint[];
    recentSequenceInsight: string;
}

type BeatItem =
    | {
        type: "point";
        id: string;
        point: RecordedPoint;
        won: boolean;
        isPressure: boolean;
        isLast: boolean;
        label: string;
        scoreLabel: string;
    }
    | {
        type: "event";
        id: string;
        variant: "hold" | "break" | "set";
        title: string;
        subtitle: string;
        meta?: string;
        accent: string;
    };

const shell =
    "rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] shadow-[0_20px_45px_rgba(0,0,0,0.30)] overflow-hidden";

const labelClass =
    "text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold";

function isPressurePoint(point: RecordedPoint): boolean {
    return (
        point.isBreakPoint === 1 ||
        point.isGamePoint === 1 ||
        point.isGamePointAgainst === 1
    );
}

function pointBg(won: boolean): string {
    return won
        ? "border-sky-500/40 bg-sky-500/12"
        : "border-slate-700/90 bg-slate-900/80";
}

function pointScoreTone(won: boolean): string {
    return won ? "text-sky-300" : "text-slate-200";
}

function pointMarker(won: boolean): string {
    return won ? "bg-sky-400" : "bg-slate-500";
}

function buildBeatItems(points: RecordedPoint[]): BeatItem[] {
    if (points.length === 0) return [];

    const items: BeatItem[] = [];

    points.forEach((point, index) => {
        const won = point.isPointWon === 1;
        const isLast = index === points.length - 1;
        const isPressure = isPressurePoint(point);

        items.push({
            type: "point",
            id: point.id,
            point,
            won,
            isPressure,
            isLast,
            label: shortMacroLabel(point.macroPattern),
            scoreLabel: `${point.pointScoreMe}-${point.pointScoreOpp}`,
        });

        const next = points[index + 1];
        if (!next) return;

        const gameChanged =
            next.gameScoreMe !== point.gameScoreMe || next.gameScoreOpp !== point.gameScoreOpp;

        const setChanged =
            next.setScoreMe !== point.setScoreMe || next.setScoreOpp !== point.setScoreOpp;

        if (setChanged) {
            const meWonSet = next.setScoreMe > point.setScoreMe;
            const setNo = Math.max(next.setScoreMe, next.setScoreOpp);
            items.push({
                type: "event",
                id: `set_${point.id}`,
                variant: "set",
                title: `Set ${setNo}`,
                subtitle: meWonSet ? "Giocatore vince il set" : "Avversario vince il set",
                meta: `${next.setScoreMe}-${next.setScoreOpp}`,
                accent: meWonSet
                    ? "border-sky-400/60 bg-sky-500/12 text-sky-200"
                    : "border-rose-400/50 bg-rose-500/10 text-rose-200",
            });
            return;
        }

        if (gameChanged) {
            const meWonGame = next.gameScoreMe > point.gameScoreMe;
            const wasBreakOpportunity = point.isBreakPoint === 1;

            items.push({
                type: "event",
                id: `game_${point.id}`,
                variant: wasBreakOpportunity
                    ? meWonGame
                        ? "break"
                        : "hold"
                    : "hold",
                title:
                    wasBreakOpportunity && meWonGame
                        ? "Break"
                        : meWonGame
                            ? "Hold / Game"
                            : "Game Opponent",
                subtitle:
                    wasBreakOpportunity && meWonGame
                        ? "Break convertito"
                        : meWonGame
                            ? "Game vinto"
                            : "Game perso",
                meta: `${next.gameScoreMe}-${next.gameScoreOpp}`,
                accent:
                    wasBreakOpportunity && meWonGame
                        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                        : meWonGame
                            ? "border-sky-400/50 bg-sky-500/10 text-sky-200"
                            : "border-slate-600/70 bg-slate-800/70 text-slate-200",
            });
        }
    });

    return items;
}

const MomentumStripMatchBeats: React.FC<MomentumStripMatchBeatsProps> = ({
    recordedPoints,
    recentSequenceInsight,
}) => {
    const recentPoints = useMemo(() => recordedPoints.slice(-12), [recordedPoints]);
    const beatItems = useMemo(() => buildBeatItems(recentPoints), [recentPoints]);

    const wins = recentPoints.filter((p) => p.isPointWon === 1).length;
    const losses = recentPoints.filter((p) => p.isPointWon === 0).length;
    const pressure = recentPoints.filter((p) => isPressurePoint(p)).length;

    return (
        <div className={shell}>
            <div className="px-5 py-4 md:px-6 border-b border-slate-800/80">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <div className={labelClass}>ATP Infosys Style</div>
                            <div className="mt-1 text-lg font-semibold tracking-tight text-slate-50">
                                MatchBeats
                            </div>
                        </div>

                        <div className="hidden md:block h-10 w-px bg-slate-800/80" />

                        <div className="hidden md:block text-sm text-slate-400 max-w-2xl">
                            Lettura visuale del flusso punto-per-punto con eventi chiave di game e set.
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-300">
                            Match
                        </span>
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
                            Won {wins}
                        </span>
                        <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-300">
                            Lost {losses}
                        </span>
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                            Pressure {pressure}
                        </span>
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 md:px-6 md:py-6">
                {beatItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-10 text-center">
                        <div className="text-sm font-medium text-slate-300">
                            Nessun punto registrato finora
                        </div>
                        <div className="mt-2 text-[12px] text-slate-500">
                            La MatchBeats strip apparirà appena registri i primi punti.
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex items-center justify-between">
                            <div className={labelClass}>Point-by-point timeline</div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                Ultimi 12 punti / eventi
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute left-0 right-0 top-[58px] h-px bg-slate-800/80" />

                            <div className="overflow-x-auto pb-3">
                                <div className="flex items-start gap-3 min-w-max pr-4">
                                    {beatItems.map((item) => {
                                        if (item.type === "event") {
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`w-[132px] shrink-0 rounded-[20px] border px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)] ${item.accent}`}
                                                >
                                                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">
                                                        {item.variant}
                                                    </div>
                                                    <div className="mt-3 text-2xl font-bold tracking-tight">
                                                        {item.title}
                                                    </div>
                                                    <div className="mt-2 text-[12px] leading-relaxed opacity-90">
                                                        {item.subtitle}
                                                    </div>
                                                    {item.meta ? (
                                                        <div className="mt-4 text-sm font-semibold opacity-95">
                                                            {item.meta}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={item.id} className="w-[94px] shrink-0">
                                                <div className="flex justify-center mb-2">
                                                    <div
                                                        className={`h-3 w-3 rounded-full ${pointMarker(item.won)} ${item.isLast ? "ring-4 ring-slate-200/10" : ""}`}
                                                    />
                                                </div>

                                                <div
                                                    className={`rounded-[18px] border px-3 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${pointBg(
                                                        item.won
                                                    )} ${item.isLast ? "ring-1 ring-sky-300/30" : ""}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                                                            Pt
                                                        </div>
                                                        {item.isPressure ? (
                                                            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-300">
                                                                Pressure
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <div
                                                        className={`mt-2 text-2xl font-bold tracking-tight ${pointScoreTone(
                                                            item.won
                                                        )}`}
                                                    >
                                                        {item.scoreLabel}
                                                    </div>

                                                    <div className="mt-2 text-[11px] font-semibold text-slate-200 truncate">
                                                        {item.label}
                                                    </div>

                                                    <div className="mt-2 text-[10px] text-slate-500">
                                                        #{item.point.pointNumber}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 rounded-[20px] border border-sky-500/15 bg-[linear-gradient(135deg,rgba(8,47,73,0.28),rgba(15,23,42,0.96),rgba(6,78,59,0.14))] px-4 py-4 md:px-5 md:py-5">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="flex-1">
                                    <div className="text-[10px] uppercase tracking-[0.24em] text-sky-300 font-bold">
                                        Sequence Insight
                                    </div>
                                    <div className="mt-2 text-[13px] md:text-sm font-semibold leading-relaxed text-slate-100">
                                        {recentSequenceInsight}
                                    </div>
                                </div>

                                <div className="text-[11px] text-slate-500 md:pl-6 md:text-right">
                                    Match flow interpretation
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                                Punto vinto
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                                Punto perso
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                                Pressure point
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="inline-block rounded-sm border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300">
                                    EVENT
                                </span>
                                Hold / Break / Set
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MomentumStripMatchBeats;