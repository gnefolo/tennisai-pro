// src/components/live/LiveMatchHero.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: props, tipi, funzioni helper e handler sono identici all'originale.
//     Modificati esclusivamente: className, colori inline, border, shadow, font tokens.

import React from "react";
import { SettingsIcon, RefreshIcon } from "../../components/ui/icons"

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
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

// ─── DESIGN TOKENS (sostituiscono le costanti hardcoded) ─────────────────────
// Shell card: court-night con gradient, bordo sottile, elevation e-3
const shellCard =
    "rounded-[28px] border border-white/[0.06] " +
    "bg-[linear-gradient(180deg,rgba(11,18,32,0.96),rgba(5,9,18,0.99))] " +
    "shadow-[0_24px_60px_rgba(0,0,0,0.40)]";

// Meta pill: net-graphite border, bg court-night/80
const metaPill =
    "inline-flex items-center rounded-full border border-white/10 " +
    "bg-court-night/80 px-3 py-1 " +
    "text-[10px] font-semibold uppercase tracking-[0.18em] text-fog";

// Label piccola
const labelClass =
    "text-[10px] uppercase tracking-[0.20em] text-fog/60 font-semibold";

// Badge "Serving": ace-lime invece di sky-blue
const servingBadge =
    "inline-flex items-center gap-1 rounded-full " +
    "border border-ace-lime/40 bg-ace-lime/10 " +
    "px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-ace-lime";

// ─── FUNZIONI HELPER (invariate) ─────────────────────────────────────────────
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
            tone: "border-clay-amber/30 bg-clay-amber/10 text-clay-amber",
        };
    }
    if (isGamePointAgainst) {
        return {
            label: "Game Point Against",
            tone: "border-error/30 bg-error/10 text-error",
        };
    }
    if (isBreakPoint) {
        return {
            label: onServe === "me" ? "Break Point Against" : "Break Point For",
            tone:
                onServe === "me"
                    ? "border-error/30 bg-error/10 text-error"
                    : "border-success/30 bg-success/10 text-success",
        };
    }
    if (isGamePoint) {
        return {
            label: onServe === "me" ? "Game Point For" : "Game Point Opponent",
            tone:
                onServe === "me"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-clay-amber/30 bg-clay-amber/10 text-clay-amber",
        };
    }
    return {
        label: "Neutral Point",
        tone: "border-white/10 bg-court-night/70 text-fog",
    };
}

function mapConfidenceTone(confidence?: string) {
    switch (confidence) {
        case "HIGH": return "border-success/30 bg-success/10 text-success";
        case "MEDIUM": return "border-clay-amber/30 bg-clay-amber/10 text-clay-amber";
        case "LOW": return "border-error/30 bg-error/10 text-error";
        default: return "border-white/10 bg-court-night/70 text-fog";
    }
}

function mapMomentumTone(momentum?: string) {
    switch (momentum) {
        case "HOT": return "border-success/30 bg-success/10 text-success";
        case "COLD": return "border-error/30 bg-error/10 text-error";
        default: return "border-white/10 bg-court-night/70 text-fog";
    }
}

function mapPressureTone(pressure?: string) {
    switch (pressure) {
        case "BREAK_POINT_FOR":
        case "GAME_POINT_FOR":
            return "border-success/30 bg-success/10 text-success";
        case "BREAK_POINT_AGAINST":
        case "GAME_POINT_AGAINST":
            return "border-error/30 bg-error/10 text-error";
        default:
            return "border-white/10 bg-court-night/70 text-fog";
    }
}

function mapPressureLabel(pressure?: string) {
    switch (pressure) {
        case "BREAK_POINT_FOR": return "Break Point For";
        case "BREAK_POINT_AGAINST": return "Break Point Against";
        case "GAME_POINT_FOR": return "Game Point For";
        case "GAME_POINT_AGAINST": return "Game Point Against";
        case "NEUTRAL": return "Neutral Point";
        default: return null;
    }
}

// ─── COMPONENTE (struttura JSX invariata, solo className aggiornati) ──────────
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

    const pressureFallback = getPressureStateFallback(pointScoreMe, pointScoreOpp, onServe);
    const pressureLabel = mapPressureLabel(pressureState) ?? pressureFallback.label;
    const pressureTone = pressureState ? mapPressureTone(pressureState) : pressureFallback.tone;

    return (
        <div className="flex flex-col gap-5">

            {/* ── Row 1: LIVE badge + meta pills + action buttons ── */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap items-center gap-2">
                    {/* LIVE badge — success color dal design system */}
                    <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.20em] text-success">
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
                            className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/10 bg-court-night/80 px-4 py-2 text-[13px] font-semibold text-fog transition-all duration-[var(--dur-fast)] hover:border-ace-lime/40 hover:text-baseline"
                        >
                            <SettingsIcon size={16} />
                            Impostazioni Match
                        </button>
                    )}
                    {onResetMatch && (
                        <button
                            onClick={onResetMatch}
                            className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-error/20 bg-error/5 px-4 py-2 text-[13px] font-semibold text-error/70 transition-all duration-[var(--dur-fast)] hover:border-error/50 hover:bg-error/10 hover:text-error"
                        >
                            <RefreshIcon size={16} />
                            Reset Match
                        </button>
                    )}
                </div>
            </div>

            {/* ── Row 2: Tournament name + Set/Game/Point counters ── */}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold">
                        Match Center
                    </div>
                    <div className="mt-1 font-head text-xl md:text-2xl font-semibold tracking-tight text-baseline">
                        {tournament}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={metaPill}>Set {setNumber}</span>
                    <span className={metaPill}>Game {gameNumber}</span>
                    <span className={metaPill}>Point {pointNumber}</span>
                </div>
            </div>

            {/* ── Scoreboard card ── */}
            <div className={`${shellCard} overflow-hidden`} key={scorePulseKey}>

                {/* Player vs Opponent scores */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_88px_1fr]">

                    {/* ME */}
                    <div className="px-5 py-6 md:px-8 md:py-8">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-fog/50 font-semibold">
                                Player
                            </span>
                            {onServe === "me" ? <span className={servingBadge}>Serving</span> : null}
                        </div>
                        <div className="font-head text-2xl md:text-3xl font-semibold tracking-tight text-baseline truncate">
                            {meName}
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-3 md:gap-5">
                            <div>
                                <div className={labelClass}>Set</div>
                                <div className="mt-2 font-head text-3xl md:text-5xl font-semibold leading-none text-baseline">
                                    {setsMe}
                                </div>
                            </div>
                            <div>
                                <div className={labelClass}>Game</div>
                                <div className="mt-2 font-head text-3xl md:text-5xl font-semibold leading-none text-baseline">
                                    {gamesMe}
                                </div>
                            </div>
                            <div>
                                <div className={labelClass}>Point</div>
                                {/* Ace Lime per il punteggio punto — accent principale del DS */}
                                <div className="mt-2 font-head text-4xl md:text-6xl font-bold leading-none text-ace-lime">
                                    {pointScoreMe}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider VS */}
                    <div className="hidden lg:flex flex-col items-center justify-center border-x border-white/[0.06] bg-court-night/60">
                        <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-fog/40">
                            VS
                        </div>
                    </div>

                    {/* OPPONENT */}
                    <div className="px-5 py-6 md:px-8 md:py-8 border-t border-white/[0.06] lg:border-t-0">
                        <div className="flex items-center justify-end gap-2 mb-3">
                            {onServe === "opponent" ? <span className={servingBadge}>Serving</span> : null}
                            <span className="text-[11px] uppercase tracking-[0.18em] text-fog/50 font-semibold">
                                Opponent
                            </span>
                        </div>
                        <div className="font-head text-right text-2xl md:text-3xl font-semibold tracking-tight text-baseline truncate">
                            {oppName}
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-3 md:gap-5 text-right">
                            <div>
                                <div className={labelClass}>Set</div>
                                <div className="mt-2 font-head text-3xl md:text-5xl font-semibold leading-none text-baseline">
                                    {setsOpp}
                                </div>
                            </div>
                            <div>
                                <div className={labelClass}>Game</div>
                                <div className="mt-2 font-head text-3xl md:text-5xl font-semibold leading-none text-baseline">
                                    {gamesOpp}
                                </div>
                            </div>
                            <div>
                                <div className={labelClass}>Point</div>
                                <div className="mt-2 font-head text-4xl md:text-6xl font-bold leading-none text-ace-lime">
                                    {pointScoreOpp}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stats bar inferiore ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-px border-t border-white/[0.06] bg-white/[0.04]">

                    {/* Point Win Probability */}
                    <div className="bg-court-night/90 px-4 py-4">
                        <div className={labelClass}>Point Win</div>
                        {/* success green — invariato semanticamente */}
                        <div className="mt-2 font-head text-3xl font-bold tracking-tight text-success">
                            {pointProbability}
                        </div>
                        <div className="mt-1 text-[11px] text-fog/40">Estimated probability</div>
                    </div>

                    {/* Confidence */}
                    <div className="bg-court-night/90 px-4 py-4">
                        <div className={labelClass}>Confidence</div>
                        <div className="mt-3">
                            <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${mapConfidenceTone(tacticalConfidence)}`}
                            >
                                {tacticalConfidence || "N/A"}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-fog/40">Model confidence band</div>
                    </div>

                    {/* Momentum */}
                    <div className="bg-court-night/90 px-4 py-4">
                        <div className={labelClass}>Momentum</div>
                        <div className="mt-3">
                            <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${mapMomentumTone(momentumState)}`}
                            >
                                {momentumState || "NEUTRAL"}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-fog/40">Current live state</div>
                    </div>

                    {/* Pressure */}
                    <div className="bg-court-night/90 px-4 py-4">
                        <div className={labelClass}>Pressure</div>
                        <div className="mt-3">
                            <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${pressureTone}`}
                            >
                                {pressureLabel}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-fog/40">Current score situation</div>
                    </div>

                    {/* Points Logged */}
                    <div className="bg-court-night/90 px-4 py-4">
                        <div className={labelClass}>Points Logged</div>
                        {/* clay-amber: colore dataset/numeri di riferimento */}
                        <div className="mt-2 font-head text-3xl font-bold tracking-tight text-clay-amber">
                            {recordedPoints}
                        </div>
                        <div className="mt-1 text-[11px] text-fog/40">Current live dataset</div>
                    </div>

                </div>
            </div>

            {/* ── Tactical Insight card ── */}
            {/* Bordo ace-lime/20 invece di sky, gradient court-night con lime hint */}
            <div className="rounded-[var(--r-lg)] border border-ace-lime/20 bg-[linear-gradient(135deg,rgba(11,18,32,0.60),rgba(11,18,32,0.97),rgba(212,255,58,0.04))] px-5 py-5 md:px-6 md:py-6 shadow-[var(--e-2)]">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                        {/* Eyebrow label in ace-lime — colore identità del DS */}
                        <div className="text-[10px] uppercase tracking-[0.24em] text-ace-lime font-bold">
                            Tactical Insight
                        </div>
                        <div className="mt-2 font-body text-sm md:text-base font-semibold leading-relaxed text-baseline">
                            {tacticalCall}
                        </div>
                    </div>
                    <div className="text-[11px] text-fog/40 md:pl-6 md:text-right">
                        Real-time coaching layer
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LiveMatchHero;
