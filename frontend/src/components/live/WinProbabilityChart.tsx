// src/components/live/WinProbabilityChart.tsx
import React, { useMemo } from "react";
import type { RecordedPoint } from "./liveTypes";

interface WinProbabilityChartProps {
    recordedPoints: RecordedPoint[];
}

const shellCard =
    "rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,42,0.98))] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] shadow-[0_20px_45px_rgba(0,0,0,0.30)]";

const sectionLabel =
    "text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold";

function formatPct(value: number): string {
    return `${Math.round(value)}%`;
}

const WinProbabilityChart: React.FC<WinProbabilityChartProps> = ({
    recordedPoints,
}) => {
    const chartData = useMemo(() => {
        return recordedPoints
            .filter((pt) => typeof pt.modelPointWinProbability === "number")
            .map((pt, index) => ({
                x: index,
                pointLabel: `P${pt.pointNumber}`,
                probability: Math.max(
                    0,
                    Math.min(100, (pt.modelPointWinProbability ?? 0) * 100)
                ),
            }));
    }, [recordedPoints]);

    const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;
    const high = chartData.length > 0 ? Math.max(...chartData.map((d) => d.probability)) : null;
    const low = chartData.length > 0 ? Math.min(...chartData.map((d) => d.probability)) : null;
    const avg =
        chartData.length > 0
            ? chartData.reduce((acc, d) => acc + d.probability, 0) / chartData.length
            : null;

    const width = 1000;
    const height = 260;
    const paddingLeft = 48;
    const paddingRight = 20;
    const paddingTop = 24;
    const paddingBottom = 40;

    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;

    const yToSvg = (value: number) =>
        paddingTop + innerHeight - (value / 100) * innerHeight;

    const xToSvg = (index: number) => {
        if (chartData.length <= 1) return paddingLeft + innerWidth / 2;
        return paddingLeft + (index / (chartData.length - 1)) * innerWidth;
    };

    const linePath =
        chartData.length === 0
            ? ""
            : chartData
                .map((d, i) => {
                    const x = xToSvg(i);
                    const y = yToSvg(d.probability);
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ");

    const areaPath =
        chartData.length === 0
            ? ""
            : [
                `M ${xToSvg(0)} ${yToSvg(chartData[0].probability)}`,
                ...chartData.slice(1).map((d, i) => {
                    const x = xToSvg(i + 1);
                    const y = yToSvg(d.probability);
                    return `L ${x} ${y}`;
                }),
                `L ${xToSvg(chartData.length - 1)} ${height - paddingBottom}`,
                `L ${xToSvg(0)} ${height - paddingBottom}`,
                "Z",
            ].join(" ");

    const yTicks = [0, 25, 50, 75, 100];

    return (
        <div className={`${shellCard} overflow-hidden`}>
            <div className="px-5 py-5 md:px-6 md:py-6 border-b border-slate-800/80">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className={sectionLabel}>Win Probability</div>
                        <div className="mt-1 text-lg font-semibold tracking-tight text-slate-50">
                            Live probability flow
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {latest && (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-300">
                                Now {formatPct(latest.probability)}
                            </span>
                        )}
                        {high !== null && (
                            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 font-semibold text-slate-300">
                                High {formatPct(high)}
                            </span>
                        )}
                        {low !== null && (
                            <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 font-semibold text-slate-300">
                                Low {formatPct(low)}
                            </span>
                        )}
                        {avg !== null && (
                            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-semibold text-sky-300">
                                Avg {formatPct(avg)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 md:px-6 md:py-6">
                {chartData.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-500">
                        Nessuna probabilità disponibile: registra i primi punti per vedere il flusso live.
                    </div>
                ) : (
                    <div className="rounded-[20px] border border-slate-800/80 bg-slate-950/55 p-4">
                        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Point-by-point win probability
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                Modello XGBoost live
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <svg
                                viewBox={`0 0 ${width} ${height}`}
                                className="min-w-[780px] w-full h-[260px]"
                                role="img"
                                aria-label="Live win probability chart"
                            >
                                <defs>
                                    <linearGradient id="probAreaFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(56,189,248,0.35)" />
                                        <stop offset="100%" stopColor="rgba(56,189,248,0.03)" />
                                    </linearGradient>
                                </defs>

                                {yTicks.map((tick) => {
                                    const y = yToSvg(tick);
                                    return (
                                        <g key={tick}>
                                            <line
                                                x1={paddingLeft}
                                                x2={width - paddingRight}
                                                y1={y}
                                                y2={y}
                                                stroke="rgba(148,163,184,0.12)"
                                                strokeWidth="1"
                                                strokeDasharray="4 6"
                                            />
                                            <text
                                                x={paddingLeft - 10}
                                                y={y + 4}
                                                textAnchor="end"
                                                fontSize="10"
                                                fill="rgba(148,163,184,0.75)"
                                            >
                                                {tick}%
                                            </text>
                                        </g>
                                    );
                                })}

                                <line
                                    x1={paddingLeft}
                                    x2={width - paddingRight}
                                    y1={yToSvg(50)}
                                    y2={yToSvg(50)}
                                    stroke="rgba(250,204,21,0.35)"
                                    strokeWidth="1.5"
                                />

                                {areaPath && (
                                    <path d={areaPath} fill="url(#probAreaFill)" />
                                )}

                                {linePath && (
                                    <path
                                        d={linePath}
                                        fill="none"
                                        stroke="rgba(56,189,248,0.95)"
                                        strokeWidth="3"
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                )}

                                {chartData.map((d, i) => {
                                    const x = xToSvg(i);
                                    const y = yToSvg(d.probability);
                                    const isLast = i === chartData.length - 1;

                                    return (
                                        <g key={`${d.pointLabel}-${i}`}>
                                            <circle
                                                cx={x}
                                                cy={y}
                                                r={isLast ? 5.5 : 3.5}
                                                fill={isLast ? "rgba(167,243,208,1)" : "rgba(56,189,248,0.95)"}
                                                stroke="rgba(15,23,42,0.95)"
                                                strokeWidth="2"
                                            />
                                        </g>
                                    );
                                })}

                                {chartData.map((d, i) => {
                                    const x = xToSvg(i);
                                    return (
                                        <text
                                            key={`label-${d.pointLabel}-${i}`}
                                            x={x}
                                            y={height - 14}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fill="rgba(148,163,184,0.8)"
                                        >
                                            {i % 2 === 0 || i === chartData.length - 1 ? d.pointLabel : ""}
                                        </text>
                                    );
                                })}
                            </svg>
                        </div>

                        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 px-4 py-3">
                                <div className={sectionLabel}>Current</div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-300">
                                    {latest ? formatPct(latest.probability) : "--"}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                    Ultimo punto modellato
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 px-4 py-3">
                                <div className={sectionLabel}>Peak</div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-sky-300">
                                    {high !== null ? formatPct(high) : "--"}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                    Massimo nel flusso
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 px-4 py-3">
                                <div className={sectionLabel}>Floor</div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-rose-300">
                                    {low !== null ? formatPct(low) : "--"}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                    Minimo nel flusso
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 px-4 py-3">
                                <div className={sectionLabel}>Average</div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-violet-300">
                                    {avg !== null ? formatPct(avg) : "--"}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                    Media live del match
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WinProbabilityChart;