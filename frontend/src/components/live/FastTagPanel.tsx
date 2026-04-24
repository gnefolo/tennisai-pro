// src/components/live/FastTagPanel.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: tutti i tipi importati da liveTypes, l'intera logica
//     del wizard (getAvailablePatterns, getAvailableFinishShots, isReturnTypeRelevant,
//     getAvailableKeyEvents, STEP_LABELS), useMemo per currentStep/availablePatterns/
//     availableFinishShots/showReturnType/availableKeyEvents, handleServeNumberClick
//     (ACE auto-fill), summaryChips, canSubmit, step navigation handlers nel bottom
//     bar, onRegister/onUndo, tutti gli helper di label — IDENTICI all'originale.
//     Modificati: sectionCard, basePill, toneMap, chipClass, subLabel, className.

import React, { useMemo } from "react";
import { ArrowRightIcon, RefreshIcon } from "../../components/ui/icons";
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

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
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

// ─── DESIGN TOKEN costanti ───────────────────────────────────────────────────
const sectionCard =
    "rounded-[24px] border border-white/[0.06] " +
    "bg-[linear-gradient(180deg,rgba(11,18,32,0.96),rgba(5,9,18,0.99))] " +
    "shadow-[var(--e-3)]";

// Base pill invariata nella struttura, aggiornata nella palette inattiva
const basePill =
    "px-4 py-3 rounded-xl border text-[13px] font-semibold transition-all " +
    "min-h-[48px] shadow-sm select-none";

// ─── TONE TYPE — rimappato sul DS ────────────────────────────────────────────
// Conserva gli stessi nomi per non rompere le chiamate pillClass(active, tone)
type Tone = "emerald" | "rose" | "sky" | "amber" | "violet" | "cyan" | "slate";

function pillClass(active: boolean, tone: Tone, disabled = false) {
    if (disabled) {
        return `${basePill} border-white/[0.04] bg-white/[0.02] text-fog/20 cursor-not-allowed opacity-40`;
    }
    if (!active) {
        return (
            `${basePill} border-white/[0.08] bg-white/[0.03] text-fog ` +
            `hover:border-white/20 hover:bg-white/[0.06] hover:scale-[1.02] active:scale-95`
        );
    }
    // Stato attivo: rimappatura sul DS mantenendo la stessa struttura del toneMap
    const toneMap: Record<Tone, string> = {
        // emerald → success
        emerald: `${basePill} border-success/40 bg-success/15 text-success shadow-[0_0_12px_rgba(34,197,94,0.25)] scale-[1.02]`,
        // rose → error
        rose: `${basePill} border-error/40 bg-error/15 text-error shadow-[0_0_12px_rgba(239,68,68,0.25)] scale-[1.02]`,
        // sky → ace-lime (accent primario DS)
        sky: `${basePill} border-ace-lime/40 bg-ace-lime/15 text-ace-lime shadow-[0_0_12px_rgba(212,255,58,0.25)] scale-[1.02]`,
        // amber → clay-amber (secondo accent DS)
        amber: `${basePill} border-clay-amber/40 bg-clay-amber/15 text-clay-amber shadow-[0_0_12px_rgba(233,162,59,0.25)] scale-[1.02]`,
        // violet → info blue (token semantico DS)
        violet: `${basePill} border-info/40 bg-info/15 text-info shadow-[0_0_12px_rgba(59,130,246,0.20)] scale-[1.02]`,
        // cyan → ace-lime/60 (variante lime più tenue)
        cyan: `${basePill} border-ace-lime/30 bg-ace-lime/10 text-ace-lime/80 shadow-[0_0_12px_rgba(212,255,58,0.15)] scale-[1.02]`,
        // slate → net-graphite
        slate: `${basePill} border-net-graphite/60 bg-net-graphite/30 text-fog scale-[1.02]`,
    };
    return toneMap[tone];
}

function chipClass(tone: Tone) {
    const map: Record<Tone, string> = {
        emerald: "border-success/30 bg-success/10 text-success",
        rose: "border-error/30 bg-error/10 text-error",
        sky: "border-ace-lime/30 bg-ace-lime/10 text-ace-lime",
        amber: "border-clay-amber/30 bg-clay-amber/10 text-clay-amber",
        violet: "border-info/30 bg-info/10 text-info",
        cyan: "border-ace-lime/20 bg-ace-lime/[0.08] text-ace-lime/70",
        slate: "border-white/10 bg-white/[0.04] text-fog",
    };
    return `px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${map[tone]}`;
}

// ─── LABEL HELPERS (invariati) ───────────────────────────────────────────────
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
    const m: Record<ReturnType, string> = {
        DEEP: "Profonda", SHORT: "Corta", ANGLED: "Angolata",
        CENTRAL: "Centrale", BLOCKED: "Bloccata", AGGRESSIVE: "Aggressiva",
    };
    return m[v] || v;
}
function rallyPhaseLabel(v: RallyPhase) {
    const m: Record<RallyPhase, string> = {
        NEUTRAL: "Neutro", ATTACK_ME: "Attacco mio", ATTACK_OPP: "Attacco avversario",
        DEFENSE_ME: "Difesa mia", DEFENSE_OPP: "Difesa avversario",
    };
    return m[v] || v;
}
function keyEventLabel(v: KeyEvent) {
    const m: Record<KeyEvent, string> = {
        NONE: "Nessuno", DROP_SHOT: "Palla corta", NET_APPROACH: "Rete",
        LOB: "Lob", PASSING: "Passante", LINE_CHANGE: "Lungolinea",
        INSIDE_OUT: "Inside-out", INSIDE_IN: "Inside-in",
    };
    return m[v] || v;
}
function finishShotLabel(v: FinishShot) {
    const m: Record<FinishShot, string> = {
        SERVE: "Servizio", FOREHAND: "Diritto", BACKHAND: "Rovescio",
        VOLLEY: "Volée", SMASH: "Smash", PASSING: "Passante", OTHER: "Altro",
    };
    return m[v] || v;
}

// ─── LOGICAL RULES (invariate — cuore della business logic) ──────────────────
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
        "SHORT_RALLY", "MEDIUM_RALLY", "LONG_RALLY", "SHORT_BALL_ATTACK", "NET_PLAY", "PASSING_LOB",
    ]);
    if (serverWon) available.add("SERVE_DOMINANT");
    if (returnerWon) available.add("AGGRESSIVE_RETURN");
    available.add("DEFENSE_RECOVERY");
    return available;
}

function getAvailableFinishShots(macroPattern: FastMacroPattern | null): Set<FinishShot> {
    if (!macroPattern) return new Set(["SERVE", "FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"]);
    switch (macroPattern) {
        case "SERVE_DOMINANT": return new Set<FinishShot>(["SERVE", "FOREHAND", "BACKHAND"]);
        case "NET_PLAY": return new Set<FinishShot>(["VOLLEY", "SMASH", "FOREHAND", "BACKHAND", "OTHER"]);
        case "PASSING_LOB": return new Set<FinishShot>(["PASSING", "FOREHAND", "BACKHAND", "OTHER"]);
        default: return new Set<FinishShot>(["FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"]);
    }
}

function isReturnTypeRelevant(macroPattern: FastMacroPattern | null): boolean {
    return macroPattern !== "SERVE_DOMINANT";
}

function getAvailableKeyEvents(macroPattern: FastMacroPattern | null): Set<KeyEvent> {
    const all: KeyEvent[] = ["NONE", "DROP_SHOT", "NET_APPROACH", "LOB", "PASSING", "LINE_CHANGE", "INSIDE_OUT", "INSIDE_IN"];
    if (!macroPattern) return new Set(all);
    switch (macroPattern) {
        case "SERVE_DOMINANT": return new Set<KeyEvent>(["NONE"]);
        case "NET_PLAY": return new Set<KeyEvent>(["NET_APPROACH", "DROP_SHOT", "NONE"]);
        case "PASSING_LOB": return new Set<KeyEvent>(["PASSING", "LOB", "LINE_CHANGE", "NONE"]);
        case "DEFENSE_RECOVERY": return new Set<KeyEvent>(["NONE", "LOB", "PASSING", "LINE_CHANGE"]);
        default: return new Set(all);
    }
}

// ─── WIZARD STEPS (invariati) ────────────────────────────────────────────────
const STEP_LABELS = ["Winner", "Serve", "Pattern", "Finish", "Review"];

// ─── STILI LOCALI ────────────────────────────────────────────────────────────
const subLabel =
    "text-[11px] font-semibold uppercase tracking-[0.14em] text-fog/50 mb-3";
const optionalTag = (
    <span className="ml-1.5 text-fog/30 normal-case tracking-normal">(opzionale)</span>
);

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
const FastTagPanel: React.FC<FastTagPanelProps> = ({
    pendingWinner, macroPattern, finishType, serveNumber,
    serveDirection, serveQuality, returnType, rallyPhase,
    keyEvent, finishShot, loading, canUndo,
    onPendingWinnerChange, onMacroPatternChange, onFinishTypeChange,
    onServeNumberChange, onServeDirectionChange, onServeQualityChange,
    onReturnTypeChange, onRallyPhaseChange, onKeyEventChange,
    onFinishShotChange, onUndo, onRegister,
    isPlayerOnServe = true,
}) => {
    // ── Wizard state via derived logic (invariato) ────────────────────────────
    const currentStep = useMemo(() => {
        if (!pendingWinner) return 0;
        if ((!serveDirection || !serveQuality) && serveNumber !== "ACE") return 1;
        if (!macroPattern) return 2;
        if (!finishType) return 3;
        return 4;
    }, [pendingWinner, serveDirection, serveQuality, serveNumber, macroPattern, finishType]);

    // ── Contextual rule sets (invariati) ─────────────────────────────────────
    const availablePatterns = useMemo(() => getAvailablePatterns(isPlayerOnServe, pendingWinner), [isPlayerOnServe, pendingWinner]);
    const availableFinishShots = useMemo(() => getAvailableFinishShots(macroPattern), [macroPattern]);
    const showReturnType = useMemo(() => isReturnTypeRelevant(macroPattern), [macroPattern]);
    const availableKeyEvents = useMemo(() => getAvailableKeyEvents(macroPattern), [macroPattern]);

    // ── ACE auto-fill (invariato) ─────────────────────────────────────────────
    const handleServeNumberClick = (n: 1 | 2 | "ACE") => {
        onServeNumberChange(n);
        if (n === "ACE") {
            onPendingWinnerChange(isPlayerOnServe ? "me" : "opponent");
            onMacroPatternChange("SERVE_DOMINANT");
            onFinishTypeChange("WINNER");
            onFinishShotChange("SERVE");
        }
    };

    // ── Summary chips (invariati) ─────────────────────────────────────────────
    const summaryChips: { label: string; tone: Tone }[] = [];
    if (pendingWinner)
        summaryChips.push({ label: pendingWinner === "me" ? "Player" : "Opponent", tone: pendingWinner === "me" ? "emerald" : "rose" });
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

    return (
        <div className={`${sectionCard} overflow-hidden`}>

            {/* ── Header + progress bar ── */}
            <div className="px-5 py-4 md:px-6 border-b border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold">
                    Live Tag Console
                </div>
                <div className="mt-1 font-head text-lg font-semibold tracking-tight text-baseline">
                    Registra punto
                </div>

                {/* Progress bar — step completati: success; step corrente: ace-lime pulse; pending: white/[0.06] */}
                <div className="mt-4 flex items-center gap-1.5">
                    {STEP_LABELS.map((label, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className={`h-1.5 w-full rounded-full transition-all duration-500 ${i < currentStep
                                        ? "bg-success"
                                        : i === currentStep
                                            ? "bg-ace-lime animate-pulse"
                                            : "bg-white/[0.06]"
                                    }`}
                            />
                            <span
                                className={`text-[9px] font-medium transition-colors ${i <= currentStep ? "text-fog" : "text-fog/30"
                                    }`}
                            >
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Summary chips ── */}
            {summaryChips.length > 0 && (
                <div className="px-5 py-3 md:px-6 border-b border-white/[0.04] flex flex-wrap gap-1.5">
                    {summaryChips.map((chip, i) => (
                        <span key={i} className={chipClass(chip.tone)}>
                            {chip.label}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Wizard body ── */}
            <div className="px-5 py-5 md:px-6 md:py-6">

                {/* ─── Step 0: Winner ── */}
                {currentStep === 0 && (
                    <div className="animate-[fadeIn_0.3s_ease-out]">
                        <div className="font-head text-[13px] font-bold text-baseline mb-4">
                            Chi ha vinto il punto?
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onPendingWinnerChange("me")}
                                className="flex items-center justify-center rounded-2xl border-2 border-success/30 bg-success/10 p-6 min-h-[72px] text-success font-bold text-lg tracking-wide transition hover:bg-success/20 hover:border-success/50 hover:scale-[1.02] active:scale-95"
                            >
                                PLAYER
                            </button>
                            <button
                                onClick={() => onPendingWinnerChange("opponent")}
                                className="flex items-center justify-center rounded-2xl border-2 border-error/30 bg-error/10 p-6 min-h-[72px] text-error font-bold text-lg tracking-wide transition hover:bg-error/20 hover:border-error/50 hover:scale-[1.02] active:scale-95"
                            >
                                OPPONENT
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Step 1: Serve ── */}
                {currentStep === 1 && (
                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-5">
                        <div className="font-head text-[13px] font-bold text-baseline mb-1">
                            {isPlayerOnServe ? "Servizio del Player" : "Servizio dell'Opponent"}
                        </div>
                        <div>
                            <div className={subLabel}>Battuta</div>
                            <div className="flex flex-wrap gap-2.5">
                                {([1, 2] as const).map((n) => (
                                    <button key={n} onClick={() => handleServeNumberClick(n)} className={pillClass(serveNumber === n, "violet")}>
                                        {n}ª di servizio
                                    </button>
                                ))}
                                <button onClick={() => handleServeNumberClick("ACE")} className={pillClass(serveNumber === "ACE", "emerald")}>
                                    ACE
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className={subLabel}>Direzione</div>
                            <div className="flex flex-wrap gap-2.5">
                                {(["T", "BODY", "WIDE"] as const).map((v) => (
                                    <button key={v} onClick={() => onServeDirectionChange(v)} className={pillClass(serveDirection === v, "sky")}>
                                        {serveDirectionLabel(v)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className={subLabel}>Qualità</div>
                            <div className="flex flex-wrap gap-2.5">
                                {(["SAFE", "AGGRESSIVE", "WEAK"] as const).map((v) => (
                                    <button key={v} onClick={() => onServeQualityChange(v)} className={pillClass(serveQuality === v, "cyan")}>
                                        {serveQualityLabel(v)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                if (!serveDirection) onServeDirectionChange("T");
                                if (!serveQuality) onServeQualityChange("SAFE");
                            }}
                            className="mt-2 self-end rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-fog/50 transition hover:text-fog hover:border-white/20"
                        >
                            Salta dettagli servizio →
                        </button>
                    </div>
                )}

                {/* ─── Step 2: Rally pattern ── */}
                {currentStep === 2 && (
                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-5">
                        <div className="font-head text-[13px] font-bold text-baseline mb-1">
                            Com'è stato il punto?
                        </div>
                        <div>
                            <div className={subLabel}>Schema prevalente</div>
                            <div className="flex flex-wrap gap-2.5">
                                {(["SERVE_DOMINANT", "AGGRESSIVE_RETURN", "SHORT_RALLY", "MEDIUM_RALLY", "LONG_RALLY", "SHORT_BALL_ATTACK", "NET_PLAY", "DEFENSE_RECOVERY", "PASSING_LOB"] as const).map((value) => {
                                    const allowed = availablePatterns.has(value);
                                    return (
                                        <button key={value} onClick={() => allowed && onMacroPatternChange(value)} className={pillClass(macroPattern === value, "sky", !allowed)} disabled={!allowed}>
                                            {macroLabel(value)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {showReturnType && (
                            <div>
                                <div className={subLabel}>Tipo di risposta {optionalTag}</div>
                                <div className="flex flex-wrap gap-2">
                                    {(["DEEP", "SHORT", "ANGLED", "CENTRAL", "BLOCKED", "AGGRESSIVE"] as const).map((v) => (
                                        <button key={v} onClick={() => onReturnTypeChange(v)} className={pillClass(returnType === v, "emerald")}>
                                            {returnTypeLabel(v)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <div className={subLabel}>Fase del rally {optionalTag}</div>
                            <div className="flex flex-wrap gap-2">
                                {(["NEUTRAL", "ATTACK_ME", "ATTACK_OPP", "DEFENSE_ME", "DEFENSE_OPP"] as const).map((v) => (
                                    <button key={v} onClick={() => onRallyPhaseChange(v)} className={pillClass(rallyPhase === v, "violet")}>
                                        {rallyPhaseLabel(v)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 3: Finish ── */}
                {currentStep === 3 && (
                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-5">
                        <div className="font-head text-[13px] font-bold text-baseline mb-1">
                            Come si è chiuso il punto?
                        </div>
                        <div>
                            <div className={subLabel}>Esito</div>
                            <div className="flex flex-wrap gap-2.5">
                                {(["WINNER", "FORCED_ERROR", "UNFORCED_ERROR"] as const).map((value) => (
                                    <button key={value} onClick={() => onFinishTypeChange(value)} className={pillClass(finishType === value, "amber")}>
                                        {finishTypeLabel(value)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className={subLabel}>Colpo finale {optionalTag}</div>
                            <div className="flex flex-wrap gap-2">
                                {(["SERVE", "FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"] as const).map((v) => {
                                    const allowed = availableFinishShots.has(v);
                                    return (
                                        <button key={v} onClick={() => allowed && onFinishShotChange(v)} className={pillClass(finishShot === v, "cyan", !allowed)} disabled={!allowed}>
                                            {finishShotLabel(v)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <div className={subLabel}>Evento chiave {optionalTag}</div>
                            <div className="flex flex-wrap gap-2">
                                {(["NONE", "DROP_SHOT", "NET_APPROACH", "LOB", "PASSING", "LINE_CHANGE", "INSIDE_OUT", "INSIDE_IN"] as const).map((v) => {
                                    const allowed = availableKeyEvents.has(v);
                                    return (
                                        <button key={v} onClick={() => allowed && onKeyEventChange(v)} className={pillClass(keyEvent === v, "amber", !allowed)} disabled={!allowed}>
                                            {keyEventLabel(v)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 4: Review ── */}
                {currentStep === 4 && (
                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-4">
                        <div className="font-head text-[13px] font-bold text-baseline mb-1">
                            Riepilogo punto
                        </div>
                        <div className="rounded-[var(--r-md)] border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${pendingWinner === "me" ? "bg-success" : "bg-error"}`} />
                                <span className="text-[13px] font-semibold text-baseline">
                                    {pendingWinner === "me" ? "Punto Player" : "Punto Opponent"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                                {serveDirection && (
                                    <><span className="text-fog/40">Servizio</span><span className="text-fog">{serveDirectionLabel(serveDirection)}{serveQuality ? ` · ${serveQualityLabel(serveQuality)}` : ""}</span></>
                                )}
                                {serveNumber === "ACE" && (
                                    <><span className="text-fog/40">Servizio</span><span className="text-success font-semibold">ACE</span></>
                                )}
                                {macroPattern && (
                                    <><span className="text-fog/40">Schema</span><span className="text-fog">{macroLabel(macroPattern)}</span></>
                                )}
                                {returnType && (
                                    <><span className="text-fog/40">Risposta</span><span className="text-fog">{returnTypeLabel(returnType)}</span></>
                                )}
                                {rallyPhase && rallyPhase !== "NEUTRAL" && (
                                    <><span className="text-fog/40">Rally</span><span className="text-fog">{rallyPhaseLabel(rallyPhase)}</span></>
                                )}
                                {finishType && (
                                    <><span className="text-fog/40">Chiusura</span><span className="text-fog">{finishTypeLabel(finishType)}</span></>
                                )}
                                {finishShot && (
                                    <><span className="text-fog/40">Colpo</span><span className="text-fog">{finishShotLabel(finishShot)}</span></>
                                )}
                                {keyEvent && keyEvent !== "NONE" && (
                                    <><span className="text-fog/40">Evento</span><span className="text-fog">{keyEventLabel(keyEvent)}</span></>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Bottom bar sticky ── */}
            <div className="sticky bottom-0 z-20 border-t border-white/[0.06] bg-[rgba(5,9,18,0.97)] backdrop-blur-lg px-5 py-4 md:px-6 flex flex-col gap-2.5">
                {canSubmit ? (
                    // CTA principale: ace-lime su court-night — massimo contrasto
                    <button
                        onClick={onRegister}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-3 w-full rounded-[var(--r-pill)] bg-ace-lime px-6 py-4 min-h-[56px] shadow-[var(--lime-glow)] text-[14px] font-bold text-court-night transition hover:bg-ace-lime-hover hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        {loading ? "Analisi tattica..." : (
                            <>
                                Registra punto e analizza
                                <ArrowRightIcon size={18} />
                            </>
                        )}
                    </button>
                ) : (
                    <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-6 py-4 min-h-[56px] text-center text-[13px] text-fog/40 font-medium">
                        Completa i passi sopra per registrare
                    </div>
                )}
                <div className="flex gap-2">
                    {currentStep > 0 && (
                        <button
                            onClick={() => {
                                if (currentStep === 4) { onFinishTypeChange(null as unknown as FinishType); onFinishShotChange(null as unknown as FinishShot); onKeyEventChange("NONE"); }
                                else if (currentStep === 3) { onMacroPatternChange(null as unknown as FastMacroPattern); onReturnTypeChange(null as unknown as ReturnType); onRallyPhaseChange(null as unknown as RallyPhase); }
                                else if (currentStep === 2) { onServeDirectionChange(null as unknown as ServeDirection); onServeQualityChange(null as unknown as ServeQuality); onServeNumberChange(1); }
                                else if (currentStep === 1) { onPendingWinnerChange(null as unknown as "me"); }
                            }}
                            className="inline-flex items-center justify-center gap-2 flex-1 rounded-[var(--r-pill)] border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold text-fog/50 transition hover:text-fog hover:border-white/20 active:scale-95"
                        >
                            <ArrowRightIcon size={15} className="rotate-180" />
                            Indietro
                        </button>
                    )}
                    {/* Undo: clay-amber — azione reversibile */}
                    <button
                        onClick={onUndo}
                        disabled={!canUndo || loading}
                        className="inline-flex items-center justify-center gap-2 flex-1 rounded-[var(--r-pill)] border border-clay-amber/30 bg-clay-amber/[0.08] px-4 py-2.5 text-[13px] font-semibold text-clay-amber transition hover:bg-clay-amber/15 disabled:opacity-30"
                    >
                        <RefreshIcon size={15} />
                        Correggi ultimo punto
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FastTagPanel;
