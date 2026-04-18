import React from "react";
import type { LiveTaggedPointResponse, PredictionResponse } from "./liveTypes";

interface PatternInsightsPanelProps {
    prediction: PredictionResponse | null;
    taggedPrediction: LiveTaggedPointResponse | null;
    probText: string;
}

const sectionCard =
    "bg-slate-950/70 border border-slate-800 rounded-[24px] p-4 md:p-5 flex flex-col gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]";

const labelClass =
    "text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold";

function toneFromConfidence(conf?: string) {
    switch (conf) {
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

function toneFromMomentum(state?: string) {
    switch (state) {
        case "HOT":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
        case "COLD":
            return "border-rose-500/30 bg-rose-500/10 text-rose-300";
        default:
            return "border-slate-700 bg-slate-900/70 text-slate-300";
    }
}

function toneFromPressure(state?: string) {
    switch (state) {
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

function toneFromRiskLevel(risk?: string) {
    switch (risk) {
        case "HIGH":
            return "border-rose-500/40 bg-rose-500/20 text-rose-200";
        case "LOW":
            return "border-emerald-500/40 bg-emerald-500/20 text-emerald-200";
        default:
            return "border-amber-500/40 bg-amber-500/20 text-amber-200";
    }
}

function toneFromPriority(priority?: string) {
    if (priority === "EXPLOIT") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    if (priority === "PROTECT") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    if (priority === "DISRUPT") return "border-purple-500/40 bg-purple-500/10 text-purple-300";
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";
}

const PatternInsightsPanel: React.FC<PatternInsightsPanelProps> = ({
    prediction,
    taggedPrediction,
    probText,
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={sectionCard}>
                <h3 className="text-xs font-semibold uppercase text-slate-300">
                    Lettura tattica
                </h3>

                {!prediction ? (
                    <p className="text-slate-500 text-center py-6">
                        Registra un punto per vedere pattern e lettura del contesto.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                            <div className={labelClass}>Pattern principale riconosciuto</div>
                            <div className="mt-2 text-sm md:text-base font-semibold text-sky-300">
                                {prediction.pattern_fused.pattern_name}
                            </div>
                            {prediction.pattern_fused.explanation && (
                                <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                                    {prediction.pattern_fused.explanation}
                                </div>
                            )}
                        </div>

                        {taggedPrediction && (
                            <>
                                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                                    <div className={labelClass}>Pattern del punto registrato</div>
                                    <div className="mt-2 text-sm font-semibold text-amber-300">
                                        {taggedPrediction.tagged_pattern}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                                    <div className={labelClass}>Pattern probabile del prossimo punto</div>
                                    <div className="mt-2 text-sm font-semibold text-emerald-300">
                                        {taggedPrediction.next_point_pattern_hint}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                                    <div className={labelClass}>Descrizione automatica</div>
                                    <div className="mt-2 text-[12px] text-slate-200 leading-relaxed">
                                        {taggedPrediction.point_description}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className={sectionCard}>
                <h3 className="text-xs font-semibold uppercase text-slate-300">
                    Coaching engine
                </h3>

                {!prediction ? (
                    <p className="text-slate-500 text-center py-6">
                        Dopo la registrazione del punto vedrai qui lo stato tattico del motore live.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                            <div className={labelClass}>Probabilità stimata</div>
                            <div className="mt-2 text-2xl font-bold text-emerald-300">
                                {probText}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3">
                                <div className={labelClass}>Confidence</div>
                                <div className="mt-3">
                                    <span
                                        className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneFromConfidence(
                                            prediction.tactical_confidence
                                        )}`}
                                    >
                                        {prediction.tactical_confidence || "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3">
                                <div className={labelClass}>Momentum</div>
                                <div className="mt-3">
                                    <span
                                        className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneFromMomentum(
                                            prediction.momentum_state
                                        )}`}
                                    >
                                        {prediction.momentum_state || "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3">
                                <div className={labelClass}>Serve state</div>
                                <div className="mt-2 text-sm font-semibold text-slate-100">
                                    {prediction.serve_state || "N/A"}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3">
                                <div className={labelClass}>Rally profile</div>
                                <div className="mt-2 text-sm font-semibold text-slate-100">
                                    {prediction.rally_profile || "N/A"}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                            <div className={labelClass}>Pressure state</div>
                            <div className="mt-3">
                                <span
                                    className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneFromPressure(
                                        prediction.pressure_state
                                    )}`}
                                >
                                    {prediction.pressure_state || "N/A"}
                                </span>
                            </div>
                        </div>

                        {/* LIV. 1: POINT DECISION (se v3 o v2) */}
                        {(prediction.tactical_v3?.tactical_call_v3 || prediction.tactical_call) && (
                            <div className="rounded-[20px] border border-sky-500/20 bg-[linear-gradient(135deg,rgba(8,47,73,0.28),rgba(15,23,42,0.96),rgba(6,78,59,0.14))] px-4 py-4 relative shadow-[inset_0_1px_10px_rgba(14,165,233,0.1)]">
                                <div className="flex items-center justify-between mb-2">
                                    <div className={labelClass}>Call Tattica Immediata</div>
                                    {prediction.risk_level && (
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${toneFromRiskLevel(prediction.risk_level)} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
                                            Risk: {prediction.risk_level}
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm md:text-base font-semibold leading-relaxed text-slate-50">
                                    {prediction.tactical_v3?.tactical_call_v3 || prediction.tactical_call}
                                </div>
                                {(prediction.tactical_v3?.tactical_rationale_v3 || prediction.tactical_explanation) && (
                                    <div className="mt-3 pt-3 border-t border-sky-500/10 text-[11.5px] italic text-sky-100/70">
                                        « {prediction.tactical_v3?.tactical_rationale_v3 || prediction.tactical_explanation} »
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LIV. 2: MICRO STRATEGY */}
                        {prediction.tactical_v3 && (
                            <div className="rounded-[20px] border border-slate-700/60 bg-slate-900/40 px-4 py-4">
                                <div className={labelClass}>Micro-Strategia in Corso</div>
                                
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2 text-center">
                                        <div className="text-[9px] uppercase tracking-wider text-emerald-500/70 mb-1">Dominante in</div>
                                        <div className="text-[11px] font-semibold text-emerald-300">{prediction.tactical_v3.dominant_zone}</div>
                                    </div>
                                    <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-2 text-center">
                                        <div className="text-[9px] uppercase tracking-wider text-rose-500/70 mb-1">Vulnerabile in</div>
                                        <div className="text-[11px] font-semibold text-rose-300">{prediction.tactical_v3.vulnerability_zone}</div>
                                    </div>
                                </div>

                                <div className="mt-3 flex justify-between items-center bg-slate-950 rounded-xl px-3 py-2 border border-slate-800">
                                    <span className="text-[10px] text-slate-400 capitalize">Intento raccomandato:</span>
                                    <span className="text-xs font-bold text-sky-400">{prediction.tactical_v3.recommended_intent}</span>
                                </div>
                            </div>
                        )}

                        {/* LIV. 3: MATCH PLAN */}
                        {prediction.tactical_v3 && (
                            <div className="rounded-[20px] border border-amber-500/20 bg-[linear-gradient(135deg,rgba(251,191,36,0.05),rgba(15,23,42,0.96))] px-4 py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className={labelClass}>Match Plan</div>
                                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${toneFromPriority(prediction.tactical_v3.strategic_priority)}`}>
                                        {prediction.tactical_v3.strategic_priority}
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-amber-100/90 leading-relaxed italic">
                                    {prediction.tactical_v3.match_plan}
                                </div>
                            </div>
                        )}

                        {(prediction.tactical_suggestion?.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-2">
                                {prediction.tactical_suggestion.slice(0, 3).map((txt, i) => (
                                    <div
                                        key={i}
                                        className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-200"
                                    >
                                        {txt}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatternInsightsPanel;