import React, { useMemo } from "react";
import type {
    FastMacroPattern,
    FinishShot,
    FinishType,
    KeyEvent,
    RallyPhase,
    ReturnType,
    ServeDirection,
    ServeQuality,
} from "./liveTypes";

interface FastTagPanelProps {
    pendingWinner: "me" | "opponent" | null;
    macroPattern: FastMacroPattern | null;
    finishType: FinishType | null;
    showAdvanced: boolean;
    serveNumber: 1 | 2 | "ACE";
    serveDirection: ServeDirection | null;
    serveQuality: ServeQuality | null;
    returnType: ReturnType | null;
    rallyPhase: RallyPhase | null;
    keyEvent: KeyEvent;
    finishShot: FinishShot | null;
    loading: boolean;
    canUndo: boolean;
    onPendingWinnerChange: (value: "me" | "opponent") => void;
    onMacroPatternChange: (value: FastMacroPattern) => void;
    onFinishTypeChange: (value: FinishType) => void;
    onToggleAdvanced: () => void;
    onServeNumberChange: (value: 1 | 2 | "ACE") => void;
    onServeDirectionChange: (value: ServeDirection) => void;
    onServeQualityChange: (value: ServeQuality) => void;
    onReturnTypeChange: (value: ReturnType) => void;
    onRallyPhaseChange: (value: RallyPhase) => void;
    onKeyEventChange: (value: KeyEvent) => void;
    onFinishShotChange: (value: FinishShot) => void;
    onUndo: () => void;
    onRegister: () => void;
    isPlayerOnServe?: boolean;
}

// ── Styling ──────────────────────────────────────────────────────────

const sectionCard =
    "rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] shadow-[0_20px_45px_rgba(0,0,0,0.30)]";

const basePill =
    "px-4 py-3 rounded-xl border text-[13px] font-semibold transition-all min-h-[48px] shadow-sm select-none";

type Tone = "emerald" | "rose" | "sky" | "amber" | "violet" | "cyan" | "slate";

function pillClass(active: boolean, tone: Tone, disabled = false) {
    if (disabled) {
        return `${basePill} border-slate-800 bg-slate-950/60 text-slate-700 cursor-not-allowed opacity-40`;
    }
    if (!active) {
        return `${basePill} border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:bg-slate-800/90 hover:scale-[1.02] active:scale-95`;
    }
    const toneMap: Record<Tone, string> = {
        emerald: `${basePill} border-emerald-500/50 bg-emerald-500/20 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.02]`,
        rose: `${basePill} border-rose-500/50 bg-rose-500/20 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)] scale-[1.02]`,
        sky: `${basePill} border-sky-500/50 bg-sky-500/20 text-sky-100 shadow-[0_0_12px_rgba(14,165,233,0.3)] scale-[1.02]`,
        amber: `${basePill} border-amber-500/50 bg-amber-500/20 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-[1.02]`,
        violet: `${basePill} border-violet-500/50 bg-violet-500/20 text-violet-100 shadow-[0_0_12px_rgba(139,92,246,0.3)] scale-[1.02]`,
        cyan: `${basePill} border-cyan-500/50 bg-cyan-500/20 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-[1.02]`,
        slate: `${basePill} border-slate-500/50 bg-slate-500/20 text-slate-100 scale-[1.02]`,
    };
    return toneMap[tone];
}

function chipClass(tone: Tone) {
    const map: Record<Tone, string> = {
        emerald: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
        rose: "border-rose-500/40 bg-rose-500/15 text-rose-200",
        sky: "border-sky-500/40 bg-sky-500/15 text-sky-200",
        amber: "border-amber-500/40 bg-amber-500/15 text-amber-200",
        violet: "border-violet-500/40 bg-violet-500/15 text-violet-200",
        cyan: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
        slate: "border-slate-500/40 bg-slate-500/15 text-slate-200",
    };
    return `px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${map[tone]}`;
}

// ── Label helpers ────────────────────────────────────────────────────

function macroLabel(value: FastMacroPattern) {
    const m: Record<FastMacroPattern, string> = {
        SERVE_DOMINANT: "Servizio dominante",
        AGGRESSIVE_RETURN: "Risposta aggressiva",
        SHORT_RALLY: "Rally breve",
        MEDIUM_RALLY: "Rally medio",
        LONG_RALLY: "Rally lungo",
        SHORT_BALL_ATTACK: "Attacco su palla corta",
        NET_PLAY: "Gioco a rete",
        DEFENSE_RECOVERY: "Difesa / recupero",
        PASSING_LOB: "Passante / lob",
    };
    return m[value] || value;
}

function finishTypeLabel(value: FinishType) {
    const m: Record<FinishType, string> = {
        WINNER: "Vincente",
        FORCED_ERROR: "Errore forzato",
        UNFORCED_ERROR: "Errore non forzato",
    };
    return m[value] || value;
}

function serveDirectionLabel(v: ServeDirection) {
    return v === "T" ? "Alla T" : v === "BODY" ? "Corpo" : "Esterno";
}

function serveQualityLabel(v: ServeQuality) {
    return v === "SAFE" ? "Sicuro" : v === "AGGRESSIVE" ? "Aggressivo" : "Debole";
}

function returnTypeLabel(v: ReturnType) {
    const m: Record<ReturnType, string> = { DEEP: "Profonda", SHORT: "Corta", ANGLED: "Angolata", CENTRAL: "Centrale", BLOCKED: "Bloccata", AGGRESSIVE: "Aggressiva" };
    return m[v] || v;
}

function rallyPhaseLabel(v: RallyPhase) {
    const m: Record<RallyPhase, string> = { NEUTRAL: "Neutro", ATTACK_ME: "Attacco mio", ATTACK_OPP: "Attacco avversario", DEFENSE_ME: "Difesa mia", DEFENSE_OPP: "Difesa avversario" };
    return m[v] || v;
}

function keyEventLabel(v: KeyEvent) {
    const m: Record<KeyEvent, string> = { NONE: "Nessuno", DROP_SHOT: "Palla corta", NET_APPROACH: "Rete", LOB: "Lob", PASSING: "Passante", LINE_CHANGE: "Lungolinea", INSIDE_OUT: "Inside-out", INSIDE_IN: "Inside-in" };
    return m[v] || v;
}

function finishShotLabel(v: FinishShot) {
    const m: Record<FinishShot, string> = { SERVE: "Servizio", FOREHAND: "Diritto", BACKHAND: "Rovescio", VOLLEY: "Volée", SMASH: "Smash", PASSING: "Passante", OTHER: "Altro" };
    return m[v] || v;
}

// ── Logical rules ────────────────────────────────────────────────────
//
// These functions produce the set of available options for each tag
// based on WHO is serving and WHO won the point, following tennis logic.
//

/** Which macro patterns are valid given the serve/return & winner context */
function getAvailablePatterns(
    isPlayerOnServe: boolean,
    pendingWinner: "me" | "opponent" | null
): Set<FastMacroPattern> {
    const all: FastMacroPattern[] = [
        "SERVE_DOMINANT", "AGGRESSIVE_RETURN", "SHORT_RALLY", "MEDIUM_RALLY",
        "LONG_RALLY", "SHORT_BALL_ATTACK", "NET_PLAY", "DEFENSE_RECOVERY", "PASSING_LOB",
    ];
    if (!pendingWinner) return new Set(all);

    const serverWon =
        (isPlayerOnServe && pendingWinner === "me") ||
        (!isPlayerOnServe && pendingWinner === "opponent");

    const returnerWon =
        (isPlayerOnServe && pendingWinner === "opponent") ||
        (!isPlayerOnServe && pendingWinner === "me");

    const available = new Set<FastMacroPattern>([
        "SHORT_RALLY", "MEDIUM_RALLY", "LONG_RALLY",
        "SHORT_BALL_ATTACK", "NET_PLAY", "PASSING_LOB",
    ]);

    // SERVE_DOMINANT only if the server won
    if (serverWon) available.add("SERVE_DOMINANT");
    // AGGRESSIVE_RETURN only if the returner won
    if (returnerWon) available.add("AGGRESSIVE_RETURN");
    // DEFENSE_RECOVERY makes sense both ways
    available.add("DEFENSE_RECOVERY");

    return available;
}

/** Which finish shots make sense given the selected macro pattern */
function getAvailableFinishShots(
    macroPattern: FastMacroPattern | null
): Set<FinishShot> {
    const all: FinishShot[] = ["SERVE", "FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"];

    if (!macroPattern) return new Set(all);

    switch (macroPattern) {
        case "SERVE_DOMINANT":
            // Serve-focused: Serve is the primary shot; groundstrokes possible on +1
            return new Set<FinishShot>(["SERVE", "FOREHAND", "BACKHAND"]);
        case "NET_PLAY":
            // Net patterns: volley and smash dominate
            return new Set<FinishShot>(["VOLLEY", "SMASH", "FOREHAND", "BACKHAND", "OTHER"]);
        case "PASSING_LOB":
            return new Set<FinishShot>(["PASSING", "FOREHAND", "BACKHAND", "OTHER"]);
        default:
            // Rally patterns: groundstrokes dominate, no "SERVE"
            return new Set<FinishShot>(["FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"]);
    }
}

/** Whether return type tag is relevant */
function isReturnTypeRelevant(macroPattern: FastMacroPattern | null): boolean {
    // Return type is irrelevant for serve-dominant (the return barely happened)
    if (macroPattern === "SERVE_DOMINANT") return false;
    return true;
}

/** Which key events make sense for the selected macro pattern */
function getAvailableKeyEvents(macroPattern: FastMacroPattern | null): Set<KeyEvent> {
    const all: KeyEvent[] = ["NONE", "DROP_SHOT", "NET_APPROACH", "LOB", "PASSING", "LINE_CHANGE", "INSIDE_OUT", "INSIDE_IN"];
    if (!macroPattern) return new Set(all);

    switch (macroPattern) {
        case "SERVE_DOMINANT":
            return new Set<KeyEvent>(["NONE"]);
        case "NET_PLAY":
            return new Set<KeyEvent>(["NET_APPROACH", "DROP_SHOT", "NONE"]);
        case "PASSING_LOB":
            return new Set<KeyEvent>(["PASSING", "LOB", "LINE_CHANGE", "NONE"]);
        case "DEFENSE_RECOVERY":
            return new Set<KeyEvent>(["NONE", "LOB", "PASSING", "LINE_CHANGE"]);
        default:
            return new Set(all);
    }
}

// ── Wizard Steps ─────────────────────────────────────────────────────

const STEP_LABELS = [
    "Winner",
    "Serve",
    "Pattern",
    "Finish",
    "Review",
];

// ── Component ────────────────────────────────────────────────────────

const FastTagPanel: React.FC<FastTagPanelProps> = ({
    pendingWinner,
    macroPattern,
    finishType,
    serveNumber,
    serveDirection,
    serveQuality,
    returnType,
    rallyPhase,
    keyEvent,
    finishShot,
    loading,
    canUndo,
    onPendingWinnerChange,
    onMacroPatternChange,
    onFinishTypeChange,
    onServeNumberChange,
    onServeDirectionChange,
    onServeQualityChange,
    onReturnTypeChange,
    onRallyPhaseChange,
    onKeyEventChange,
    onFinishShotChange,
    onUndo,
    onRegister,
    isPlayerOnServe = true,
}) => {
    // ── Wizard state via derived logic ───────────────────────────────
    const currentStep = useMemo(() => {
        if (!pendingWinner) return 0;
        if (!serveDirection && !serveQuality && serveNumber !== "ACE") return 1;
        if (!macroPattern) return 2;
        if (!finishType) return 3;
        return 4;
    }, [pendingWinner, serveDirection, serveQuality, serveNumber, macroPattern, finishType]);

    // ── Contextual rule sets ─────────────────────────────────────────
    const availablePatterns = useMemo(
        () => getAvailablePatterns(isPlayerOnServe, pendingWinner),
        [isPlayerOnServe, pendingWinner]
    );
    const availableFinishShots = useMemo(
        () => getAvailableFinishShots(macroPattern),
        [macroPattern]
    );
    const showReturnType = useMemo(
        () => isReturnTypeRelevant(macroPattern),
        [macroPattern]
    );
    const availableKeyEvents = useMemo(
        () => getAvailableKeyEvents(macroPattern),
        [macroPattern]
    );

    // ── ACE auto-fill ────────────────────────────────────────────────
    const handleServeNumberClick = (n: 1 | 2 | "ACE") => {
        onServeNumberChange(n);
        if (n === "ACE") {
            onPendingWinnerChange(isPlayerOnServe ? "me" : "opponent");
            onMacroPatternChange("SERVE_DOMINANT");
            onFinishTypeChange("WINNER");
            onFinishShotChange("SERVE");
        }
    };

    // ── Summary chips ────────────────────────────────────────────────
    const summaryChips: { label: string; tone: Tone }[] = [];
    if (pendingWinner) summaryChips.push({
        label: pendingWinner === "me" ? "Player" : "Opponent",
        tone: pendingWinner === "me" ? "emerald" : "rose",
    });
    if (serveNumber === "ACE") {
        summaryChips.push({ label: "ACE", tone: "emerald" });
    } else {
        if (serveDirection) summaryChips.push({ label: serveDirectionLabel(serveDirection), tone: "violet" });
        if (serveQuality) summaryChips.push({ label: serveQualityLabel(serveQuality), tone: "cyan" });
    }
    if (macroPattern) summaryChips.push({ label: macroLabel(macroPattern), tone: "sky" });
    if (returnType) summaryChips.push({ label: returnTypeLabel(returnType), tone: "emerald" });
    if (rallyPhase && rallyPhase !== "NEUTRAL") summaryChips.push({ label: rallyPhaseLabel(rallyPhase), tone: "violet" });
    if (keyEvent && keyEvent !== "NONE") summaryChips.push({ label: keyEventLabel(keyEvent), tone: "amber" });
    if (finishType) summaryChips.push({ label: finishTypeLabel(finishType), tone: "amber" });
    if (finishShot) summaryChips.push({ label: finishShotLabel(finishShot), tone: "cyan" });

    const canSubmit = pendingWinner && macroPattern && finishType;

    // ── Helper for sub-label text ────────────────────────────────────
    const subLabel = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-3";
    const optionalTag = <span className="ml-1.5 text-slate-600 normal-case tracking-normal">(opzionale)</span>;

    return (
        <div className={`${sectionCard} overflow-hidden`}>
            {/* ── Header with step progress ─────────────────────────── */}
            <div className="px-5 py-4 md:px-6 border-b border-slate-800/80">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold">
                    Live Tag Console
                </div>
                <div className="mt-1 text-lg font-semibold tracking-tight text-slate-50">
                    Registra punto
                </div>

                {/* Progress bar */}
                <div className="mt-4 flex items-center gap-1.5">
                    {STEP_LABELS.map((label, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                                    i < currentStep
                                        ? "bg-emerald-500"
                                        : i === currentStep
                                            ? "bg-sky-400 animate-pulse"
                                            : "bg-slate-800"
                                }`}
                            />
                            <span
                                className={`text-[9px] font-medium transition-colors ${
                                    i <= currentStep ? "text-slate-300" : "text-slate-600"
                                }`}
                            >
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Summary chips ────────────────────────────────────── */}
            {summaryChips.length > 0 && (
                <div className="px-5 py-3 md:px-6 border-b border-slate-800/60 flex flex-wrap gap-1.5">
                    {summaryChips.map((chip, i) => (
                        <span key={i} className={chipClass(chip.tone)}>
                            {chip.label}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Wizard body ──────────────────────────────────────── */}
            <div className="px-5 py-5 md:px-6 md:py-6">
                {/* ─── Step 0: Winner ─────────────────────────────── */}
                {currentStep === 0 && (
                    <div className="animate-[fadeIn_0.3s_ease-out]">
                        <div className="text-[13px] font-bold text-slate-100 mb-4">
                            Chi ha vinto il punto?
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onPendingWinnerChange("me")}
                                className="flex items-center justify-center rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 p-6 min-h-[72px] text-emerald-100 font-bold text-lg tracking-wide transition hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:scale-[1.02] active:scale-95"
                            >
                                PLAYER
                            </button>
                            <button
                                onClick={() => onPendingWinnerChange("opponent")}
                                className="flex items-center justify-center rounded-2xl border-2 border-rose-500/30 bg-rose-500/10 p-6 min-h-[72px] text-rose-100 font-bold text-lg tracking-wide transition hover:bg-rose-500/20 hover:border-rose-400/50 hover:scale-[1.02] active:scale-95"
                            >
                                OPPONENT
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Step 1: Serve ──────────────────────────────── */}
                {currentStep === 1 && (
                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-5">
                        <div className="text-[13px] font-bold text-slate-100 mb-1">
                            {isPlayerOnServe ? "Servizio del Player" : "Servizio dell'Opponent"}
                        </div>

                        {/* Serve number / ACE */}
                        <div>
                            <div className={subLabel}>Battuta</div>
                            <div className="flex flex-wrap gap-2.5">
                                {([1, 2] as const).map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => handleServeNumberClick(n)}
                                        className={pillClass(serveNumber === n, "violet")}
                                    >
                                        {n}ª di servizio
                                    </button>
                                ))}
                                <button
                                    onClick={() => handleServeNumberClick("ACE")}
                                    className={pillClass(serveNumber === "ACE", "emerald")}
                                >
                                    ACE
                                </button>
                            </div>
                        </div>

                        {/* Direction */}
                        <div>
                            <div className={subLabel}>Direzione</div>
                            <div className="flex flex-wrap gap-2.5">
                                {(["T", "BODY", "WIDE"] as const).map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => onServeDirectionChange(v)}
                                        className={pillClass(serveDirection === v, "sky")}
                                    >
                                        {serveDirectionLabel(v)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quality */}
                        <div>
                            <div className={subLabel}>Qualità</div>
                            <div className="flex flex-wrap gap-2.5">
                                {(["SAFE", "AGGRESSIVE", "WEAK"] as const).map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => onServeQualityChange(v)}
                                        className={pillClass(serveQuality === v, "cyan")}
                                    >
                                        {serveQualityLabel(v)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Skip */}
                        <button
                            onClick={() => {
                                if (!serveDirection) onServeDirectionChange("T");
                                if (!serveQuality) onServeQualityChange("SAFE");
                            }}
                            className="mt-2 self-end rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-[12px] font-semibold text-slate-400 transition hover:text-slate-200 hover:border-slate-600"
                        >
                            Salta dettagli servizio →
                        </button>
                    </div>
                )}

                {/* ─── Step 2: Rally pattern ─────────────────────── */}
                {currentStep === 2 && (
                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-5">
                        <div className="text-[13px] font-bold text-slate-100 mb-1">
                            Com'è stato il punto?
                        </div>

                        {/* Macro pattern — only available options shown enabled */}
                        <div>
                            <div className={subLabel}>Schema prevalente</div>
                            <div className="flex flex-wrap gap-2.5">
                                {([
                                    "SERVE_DOMINANT",
                                    "AGGRESSIVE_RETURN",
                                    "SHORT_RALLY",
                                    "MEDIUM_RALLY",
                                    "LONG_RALLY",
                                    "SHORT_BALL_ATTACK",
                                    "NET_PLAY",
                                    "DEFENSE_RECOVERY",
                                    "PASSING_LOB",
                                ] as const).map((value) => {
                                    const allowed = availablePatterns.has(value);
                                    return (
                                        <button
                                            key={value}
                                            onClick={() => allowed && onMacroPatternChange(value)}
                                            className={pillClass(macroPattern === value, "sky", !allowed)}
                                            disabled={!allowed}
                                        >
                                            {macroLabel(value)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Return type — hidden when not relevant */}
                        {showReturnType && (
                            <div>
                                <div className={subLabel}>
                                    Tipo di risposta
                                    {optionalTag}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(["DEEP", "SHORT", "ANGLED", "CENTRAL", "BLOCKED", "AGGRESSIVE"] as const).map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => onReturnTypeChange(v)}
                                            className={pillClass(returnType === v, "emerald")}
                                        >
                                            {returnTypeLabel(v)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rally phase */}
                        <div>
                            <div className={subLabel}>
                                Fase del rally
                                {optionalTag}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(["NEUTRAL", "ATTACK_ME", "ATTACK_OPP", "DEFENSE_ME", "DEFENSE_OPP"] as const).map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => onRallyPhaseChange(v)}
                                        className={pillClass(rallyPhase === v, "violet")}
                                    >
                                        {rallyPhaseLabel(v)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 3: Finish details ────────────────────── */}
                {currentStep === 3 && (
                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-5">
                        <div className="text-[13px] font-bold text-slate-100 mb-1">
                            Come si è chiuso il punto?
                        </div>

                        {/* Finish type */}
                        <div>
                            <div className={subLabel}>Esito</div>
                            <div className="flex flex-wrap gap-2.5">
                                {(["WINNER", "FORCED_ERROR", "UNFORCED_ERROR"] as const).map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => onFinishTypeChange(value)}
                                        className={pillClass(finishType === value, "amber")}
                                    >
                                        {finishTypeLabel(value)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Finish shot — filtered by pattern context */}
                        <div>
                            <div className={subLabel}>
                                Colpo finale
                                {optionalTag}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(["SERVE", "FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"] as const).map((v) => {
                                    const allowed = availableFinishShots.has(v);
                                    return (
                                        <button
                                            key={v}
                                            onClick={() => allowed && onFinishShotChange(v)}
                                            className={pillClass(finishShot === v, "cyan", !allowed)}
                                            disabled={!allowed}
                                        >
                                            {finishShotLabel(v)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Key event — filtered by pattern context */}
                        <div>
                            <div className={subLabel}>
                                Evento chiave
                                {optionalTag}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(["NONE", "DROP_SHOT", "NET_APPROACH", "LOB", "PASSING", "LINE_CHANGE", "INSIDE_OUT", "INSIDE_IN"] as const).map((v) => {
                                    const allowed = availableKeyEvents.has(v);
                                    return (
                                        <button
                                            key={v}
                                            onClick={() => allowed && onKeyEventChange(v)}
                                            className={pillClass(keyEvent === v, "amber", !allowed)}
                                            disabled={!allowed}
                                        >
                                            {keyEventLabel(v)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 4: Review & submit ───────────────────── */}
                {currentStep === 4 && (
                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-4">
                        <div className="text-[13px] font-bold text-slate-100 mb-1">
                            Riepilogo punto
                        </div>

                        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${pendingWinner === "me" ? "bg-emerald-400" : "bg-rose-400"}`} />
                                <span className="text-[13px] font-semibold text-slate-100">
                                    {pendingWinner === "me" ? "Punto Player" : "Punto Opponent"}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                                {serveDirection && (
                                    <><span className="text-slate-500">Servizio</span><span className="text-slate-200">{serveDirectionLabel(serveDirection)}{serveQuality ? ` · ${serveQualityLabel(serveQuality)}` : ""}</span></>
                                )}
                                {serveNumber === "ACE" && (
                                    <><span className="text-slate-500">Servizio</span><span className="text-emerald-300 font-semibold">ACE</span></>
                                )}
                                {macroPattern && (
                                    <><span className="text-slate-500">Schema</span><span className="text-slate-200">{macroLabel(macroPattern)}</span></>
                                )}
                                {returnType && (
                                    <><span className="text-slate-500">Risposta</span><span className="text-slate-200">{returnTypeLabel(returnType)}</span></>
                                )}
                                {rallyPhase && rallyPhase !== "NEUTRAL" && (
                                    <><span className="text-slate-500">Rally</span><span className="text-slate-200">{rallyPhaseLabel(rallyPhase)}</span></>
                                )}
                                {finishType && (
                                    <><span className="text-slate-500">Chiusura</span><span className="text-slate-200">{finishTypeLabel(finishType)}</span></>
                                )}
                                {finishShot && (
                                    <><span className="text-slate-500">Colpo</span><span className="text-slate-200">{finishShotLabel(finishShot)}</span></>
                                )}
                                {keyEvent && keyEvent !== "NONE" && (
                                    <><span className="text-slate-500">Evento</span><span className="text-slate-200">{keyEventLabel(keyEvent)}</span></>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Bottom bar (sticky) ──────────────────────────────── */}
            <div className="sticky bottom-0 z-20 border-t border-slate-800/80 bg-[rgba(2,6,23,0.96)] backdrop-blur-lg px-5 py-4 md:px-6 flex flex-col gap-2.5">
                {canSubmit ? (
                    <button
                        onClick={onRegister}
                        disabled={loading}
                        className="rounded-[18px] bg-emerald-600 px-6 py-4 min-h-[56px] shadow-[0_10px_30px_rgba(16,185,129,0.25)] text-[14px] font-bold text-white transition hover:bg-emerald-500 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        {loading ? "Analisi tattica..." : "Registra punto e analizza"}
                    </button>
                ) : (
                    <div className="rounded-[18px] border border-slate-800 bg-slate-900/60 px-6 py-4 min-h-[56px] text-center text-[13px] text-slate-500 font-medium">
                        Completa i passi sopra per registrare
                    </div>
                )}

                <div className="flex gap-2">
                    {currentStep > 0 && (
                        <button
                            onClick={() => {
                                // Step 4→3: undo finish selection
                                if (currentStep === 4) {
                                    onFinishTypeChange(null as unknown as FinishType);
                                    onFinishShotChange(null as unknown as FinishShot);
                                    onKeyEventChange("NONE");
                                }
                                // Step 3→2: undo macro pattern selection
                                else if (currentStep === 3) {
                                    onMacroPatternChange(null as unknown as FastMacroPattern);
                                    onReturnTypeChange(null as unknown as ReturnType);
                                    onRallyPhaseChange(null as unknown as RallyPhase);
                                }
                                // Step 2→1: undo serve details
                                else if (currentStep === 2) {
                                    onServeDirectionChange(null as unknown as ServeDirection);
                                    onServeQualityChange(null as unknown as ServeQuality);
                                    onServeNumberChange(1);
                                }
                                // Step 1→0: undo winner selection
                                else if (currentStep === 1) {
                                    onPendingWinnerChange(null as unknown as "me");
                                }
                            }}
                            className="flex-1 rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2.5 text-[12px] font-semibold text-slate-400 transition hover:text-slate-200 hover:border-slate-600 active:scale-95"
                        >
                            ← Indietro
                        </button>
                    )}

                    <button
                        onClick={onUndo}
                        disabled={!canUndo || loading}
                        className="flex-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[12px] font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-30"
                    >
                        Correggi ultimo punto
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FastTagPanel;