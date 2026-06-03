// src/components/live/LiveStatsPanel.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: props, tipi, funzioni helper (clamp, calcoli derivati),
//     handler onChange, struttura JSX — tutto identico all'originale.
//     Modificati esclusivamente: className, colori Tailwind, accent del range input.

import React from "react";

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
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
    step?: number;
};

// ─── DESIGN TOKENS (sostituiscono le costanti hardcoded slate-*) ─────────────
// Shell card principale: court-night con bordo sottile e elevation e-2
const shellCard =
    "bg-court-night/95 border border-white/[0.07] rounded-[24px] p-5 lg:p-6 " +
    "shadow-[var(--e-3)]";

// Metric card secondaria: superficie leggermente più chiara della shell
const smallMetricCard =
    "rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.03] px-4 py-3";

// ─── FUNZIONE HELPER (invariata) ─────────────────────────────────────────────
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// ─── SUB-COMPONENTE StatCard (struttura JSX invariata, solo className) ───────
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
    step = 5,
}: StatCardProps) {
    const normalized = ((clamp(value, min, max) - min) / (max - min)) * 100;

    return (
        <div className="rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.03] p-4 lg:p-5">

            {/* Header: solo label — il valore numerico vive nello stepper */}
            <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold">
                    {shortLabel}
                </div>
                <div className="mt-1 font-head text-sm font-semibold text-baseline">
                    {label}
                </div>
            </div>

            {/* Progress bar: usa accentClass e trackClass passati dal parent */}
            <div className="mt-4">
                <div className={`h-2.5 w-full overflow-hidden rounded-full ${trackClass}`}>
                    <div
                        className={`h-full rounded-full ${accentClass} transition-all duration-[var(--dur-slow)]`}
                        style={{ width: `${normalized}%` }}
                    />
                </div>
            </div>

            {/* Range label */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-fog/40">
                <span>{min}%</span>
                <span>{max}%</span>
            </div>

            {/* Description */}
            <div className="mt-3 text-[11px] leading-relaxed text-fog/60">
                {description}
            </div>

            {/* Stepper — ottimizzato per tocco su tablet/smartphone */}
            <div className="mt-4 flex items-center gap-3">
                <button
                    onClick={() => onChange(clamp(value - step, min, max))}
                    aria-label={`Diminuisci ${shortLabel}`}
                    className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-2xl font-bold text-fog hover:bg-white/[0.08] hover:border-white/20 active:scale-95 transition-all select-none"
                >
                    −
                </button>
                <div className="flex-1 text-center">
                    <span className={`font-head text-3xl font-bold tabular-nums ${textClass}`}>
                        {value.toFixed(0)}%
                    </span>
                </div>
                <button
                    onClick={() => onChange(clamp(value + step, min, max))}
                    aria-label={`Aumenta ${shortLabel}`}
                    className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-2xl font-bold text-fog hover:bg-white/[0.08] hover:border-white/20 active:scale-95 transition-all select-none"
                >
                    +
                </button>
            </div>

        </div>
    );
}

// ─── COMPONENTE PRINCIPALE (logica derivata e JSX invariati) ─────────────────
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
    // ── Calcoli derivati (invariati — logica del modello) ──────────────────────
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

            {/* ── Header sezione ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    {/* Eyebrow: clay-amber come colore secondario per label di sezione */}
                    <div className="text-[10px] uppercase tracking-[0.26em] text-clay-amber/80 font-semibold">
                        ATP Infosys style
                    </div>
                    <h3 className="mt-2 font-head text-lg font-semibold text-baseline">
                        Live Performance Dashboard
                    </h3>
                    <p className="mt-1 text-sm text-fog/60">
                        Snapshot numerico live del match, con focus su servizio, risposta e inerzia recente.
                    </p>
                </div>

                {/* Badge "Aggiornamento dinamico" — pill con dot success */}
                <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-fog/70">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Aggiornamento dinamico
                </div>
            </div>

            {/* ── Metric summary cards (3 derivate dal modello) ── */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">

                {/* Service Edge: success/error in base al segno — invariato semanticamente */}
                <div className={smallMetricCard}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-fog/50 font-semibold">
                        Service edge
                    </div>
                    <div
                        className={`mt-2 font-head text-2xl font-bold tabular-nums ${serviceEdge >= 0 ? "text-success" : "text-error"
                            }`}
                    >
                        {serviceEdge > 0 ? "+" : ""}
                        {serviceEdge.toFixed(0)}
                    </div>
                    <div className="mt-1 text-[11px] text-fog/50">
                        Differenza tra rendimento al servizio e in risposta.
                    </div>
                </div>

                {/* Serve Reliability: ace-lime — accent primario per metriche positive */}
                <div className={smallMetricCard}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-fog/50 font-semibold">
                        Serve reliability
                    </div>
                    <div className="mt-2 font-head text-2xl font-bold tabular-nums text-ace-lime">
                        {serveReliability.toFixed(0)}%
                    </div>
                    <div className="mt-1 text-[11px] text-fog/50">
                        Lettura sintetica della tenuta tra prima e seconda.
                    </div>
                </div>

                {/* Momentum Status: clay-amber per stato neutro/narrativo */}
                <div className={smallMetricCard}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-fog/50 font-semibold">
                        Momentum status
                    </div>
                    <div className="mt-2 font-head text-lg font-semibold text-clay-amber">
                        {pressureRead}
                    </div>
                    <div className="mt-1 text-[11px] text-fog/50">
                        Basato sugli ultimi cinque punti registrati.
                    </div>
                </div>

            </div>

            {/* ── 4 StatCard con slider (props accentClass/textClass rimappate sul DS) ── */}
            <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Serve %: ace-lime — primo accent */}
                <StatCard
                    label="Punti vinti al servizio"
                    shortLabel="Serve"
                    value={svcPct}
                    min={30}
                    max={90}
                    accentClass="bg-gradient-to-r from-ace-lime to-ace-lime-hover"
                    trackClass="bg-white/[0.06]"
                    textClass="text-ace-lime"
                    description="Misura il rendimento complessivo quando il giocatore monitorato serve."
                    onChange={onSvcPctChange}
                />

                {/* Return %: success green — metrica di risposta */}
                <StatCard
                    label="Punti vinti in risposta"
                    shortLabel="Return"
                    value={rtnPct}
                    min={10}
                    max={60}
                    accentClass="bg-gradient-to-r from-success to-success/60"
                    trackClass="bg-white/[0.06]"
                    textClass="text-success"
                    description="Indica la pressione esercitata nei game di risposta e la capacità di break."
                    onChange={onRtnPctChange}
                />

                {/* 1st Serve %: clay-amber — secondo accent del DS */}
                <StatCard
                    label="Punti vinti con la prima"
                    shortLabel="1st Serve"
                    value={firstPct}
                    min={40}
                    max={90}
                    accentClass="bg-gradient-to-r from-clay-amber to-clay-amber/60"
                    trackClass="bg-white/[0.06]"
                    textClass="text-clay-amber"
                    description="Rendimento sui punti giocati quando entra la prima di servizio."
                    onChange={onFirstPctChange}
                />

                {/* 2nd Serve %: info blue — quarto colore semantico del DS */}
                <StatCard
                    label="Punti vinti con la seconda"
                    shortLabel="2nd Serve"
                    value={secondPct}
                    min={20}
                    max={80}
                    accentClass="bg-gradient-to-r from-info to-info/60"
                    trackClass="bg-white/[0.06]"
                    textClass="text-info"
                    description="Indicatore chiave di vulnerabilità o solidità sotto pressione."
                    onChange={onSecondPctChange}
                />

            </div>

            {/* ── Momentum slider (logica e handler invariati) ── */}
            <div className="mt-4 rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.03] p-4 lg:p-5">

                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold">
                            Momentum
                        </div>
                        <div className="mt-1 font-head text-sm font-semibold text-baseline">
                            Ultimi 5 punti
                        </div>
                    </div>
                    {/* Valore momentum: clay-amber per letture di flusso */}
                    <div className="font-head text-2xl font-bold tabular-nums text-clay-amber">
                        {momentumLast5.toFixed(0)}%
                    </div>
                </div>

                {/* Barra tricolore: error → clay-amber → success */}
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-error via-clay-amber to-success transition-all duration-[var(--dur-slow)]"
                        style={{ width: `${clamp(momentumLast5, 0, 100)}%` }}
                    />
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-fog/40">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>

                <div className="mt-3 text-[11px] leading-relaxed text-fog/60">
                    Questo cursore sintetizza l'inerzia recente del match e aiuta a leggere
                    i cambi di flusso in tempo reale.
                </div>

                {/* Stepper momentum — ottimizzato per tocco su tablet */}
                <div className="mt-4 flex items-center gap-3">
                    <button
                        onClick={() => onMomentumLast5Change(clamp(momentumLast5 - 10, 0, 100))}
                        aria-label="Diminuisci momentum"
                        className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-2xl font-bold text-fog hover:bg-white/[0.08] hover:border-white/20 active:scale-95 transition-all select-none"
                    >
                        −
                    </button>
                    <div className="flex-1 text-center">
                        <span className="font-head text-3xl font-bold tabular-nums text-clay-amber">
                            {momentumLast5.toFixed(0)}%
                        </span>
                    </div>
                    <button
                        onClick={() => onMomentumLast5Change(clamp(momentumLast5 + 10, 0, 100))}
                        aria-label="Aumenta momentum"
                        className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-2xl font-bold text-fog hover:bg-white/[0.08] hover:border-white/20 active:scale-95 transition-all select-none"
                    >
                        +
                    </button>
                </div>

            </div>

            {/* ── Error state (invariato, solo palette aggiornata) ── */}
            {error && (
                <div className="mt-4 rounded-[var(--r-md)] border border-error/40 bg-error/5 px-4 py-3 text-[12px] text-error">
                    {error}
                </div>
            )}

        </section>
    );
};

export default LiveStatsPanel;
