// src/components/live/LiveMatchHero.tsx
import React from "react";

type OnServe = "me" | "opponent";

interface LiveMatchHeroProps {
    playerName?: string;
    opponentName: string;
    tournament: string;
    surface: string;
    matchType: string;
    round?: string;
    setNumber: number;
    gameNumber: number;
    pointNumber: number;
    setsMe: number;
    gamesMe: number;
    pointScoreMe: string;
    setsOpp: number;
    gamesOpp: number;
    pointScoreOpp: string;
    onServe: OnServe;
    pointProbability: string;
    recordedPoints: number;
    tacticalCall: string;
    tacticalConfidence?: string;
    momentumState?: string;
    pressureState?: string;
    scorePulseKey: number;
    onOpenSettings?: () => void;
    onResetMatch?: () => void;
}

const shellCard =
    "rounded-[28px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] shadow-[0_24px_60px_rgba(0,0,0,0.38)]";

const metaPill =
    "inline-flex items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300";

const labelClass =
    "text-[10px] uppercase tracking-[0.20em] text-slate-500 font-semibold";

const servingBadge =
    "inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-300";

function cleanName(name?: string, fallback = "Player"): string {
    const value = (name ?? "").trim();
    return value || fallback;
}

function getPressureStateFallback(
    pointScoreMe: string,
    pointScoreOpp: string,
    onServe: OnServe
): { label: string; tone: string } {
    const isAdvantageSituation = (scoreA: string, scoreB: string) => {
        if (scoreA === "Ad") return true;
        if (scoreA === "40" && scoreB !== "40" && scoreB !== "Ad") return true;
        return false;
    };

    let isBreakPoint = false;
    let isGamePoint = false;
    let isGamePointAgainst = false;

    if (onServe === "me") {
        isGamePoint = isAdvantageSituation(pointScoreMe, pointScoreOpp);
        isBreakPoint = isAdvantageSituation(pointScoreOpp, pointScoreMe);
        isGamePointAgainst = isBreakPoint;
    } else {
        isGamePoint = isAdvantageSituation(pointScoreOpp, pointScoreMe);
        isBreakPoint = isAdvantageSituation(pointScoreMe, pointScoreOpp);
        isGamePointAgainst = isBreakPoint;
    }

    if (
        (pointScoreMe === "40" && pointScoreOpp === "40") ||
        pointScoreMe === "Ad" ||
        pointScoreOpp === "Ad"
    ) {
        return {
            label: "Deuce / Advantage",
            tone: "border-violet-500/30 bg-violet-500/10 text-violet-300",
        };
    }

    if (isGamePointAgainst) {
        return {
            label: "Game Point Against",
            tone: "border-rose-500/30 bg-rose-500/10 text-rose-300",
        };
    }

    if (isBreakPoint) {
        return {
            label: onServe === "me" ? "Break Point Against" : "Break Point For",
            tone:
                onServe === "me"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        };
    }

    if (isGamePoint) {
        return {
            label: onServe === "me" ? "Game Point For" : "Game Point Opponent",
            tone:
                onServe === "me"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300",
        };
    }

    return {
        label: "Neutral Point",
        tone: "border-slate-700 bg-slate-900/70 text-slate-300",
    };
}

function mapConfidenceTone(confidence?: string) {
    switch (confidence) {
        case "HIGH":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
        case "MEDIUM":
            return "border-amber-500/30 bg-amber-500/10 text-amber-300";
        case "LOW":
            return "border-rose-500/30 bg-rose-500/10 text-rose-300";
        default:
            return "border-slate-700 bg-slate-900/70 text-slate-300";
    }
}

function mapMomentumTone(momentum?: string) {
    switch (momentum) {
        case "HOT":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
        case "COLD":
            return "border-rose-500/30 bg-rose-500/10 text-rose-300";
        default:
            return "border-slate-700 bg-slate-900/70 text-slate-300";
    }
}

function mapPressureTone(pressure?: string) {
    switch (pressure) {
        case "BREAK_POINT_FOR":
        case "GAME_POINT_FOR":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
        case "BREAK_POINT_AGAINST":
        case "GAME_POINT_AGAINST":
            return "border-rose-500/30 bg-rose-500/10 text-rose-300";
        default:
            return "border-slate-700 bg-slate-900/70 text-slate-300";
    }
}

function mapPressureLabel(pressure?: string) {
    switch (pressure) {
        case "BREAK_POINT_FOR":
            return "Break Point For";
        case "BREAK_POINT_AGAINST":
            return "Break Point Against";
        case "GAME_POINT_FOR":
            return "Game Point For";
        case "GAME_POINT_AGAINST":
            return "Game Point Against";
        case "NEUTRAL":
            return "Neutral Point";
        default:
            return null;
    }
}

const LiveMatchHero: React.FC<LiveMatchHeroProps> = ({
    playerName,
    opponentName,
    tournament,
    surface,
    matchType,
    round,
    setNumber,
    gameNumber,
    pointNumber,
    setsMe,
    gamesMe,
    pointScoreMe,
    setsOpp,
    gamesOpp,
    pointScoreOpp,
    onServe,
    pointProbability,
    recordedPoints,
    tacticalCall,
    tacticalConfidence,
    momentumState,
    pressureState,
    scorePulseKey,
    onOpenSettings,
    onResetMatch,
}) => {
    const meName = cleanName(playerName, "Tu");
    const oppName = cleanName(opponentName, "Avversario");

    const pressureFallback = getPressureStateFallback(
        pointScoreMe,
        pointScoreOpp,
        onServe
    );

    const pressureLabel = mapPressureLabel(pressureState) ?? pressureFallback.label;
    const pressureTone = pressureState
        ? mapPressureTone(pressureState)
        : pressureFallback.tone;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.20em] text-emerald-300">
                        Live
                    </span>
                    <span className={metaPill}>{surface}</span>
                    <span className={metaPill}>{matchType}</span>
                    {round ? <span className={metaPill}>{round}</span> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {onOpenSettings && (
                        <button
                            onClick={onOpenSettings}
                            className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:border-sky-500/50 hover:text-white"
                        >
                            Impostazioni Match
                        </button>
                    )}

                    {onResetMatch && (
                        <button
                            onClick={onResetMatch}
                            className="rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-[11px] font-semibold text-rose-300 transition hover:border-rose-500/50 hover:bg-rose-950/50"
                        >
                            Reset Match
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold">
                        Match Center
                    </div>
                    <div className="mt-1 text-xl md:text-2xl font-semibold tracking-tight text-slate-50">
                        {tournament}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={metaPill}>Set {setNumber}</span>
                    <span className={metaPill}>Game {gameNumber}</span>
                    <span className={metaPill}>Point {pointNumber}</span>
                </div>
            </div>

            <div className={`${shellCard} overflow-hidden`} key={scorePulseKey}>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_88px_1fr]">
                    <div className="px-5 py-6 md:px-8 md:py-8">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
                                Player
                            </span>
                            {onServe === "me" ? <span className={servingBadge}>Serving</span> : null}
                        </div>

                        <div className="text-2xl md:text-3xl font-semibold tracking-tight text-white truncate">
                            {meName}
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3 md:gap-5">
                            <div>
                                <div className={labelClass}>Set</div>
                                <div className="mt-2 text-3xl md:text-5xl font-semibold leading-none text-slate-100">
                                    {setsMe}
                                </div>
                            </div>
                            <div>
                                <div className={labelClass}>Game</div>
                                <div className="mt-2 text-3xl md:text-5xl font-semibold leading-none text-slate-100">
                                    {gamesMe}
                                </div>
                            </div>
                            <div>
                                <div className={labelClass}>Point</div>
                                <div className="mt-2 text-4xl md:text-6xl font-bold leading-none text-sky-300">
                                    {pointScoreMe}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:flex flex-col items-center justify-center border-x border-slate-800/80 bg-slate-950/55">
                        <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                            VS
                        </div>
                    </div>

                    <div className="px-5 py-6 md:px-8 md:py-8 border-t border-slate-800/80 lg:border-t-0">
                        <div className="flex items-center justify-end gap-2 mb-3">
                            {onServe === "opponent" ? <span className={servingBadge}>Serving</span> : null}
                            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
                                Opponent
                            </span>
                        </div>

                        <div className="text-right text-2xl md:text-3xl font-semibold tracking-tight text-white truncate">
                            {oppName}
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3 md:gap-5 text-right">
                            <div>
                                <div className={labelClass}>Set</div>
                                <div className="mt-2 text-3xl md:text-5xl font-semibold leading-none text-slate-100">
                                    {setsOpp}
                                </div>
                            </div>
                            <div>
                                <div className={labelClass}>Game</div>
                                <div className="mt-2 text-3xl md:text-5xl font-semibold leading-none text-slate-100">
                                    {gamesOpp}
                                </div>
                            </div>
                            <div>
                                <div className={labelClass}>Point</div>
                                <div className="mt-2 text-4xl md:text-6xl font-bold leading-none text-sky-300">
                                    {pointScoreOpp}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-px border-t border-slate-800/80 bg-slate-800/80">
                    <div className="bg-slate-950/80 px-4 py-4">
                        <div className={labelClass}>Point Win</div>
                        <div className="mt-2 text-3xl font-bold tracking-tight text-emerald-300">
                            {pointProbability}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                            Estimated probability
                        </div>
                    </div>

                    <div className="bg-slate-950/80 px-4 py-4">
                        <div className={labelClass}>Confidence</div>
                        <div className="mt-3">
                            <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${mapConfidenceTone(
                                    tacticalConfidence
                                )}`}
                            >
                                {tacticalConfidence || "N/A"}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                            Model confidence band
                        </div>
                    </div>

                    <div className="bg-slate-950/80 px-4 py-4">
                        <div className={labelClass}>Momentum</div>
                        <div className="mt-3">
                            <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${mapMomentumTone(
                                    momentumState
                                )}`}
                            >
                                {momentumState || "NEUTRAL"}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                            Current live state
                        </div>
                    </div>

                    <div className="bg-slate-950/80 px-4 py-4">
                        <div className={labelClass}>Pressure</div>
                        <div className="mt-3">
                            <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${pressureTone}`}
                            >
                                {pressureLabel}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                            Current score situation
                        </div>
                    </div>

                    <div className="bg-slate-950/80 px-4 py-4">
                        <div className={labelClass}>Points Logged</div>
                        <div className="mt-2 text-3xl font-bold tracking-tight text-sky-300">
                            {recordedPoints}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                            Current live dataset
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-[24px] border border-sky-500/20 bg-[linear-gradient(135deg,rgba(8,47,73,0.40),rgba(15,23,42,0.96),rgba(6,78,59,0.22))] px-5 py-5 md:px-6 md:py-6 shadow-[0_16px_34px_rgba(0,0,0,0.25)]">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-sky-300 font-bold">
                            Tactical Insight
                        </div>
                        <div className="mt-2 text-sm md:text-base font-semibold leading-relaxed text-slate-50">
                            {tacticalCall}
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-500 md:pl-6 md:text-right">
                        Real-time coaching layer
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveMatchHero;