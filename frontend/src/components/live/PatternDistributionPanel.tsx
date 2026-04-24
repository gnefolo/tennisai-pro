// src/components/live/PatternDistributionPanel.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: useMemo, macroLabel, pct, buildBeatItems, tutta la logica
//     di conteggio (macroCounts, rallyCounts, serveDirCounts), topMacros sort/slice,
//     struttura dati restituita, sub-componente Bar — IDENTICI all'originale.
//     Modificati: cardClass, Bar (colore fill), className delle card interne.

import React, { useMemo } from "react";
import type { RecordedPoint, FastMacroPattern } from "./liveTypes";

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
interface PatternDistributionPanelProps {
    recordedPoints: RecordedPoint[];
}

// ─── DESIGN TOKEN costante ───────────────────────────────────────────────────
const cardClass =
    "bg-court-night/95 border border-white/[0.07] rounded-2xl p-4 " +
    "flex flex-col gap-4 shadow-[var(--e-2)]";

// ─── FUNZIONI HELPER (invariate) ─────────────────────────────────────────────
function macroLabel(value: FastMacroPattern | null | undefined): string {
    switch (value) {
        case "SERVE_DOMINANT": return "Servizio dominante";
        case "AGGRESSIVE_RETURN": return "Risposta aggressiva";
        case "SHORT_RALLY": return "Rally breve";
        case "MEDIUM_RALLY": return "Rally medio";
        case "LONG_RALLY": return "Rally lungo";
        case "SHORT_BALL_ATTACK": return "Attacco palla corta";
        case "NET_PLAY": return "Gioco a rete";
        case "DEFENSE_RECOVERY": return "Difesa / recupero";
        case "PASSING_LOB": return "Passante / lob";
        default: return "Non classificato";
    }
}

function pct(count: number, total: number): number {
    if (!total) return 0;
    return Math.round((count / total) * 100);
}

// ─── SUB-COMPONENTE Bar (struttura invariata, fill rimappato su ace-lime) ─────
function Bar({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
                <span className="text-fog/70">{label}</span>
                <span className="text-fog/50 font-semibold">{value}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                {/* ace-lime invece di sky-400 — accent primario DS */}
                <div
                    className="h-full rounded-full bg-ace-lime transition-all duration-[var(--dur-slow)]"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
export const PatternDistributionPanel: React.FC<PatternDistributionPanelProps> = ({
    recordedPoints,
}) => {
    const total = recordedPoints.length;

    // useMemo invariato — tutta la logica di conteggio e derivazione
    const data = useMemo(() => {
        const macroCounts = new Map<string, number>();
        const rallyCounts = { SHORT: 0, MEDIUM: 0, LONG: 0 };
        const serveDirCounts = { T: 0, BODY: 0, WIDE: 0 };

        recordedPoints.forEach((pt) => {
            const macro = macroLabel(pt.macroPattern);
            macroCounts.set(macro, (macroCounts.get(macro) ?? 0) + 1);
            if (pt.rallyBucket === "SHORT") rallyCounts.SHORT += 1;
            if (pt.rallyBucket === "MEDIUM") rallyCounts.MEDIUM += 1;
            if (pt.rallyBucket === "LONG") rallyCounts.LONG += 1;
            if (pt.serveDirection === "T") serveDirCounts.T += 1;
            if (pt.serveDirection === "BODY") serveDirCounts.BODY += 1;
            if (pt.serveDirection === "WIDE") serveDirCounts.WIDE += 1;
        });

        const topMacros = [...macroCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, count]) => ({ label, value: pct(count, total) }));

        return {
            topMacros,
            rally: [
                { label: "Rally brevi", value: pct(rallyCounts.SHORT, total) },
                { label: "Rally medi", value: pct(rallyCounts.MEDIUM, total) },
                { label: "Rally lunghi", value: pct(rallyCounts.LONG, total) },
            ],
            serveDir: [
                { label: "Servizio alla T", value: pct(serveDirCounts.T, total) },
                { label: "Servizio al corpo", value: pct(serveDirCounts.BODY, total) },
                { label: "Servizio esterno", value: pct(serveDirCounts.WIDE, total) },
            ],
        };
    }, [recordedPoints, total]);

    // ── Empty state ──────────────────────────────────────────────────────────
    if (total === 0) {
        return (
            <div className={cardClass}>
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-fog/70">
                        Pattern distribution
                    </h3>
                    <span className="text-[10px] text-fog/40">ATP-style overview</span>
                </div>
                <p className="text-fog/40 text-sm">
                    Registra alcuni punti per vedere la distribuzione dei pattern.
                </p>
            </div>
        );
    }

    // ── Render principale ────────────────────────────────────────────────────
    return (
        <div className={cardClass}>
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-fog/70">
                    Pattern distribution
                </h3>
                <span className="text-[10px] text-fog/40">Lettura strutturale del match</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Top pattern */}
                <div className="rounded-[var(--r-sm)] border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col gap-3">
                    <div className="text-[10px] uppercase tracking-wide text-fog/50 font-semibold">
                        Top pattern
                    </div>
                    {data.topMacros.length === 0 ? (
                        <div className="text-[11px] text-fog/40">Nessun pattern disponibile</div>
                    ) : (
                        data.topMacros.map((item) => (
                            <Bar key={item.label} label={item.label} value={item.value} />
                        ))
                    )}
                </div>

                {/* Rally profile */}
                <div className="rounded-[var(--r-sm)] border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col gap-3">
                    <div className="text-[10px] uppercase tracking-wide text-fog/50 font-semibold">
                        Rally profile
                    </div>
                    {data.rally.map((item) => (
                        <Bar key={item.label} label={item.label} value={item.value} />
                    ))}
                </div>

                {/* Serve directions */}
                <div className="rounded-[var(--r-sm)] border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col gap-3">
                    <div className="text-[10px] uppercase tracking-wide text-fog/50 font-semibold">
                        Serve directions
                    </div>
                    {data.serveDir.map((item) => (
                        <Bar key={item.label} label={item.label} value={item.value} />
                    ))}
                </div>

            </div>
        </div>
    );
};

export default PatternDistributionPanel;
