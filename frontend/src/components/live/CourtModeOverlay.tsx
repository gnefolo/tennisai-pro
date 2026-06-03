// src/components/live/CourtModeOverlay.tsx
// Court Mode: overlay fullscreen ottimizzato per tablet in campo
// Wizard a 5 step con bottoni grandi (min-h-[88px]) per tocco preciso con tablet

import React, { useMemo, useState, useEffect, useRef } from "react";
import type {
    FastMacroPattern, FinishShot, FinishType, KeyEvent,
    PointScore, RallyPhase, ReturnType, ServeDirection, ServeQuality,
} from "./liveTypes";

// ─── PROPS ───────────────────────────────────────────────────────────────────
interface CourtModeOverlayProps {
    // Punteggio (header compatto)
    playerName?: string;
    opponentName?: string;
    setsMe: number; setsOpp: number;
    gamesMe: number; gamesOpp: number;
    pointScoreMe: PointScore; pointScoreOpp: PointScore;
    setNumber: number;
    isPlayerOnServe: boolean;

    // Stato wizard (condiviso con FastTagPanel)
    pendingWinner: "me" | "opponent" | null;
    serveNumber: 1 | 2 | "ACE";
    serveDirection: ServeDirection | null;
    serveQuality: ServeQuality | null;
    macroPattern: FastMacroPattern | null;
    returnType: ReturnType | null;
    rallyPhase: RallyPhase | null;
    keyEvent: KeyEvent;
    finishType: FinishType | null;
    finishShot: FinishShot | null;
    loading: boolean;
    canUndo: boolean;

    // Handler
    onPendingWinnerChange: (v: "me" | "opponent") => void;
    onServeNumberChange: (v: 1 | 2 | "ACE") => void;
    onServeDirectionChange: (v: ServeDirection) => void;
    onServeQualityChange: (v: ServeQuality) => void;
    onMacroPatternChange: (v: FastMacroPattern) => void;
    onReturnTypeChange: (v: ReturnType) => void;
    onRallyPhaseChange: (v: RallyPhase) => void;
    onKeyEventChange: (v: KeyEvent) => void;
    onFinishTypeChange: (v: FinishType) => void;
    onFinishShotChange: (v: FinishShot) => void;
    onRegister: () => void;
    onUndo: () => void;
    onClose: () => void;
}

// ─── BUSINESS LOGIC (speculare a FastTagPanel) ────────────────────────────────
function getAvailablePatterns(
    isPlayerOnServe: boolean,
    pendingWinner: "me" | "opponent" | null
): Set<FastMacroPattern> {
    if (!pendingWinner) return new Set(["SERVE_DOMINANT", "AGGRESSIVE_RETURN", "SHORT_RALLY", "MEDIUM_RALLY", "LONG_RALLY", "SHORT_BALL_ATTACK", "NET_PLAY", "DEFENSE_RECOVERY", "PASSING_LOB"]);
    const serverWon = (isPlayerOnServe && pendingWinner === "me") || (!isPlayerOnServe && pendingWinner === "opponent");
    const returnerWon = (isPlayerOnServe && pendingWinner === "opponent") || (!isPlayerOnServe && pendingWinner === "me");
    const available = new Set<FastMacroPattern>(["SHORT_RALLY", "MEDIUM_RALLY", "LONG_RALLY", "SHORT_BALL_ATTACK", "NET_PLAY", "PASSING_LOB", "DEFENSE_RECOVERY"]);
    if (serverWon) available.add("SERVE_DOMINANT");
    if (returnerWon) available.add("AGGRESSIVE_RETURN");
    return available;
}

function getAvailableFinishShots(macro: FastMacroPattern | null): Set<FinishShot> {
    switch (macro) {
        case "SERVE_DOMINANT": return new Set<FinishShot>(["SERVE", "FOREHAND", "BACKHAND"]);
        case "NET_PLAY": return new Set<FinishShot>(["VOLLEY", "SMASH", "FOREHAND", "BACKHAND", "OTHER"]);
        case "PASSING_LOB": return new Set<FinishShot>(["PASSING", "FOREHAND", "BACKHAND", "OTHER"]);
        default: return new Set<FinishShot>(["FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"]);
    }
}

function getAvailableKeyEvents(macro: FastMacroPattern | null): Set<KeyEvent> {
    switch (macro) {
        case "SERVE_DOMINANT": return new Set<KeyEvent>(["NONE"]);
        case "NET_PLAY": return new Set<KeyEvent>(["NET_APPROACH", "DROP_SHOT", "NONE"]);
        case "PASSING_LOB": return new Set<KeyEvent>(["PASSING", "LOB", "LINE_CHANGE", "NONE"]);
        case "DEFENSE_RECOVERY": return new Set<KeyEvent>(["NONE", "LOB", "PASSING", "LINE_CHANGE"]);
        default: return new Set<KeyEvent>(["NONE", "DROP_SHOT", "NET_APPROACH", "LOB", "PASSING", "LINE_CHANGE", "INSIDE_OUT", "INSIDE_IN"]);
    }
}

// ─── LABEL HELPERS ────────────────────────────────────────────────────────────
const MACRO_LABELS: Record<FastMacroPattern, string> = {
    SERVE_DOMINANT: "Servizio\ndominante", AGGRESSIVE_RETURN: "Risposta\naggressiva",
    SHORT_RALLY: "Rally\nbreve", MEDIUM_RALLY: "Rally\nmedio", LONG_RALLY: "Rally\nlungo",
    SHORT_BALL_ATTACK: "Attacco\npalla corta", NET_PLAY: "Gioco\na rete",
    DEFENSE_RECOVERY: "Difesa /\nrecupero", PASSING_LOB: "Passante /\nlob",
};
const FINISH_TYPE_LABELS: Record<FinishType, string> = {
    WINNER: "Vincente", FORCED_ERROR: "Errore\nforzato", UNFORCED_ERROR: "Errore\nnon forzato",
};
const FINISH_SHOT_LABELS: Record<FinishShot, string> = {
    SERVE: "Serv.", FOREHAND: "Dir.", BACKHAND: "Rov.",
    VOLLEY: "Volée", SMASH: "Smash", PASSING: "Pass.", OTHER: "Altro",
};
const SERVE_DIR_LABELS: Record<ServeDirection, string> = { T: "Alla T", BODY: "Corpo", WIDE: "Esterno" };
const SERVE_QUAL_LABELS: Record<ServeQuality, string> = { SAFE: "Sicuro", AGGRESSIVE: "Aggressivo", WEAK: "Debole" };
const RALLY_PHASE_LABELS: Record<RallyPhase, string> = {
    NEUTRAL: "Neutro", ATTACK_ME: "Attacco mio", ATTACK_OPP: "Att. avversario",
    DEFENSE_ME: "Difesa mia", DEFENSE_OPP: "Difesa avversario",
};
const KEY_EVENT_LABELS: Record<KeyEvent, string> = {
    NONE: "Nessuno", DROP_SHOT: "Palla corta", NET_APPROACH: "Rete",
    LOB: "Lob", PASSING: "Passante", LINE_CHANGE: "Lungolinea",
    INSIDE_OUT: "Inside-out", INSIDE_IN: "Inside-in",
};

// ─── BUTTON STYLE HELPERS ─────────────────────────────────────────────────────
type BtnTone = "emerald" | "rose" | "sky" | "amber" | "violet" | "cyan";

const TONE_ACTIVE: Record<BtnTone, string> = {
    emerald: "border-success/50 bg-success/20 text-success shadow-[0_0_18px_rgba(34,197,94,0.30)] scale-[1.02]",
    rose: "border-error/50 bg-error/20 text-error shadow-[0_0_18px_rgba(239,68,68,0.30)] scale-[1.02]",
    sky: "border-ace-lime/50 bg-ace-lime/20 text-ace-lime shadow-[0_0_18px_rgba(212,255,58,0.30)] scale-[1.02]",
    amber: "border-clay-amber/50 bg-clay-amber/20 text-clay-amber shadow-[0_0_18px_rgba(233,162,59,0.30)] scale-[1.02]",
    violet: "border-info/50 bg-info/20 text-info shadow-[0_0_18px_rgba(59,130,246,0.25)] scale-[1.02]",
    cyan: "border-ace-lime/30 bg-ace-lime/10 text-ace-lime/80 scale-[1.02]",
};

function cBtn(active: boolean, tone: BtnTone, disabled = false): string {
    const base = "rounded-2xl border-2 font-bold transition-all active:scale-95 select-none leading-tight text-center whitespace-pre-line";
    if (disabled) return `${base} border-white/[0.04] bg-white/[0.02] text-fog/20 cursor-not-allowed opacity-40`;
    if (!active) return `${base} border-white/[0.10] bg-white/[0.04] text-fog hover:bg-white/[0.08] hover:border-white/20`;
    return `${base} ${TONE_ACTIVE[tone]}`;
}

// ─── STEP LABELS ─────────────────────────────────────────────────────────────
const STEP_LABELS = ["Winner", "Servizio", "Schema", "Chiusura", "OK"];

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
const CourtModeOverlay: React.FC<CourtModeOverlayProps> = ({
    playerName, opponentName,
    setsMe, setsOpp, gamesMe, gamesOpp, pointScoreMe, pointScoreOpp,
    isPlayerOnServe,
    pendingWinner, serveNumber, serveDirection, serveQuality,
    macroPattern, returnType, rallyPhase, keyEvent,
    finishType, finishShot, loading, canUndo,
    onPendingWinnerChange, onServeNumberChange, onServeDirectionChange, onServeQualityChange,
    onMacroPatternChange, onReturnTypeChange, onRallyPhaseChange, onKeyEventChange,
    onFinishTypeChange, onFinishShotChange, onRegister, onUndo, onClose,
}) => {
    // Step derivato (stessa logica di FastTagPanel)
    const currentStep = useMemo(() => {
        if (!pendingWinner) return 0;
        if ((!serveDirection || !serveQuality) && serveNumber !== "ACE") return 1;
        if (!macroPattern) return 2;
        if (!finishType) return 3;
        return 4;
    }, [pendingWinner, serveDirection, serveQuality, serveNumber, macroPattern, finishType]);

    const availablePatterns = useMemo(() => getAvailablePatterns(isPlayerOnServe, pendingWinner), [isPlayerOnServe, pendingWinner]);
    const availableFinishShots = useMemo(() => getAvailableFinishShots(macroPattern), [macroPattern]);
    const availableKeyEvents = useMemo(() => getAvailableKeyEvents(macroPattern), [macroPattern]);
    const showReturnType = macroPattern !== "SERVE_DOMINANT";

    const canSubmit = pendingWinner && macroPattern && finishType;

    // ── Animazione direzionale tra gli step ───────────────────────────────────
    const prevStepRef = useRef(currentStep);
    const [stepAnimClass, setStepAnimClass] = useState("wizard-step");

    useEffect(() => {
        if (currentStep !== prevStepRef.current) {
            setStepAnimClass(currentStep > prevStepRef.current ? "wizard-step" : "wizard-step-reverse");
            prevStepRef.current = currentStep;
        }
    }, [currentStep]);

    // ── Toast di conferma dopo registrazione punto ────────────────────────────
    const [showToast, setShowToast] = useState(false);
    const prevLoadingRef = useRef(loading);

    useEffect(() => {
        if (prevLoadingRef.current && !loading && !pendingWinner) {
            setShowToast(true);
            const t = setTimeout(() => setShowToast(false), 2700);
            return () => clearTimeout(t);
        }
        prevLoadingRef.current = loading;
    }, [loading, pendingWinner]);

    // ACE auto-fill
    const handleAce = () => {
        onServeNumberChange("ACE");
        onPendingWinnerChange(isPlayerOnServe ? "me" : "opponent");
        onMacroPatternChange("SERVE_DOMINANT");
        onFinishTypeChange("WINNER");
        onFinishShotChange("SERVE");
    };

    // Navigazione indietro
    const handleBack = () => {
        if (currentStep === 4) { onFinishTypeChange(null as unknown as FinishType); onFinishShotChange(null as unknown as FinishShot); onKeyEventChange("NONE"); }
        else if (currentStep === 3) { onMacroPatternChange(null as unknown as FastMacroPattern); onReturnTypeChange(null as unknown as ReturnType); onRallyPhaseChange(null as unknown as RallyPhase); }
        else if (currentStep === 2) { onServeDirectionChange(null as unknown as ServeDirection); onServeQualityChange(null as unknown as ServeQuality); onServeNumberChange(1); }
        else if (currentStep === 1) { onPendingWinnerChange(null as unknown as "me"); }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#050912]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", animation: "courtModeIn 0.3s cubic-bezier(0.2,0.8,0.2,1) both" }}>

            {/* ── Header compatto: punteggio + close ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-court-night/95 border-b border-white/[0.08]">
                {/* Score sintetico */}
                <div className="flex items-center gap-3">
                    <div className="text-[11px] font-semibold text-fog/50 uppercase tracking-wide">Set {setsMe}–{setsOpp}</div>
                    <div className="h-3 w-px bg-white/[0.10]" />
                    <div className="font-head text-sm font-bold text-baseline">
                        {gamesMe}–{gamesOpp}
                    </div>
                    <div className="h-3 w-px bg-white/[0.10]" />
                    <div className="font-mono text-sm font-bold text-ace-lime">
                        {pointScoreMe}–{pointScoreOpp}
                    </div>
                    {isPlayerOnServe && (
                        <span className="w-2 h-2 rounded-full bg-ace-lime animate-pulse ml-1" title="Al servizio" />
                    )}
                </div>

                {/* Badge court mode + close */}
                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.18em] text-ace-lime/60">
                        Court Mode
                    </span>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.10] bg-white/[0.04] text-fog/60 hover:text-fog hover:bg-white/[0.08] transition-all"
                        aria-label="Esci da Court Mode"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Step progress bar ── */}
            <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 bg-court-night/80 border-b border-white/[0.05]">
                {STEP_LABELS.map((label, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                            i < currentStep ? "bg-success" : i === currentStep ? "bg-ace-lime animate-pulse" : "bg-white/[0.08]"
                        }`} />
                        <span className={`text-[9px] font-medium transition-colors ${i <= currentStep ? "text-fog/70" : "text-fog/25"}`}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>

            {/* ── Wizard body — scrollabile ── */}
            <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">

                {/* ─── Step 0: Winner ── */}
                {currentStep === 0 && (
                    <div key={0} className={`flex flex-col gap-4 ${stepAnimClass}`}>
                        <div className="text-center">
                            <div className="font-head text-xl font-bold text-baseline">Chi ha vinto il punto?</div>
                            <div className="text-[12px] text-fog/40 mt-1">
                                {isPlayerOnServe
                                    ? `${playerName || "Player"} al servizio`
                                    : `${opponentName || "Opponent"} al servizio`}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            <button
                                onClick={() => onPendingWinnerChange("me")}
                                className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-success/30 bg-success/10 min-h-[120px] text-success font-bold text-xl tracking-wide transition hover:bg-success/20 hover:border-success/50 active:scale-95"
                            >
                                <span className="text-3xl">✓</span>
                                <span>{playerName || "PLAYER"}</span>
                            </button>
                            <button
                                onClick={() => onPendingWinnerChange("opponent")}
                                className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-error/30 bg-error/10 min-h-[120px] text-error font-bold text-xl tracking-wide transition hover:bg-error/20 hover:border-error/50 active:scale-95"
                            >
                                <span className="text-3xl">✗</span>
                                <span>{opponentName || "OPPONENT"}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Step 1: Serve ── */}
                {currentStep === 1 && (
                    <div key={1} className={`flex flex-col gap-5 ${stepAnimClass}`}>
                        <div className="text-center">
                            <div className="font-head text-xl font-bold text-baseline">
                                {isPlayerOnServe ? "Servizio del Player" : "Servizio dell'Opponent"}
                            </div>
                        </div>

                        {/* ACE — bottone grande in cima */}
                        <button
                            onClick={handleAce}
                            className={`${cBtn(serveNumber === "ACE", "emerald")} min-h-[64px] text-lg px-4`}
                        >
                            ⚡ ACE — Auto-conferma
                        </button>

                        <div className="h-px bg-white/[0.06]" />

                        {/* Battuta */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">Battuta</div>
                            <div className="grid grid-cols-2 gap-3">
                                {([1, 2] as const).map(n => (
                                    <button key={n}
                                        onClick={() => onServeNumberChange(n)}
                                        className={`${cBtn(serveNumber === n, "violet")} min-h-[64px] text-base px-3`}
                                    >
                                        {n}ª di servizio
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Direzione */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">Direzione</div>
                            <div className="grid grid-cols-3 gap-3">
                                {(["T", "BODY", "WIDE"] as ServeDirection[]).map(v => (
                                    <button key={v}
                                        onClick={() => onServeDirectionChange(v)}
                                        className={`${cBtn(serveDirection === v, "sky")} min-h-[64px] text-sm px-2`}
                                    >
                                        {SERVE_DIR_LABELS[v]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Qualità */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">Qualità</div>
                            <div className="grid grid-cols-3 gap-3">
                                {(["SAFE", "AGGRESSIVE", "WEAK"] as ServeQuality[]).map(v => (
                                    <button key={v}
                                        onClick={() => onServeQualityChange(v)}
                                        className={`${cBtn(serveQuality === v, "cyan")} min-h-[64px] text-sm px-2`}
                                    >
                                        {SERVE_QUAL_LABELS[v]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Skip dettagli */}
                        <button
                            onClick={() => { if (!serveDirection) onServeDirectionChange("T"); if (!serveQuality) onServeQualityChange("SAFE"); }}
                            className="self-end rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-fog/40 hover:text-fog hover:border-white/20 transition"
                        >
                            Salta dettagli →
                        </button>
                    </div>
                )}

                {/* ─── Step 2: Rally pattern ── */}
                {currentStep === 2 && (
                    <div key={2} className={`flex flex-col gap-5 ${stepAnimClass}`}>
                        <div className="text-center">
                            <div className="font-head text-xl font-bold text-baseline">Com'è stato il punto?</div>
                        </div>

                        {/* Pattern 3x3 grid */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">Schema prevalente</div>
                            <div className="grid grid-cols-3 gap-3">
                                {(["SERVE_DOMINANT", "AGGRESSIVE_RETURN", "SHORT_RALLY", "MEDIUM_RALLY", "LONG_RALLY", "SHORT_BALL_ATTACK", "NET_PLAY", "DEFENSE_RECOVERY", "PASSING_LOB"] as FastMacroPattern[]).map(v => {
                                    const allowed = availablePatterns.has(v);
                                    return (
                                        <button key={v}
                                            onClick={() => allowed && onMacroPatternChange(v)}
                                            disabled={!allowed}
                                            className={`${cBtn(macroPattern === v, "sky", !allowed)} min-h-[72px] text-[12px] px-2`}
                                        >
                                            {MACRO_LABELS[v]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Risposta (opzionale) */}
                        {showReturnType && (
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">
                                    Tipo di risposta <span className="text-fog/25 normal-case">(opzionale)</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(["DEEP", "SHORT", "ANGLED", "CENTRAL", "BLOCKED", "AGGRESSIVE"] as ReturnType[]).map(v => (
                                        <button key={v}
                                            onClick={() => onReturnTypeChange(v)}
                                            className={`${cBtn(returnType === v, "emerald")} min-h-[56px] text-[12px] px-2`}
                                        >
                                            {v === "DEEP" ? "Profonda" : v === "SHORT" ? "Corta" : v === "ANGLED" ? "Angolata" : v === "CENTRAL" ? "Centrale" : v === "BLOCKED" ? "Bloccata" : "Aggressiva"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fase rally (opzionale) */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">
                                Fase del rally <span className="text-fog/25 normal-case">(opzionale)</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {(["NEUTRAL", "ATTACK_ME", "ATTACK_OPP", "DEFENSE_ME", "DEFENSE_OPP"] as RallyPhase[]).map(v => (
                                    <button key={v}
                                        onClick={() => onRallyPhaseChange(v)}
                                        className={`${cBtn(rallyPhase === v, "violet")} min-h-[56px] text-[12px] px-2`}
                                    >
                                        {RALLY_PHASE_LABELS[v]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 3: Finish ── */}
                {currentStep === 3 && (
                    <div key={3} className={`flex flex-col gap-5 ${stepAnimClass}`}>
                        <div className="text-center">
                            <div className="font-head text-xl font-bold text-baseline">Come si è chiuso?</div>
                        </div>

                        {/* Esito — 3 bottoni grandi */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">Esito del punto</div>
                            <div className="grid grid-cols-3 gap-3">
                                {(["WINNER", "FORCED_ERROR", "UNFORCED_ERROR"] as FinishType[]).map(v => (
                                    <button key={v}
                                        onClick={() => onFinishTypeChange(v)}
                                        className={`${cBtn(finishType === v, "amber")} min-h-[80px] text-[12px] px-2`}
                                    >
                                        {FINISH_TYPE_LABELS[v]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Colpo finale */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">
                                Colpo finale <span className="text-fog/25 normal-case">(opzionale)</span>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {(["SERVE", "FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"] as FinishShot[]).map(v => {
                                    const allowed = availableFinishShots.has(v);
                                    return (
                                        <button key={v}
                                            onClick={() => allowed && onFinishShotChange(v)}
                                            disabled={!allowed}
                                            className={`${cBtn(finishShot === v, "cyan", !allowed)} min-h-[56px] text-[12px] px-2`}
                                        >
                                            {FINISH_SHOT_LABELS[v]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Evento chiave */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-3">
                                Evento chiave <span className="text-fog/25 normal-case">(opzionale)</span>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {(["NONE", "DROP_SHOT", "NET_APPROACH", "LOB", "PASSING", "LINE_CHANGE", "INSIDE_OUT", "INSIDE_IN"] as KeyEvent[]).map(v => {
                                    const allowed = availableKeyEvents.has(v);
                                    return (
                                        <button key={v}
                                            onClick={() => allowed && onKeyEventChange(v)}
                                            disabled={!allowed}
                                            className={`${cBtn(keyEvent === v, "amber", !allowed)} min-h-[56px] text-[12px] px-2`}
                                        >
                                            {KEY_EVENT_LABELS[v]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 4: Review + Confirm ── */}
                {currentStep === 4 && (
                    <div key={4} className={`flex flex-col gap-4 ${stepAnimClass}`}>
                        <div className="text-center">
                            <div className="font-head text-xl font-bold text-baseline">Riepilogo punto</div>
                            <div className="text-[12px] text-fog/40 mt-1">Verifica e conferma</div>
                        </div>

                        {/* Summary card */}
                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full ${pendingWinner === "me" ? "bg-success" : "bg-error"}`} />
                                <span className="font-head font-bold text-baseline text-base">
                                    Punto {pendingWinner === "me" ? (playerName || "Player") : (opponentName || "Opponent")}
                                </span>
                            </div>
                            <div className="h-px bg-white/[0.06]" />
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                                {serveNumber === "ACE" ? (
                                    <><span className="text-fog/40">Servizio</span><span className="text-success font-bold">ACE</span></>
                                ) : serveDirection ? (
                                    <><span className="text-fog/40">Servizio</span><span className="text-fog">{SERVE_DIR_LABELS[serveDirection]}{serveQuality ? ` · ${SERVE_QUAL_LABELS[serveQuality]}` : ""}</span></>
                                ) : null}
                                {macroPattern && <><span className="text-fog/40">Schema</span><span className="text-fog">{MACRO_LABELS[macroPattern].replace("\n", " ")}</span></>}
                                {returnType && <><span className="text-fog/40">Risposta</span><span className="text-fog">{returnType}</span></>}
                                {rallyPhase && rallyPhase !== "NEUTRAL" && <><span className="text-fog/40">Rally</span><span className="text-fog">{RALLY_PHASE_LABELS[rallyPhase]}</span></>}
                                {finishType && <><span className="text-fog/40">Esito</span><span className="text-fog">{FINISH_TYPE_LABELS[finishType].replace("\n", " ")}</span></>}
                                {finishShot && <><span className="text-fog/40">Colpo</span><span className="text-fog">{FINISH_SHOT_LABELS[finishShot]}</span></>}
                                {keyEvent && keyEvent !== "NONE" && <><span className="text-fog/40">Evento</span><span className="text-fog">{KEY_EVENT_LABELS[keyEvent]}</span></>}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* ── Toast di conferma punto registrato ── */}
            {showToast && (
                <div
                    className="pointer-events-none absolute left-1/2 bottom-28 z-10 flex items-center gap-2.5 rounded-2xl border border-success/40 bg-success/15 px-5 py-3 text-success font-semibold text-[14px] shadow-[0_4px_24px_rgba(34,197,94,0.25)]"
                    style={{ animation: "toastSlideUp 2.7s cubic-bezier(0.2,0.8,0.2,1) both" }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Punto registrato
                </div>
            )}

            {/* ── Bottom bar sticky ── */}
            <div className="flex-shrink-0 border-t border-white/[0.08] bg-[rgba(5,9,18,0.97)] px-4 py-4 flex flex-col gap-3">
                {/* CTA principale */}
                {canSubmit ? (
                    <button
                        onClick={onRegister}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-ace-lime text-court-night font-bold text-base min-h-[64px] shadow-[0_0_20px_rgba(212,255,58,0.35)] hover:bg-ace-lime/90 active:scale-[0.98] disabled:opacity-50 transition-all"
                    >
                        {loading ? "Analisi tattica in corso..." : "Registra punto e analizza →"}
                    </button>
                ) : (
                    <div className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] min-h-[64px] flex items-center justify-center text-[13px] text-fog/30 font-medium">
                        Completa i passi sopra
                    </div>
                )}

                {/* Azioni secondarie */}
                <div className="flex gap-3">
                    {currentStep > 0 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] min-h-[52px] text-[13px] font-semibold text-fog/50 hover:text-fog hover:border-white/20 active:scale-95 transition-all"
                        >
                            ← Indietro
                        </button>
                    )}
                    <button
                        onClick={onUndo}
                        disabled={!canUndo || loading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-clay-amber/30 bg-clay-amber/[0.08] min-h-[52px] text-[13px] font-semibold text-clay-amber hover:bg-clay-amber/15 disabled:opacity-30 active:scale-95 transition-all"
                    >
                        ↩ Correggi ultimo
                    </button>
                </div>
            </div>

        </div>
    );
};

export default CourtModeOverlay;
