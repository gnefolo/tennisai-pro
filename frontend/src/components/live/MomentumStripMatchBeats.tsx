// src/components/live/MomentumStripMatchBeats.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: imports liveTypes/liveHelpers, useMemo, BeatItem union type,
//     buildBeatItems (tutta la logica di rilevamento game/set/break), isPressurePoint,
//     funzioni pointBg/pointScoreTone/pointMarker, struttura JSX — identici all'originale.
//     Modificati esclusivamente: className, palette cromatica, shell costante.

import React, { useMemo } from "react";
import type { RecordedPoint } from "./liveTypes";
import { shortMacroLabel } from "./liveHelpers";

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
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

// ─── DESIGN TOKEN costante shell ─────────────────────────────────────────────
const shell =
    "rounded-[24px] border border-white/[0.06] " +
    "bg-[linear-gradient(180deg,rgba(11,18,32,0.96),rgba(5,9,18,0.99))] " +
    "shadow-[var(--e-3)] overflow-hidden";

const labelClass = "text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold";

// ─── FUNZIONI HELPER (invariate — logica del modello) ────────────────────────
function isPressurePoint(point: RecordedPoint): boolean {
    return (
        point.isBreakPoint === 1 ||
        point.isGamePoint === 1 ||
        point.isGamePointAgainst === 1
    );
}

// Rimappatura cromatica sul DS: sky→ace-lime, slate→net-graphite/fog
function pointBg(won: boolean): string {
    return won
        ? "border-ace-lime/30 bg-ace-lime/[0.08]"
        : "border-white/[0.06] bg-white/[0.03]";
}

function pointScoreTone(won: boolean): string {
    return won ? "text-ace-lime" : "text-fog";
}

function pointMarker(won: boolean): string {
    return won ? "bg-ace-lime" : "bg-net-graphite";
}

// buildBeatItems — invariata: tutta la logica di rilevamento game/set/break
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
            next.gameScoreMe !== point.gameScoreMe ||
            next.gameScoreOpp !== point.gameScoreOpp;
        const setChanged =
            next.setScoreMe !== point.setScoreMe ||
            next.setScoreOpp !== point.setScoreOpp;

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
                // Set won: ace-lime, Set lost: error — rimappato sul DS
                accent: meWonSet
                    ? "border-ace-lime/40 bg-ace-lime/[0.08] text-ace-lime"
                    : "border-error/30 bg-error/[0.08] text-error",
            });
            return;
        }

        if (gameChanged) {
            const meWonGame = next.gameScoreMe > point.gameScoreMe;
            const wasBreakOpportunity = point.isBreakPoint === 1;
            items.push({
                type: "event",
                id: `game_${point.id}`,
                variant: wasBreakOpportunity ? (meWonGame ? "break" : "hold") : "hold",
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
                // Break: success, Hold/won: ace-lime, Lost: fog
                accent:
                    wasBreakOpportunity && meWonGame
                        ? "border-success/40 bg-success/[0.08] text-success"
                        : meWonGame
                            ? "border-ace-lime/30 bg-ace-lime/[0.06] text-ace-lime"
                            : "border-white/[0.08] bg-white/[0.03] text-fog",
            });
        }
    });

    return items;
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
const MomentumStripMatchBeats: React.FC<MomentumStripMatchBeatsProps> = ({
    recordedPoints,
    recentSequenceInsight,
}) => {
    // useMemo invariati — slicing e buildBeatItems intoccati
    const recentPoints = useMemo(() => recordedPoints.slice(-12), [recordedPoints]);
    const beatItems = useMemo(() => buildBeatItems(recentPoints), [recentPoints]);

    const wins = recentPoints.filter((p) => p.isPointWon === 1).length;
    const losses = recentPoints.filter((p) => p.isPointWon === 0).length;
    const pressure = recentPoints.filter((p) => isPressurePoint(p)).length;

    return (
        <div className={shell}>

            {/* ── Header ── */}
            <div className="px-5 py-4 md:px-6 border-b border-white/[0.06]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            {/* Eyebrow clay-amber per label di sezione */}
                            <div className={labelClass}>ATP Infosys Style</div>
                            <div className="mt-1 font-head text-lg font-semibold tracking-tight text-baseline">
                                MatchBeats
                            </div>
                        </div>
                        <div className="hidden md:block h-10 w-px bg-white/[0.06]" />
                        <div className="hidden md:block text-sm text-fog/60 max-w-2xl">
                            Lettura visuale del flusso punto-per-punto con eventi chiave di game e set.
                        </div>
                    </div>

                    {/* Counter pills */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-fog">
                            Match
                        </span>
                        <span className="rounded-full border border-ace-lime/20 bg-ace-lime/[0.08] px-3 py-1 text-[11px] font-semibold text-ace-lime">
                            Won {wins}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-fog">
                            Lost {losses}
                        </span>
                        <span className="rounded-full border border-clay-amber/20 bg-clay-amber/[0.08] px-3 py-1 text-[11px] font-semibold text-clay-amber">
                            Pressure {pressure}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="px-5 py-5 md:px-6 md:py-6">
                {beatItems.length === 0 ? (
                    /* Empty state */
                    <div className="rounded-[var(--r-md)] border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
                        <div className="text-sm font-medium text-fog">
                            Nessun punto registrato finora
                        </div>
                        <div className="mt-2 text-[12px] text-fog/40">
                            La MatchBeats strip apparirà appena registri i primi punti.
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex items-center justify-between">
                            <div className={labelClass}>Point-by-point timeline</div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-fog/40">
                                Ultimi 12 punti / eventi
                            </div>
                        </div>

                        {/* Timeline scrollabile */}
                        <div className="relative">
                            {/* Linea orizzontale centrale */}
                            <div className="absolute left-0 right-0 top-[58px] h-px bg-white/[0.05]" />
                            <div className="overflow-x-auto pb-3">
                                <div className="flex items-start gap-3 min-w-max pr-4">
                                    {beatItems.map((item) => {
                                        if (item.type === "event") {
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`w-[132px] shrink-0 rounded-[var(--r-md)] border px-4 py-4 shadow-[var(--e-2)] ${item.accent}`}
                                                >
                                                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">
                                                        {item.variant}
                                                    </div>
                                                    <div className="mt-3 font-head text-2xl font-bold tracking-tight">
                                                        {item.title}
                                                    </div>
                                                    <div className="mt-2 text-[12px] leading-relaxed opacity-90">
                                                        {item.subtitle}
                                                    </div>
                                                    {item.meta ? (
                                                        <div className="mt-4 font-head text-sm font-semibold opacity-95">
                                                            {item.meta}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={item.id} className="w-[94px] shrink-0">
                                                {/* Marker dot: ace-lime / net-graphite */}
                                                <div className="flex justify-center mb-2">
                                                    <div
                                                        className={`h-3 w-3 rounded-full ${pointMarker(item.won)} ${item.isLast ? "ring-4 ring-ace-lime/20" : ""
                                                            }`}
                                                    />
                                                </div>
                                                {/* Point card */}
                                                <div
                                                    className={`rounded-[var(--r-md)] border px-3 py-3 shadow-[var(--e-1)] ${pointBg(item.won)} ${item.isLast ? "ring-1 ring-ace-lime/20" : ""
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="text-[10px] uppercase tracking-[0.14em] text-fog/50 font-semibold">
                                                            Pt
                                                        </div>
                                                        {item.isPressure ? (
                                                            <span className="rounded-full border border-clay-amber/30 bg-clay-amber/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-clay-amber">
                                                                Pressure
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {/* Score: ace-lime se vinto, fog se perso */}
                                                    <div className={`mt-2 font-head text-2xl font-bold tracking-tight ${pointScoreTone(item.won)}`}>
                                                        {item.scoreLabel}
                                                    </div>
                                                    <div className="mt-2 text-[11px] font-semibold text-fog truncate">
                                                        {item.label}
                                                    </div>
                                                    <div className="mt-2 text-[10px] text-fog/40">
                                                        #{item.point.pointNumber}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── Sequence Insight card — ace-lime border */}
                        <div className="mt-5 rounded-[var(--r-md)] border border-ace-lime/20 bg-[linear-gradient(135deg,rgba(11,18,32,0.60),rgba(11,18,32,0.97),rgba(212,255,58,0.04))] px-4 py-4 md:px-5 md:py-5">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="flex-1">
                                    <div className="text-[10px] uppercase tracking-[0.24em] text-ace-lime font-bold">
                                        Sequence Insight
                                    </div>
                                    <div className="mt-2 font-body text-[13px] md:text-sm font-semibold leading-relaxed text-baseline">
                                        {recentSequenceInsight}
                                    </div>
                                </div>
                                <div className="text-[11px] text-fog/40 md:pl-6 md:text-right">
                                    Match flow interpretation
                                </div>
                            </div>
                        </div>

                        {/* ── Legenda ── */}
                        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-fog/50">
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-ace-lime" />
                                Punto vinto
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-net-graphite" />
                                Punto perso
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-clay-amber" />
                                Pressure point
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="inline-block rounded-sm border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-fog">
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
