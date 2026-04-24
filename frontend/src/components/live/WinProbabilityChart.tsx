// src/components/live/WinProbabilityChart.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: useMemo, chartData, calcoli SVG (yToSvg, xToSvg),
//     linePath, areaPath, yTicks, formatPct, tutti i path SVG e le coordinate —
//     IDENTICI all'originale. Modificati: shell, className, colori SVG fill/stroke.

import React, { useMemo } from "react";
import type { RecordedPoint } from "./liveTypes";

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
interface WinProbabilityChartProps {
    recordedPoints: RecordedPoint[];
}

// ─── DESIGN TOKENS costanti (sostituiscono shellCard/sectionLabel hardcoded) ──
const shellCard =
    "rounded-[24px] border border-white/[0.06] " +
    "bg-[linear-gradient(180deg,rgba(11,18,32,0.96),rgba(5,9,18,0.99))] " +
    "shadow-[var(--e-3)]";

const sectionLabel =
    "text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold";

// ─── FUNZIONE HELPER (invariata) ─────────────────────────────────────────────
function formatPct(value: number): string {
    return `${Math.round(value)}%`;
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
const WinProbabilityChart: React.FC<WinProbabilityChartProps> = ({
    recordedPoints,
}) => {
    // ── useMemo invariato — filtra e mappa i punti del modello XGBoost ─────────
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

    // ── Statistiche derivate (invariate) ───────────────────────────────────────
    const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;
    const high = chartData.length > 0 ? Math.max(...chartData.map((d) => d.probability)) : null;
    const low = chartData.length > 0 ? Math.min(...chartData.map((d) => d.probability)) : null;
    const avg =
        chartData.length > 0
            ? chartData.reduce((acc, d) => acc + d.probability, 0) / chartData.length
            : null;

    // ── Geometria SVG (invariata — non toccare) ────────────────────────────────
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

    // ── RENDER ─────────────────────────────────────────────────────────────────
    return (
        <div className={`${shellCard} overflow-hidden`}>

            {/* ── Header ── */}
            <div className="px-5 py-5 md:px-6 md:py-6 border-b border-white/[0.06]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className={sectionLabel}>Win Probability</div>
                        <div className="mt-1 font-head text-lg font-semibold tracking-tight text-baseline">
                            Live probability flow
                        </div>
                    </div>

                    {/* Pills statistiche — rimappate sul DS */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {latest && (
                            // Current: success — metrica positiva primaria
                            <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 font-semibold text-success">
                                Now {formatPct(latest.probability)}
                            </span>
                        )}
                        {high !== null && (
                            // Peak: ace-lime — massimo, accent primario
                            <span className="rounded-full border border-ace-lime/20 bg-ace-lime/[0.08] px-3 py-1 font-semibold text-ace-lime">
                                High {formatPct(high)}
                            </span>
                        )}
                        {low !== null && (
                            // Floor: error — minimo
                            <span className="rounded-full border border-error/20 bg-error/[0.08] px-3 py-1 font-semibold text-error">
                                Low {formatPct(low)}
                            </span>
                        )}
                        {avg !== null && (
                            // Average: clay-amber — valore di riferimento
                            <span className="rounded-full border border-clay-amber/20 bg-clay-amber/[0.08] px-3 py-1 font-semibold text-clay-amber">
                                Avg {formatPct(avg)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="px-5 py-5 md:px-6 md:py-6">
                {chartData.length === 0 ? (
                    /* Empty state */
                    <div className="rounded-[var(--r-md)] border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-fog/50">
                        Nessuna probabilità disponibile: registra i primi punti per vedere il flusso live.
                    </div>
                ) : (
                    <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] p-4">

                        {/* Sub-header */}
                        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fog/60">
                                Point-by-point win probability
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-fog/40">
                                Modello XGBoost live
                            </div>
                        </div>

                        {/* ── SVG Chart ────────────────────────────────────────────────── */}
                        {/* ATTENZIONE: non modificare nulla dentro <svg>
                salvo i valori rgba() dei colori — geometria invariata */}
                        <div className="w-full overflow-x-auto">
                            <svg
                                viewBox={`0 0 ${width} ${height}`}
                                className="min-w-[780px] w-full h-[260px]"
                                role="img"
                                aria-label="Live win probability chart"
                            >
                                <defs>
                                    {/*
                    Area fill: ace-lime gradient (sostituisce sky-400)
                    top: rgba(212,255,58,0.28) → bottom: rgba(212,255,58,0.02)
                  */}
                                    <linearGradient id="probAreaFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(212,255,58,0.28)" />
                                        <stop offset="100%" stopColor="rgba(212,255,58,0.02)" />
                                    </linearGradient>
                                </defs>

                                {/* Grid lines + Y axis labels — invariati, solo colore griglia */}
                                {yTicks.map((tick) => {
                                    const y = yToSvg(tick);
                                    return (
                                        <g key={tick}>
                                            <line
                                                x1={paddingLeft}
                                                x2={width - paddingRight}
                                                y1={y}
                                                y2={y}
                                                stroke="rgba(255,255,255,0.06)"
                                                strokeWidth="1"
                                                strokeDasharray="4 6"
                                            />
                                            <text
                                                x={paddingLeft - 10}
                                                y={y + 4}
                                                textAnchor="end"
                                                fontSize="10"
                                                fill="rgba(201,207,218,0.55)"
                                            >
                                                {tick}%
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Linea 50% — clay-amber (riferimento neutro) */}
                                <line
                                    x1={paddingLeft}
                                    x2={width - paddingRight}
                                    y1={yToSvg(50)}
                                    y2={yToSvg(50)}
                                    stroke="rgba(233,162,59,0.40)"
                                    strokeWidth="1.5"
                                />

                                {/* Area fill — ace-lime gradient */}
                                {areaPath && (
                                    <path d={areaPath} fill="url(#probAreaFill)" />
                                )}

                                {/* Line stroke — ace-lime solid */}
                                {linePath && (
                                    <path
                                        d={linePath}
                                        fill="none"
                                        stroke="rgba(212,255,58,0.92)"
                                        strokeWidth="3"
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                )}

                                {/* Dot per ogni punto — invariati nella geometria */}
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
                                                // ultimo punto: baseline white; precedenti: ace-lime
                                                fill={isLast ? "rgba(247,248,250,1)" : "rgba(212,255,58,0.90)"}
                                                stroke="rgba(5,9,18,0.95)"
                                                strokeWidth="2"
                                            />
                                        </g>
                                    );
                                })}

                                {/* X axis labels — invariati nella logica di rendering */}
                                {chartData.map((d, i) => {
                                    const x = xToSvg(i);
                                    return (
                                        <text
                                            key={`label-${d.pointLabel}-${i}`}
                                            x={x}
                                            y={height - 14}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fill="rgba(201,207,218,0.65)"
                                        >
                                            {i % 2 === 0 || i === chartData.length - 1 ? d.pointLabel : ""}
                                        </text>
                                    );
                                })}
                            </svg>
                        </div>

                        {/* ── Mini stat cards sotto il grafico ── */}
                        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">

                            {/* Current: success */}
                            <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                <div className={sectionLabel}>Current</div>
                                <div className="mt-2 font-head text-2xl font-bold tracking-tight text-success">
                                    {latest ? formatPct(latest.probability) : "--"}
                                </div>
                                <div className="mt-1 text-[11px] text-fog/40">Ultimo punto modellato</div>
                            </div>

                            {/* Peak: ace-lime */}
                            <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                <div className={sectionLabel}>Peak</div>
                                <div className="mt-2 font-head text-2xl font-bold tracking-tight text-ace-lime">
                                    {high !== null ? formatPct(high) : "--"}
                                </div>
                                <div className="mt-1 text-[11px] text-fog/40">Massimo nel flusso</div>
                            </div>

                            {/* Floor: error */}
                            <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                <div className={sectionLabel}>Floor</div>
                                <div className="mt-2 font-head text-2xl font-bold tracking-tight text-error">
                                    {low !== null ? formatPct(low) : "--"}
                                </div>
                                <div className="mt-1 text-[11px] text-fog/40">Minimo nel flusso</div>
                            </div>

                            {/* Average: clay-amber */}
                            <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                <div className={sectionLabel}>Average</div>
                                <div className="mt-2 font-head text-2xl font-bold tracking-tight text-clay-amber">
                                    {avg !== null ? formatPct(avg) : "--"}
                                </div>
                                <div className="mt-1 text-[11px] text-fog/40">Media live del match</div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WinProbabilityChart;
