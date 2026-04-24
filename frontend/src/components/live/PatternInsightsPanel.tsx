// src/components/live/PatternInsightsPanel.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: tipi da liveTypes, tutte le funzioni tone* (toneFromConfidence,
//     toneFromMomentum, toneFromPressure, toneFromRiskLevel, toneFromPriority),
//     rendering condizionale dei blocchi tactical_v3, tactical_call, tactical_suggestion,
//     accesso a prediction.pattern_fused, taggedPrediction, probText — IDENTICI.
//     Modificati: sectionCard, labelClass, palette classi tone*, className.

import React from "react";
import type { LiveTaggedPointResponse, PredictionResponse } from "./liveTypes";
import { TacticsIcon, GridIcon, StarIcon } from "../ui/icons";

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
interface PatternInsightsPanelProps {
    prediction: PredictionResponse | null;
    taggedPrediction: LiveTaggedPointResponse | null;
    probText: string;
}

// ─── DESIGN TOKEN costanti ───────────────────────────────────────────────────
const sectionCard =
    "bg-court-night/95 border border-white/[0.07] rounded-[24px] p-4 md:p-5 " +
    "flex flex-col gap-4 shadow-[var(--e-2)]";

const labelClass =
    "text-[10px] uppercase tracking-[0.18em] text-fog/50 font-semibold";

// ─── FUNZIONI TONE (struttura invariata, palette rimappata sul DS) ───────────
function toneFromConfidence(conf?: string) {
    switch (conf) {
        case "HIGH": return "border-success/30 bg-success/10 text-success";
        case "MEDIUM": return "border-clay-amber/30 bg-clay-amber/10 text-clay-amber";
        case "LOW": return "border-error/30 bg-error/10 text-error";
        default: return "border-white/10 bg-white/[0.04] text-fog";
    }
}

function toneFromMomentum(state?: string) {
    switch (state) {
        case "HOT": return "border-success/30 bg-success/10 text-success";
        case "COLD": return "border-error/30 bg-error/10 text-error";
        default: return "border-white/10 bg-white/[0.04] text-fog";
    }
}

function toneFromPressure(state?: string) {
    switch (state) {
        case "BREAK_POINT_FOR":
        case "GAME_POINT_FOR": return "border-success/30 bg-success/10 text-success";
        case "BREAK_POINT_AGAINST":
        case "GAME_POINT_AGAINST": return "border-error/30 bg-error/10 text-error";
        default: return "border-white/10 bg-white/[0.04] text-fog";
    }
}

function toneFromRiskLevel(risk?: string) {
    switch (risk) {
        case "HIGH": return "border-error/40 bg-error/15 text-error";
        case "LOW": return "border-success/40 bg-success/15 text-success";
        default: return "border-clay-amber/40 bg-clay-amber/15 text-clay-amber";
    }
}

function toneFromPriority(priority?: string) {
    if (priority === "EXPLOIT") return "border-success/40 bg-success/10 text-success";
    if (priority === "PROTECT") return "border-clay-amber/40 bg-clay-amber/10 text-clay-amber";
    if (priority === "DISRUPT") return "border-info/40 bg-info/10 text-info";
    return "border-ace-lime/30 bg-ace-lime/10 text-ace-lime";
}

// ── Classe base per le card interne ──────────────────────────────────────────
const innerCard = "rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] p-4";
const innerCardSm = "rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] p-3";

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
const PatternInsightsPanel: React.FC<PatternInsightsPanelProps> = ({
    prediction,
    taggedPrediction,
    probText,
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* ── Card sinistra: Lettura tattica ── */}
            <div className={sectionCard}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-fog/70">
                    Lettura tattica
                </h3>
                {!prediction ? (
                    <p className="text-fog/40 text-center py-6">
                        Registra un punto per vedere pattern e lettura del contesto.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">

                        {/* Pattern principale — ace-lime */}
                        <div className={innerCard}>
                            <div className={labelClass}>Pattern principale riconosciuto</div>
                            <div className="mt-2 font-head text-sm md:text-base font-semibold text-ace-lime">
                                {prediction.pattern_fused.pattern_name}
                            </div>
                            {prediction.pattern_fused.explanation && (
                                <div className="mt-2 text-[11px] text-fog/60 leading-relaxed">
                                    {prediction.pattern_fused.explanation}
                                </div>
                            )}
                        </div>

                        {taggedPrediction && (
                            <>
                                {/* Pattern del punto registrato — clay-amber */}
                                <div className={innerCard}>
                                    <div className={labelClass}>Pattern del punto registrato</div>
                                    <div className="mt-2 font-head text-sm font-semibold text-clay-amber">
                                        {taggedPrediction.tagged_pattern}
                                    </div>
                                </div>

                                {/* Pattern prossimo punto — success */}
                                <div className={innerCard}>
                                    <div className={labelClass}>Pattern probabile del prossimo punto</div>
                                    <div className="mt-2 font-head text-sm font-semibold text-success">
                                        {taggedPrediction.next_point_pattern_hint}
                                    </div>
                                </div>

                                {/* Descrizione automatica */}
                                <div className={innerCard}>
                                    <div className={labelClass}>Descrizione automatica</div>
                                    <div className="mt-2 text-[12px] text-fog leading-relaxed">
                                        {taggedPrediction.point_description}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Card destra: Coaching engine ── */}
            <div className={sectionCard}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-fog/70">
                    Coaching engine
                </h3>
                {!prediction ? (
                    <p className="text-fog/40 text-center py-6">
                        Dopo la registrazione del punto vedrai qui lo stato tattico del motore live.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">

                        {/* Probabilità — success */}
                        <div className={innerCard}>
                            <div className={labelClass}>Probabilità stimata</div>
                            <div className="mt-2 font-head text-2xl font-bold text-success">
                                {probText}
                            </div>
                        </div>

                        {/* Grid: Confidence + Momentum + Serve + Rally */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className={innerCardSm}>
                                <div className={labelClass}>Confidence</div>
                                <div className="mt-3">
                                    <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneFromConfidence(prediction.tactical_confidence)}`}>
                                        {prediction.tactical_confidence || "N/A"}
                                    </span>
                                </div>
                            </div>
                            <div className={innerCardSm}>
                                <div className={labelClass}>Momentum</div>
                                <div className="mt-3">
                                    <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneFromMomentum(prediction.momentum_state)}`}>
                                        {prediction.momentum_state || "N/A"}
                                    </span>
                                </div>
                            </div>
                            <div className={innerCardSm}>
                                <div className={labelClass}>Serve state</div>
                                <div className="mt-2 font-head text-sm font-semibold text-fog">
                                    {prediction.serve_state || "N/A"}
                                </div>
                            </div>
                            <div className={innerCardSm}>
                                <div className={labelClass}>Rally profile</div>
                                <div className="mt-2 font-head text-sm font-semibold text-fog">
                                    {prediction.rally_profile || "N/A"}
                                </div>
                            </div>
                        </div>

                        {/* Pressure state */}
                        <div className={innerCard}>
                            <div className={labelClass}>Pressure state</div>
                            <div className="mt-3">
                                <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneFromPressure(prediction.pressure_state)}`}>
                                    {prediction.pressure_state || "N/A"}
                                </span>
                            </div>
                        </div>

                        {/* LIV. 1: Point Decision — ace-lime border invece di sky */}
                        {(prediction.tactical_v3?.tactical_call_v3 || prediction.tactical_call) && (
                            <div className="rounded-[var(--r-md)] border border-ace-lime/20 bg-[linear-gradient(135deg,rgba(11,18,32,0.60),rgba(11,18,32,0.97),rgba(212,255,58,0.04))] px-4 py-4 relative shadow-[var(--e-1)]">
                                <div className="flex items-center justify-between mb-2">
                                    <TacticsIcon size={14} className="text-ace-lime" />
                                    <div className={labelClass}>Call Tattica Immediata</div>
                                    {prediction.risk_level && (
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${toneFromRiskLevel(prediction.risk_level)} shadow-[var(--e-1)]`}>
                                            Risk: {prediction.risk_level}
                                        </div>
                                    )}
                                </div>
                                <div className="font-body text-sm md:text-base font-semibold leading-relaxed text-baseline">
                                    {prediction.tactical_v3?.tactical_call_v3 || prediction.tactical_call}
                                </div>
                                {(prediction.tactical_v3?.tactical_rationale_v3 || prediction.tactical_explanation) && (
                                    <div className="mt-3 pt-3 border-t border-ace-lime/10 text-[11.5px] italic text-ace-lime/60">
                                        « {prediction.tactical_v3?.tactical_rationale_v3 || prediction.tactical_explanation} »
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LIV. 2: Micro Strategy */}
                        {prediction.tactical_v3 && (
                            <div className={innerCard}>
                                <div className="flex items-center justify-between mb-2">
                                    <GridIcon size={14} className="text-fog/60" />
                                    <div className={labelClass}>Micro-Strategia in Corso</div>
                                    <div className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-white/10 bg-white/[0.04] text-fog/50">
                                        LIV. 2
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    {/* Zona dominante: success */}
                                    <div className="rounded-[var(--r-sm)] border border-success/20 bg-success/[0.05] p-2 text-center">
                                        <div className="text-[9px] uppercase tracking-wider text-success/60 mb-1">Dominante in</div>
                                        <div className="text-[11px] font-semibold text-success">{prediction.tactical_v3.dominant_zone}</div>
                                    </div>
                                    {/* Zona vulnerabile: error */}
                                    <div className="rounded-[var(--r-sm)] border border-error/20 bg-error/[0.05] p-2 text-center">
                                        <div className="text-[9px] uppercase tracking-wider text-error/60 mb-1">Vulnerabile in</div>
                                        <div className="text-[11px] font-semibold text-error">{prediction.tactical_v3.vulnerability_zone}</div>
                                    </div>
                                </div>
                                {/* Intento raccomandato: ace-lime */}
                                <div className="mt-3 flex justify-between items-center bg-court-night rounded-[var(--r-sm)] px-3 py-2 border border-white/[0.06]">
                                    <span className="text-[10px] text-fog/50 capitalize">Intento raccomandato:</span>
                                    <span className="text-xs font-bold text-ace-lime">{prediction.tactical_v3.recommended_intent}</span>
                                </div>
                            </div>
                        )}

                        {/* LIV. 3: Match Plan — clay-amber */}
                        {prediction.tactical_v3 && (
                            <div className="rounded-[var(--r-md)] border border-clay-amber/20 bg-[linear-gradient(135deg,rgba(233,162,59,0.05),rgba(11,18,32,0.96))] px-4 py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <StarIcon size={14} className="text-clay-amber" />
                                    <div className={labelClass}>Match Plan</div>
                                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${toneFromPriority(prediction.tactical_v3.strategic_priority)}`}>
                                        {prediction.tactical_v3.strategic_priority}
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-clay-amber/80 leading-relaxed italic">
                                    {prediction.tactical_v3.match_plan}
                                </div>
                            </div>
                        )}

                        {/* Tactical suggestions */}
                        {(prediction.tactical_suggestion?.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-2">
                                {prediction.tactical_suggestion.slice(0, 3).map((txt, i) => (
                                    <div key={i} className="rounded-[var(--r-sm)] border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-fog">
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
