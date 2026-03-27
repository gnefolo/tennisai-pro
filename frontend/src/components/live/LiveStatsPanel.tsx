// src/components/live/LiveStatsPanel.tsx
import React from "react";

interface LiveStatsPanelProps {
    svcPct: number;
    rtnPct: number;
    firstPct: number;
    secondPct: number;
    momentumLast5: number;
    onSvcPctChange: (value: number) => void;
    onRtnPctChange: (value: number) => void;
    onFirstPctChange: (value: number) => void;
    onSecondPctChange: (value: number) => void;
    onMomentumLast5Change: (value: number) => void;
    error?: string | null;
}

type StatCardProps = {
    label: string;
    shortLabel: string;
    value: number;
    min: number;
    max: number;
    accentClass: string;
    trackClass: string;
    textClass: string;
    description: string;
    onChange: (value: number) => void;
};

const shellCard =
    "bg-slate-950/80 border border-slate-800 rounded-[24px] p-5 lg:p-6 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.7)]";

const smallMetricCard =
    "rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3";

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function StatCard({
    label,
    shortLabel,
    value,
    min,
    max,
    accentClass,
    trackClass,
    textClass,
    description,
    onChange,
}: StatCardProps) {
    const normalized = ((clamp(value, min, max) - min) / (max - min)) * 100;

    return (
        <div className="rounded-[20px] border border-slate-800 bg-slate-900/80 p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        {shortLabel}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-100">{label}</div>
                </div>

                <div className={`text-2xl font-bold tabular-nums ${textClass}`}>
                    {value.toFixed(0)}%
                </div>
            </div>

            <div className="mt-4">
                <div className={`h-2.5 w-full overflow-hidden rounded-full ${trackClass}`}>
                    <div
                        className={`h-full rounded-full ${accentClass} transition-all duration-300`}
                        style={{ width: `${normalized}%` }}
                    />
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                <span>{min}%</span>
                <span>{max}%</span>
            </div>

            <div className="mt-3 text-[11px] leading-relaxed text-slate-400">
                {description}
            </div>

            <div className="mt-4">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value) || 0)}
                    className="w-full accent-sky-500 cursor-pointer"
                />
            </div>
        </div>
    );
}

export const LiveStatsPanel: React.FC<LiveStatsPanelProps> = ({
    svcPct,
    rtnPct,
    firstPct,
    secondPct,
    momentumLast5,
    onSvcPctChange,
    onRtnPctChange,
    onFirstPctChange,
    onSecondPctChange,
    onMomentumLast5Change,
    error,
}) => {
    const serviceEdge = svcPct - rtnPct;
    const serveReliability = Math.round((firstPct * 0.6 + secondPct * 0.4) * 10) / 10;
    const pressureRead =
        momentumLast5 >= 60
            ? "Momento favorevole"
            : momentumLast5 <= 40
                ? "Momento sfavorevole"
                : "Momento neutro";

    return (
        <section className={shellCard}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.26em] text-sky-400/80">
                        ATP Infosys style
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-slate-50">
                        Live Performance Dashboard
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                        Snapshot numerico live del match, con focus su servizio, risposta e
                        inerzia recente.
                    </p>
                </div>

                <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Aggiornamento dinamico
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className={smallMetricCard}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Service edge
                    </div>
                    <div
                        className={`mt-2 text-2xl font-bold tabular-nums ${serviceEdge >= 0 ? "text-emerald-300" : "text-rose-300"
                            }`}
                    >
                        {serviceEdge > 0 ? "+" : ""}
                        {serviceEdge.toFixed(0)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                        Differenza tra rendimento al servizio e in risposta.
                    </div>
                </div>

                <div className={smallMetricCard}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Serve reliability
                    </div>
                    <div className="mt-2 text-2xl font-bold tabular-nums text-sky-300">
                        {serveReliability.toFixed(0)}%
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                        Lettura sintetica della tenuta tra prima e seconda.
                    </div>
                </div>

                <div className={smallMetricCard}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Momentum status
                    </div>
                    <div className="mt-2 text-lg font-semibold text-violet-300">
                        {pressureRead}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                        Basato sugli ultimi cinque punti registrati.
                    </div>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                <StatCard
                    label="Punti vinti al servizio"
                    shortLabel="Serve"
                    value={svcPct}
                    min={30}
                    max={90}
                    accentClass="bg-gradient-to-r from-sky-500 to-cyan-400"
                    trackClass="bg-slate-800"
                    textClass="text-sky-300"
                    description="Misura il rendimento complessivo quando il giocatore monitorato serve."
                    onChange={onSvcPctChange}
                />

                <StatCard
                    label="Punti vinti in risposta"
                    shortLabel="Return"
                    value={rtnPct}
                    min={10}
                    max={60}
                    accentClass="bg-gradient-to-r from-emerald-500 to-lime-400"
                    trackClass="bg-slate-800"
                    textClass="text-emerald-300"
                    description="Indica la pressione esercitata nei game di risposta e la capacità di break."
                    onChange={onRtnPctChange}
                />

                <StatCard
                    label="Punti vinti con la prima"
                    shortLabel="1st Serve"
                    value={firstPct}
                    min={40}
                    max={90}
                    accentClass="bg-gradient-to-r from-violet-500 to-fuchsia-400"
                    trackClass="bg-slate-800"
                    textClass="text-violet-300"
                    description="Rendimento sui punti giocati quando entra la prima di servizio."
                    onChange={onFirstPctChange}
                />

                <StatCard
                    label="Punti vinti con la seconda"
                    shortLabel="2nd Serve"
                    value={secondPct}
                    min={20}
                    max={80}
                    accentClass="bg-gradient-to-r from-amber-500 to-orange-400"
                    trackClass="bg-slate-800"
                    textClass="text-amber-300"
                    description="Indicatore chiave di vulnerabilità o solidità sotto pressione."
                    onChange={onSecondPctChange}
                />
            </div>

            <div className="mt-4 rounded-[20px] border border-slate-800 bg-slate-900/80 p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            Momentum
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-100">
                            Ultimi 5 punti
                        </div>
                    </div>

                    <div className="text-2xl font-bold tabular-nums text-rose-200">
                        {momentumLast5.toFixed(0)}%
                    </div>
                </div>

                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-300"
                        style={{ width: `${clamp(momentumLast5, 0, 100)}%` }}
                    />
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>

                <div className="mt-3 text-[11px] leading-relaxed text-slate-400">
                    Questo cursore sintetizza l’inerzia recente del match e aiuta a leggere
                    i cambi di flusso in tempo reale.
                </div>

                <div className="mt-4">
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={momentumLast5}
                        onChange={(e) => onMomentumLast5Change(Number(e.target.value) || 0)}
                        className="w-full accent-emerald-500 cursor-pointer"
                    />
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-[12px] text-rose-300">
                    {error}
                </div>
            )}
        </section>
    );
};

export default LiveStatsPanel;