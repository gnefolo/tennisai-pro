import React from "react";
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
}

const sectionCard =
    "rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] shadow-[0_20px_45px_rgba(0,0,0,0.30)]";

const sectionLabel =
    "text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold";

const groupTitle =
    "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300";

const basePill =
    "px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all";

function pillClass(active: boolean, tone: "emerald" | "rose" | "sky" | "amber" | "violet" | "cyan" | "slate") {
    if (!active) {
        return `${basePill} border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:bg-slate-800/90`;
    }

    switch (tone) {
        case "emerald":
            return `${basePill} border-emerald-500/50 bg-emerald-500/12 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]`;
        case "rose":
            return `${basePill} border-rose-500/50 bg-rose-500/12 text-rose-200 shadow-[0_0_0_1px_rgba(244,63,94,0.12)]`;
        case "sky":
            return `${basePill} border-sky-500/50 bg-sky-500/12 text-sky-200 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]`;
        case "amber":
            return `${basePill} border-amber-500/50 bg-amber-500/12 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]`;
        case "violet":
            return `${basePill} border-violet-500/50 bg-violet-500/12 text-violet-200 shadow-[0_0_0_1px_rgba(139,92,246,0.12)]`;
        case "cyan":
            return `${basePill} border-cyan-500/50 bg-cyan-500/12 text-cyan-200 shadow-[0_0_0_1px_rgba(6,182,212,0.12)]`;
        default:
            return `${basePill} border-slate-500/50 bg-slate-500/12 text-slate-100`;
    }
}

function macroLabel(value: FastMacroPattern) {
    switch (value) {
        case "SERVE_DOMINANT":
            return "Servizio dominante";
        case "AGGRESSIVE_RETURN":
            return "Risposta aggressiva";
        case "SHORT_RALLY":
            return "Rally breve";
        case "MEDIUM_RALLY":
            return "Rally medio";
        case "LONG_RALLY":
            return "Rally lungo";
        case "SHORT_BALL_ATTACK":
            return "Attacco su palla corta";
        case "NET_PLAY":
            return "Gioco a rete";
        case "DEFENSE_RECOVERY":
            return "Difesa / recupero";
        case "PASSING_LOB":
            return "Passante / lob";
        default:
            return value;
    }
}

function finishTypeLabel(value: FinishType) {
    switch (value) {
        case "WINNER":
            return "Vincente";
        case "FORCED_ERROR":
            return "Errore forzato";
        case "UNFORCED_ERROR":
            return "Errore non forzato";
        default:
            return value;
    }
}

const FastTagPanel: React.FC<FastTagPanelProps> = ({
    pendingWinner,
    macroPattern,
    finishType,
    showAdvanced,
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
    onToggleAdvanced,
    onServeNumberChange,
    onServeDirectionChange,
    onServeQualityChange,
    onReturnTypeChange,
    onRallyPhaseChange,
    onKeyEventChange,
    onFinishShotChange,
    onUndo,
    onRegister,
}) => {
    const selectedSummary =
        pendingWinner && macroPattern && finishType
            ? `${pendingWinner === "me" ? "Punto mio" : "Punto avversario"} · ${macroLabel(
                macroPattern
            )} · ${finishTypeLabel(finishType)}`
            : "Seleziona esito, pattern e chiusura per registrare il punto.";

    return (
        <div className={`${sectionCard} overflow-hidden`}>
            <div className="px-5 py-5 md:px-6 md:py-6 border-b border-slate-800/80">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className={sectionLabel}>Live Tag Console</div>
                        <div className="mt-1 text-lg font-semibold tracking-tight text-slate-50">
                            Fast point tagging
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={onToggleAdvanced}
                            className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold text-sky-300 transition hover:border-sky-500/50 hover:bg-slate-800/90"
                        >
                            {showAdvanced ? "Nascondi advanced" : "Mostra advanced"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 md:px-6 md:py-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
                    <div className="flex flex-col gap-6">
                        <div className="rounded-[20px] border border-slate-800/80 bg-slate-950/55 p-4">
                            <div className={groupTitle}>1. Winner</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    onClick={() => onPendingWinnerChange("me")}
                                    className={pillClass(pendingWinner === "me", "emerald")}
                                >
                                    Io
                                </button>
                                <button
                                    onClick={() => onPendingWinnerChange("opponent")}
                                    className={pillClass(pendingWinner === "opponent", "rose")}
                                >
                                    Avversario
                                </button>
                            </div>
                        </div>

                        <div className="rounded-[20px] border border-slate-800/80 bg-slate-950/55 p-4">
                            <div className={groupTitle}>2. Pattern</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {(
                                    [
                                        "SERVE_DOMINANT",
                                        "AGGRESSIVE_RETURN",
                                        "SHORT_RALLY",
                                        "MEDIUM_RALLY",
                                        "LONG_RALLY",
                                        "SHORT_BALL_ATTACK",
                                        "NET_PLAY",
                                        "DEFENSE_RECOVERY",
                                        "PASSING_LOB",
                                    ] as const
                                ).map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => onMacroPatternChange(value)}
                                        className={pillClass(macroPattern === value, "sky")}
                                    >
                                        {macroLabel(value)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[20px] border border-slate-800/80 bg-slate-950/55 p-4">
                            <div className={groupTitle}>3. Finish</div>
                            <div className="mt-3 flex flex-wrap gap-2">
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
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="rounded-[20px] border border-sky-500/15 bg-[linear-gradient(135deg,rgba(8,47,73,0.24),rgba(15,23,42,0.96),rgba(6,78,59,0.12))] p-4">
                            <div className={sectionLabel}>Current selection</div>
                            <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-100">
                                {selectedSummary}
                            </div>
                        </div>

                        <div className="rounded-[20px] border border-slate-800/80 bg-slate-950/55 p-4">
                            <div className={sectionLabel}>Workflow</div>
                            <div className="mt-3 space-y-2 text-[12px] text-slate-400 leading-relaxed">
                                <div>1. Seleziona chi ha vinto il punto</div>
                                <div>2. Classifica il pattern dominante</div>
                                <div>3. Definisci la chiusura del punto</div>
                                <div>4. Registra e genera il coaching live</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={onRegister}
                                disabled={loading}
                                className="rounded-2xl bg-emerald-600 px-4 py-3 text-[12px] font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                            >
                                {loading ? "Analisi tattica..." : "Registra punto e analizza il prossimo"}
                            </button>

                            <button
                                onClick={onUndo}
                                disabled={!canUndo || loading}
                                className="rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-[12px] font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
                            >
                                Correggi ultimo punto
                            </button>
                        </div>
                    </div>
                </div>

                {showAdvanced && (
                    <div className="rounded-[22px] border border-slate-800/80 bg-slate-950/45 p-4 md:p-5">
                        <div className="flex flex-col gap-5">
                            <div>
                                <div className={groupTitle}>Servizio</div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {[1, 2].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => onServeNumberChange(n as 1 | 2)}
                                            className={pillClass(serveNumber === n, "violet")}
                                        >
                                            {n}ª
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => onServeNumberChange("ACE")}
                                        className={pillClass(serveNumber === "ACE", "emerald")}
                                    >
                                        ACE
                                    </button>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(["T", "BODY", "WIDE"] as const).map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => onServeDirectionChange(v)}
                                            className={pillClass(serveDirection === v, "sky")}
                                        >
                                            {v === "T" ? "Alla T" : v === "BODY" ? "Corpo" : "Esterno"}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(["SAFE", "AGGRESSIVE", "WEAK"] as const).map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => onServeQualityChange(v)}
                                            className={pillClass(serveQuality === v, "cyan")}
                                        >
                                            {v === "SAFE" ? "Sicuro" : v === "AGGRESSIVE" ? "Aggressivo" : "Debole"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-800/80 pt-5">
                                <div className={groupTitle}>Risposta e sviluppo</div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(
                                        ["DEEP", "SHORT", "ANGLED", "CENTRAL", "BLOCKED", "AGGRESSIVE"] as const
                                    ).map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => onReturnTypeChange(v)}
                                            className={pillClass(returnType === v, "emerald")}
                                        >
                                            {v === "DEEP"
                                                ? "Profonda"
                                                : v === "SHORT"
                                                    ? "Corta"
                                                    : v === "ANGLED"
                                                        ? "Angolata"
                                                        : v === "CENTRAL"
                                                            ? "Centrale"
                                                            : v === "BLOCKED"
                                                                ? "Bloccata"
                                                                : "Aggressiva"}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(
                                        ["NEUTRAL", "ATTACK_ME", "ATTACK_OPP", "DEFENSE_ME", "DEFENSE_OPP"] as const
                                    ).map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => onRallyPhaseChange(v)}
                                            className={pillClass(rallyPhase === v, "violet")}
                                        >
                                            {v === "NEUTRAL"
                                                ? "Neutro"
                                                : v === "ATTACK_ME"
                                                    ? "Attacco mio"
                                                    : v === "ATTACK_OPP"
                                                        ? "Attacco avversario"
                                                        : v === "DEFENSE_ME"
                                                            ? "Difesa mia"
                                                            : "Difesa avversario"}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(
                                        [
                                            "NONE",
                                            "DROP_SHOT",
                                            "NET_APPROACH",
                                            "LOB",
                                            "PASSING",
                                            "LINE_CHANGE",
                                            "INSIDE_OUT",
                                            "INSIDE_IN",
                                        ] as const
                                    ).map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => onKeyEventChange(v)}
                                            className={pillClass(keyEvent === v, "amber")}
                                        >
                                            {v === "NONE"
                                                ? "Nessuno"
                                                : v === "DROP_SHOT"
                                                    ? "Palla corta"
                                                    : v === "NET_APPROACH"
                                                        ? "Rete"
                                                        : v === "LOB"
                                                            ? "Lob"
                                                            : v === "PASSING"
                                                                ? "Passante"
                                                                : v === "LINE_CHANGE"
                                                                    ? "Lungolinea"
                                                                    : v === "INSIDE_OUT"
                                                                        ? "Inside-out"
                                                                        : "Inside-in"}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(
                                        ["SERVE", "FOREHAND", "BACKHAND", "VOLLEY", "SMASH", "PASSING", "OTHER"] as const
                                    ).map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => onFinishShotChange(v)}
                                            className={pillClass(finishShot === v, "cyan")}
                                        >
                                            {v === "SERVE"
                                                ? "Servizio"
                                                : v === "FOREHAND"
                                                    ? "Diritto"
                                                    : v === "BACKHAND"
                                                        ? "Rovescio"
                                                        : v === "VOLLEY"
                                                            ? "Volée"
                                                            : v === "SMASH"
                                                                ? "Smash"
                                                                : v === "PASSING"
                                                                    ? "Passante"
                                                                    : "Altro"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FastTagPanel;