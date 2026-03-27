import React from "react";
import type { RecordedPoint } from "./liveTypes";

interface RecordedPointsPanelProps {
    recordedPoints: RecordedPoint[];
    onExportCsv: () => void;
}

const shellCard =
    "rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] shadow-[0_20px_45px_rgba(0,0,0,0.30)]";

const sectionLabel =
    "text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold";

function macroLabel(value?: string | null) {
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
            return value || "Pattern non definito";
    }
}

function finishLabel(value?: string | null) {
    switch (value) {
        case "WINNER":
            return "Vincente";
        case "FORCED_ERROR":
            return "Errore forzato";
        case "UNFORCED_ERROR":
            return "Errore non forzato";
        default:
            return value || null;
    }
}

function scoreLabel(pt: RecordedPoint) {
    return `${pt.setScoreMe}-${pt.setScoreOpp} set · ${pt.gameScoreMe}-${pt.gameScoreOpp} game · ${pt.pointScoreMe}-${pt.pointScoreOpp}`;
}

function pointTone(won?: number) {
    return won === 1
        ? {
            card: "border-emerald-500/20 bg-emerald-500/[0.06]",
            dot: "bg-emerald-400",
            badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            title: "Vinto",
        }
        : {
            card: "border-rose-500/20 bg-rose-500/[0.06]",
            dot: "bg-rose-400",
            badge: "border-rose-500/30 bg-rose-500/10 text-rose-300",
            title: "Perso",
        };
}

const RecordedPointsPanel: React.FC<RecordedPointsPanelProps> = ({
    recordedPoints,
    onExportCsv,
}) => {
    const reversedPoints = recordedPoints.slice().reverse().slice(0, 12);

    const wins = recordedPoints.filter((pt) => pt.isPointWon === 1).length;
    const losses = recordedPoints.filter((pt) => pt.isPointWon === 0).length;

    return (
        <div className={`${shellCard} overflow-hidden`}>
            <div className="px-5 py-5 md:px-6 md:py-6 border-b border-slate-800/80">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className={sectionLabel}>Match Log</div>
                        <div className="mt-1 text-lg font-semibold tracking-tight text-slate-50">
                            Recorded points
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                            Vinti {wins}
                        </span>
                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-300">
                            Persi {losses}
                        </span>
                        <button
                            onClick={onExportCsv}
                            disabled={recordedPoints.length === 0}
                            className="rounded-xl border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-40"
                        >
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 md:px-6 md:py-6">
                {recordedPoints.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-500">
                        Nessun punto registrato.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
                        {reversedPoints.map((pt) => {
                            const tone = pointTone(pt.isPointWon);

                            return (
                                <div
                                    key={pt.id}
                                    className={`rounded-[20px] border p-4 transition-all ${tone.card}`}
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                                                <span className="text-sm font-semibold text-slate-100">
                                                    Set {pt.set} · Game {pt.game} · Punto {pt.pointNumber}
                                                </span>
                                                <span
                                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tone.badge}`}
                                                >
                                                    {tone.title}
                                                </span>
                                            </div>

                                            <div className="mt-2 text-[11px] text-slate-400">
                                                {scoreLabel(pt)}
                                            </div>
                                        </div>

                                        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                            {pt.timestamp
                                                ? new Date(pt.timestamp).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : ""}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4">
                                        <div className="flex flex-col gap-3">
                                            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
                                                <div className={sectionLabel}>Pattern</div>
                                                <div className="mt-2 text-sm font-semibold text-sky-300">
                                                    {macroLabel(pt.macroPattern)}
                                                </div>

                                                {pt.finishType && (
                                                    <div className="mt-2 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
                                                        {finishLabel(pt.finishType)}
                                                    </div>
                                                )}
                                            </div>

                                            {pt.pointDescription && (
                                                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
                                                    <div className={sectionLabel}>Description</div>
                                                    <div className="mt-2 text-[12px] leading-relaxed text-slate-200">
                                                        {pt.pointDescription}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="grid grid-cols-1 gap-3">
                                                {pt.taggedPattern && (
                                                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                                                        <div className={sectionLabel}>Tagged pattern</div>
                                                        <div className="mt-2 text-[12px] font-semibold text-amber-200">
                                                            {pt.taggedPattern}
                                                        </div>
                                                    </div>
                                                )}

                                                {pt.nextPointPatternHint && (
                                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                                                        <div className={sectionLabel}>Next point hint</div>
                                                        <div className="mt-2 text-[12px] font-semibold text-emerald-200">
                                                            {pt.nextPointPatternHint}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
                                                    <div className={sectionLabel}>Point win</div>
                                                    <div className="mt-2 text-lg font-bold text-emerald-300">
                                                        {typeof pt.modelPointWinProbability === "number"
                                                            ? `${Math.round(pt.modelPointWinProbability * 100)}%`
                                                            : "--"}
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
                                                    <div className={sectionLabel}>Rally</div>
                                                    <div className="mt-2 text-lg font-bold text-sky-300">
                                                        {pt.rallyCount ?? "--"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        {pt.isOnServe === 1 && (
                                            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-300">
                                                Al servizio
                                            </span>
                                        )}

                                        {pt.serveNumber && (
                                            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                                                {pt.serveNumber === "ACE" ? "ACE" : `${pt.serveNumber}ª di servizio`}
                                            </span>
                                        )}

                                        {pt.serveDirection && (
                                            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                                                Serve {pt.serveDirection}
                                            </span>
                                        )}

                                        {pt.returnType && (
                                            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                                                Return {pt.returnType}
                                            </span>
                                        )}

                                        {pt.rallyPhase && (
                                            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                                                {pt.rallyPhase}
                                            </span>
                                        )}

                                        {pt.finishShot && (
                                            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                                                {pt.finishShot}
                                            </span>
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

export default RecordedPointsPanel;