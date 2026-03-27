import React, { useMemo } from "react";
import type { RecordedPoint, FastMacroPattern } from "./liveTypes";

interface PatternDistributionPanelProps {
    recordedPoints: RecordedPoint[];
}

const cardClass =
    "bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4";

function macroLabel(value: FastMacroPattern | null | undefined): string {
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
            return "Attacco palla corta";
        case "NET_PLAY":
            return "Gioco a rete";
        case "DEFENSE_RECOVERY":
            return "Difesa / recupero";
        case "PASSING_LOB":
            return "Passante / lob";
        default:
            return "Non classificato";
    }
}

function pct(count: number, total: number): number {
    if (!total) return 0;
    return Math.round((count / total) * 100);
}

function Bar({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{label}</span>
                <span className="text-slate-400 font-semibold">{value}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                    className="h-full rounded-full bg-sky-400"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

export const PatternDistributionPanel: React.FC<PatternDistributionPanelProps> = ({
    recordedPoints,
}) => {
    const total = recordedPoints.length;

    const data = useMemo(() => {
        const macroCounts = new Map<string, number>();
        const rallyCounts = {
            SHORT: 0,
            MEDIUM: 0,
            LONG: 0,
        };
        const serveDirCounts = {
            T: 0,
            BODY: 0,
            WIDE: 0,
        };

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
            .map(([label, count]) => ({
                label,
                value: pct(count, total),
            }));

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

    if (total === 0) {
        return (
            <div className={cardClass}>
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase text-slate-300">
                        Pattern distribution
                    </h3>
                    <span className="text-[10px] text-slate-500">ATP-style overview</span>
                </div>
                <p className="text-slate-500 text-sm">
                    Registra alcuni punti per vedere la distribuzione dei pattern.
                </p>
            </div>
        );
    }

    return (
        <div className={cardClass}>
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase text-slate-300">
                    Pattern distribution
                </h3>
                <span className="text-[10px] text-slate-500">
                    Lettura strutturale del match
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex flex-col gap-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        Top pattern
                    </div>
                    {data.topMacros.length === 0 ? (
                        <div className="text-[11px] text-slate-500">Nessun pattern disponibile</div>
                    ) : (
                        data.topMacros.map((item) => (
                            <Bar key={item.label} label={item.label} value={item.value} />
                        ))
                    )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex flex-col gap-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        Rally profile
                    </div>
                    {data.rally.map((item) => (
                        <Bar key={item.label} label={item.label} value={item.value} />
                    ))}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex flex-col gap-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
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